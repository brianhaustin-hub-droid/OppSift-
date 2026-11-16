import { supportedCountries } from "../../../src/features/opportunities/country-registry";
import {
  connectorConfigurationSchema,
  type ConnectorConfiguration,
} from "./connectors";
import {
  parsedSourceOpportunitySchema,
  sourceRegistryRecordSchema,
  type QualityIssue,
  type SourceRegistryRecord,
} from "./contracts";
import type { SourceConnector } from "./ingestion";
import { rawSourceRecordEnvelopeSchema } from "./persistence-contracts";
import { ClassifiedRequestError, withRetry, type RetryDependencies } from "./resilience";
import { safeFetchApprovedSource } from "./safe-fetch";

export const WORLD_BANK_API_ENDPOINT = "https://search.worldbank.org/api/procnotices";
export const WORLD_BANK_DATASET_URL =
  "https://datacatalog.worldbank.org/search/dataset/0037795/world-bank-procurement-notices";
export const WORLD_BANK_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";

const APPROVED_CONNECTOR_ID = "world-bank-procurement-notices";
const OPEN_NOTICE_TYPES = new Set([
  "request for expression of interest",
]);
const monthNumbers: Readonly<Record<string, string>> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};
const maximumRawPayloadBytes = 2_000_000;

type JsonRecord = Record<string, unknown>;

type IndexedNotice = {
  externalId: string;
  record: JsonRecord;
  pageUrl: string;
};

type WorldBankConnectorOptions = {
  currentCursor?: string | null;
  pageSize?: number;
  maxPagesPerRun?: number;
  maxRequestsPerRun?: number;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  maxRetries?: number;
  minimumRetryDelayMs?: number;
  maximumRetryDelayMs?: number;
  minimumRequestIntervalMs?: number;
  now?: () => Date;
  fetcher?: typeof fetch;
  retryDependencies?: RetryDependencies;
};

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sourceText(record: JsonRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function safeCount(value: unknown, label: string): number {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`World Bank API response has an invalid ${label}.`);
  }
  return parsed;
}

function parseCursor(value: string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (!/^\d+$/u.test(value)) throw new Error("World Bank offset cursor is invalid.");
  const offset = Number(value);
  if (!Number.isSafeInteger(offset)) throw new Error("World Bank offset cursor exceeds the safe integer range.");
  return offset;
}

function dateParts(value: string | null): {
  instant: string | null;
  dateOnly: string | null;
} {
  if (!value) return { instant: null, dateOnly: null };
  const namedMonthMatch = /^(\d{1,2})-([a-z]{3})-(\d{4})$/iu.exec(value);
  if (namedMonthMatch) {
    const month = monthNumbers[namedMonthMatch[2]!.toLowerCase()];
    if (!month) return { instant: null, dateOnly: null };
    const day = namedMonthMatch[1]!.padStart(2, "0");
    const canonical = `${namedMonthMatch[3]}-${month}-${day}`;
    const parsed = new Date(`${canonical}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== canonical) {
      return { instant: null, dateOnly: null };
    }
    return { instant: null, dateOnly: canonical };
  }
  const dateOnlyMatch = /^(\d{4})[-/](\d{2})[-/](\d{2})$/u.exec(value);
  if (dateOnlyMatch) {
    const canonical = `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
    const parsed = new Date(`${canonical}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== canonical) {
      return { instant: null, dateOnly: null };
    }
    return { instant: null, dateOnly: canonical };
  }
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) return { instant: null, dateOnly: null };
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? { instant: parsed.toISOString(), dateOnly: null }
    : { instant: null, dateOnly: null };
}

function normalizedCountryName(value: string): string {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function countryCode(record: JsonRecord): string | null {
  const name = sourceText(record, ["project_ctry_name"]);
  if (!name) return null;
  const normalizedName = normalizedCountryName(name);
  return supportedCountries.find(
    (country) => normalizedCountryName(country.name) === normalizedName,
  )?.code ?? null;
}

function safeWorldBankUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.hostname !== "worldbank.org" && !url.hostname.endsWith(".worldbank.org"))
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isOpenSolicitation(record: JsonRecord, now: Date): boolean {
  const type = sourceText(record, ["notice_type"])?.toLowerCase();
  const status = sourceText(record, ["notice_status"])?.toLowerCase();
  if (!type || !OPEN_NOTICE_TYPES.has(type) || !status || !["published", "revised"].includes(status)) {
    return false;
  }
  const deadline = dateParts(sourceText(record, ["submission_date"]));
  if (deadline.instant) return Date.parse(deadline.instant) > now.getTime();
  if (deadline.dateOnly) return deadline.dateOnly > now.toISOString().slice(0, 10);
  return false;
}

function responseNotices(value: unknown): Array<{ key: string | null; record: JsonRecord }> {
  if (Array.isArray(value)) {
    return value.map((record) => {
      if (!isRecord(record)) throw new Error("World Bank API response contains a malformed notice.");
      return { key: null, record };
    });
  }
  if (!isRecord(value)) {
    throw new Error("World Bank API response has an unexpected procnotices structure.");
  }
  return Object.entries(value).map(([key, record]) => {
    if (!isRecord(record)) throw new Error("World Bank API response contains a malformed notice.");
    return { key, record };
  });
}

function makeConfiguration(
  sourceId: string,
  options: WorldBankConnectorOptions,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: WORLD_BANK_API_ENDPOINT,
    allowedHosts: ["search.worldbank.org"],
    pageSize: options.pageSize ?? 100,
    maxPagesPerRun: options.maxPagesPerRun ?? 10,
    requestTimeoutMs: options.requestTimeoutMs ?? 15_000,
    maxResponseBytes: options.maxResponseBytes ?? maximumRawPayloadBytes,
    maxRetries: options.maxRetries ?? 2,
    minimumRetryDelayMs: options.minimumRetryDelayMs ?? 1_000,
    maximumRetryDelayMs: options.maximumRetryDelayMs ?? 30_000,
    allowedContentTypes: ["application/json"],
  });
}

function sleepWithSignal(
  milliseconds: number,
  signal: AbortSignal | undefined,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(
      signal.reason instanceof Error ? signal.reason : new Error("World Bank collection was cancelled."),
    );
  }
  if (!signal) return sleep(milliseconds);

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(signal.reason instanceof Error ? signal.reason : new Error("World Bank collection was cancelled."));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    sleep(milliseconds).then(
      () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

function assertSourceAuthorized(source: SourceRegistryRecord) {
  if (
    source.connectorIdentifier !== APPROVED_CONNECTOR_ID ||
    source.activationStatus !== "active" ||
    source.integrationStatus !== "operational" ||
    !["approved", "approved_with_constraints"].includes(source.approvalStatus) ||
    !["verified", "reliable"].includes(source.reliability) ||
    (source.approvalExpiresAt !== null &&
      Date.parse(source.approvalExpiresAt) <= Date.now())
  ) {
    throw new Error("World Bank source is not approved for operational ingestion.");
  }

  const configuredEndpoint = source.apiOrFeedUrl ? new URL(source.apiOrFeedUrl) : null;
  const expectedEndpoint = new URL(WORLD_BANK_API_ENDPOINT);
  if (
    !configuredEndpoint ||
    configuredEndpoint.protocol !== expectedEndpoint.protocol ||
    configuredEndpoint.hostname !== expectedEndpoint.hostname ||
    configuredEndpoint.pathname !== expectedEndpoint.pathname
  ) {
    throw new Error("World Bank registry endpoint does not match the reviewed API endpoint.");
  }
}

export function createWorldBankProcurementConnector(
  sourceInput: SourceRegistryRecord,
  options: WorldBankConnectorOptions = {},
): SourceConnector {
  const source = sourceRegistryRecordSchema.parse(sourceInput);
  const configuration = makeConfiguration(source.id, options);
  if (
    configuration.pageSize > 100 ||
    configuration.maxPagesPerRun > 10 ||
    configuration.maxResponseBytes > maximumRawPayloadBytes
  ) {
    throw new Error("World Bank connector bounds exceed its maximum page, run, or payload limits.");
  }
  const records = new Map<string, IndexedNotice>();
  const collectionIssues: QualityIssue[] = [];
  let continuationCursor: string | null = null;
  let prepared = false;
  let requestsMade = 0;
  const now = options.now ?? (() => new Date());
  const pageSize = configuration.pageSize;
  const maxPages = configuration.maxPagesPerRun;
  const maxRequests = options.maxRequestsPerRun ?? maxPages * (configuration.maxRetries + 1);
  if (!Number.isInteger(maxRequests) || maxRequests < maxPages || maxRequests > 30) {
    throw new Error("World Bank per-run request budget must cover each page and be at most 30.");
  }
  const minimumRequestIntervalMs = options.minimumRequestIntervalMs ?? 1_000;
  if (!Number.isInteger(minimumRequestIntervalMs) || minimumRequestIntervalMs < 250 ||
      minimumRequestIntervalMs > 60_000) {
    throw new Error("World Bank request interval must be between 250 and 60000 milliseconds.");
  }

  async function fetchPage(offset: number, signal?: AbortSignal): Promise<{
    url: string;
    total: number;
    records: Array<{ key: string | null; record: JsonRecord }>;
  }> {
    const url = new URL(WORLD_BANK_API_ENDPOINT);
    url.searchParams.set("format", "json");
    url.searchParams.set("rows", String(pageSize));
    url.searchParams.set("os", String(offset));

    const response = await withRetry(async () => {
      if (signal?.aborted) {
        throw new ClassifiedRequestError({
          kind: "timeout",
          message: "World Bank collection was cancelled.",
          retryable: false,
        });
      }
      if (requestsMade >= maxRequests) {
        throw new ClassifiedRequestError({
          kind: "configuration",
          message: "World Bank per-run request budget was exhausted.",
          retryable: false,
        });
      }
      requestsMade += 1;
      return safeFetchApprovedSource(url.toString(), configuration, {
        headers: { Accept: "application/json" },
        signal,
        fetcher: options.fetcher,
      });
    }, {
      maxRetries: configuration.maxRetries,
      minimumDelayMs: configuration.minimumRetryDelayMs,
      maximumDelayMs: configuration.maximumRetryDelayMs,
    }, options.retryDependencies);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("World Bank API returned invalid JSON.");
    }
    if (!isRecord(body)) throw new Error("World Bank API returned an unexpected response structure.");
    if (!("os" in body) || !("total" in body) || !("procnotices" in body)) {
      throw new Error("World Bank API returned an unexpected response structure.");
    }

    const responseOffset = safeCount(body.os, "offset");
    const total = safeCount(body.total, "total count");
    if (responseOffset !== offset) {
      throw new Error("World Bank API response offset did not match the requested page.");
    }
    const notices = responseNotices(body.procnotices);
    if (notices.length > pageSize) {
      throw new Error("World Bank API returned more notices than requested.");
    }
    if (notices.length === 0 && offset < total) {
      throw new Error("World Bank API returned an empty page before the reported end of results.");
    }
    return { url: url.toString(), total, records: notices };
  }

  return {
    sourceId: source.id,

    async prepare(_collectionRunId, signal) {
      assertSourceAuthorized(source);
      records.clear();
      collectionIssues.length = 0;
      requestsMade = 0;
      continuationCursor = null;
      prepared = false;
      let offset = parseCursor(options.currentCursor);
      let latestTotal = Number.MAX_SAFE_INTEGER;

      for (let pageIndex = 0; pageIndex < maxPages && offset < latestTotal; pageIndex += 1) {
        if (pageIndex > 0) {
          await sleepWithSignal(
            minimumRequestIntervalMs,
            signal,
            options.retryDependencies?.sleep ??
              ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))),
          );
        }
        const page = await fetchPage(offset, signal);
        latestTotal = page.total;
        if (page.records.length < pageSize && offset + page.records.length < latestTotal) {
          throw new Error("World Bank API returned a short page before the reported end of results.");
        }

        for (const { key, record } of page.records) {
          const externalId = sourceText(record, ["id"]) ?? key;
          if (!externalId) {
            throw new Error("World Bank API notice is missing its source-native identifier.");
          }
          if (!isOpenSolicitation(record, now())) continue;
          records.set(externalId, { externalId, record, pageUrl: page.url });
        }
        offset += page.records.length;
        if (page.records.length === 0) break;
      }

      if (offset < latestTotal) {
        continuationCursor = String(offset);
        collectionIssues.push({
          code: "world_bank_page_budget_reached",
          message: `Collection stopped at the configured ${maxPages}-page bound; the offset cursor will resume at ${offset}.`,
          severity: "warning",
        });
      } else {
        continuationCursor = null;
      }
      prepared = true;
    },

    collectionIssues() {
      return collectionIssues;
    },

    nextCursor() {
      return prepared ? continuationCursor : null;
    },

    async discover() {
      if (!prepared) throw new Error("World Bank collection has not completed preparation.");
      return [...records.keys()];
    },

    async retrieve(externalId) {
      const notice = records.get(externalId);
      if (!notice) throw new Error("World Bank collection is missing the requested notice.");
      return notice;
    },

    async parse(payload) {
      if (!isRecord(payload) || typeof payload.externalId !== "string" ||
          !isRecord(payload.record) || typeof payload.pageUrl !== "string") {
        throw new Error("World Bank connector received a malformed notice payload.");
      }
      const record = payload.record;
      const title = sourceText(record, ["bid_description"]);
      if (!title) throw new Error("World Bank notice is missing its bid description.");

      const noticeType = sourceText(record, ["notice_type"]);
      const publicationDateText = sourceText(record, ["noticedate", "publication_date"]);
      const deadlineText = sourceText(record, ["submission_date"]);
      const publicationDate = dateParts(publicationDateText);
      const deadline = dateParts(deadlineText);
      const noticeUrlText = sourceText(record, ["url"]);
      const noticeUrl = safeWorldBankUrl(noticeUrlText);
      const countryName = sourceText(record, ["project_ctry_name"]);
      const projectId = sourceText(record, ["project_id"]);
      const projectName = sourceText(record, ["project_name"]);
      const procurementCategory = sourceText(record, ["procurement_category"]);
      const procurementMethod = sourceText(record, ["procurement_method_name"]);
      const sector = sourceText(record, ["sector"]);
      const referenceNumber = sourceText(record, ["bid_reference_no"]);

      return parsedSourceOpportunitySchema.parse({
        externalId: payload.externalId,
        title: title.slice(0, 1000),
        description: title,
        sourceCategoryTerm: noticeType,
        referenceNumber,
        countryCode: countryCode(record),
        region: sourceText(record, ["regionname"]),
        city: null,
        issuingInstitution: null,
        procuringOrganization: null,
        publisher: source.publisher,
        publishedAt: publicationDate.instant,
        sourceDeadlineText: deadlineText?.slice(0, 500) ?? null,
        closingAt: deadline.instant,
        timeZone: null,
        status: "open",
        sourceUrl: noticeUrl ?? payload.pageUrl,
        canonicalUrl: noticeUrl,
        currency: null,
        amount: null,
        originalValues: {
          worldBankProcurement: {
            noticeType,
            noticeStatus: sourceText(record, ["notice_status"]),
            publicationDateText,
            submissionDateText: deadlineText,
            bidReferenceNumber: referenceNumber,
            projectId,
            projectName,
            countryName,
            procurementCategory,
            procurementMethod,
            sector,
            originalNoticeUrl: noticeUrlText,
            apiPageUrl: payload.pageUrl,
            attributionPublisher: "World Bank Group",
            datasetCatalogUrl: WORLD_BANK_DATASET_URL,
            catalogLicenseUrl: WORLD_BANK_LICENSE_URL,
            licenseApplicability: "Dataset-specific applicability to this API response remains under review.",
          },
        },
      });
    },

    async toRawSourceRecord(externalId, payload, collectionRunId) {
      if (!isRecord(payload) ||
          payload.externalId !== externalId ||
          !isRecord(payload.record) ||
          typeof payload.pageUrl !== "string") {
        throw new Error("World Bank raw-record provenance does not match the discovered notice.");
      }
      const serialized = JSON.stringify(payload.record);
      const encoded = new TextEncoder().encode(serialized);
      if (encoded.byteLength > maximumRawPayloadBytes) {
        throw new Error("World Bank notice exceeds the raw-record storage size limit.");
      }
      if (!globalThis.crypto?.subtle) {
        throw new Error("Web Crypto is unavailable for World Bank payload checksums.");
      }
      const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
      const checksum = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      return rawSourceRecordEnvelopeSchema.parse({
        sourceId: source.id,
        externalRecordId: externalId,
        sourceUrl: payload.pageUrl,
        contentType: "application/json",
        payloadJson: payload.record,
        payloadChecksum: checksum,
        collectionRunId,
      });
    },
  };
}
