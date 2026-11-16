import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import {
  createWorldBankProcurementConnector,
  WORLD_BANK_API_ENDPOINT,
  WORLD_BANK_DATASET_URL,
  WORLD_BANK_LICENSE_URL,
} from "./world-bank-procurement";

const now = new Date("2026-11-11T12:00:00.000Z");
const source: SourceRegistryRecord = {
  id: "87c9b57a-2de4-447c-9b0f-255b0d484400",
  name: "World Bank Procurement Notices",
  publisher: "World Bank Group",
  website: "https://www.worldbank.org",
  sourceCategory: "multilateral",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: WORLD_BANK_API_ENDPOINT,
  connectorIdentifier: "world-bank-procurement-notices",
  coverageScope: "global",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["en"],
  publicationFrequency: "Daily metadata; cadence not independently verified",
  expectedRefreshHours: 24,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: WORLD_BANK_DATASET_URL,
  licenseUrl: WORLD_BANK_LICENSE_URL,
  termsUrl: "https://www.worldbank.org/ext/en/legal/terms-conditions",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Fixture-only approved source.",
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

function notice(overrides: Record<string, unknown> = {}) {
  return {
    id: "OP001",
    bid_description: "Supply of water testing equipment",
    notice_type: "Request for Expression of Interest",
    notice_status: "Revised",
    noticedate: "11-Nov-2026",
    submission_date: "2027-01-15T00:00:00Z",
    project_id: "P123456",
    project_name: "Water access project",
    project_ctry_name: "Kenya",
    bid_reference_no: "WB-123",
    procurement_method_code: "ICB",
    procurement_method_name: "International Competitive Bidding",
    ...overrides,
  };
}

function page(os: number, total: number, notices: unknown[]) {
  return Response.json({ rows: notices.length, os, page: Math.floor(os / 2) + 1, total, procnotices: notices });
}

function dependencies() {
  return {
    now: () => now,
    minimumRequestIntervalMs: 250,
    retryDependencies: { sleep: vi.fn(async () => undefined), random: () => 0 },
  };
}

describe("World Bank Procurement Notices connector", () => {
  it("uses the official API and observed offset parameters, preserving notice fields and raw evidence", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(page(0, 1, [notice()]));
    const connector = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 10,
      maxPagesPerRun: 1,
      fetcher,
    });

    await connector.prepare?.("run-id");
    const [externalId] = await connector.discover();
    expect(externalId).toBe("OP001");
    const [requestUrl] = fetcher.mock.calls[0] ?? [];
    const requested = new URL(String(requestUrl));
    expect(`${requested.origin}${requested.pathname}`).toBe(WORLD_BANK_API_ENDPOINT);
    expect(Object.fromEntries(requested.searchParams)).toEqual({
      format: "json",
      rows: "10",
      os: "0",
    });

    const retrieved = await connector.retrieve("OP001");
    const parsed = await connector.parse(retrieved) as {
      countryCode: string | null;
      sourceCategoryTerm: string;
      status: string;
      sourceUrl: string;
      canonicalUrl: string | null;
      originalValues: Record<string, Record<string, unknown>>;
    };
    expect(parsed).toMatchObject({
      externalId: "OP001",
      countryCode: "KE",
      sourceCategoryTerm: "Request for Expression of Interest",
      status: "open",
      canonicalUrl: null,
    });
    expect(parsed.sourceUrl).toContain("format=json");
    expect(parsed.originalValues.worldBankProcurement).toMatchObject({
      projectId: "P123456",
      projectName: "Water access project",
      bidReferenceNumber: "WB-123",
      procurementMethod: "International Competitive Bidding",
      datasetCatalogUrl: WORLD_BANK_DATASET_URL,
      catalogLicenseUrl: WORLD_BANK_LICENSE_URL,
    });

    const raw = await connector.toRawSourceRecord(
      "OP001",
      retrieved,
      "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd",
    );
    expect(raw.payloadJson).toEqual(notice());
    expect(raw.sourceUrl).toContain("format=json");
    expect(raw.contentType).toBe("application/json");
    expect(raw.payloadChecksum).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("resumes bounded pages and deduplicates repeated source-native IDs", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(page(0, 4, [
        notice(),
        notice({ id: "OP002", notice_type: "Contract Award" }),
      ]))
      .mockResolvedValueOnce(page(2, 4, [
        notice({ bid_description: "Updated water equipment supply" }),
        notice({
          id: "OP003",
            notice_type: "Request for Expression of Interest",
          bid_description: "Expression of interest for consulting services",
        }),
      ]));
    const connector = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 2,
      maxPagesPerRun: 2,
      fetcher,
    });

    await connector.prepare?.("run-id");
    expect(await connector.discover()).toEqual(["OP001", "OP003"]);
    expect(await connector.retrieve("OP001")).toMatchObject({
      record: { bid_description: "Updated water equipment supply" },
    });
    expect(connector.nextCursor?.()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetcher.mock.calls[1]?.[0])).searchParams.get("os")).toBe("2");
  });

  it("returns a continuation cursor at the page budget and resumes from that offset", async () => {
    const firstFetcher = vi.fn<typeof fetch>().mockResolvedValue(
      page(0, 5, [notice(), notice({ id: "OP002" })]),
    );
    const first = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 2,
      maxPagesPerRun: 1,
      fetcher: firstFetcher,
    });
    await first.prepare?.("run-id");
    expect(first.nextCursor?.()).toBe("2");
    expect(first.collectionIssues?.()).toContainEqual(expect.objectContaining({
      code: "world_bank_page_budget_reached",
      severity: "warning",
    }));

    const secondFetcher = vi.fn<typeof fetch>().mockResolvedValue(
      page(2, 5, [notice({ id: "OP003" }), notice({ id: "OP004" })]),
    );
    const second = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      currentCursor: first.nextCursor?.(),
      pageSize: 2,
      maxPagesPerRun: 1,
      fetcher: secondFetcher,
    });
    await second.prepare?.("run-id");
    expect(new URL(String(secondFetcher.mock.calls[0]?.[0])).searchParams.get("os")).toBe("2");
    expect(second.nextCursor?.()).toBe("4");
  });

  it("keeps country and optional source values unknown instead of fabricating them", async () => {
    const sourceNotice = notice({
      project_ctry_name: "Unmapped source country",
      project_id: undefined,
      project_name: undefined,
      procurement_category: undefined,
      major_sector: undefined,
      noticedate: "not-a-date",
      submission_date: "2027/01/15",
      url: undefined,
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(page(0, 1, [sourceNotice]));
    const connector = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 1,
      fetcher,
    });
    await connector.prepare?.("run-id");

    const parsed = await connector.parse(await connector.retrieve("OP001")) as {
      countryCode: string | null;
      publishedAt: string | null;
      closingAt: string | null;
      sourceDeadlineText: string | null;
      canonicalUrl: string | null;
      sourceUrl: string;
    };
    expect(parsed).toMatchObject({
      countryCode: null,
      publishedAt: null,
      closingAt: null,
      sourceDeadlineText: "2027/01/15",
      canonicalUrl: null,
    });
    expect(parsed.sourceUrl).toContain("format=json");
  });

  it("excludes awards, general notices, cancelled and expired notices from open opportunities", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(page(0, 5, [
      notice({ id: "award", notice_type: "Contract Award" }),
      notice({ id: "general", notice_type: "General Procurement Notice" }),
      notice({ id: "cancelled", notice_status: "Cancelled" }),
      notice({ id: "expired", submission_date: "2026-11-10T00:00:00Z" }),
      notice({ id: "draft", notice_status: "Draft" }),
    ]));
    const connector = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 5,
      maxPagesPerRun: 1,
      fetcher,
    });
    await connector.prepare?.("run-id");
    expect(await connector.discover()).toEqual([]);
    expect(connector.nextCursor?.()).toBeNull();
  });

  it("rejects unapproved sources before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const connector = createWorldBankProcurementConnector({
      ...source,
      approvalStatus: "unreviewed",
      licensingStatus: "review_required",
      termsStatus: "review_required",
      reusePermissionStatus: "unknown",
      activationStatus: "inactive",
      integrationStatus: "in_development",
    }, { fetcher });

    await expect(connector.prepare?.("run-id"))
      .rejects.toThrow("not approved for operational ingestion");
    expect(fetcher).not.toHaveBeenCalled();
    expect(connector.nextCursor?.()).toBeNull();
  });

  it("retries 429 responses using Retry-After and enforces the request budget", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("rate limited", {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "2" },
      }))
      .mockResolvedValueOnce(page(0, 1, [notice()]));
    const retrySleep = vi.fn(async () => undefined);
    const connector = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 1,
      maxRequestsPerRun: 2,
      fetcher,
      retryDependencies: { sleep: retrySleep, random: () => 0 },
    });
    await connector.prepare?.("run-id");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(retrySleep).toHaveBeenCalledWith(2_000);
    expect(await connector.discover()).toEqual(["OP001"]);
  });

  it("fails closed on malformed, oversized, short, and partially failed pages without advancing the cursor", async () => {
    const malformed = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 1,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ unexpected: [] })),
    });
    await expect(malformed.prepare?.("run-id")).rejects.toThrow("unexpected response structure");
    expect(malformed.nextCursor?.()).toBeNull();

    const invalidJson = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 1,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response("{", {
        headers: { "Content-Type": "application/json" },
      })),
    });
    await expect(invalidJson.prepare?.("run-id")).rejects.toThrow("invalid JSON");
    expect(invalidJson.nextCursor?.()).toBeNull();

    const oversized = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 1,
      maxResponseBytes: 32,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(
        JSON.stringify({ os: 0, total: 1, procnotices: [notice()] }),
        { headers: { "Content-Type": "application/json", "Content-Length": "1000" } },
      )),
    });
    await expect(oversized.prepare?.("run-id")).rejects.toThrow("size limit");
    expect(oversized.nextCursor?.()).toBeNull();

    const shortPage = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 2,
      maxPagesPerRun: 1,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(page(0, 3, [notice()])),
    });
    await expect(shortPage.prepare?.("run-id")).rejects.toThrow("short page");
    expect(shortPage.nextCursor?.()).toBeNull();

    const partialFailure = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 2,
      maxRetries: 0,
      fetcher: vi.fn<typeof fetch>()
        .mockResolvedValueOnce(page(0, 2, [notice()]))
        .mockResolvedValueOnce(new Response("server error", {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })),
    });
    await expect(partialFailure.prepare?.("run-id")).rejects.toThrow("HTTP 503");
    expect(partialFailure.nextCursor?.()).toBeNull();
    await expect(partialFailure.discover()).rejects.toThrow("has not completed preparation");

    const timedOut = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 1,
      maxRetries: 0,
      fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error("network timeout")),
    });
    await expect(timedOut.prepare?.("run-id")).rejects.toThrow("network timeout");
    expect(timedOut.nextCursor?.()).toBeNull();
  });

  it("fails on malformed notice identity or required bid description", async () => {
    const missingIdentity = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 1,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(page(0, 1, [
        notice({ id: undefined }),
      ])),
    });
    await expect(missingIdentity.prepare?.("run-id"))
      .rejects.toThrow("missing its source-native identifier");

    const missingTitle = createWorldBankProcurementConnector(source, {
      ...dependencies(),
      pageSize: 1,
      maxPagesPerRun: 1,
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(page(0, 1, [
        notice({ bid_description: undefined }),
      ])),
    });
    await missingTitle.prepare?.("run-id");
    await expect(missingTitle.parse(await missingTitle.retrieve("OP001")))
      .rejects.toThrow("missing its bid description");
  });
});
