import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { TedPublishedNoticesClient } from "./ted-api";

const source: SourceRegistryRecord = {
  id: "c2e3057b-a6e3-48c4-80a3-3dc2cbefc2b9",
  name: "TED published notices",
  publisher: "Publications Office of the European Union",
  website: "https://ted.europa.eu",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://api.ted.europa.eu/v3/notices/search",
  connectorIdentifier: "ted-published-notices",
  coverageScope: "regional",
  coverageRegionCodes: ["europe"],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["en"],
  publicationFrequency: "Continuous notice publication",
  expectedRefreshHours: 24,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://docs.ted.europa.eu/api/latest/",
  licenseUrl: "https://ted.europa.eu/en/legal-notice",
  termsUrl: "https://docs.ted.europa.eu/api/latest/",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribution terms recorded for test only.",
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

const notice = {
  "publication-number": "779190-2026",
  "publication-date": "2026-11-10+01:00",
  "notice-title": { eng: "Published test notice" },
  links: {
    html: { eng: "https://ted.europa.eu/en/notice/-/detail/779190-2026" },
  },
};

describe("TED published notices API client", () => {
  it("uses the documented endpoint, query format, fields, and page limits", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        notices: [notice],
        totalNoticeCount: 45,
      }),
    );
    const client = new TedPublishedNoticesClient(source, { fetcher });

    const result = await client.search({
      publishedFrom: "2026-11-01",
      page: 2,
      pageSize: 1,
    });

    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.ted.europa.eu/v3/notices/search");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual({
      query: "publication-date >= 20261101",
      fields: [
        "publication-number",
        "publication-date",
        "notice-title",
        "deadline-receipt-tender-date-lot",
        "organisation-country-buyer",
      ],
      page: 2,
      limit: 1,
      scope: "ACTIVE",
      paginationMode: "PAGE_NUMBER",
      onlyLatestVersions: true,
    });
    expect(result).toEqual({
      totalNoticeCount: 45,
      page: 2,
      pageSize: 1,
      notices: [notice],
      nextPage: 3,
    });
  });

  it("refuses an unapproved source before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new TedPublishedNoticesClient({
      ...source,
      integrationStatus: "in_development",
      approvalStatus: "unreviewed",
      activationStatus: "inactive",
    }, { fetcher });

    await expect(client.search({ publishedFrom: "2026-11-01" }))
      .rejects.toThrow("not approved for operational ingestion");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects invalid date and out-of-range pagination before fetching", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new TedPublishedNoticesClient(source, { fetcher });

    await expect(client.search({ publishedFrom: "2026-02-30" })).rejects.toThrow("valid calendar date");
    await expect(client.search({ publishedFrom: "2026-11-01", page: 0 })).rejects.toThrow("positive integer");
    await expect(client.search({ publishedFrom: "2026-11-01", pageSize: 251 })).rejects.toThrow("1 to 250");
    await expect(client.search({
      publishedFrom: "2026-11-01",
      page: 61,
      pageSize: 250,
    })).rejects.toThrow("15,000-notice pagination limit");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects malformed, timed-out, and oversized API responses", async () => {
    const malformed = new TedPublishedNoticesClient(source, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({
        notices: [{ "publication-number": "missing-date" }],
        totalNoticeCount: 1,
      })),
    });
    await expect(malformed.search({ publishedFrom: "2026-11-01" }))
      .rejects.toThrow("documented notice search format");

    const untrustedLink = new TedPublishedNoticesClient(source, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({
        notices: [{
          ...notice,
          links: { html: { eng: "https://example.com/notice" } },
        }],
        totalNoticeCount: 1,
      })),
    });
    // Link strictness moved to the connector: the client accepts the page and
    // the connector falls back to a safe official URL per notice.
    await expect(
      untrustedLink.search({ publishedFrom: "2026-11-01" }),
    ).resolves.toMatchObject({ totalNoticeCount: 1 });

    const timedOut = new TedPublishedNoticesClient(source, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({
        notices: [],
        totalNoticeCount: 0,
        timedOut: true,
      })),
    });
    await expect(timedOut.search({ publishedFrom: "2026-11-01" }))
      .rejects.toThrow("documented notice search format");

    const oversized = new TedPublishedNoticesClient(source, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(Response.json({
        notices: Array.from({ length: 2 }, () => notice),
        totalNoticeCount: 2,
      })),
    });
    await expect(oversized.search({ publishedFrom: "2026-11-01", pageSize: 1 }))
      .rejects.toThrow("more notices than requested");
  });
});
