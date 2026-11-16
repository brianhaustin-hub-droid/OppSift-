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
import { withRetry } from "./resilience";

const CONTRACTS_FINDER_ORIGIN = "https://www.contractsfinder.service.gov.uk";
const CONTRACTS_FINDER_SEARCH = `${CONTRACTS_FINDER_ORIGIN}/Published/Notices/OCDS/Search`;
const OGL_V3 = "http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";
const MAX_PAGES_PER_SEARCH = 10;
const MAX_PAGE_SIZE = 100;
const MIN_PAGE_INTERVAL_MS = 1_000;

const releaseSchema = z.object({
  id: z.string().trim().min(1),
  ocid: z.string().trim().min(1),
  date: z.string().nullable().optional(),
  tag: z.array(z.string()),
  tender: z.object({
    id: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1),
    status: z.string().nullable().optional(),
    mainProcurementCategory: z.string().trim().min(1).nullable().optional(),
    classification: z.object({
      description: z.string().trim().min(1).nullable().optional(),
    }).passthrough().optional(),
    tenderPeriod: z.object({
      endDate: z.string().nullable().optional(),
    }).passthrough().optional(),
    value: z.object({
      amount: z.union([z.number(), z.string()]).nullable().optional(),
      currency: z.string().nullable().optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

const searchResponseSchema = z.object({
  license: z.string().url(),
  releases: z.array(releaseSchema),
  links: z.object({
    next: z.string().url().optional(),
  }).passthrough().default({}),
}).passthrough();

type ContractsFinderApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
};

export type ContractsFinderSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  rejected: { externalId: string; error: string }[];
  skippedNonOpen: number;
  pagesFetched: number;
  nextCursor: string | null;
};

function parseIsoDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} must be a valid calendar date.`);
  }
  return value;
}

function makeConfiguration(
  sourceId: string,
  dependencies: ContractsFinderApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: CONTRACTS_FINDER_SEARCH,
    allowedHosts: ["www.contractsfinder.service.gov.uk"],
    pageSize: 100,
    maxPagesPerRun: MAX_PAGES_PER_SEARCH,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 15_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? 2_000_000,
    maxRetries: 2,
    minimumRetryDelayMs: 1_000,
    maximumRetryDelayMs: 8_000,
    allowedContentTypes: ["application/json"],
  });
}

function validateNextUrl(
  value: string,
  expected: { publishedFrom: string; publishedTo: string; pageSize: number },
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Contracts Finder returned an invalid pagination URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.origin !== CONTRACTS_FINDER_ORIGIN ||
    url.pathname !== new URL(CONTRACTS_FINDER_SEARCH).pathname ||
    url.username ||
    url.password
  ) {
    throw new Error("Contracts Finder returned a pagination URL outside its documented search endpoint.");
  }
  const allowedParameters = new Set(["publishedFrom", "publishedTo", "limit", "cursor", "nextCursor"]);
  const parameterNames = [...url.searchParams.keys()];
  const distinctParameters = new Set(parameterNames);
  if (
    distinctParameters.size !== parameterNames.length ||
    parameterNames.some((name) => !allowedParameters.has(name)) ||
    url.searchParams.get("publishedFrom") !== expected.publishedFrom ||
    url.searchParams.get("publishedTo") !== expected.publishedTo ||
    url.searchParams.get("limit") !== String(expected.pageSize) ||
    !url.searchParams.has("cursor") && !url.searchParams.has("nextCursor")
  ) {
    throw new Error("Contracts Finder pagination URL does not preserve the requested date and page bounds.");
  }
  return url.toString();
}

function asTimestamp(value: string | null | undefined) {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapStatus(status: string | null | undefined, closingAt: string | null, now: Date) {
  const normalized = status?.toLowerCase();
  if (normalized === "cancelled") return "cancelled" as const;
  if (normalized === "complete") return "closed" as const;
  if (normalized === "active") {
    return closingAt && Date.parse(closingAt) < now.getTime() ? "closed" as const : "open" as const;
  }
  return "unknown" as const;
}

function mapRelease(
  source: SourceRegistryRecord,
  release: z.infer<typeof releaseSchema>,
  now: Date,
) {
  const tender = release.tender;
  if (!tender) {
    return { success: false as const, error: "Tender notice is missing its tender object." };
  }
  const sourceCategoryTerm = tender.mainProcurementCategory ?? tender.classification?.description;
  if (!sourceCategoryTerm) {
    return { success: false as const, error: "Tender notice is missing its procurement category." };
  }

  const closingAt = asTimestamp(tender.tenderPeriod?.endDate);
  const amountValue = tender.value?.amount;
  const amount = amountValue === undefined || amountValue === null
    ? null
    : String(amountValue);
  const candidate = {
    externalId: release.id,
    title: tender.title,
    // OGL v3 excludes personal data; do not retain free-text notice descriptions.
    description: null,
    sourceCategoryTerm,
    referenceNumber: tender.id ?? null,
    countryCode: "GB",
    region: null,
    city: null,
    issuingInstitution: null,
    procuringOrganization: null,
    publisher: source.publisher,
    publishedAt: asTimestamp(release.date),
    sourceDeadlineText: tender.tenderPeriod?.endDate ?? null,
    closingAt,
    timeZone: closingAt ? "Europe/London" : null,
    status: mapStatus(tender.status, closingAt, now),
    sourceUrl: `${CONTRACTS_FINDER_ORIGIN}/Published/OCDS/Release/${encodeURIComponent(release.id)}`,
    canonicalUrl: null,
    currency: tender.value?.currency ?? null,
    amount,
    originalValues: {
      ocid: release.ocid,
      noticeType: "tender",
      mainProcurementCategory: tender.mainProcurementCategory ?? null,
      classificationDescription: tender.classification?.description ?? null,
    },
  };
  const parsed = parsedSourceOpportunitySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    };
  }
  return { success: true as const, record: parsed.data };
}

export class ContractsFinderOcdsClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: ContractsFinderApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    publishedFrom: string;
    publishedTo: string;
    pageSize?: number;
    maxPages?: number;
    cursor?: string | null;
    signal?: AbortSignal;
  }): Promise<ContractsFinderSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("Contracts Finder source is not approved for operational ingestion.");
    }

    const publishedFrom = parseIsoDate(search.publishedFrom, "publishedFrom");
    const publishedTo = parseIsoDate(search.publishedTo, "publishedTo");
    if (publishedTo < publishedFrom) {
      throw new Error("publishedTo must be on or after publishedFrom.");
    }
    const pageSize = search.pageSize ?? 50;
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new Error(`pageSize must be an integer from 1 to ${MAX_PAGE_SIZE}.`);
    }
    const maxPages = search.maxPages ?? 1;
    if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > MAX_PAGES_PER_SEARCH) {
      throw new Error(`maxPages must be an integer from 1 to ${MAX_PAGES_PER_SEARCH}.`);
    }

    let nextUrl: string;
    if (search.cursor) {
      nextUrl = validateNextUrl(search.cursor, { publishedFrom, publishedTo, pageSize });
    } else {
      const url = new URL(CONTRACTS_FINDER_SEARCH);
      url.searchParams.set("publishedFrom", publishedFrom);
      url.searchParams.set("publishedTo", publishedTo);
      url.searchParams.set("limit", String(pageSize));
      nextUrl = url.toString();
    }

    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: ContractsFinderSearchResult["rawRecords"] = [];
    const rejected: ContractsFinderSearchResult["rejected"] = [];
    let skippedNonOpen = 0;
    let pagesFetched = 0;
    const seenUrls = new Set<string>();
    const sleep = this.dependencies.sleep ?? ((milliseconds: number) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));

    while (nextUrl && pagesFetched < maxPages) {
      if (seenUrls.has(nextUrl)) throw new Error("Contracts Finder repeated a pagination URL.");
      seenUrls.add(nextUrl);
      if (pagesFetched > 0) await sleep(MIN_PAGE_INTERVAL_MS);

      const currentUrl = nextUrl;
      const response = await withRetry(
        () => safeFetchApprovedSource(currentUrl, this.configuration, {
          signal: search.signal,
          fetcher: this.dependencies.fetcher,
          headers: { Accept: "application/json" },
        }),
        {
          maxRetries: this.configuration.maxRetries,
          minimumDelayMs: this.configuration.minimumRetryDelayMs,
          maximumDelayMs: this.configuration.maximumRetryDelayMs,
        },
        {
          sleep,
          random: () => 0,
        },
      );

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("Contracts Finder returned invalid JSON.");
      }

      const parsed = searchResponseSchema.safeParse(body);
      if (!parsed.success || parsed.data.license !== OGL_V3) {
        throw new Error("Contracts Finder response did not match the documented OCDS format or OGL v3 license.");
      }
      if (parsed.data.releases.length > pageSize) {
        throw new Error("Contracts Finder returned more releases than requested.");
      }

      const now = this.dependencies.now?.() ?? new Date();
      for (const release of parsed.data.releases) {
        const tender = release.tender;
        if (!release.tag.includes("tender") || tender?.status?.toLowerCase() !== "active") {
          skippedNonOpen += 1;
          continue;
        }
        rawRecords.push({
          externalId: release.id,
          payload: {
            id: release.id,
            ocid: release.ocid,
            date: release.date ?? null,
            tag: release.tag,
            tender: tender ? {
              id: tender.id ?? null,
              title: tender.title,
              status: tender.status ?? null,
              mainProcurementCategory: tender.mainProcurementCategory ?? null,
              classificationDescription: tender.classification?.description ?? null,
              tenderPeriodEndDate: tender.tenderPeriod?.endDate ?? null,
              amount: tender.value?.amount ?? null,
              currency: tender.value?.currency ?? null,
            } : null,
          },
        });
        const mapped = mapRelease(this.source, release, now);
        if (mapped.success) {
          records.push(mapped.record);
        } else {
          rejected.push({ externalId: release.id, error: mapped.error });
        }
      }

      const followingUrl = parsed.data.links.next
        ? validateNextUrl(parsed.data.links.next, { publishedFrom, publishedTo, pageSize })
        : null;
      if (followingUrl === currentUrl) {
        throw new Error("Contracts Finder returned a self-referencing pagination URL.");
      }
      nextUrl = followingUrl ?? "";
      pagesFetched += 1;
    }

    return {
      records,
      rawRecords,
      rejected,
      skippedNonOpen,
      pagesFetched,
      nextCursor: nextUrl || null,
    };
  }
}
