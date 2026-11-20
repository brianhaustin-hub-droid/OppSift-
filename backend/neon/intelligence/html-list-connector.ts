import { parseHTML } from "linkedom";
import { parsedSourceOpportunitySchema, type ParsedSourceOpportunity, type SourceRegistryRecord } from "./contracts";
import type { SourceConnector } from "./ingestion";
import { createBufferedConnector } from "./api-client-source-connectors";

export type HtmlListItem = {
  externalId: string;
  sourceUrl: string;
  payload: Record<string, unknown>;
  parsed: ParsedSourceOpportunity;
};

export type HtmlSiteCursor = {
  kind: "html_list";
  url: string;
};

export type HtmlSiteConfig = {
  /** Absolute URL of the listing page. */
  listUrl: string;
  /** CSS selector used to locate one element per listing item. */
  selector: string;
  /** Fetch options used for the listing (headers are optional). */
  headers?: Record<string, string>;
  /** When true, render the page with a headless browser (if provided) instead of plain fetch. */
  useBrowser?: boolean;
  /** Extract a parsed opportunity from one listing element. */
  extract(
    element: Element,
    document: Document,
    baseUrl: string,
  ): Omit<HtmlListItem, "payload"> & { payload?: Record<string, unknown> } | null;
};

export function createHtmlListSourceConnector(
  source: SourceRegistryRecord,
  site: HtmlSiteConfig,
  options: {
    currentCursor?: string | null;
    fetcher?: typeof fetch;
    /** Cloudflare Browser Rendering binding (env.BROWSER) for JS-heavy pages. */
    browser?: unknown;
    maximumPages?: number;
  } = {},
): SourceConnector {
  return createBufferedConnector({
    source,
    initialCursor: options.currentCursor,
    maximumPages: options.maximumPages ?? 1,
    async loadPage(cursor, signal) {
      // Single-page listing scrapers re-read the newest page every run.
      void cursor;
      const fetcher = options.fetcher ?? fetch;
      let html: string | null = null;
      if (site.useBrowser && options.browser) {
        try {
          const mod = await import("@cloudflare/puppeteer");
          const puppeteer = (mod as any).default ?? mod;
          const browser = await puppeteer.launch(options.browser as any);
          try {
            const page = await browser.newPage();
            if (site.headers) await page.setExtraHTTPHeaders(site.headers);
            await page.goto(site.listUrl, { waitUntil: "networkidle2", timeout: 60000 });
            // Give client-rendered apps a moment to hydrate.
            await new Promise((r) => setTimeout(r, 2000));
            html = await page.content();
          } finally {
            await browser.close();
          }
        } catch (e) {
          throw new Error(`Browser rendering failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (html == null) {
        const response = await fetcher(site.listUrl, {
          signal,
          headers: { Accept: "text/html", "User-Agent": "OppSift/1.0", ...site.headers },
        });
        if (!response.ok) {
          // Some sites block plain fetch; try browser rendering when available.
          if (site.useBrowser && options.browser && [401, 403, 429, 503].includes(response.status)) {
            try {
              const mod = await import("@cloudflare/puppeteer");
              const puppeteer = (mod as any).default ?? mod;
              const browser = await puppeteer.launch(options.browser as any);
              try {
                const page = await browser.newPage();
                if (site.headers) await page.setExtraHTTPHeaders(site.headers);
                await page.goto(site.listUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
                await new Promise((r) => setTimeout(r, 2500));
                html = await page.content();
              } finally {
                await browser.close();
              }
            } catch (e) {
              throw new Error(`HTML listing source returned HTTP ${response.status} for ${site.listUrl}; browser fallback failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          } else {
            throw new Error(`HTML listing source returned HTTP ${response.status} ${response.statusText || ""} for ${site.listUrl}`.trim());
          }
        } else {
          try {
            html = await response.text();
          } catch {
            throw new Error("HTML listing source returned no text content.");
          }
        }
      }

      // Guard against extremely large pages (e.g. CI attribution) that can
      // cause parse/memory/lease issues. Parse the head portion for listings.
      if (!html) {
        return { records: [], nextCursor: null };
      }
      const MAX_HTML_CHARS = 1_500_000;
      if (html.length > MAX_HTML_CHARS) {
        html = html.slice(0, MAX_HTML_CHARS);
      }

      const { document } = parseHTML(html);
      const elements = [...document.querySelectorAll(site.selector)];
      if (elements.length === 0) {
        return { records: [], nextCursor: null };
      }

      const records: Array<{
        externalId: string;
        sourceUrl: string;
        payload: Record<string, unknown>;
        parsed: ParsedSourceOpportunity;
      }> = [];
      for (const element of elements) {
        let item: ReturnType<HtmlSiteConfig["extract"]>;
        try {
          item = site.extract(element, document as unknown as Document, new URL(site.listUrl).origin);
        } catch {
          continue;
        }
        if (!item) continue;
        const parsed = parsedSourceOpportunitySchema.safeParse(item.parsed);
        if (!parsed.success) continue;
        records.push({
          externalId: item.externalId,
          sourceUrl: item.sourceUrl,
          payload: item.payload ?? item.parsed.originalValues ?? parsed.data,
          parsed: parsed.data,
        });
      }
      return { records, nextCursor: null };
    },
  });
}