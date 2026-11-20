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
  /**
   * Extract a parsed opportunity from one listing element.
   * `now` is the collection clock, injected so deadline-derived status stays
   * deterministic in tests. Implementations may ignore it.
   */
  extract(
    element: Element,
    document: Document,
    baseUrl: string,
    now: Date,
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
    /** Collection clock used for deadline-derived status. Defaults to now. */
    now?: () => Date;
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
          throw new Error("HTML listing source returned a non-successful response.");
        }
        try {
          html = await response.text();
        } catch {
          throw new Error("HTML listing source returned no text content.");
        }
      }

      const { document } = parseHTML(html);
      const elements = [...document.querySelectorAll(site.selector)];
      // Fail loudly when the configured selector matches nothing. A stale
      // selector (site redesign, wrong <tbody> assumption) would otherwise be
      // recorded as a successful run that discovered zero opportunities and
      // the source would silently stop producing records.
      if (elements.length === 0) {
        throw new Error(
          `HTML listing source found no matching items for selector "${site.selector}" at ${site.listUrl}.`,
        );
      }
      const extractionClock = options.now?.() ?? new Date();

      const records: Array<{
        externalId: string;
        sourceUrl: string;
        payload: Record<string, unknown>;
        parsed: ParsedSourceOpportunity;
      }> = [];
      for (const element of elements) {
        let item: ReturnType<HtmlSiteConfig["extract"]>;
        try {
          item = site.extract(
            element,
            document as unknown as Document,
            new URL(site.listUrl).origin,
            extractionClock,
          );
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
      // Selector matched but nothing survived extraction/validation: the page
      // structure or the parser has drifted. Report it as a failed collection
      // instead of a successful empty run.
      if (records.length === 0) {
        throw new Error(
          `HTML listing source matched ${elements.length} element(s) but produced no valid opportunity records for ${site.listUrl}.`,
        );
      }
      return { records, nextCursor: null };
    },
  });
}