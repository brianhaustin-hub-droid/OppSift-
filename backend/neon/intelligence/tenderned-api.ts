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

const TENDERNED_ORIGIN = "https://www.tenderned.nl";
const PUBLICATIES = `${TENDERNED_ORIGIN}/papi/tenderned-rs-tns/v2/publicaties`;
const TENDERNED_HOST = "www.tenderned.nl";

const itemSchema = z.object({
  publicatieId: z.union([z.string(), z.number()]),
  aanbestedingNaam: z.string().nullable().optional(),
  publicatieDatum: z.string().nullable().optional(),
  sluitingsDatum: z.string().nullable().optional(),
  opdrachtgeverNaam: z.string().nullable().optional(),
  kenmerk: z.union([z.string(), z.number()]).nullable().optional(),
  typePublicatie: z.object({
    omschrijving: z.string().nullable().optional(),
  }).passthrough().optional(),
  procedure: z.object({
    omschrijving: z.string().nullable().optional(),
  }).passthrough().optional(),
  publicatiestatus: z.object({
    omschrijving: z.string().nullable().optional(),
  }).passthrough().optional(),
  link: z.object({
    href: z.string().url(),
  }).passthrough().optional(),
}).passthrough();

const pageSchema = z.object({
  content: z.array(itemSchema),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
}).passthrough();

type TenderNedApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
};

export type TenderNedSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  total: number;
  totalPages: number;
  nextPage: number | null;
};

function makeConfiguration(
  sourceId: string,
  dependencies: TenderNedApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: PUBLICATIES,
    allowedHosts: [TENDERNED_HOST],
    pageSize: 100,
    maxPagesPerRun: 10,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 20_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? 10_000_000,
    maxRetries: 3,
    minimumRetryDelayMs: 1_000,
    maximumRetryDelayMs: 30_000,
    allowedContentTypes: ["application/json"],
  });
}

function text(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00.000Z`;
  const candidate = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed)
    ? trimmed
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)
      ? `${trimmed.length === 16 ? `${trimmed}:00` : trimmed}Z`
      : null;
  if (!candidate) return null;
  const parsed = new Date(candidate);
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
  const externalId = String(item.publicatieId);
  const title = text(item.aanbestedingNaam);
  if (!title) {
    return { success: false, error: "TenderNed publication is missing its name." };
  }
  const deadline = text(item.sluitingsDatum);
  const closingAt = deadline ? asTimestamp(deadline) : null;
  const sourceUrl = item.link?.href ?? `${TENDERNED_ORIGIN}/aankondigingen/overzicht/${externalId}`;

  const candidate: ParsedSourceOpportunity = {
    externalId,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: "Aanbesteding",
    referenceNumber: item.kenmerk === null || item.kenmerk === undefined
      ? null
      : String(item.kenmerk).slice(0, 200),
    countryCode: "NL",
    region: null,
    city: null,
    issuingInstitution: null,
    procuringOrganization: text(item.opdrachtgeverNaam),
    publisher: source.publisher,
    publishedAt: asTimestamp(text(item.publicatieDatum)),
    sourceDeadlineText: deadline?.slice(0, 500) ?? null,
    closingAt,
    timeZone: closingAt ? "Europe/Amsterdam" : null,
    status: mapStatus(deadline, now),
    sourceUrl,
    canonicalUrl: null,
    currency: null,
    amount: null,
    originalValues: {
      publicatieId: externalId,
      typePublicatie: item.typePublicatie?.omschrijving ?? text(item.typePublicatie as unknown as string) ?? null,
      procedure: item.procedure?.omschrijving ?? null,
      publicatiestatus: item.publicatiestatus?.omschrijving ?? null,
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

export class TenderNedApiClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: TenderNedApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    page?: number;
    size?: number;
    signal?: AbortSignal;
  }): Promise<TenderNedSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("TenderNed source is not approved for operational ingestion.");
    }

    const page = search.page ?? 0;
    const size = search.size ?? 100;
    if (!Number.isSafeInteger(page) || page < 0) {
      throw new Error("TenderNed page must be a non-negative integer.");
    }
    if (!Number.isSafeInteger(size) || size < 1 || size > 100) {
      throw new Error("TenderNed size must be an integer from 1 to 100.");
    }

    const url = new URL(PUBLICATIES);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", String(size));

    const response = await safeFetchApprovedSource(url.toString(), this.configuration, {
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: { Accept: "application/json" },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("TenderNed returned invalid JSON.");
    }

    const result = pageSchema.safeParse(body);
    if (!result.success) {
      throw new Error("TenderNed response did not match the documented publications format.");
    }

    const now = this.dependencies.now?.() ?? new Date();
    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: TenderNedSearchResult["rawRecords"] = [];

    for (const item of result.data.content) {
      const mapped = mapItem(this.source, item, now);
      const externalId = String(item.publicatieId);
      if (mapped.success) {
        records.push(mapped.record);
        rawRecords.push({
          externalId,
          payload: {
            publicatieId: externalId,
            aanbestedingNaam: item.aanbestedingNaam ?? null,
            publicatieDatum: item.publicatieDatum ?? null,
            sluitingsDatum: item.sluitingsDatum ?? null,
            opdrachtgeverNaam: item.opdrachtgeverNaam ?? null,
            procedure: item.procedure?.omschrijving ?? null,
            publicatiestatus: item.publicatiestatus?.omschrijving ?? null,
            link: item.link?.href ?? null,
          },
        });
      }
    }

    const nextPage = result.data.number + 1 < result.data.totalPages
      ? result.data.number + 1
      : null;

    return {
      records,
      rawRecords,
      total: result.data.totalElements,
      totalPages: result.data.totalPages,
      nextPage,
    };
  }
}