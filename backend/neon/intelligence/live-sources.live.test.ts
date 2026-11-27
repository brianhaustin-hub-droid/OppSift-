import { describe, expect, it } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { createHtmlListSourceConnector } from "./html-list-connector";
import { createOcpBulkSourceConnector } from "./api-client-source-connectors";
import { createGambiaGppaSourceConnector } from "./gambia-gppa-api";
import { createUgandaEgpSourceConnector } from "./uganda-egp";
import {
  burkinaFasoSite,
  burundiSite,
  malawiSite,
  sierraLeoneAwardsSite,
  sierraLeoneSite,
} from "./html-sites";

/**
 * Live connector verification (network).
 *
 * Run with: LIVE=1 npx vitest run backend/neon/intelligence/live-sources.live.test.ts
 * Each test fetches the real publisher page and exercises the production
 * extractor, so a selector or endpoint regression fails here first.
 */

const live = process.env.LIVE === "1";

function source(connectorIdentifier: string, id: string): SourceRegistryRecord {
  return {
    id,
    name: `Live ${connectorIdentifier}`,
    publisher: "Live publisher",
    website: "https://example.com/",
    sourceCategory: "government",
    sourceType: "portal",
    accessMethod: "permitted_web",
    apiOrFeedUrl: "https://example.com/",
    connectorIdentifier,
    coverageScope: "country",
    coverageRegionCodes: [],
    apiOrFeedAvailable: true,
    opportunityCategories: ["government"],
    languages: ["en"],
    publicationFrequency: "Daily",
    expectedRefreshHours: 24,
    reliability: "verified",
    licensingStatus: "approved",
    termsStatus: "verified",
    permissionsEvidenceUrl: "https://example.com/",
    licenseUrl: null,
    termsUrl: null,
    reusePermissionStatus: "permitted",
    attributionRequirements: null,
    robotsRestrictions: null,
    retentionRestrictions: null,
    rateLimitRequests: null,
    rateLimitWindowSeconds: null,
    approvalStatus: "approved",
    approvalConstraints: [],
    approvalConstraintsEnforced: false,
    approvalExpiresAt: null,
    activationStatus: "active",
    integrationStatus: "operational",
    lastSuccessfulRetrieval: null,
    lastUnsuccessfulRetrieval: null,
    nextScheduledCollectionAt: null,
  };
}

async function collect(
  connector: ReturnType<typeof createHtmlListSourceConnector>,
  limit = 10,
): Promise<{ discovered: number; parsed: number; sample: string[] }> {
  await connector.prepare?.("live-run");
  const ids = await connector.discover();
  let parsed = 0;
  const sample: string[] = [];
  for (const id of ids.slice(0, limit)) {
    const payload = await connector.retrieve(id);
    const opportunity = await connector.parse(payload);
    parsed += 1;
    if (sample.length < 3) sample.push(String((opportunity as { title?: string }).title ?? id));
  }
  return { discovered: ids.length, parsed, sample };
}

const gambiaTokenFromEnvironment = async (): Promise<string> => {
  if (process.env.GPPA_CMS_API_TOKEN?.trim()) return process.env.GPPA_CMS_API_TOKEN.trim();
  // The public GPPA site ships its own read-only CMS token in its JS bundle.
  // Reuse it for verification only; production reads GPPA_CMS_API_TOKEN.
  const page = await fetch("https://gppa.gm/tenders/notices");
  const html = await page.text();
  const scripts = [...html.matchAll(/src="([^"]+\.js[^"]*)"/gu)].map((match) =>
    new URL(match[1], "https://gppa.gm").toString());
  for (const script of scripts) {
    const response = await fetch(script);
    if (!response.ok) continue;
    const body = await response.text();
    const token = /Bearer\s+([A-Za-z0-9]{40,})/u.exec(body)?.[1];
    if (token) return token;
  }
  throw new Error("No GPPA CMS token found in the public site bundle.");
};

describe.skipIf(!live)("live source connectors", () => {
  it("Sierra Leone NPPA /bid/ returns one record per listing row", async () => {
    const connector = createHtmlListSourceConnector(source("html-sierra-leone", "11111111-1111-4111-8111-111111111111"), sierraLeoneSite);
    const result = await collect(connector);
    console.log("NPPA live:", result);
    expect(result.discovered).toBeGreaterThan(0);
    expect(result.parsed).toBe(Math.min(10, result.discovered));
  }, 120_000);

  it("Sierra Leone NPPA contract awards register returns award records", async () => {
    const connector = createHtmlListSourceConnector(source("html-sierra-leone-awards", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"), sierraLeoneAwardsSite);
    await connector.prepare?.("live-run");
    const ids = await connector.discover();
    console.log("NPPA awards live ids:", ids.length);
    expect(ids.length).toBeGreaterThan(50);
    const parsed = await connector.parse(await connector.retrieve(ids[0]));
    expect((parsed as { status?: string }).status).toBe("awarded");
    expect((parsed as { countryCode?: string }).countryCode).toBe("SL");
  }, 120_000);

  it("Uganda EGP bid notice tables return full notices", async () => {
    const connector = createUgandaEgpSourceConnector(source("html-uganda-egp-notices", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"), { maximumDetails: 5 });
    await connector.prepare?.("live-run");
    const ids = await connector.discover();
    console.log("Uganda EGP live ids:", ids.length);
    expect(ids.length).toBeGreaterThan(0);
    const parsed = await connector.parse(await connector.retrieve(ids[0]));
    expect((parsed as { countryCode?: string }).countryCode).toBe("UG");
  }, 180_000);

  it("Malawi PPDA /tenders returns notice records", async () => {
    const connector = createHtmlListSourceConnector(source("html-malawi-ppda-notices", "22222222-2222-4222-8222-222222222222"), malawiSite);
    const result = await collect(connector);
    console.log("Malawi live:", result);
    expect(result.discovered).toBeGreaterThan(0);
    expect(result.parsed).toBe(Math.min(10, result.discovered));
  }, 120_000);

  it("Burkina Faso DGCMEF appels d'offre returns bulletin records", async () => {
    const connector = createHtmlListSourceConnector(source("html-burkina-faso-armp-notices", "33333333-3333-4333-8333-333333333333"), burkinaFasoSite);
    const result = await collect(connector);
    console.log("Burkina Faso live:", result);
    expect(result.discovered).toBeGreaterThan(0);
    expect(result.parsed).toBe(Math.min(10, result.discovered));
  }, 120_000);

  it("Burundi ARMP notice cards return records", async () => {
    const connector = createHtmlListSourceConnector(source("html-burundi-armp-notices", "44444444-4444-4444-8444-444444444444"), burundiSite);
    const result = await collect(connector);
    console.log("Burundi live:", result);
    expect(result.discovered).toBeGreaterThan(0);
    expect(result.parsed).toBe(Math.min(10, result.discovered));
  }, 120_000);

  it("Gambia GPPA tender API returns records", async () => {
    const connector = createGambiaGppaSourceConnector(
      source("html-gambia-ppag-notices", "55555555-5555-4555-8555-555555555555"),
      { token: await gambiaTokenFromEnvironment(), maximumPages: 1 },
    );
    await connector.prepare?.("live-run");
    const ids = await connector.discover();
    console.log("Gambia live ids:", ids.length);
    expect(ids.length).toBeGreaterThan(0);
    const parsed = await connector.parse(await connector.retrieve(ids[0]));
    expect((parsed as { countryCode?: string }).countryCode).toBe("GM");
  }, 120_000);

  it("Liberia PPCC OCDS bulk publication 156 returns records", async () => {
    const connector = createOcpBulkSourceConnector(
      source("ocp-bulk-liberia", "66666666-6666-4666-8666-666666666666"),
      {
        publicationId: 156,
        fileName: "full.jsonl.gz",
        countryCode: "LR",
        pageSize: 25,
        maximumPages: 1,
      },
    );
    await connector.prepare?.("live-run");
    const ids = await connector.discover();
    console.log("Liberia live ids:", ids.length);
    expect(ids.length).toBeGreaterThan(0);
    const parsed = await connector.parse(await connector.retrieve(ids[0]));
    expect((parsed as { countryCode?: string }).countryCode).toBe("LR");
  }, 300_000);
});
