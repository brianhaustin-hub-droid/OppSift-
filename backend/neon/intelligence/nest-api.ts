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

const NEST_ORIGIN = "https://nest.go.tz";
const NEST_RELEASES = `${NEST_ORIGIN}/gateway/nest-data-portal-api/api/releases`;

const releaseSchema = z.object({
  id: z.string().trim().min(1),
  ocid: z.string().trim().min(1),
  date: z.string().nullable().optional(),
  tag: z.array(z.string()).default([]),
  buyer: z.object({
    name: z.string().nullable().optional(),
  }).passthrough().optional(),
  tender: z.object({
    id: z.string().nullable().optional(),
    description: z.string().trim().min(1).nullable().optional(),
    title: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    tenderPeriod: z.object({
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
    }).passthrough().optional(),
    procuringEntity: z.object({
      name: z.string().nullable().optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
  parties: z.array(z.object({
    name: z.string().nullable().optional(),
    roles: z.array(z.string()).default([]),
  }).passthrough()).default([]),
}).passthrough();

const packageSchema = z.object({
  license: z.string().url(),
  releases: z.array(releaseSchema),
  links: z.object({
    next: z.string().url().optional(),
  }).passthrough().default({}),
}).passthrough();

type NestApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
};

export type NestSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  nextCursor: string | null;
};

function makeConfiguration(
  sourceId: string,
  dependencies: NestApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: NEST_RELEASES,
    allowedHosts: ["nest.go.tz"],
    pageSize: 100,
    maxPagesPerRun: 10,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 30_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? 10_000_000,
    maxRetries: 3,
    minimumRetryDelayMs: 1_000,
    maximumRetryDelayMs: 30_000,
    allowedContentTypes: ["application/json"],
  });
}

function asTimestamp(value: string | null | undefined): string | null {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function text(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validateNextUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.origin !== NEST_ORIGIN ||
    !url.pathname.startsWith("/gateway/nest-data-portal-api/api/") ||
    url.username ||
    url.password
  ) {
    throw new Error("NeST returned a pagination URL outside its documented endpoint.");
  }
  return url.toString();
}

function mapStatus(
  status: string | null | undefined,
  deadline: string | null,
  now: Date,
): "open" | "closed" | "unknown" {
  const normalized = status?.toLowerCase();
  if (normalized === "complete" || normalized === "cancelled") return "closed";
  if (deadline) {
    const timestamp = Date.parse(deadline);
    if (!Number.isNaN(timestamp)) {
      return timestamp > now.getTime() ? "open" : "closed";
    }
  }
  return normalized === "active" ? "unknown" : "closed";
}

function mapRelease(
  source: SourceRegistryRecord,
  release: z.infer<typeof releaseSchema>,
  now: Date,
): { success: true; record: ParsedSourceOpportunity } | { success: false; error: string } {
  const tender = release.tender;
  const title = text(tender?.description) ?? text(tender?.title) ?? release.ocid;
  const deadline = text(tender?.tenderPeriod?.endDate);
  const closingAt = deadline ? asTimestamp(deadline) : null;
  const procuringEntity = text(tender?.procuringEntity?.name) ?? text(release.buyer?.name) ??
    text(release.parties.find((party) => party.roles.includes("procuringEntity"))?.name);

  const candidate: ParsedSourceOpportunity = {
    externalId: release.id,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: "Tender",
    referenceNumber: text(tender?.id)?.slice(0, 200) ?? null,
    countryCode: "TZ",
    region: null,
    city: null,
    issuingInstitution: null,
    procuringOrganization: procuringEntity,
    publisher: source.publisher,
    publishedAt: asTimestamp(release.date),
    sourceDeadlineText: deadline?.slice(0, 500) ?? null,
    closingAt,
    timeZone: closingAt ? "Africa/Dar_es_Salaam" : null,
    status: mapStatus(text(tender?.status), deadline, now),
    sourceUrl: tender?.id
      ? `${NEST_ORIGIN}/gateway/nest-data-portal-api/api/releases/${encodeURIComponent(release.ocid)}/${encodeURIComponent(tender.id)}`
      : `${NEST_ORIGIN}/gateway/nest-data-portal-api/api/records/${encodeURIComponent(release.ocid)}`,
    canonicalUrl: null,
    currency: null,
    amount: null,
    originalValues: {
      ocid: release.ocid,
      tenderId: tender?.id ?? null,
      tenderStatus: tender?.status ?? null,
      procurementMethod: null,
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

export class NestOcdsClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: NestApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    cursor?: string | null;
    signal?: AbortSignal;
  }): Promise<NestSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("NeST source is not approved for operational ingestion.");
    }

    const targetUrl = search.cursor ? validateNextUrl(search.cursor) : NEST_RELEASES;

    const response = await safeFetchApprovedSource(targetUrl, this.configuration, {
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: { Accept: "application/json" },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("NeST returned invalid JSON.");
    }

    const result = packageSchema.safeParse(body);
    if (!result.success) {
      throw new Error("NeST response did not match the documented OCDS release format.");
    }

    const now = this.dependencies.now?.() ?? new Date();
    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: NestSearchResult["rawRecords"] = [];

    for (const release of result.data.releases) {
      const mapped = mapRelease(this.source, release, now);
      if (mapped.success) {
        records.push(mapped.record);
        rawRecords.push({
          externalId: release.id,
          payload: {
            id: release.id,
            ocid: release.ocid,
            date: release.date ?? null,
            tag: release.tag,
            buyerName: release.buyer?.name ?? null,
            tenderId: release.tender?.id ?? null,
            tenderDescription: release.tender?.description ?? null,
            tenderStatus: release.tender?.status ?? null,
            tenderPeriodStartDate: release.tender?.tenderPeriod?.startDate ?? null,
            tenderPeriodEndDate: release.tender?.tenderPeriod?.endDate ?? null,
            procuringEntityName: release.tender?.procuringEntity?.name ?? null,
          },
        });
      }
    }

    const nextCursor = result.data.links.next
      ? validateNextUrl(result.data.links.next)
      : null;

    return { records, rawRecords, nextCursor };
  }
}