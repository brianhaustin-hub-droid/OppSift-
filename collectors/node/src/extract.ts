import { createHash } from "node:crypto";
import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type {
  CollectorRecord,
  CollectorRequest,
  CollectorSelector,
} from "./contract.js";

export type ExtractedPage = {
  records: CollectorRecord[];
  discoveredLinks: string[];
  nextPage: string | null;
  rejectedCount: number;
  warnings: string[];
};

export function extractPage(
  request: CollectorRequest,
  html: string,
  pageUrl: string,
  response: {
    status: number;
    contentType: string;
    fetchedAt: string;
    etag: string | null;
    lastModified: string | null;
  },
): ExtractedPage {
  const $ = load(html, { xmlMode: request.adapter.format === "xml" });
  const records: CollectorRecord[] = [];
  const warnings: string[] = [];
  let rejectedCount = 0;
  const seenIds = new Set<string>();

  $(request.adapter.recordSelector).each((_, element) => {
    if (records.length >= request.limits.maxRecords) return false;
    const row = $(element);
    const extracted: Record<string, string | null> = {};
    for (const [field, selector] of Object.entries(request.adapter.fields)) {
      if (field === "pagination" || field === "links" || !selector) continue;
      extracted[field] = readField(row, selector);
    }

    const externalRecordId = extracted.externalId?.trim();
    const title = extracted.title?.trim();
    if (!externalRecordId || !title) {
      rejectedCount += 1;
      warnings.push("Record missing a required external ID or title.");
      return;
    }
    if (seenIds.has(externalRecordId)) {
      rejectedCount += 1;
      warnings.push(`Duplicate external record identifier "${externalRecordId}" was skipped.`);
      return;
    }
    seenIds.add(externalRecordId);

    const sourceUrl = resolveRecordUrl(
      pageUrl,
      extracted.canonicalUrl ?? readField(row, { selector: "a[href]", attribute: "href" }),
      request,
    );
    if (!sourceUrl) {
      rejectedCount += 1;
      warnings.push(`Record "${externalRecordId}" has no permitted HTTPS source link.`);
      return;
    }

    const payload = $.html(element) ?? "";
    if (Buffer.byteLength(payload, "utf8") > request.limits.maxResponseBytes) {
      rejectedCount += 1;
      warnings.push(`Record "${externalRecordId}" exceeds the configured payload size.`);
      return;
    }
    const populatedFields = Object.values(extracted).filter((value) => value !== null).length;
    const expectedFields = Object.keys(request.adapter.fields)
      .filter((field) => field !== "pagination" && field !== "links").length;
    const recordWarnings = Object.entries(request.adapter.fields)
      .filter(([field, selector]) =>
        field !== "pagination" &&
        field !== "links" &&
        selector?.required === true &&
        !extracted[field],
      )
      .map(([field]) => `Required extraction field "${field}" is missing.`);
    const canonicalUrl = safeCanonicalUrl(extracted.canonicalUrl, pageUrl, request);
    const payloadType = request.adapter.format;
    records.push({
      externalRecordId,
      sourceUrl,
      canonicalUrl,
      httpStatus: response.status,
      contentType: response.contentType,
      fetchedAt: response.fetchedAt,
      publishedAt: parseDateTime(extracted.publishedAt),
      etag: response.etag,
      lastModified: response.lastModified,
      payloadType,
      payload,
      payloadChecksum: createHash("sha256").update(payload).digest("hex"),
      extracted,
      extractionConfidence: expectedFields === 0 ? 0 : populatedFields / expectedFields,
      warnings: recordWarnings,
    });
  });

  const paginationSelector = request.adapter.fields.pagination;
  const nextHref = paginationSelector
    ? readField($, paginationSelector)
    : null;
  const nextPage = resolveRecordUrl(pageUrl, nextHref, request);
  const linksSelector = request.adapter.fields.links;
  const discoveredLinks = linksSelector
    ? $(linksSelector.selector)
      .map((_, element) => readField($(element), {
        selector: linksSelector.selector,
        attribute: linksSelector.attribute ?? "href",
      }))
      .get()
      .map((href) => resolveRecordUrl(pageUrl, href, request))
      .filter((url): url is string => url !== null)
    : [];
  return {
    records,
    discoveredLinks: [...new Set(discoveredLinks)],
    nextPage,
    rejectedCount,
    warnings,
  };
}

function readField(
  root: CheerioAPI | Cheerio<AnyNode>,
  selector: CollectorSelector,
): string | null {
  const selected = typeof root === "function"
    ? root(selector.selector).first()
    : root.is(selector.selector)
      ? root.first()
      : root.find(selector.selector).first();
  if (!selected.length) return null;
  const value = selector.attribute
    ? selected.attr(selector.attribute)
    : selected.text();
  const normalized = value?.replace(/\s+/gu, " ").trim();
  return normalized || null;
}

function resolveRecordUrl(
  baseUrl: string,
  value: string | null | undefined,
  request: CollectorRequest,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !request.allowedHosts.some((host) =>
        url.hostname.toLowerCase() === host.toLowerCase() ||
        url.hostname.toLowerCase().endsWith(`.${host.toLowerCase()}`),
      )
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeCanonicalUrl(
  value: string | null,
  baseUrl: string,
  request: CollectorRequest,
) {
  return value ? resolveRecordUrl(baseUrl, value, request) : null;
}

function parseDateTime(value: string | null | undefined): string | null {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
  ) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
