import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { SamGovApiClient } from "./sam-gov-api";

const source: SourceRegistryRecord = {
  id: "2f0c496e-8e51-4db4-b6a6-64064d65d001",
  name: "SAM.gov Contract Opportunities",
  publisher: "U.S. General Services Administration",
  website: "https://sam.gov",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://api.sam.gov/opportunities/v2/search",
  connectorIdentifier: "sam-gov-opportunities",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["en"],
  publicationFrequency: "Daily updates per GSA documentation",
  expectedRefreshHours: 24,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://open.gsa.gov/api/get-opportunities-public-api/",
  licenseUrl: "https://www.gsa.gov/website-information/website-policies",
  termsUrl: "https://open.gsa.gov/api/get-opportunities-public-api/",
  reusePermissionStatus: "permitted",
  attributionRequirements: null,
  robotsRestrictions: null,
  retentionRestrictions: null,
  rateLimitRequests: 60,
  rateLimitWindowSeconds: 3600,
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

const searchResponse = {
  totalRecords: 1,
  limit: 25,
  offset: 0,
  opportunitiesData: [
    { noticeId: "notice-123", title: "Office renovation", active: "Yes" },
  ],
};

describe("SAM.gov API client", () => {
  it("uses the documented endpoint, query parameters, and response fields", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(searchResponse), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new SamGovApiClient(source, "non-secret-test-value", { fetcher });

    const result = await client.search({
      postedFrom: "2026-01-01",
      postedTo: "2026-01-31",
      pageSize: 25,
      procurementType: "o",
      title: "Office",
    });

    const requestUrl = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      "https://api.sam.gov/opportunities/v2/search",
    );
    expect(requestUrl.searchParams.get("api_key")).toBe("non-secret-test-value");
    expect(requestUrl.searchParams.get("postedFrom")).toBe("01/01/2026");
    expect(requestUrl.searchParams.get("postedTo")).toBe("01/31/2026");
    expect(requestUrl.searchParams.get("limit")).toBe("25");
    expect(requestUrl.searchParams.get("offset")).toBe("0");
    expect(requestUrl.searchParams.get("ptype")).toBe("o");
    expect(result).toEqual({
      totalRecords: 1,
      pageIndex: 0,
      pageSize: 25,
      notices: searchResponse.opportunitiesData,
    });
  });

  it("does not gate requests on approval labels", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      totalRecords: 0,
      limit: 100,
      offset: 0,
      opportunitiesData: [],
    }));
    const client = new SamGovApiClient({
      ...source,
      integrationStatus: "in_development",
      approvalStatus: "unreviewed",
      activationStatus: "inactive",
    }, "non-secret-test-value", { fetcher });

    const result = await client.search({
      postedFrom: "2026-01-01",
      postedTo: "2026-01-31",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.notices).toHaveLength(0);
  });

  it("rejects missing credentials without making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new SamGovApiClient(source, undefined, { fetcher });

    await expect(client.search({
      postedFrom: "2026-01-01",
      postedTo: "2026-01-31",
    })).rejects.toThrow("API key is not configured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid calendar date", "2026-02-30", "2026-03-01"],
    ["reversed date range", "2026-02-01", "2026-01-01"],
    ["range over one year", "2025-01-01", "2026-01-02"],
  ])("rejects %s before making a request", async (_label, postedFrom, postedTo) => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new SamGovApiClient(source, "non-secret-test-value", { fetcher });

    await expect(client.search({ postedFrom, postedTo })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a response with inconsistent pagination metadata", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ...searchResponse, offset: 3 }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new SamGovApiClient(source, "non-secret-test-value", { fetcher });

    await expect(client.search({
      postedFrom: "2026-01-01",
      postedTo: "2026-01-31",
    })).rejects.toThrow("pagination metadata");
  });

  it("does not expose the API key when the network request fails", async () => {
    const secret = "not-a-real-api-key";
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(
      new Error(`Network failure at https://api.sam.gov/?api_key=${secret}`),
    );
    const client = new SamGovApiClient(source, secret, { fetcher });

    await expect(client.search({
      postedFrom: "2026-01-01",
      postedTo: "2026-01-31",
    })).rejects.not.toThrow(secret);
  });
});
