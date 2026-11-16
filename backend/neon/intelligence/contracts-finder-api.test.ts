import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { ContractsFinderOcdsClient } from "./contracts-finder-api";

const source: SourceRegistryRecord = {
  id: "14aee40e-b755-4fd8-86a3-b7d599bc150b",
  name: "UK Contracts Finder",
  publisher: "UK Government",
  website: "https://www.contractsfinder.service.gov.uk",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search",
  connectorIdentifier: "contracts-finder-ocds",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["en"],
  publicationFrequency: "Continuous notice publication",
  expectedRefreshHours: 24,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://www.contractsfinder.service.gov.uk/",
  licenseUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  termsUrl: "https://www.contractsfinder.service.gov.uk/apidocumentation",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute the UK Government and link to the Open Government Licence v3.0.",
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

const openTender = {
  id: "notice-123",
  ocid: "ocds-b5fd17-test",
  date: "2026-03-10T12:00:00Z",
  tag: ["tender"],
  tender: {
    id: "CF-123",
    title: "Open procurement opportunity",
    status: "active",
    mainProcurementCategory: "goods",
    tenderPeriod: { endDate: "2026-12-01T12:00:00Z" },
    value: { amount: 1250, currency: "GBP" },
  },
  parties: [{
    id: "buyer",
    name: "Buyer organization",
    contactPoint: { name: "Personal contact", email: "private@example.gov.uk" },
  }],
};

function packageResponse(
  releases: unknown[] = [openTender],
  next?: string,
  license = "http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
) {
  return Response.json({
    license,
    releases,
    links: next ? { next } : {},
  });
}

describe("Contracts Finder OCDS API client", () => {
  it("retrieves and maps open tenders without retaining party contact data or free-text descriptions", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(packageResponse());
    const client = new ContractsFinderOcdsClient(source, {
      fetcher,
      now: () => new Date("2026-11-10T00:00:00Z"),
    });

    const result = await client.search({
      publishedFrom: "2026-03-01",
      publishedTo: "2026-03-16",
      pageSize: 1,
    });

    expect(String(fetcher.mock.calls[0]?.[0])).toBe(
      "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?publishedFrom=2026-03-01&publishedTo=2026-03-16&limit=1",
    );
    expect(result).toMatchObject({
      pagesFetched: 1,
      skippedNonOpen: 0,
      rejected: [],
      nextCursor: null,
    });
    expect(result.records).toHaveLength(1);
    expect(result.rawRecords).toEqual([{
      externalId: "notice-123",
      payload: {
        id: "notice-123",
        ocid: "ocds-b5fd17-test",
        date: "2026-03-10T12:00:00Z",
        tag: ["tender"],
        tender: {
          id: "CF-123",
          title: "Open procurement opportunity",
          status: "active",
          mainProcurementCategory: "goods",
          classificationDescription: null,
          tenderPeriodEndDate: "2026-12-01T12:00:00Z",
          amount: 1250,
          currency: "GBP",
        },
      },
    }]);
    expect(result.records[0]).toMatchObject({
      externalId: "notice-123",
      title: "Open procurement opportunity",
      description: null,
      sourceCategoryTerm: "goods",
      countryCode: "GB",
      publisher: "UK Government",
      status: "open",
      sourceUrl: "https://www.contractsfinder.service.gov.uk/Published/OCDS/Release/notice-123",
      currency: "GBP",
      amount: "1250",
      originalValues: { ocid: "ocds-b5fd17-test", noticeType: "tender" },
    });
    expect(JSON.stringify(result.records)).not.toContain("private@example.gov.uk");
    expect(JSON.stringify(result.records)).not.toContain("Personal contact");
  });

  it("follows only bounded, same-endpoint pagination URLs and returns the continuation cursor", async () => {
    const next = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?publishedFrom=2026-03-01&publishedTo=2026-03-16&limit=1&nextCursor=abc";
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(packageResponse([openTender], next))
      .mockResolvedValueOnce(packageResponse([{ ...openTender, id: "notice-456" }]));
    const client = new ContractsFinderOcdsClient(source, {
      fetcher,
      sleep: vi.fn(async () => {}),
    });

    const result = await client.search({
      publishedFrom: "2026-03-01",
      publishedTo: "2026-03-16",
      pageSize: 1,
      maxPages: 2,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.records.map((record) => record.externalId)).toEqual(["notice-123", "notice-456"]);
    expect(result.nextCursor).toBeNull();
  });

  it("returns a cursor when the configured page bound is reached", async () => {
    const next = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?publishedFrom=2026-03-01&publishedTo=2026-03-16&limit=1&nextCursor=abc";
    const client = new ContractsFinderOcdsClient(source, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(packageResponse([openTender], next)),
    });

    const result = await client.search({
      publishedFrom: "2026-03-01",
      publishedTo: "2026-03-16",
      pageSize: 1,
      maxPages: 1,
    });
    expect(result.nextCursor).toBe(next);
  });

  it("skips awards and other non-open records", async () => {
    const award = {
      ...openTender,
      id: "award-456",
      tag: ["award"],
      tender: { ...openTender.tender, status: "complete" },
    };
    const inactive = {
      ...openTender,
      id: "inactive-789",
      tender: { ...openTender.tender, status: "planned" },
    };
    const client = new ContractsFinderOcdsClient(source, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(packageResponse([award, inactive])),
    });

    const result = await client.search({
      publishedFrom: "2026-03-01",
      publishedTo: "2026-03-16",
    });
    expect(result.records).toEqual([]);
    expect(result.skippedNonOpen).toBe(2);
  });

  it("refuses unapproved sources before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new ContractsFinderOcdsClient({
      ...source,
      integrationStatus: "in_development",
      approvalStatus: "unreviewed",
      activationStatus: "inactive",
    }, { fetcher });

    await expect(client.search({
      publishedFrom: "2026-03-01",
      publishedTo: "2026-03-16",
    })).rejects.toThrow("not approved for operational ingestion");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects invalid date ranges, pagination bounds, and untrusted cursors before fetching", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new ContractsFinderOcdsClient(source, { fetcher });
    const range = { publishedFrom: "2026-03-01", publishedTo: "2026-03-16" };

    await expect(client.search({ ...range, publishedFrom: "2026-02-30" })).rejects.toThrow("valid calendar date");
    await expect(client.search({ ...range, publishedTo: "2026-02-28" })).rejects.toThrow("on or after");
    await expect(client.search({ ...range, pageSize: 101 })).rejects.toThrow("1 to 100");
    await expect(client.search({ ...range, maxPages: 11 })).rejects.toThrow("1 to 10");
    await expect(client.search({ ...range, cursor: "https://example.com/search" })).rejects.toThrow("outside its documented search endpoint");
    await expect(client.search({
      ...range,
      cursor: "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?publishedFrom=2025-01-01&publishedTo=2026-03-16&limit=50&nextCursor=abc",
    })).rejects.toThrow("does not preserve the requested date and page bounds");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects an unexpected license and response over the requested page size", async () => {
    const wrongLicense = new ContractsFinderOcdsClient(source, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(packageResponse(
        [openTender],
        undefined,
        "https://example.com/license",
      )),
    });
    await expect(wrongLicense.search({
      publishedFrom: "2026-03-01",
      publishedTo: "2026-03-16",
    })).rejects.toThrow("documented OCDS format or OGL v3 license");

    const oversized = new ContractsFinderOcdsClient(source, {
      fetcher: vi.fn<typeof fetch>().mockResolvedValue(packageResponse([openTender, openTender])),
    });
    await expect(oversized.search({
      publishedFrom: "2026-03-01",
      publishedTo: "2026-03-16",
      pageSize: 1,
    })).rejects.toThrow("more releases than requested");
  });

  it("retries transient network failures", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(packageResponse());
    const sleep = vi.fn(async () => {});
    const client = new ContractsFinderOcdsClient(source, { fetcher, sleep });

    const result = await client.search({
      publishedFrom: "2026-03-01",
      publishedTo: "2026-03-16",
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1_000);
    expect(result.records).toHaveLength(1);
  });
});
