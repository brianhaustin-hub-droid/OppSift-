import { DOMParser } from "linkedom";
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

// 官公需情報ポータルサイト (Official Public Demand Information Portal),
// operated by Japan's SME Agency. Public XML search API, no key:
//   https://www.kkj.go.jp/api/?LG_Code=<prefecture 1-47>&CFT_Issue_Date=<day>/<day>&Count=<n>
// The API pages by narrowing the query: one request covers one prefecture
// for one notice-date window, up to Count results (site maximum 100).
const KKJ_ORIGIN = "https://www.kkj.go.jp";
const KKJ_API = `${KKJ_ORIGIN}/api/`;
const KKJ_HOSTS = ["www.kkj.go.jp", "kkj.go.jp"];
const PREFECTURE_COUNT = 47;

type KkjApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
};

export type KkjSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  totalHits: number;
};

export type KkjQuery = {
  lgCode: number;
  day: string;
};

export function firstKkjDay(now: Date, backfillDays: number): string {
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - backfillDays,
    ),
  );
  return start.toISOString().slice(0, 10);
}

export function nextKkjDay(day: string): string | null {
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function makeConfiguration(
  sourceId: string,
  dependencies: KkjApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: KKJ_API,
    allowedHosts: KKJ_HOSTS,
    pageSize: 100,
    maxPagesPerRun: 10,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 20_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? 10_000_000,
    maxRetries: 3,
    minimumRetryDelayMs: 1_000,
    maximumRetryDelayMs: 30_000,
    allowedContentTypes: ["text/xml", "application/xml"],
  });
}

function childText(element: Element | null, tagName: string): string | null {
  const child = element?.getElementsByTagName(tagName)[0];
  const value = child?.textContent?.trim();
  return value ? value : null;
}

function asTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapStatus(deadline: string | null, now: Date): "open" | "closed" | "unknown" {
  if (!deadline) return "unknown";
  const timestamp = Date.parse(deadline);
  if (Number.isNaN(timestamp)) return "unknown";
  return timestamp > now.getTime() ? "open" : "closed";
}

function detailUrl(key: string): string {
  return `${KKJ_ORIGIN}/d/?D=${encodeURIComponent(key)}&L=ja`;
}

export function mapSearchResult(
  source: SourceRegistryRecord,
  resultElement: Element,
  now: Date,
): { success: true; record: ParsedSourceOpportunity } | { success: false; error: string } {
  const key = childText(resultElement, "Key");
  const title = childText(resultElement, "ProjectName");
  if (!title) {
    return { success: false, error: "KKJ result is missing its project name." };
  }
  const externalId = key ?? childText(resultElement, "ExternalDocumentURI")
    ?? `kkj-${childText(resultElement, "LgCode") ?? "jp"}-${title.slice(0, 60)}`;

  const publishedAt = asTimestamp(childText(resultElement, "Date"));
  // The API exposes no dedicated submission-deadline field in practice;
  // CftIssueDate (bid/notice date) is the only forward-looking date returned.
  const bidDate = asTimestamp(childText(resultElement, "CftIssueDate"));
  const submissionDeadline = asTimestamp(childText(resultElement, "TenderSubmissionDeadline"));
  const openingEvent = asTimestamp(childText(resultElement, "OpeningTendersEvent"));
  const closingAt = submissionDeadline ?? bidDate;

  const externalDocumentUri = childText(resultElement, "ExternalDocumentURI");
  const candidate: ParsedSourceOpportunity = {
    externalId,
    title: title.slice(0, 1000),
    description: childText(resultElement, "ProjectDescription")?.slice(0, 4000) ?? null,
    sourceCategoryTerm: childText(resultElement, "Category") ?? "Tender Notice",
    referenceNumber: null,
    countryCode: "JP",
    region: childText(resultElement, "PrefectureName"),
    city: childText(resultElement, "CityName"),
    issuingInstitution: null,
    procuringOrganization: childText(resultElement, "OrganizationName"),
    publisher: source.publisher,
    publishedAt,
    sourceDeadlineText: bidDate?.slice(0, 500) ?? null,
    closingAt,
    timeZone: closingAt ? "Asia/Tokyo" : null,
    status: mapStatus(closingAt, now),
    sourceUrl: key ? detailUrl(key) : externalDocumentUri ?? KKJ_ORIGIN,
    canonicalUrl: externalDocumentUri,
    currency: null,
    amount: null,
    originalValues: {
      key,
      lgCode: childText(resultElement, "LgCode"),
      cityCode: childText(resultElement, "CityCode"),
      fileType: childText(resultElement, "FileType"),
      fileSize: childText(resultElement, "FileSize"),
      procedureType: childText(resultElement, "ProcedureType"),
      certification: childText(resultElement, "Certification"),
      bidDate,
      openingEvent,
      externalDocumentUri,
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

export class KkjApiClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: KkjApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: KkjQuery & { signal?: AbortSignal }): Promise<KkjSearchResult> {
    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("KKJ source is not approved for operational ingestion.");
    }
    const lgCode = Number(search.lgCode);
    if (!Number.isSafeInteger(lgCode) || lgCode < 1 || lgCode > PREFECTURE_COUNT) {
      throw new Error("KKJ LG_Code must be a prefecture code from 1 to 47.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(search.day)) {
      throw new Error("KKJ day must be formatted as YYYY-MM-DD.");
    }

    const url = new URL(KKJ_API);
    // The API's LgCode values are zero-padded two-digit strings ("06");
    // single-digit codes are rejected as no-match otherwise.
    url.searchParams.set("LG_Code", String(lgCode).padStart(2, "0"));
    url.searchParams.set("CFT_Issue_Date", `${search.day}/${search.day}`);
    url.searchParams.set("Count", "100");

    const response = await safeFetchApprovedSource(url.toString(), this.configuration, {
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: {
        Accept: "text/xml, application/xml",
        "User-Agent": "OppSift/1.0 (+https://getoppsift.com; uses the kkj.go.jp search API)",
      },
    });

    let xml: string;
    try {
      xml = await response.text();
    } catch {
      throw new Error("KKJ response could not be read.");
    }

    const document = new DOMParser().parseFromString(xml, "text/xml");
    const errorElement = document.querySelector("Error");
    if (errorElement?.textContent) {
      throw new Error(`KKJ API returned an error: ${errorElement.textContent.trim().slice(0, 300)}`);
    }

    const searchResults = document.querySelector("SearchResults");
    if (!searchResults) {
      throw new Error("KKJ response did not match the documented search API format.");
    }

    const totalHits = Number(childText(searchResults, "SearchHits") ?? "0") || 0;
    const now = this.dependencies.now?.() ?? new Date();
    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: KkjSearchResult["rawRecords"] = [];
    for (const resultElement of searchResults.getElementsByTagName("SearchResult")) {
      const mapped = mapSearchResult(this.source, resultElement, now);
      if (mapped.success) {
        records.push(mapped.record);
        rawRecords.push({
          externalId: mapped.record.externalId,
          payload: {
            key: childText(resultElement, "Key"),
            title: mapped.record.title,
            organization: childText(resultElement, "OrganizationName"),
            prefecture: childText(resultElement, "PrefectureName"),
            city: childText(resultElement, "CityName"),
            date: childText(resultElement, "Date"),
            bidDate: childText(resultElement, "CftIssueDate"),
            externalDocumentUri: childText(resultElement, "ExternalDocumentURI"),
          },
        });
      }
    }
    return { records, rawRecords, totalHits };
  }
}

export { KKJ_ORIGIN, PREFECTURE_COUNT };
