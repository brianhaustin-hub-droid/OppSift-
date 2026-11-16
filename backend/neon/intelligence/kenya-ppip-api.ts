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

const KENYA_ORIGIN = "https://tenders.go.ke";
const ACTIVE_TENDERS = `${KENYA_ORIGIN}/api/active-tenders`;
const KENYA_HOST = "tenders.go.ke";

// Deliberately narrow: the portal's payload also includes officer personal
// data (national IDs, phone numbers, emails) which we never retain.
const itemSchema = z.object({
  id: z.union([z.number(), z.string()]),
  ocid: z.string().nullable().optional(),
  title: z.string(),
  tender_ref: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  close_at: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  pe: z.object({
    name: z.string().nullable().optional(),
  }).passthrough().optional(),
  procurement_category: z.object({
    title: z.string().nullable().optional(),
  }).passthrough().optional(),
  procurement_method: z.object({
    title: z.string().nullable().optional(),
  }).passthrough().optional(),
}).passthrough();

const pageSchema = z.object({
  data: z.array(itemSchema),
  current_page: z.number().int(),
  last_page: z.number().int(),
  next_page_url: z.string().url().nullable().optional(),
  total: z.number().int(),
}).passthrough();

type KenyaPpipApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type KenyaPpipSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  total: number;
  nextPage: number | null;
};

function makeConfiguration(
  sourceId: string,
  dependencies: KenyaPpipApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: ACTIVE_TENDERS,
    allowedHosts: [KENYA_HOST],
    pageSize: 100,
    maxPagesPerRun: 10,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 35_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? 10_000_000,
    maxRetries: 6,
    minimumRetryDelayMs: 3_000,
    maximumRetryDelayMs: 45_000,
    allowedContentTypes: ["application/json"],
  });
}

function text(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00.000Z`;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed)) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapStatus(deadline: string | null, now: Date): "open" | "closed" | "unknown" {
  if (!deadline) return "unknown";
  const timestamp = Date.parse(deadline);
  if (Number.isNaN(timestamp)) return "unknown";
  return timestamp > now.getTime() ? "open" : "closed";
}

function mapItem(
  source: SourceRegistryRecord,
  item: z.infer<typeof itemSchema>,
  now: Date,
): { success: true; record: ParsedSourceOpportunity } | { success: false; error: string } {
  const externalId = String(item.id);
  const title = item.title.trim();
  if (!title) {
    return { success: false, error: "Kenya PPIP tender is missing its title." };
  }
  const deadline = text(item.close_at);
  const closingAt = deadline ? asTimestamp(deadline) : null;
  const publishedAt = asTimestamp(text(item.published_at));

  const candidate: ParsedSourceOpportunity = {
    externalId,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: "Active Tender",
    referenceNumber: text(item.tender_ref)?.slice(0, 200) ?? null,
    countryCode: "KE",
    region: null,
    city: null,
    issuingInstitution: null,
    procuringOrganization: text(item.pe?.name),
    publisher: source.publisher,
    publishedAt,
    sourceDeadlineText: deadline?.slice(0, 500) ?? null,
    closingAt,
    timeZone: closingAt ? "Africa/Nairobi" : null,
    status: mapStatus(deadline, now),
    sourceUrl: `${KENYA_ORIGIN}/tenders/${externalId}`,
    canonicalUrl: null,
    currency: null,
    amount: null,
    originalValues: {
      ocid: item.ocid ?? null,
      tenderRef: text(item.tender_ref),
      venue: text(item.venue),
      procurementCategory: text(item.procurement_category?.title),
      procurementMethod: text(item.procurement_method?.title),
    },
  };
  const parsed = parsedSourceOpportunitySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    };
  }
  return { success: true, record: parsed.data };
}

export class KenyaPpipApiClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: KenyaPpipApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    page?: number;
    signal?: AbortSignal;
  }): Promise<KenyaPpipSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("Kenya PPIP source is not approved for operational ingestion.");
    }

    const page = search.page ?? 1;
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new Error("Kenya PPIP page must be a positive integer.");
    }

    const url = new URL(ACTIVE_TENDERS);
    url.searchParams.set("page", String(page));

    const sleep = this.dependencies.sleep ?? ((milliseconds: number) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));
    // Be polite to the public portal and reduce bursty traffic that can trigger 429s.
    await sleep(page > 1 ? 1500 : 500);

    const response = await safeFetchApprovedSource(url.toString(), this.configuration, {
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-KE,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "User-Agent": "OppSift/1.0 (+https://oppsift.com; procurement intelligence ingestion)",
      },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("Kenya PPIP returned invalid JSON.");
    }

    const result = pageSchema.safeParse(body);
    if (!result.success) {
      throw new Error("Kenya PPIP response did not match the documented tenders format.");
    }

    const now = this.dependencies.now?.() ?? new Date();
    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: KenyaPpipSearchResult["rawRecords"] = [];

    for (const item of result.data.data) {
      const mapped = mapItem(this.source, item, now);
      const externalId = String(item.id);
      if (mapped.success) {
        records.push(mapped.record);
        rawRecords.push({
          externalId,
          payload: {
            id: externalId,
            ocid: item.ocid ?? null,
            title: item.title,
            tenderRef: text(item.tender_ref),
            publishedAt: text(item.published_at),
            closeAt: text(item.close_at),
            venue: text(item.venue),
            procuringEntityName: text(item.pe?.name),
            procurementCategory: text(item.procurement_category?.title),
            procurementMethod: text(item.procurement_method?.title),
          },
        });
      }
    }

    const nextPage = result.data.current_page < result.data.last_page
      ? result.data.current_page + 1
      : null;

    return {
      records,
      rawRecords,
      total: result.data.total,
      nextPage,
    };
  }
}