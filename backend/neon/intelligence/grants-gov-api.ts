import { z } from "zod";
import {
  connectorConfigurationSchema,
  validateConnectorConfiguration,
  type ConnectorConfiguration,
} from "./connectors";
import {
  parsedSourceOpportunitySchema,
  sourceRegistryRecordSchema,
  type ParsedSourceOpportunity,
  type SourceRegistryRecord,
} from "./contracts";
import { safeFetchApprovedSource } from "./safe-fetch";

/**
 * Grants.gov Search API v1 (production, anonymous).
 *
 * Verified live against `https://api.grants.gov/v1/api/search2`: no API key,
 * subscription key, or paid tier is required. The endpoint accepts a JSON POST
 * body and answers with `errorcode: 0` on success.
 */
const GRANTS_GOV_SEARCH_ENDPOINT = "https://api.grants.gov/v1/api/search2";
const GRANTS_GOV_API_HOST = "api.grants.gov";
const GRANTS_GOV_DETAIL_BASE = "https://www.grants.gov/search-results-detail/";
const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_PAGE_SIZE = 500;
const MAX_PAGES_PER_RUN = 100;
const MAX_DATE_RANGE_DAYS = 365;
const OPEN_OPPORTUNITY_STATUS = "posted";

const grantsGovOpportunitySchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  number: z.string().trim().min(1).optional(),
  agencyCode: z.string().trim().min(1).optional(),
  agency: z.string().trim().min(1).optional(),
  openDate: z.string().trim().optional(),
  closeDate: z.string().trim().optional(),
  oppStatus: z.string().trim().optional(),
  docType: z.string().trim().optional(),
  cfdaList: z.array(z.string().trim().min(1)).optional(),
}).passthrough();

const grantsGovResponseSchema = z.object({
  errorcode: z.number().int(),
  msg: z.string(),
  data: z.object({
    hitCount: z.number().int().nonnegative(),
    startRecord: z.number().int().nonnegative(),
    oppHits: z.array(grantsGovOpportunitySchema),
  }).passthrough(),
}).passthrough();

export type GrantsGovOpportunity = z.infer<typeof grantsGovOpportunitySchema>;

export type GrantsGovSearch = {
  startRecordNum?: number;
  rows?: number;
  /** Restricts results to opportunities posted within the last N days. */
  dateRangeDays?: number;
  keyword?: string;
};

export type GrantsGovSearchResult = {
  hitCount: number;
  startRecordNum: number;
  rows: number;
  opportunities: GrantsGovOpportunity[];
  nextStartRecordNum: number | null;
};

type GrantsGovApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
};

const htmlEntities: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Grants.gov returns HTML-escaped titles such as `S&amp;T`. */
function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/gu, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return htmlEntities[entity.toLowerCase()] ?? match;
  });
}

/** Converts the `MM/DD/YYYY` format used by Grants.gov into an ISO instant. */
export function parseGrantsGovDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/u.exec(value.trim());
  if (!match) return null;
  const [, month, day, year] = match;
  const canonical = `${year}-${month}-${day}`;
  const parsed = new Date(`${canonical}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== canonical
  ) {
    return null;
  }
  return parsed.toISOString();
}

function makeConfiguration(
  sourceId: string,
  dependencies: GrantsGovApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: GRANTS_GOV_SEARCH_ENDPOINT,
    allowedHosts: [GRANTS_GOV_API_HOST],
    pageSize: 100,
    maxPagesPerRun: MAX_PAGES_PER_RUN,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 20_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? MAX_RESPONSE_BYTES,
    maxRetries: 3,
    minimumRetryDelayMs: 1_000,
    maximumRetryDelayMs: 30_000,
    allowedContentTypes: ["application/json"],
  });
}

function validateSearch(search: GrantsGovSearch) {
  const startRecordNum = search.startRecordNum ?? 0;
  if (!Number.isSafeInteger(startRecordNum) || startRecordNum < 0) {
    throw new Error("startRecordNum must be a non-negative integer.");
  }
  const rows = search.rows ?? 100;
  if (!Number.isSafeInteger(rows) || rows < 1 || rows > MAX_PAGE_SIZE) {
    throw new Error(`rows must be an integer from 1 to ${MAX_PAGE_SIZE}.`);
  }
  if (
    search.dateRangeDays !== undefined &&
    (!Number.isSafeInteger(search.dateRangeDays) ||
      search.dateRangeDays < 1 ||
      search.dateRangeDays > MAX_DATE_RANGE_DAYS)
  ) {
    throw new Error(`dateRangeDays must be an integer from 1 to ${MAX_DATE_RANGE_DAYS}.`);
  }
  if (search.keyword !== undefined && search.keyword.length > 500) {
    throw new Error("keyword must be 500 characters or fewer.");
  }
  return { startRecordNum, rows };
}

export class GrantsGovApiClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: GrantsGovApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(
    search: GrantsGovSearch,
    signal?: AbortSignal,
  ): Promise<GrantsGovSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("Grants.gov source is not approved for operational ingestion.");
    }

    const validated = validateSearch(search);
    const body = JSON.stringify({
      rows: validated.rows,
      startRecordNum: validated.startRecordNum,
      oppStatuses: OPEN_OPPORTUNITY_STATUS,
      ...(search.dateRangeDays !== undefined
        ? { dateRange: String(search.dateRangeDays) }
        : {}),
      ...(search.keyword ? { keyword: search.keyword } : {}),
    });

    let response: Response;
    try {
      response = await safeFetchApprovedSource(GRANTS_GOV_SEARCH_ENDPOINT, this.configuration, {
        method: "POST",
        body,
        signal,
        fetcher: this.dependencies.fetcher,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Source ")) {
        throw error;
      }
      throw new Error("Grants.gov API request failed.");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Grants.gov returned invalid JSON.");
    }

    const parsed = grantsGovResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("Grants.gov response did not match the documented search format.");
    }
    if (parsed.data.errorcode !== 0) {
      throw new Error(`Grants.gov reported search failure: ${parsed.data.msg}.`);
    }
    if (parsed.data.data.startRecord !== validated.startRecordNum) {
      throw new Error("Grants.gov response pagination metadata did not match the request.");
    }
    if (parsed.data.data.oppHits.length > validated.rows) {
      throw new Error("Grants.gov returned more opportunities than requested.");
    }

    const offset = parsed.data.data.startRecord;
    const nextStartRecordNum =
      offset + parsed.data.data.oppHits.length < parsed.data.data.hitCount
        ? offset + parsed.data.data.oppHits.length
        : null;

    return {
      hitCount: parsed.data.data.hitCount,
      startRecordNum: offset,
      rows: validated.rows,
      opportunities: parsed.data.data.oppHits,
      nextStartRecordNum,
    };
  }
}

/** Builds the canonical Grants.gov detail URL for an opportunity identifier. */
export function grantsGovOpportunityUrl(opportunityId: string): string {
  return `${GRANTS_GOV_DETAIL_BASE}${encodeURIComponent(opportunityId)}`;
}

export function mapGrantsGovOpportunity(
  source: SourceRegistryRecord,
  opportunity: GrantsGovOpportunity,
): ParsedSourceOpportunity {
  const externalId = opportunity.id.trim();
  const title = decodeHtmlEntities(opportunity.title.trim());
  if (!externalId || !title) {
    throw new Error("Grants.gov opportunity is missing its source ID or title.");
  }

  const publishedAt = parseGrantsGovDate(opportunity.openDate);
  const closingAt = parseGrantsGovDate(opportunity.closeDate);
  const sourceUrl = grantsGovOpportunityUrl(externalId);
  const opportunityStatus = opportunity.oppStatus?.trim() || null;
  const referenceNumber = opportunity.number?.trim() || null;

  return parsedSourceOpportunitySchema.parse({
    externalId,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: opportunity.docType?.trim() || opportunityStatus || "grant",
    referenceNumber: referenceNumber?.slice(0, 200) ?? null,
    countryCode: "US",
    issuingInstitution: opportunity.agency?.trim().slice(0, 300) ?? null,
    procuringOrganization: null,
    publisher: source.publisher,
    publishedAt,
    sourceDeadlineText: opportunity.closeDate?.trim().slice(0, 500) ?? null,
    closingAt,
    timeZone: null,
    status: opportunityStatus === OPEN_OPPORTUNITY_STATUS ? "open" : "unknown",
    sourceUrl,
    canonicalUrl: sourceUrl,
    currency: null,
    amount: null,
    originalValues: {
      grantsGov: {
        opportunityId: externalId,
        opportunityNumber: referenceNumber,
        agencyCode: opportunity.agencyCode ?? null,
        agency: opportunity.agency ?? null,
        openDateText: opportunity.openDate ?? null,
        closeDateText: opportunity.closeDate ?? null,
        opportunityStatus: opportunityStatus,
        docType: opportunity.docType ?? null,
        assistanceListings: opportunity.cfdaList ?? [],
      },
    },
  });
}
