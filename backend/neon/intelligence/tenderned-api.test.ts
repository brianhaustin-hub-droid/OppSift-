import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { TenderNedApiClient } from "./tenderned-api";
import { createTenderNedSourceConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "8d3c4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
  name: "TenderNed Publicaties",
  publisher: "TenderNed (Ministerie van Economische Zaken)",
  website: "https://www.tenderned.nl/",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties",
  connectorIdentifier: "tenderned-api",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["nl"],
  publicationFrequency: "Daily",
  expectedRefreshHours: 24,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://www.tenderned.nl/aankondigingen/overzicht",
  licenseUrl: "https://www.tenderned.nl/",
  termsUrl: "https://www.tenderned.nl/",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute TenderNed.",
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

const itemFixture = {
  publicatieId: "449420",
  publicatieDatum: "2026-11-13",
  typePublicatie: { code: "REC", omschrijving: "Rectificatie" },
  aanbestedingNaam: "Versneld verledden gemeente Beuningen",
  opdrachtgeverNaam: "Gemeente Beuningen",
  sluitingsDatum: "2026-12-29T10:00:00",
  procedure: { code: "OPE", omschrijving: "Openbaar" },
  publicatiestatus: { code: "PUB", omschrijving: "Gepubliceerd" },
  kenmerk: 609919,
  link: { href: "https://www.tenderned.nl/aankondigingen/overzicht/449420", title: "self" },
};

const pageFixture = {
  content: [itemFixture],
  first: true,
  last: true,
  totalElements: 1,
  totalPages: 1,
  size: 1,
  numberOfElements: 1,
  number: 0,
};

const fixedNow = () => new Date("2026-11-13T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("TenderNed publications client", () => {
  it("maps a publication to a parsed Dutch opportunity", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pageFixture));
    const client = new TenderNedApiClient(approvedSource(), { fetcher, now: fixedNow });

    const result = await client.search({ page: 0, size: 100 });
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      externalId: "449420",
      title: "Versneld verledden gemeente Beuningen",
      sourceCategoryTerm: "Aanbesteding",
      referenceNumber: "609919",
      countryCode: "NL",
      procuringOrganization: "Gemeente Beuningen",
      publishedAt: "2026-11-13T00:00:00.000Z",
      closingAt: "2026-12-29T10:00:00.000Z",
      status: "open",
      sourceUrl: "https://www.tenderned.nl/aankondigingen/overzicht/449420",
    });
    expect(result.nextPage).toBeNull();
  });
});

describe("TenderNed connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pageFixture));
    const connector = createTenderNedSourceConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      pageSize: 100,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["449420"]);

    const retrieved = await connector.retrieve("449420");
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({ externalId: "449420", countryCode: "NL", status: "open" });

    const raw = await connector.toRawSourceRecord("449420", retrieved, collectionRunId);
    expect(raw.externalRecordId).toBe("449420");
  });
});