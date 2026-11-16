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

const AUSTENDER_ORIGIN = "https://api.tenders.gov.au";
const FIND_BY_DATES = `${AUSTENDER_ORIGIN}/ocds/findByDates/contractPublished`;
const CC_BY_3_AU = "https://creativecommons.org/licenses/by/3.0/au/";

const releaseSchema = z.object({
  id: z.string().trim().min(1),
  ocid: z.string().trim().min(1),
  date: z.string().nullable().optional(),
  tag: z.array(z.string()).default([]),
  tender: z.object({
    title: z.string().trim().min(1).nullable().optional(),
  }).passthrough().optional(),
  contracts: z.array(z.object({
    id: z.string().trim().min(1).nullable().optional(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    dateSigned: z.string().nullable().optional(),
    value: z.object({
      amount: z.union([z.number(), z.string()]).nullable().optional(),
      currency: z.string().nullable().optional(),
    }).passthrough().optional(),
  }).passthrough()).default([]),
  parties: z.array(z.object({
    id: z.string().nullable().optional(),
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

type AusTenderApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
};

export type AusTenderSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  rejected: { externalId: string; error: string }[];
  nextCursor: string | null;
};

function makeConfiguration(
  sourceId: string,
  dependencies: AusTenderApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: FIND_BY_DATES,
    allowedHosts: ["api.tenders.gov.au"],
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
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** AusTender accepts second-precision ISO 8601 (no milliseconds). */
function toIsoSeconds(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}

/** Normalize an OCDS amount to the repository's `\d{1,16}(\.\d{1,4})?` form. */
function sanitizeAmount(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number"
    ? value
    : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const rounded = Math.round(numeric * 10_000) / 10_000;
  const text = rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return /^\d{1,16}(\.\d{1,4})?$/.test(text) ? text : null;
}

function firstParty(
  release: z.infer<typeof releaseSchema>,
  role: string,
): string | null {
  const party = release.parties.find((candidate) => candidate.roles.includes(role));
  return party?.name ?? null;
}

function validateNextUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.origin !== AUSTENDER_ORIGIN ||
    !url.pathname.startsWith("/ocds/findByDates/contractPublished/") ||
    url.username ||
    url.password
  ) {
    throw new Error("AusTender returned a pagination URL outside its documented endpoint.");
  }
  return url.toString();
}

function mapRelease(
  source: SourceRegistryRecord,
  release: z.infer<typeof releaseSchema>,
): { success: true; record: ParsedSourceOpportunity } | { success: false; error: string } {
  const contract = release.contracts[0];
  const title = contract?.description?.trim() ||
    contract?.title?.trim() ||
    release.tender?.title?.trim() ||
    release.ocid;
  if (!title) {
    return { success: false, error: "AusTender release is missing a contract title." };
  }

  const contractId = contract?.id?.trim() ?? null;
  const publishedAt = asTimestamp(release.date) ?? asTimestamp(contract?.dateSigned);
  const amount = sanitizeAmount(contract?.value?.amount);
  const currency = contract?.value?.currency ?? null;
  const sourceUrl = contractId
    ? `${AUSTENDER_ORIGIN}/ocds/findById/${encodeURIComponent(contractId)}`
    : `${AUSTENDER_ORIGIN}/ocds/findById/${encodeURIComponent(release.ocid)}`;

  const candidate: ParsedSourceOpportunity = {
    externalId: release.id,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: "Contract Award",
    referenceNumber: contractId?.slice(0, 200) ?? null,
    countryCode: "AU",
    region: null,
    city: null,
    issuingInstitution: null,
    procuringOrganization: firstParty(release, "procuringEntity") ??
      firstParty(release, "buyer"),
    publisher: source.publisher,
    publishedAt,
    sourceDeadlineText: null,
    closingAt: null,
    timeZone: null,
    status: "awarded",
    sourceUrl,
    canonicalUrl: null,
    currency,
    amount,
    originalValues: {
      ocid: release.ocid,
      contractId,
      dateSignedText: contract?.dateSigned ?? null,
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

export class AusTenderOcdsClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: AusTenderApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    publishedFrom: string;
    publishedTo: string;
    cursor?: string | null;
    signal?: AbortSignal;
  }): Promise<AusTenderSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("AusTender source is not approved for operational ingestion.");
    }

    const fromDate = new Date(`${search.publishedFrom}T00:00:00.000Z`);
    const toDate = new Date(`${search.publishedTo}T00:00:00.000Z`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate < fromDate) {
      throw new Error("AusTender date window is invalid.");
    }
    const from = toIsoSeconds(fromDate);
    const to = toIsoSeconds(toDate);

    const targetUrl = search.cursor
      ? validateNextUrl(search.cursor)
      : `${FIND_BY_DATES}/${from}/${to}`;

    const response = await safeFetchApprovedSource(targetUrl, this.configuration, {
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: { Accept: "application/json" },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("AusTender returned invalid JSON.");
    }

    const result = packageSchema.safeParse(body);
    if (!result.success || result.data.license !== CC_BY_3_AU) {
      throw new Error("AusTender response did not match the documented OCDS format or license.");
    }

    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: AusTenderSearchResult["rawRecords"] = [];
    const rejected: AusTenderSearchResult["rejected"] = [];

    for (const release of result.data.releases) {
      const mapped = mapRelease(this.source, release);
      const rawPayload = {
        id: release.id,
        ocid: release.ocid,
        date: release.date ?? null,
        tag: release.tag,
        contract: release.contracts[0]
          ? {
              id: release.contracts[0].id ?? null,
              title: release.contracts[0].title ?? null,
              description: release.contracts[0].description ?? null,
              dateSigned: release.contracts[0].dateSigned ?? null,
              amount: release.contracts[0].value?.amount ?? null,
              currency: release.contracts[0].value?.currency ?? null,
            }
          : null,
        procuringEntity: firstParty(release, "procuringEntity"),
      };
      if (mapped.success) {
        records.push(mapped.record);
        rawRecords.push({ externalId: release.id, payload: rawPayload });
      } else {
        rejected.push({ externalId: release.id, error: mapped.error });
      }
    }

    const nextCursor = result.data.links.next
      ? validateNextUrl(result.data.links.next)
      : null;

    return { records, rawRecords, rejected, nextCursor };
  }
}