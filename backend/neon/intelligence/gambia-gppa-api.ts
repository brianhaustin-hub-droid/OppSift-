import {
  parsedSourceOpportunitySchema,
  type ParsedSourceOpportunity,
  type SourceRegistryRecord,
} from "./contracts";
import type { SourceConnector } from "./ingestion";
import { createBufferedConnector } from "./api-client-source-connectors";

/**
 * Gambia Public Procurement Authority tender API.
 *
 * The public tender listing on gppa.gm is a client-rendered Next.js page that
 * reads from the GPPA Strapi CMS (`cms.gppa.gm/api`). The HTML page renders no
 * notice rows on the server, so the connector reads the same CMS endpoint the
 * public site uses. The CMS requires the public read token that the site ships
 * in its own bundle; supply it through `GPPA_CMS_API_TOKEN` and never commit it.
 */

const BASE_URL = "https://cms.gppa.gm/api";
const PAGE_SIZE = 100;
const MAXIMUM_PAGES = 5;

type TenderRecord = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateInstant(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/u.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function tenderStatus(value: string | null): ParsedSourceOpportunity["status"] {
  switch (value?.toLowerCase()) {
    case "open":
    case "closing-soon":
      return "open";
    case "closed":
    case "expired":
      return "closed";
    case "awarded":
      return "awarded";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "unknown";
  }
}

function tenderItem(tender: TenderRecord, sourceUrl: string) {
  const documentId = text(tender.documentId) ?? text(tender.id);
  const title = text(tender.title);
  if (!documentId || !title) return null;
  const entity = (tender.procuringEntity ?? null) as TenderRecord | null;
  const procuringOrganization = entity ? text(entity.name) ?? text(entity.acronym) : null;
  const publishedAt = dateInstant(text(tender.publishedDate));
  const closingAt = dateInstant(text(tender.closingDate));
  if (publishedAt && closingAt && Date.parse(closingAt) < Date.parse(publishedAt)) return null;
  const referenceNumber = text(tender.referenceNumber);
  const externalId = `gm-gppa-${documentId}`;
  const parsed: ParsedSourceOpportunity = {
    externalId,
    title: title.slice(0, 1000),
    description: text(tender.description) ?? text(tender.overview),
    sourceCategoryTerm: "Invitation for Bids",
    referenceNumber: referenceNumber?.slice(0, 200) ?? null,
    countryCode: "GM",
    region: null,
    city: text(tender.location),
    issuingInstitution: null,
    procuringOrganization,
    publisher: "Gambia Public Procurement Authority",
    publishedAt,
    sourceDeadlineText: closingAt ? text(tender.closingDate) : null,
    closingAt,
    timeZone: "Africa/Banjul",
    status: tenderStatus(text(tender.tenderStatus)),
    sourceUrl,
    canonicalUrl: null,
    currency: null,
    amount: null,
    originalValues: {
      documentId,
      referenceNumber,
      category: text(tender.category),
      procurementMethod: text(tender.procurementMethod),
      tenderStatus: text(tender.tenderStatus),
      publishedDate: text(tender.publishedDate),
      closingDate: text(tender.closingDate),
      url: sourceUrl,
    },
  };
  return { externalId, sourceUrl, payload: parsed.originalValues, parsed };
}

export function createGambiaGppaSourceConnector(
  source: SourceRegistryRecord,
  options: {
    token?: string | null;
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    maximumPages?: number;
  } = {},
): SourceConnector {
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages ?? MAXIMUM_PAGES,
    async loadPage(cursor, signal) {
      const token = options.token?.trim();
      if (!token) {
        throw new Error(
          "GPPA CMS API token is not configured; set GPPA_CMS_API_TOKEN to read the Gambia tender API.",
        );
      }
      const page = Math.max(1, Number(cursor ?? "1") || 1);
      const params = new URLSearchParams({
        "populate": "*",
        "sort": "publishedDate:desc",
        "pagination[page]": String(page),
        "pagination[pageSize]": String(PAGE_SIZE),
      });
      const fetcher = options.fetcher ?? fetch;
      const response = await fetcher(`${BASE_URL}/tenders?${params.toString()}`, {
        signal,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "OppSift/1.0",
        },
      });
      if (!response.ok) {
        throw new Error(`Gambia GPPA API returned HTTP ${response.status} ${response.statusText || ""}`.trim());
      }
      const body = (await response.json()) as {
        data?: TenderRecord[];
        meta?: { pagination?: { page?: number; pageCount?: number } };
      };
      const records = [];
      for (const tender of body.data ?? []) {
        const documentId = text(tender.documentId) ?? text(tender.id);
        if (!documentId) continue;
        const sourceUrl = `https://gppa.gm/tenders/${encodeURIComponent(documentId)}`;
        const item = tenderItem(tender, sourceUrl);
        if (!item) continue;
        if (!parsedSourceOpportunitySchema.safeParse(item.parsed).success) continue;
        records.push(item);
      }
      const pageCount = body.meta?.pagination?.pageCount ?? page;
      return {
        records,
        nextCursor: page < pageCount ? String(page + 1) : null,
      };
    },
  });
}
