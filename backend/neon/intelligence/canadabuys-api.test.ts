import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { CanadabuysApiClient } from "./canadabuys-api";
import { createCanadabuysApiConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "bf8c9d0e-1f2a-4b3c-9d4e-5f6a7b8c9d0e",
  name: "CanadaBuys Tender Notices",
  publisher: "Public Services and Procurement Canada (CanadaBuys)",
  website: "https://canadabuys.canada.ca/en/tender-opportunities",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://canadabuys.canada.ca/en/jsonapi/node/tender_notice",
  connectorIdentifier: "canadabuys-api",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["en"],
  publicationFrequency: "Hourly",
  expectedRefreshHours: 1,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://canadabuys.canada.ca/en/tender-opportunities",
  licenseUrl: "https://canadabuys.canada.ca/en/terms-use",
  termsUrl: "https://canadabuys.canada.ca/en/terms-use",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute CanadaBuys (PSPC).",
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

const nodeFixture = {
  id: "90047918-e90d-4a42-8497-3432ca718f77",
  type: "node--tender_notice",
  attributes: {
    title: "Supply of laboratory equipment",
    drupal_internal__nid: 364244,
    field_tender_reference_number: "PW-26-0001",
    field_tender_publication_date: "2026-11-10",
    field_tender_closing_date: "2026-11-27T14:00:00-05:00",
    field_tender_organization: "Shared Services Canada",
    field_tender_notice_link: { uri: "https://canadabuys.canada.ca/en/tender-notice/364244" },
    path: { alias: "/en/tender-notice/364244" },
  },
};

const collectionFixture = { data: [nodeFixture], meta: { count: 1 } };

const fixedNow = () => new Date("2026-11-13T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("CanadaBuys JSON:API client", () => {
  it("maps a tender notice to a parsed Canadian opportunity", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(collectionFixture));
    const client = new CanadabuysApiClient(approvedSource(), { fetcher, now: fixedNow });

    const result = await client.search({ offset: 0, limit: 50 });
    expect(result.count).toBe(1);
    expect(result.records[0]).toMatchObject({
      externalId: nodeFixture.id,
      title: "Supply of laboratory equipment",
      sourceCategoryTerm: "Tender Notice",
      referenceNumber: "PW-26-0001",
      countryCode: "CA",
      procuringOrganization: "Shared Services Canada",
      publishedAt: "2026-11-10T00:00:00.000Z",
      closingAt: "2026-11-27T19:00:00.000Z",
      status: "open",
      sourceUrl: "https://canadabuys.canada.ca/en/tender-notice/364244",
    });
  });
});

describe("CanadaBuys connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      Response.json(collectionFixture),
    );
    const connector = createCanadabuysApiConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      pageSize: 50,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual([nodeFixture.id]);

    const retrieved = await connector.retrieve(nodeFixture.id);
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({ externalId: nodeFixture.id, countryCode: "CA", status: "open" });

    const raw = await connector.toRawSourceRecord(nodeFixture.id, retrieved, collectionRunId);
    expect(raw.externalRecordId).toBe(nodeFixture.id);
  });
});