import { z } from "zod";
import {
  connectorConfigurationSchema,
  validateConnectorConfiguration,
  type ConnectorConfiguration,
} from "./connectors";
import {
  sourceRegistryRecordSchema,
  type SourceRegistryRecord,
} from "./contracts";
import { safeFetchApprovedSource } from "./safe-fetch";

const SAM_GOV_SEARCH_ENDPOINT = "https://api.sam.gov/opportunities/v2/search";
const SAM_GOV_API_HOST = "api.sam.gov";
const MAX_RESPONSE_BYTES = 2_000_000;

const samGovNoticeSchema = z.object({
  noticeId: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(1000),
}).passthrough();

const samGovResponseSchema = z.object({
  totalRecords: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  opportunitiesData: z.array(samGovNoticeSchema),
}).passthrough();

const procurementTypeSchema = z.enum(["u", "p", "a", "r", "s", "o", "g", "k", "i"]);

export type SamGovProcurementType = z.infer<typeof procurementTypeSchema>;

export type SamGovSearch = {
  postedFrom: string;
  postedTo: string;
  pageIndex?: number;
  pageSize?: number;
  procurementType?: SamGovProcurementType;
  title?: string;
};

export type SamGovNotice = z.infer<typeof samGovNoticeSchema>;

export type SamGovSearchResult = {
  totalRecords: number;
  pageIndex: number;
  pageSize: number;
  notices: SamGovNotice[];
};

type SamGovApiDependencies = {
  fetcher?: typeof fetch;
};

function parseIsoDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} must be a valid calendar date.`);
  }
  return parsed;
}

function oneYearAfter(date: Date) {
  const result = new Date(date);
  const originalMonth = result.getUTCMonth();
  result.setUTCFullYear(result.getUTCFullYear() + 1);
  if (result.getUTCMonth() !== originalMonth) {
    result.setUTCDate(0);
  }
  return result;
}

function toSamGovDate(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

function validateSearch(search: SamGovSearch) {
  const from = parseIsoDate(search.postedFrom, "postedFrom");
  const to = parseIsoDate(search.postedTo, "postedTo");
  if (to < from) throw new Error("postedTo must not be earlier than postedFrom.");
  if (to > oneYearAfter(from)) throw new Error("SAM.gov permits a posted-date range of at most one year.");

  const pageIndex = search.pageIndex ?? 0;
  const pageSize = search.pageSize ?? 100;
  if (!Number.isSafeInteger(pageIndex) || pageIndex < 0) {
    throw new Error("pageIndex must be a non-negative integer.");
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) {
    throw new Error("pageSize must be an integer from 1 to 1000.");
  }
  if (search.title !== undefined && (!search.title.trim() || search.title.length > 200)) {
    throw new Error("title must contain 1 to 200 non-whitespace characters.");
  }
  if (search.procurementType !== undefined && !procurementTypeSchema.safeParse(search.procurementType).success) {
    throw new Error("procurementType is not a supported SAM.gov value.");
  }

  return { from, to, pageIndex, pageSize };
}

function makeConfiguration(sourceId: string): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: SAM_GOV_SEARCH_ENDPOINT,
    allowedHosts: [SAM_GOV_API_HOST],
    pageSize: 100,
    maxPagesPerRun: 10,
    requestTimeoutMs: 15_000,
    maxResponseBytes: MAX_RESPONSE_BYTES,
    maxRetries: 3,
    minimumRetryDelayMs: 1_000,
    maximumRetryDelayMs: 30_000,
    allowedContentTypes: ["application/json"],
  });
}

export class SamGovApiClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly apiKey: string | undefined,
    private readonly dependencies: SamGovApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id);
  }

  async search(search: SamGovSearch, signal?: AbortSignal): Promise<SamGovSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("SAM.gov source is not approved for operational ingestion.");
    }
    if (!this.apiKey?.trim()) {
      throw new Error("SAM.gov API key is not configured.");
    }

    const validated = validateSearch(search);
    const url = new URL(SAM_GOV_SEARCH_ENDPOINT);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("postedFrom", toSamGovDate(validated.from));
    url.searchParams.set("postedTo", toSamGovDate(validated.to));
    url.searchParams.set("limit", String(validated.pageSize));
    url.searchParams.set("offset", String(validated.pageIndex));
    if (search.procurementType) url.searchParams.set("ptype", search.procurementType);
    if (search.title) url.searchParams.set("title", search.title.trim());

    const fetcher: typeof fetch = async (input, init) => {
      try {
        return await (this.dependencies.fetcher ?? fetch)(input, init);
      } catch {
        throw new Error("SAM.gov request failed.");
      }
    };

    let response: Response;
    try {
      response = await safeFetchApprovedSource(url.toString(), this.configuration, {
        signal,
        fetcher,
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Source ")) {
        throw error;
      }
      throw new Error("SAM.gov API request failed.");
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("SAM.gov returned invalid JSON.");
    }

    const parsed = samGovResponseSchema.safeParse(body);
    if (!parsed.success) throw new Error("SAM.gov response did not match the documented search format.");
    if (parsed.data.limit !== validated.pageSize || parsed.data.offset !== validated.pageIndex) {
      throw new Error("SAM.gov response pagination metadata did not match the request.");
    }

    return {
      totalRecords: parsed.data.totalRecords,
      pageIndex: parsed.data.offset,
      pageSize: parsed.data.limit,
      notices: parsed.data.opportunitiesData,
    };
  }
}
