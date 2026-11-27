import { parseHTML } from "linkedom";
import type { ParsedSourceOpportunity, SourceRegistryRecord } from "./contracts";
import type { SourceConnector } from "./ingestion";
import { createBufferedConnector } from "./api-client-source-connectors";

/**
 * Uganda e-GP (EGP Uganda) live bid notices.
 *
 * The homepage publishes server-rendered notice tables (Works / Supplies /
 * Services / ...). Rows carry a truncated subject, a closing date and a link to
 * the notice page, which holds the full subject, the procurement reference and
 * the procuring entity. The connector follows each notice link to build one
 * complete record per notice.
 */

const LIST_URL = "https://egpuganda.go.ug/";
const TIME_ZONE = "Africa/Kampala";
const MAXIMUM_DETAILS = 40;
const DETAIL_CONCURRENCY = 4;

const MONTHS: Readonly<Record<string, number>> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function text(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/[\u00a0\u202f]/gu, " ").replace(/\s+/gu, " ").trim();
  return trimmed ? trimmed : null;
}

/** Parses listing dates such as "Dec-04 2026". */
function parseListingDate(value: string | null): string | null {
  if (!value) return null;
  const match = /^([A-Za-z]{3})[a-z]*[-\s]+(\d{1,2}),?\s+(\d{4})$/u.exec(value.trim());
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  if (month === undefined) return null;
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[2])));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function deadlineStatus(closingAt: string | null): ParsedSourceOpportunity["status"] {
  if (!closingAt) return "unknown";
  return Date.parse(closingAt) > Date.now() ? "open" : "closed";
}

function untruncate(value: string): string {
  return value.replace(/(?:\.\.\.|…)\s*$/u, "").trim();
}

type ListingRow = {
  externalId: string;
  detailUrl: string;
  category: string | null;
  listingTitle: string;
  closingAt: string | null;
};

function parseListing(html: string): ListingRow[] {
  const { document } = parseHTML(html);
  const rows = new Map<string, ListingRow>();
  for (const row of document.querySelectorAll("table tr")) {
    const anchor = row.querySelector("a[href*='/index/']");
    const href = anchor?.getAttribute("href");
    if (!href) continue;
    const id = /\/index\/(\d+)_egp/u.exec(href)?.[1];
    if (!id) continue;
    const externalId = `ug-egp-${id}`;
    if (rows.has(externalId)) continue;
    const cells = [...row.querySelectorAll("td")].map((cell) =>
      text(cell.textContent ?? "") ?? "",
    );
    const title = untruncate(cells[1] ?? text(anchor?.textContent ?? "") ?? "");
    if (title.length < 8) continue;
    rows.set(externalId, {
      externalId,
      detailUrl: new URL(href, LIST_URL).toString(),
      category: cells[0] && cells[0].length <= 40 ? cells[0] : null,
      listingTitle: title,
      closingAt: parseListingDate(cells[2] ?? null),
    });
  }
  return [...rows.values()];
}

type DetailFields = {
  title: string | null;
  referenceNumber: string | null;
  procuringOrganization: string | null;
  categoryTerm: string | null;
};

function parseDetail(html: string): DetailFields {
  const { document } = parseHTML(html);
  let title: string | null = null;
  let referenceNumber: string | null = null;
  for (const row of document.querySelectorAll("table tr")) {
    const cells = [...row.querySelectorAll("td")].map((cell) => text(cell.textContent ?? ""));
    if (cells.length >= 3 && cells[1] && cells[2] && cells[1].length > 2) {
      referenceNumber = referenceNumber ?? cells[1];
      title = title && title.length >= cells[2].length ? title : cells[2];
    }
  }
  // The notice page names the buyer in its own short sentence: "<buyer> has
  // allocated funds to be used for the above indicated." Read it from the
  // smallest matching block so preceding table text is not swept in.
  let procuringOrganization: string | null = null;
  let smallest = Number.POSITIVE_INFINITY;
  for (const node of document.querySelectorAll("p,li,div,span")) {
    const value = text(node.textContent ?? "");
    if (!value || value.length >= 400 || value.length >= smallest) continue;
    if (!/has (?:allocated|earmarked|set aside) funds/u.test(value)) continue;
    const match = /^([A-Z][^.]{2,180}?) has (?:allocated|earmarked|set aside) funds/u.exec(value);
    if (!match) continue;
    procuringOrganization = match[1].trim();
    smallest = value.length;
  }
  const heading = [...document.querySelectorAll("h1,h2,h3,h4,h5")]
    .map((node) => text(node.textContent ?? ""))
    .find((value) => value && /notice|tender|quotation|bid|proposal/iu.test(value)) ?? null;
  return { title, referenceNumber, procuringOrganization, categoryTerm: heading };
}

async function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  limit: number,
  worker: (item: Input) => Promise<Output>,
): Promise<Output[]> {
  const results: Output[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

export function createUgandaEgpSourceConnector(
  source: SourceRegistryRecord,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    maximumDetails?: number;
    signal?: AbortSignal;
  } = {},
): SourceConnector {
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: 1,
    async loadPage(_cursor, signal) {
      const fetcher = options.fetcher ?? fetch;
      const headers = { Accept: "text/html", "User-Agent": "OppSift/1.0" };
      const response = await fetcher(LIST_URL, { signal, headers });
      if (!response.ok) {
        throw new Error(`Uganda e-GP listing returned HTTP ${response.status} ${response.statusText || ""}`.trim());
      }
      const rows = parseListing(await response.text()).slice(
        0,
        options.maximumDetails ?? MAXIMUM_DETAILS,
      );
      const detailed = await mapWithConcurrency(rows, DETAIL_CONCURRENCY, async (row) => {
        try {
          const detailResponse = await fetcher(row.detailUrl, { signal, headers });
          if (!detailResponse.ok) return { row, detail: null };
          return { row, detail: parseDetail(await detailResponse.text()) };
        } catch {
          return { row, detail: null };
        }
      });

      const records = [];
      for (const { row, detail } of detailed) {
        const fullTitle = detail?.title ?? null;
        const title = (fullTitle && fullTitle.length >= row.listingTitle.length
          ? fullTitle
          : row.listingTitle
        ).slice(0, 1000);
        if (!title) continue;
        const parsed: ParsedSourceOpportunity = {
          externalId: row.externalId,
          title,
          description: null,
          sourceCategoryTerm: detail?.categoryTerm ?? "Bid Notice",
          referenceNumber: detail?.referenceNumber?.slice(0, 200) ?? null,
          countryCode: "UG",
          region: null,
          city: null,
          issuingInstitution: null,
          procuringOrganization: detail?.procuringOrganization?.slice(0, 300) ?? null,
          publisher: "Public Procurement and Disposal of Public Assets Authority (PPDA), Uganda",
          publishedAt: null,
          sourceDeadlineText: null,
          closingAt: row.closingAt,
          timeZone: TIME_ZONE,
          status: deadlineStatus(row.closingAt),
          sourceUrl: row.detailUrl,
          canonicalUrl: null,
          currency: null,
          amount: null,
          originalValues: {
            egpId: row.externalId.replace(/^ug-egp-/u, ""),
            category: row.category,
            referenceNumber: detail?.referenceNumber ?? null,
            procuringOrganization: detail?.procuringOrganization ?? null,
            closingDate: row.closingAt,
            url: row.detailUrl,
          },
        };
        records.push({
          externalId: row.externalId,
          sourceUrl: row.detailUrl,
          payload: parsed.originalValues,
          parsed,
        });
      }
      return { records, nextCursor: null };
    },
  });
}
