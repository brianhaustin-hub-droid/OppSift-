import { z } from "zod";
import {
  parsedSourceOpportunitySchema,
  sourceRegistryRecordSchema,
  type ParsedSourceOpportunity,
  type SourceRegistryRecord,
} from "./contracts";
import type { SourceConnector } from "./ingestion";
import { rawSourceRecordEnvelopeSchema } from "./persistence-contracts";
import { ContractsFinderOcdsClient } from "./contracts-finder-api";
import { AusTenderOcdsClient } from "./austender-api";
import { BoampApiClient } from "./boamp-api";
import { CanadabuysApiClient } from "./canadabuys-api";
import { KenyaPpipApiClient } from "./kenya-ppip-api";
import { KkjApiClient, nextKkjDay, PREFECTURE_COUNT } from "./kkj-api";
import { NestOcdsClient } from "./nest-api";
import { OcpBulkClient } from "./ocp-bulk-api";
import { TenderNedApiClient } from "./tenderned-api";
import { GrantsGovApiClient, mapGrantsGovOpportunity } from "./grants-gov-api";
import { SamGovApiClient } from "./sam-gov-api";
import { TedPublishedNoticesClient, type TedNotice } from "./ted-api";

const maximumRawPayloadBytes = 2_000_000;
const connectorPageSize = 100;
const connectorPagesPerRun = 10;
const cursorSchema = z.object({
  kind: z.enum(["ted", "contracts_finder", "sam_gov", "grants_gov", "austender", "boamp", "tenderned", "nest", "kenya_ppip", "ocp_bulk", "canadabuys", "kkj"]),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  position: z.union([z.number().int().nonnegative(), z.string().min(1)]),
});

type ConnectorItem = {
  externalId: string;
  sourceUrl: string;
  payload: unknown;
  parsed: ParsedSourceOpportunity;
};

type ConnectorPage = {
  records: ConnectorItem[];
  nextCursor: string | null;
};

type PageLoader = (
  cursor: string | null,
  signal?: AbortSignal,
) => Promise<ConnectorPage>;

type BufferedConnectorOptions = {
  source: SourceRegistryRecord;
  initialCursor?: string | null;
  maximumPages?: number;
  additionalBlockers?: () => readonly string[];
  loadPage: PageLoader;
};

export function assessSourceExecution(
  source: SourceRegistryRecord,
  now: Date = new Date(),
): { mode: "collection" | "investigation"; blockers: string[] } {
  const parsed = sourceRegistryRecordSchema.safeParse(source);
  if (!parsed.success) {
    return {
      mode: "investigation",
      blockers: parsed.error.issues.map((issue) => issue.message),
    };
  }
  const validated = parsed.data;
  const blockers: string[] = [];
  if (validated.activationStatus !== "active") blockers.push("source is not active");
  if (validated.integrationStatus !== "operational") blockers.push("connector is not operational");
  if (!["approved", "approved_with_constraints"].includes(validated.approvalStatus)) {
    blockers.push(`approval status is ${validated.approvalStatus}`);
  }
  if (validated.approvalExpiresAt !== null &&
      Date.parse(validated.approvalExpiresAt) <= now.getTime()) {
    blockers.push("source approval has expired");
  }
  return {
    mode: blockers.length === 0 ? "collection" : "investigation",
    blockers,
  };
}

function encodeCursor(
  kind: z.infer<typeof cursorSchema>["kind"],
  value: Omit<z.infer<typeof cursorSchema>, "kind">,
): string {
  return encodeURIComponent(JSON.stringify(cursorSchema.parse({ ...value, kind })));
}

function decodeCursor(
  value: string | null,
  kind: z.infer<typeof cursorSchema>["kind"],
): z.infer<typeof cursorSchema> | null {
  if (value === null) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(decodeURIComponent(value));
  } catch {
    throw new Error("Source API continuation cursor is malformed.");
  }
  const parsed = cursorSchema.safeParse(decoded);
  if (!parsed.success || parsed.data.kind !== kind) {
    throw new Error("Source API continuation cursor is invalid for this connector.");
  }
  const urlCursorKinds: readonly string[] = ["contracts_finder", "austender", "nest"];
  const positionMatches = urlCursorKinds.includes(kind)
    ? typeof parsed.data.position === "string" && parsed.data.to !== undefined
    : typeof parsed.data.position === "number" &&
      (kind === "ted" ? parsed.data.to === undefined : parsed.data.to !== undefined);
  if (!positionMatches) throw new Error("Source API continuation cursor has invalid pagination state.");
  return parsed.data;
}

function dateDaysAgo(now: Date, days: number): string {
  if (!Number.isFinite(now.getTime())) throw new Error("Source API connector clock is invalid.");
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceInstant(value: string | null): string | null {
  if (!value || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function tedTitle(value: unknown): string | null {
  const direct = text(value);
  if (direct) return direct;
  const translations = plainRecord(value);
  if (!translations) return null;
  return text(translations.eng) ??
    Object.values(translations).map(text).find((candidate) => candidate !== null) ??
    null;
}

function countryCode(value: unknown): string | null {
  if (typeof value === "string" && /^[A-Za-z]{2}$/u.test(value.trim())) {
    return value.trim().toUpperCase();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const code = countryCode(item);
      if (code) return code;
    }
  }
  const record = plainRecord(value);
  if (record) {
    for (const key of ["country-code", "countryCode", "code"]) {
      const code = countryCode(record[key]);
      if (code) return code;
    }
  }
  return null;
}

function tedUrl(notice: TedNotice): string {
  const links = plainRecord(notice.links);
  if (links) {
    for (const kind of ["html", "htmlDirect", "pdf", "xml"]) {
      const bucket = plainRecord(links[kind]);
      if (!bucket) continue;
      const candidate = Object.values(bucket).map(text).find((value) => {
        if (!value) return false;
        try {
          const url = new URL(value);
          return url.protocol === "https:" &&
            (url.hostname === "ted.europa.eu" || url.hostname.endsWith(".ted.europa.eu"));
        } catch {
          return false;
        }
      });
      if (candidate) return candidate;
    }
  }
  const publicationNumber = text(notice["publication-number"]);
  if (publicationNumber) {
    return `https://ted.europa.eu/en/notice/-/detail/${encodeURIComponent(publicationNumber)}`;
  }
  throw new Error("TED notice has no validated official HTML URL.");
}

const TED_ALPHA3_TO_ALPHA2: Readonly<Record<string, string>> = {
  AUT: "AT", BEL: "BE", BGR: "BG", HRV: "HR", CYP: "CY", CZE: "CZ",
  DNK: "DK", EST: "EE", FIN: "FI", FRA: "FR", DEU: "DE", GRC: "GR",
  HUN: "HU", IRL: "IE", ITA: "IT", LVA: "LV", LTU: "LT", LUX: "LU",
  MLT: "MT", NLD: "NL", POL: "PL", PRT: "PT", ROU: "RO", SVK: "SK",
  SVN: "SI", ESP: "ES", SWE: "SE", GBR: "GB", USA: "US", CAN: "CA",
  AUS: "AU", KEN: "KE", UGA: "UG", TZA: "TZ", RWA: "RW", BDI: "BI",
  ETH: "ET", SSD: "SS", IND: "IN", SGP: "SG", JPN: "JP", KOR: "KR",
  MYS: "MY", IDN: "ID", PHL: "PH", THA: "TH", VNM: "VN",
};

function toAlpha2(value: unknown): string | null {
  const code = countryCode(value);
  if (!code) return null;
  if (/^[A-Z]{2}$/.test(code)) return code;
  return TED_ALPHA3_TO_ALPHA2[code] ?? null;
}

function firstText(value: unknown): string | null {
  const direct = text(value);
  if (direct) return direct;
  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = text(item);
      if (candidate) return candidate;
    }
  }
  return null;
}

function mapTedNotice(source: SourceRegistryRecord, notice: TedNotice): ParsedSourceOpportunity {
  const externalId = text(notice["publication-number"]);
  const title = tedTitle(notice["notice-title"]);
  if (!externalId || !title) throw new Error("TED notice is missing its source ID or title.");
  const publishedText = firstText(notice["publication-date"]);
  const deadlineText = firstText(notice["deadline-receipt-tender-date-lot"]);
  const url = tedUrl(notice);
  return parsedSourceOpportunitySchema.parse({
    externalId,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: "TED notice",
    referenceNumber: externalId,
    countryCode: toAlpha2(notice["organisation-country-buyer"]),
    publisher: source.publisher,
    publishedAt: sourceInstant(publishedText),
    sourceDeadlineText: deadlineText?.slice(0, 500) ?? null,
    closingAt: sourceInstant(deadlineText),
    status: "unknown",
    sourceUrl: url,
    canonicalUrl: url,
    originalValues: {
      ted: {
        publicationNumber: externalId,
        publicationDateText: publishedText,
        deadlineText,
        buyerCountry: countryCode(notice["organisation-country-buyer"]),
      },
    },
  });
}

function mapSamNotice(
  source: SourceRegistryRecord,
  record: Record<string, unknown>,
): ParsedSourceOpportunity {
  const externalId = text(record.noticeId);
  const title = text(record.title);
  if (!externalId || !title) throw new Error("SAM.gov notice is missing its source ID or title.");
  const sourceUrl = source.apiOrFeedUrl ?? source.website;
  const publishedText = text(record.postedDate);
  const deadlineText = text(record.responseDeadLine) ?? text(record.responseDeadline);
  return parsedSourceOpportunitySchema.parse({
    externalId,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: text(record.type) ?? "unmapped",
    countryCode: "US",
    publisher: source.publisher,
    publishedAt: sourceInstant(publishedText),
    sourceDeadlineText: deadlineText?.slice(0, 500) ?? null,
    closingAt: sourceInstant(deadlineText),
    status: "unknown",
    sourceUrl,
    canonicalUrl: null,
    originalValues: { samGov: record },
  });
}

export function createBufferedConnector(options: BufferedConnectorOptions): SourceConnector {
  const source = sourceRegistryRecordSchema.parse(options.source);
  const maximumPages = options.maximumPages ?? connectorPagesPerRun;
  if (!Number.isInteger(maximumPages) || maximumPages < 1 || maximumPages > 10) {
    throw new Error("Source API connector page bound must be from 1 to 10.");
  }
  const records = new Map<string, ConnectorItem>();
  let nextCursor: string | null = null;
  let prepared = false;

  return {
    sourceId: source.id,

    async prepare(_collectionRunId, signal) {
      const assessment = assessSourceExecution(source);
      const blockers = [...assessment.blockers, ...(options.additionalBlockers?.() ?? [])];
      if (assessment.mode === "investigation" || blockers.length > 0) {
        throw new Error(`Investigation mode: ${blockers.join("; ")}. No source request was made.`);
      }
      records.clear();
      nextCursor = null;
      prepared = false;
      let cursor = options.initialCursor ?? null;
      for (let pageIndex = 0; pageIndex < maximumPages; pageIndex += 1) {
        if (signal?.aborted) {
          throw signal.reason instanceof Error ? signal.reason : new Error("Source collection was cancelled.");
        }
        const page = await options.loadPage(cursor, signal);
        for (const item of page.records) {
          const parsed = parsedSourceOpportunitySchema.parse(item.parsed);
          if (!item.externalId || parsed.externalId !== item.externalId) {
            throw new Error("Source API payload identity does not match the parsed record.");
          }
          records.set(item.externalId, { ...item, parsed });
        }
        cursor = page.nextCursor;
        if (cursor === null) break;
        if (pageIndex === maximumPages - 1) nextCursor = cursor;
      }
      prepared = true;
    },

    nextCursor() {
      return prepared ? nextCursor : null;
    },

    async discover() {
      if (!prepared) throw new Error("Source API collection has not completed preparation.");
      return [...records.keys()];
    },

    async retrieve(externalId) {
      const item = records.get(externalId);
      if (!item) throw new Error("Source API collection is missing the requested record.");
      return item;
    },

    async parse(payload) {
      const item = plainRecord(payload);
      if (!item || typeof item.externalId !== "string" || !("parsed" in item)) {
        throw new Error("Source API connector received a malformed buffered record.");
      }
      return parsedSourceOpportunitySchema.parse(item.parsed);
    },

    async toRawSourceRecord(externalId, payload, collectionRunId) {
      const item = plainRecord(payload);
      if (
        !item ||
        item.externalId !== externalId ||
        typeof item.sourceUrl !== "string" ||
        !("payload" in item)
      ) {
        throw new Error("Source API raw-record provenance does not match the discovered record.");
      }
      const serialized = JSON.stringify(item.payload);
      const encoded = new TextEncoder().encode(serialized);
      if (encoded.byteLength > maximumRawPayloadBytes) {
        throw new Error("Source API raw record exceeds the 2 MB storage limit.");
      }
      if (!globalThis.crypto?.subtle) {
        throw new Error("Web Crypto is unavailable for source API payload checksums.");
      }
      const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
      const checksum = [...new Uint8Array(digest)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      return rawSourceRecordEnvelopeSchema.parse({
        sourceId: source.id,
        externalRecordId: externalId,
        sourceUrl: item.sourceUrl,
        contentType: "application/json",
        payloadJson: item.payload,
        payloadChecksum: checksum,
        collectionRunId,
      });
    },
  };
}

export function createTedSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    pageSize?: number;
    maximumPages?: number;
  } = {},
): SourceConnector {
  const client = new TedPublishedNoticesClient(source, { fetcher: options.fetcher });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "ted");
      const from = state?.from ?? dateDaysAgo(options.now?.() ?? new Date(), 7);
      const pageNumber = typeof state?.position === "number" ? state.position : 1;
      const result = await client.search({
        publishedFrom: from,
        page: pageNumber,
        pageSize: options.pageSize ?? connectorPageSize,
        signal,
      });
      return {
        records: result.notices.map((notice) => {
          const parsed = mapTedNotice(source, notice);
          return {
            externalId: parsed.externalId,
            sourceUrl: parsed.sourceUrl,
            payload: notice,
            parsed,
          };
        }),
        nextCursor: result.nextPage === null
          ? null
          : encodeCursor("ted", { from, position: result.nextPage }),
      };
    },
  });
}

export function createContractsFinderSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    pageSize?: number;
    maximumPages?: number;
  } = {},
): SourceConnector {
  const client = new ContractsFinderOcdsClient(source, { fetcher: options.fetcher });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "contracts_finder");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 7);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const pageSize = options.pageSize ?? connectorPageSize;
      const result = await client.search({
        publishedFrom: from,
        publishedTo: to,
        pageSize,
        maxPages: 1,
        cursor: typeof state?.position === "string" ? state.position : null,
        signal,
      });
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: result.nextCursor === null
          ? null
          : encodeCursor("contracts_finder", { from, to, position: result.nextCursor }),
      };
    },
  });
}

export function createAusTenderSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    maximumPages?: number;
  } = {},
): SourceConnector {
  const client = new AusTenderOcdsClient(source, { fetcher: options.fetcher });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "austender");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 7);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const result = await client.search({
        publishedFrom: from,
        publishedTo: to,
        cursor: typeof state?.position === "string" ? state.position : null,
        signal,
      });
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: result.nextCursor === null
          ? null
          : encodeCursor("austender", { from, to, position: result.nextCursor }),
      };
    },
  });
}

export function createBoampSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    pageSize?: number;
    maximumPages?: number;
  } = {},
): SourceConnector {
  const client = new BoampApiClient(source, { fetcher: options.fetcher });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "boamp");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 7);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const offset = typeof state?.position === "number" ? state.position : 0;
      const result = await client.search({
        publishedFrom: from,
        publishedTo: to,
        limit: options.pageSize ?? connectorPageSize,
        offset,
        signal,
      });
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: result.nextOffset === null
          ? null
          : encodeCursor("boamp", { from, to, position: result.nextOffset }),
      };
    },
  });
}

export function createTenderNedSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    pageSize?: number;
    maximumPages?: number;
  } = {},
): SourceConnector {
  const client = new TenderNedApiClient(source, { fetcher: options.fetcher });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "tenderned");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 400);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const page = typeof state?.position === "number" ? state.position : 0;
      const result = await client.search({
        page,
        size: options.pageSize ?? connectorPageSize,
        signal,
      });
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: result.nextPage === null
          ? null
          : encodeCursor("tenderned", { from, to, position: result.nextPage }),
      };
    },
  });
}

export function createNestSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    maximumPages?: number;
  } = {},
): SourceConnector {
  const client = new NestOcdsClient(source, { fetcher: options.fetcher });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "nest");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 400);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const result = await client.search({
        cursor: typeof state?.position === "string" ? state.position : null,
        signal,
      });
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: result.nextCursor === null
          ? null
          : encodeCursor("nest", { from, to, position: result.nextCursor }),
      };
    },
  });
}

export function createKenyaPpipSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    maximumPages?: number;
  } = {},
): SourceConnector {
  // Forward the collection clock: the client derives tender status
  // (open/closed) from it, so dropping it here made outcomes depend on the
  // wall clock instead of the injected clock used for the cursor window.
  const client = new KenyaPpipApiClient(source, {
    fetcher: options.fetcher,
    now: options.now,
  });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "kenya_ppip");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 400);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const page = typeof state?.position === "number" ? state.position : 1;
      const result = await client.search({ page, signal });
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: result.nextPage === null
          ? null
          : encodeCursor("kenya_ppip", { from, to, position: result.nextPage }),
      };
    },
  });
}

export function createOcpBulkSourceConnector(
  source: SourceRegistryRecord,
  options: {
    publicationId: number;
    fileName: string;
    countryCode: string;
    timeZone?: string;
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    pageSize?: number;
  },
): SourceConnector {
  const client = new OcpBulkClient(source, {
    publicationId: options.publicationId,
    fileName: options.fileName,
    countryCode: options.countryCode,
    timeZone: options.timeZone,
    pageSize: options.pageSize,
  }, { fetcher: options.fetcher, now: options.now });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: 1,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "ocp_bulk");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 400);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const offset = typeof state?.position === "number" ? state.position : 0;
      const result = await client.search({
        offset,
        limit: options.pageSize ?? 500,
        signal,
      });
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: result.nextOffset === null
          ? null
          : encodeCursor("ocp_bulk", { from, to, position: result.nextOffset }),
      };
    },
  });
}

export function createCanadabuysApiConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    pageSize?: number;
    maximumPages?: number;
  } = {},
): SourceConnector {
  const client = new CanadabuysApiClient(source, { fetcher: options.fetcher });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "canadabuys");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 400);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const pageSize = options.pageSize ?? 50;
      let offset = typeof state?.position === "number" ? state.position : null;
      let count = 0;
      if (offset === null) {
        const probe = await client.search({ offset: 0, limit: 1, signal });
        count = probe.count;
        offset = Math.max(0, count - pageSize);
      }
      const result = await client.search({ offset, limit: pageSize, signal });
      count = result.count || count;
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: offset - pageSize >= 0
          ? encodeCursor("canadabuys", { from, to, position: offset - pageSize })
          : null,
      };
    },
  });
}

export function createKkjApiConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    backfillDays?: number;
    maximumPages?: number;
    sleep?: (milliseconds: number) => Promise<void>;
  } = {},
): SourceConnector {
  const client = new KkjApiClient(source, { fetcher: options.fetcher, now: options.now });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const now = options.now?.() ?? new Date();
      const yesterday = dateDaysAgo(now, 1);
      const state = decodeCursor(cursor, "kkj");
      const day = state?.from ?? firstKkjDay(now, options.backfillDays ?? 21);
      const prefecture = typeof state?.position === "number" ? state.position : 1;

      // Polite pacing: the portal's terms ask to avoid sustained heavy access.
      const sleep = options.sleep ?? ((milliseconds: number) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds)));
      await sleep(400);

      const result = await client.search({ lgCode: prefecture, day, signal });
      const rawRecords = new Map(result.rawRecords.map((record) => [record.externalId, record.payload]));

      let nextPosition = prefecture + 1;
      let nextDay = day;
      if (nextPosition > PREFECTURE_COUNT) {
        nextPosition = 1;
        const candidate = nextKkjDay(day);
        if (candidate === null || candidate > yesterday) {
          return { records: [], nextCursor: null };
        }
        nextDay = candidate;
      }
      return {
        records: result.records.map((parsed) => ({
          externalId: parsed.externalId,
          sourceUrl: parsed.sourceUrl,
          payload: rawRecords.get(parsed.externalId) ?? parsed,
          parsed,
        })),
        nextCursor: encodeCursor("kkj", { from: nextDay, to: yesterday, position: nextPosition }),
      };
    },
  });
}

function firstKkjDay(now: Date, backfillDays: number): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - backfillDays);
  return date.toISOString().slice(0, 10);
}

export function createSamGovSourceConnector(
  source: SourceRegistryRecord,
  apiKey: string | undefined,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    pageSize?: number;
    maximumPages?: number;
  } = {},
): SourceConnector {
  const client = new SamGovApiClient(source, apiKey, { fetcher: options.fetcher });
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    additionalBlockers: () => apiKey?.trim() ? [] : ["SAM.gov API key is not configured"],
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "sam_gov");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, 7);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const pageSize = options.pageSize ?? connectorPageSize;
      const offset = typeof state?.position === "number" ? state.position : 0;
      const result = await client.search({
        postedFrom: from,
        postedTo: to,
        pageIndex: offset,
        pageSize,
      }, signal);
      // SAM.gov's Opportunities v2 API can return fewer than `limit` records on
      // a page and over-report `totalRecords`, so a short page is not an error.
      // Advance by what was actually returned and stop at the first empty page.
      const nextPosition = offset + result.notices.length;
      const hasMore = result.notices.length > 0 && nextPosition < result.totalRecords;
      return {
        records: result.notices.map((notice) => {
          const parsed = mapSamNotice(source, notice);
          return {
            externalId: parsed.externalId,
            sourceUrl: parsed.sourceUrl,
            payload: notice,
            parsed,
          };
        }),
        nextCursor: hasMore
          ? encodeCursor("sam_gov", { from, to, position: nextPosition })
          : null,
      };
    },
  });
}

export function createGrantsGovSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    now?: () => Date;
    pageSize?: number;
    maximumPages?: number;
    windowDays?: number;
  } = {},
): SourceConnector {
  const client = new GrantsGovApiClient(source, { fetcher: options.fetcher });
  const windowDays = options.windowDays ?? 30;
  if (!Number.isInteger(windowDays) || windowDays < 1 || windowDays > 365) {
    throw new Error("Grants.gov collection window must be from 1 to 365 days.");
  }
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages,
    async loadPage(cursor, signal) {
      const state = decodeCursor(cursor, "grants_gov");
      const now = options.now?.() ?? new Date();
      const from = state?.from ?? dateDaysAgo(now, windowDays);
      const to = state?.to ?? now.toISOString().slice(0, 10);
      const elapsedDays = Math.max(
        1,
        Math.round((Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`) -
          Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000),
      );
      const pageSize = options.pageSize ?? connectorPageSize;
      const startRecordNum = typeof state?.position === "number" ? state.position : 0;
      const result = await client.search({
        startRecordNum,
        rows: pageSize,
        dateRangeDays: Math.min(elapsedDays, 365),
      }, signal);
      if (
        result.opportunities.length === 0 && startRecordNum < result.hitCount ||
        result.opportunities.length < pageSize &&
          startRecordNum + result.opportunities.length < result.hitCount
      ) {
        throw new Error("Grants.gov returned an incomplete page before the reported end of results.");
      }
      return {
        records: result.opportunities.map((opportunity) => {
          const parsed = mapGrantsGovOpportunity(source, opportunity);
          return {
            externalId: parsed.externalId,
            sourceUrl: parsed.sourceUrl,
            payload: opportunity,
            parsed,
          };
        }),
        nextCursor: result.nextStartRecordNum === null
          ? null
          : encodeCursor("grants_gov", {
            from,
            to,
            position: result.nextStartRecordNum,
          }),
      };
    },
  });
}
