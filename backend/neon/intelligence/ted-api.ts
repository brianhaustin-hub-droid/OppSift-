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

const TED_SEARCH_ENDPOINT = "https://api.ted.europa.eu/v3/notices/search";
const TED_API_HOST = "api.ted.europa.eu";
const MAX_RETRIEVABLE_NOTICES = 15_000;
const MAX_NOTICE_FIELDS_PER_PAGE = 10_000;
const TED_NOTICE_FIELDS = [
  "publication-number",
  "publication-date",
  "notice-title",
  "deadline-receipt-tender-date-lot",
  "organisation-country-buyer",
] as const;

const tedNoticeSchema = z.record(z.string(), z.unknown()).superRefine((notice, context) => {
  if (typeof notice["publication-number"] !== "string" || !notice["publication-number"].trim()) {
    context.addIssue({
      code: "custom",
      message: "TED notice is missing its publication number.",
      path: ["publication-number"],
    });
  }
  if (typeof notice["publication-date"] !== "string" || !notice["publication-date"].trim()) {
    context.addIssue({
      code: "custom",
      message: "TED notice is missing its publication date.",
      path: ["publication-date"],
    });
  }
});

const tedSearchResponseSchema = z.object({
  notices: z.array(tedNoticeSchema),
  totalNoticeCount: z.number().int().nonnegative(),
  iterationNextToken: z.string().optional(),
  timedOut: z.boolean().optional(),
}).passthrough();

export type TedNotice = z.infer<typeof tedNoticeSchema>;

export type TedSearchResult = {
  totalNoticeCount: number;
  page: number;
  pageSize: number;
  notices: TedNotice[];
  nextPage: number | null;
};

type TedApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
};

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("publishedFrom must use YYYY-MM-DD format.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("publishedFrom must be a valid calendar date.");
  }
  return value.replace(/-/g, "");
}

function makeConfiguration(
  sourceId: string,
  dependencies: TedApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: TED_SEARCH_ENDPOINT,
    allowedHosts: [TED_API_HOST],
    pageSize: 100,
    maxPagesPerRun: 10,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 15_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? 10_000_000,
    maxRetries: 0,
    minimumRetryDelayMs: 1_000,
    maximumRetryDelayMs: 1_000,
    allowedContentTypes: ["application/json"],
  });
}

export class TedPublishedNoticesClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: TedApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    publishedFrom: string;
    page?: number;
    pageSize?: number;
    signal?: AbortSignal;
  }): Promise<TedSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("TED source is not approved for operational ingestion.");
    }

    const publishedFrom = parseIsoDate(search.publishedFrom);
    const page = search.page ?? 1;
    const pageSize = search.pageSize ?? 20;
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new Error("page must be a positive integer.");
    }
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 250) {
      throw new Error("pageSize must be an integer from 1 to 250.");
    }
    if (page > Math.ceil(MAX_RETRIEVABLE_NOTICES / pageSize)) {
      throw new Error("TED page exceeds the documented 15,000-notice pagination limit.");
    }
    if (pageSize * TED_NOTICE_FIELDS.length > MAX_NOTICE_FIELDS_PER_PAGE) {
      throw new Error("TED page exceeds the documented 10,000-fields-per-page limit.");
    }

    const response = await safeFetchApprovedSource(TED_SEARCH_ENDPOINT, this.configuration, {
      method: "POST",
      body: JSON.stringify({
        query: `publication-date >= ${publishedFrom}`,
        fields: TED_NOTICE_FIELDS,
        page,
        limit: pageSize,
        scope: "ACTIVE",
        paginationMode: "PAGE_NUMBER",
        onlyLatestVersions: true,
      }),
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("TED API returned invalid JSON.");
    }

    const parsed = tedSearchResponseSchema.safeParse(body);
    if (!parsed.success || parsed.data.timedOut) {
      throw new Error("TED API response did not match the documented notice search format.");
    }
    if (parsed.data.notices.length > pageSize) {
      throw new Error("TED API returned more notices than requested.");
    }
    if (
      parsed.data.notices.length === pageSize &&
      page * pageSize < parsed.data.totalNoticeCount
    ) {
      return {
        totalNoticeCount: parsed.data.totalNoticeCount,
        page,
        pageSize,
        notices: parsed.data.notices,
        nextPage: page + 1,
      };
    }

    return {
      totalNoticeCount: parsed.data.totalNoticeCount,
      page,
      pageSize,
      notices: parsed.data.notices,
      nextPage: null,
    };
  }
}
