import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { ApprovedSource } from "../src/approval.js";
import { assertResultMatchesRequest, runCollector } from "../src/collector.js";
import type { CollectorRequest } from "../src/contract.js";
import { validateCollectorRequest, validateCollectorResult } from "../src/contract.js";
import { extractPage } from "../src/extract.js";
import { createDefaultCollectorRegistry } from "../src/registry.js";
import { fetchApprovedPage, validateRequestUrl } from "../src/safe-http.js";

const sourceHost = "public.example.org";
const listingUrl = `https://${sourceHost}/notices`;
const html = `
  <main>
    <article class="notice">
      <a class="detail" href="/notices/one">Solar framework</a>
      <span class="id">notice-1</span>
      <p class="description">Solar equipment.</p>
      <span class="published">2026-03-01</span>
    </article>
  </main>
  <a class="next" href="/notices?page=2">Next</a>
`;

function request(overrides: Partial<CollectorRequest> = {}): CollectorRequest {
  const sourceId = randomUUID();
  return {
    contractVersion: "1.0",
    jobId: randomUUID(),
    ingestionRunId: randomUUID(),
    sourceId,
    connectorId: "fixture-notices",
    collectorFramework: "cheerio",
    sourceBaseUrl: listingUrl,
    allowedHosts: [sourceHost],
    currentCursor: null,
    limits: {
      maxPages: 4,
      maxRecords: 20,
      maxRequests: 10,
      timeoutMs: 2000,
      maxResponseBytes: 100_000,
      maxTotalBytes: 500_000,
      minimumRequestIntervalMs: 250,
    },
    constraints: {
      approvalStatus: "approved",
      reusePermission: "permitted",
      conditionalConstraintsEnforced: false,
      allowedMethods: ["GET"],
      attribution: "Fixture source",
      retentionDays: 30,
    },
    adapter: {
      adapterId: "fixture-listing",
      format: "html",
      recordSelector: ".notice",
      fields: {
        externalId: { selector: ".id", required: true },
        title: { selector: ".detail", required: true },
        description: { selector: ".description" },
        publishedAt: { selector: ".published" },
        canonicalUrl: { selector: ".detail", attribute: "href" },
        pagination: { selector: "a.next", attribute: "href" },
      },
    },
    ...overrides,
  };
}

function approved(input: CollectorRequest): ApprovedSource {
  return {
    sourceId: input.sourceId,
    connectorId: input.connectorId,
    approvalStatus: input.constraints.approvalStatus,
    reusePermission: input.constraints.reusePermission,
    active: true,
    allowedHosts: input.allowedHosts,
    methods: ["GET"],
    conditionalConstraintsEnforced: false,
    minimumRequestIntervalMs: 250,
    maxRequests: 10,
  };
}

function fixtureFetcher(pages: Record<string, string>, contentType = "text/html; charset=utf-8") {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();
    const body = pages[url];
    if (body === undefined) throw new Error(`Missing fixture response for ${url}`);
    return new Response(body, {
      status: 200,
      headers: { "content-type": contentType, ...(!init && { "etag": '"fixture"' }) },
    });
  };
}

test("Cheerio extracts malformed HTML, XML content, provenance, and selectors", () => {
  const input = request();
  const extracted = extractPage(input, `<article class="notice"><span class="id">x</span><a class="detail" href="/one">A`, listingUrl, {
    status: 200,
    contentType: "text/html",
    fetchedAt: new Date().toISOString(),
    etag: null,
    lastModified: null,
  });
  assert.equal(extracted.records[0]?.externalRecordId, "x");
  assert.equal(extracted.records[0]?.sourceUrl, new URL("/one", listingUrl).toString());

  const xmlInput = request({
    adapter: {
      adapterId: "fixture-xml",
      format: "xml",
      recordSelector: "item",
      fields: {
        externalId: { selector: "guid", required: true },
        title: { selector: "title", required: true },
        canonicalUrl: { selector: "link" },
      },
    },
  });
  const xmlResult = extractPage(xmlInput, "<rss><channel><item><guid>x</guid><title>Grant</title><link>https://public.example.org/grant</link></item></channel></rss>", listingUrl, {
    status: 200,
    contentType: "application/xml",
    fetchedAt: new Date().toISOString(),
    etag: null,
    lastModified: null,
  });
  assert.equal(xmlResult.records[0]?.externalRecordId, "x");
});

test("timezone-free date text is not invented as a UTC timestamp", () => {
  const input = request({
    adapter: {
      adapterId: "date-fixture",
      format: "html",
      recordSelector: ".notice",
      fields: {
        externalId: { selector: ".id", required: true },
        title: { selector: ".detail", required: true },
        publishedAt: { selector: ".published" },
        canonicalUrl: { selector: ".detail", attribute: "href" },
      },
    },
  });
  const extracted = extractPage(input, `
    <article class="notice">
      <span class="id">date-only</span>
      <a class="detail" href="/date-only">Date-only notice</a>
      <span class="published">2026-03-01</span>
    </article>
    <article class="notice">
      <span class="id">timestamp</span>
      <a class="detail" href="/timestamp">Timestamp notice</a>
      <span class="published">2026-03-01T10:00:00+01:00</span>
    </article>
  `, listingUrl, {
    status: 200,
    contentType: "text/html",
    fetchedAt: new Date().toISOString(),
    etag: null,
    lastModified: null,
  });
  assert.equal(extracted.records[0]?.publishedAt, null);
  assert.equal(extracted.records[1]?.publishedAt, "2026-03-01T09:00:00.000Z");
});

test("Cheerio handles missing fields, duplicate identifiers, and empty documents", () => {
  const input = request();
  const response = {
    status: 200,
    contentType: "text/html",
    fetchedAt: new Date().toISOString(),
    etag: null,
    lastModified: null,
  };
  const missing = extractPage(input, `<article class="notice"><span class="id">x</span></article>`, listingUrl, response);
  assert.equal(missing.rejectedCount, 1);
  const duplicate = extractPage(input, html.replace("</main>", `${html.match(/<article class="notice">[\s\S]*?<\/article>/u)?.[0]}</main>`), listingUrl, response);
  assert.equal(duplicate.records.length, 1);
  assert.ok(duplicate.warnings.some((warning) => warning.includes("Duplicate")));
  assert.equal(extractPage(input, "", listingUrl, response).records.length, 0);
});

test("Cheerio collector follows bounded pagination and validates its shared result", async () => {
  const input = request();
  const secondPage = listingUrl + "?page=2";
  const result = await runCollector(input, {
    approvalAuthority: {
      async loadApprovedSource(sourceId, connectorId) {
        return sourceId === input.sourceId && connectorId === input.connectorId ? approved(input) : null;
      },
    },
    fetcher: fixtureFetcher({
      [listingUrl]: html,
      [secondPage]: html.replace("notice-1", "notice-2").replace('href="/notices?page=2"', 'href="/notices?page=3"'),
    }),
    resolveAddresses: async () => ["93.184.216.34"],
    sleep: async () => undefined,
  });
  assert.equal(result.pagesVisited, 2);
  assert.equal(result.records.length, 2);
  assert.equal(result.recordsDiscovered, 2);
  assert.equal(validateCollectorResult(result).contractVersion, "1.0");
});

test("Crawlee schedules controlled HTTP fixture requests without browser dependencies", async () => {
  const input = request({
    collectorFramework: "crawlee",
    limits: { ...request().limits, maxPages: 1 },
  });
  const result = await runCollector(input, {
    approvalAuthority: {
      async loadApprovedSource(sourceId, connectorId) {
        return sourceId === input.sourceId && connectorId === input.connectorId ? approved(input) : null;
      },
    },
    crawlerFactory: (requestHandler) => ({
      async run(url) {
        await requestHandler(url);
      },
    }),
    fetcher: fixtureFetcher({ [listingUrl]: html }),
    resolveAddresses: async () => ["93.184.216.34"],
    sleep: async () => undefined,
  });
  assert.equal(result.collectorFramework, "crawlee");
  assert.equal(result.pagesVisited, 1);
  assert.equal(result.records[0]?.externalRecordId, "notice-1");
  assert.equal(result.nextCursor, listingUrl + "?page=2");
  assert.ok(result.warnings.includes("Maximum page limit reached."));
});

test("central approval is mandatory and conditional permissions fail closed", async () => {
  const input = request();
  await assert.rejects(runCollector(input, {
    approvalAuthority: {
      async loadApprovedSource() { return null; },
    },
  }), /did not authorize/u);

  const conditional = request({
    constraints: {
      ...input.constraints,
      approvalStatus: "approved_with_constraints",
      reusePermission: "conditional",
      conditionalConstraintsEnforced: true,
    },
  });
  await assert.rejects(runCollector(conditional, {
    approvalAuthority: {
      async loadApprovedSource() {
        return { ...approved(conditional), conditionalConstraintsEnforced: true };
      },
    },
  }), /not verifiably enforceable/u);
});

test("registry routes frameworks to isolated runtimes and rejects unsupported formats", () => {
  const registry = createDefaultCollectorRegistry();
  assert.equal(registry.resolve(request({ collectorFramework: "scrapy" })).runtime, "python");
  assert.equal(registry.resolve(request({ collectorFramework: "crawlee" })).runtime, "node");
  assert.throws(() => registry.resolve(request({
    collectorFramework: "scrapling",
    adapter: { ...request().adapter, format: "xml" },
  })), /compatible collector runtime/u);
});

test("URL and HTTP policy rejects private hosts, disallowed domains, redirects, bad types, and large bodies", async () => {
  const input = request();
  assert.throws(() => validateRequestUrl("http://public.example.org", input), /approved public HTTPS/u);
  assert.throws(() => validateRequestUrl("https://127.0.0.1", input), /approved public HTTPS/u);
  assert.throws(() => validateRequestUrl("https://other.example.net", input), /approved public HTTPS/u);
  await assert.rejects(fetchApprovedPage(input, listingUrl, {
    fetcher: async () => new Response(null, { status: 302, headers: { location: "https://other.example.net/redirect" } }),
    resolveAddresses: async () => ["93.184.216.34"],
  }), /approved public HTTPS/u);
  await assert.rejects(fetchApprovedPage(input, listingUrl, {
    fetcher: async () => new Response("file", { headers: { "content-type": "application/pdf" } }),
    resolveAddresses: async () => ["93.184.216.34"],
  }), /Unsupported response content type/u);
  await assert.rejects(fetchApprovedPage({
    ...input,
    limits: { ...input.limits, maxResponseBytes: 1024 },
  }, listingUrl, {
    fetcher: async () => new Response("x".repeat(2048), { headers: { "content-type": "text/html" } }),
    resolveAddresses: async () => ["93.184.216.34"],
  }), /byte limit/u);
  await assert.rejects(fetchApprovedPage(input, listingUrl, {
    resolveAddresses: async () => ["127.0.0.1"],
    fetcher: fixtureFetcher({ [listingUrl]: html }),
  }), /private, reserved/u);
});

test("request budgets and allowlists are enforced before any response is accepted", async () => {
  const input = request({ limits: { ...request().limits, maxRequests: 1 } });
  const budget = { count: 0, max: 1 };
  await fetchApprovedPage(input, listingUrl, {
    requestBudget: budget,
    resolveAddresses: async () => ["93.184.216.34"],
    fetcher: fixtureFetcher({ [listingUrl]: html }),
  });

  await assert.rejects(fetchApprovedPage(input, listingUrl, {
    requestBudget: budget,
    resolveAddresses: async () => ["93.184.216.34"],
    fetcher: fixtureFetcher({ [listingUrl]: html }),
  }), /request limit/u);
});

test("TypeScript and Python consume the same versioned contract fixtures", async () => {
  const sharedRoot = new URL("../../shared/fixtures/", import.meta.url);
  const sharedRequest = validateCollectorRequest(JSON.parse(
    await readFile(new URL("collector-request.json", sharedRoot), "utf8"),
  ));
  const sharedResult = validateCollectorResult(JSON.parse(
    await readFile(new URL("collector-result.json", sharedRoot), "utf8"),
  ));
  assert.equal(assertResultMatchesRequest(sharedRequest, sharedResult).contractVersion, "1.0");
  assert.throws(() => assertResultMatchesRequest(sharedRequest, {
    ...sharedResult,
    records: [{
      ...sharedResult.records[0]!,
      canonicalUrl: "https://public.example.org:8443/notices/one",
    }],
  }), /canonical URL/u);
  assert.throws(() => validateCollectorRequest({
    ...sharedRequest,
    sourceId: "not-a-uuid",
  }));
});

test("minimum per-source delay is honored by the Node transport", async () => {
  const input = request();
  let timestamp = 0;
  const delays: number[] = [];
  const dependencies = {
    now: () => new Date(timestamp),
    sleep: async (milliseconds: number) => {
      delays.push(milliseconds);
      timestamp += milliseconds;
    },
    resolveAddresses: async () => ["93.184.216.34"],
    fetcher: fixtureFetcher({ [listingUrl]: html }),
  };
  await fetchApprovedPage(input, listingUrl, dependencies);
  timestamp += 100;
  await fetchApprovedPage(input, listingUrl, dependencies);
  assert.ok(delays.includes(150));
});
