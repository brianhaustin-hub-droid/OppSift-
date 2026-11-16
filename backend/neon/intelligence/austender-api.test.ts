import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { AusTenderOcdsClient } from "./austender-api";
import { createAusTenderSourceConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "5a4e1c2d-3b4a-4c9e-8d1f-2e6b0a7c9d10",
  name: "AusTender Contract Notices",
  publisher: "Australian Government Department of Finance",
  website: "https://www.tenders.gov.au/",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://api.tenders.gov.au/ocds/findByDates/contractPublished",
  connectorIdentifier: "austender-ocds",
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
  permissionsEvidenceUrl: "https://www.tenders.gov.au/",
  licenseUrl: "https://creativecommons.org/licenses/by/3.0/au/",
  termsUrl: "https://www.tenders.gov.au/",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute the Australian Government Department of Finance.",
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
  ...overrides,
});

const releaseFixture = {
  ocid: "prod-e2a54d1fdc714e028e8d469cca2450be",
  id: "prod-e2a54d1fdc714e028e8d469cca2450be-239015f506d43db284719658116c0743",
  date: "2026-11-11T23:59:32Z",
  initiationType: "tender",
  language: "EN",
  tag: ["contract"],
  tender: { id: "prod-e2a54d1fdc714e028e8d469cca2450be", procurementMethod: "limited" },
  contracts: [{
    id: "CN4288296",
    awardID: "CN4288296-1bc76dcca2024f868888ccf561d0b628",
    dateSigned: "2026-11-11T23:59:32Z",
    description: "University of Newcastle - Master of Environment Management (Samoa)",
    title: "82807",
    value: { currency: "AUD", amount: "12293.78" },
    status: "active",
  }],
  parties: [
    { id: "bd22fdde992325b36520dc4c08118ebb", name: "UNIVERSITY OF NEWCASTLE", roles: ["supplier"] },
    { id: "fd6413c199479cc508f00b83921c4adf", name: "Department of Foreign Affairs and Trade - Australian Aid Program", roles: ["procuringEntity"] },
  ],
};

const packageFixture = {
  uri: "https://api.tenders.gov.au/ocds/findByDates/contractPublished/2026-11-01T00:00:00Z/2026-11-12T00:00:00Z",
  publishedDate: "2026-11-12T00:00:00Z",
  license: "https://creativecommons.org/licenses/by/3.0/au/",
  version: "1.1",
  releases: [releaseFixture],
  links: {
    next: "https://api.tenders.gov.au/ocds/findByDates/contractPublished/2026-11-01T00:00:00Z/2026-11-12T00:00:00Z?cursor=abc",
  },
};

const fixedNow = () => new Date("2026-11-12T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("AusTender OCDS client", () => {
  it("maps a contract-award release to a parsed Australian opportunity", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(packageFixture));
    const client = new AusTenderOcdsClient(approvedSource(), { fetcher });

    const result = await client.search({
      publishedFrom: "2026-11-01",
      publishedTo: "2026-11-12",
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      externalId: releaseFixture.id,
      title: "University of Newcastle - Master of Environment Management (Samoa)",
      sourceCategoryTerm: "Contract Award",
      referenceNumber: "CN4288296",
      countryCode: "AU",
      procuringOrganization: "Department of Foreign Affairs and Trade - Australian Aid Program",
      status: "awarded",
      currency: "AUD",
      amount: "12293.78",
      sourceUrl: "https://api.tenders.gov.au/ocds/findById/CN4288296",
    });
    expect(result.nextCursor).toBe(packageFixture.links.next);
  });

  it("rejects a package with the wrong license", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      ...packageFixture,
      license: "https://example.com/not-open",
    }));
    const client = new AusTenderOcdsClient(approvedSource(), { fetcher });

    await expect(client.search({ publishedFrom: "2026-11-01", publishedTo: "2026-11-12" }))
      .rejects.toThrow("license");
  });
});

describe("AusTender connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(packageFixture));
    const connector = createAusTenderSourceConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual([releaseFixture.id]);
    expect(connector.nextCursor?.()).toBeTruthy();

    const retrieved = await connector.retrieve(releaseFixture.id);
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({ externalId: releaseFixture.id, countryCode: "AU", status: "awarded" });

    const raw = await connector.toRawSourceRecord(releaseFixture.id, retrieved, collectionRunId);
    expect(raw.externalRecordId).toBe(releaseFixture.id);
    expect(raw.sourceId).toBe(approvedSource().id);
  });
});