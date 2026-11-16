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

const BOAMP_ORIGIN = "https://boamp-datadila.opendatasoft.com";
const BOAMP_RECORDS = `${BOAMP_ORIGIN}/api/explore/v2.1/catalog/datasets/boamp/records`;
const BOAMP_HOST = "boamp-datadila.opendatasoft.com";

const noticeSchema = z.object({
  id: z.string().trim().min(1),
  idweb: z.string().trim().min(1).nullable().optional(),
  objet: z.string().nullable().optional(),
  dateparution: z.string().nullable().optional(),
  datelimitereponse: z.string().nullable().optional(),
  nomacheteur: z.string().nullable().optional(),
  nature_libelle: z.string().nullable().optional(),
  type_avis: z.unknown().optional(),
  etat: z.string().nullable().optional(),
  url_avis: z.string().nullable().optional(),
  code_departement: z.unknown().optional(),
}).passthrough();

const responseSchema = z.object({
  total_count: z.number().int().nonnegative(),
  results: z.array(noticeSchema),
}).passthrough();

type BoampApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
};

export type BoampSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  total: number;
  nextOffset: number | null;
};

function makeConfiguration(
  sourceId: string,
  dependencies: BoampApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: BOAMP_RECORDS,
    allowedHosts: [BOAMP_HOST],
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

function asTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return `${value.trim()}T00:00:00.000Z`;
  }
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function text(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapStatus(deadline: string | null, now: Date): "open" | "closed" | "unknown" {
  if (!deadline) return "unknown";
  const timestamp = Date.parse(deadline);
  if (Number.isNaN(timestamp)) return "unknown";
  return timestamp > now.getTime() ? "open" : "closed";
}

function mapNotice(
  source: SourceRegistryRecord,
  notice: z.infer<typeof noticeSchema>,
  now: Date,
): { success: true; record: ParsedSourceOpportunity } | { success: false; error: string } {
  const externalId = notice.id;
  const title = text(notice.objet);
  if (!title) {
    return { success: false, error: "BOAMP notice is missing its object title." };
  }
  const deadline = text(notice.datelimitereponse);
  const closingAt = deadline ? asTimestamp(deadline) : null;
  const sourceUrl = text(notice.url_avis)
    ?? `https://www.boamp.fr/pages/avis/?q=idweb:${encodeURIComponent(notice.idweb ?? notice.id)}`;

  const candidate: ParsedSourceOpportunity = {
    externalId,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: "Marché public",
    referenceNumber: (notice.idweb ?? notice.id).slice(0, 200),
    countryCode: "FR",
    region: null,
    city: null,
    issuingInstitution: null,
    procuringOrganization: text(notice.nomacheteur),
    publisher: source.publisher,
    publishedAt: asTimestamp(text(notice.dateparution)),
    sourceDeadlineText: deadline?.slice(0, 500) ?? null,
    closingAt,
    timeZone: closingAt ? "Europe/Paris" : null,
    status: mapStatus(deadline, now),
    sourceUrl,
    canonicalUrl: null,
    currency: null,
    amount: null,
    originalValues: {
      idweb: notice.idweb ?? notice.id,
      natureLibelle: notice.nature_libelle ?? null,
      typeAvis: notice.type_avis ?? null,
      etat: notice.etat ?? null,
      codeDepartement: notice.code_departement ?? null,
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

export class BoampApiClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: BoampApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    publishedFrom: string;
    publishedTo: string;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
  }): Promise<BoampSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("BOAMP source is not approved for operational ingestion.");
    }

    const limit = search.limit ?? 100;
    const offset = search.offset ?? 0;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("BOAMP limit must be an integer from 1 to 100.");
    }
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error("BOAMP offset must be a non-negative integer.");
    }

    const url = new URL(BOAMP_RECORDS);
    url.searchParams.set("where", `dateparution>="${search.publishedFrom}" AND dateparution<="${search.publishedTo}"`);
    url.searchParams.set("order_by", "dateparution desc");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const response = await safeFetchApprovedSource(url.toString(), this.configuration, {
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: { Accept: "application/json" },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("BOAMP returned invalid JSON.");
    }

    const result = responseSchema.safeParse(body);
    if (!result.success) {
      throw new Error("BOAMP response did not match the documented records format.");
    }

    const now = this.dependencies.now?.() ?? new Date();
    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: BoampSearchResult["rawRecords"] = [];

    for (const notice of result.data.results) {
      const mapped = mapNotice(this.source, notice, now);
      if (mapped.success) {
        records.push(mapped.record);
        rawRecords.push({
          externalId: notice.id,
          payload: {
            id: notice.id,
            idweb: notice.idweb ?? notice.id,
            objet: notice.objet ?? null,
            dateparution: notice.dateparution ?? null,
            datelimitereponse: notice.datelimitereponse ?? null,
            nomacheteur: notice.nomacheteur ?? null,
            natureLibelle: notice.nature_libelle ?? null,
            typeAvis: notice.type_avis ?? null,
            urlAvis: notice.url_avis ?? null,
          },
        });
      }
    }

    const nextOffset = offset + result.data.results.length < result.data.total_count
      ? offset + result.data.results.length
      : null;

    return { records, rawRecords, total: result.data.total_count, nextOffset };
  }
}