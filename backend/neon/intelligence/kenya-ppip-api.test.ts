import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { KenyaPpipApiClient } from "./kenya-ppip-api";
import { createKenyaPpipSourceConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "af5e6f7a-8b9c-4d0e-8f2a-3b4c5d6e7f8a",
  name: "Kenya PPIP Active Tenders",
  publisher: "Public Procurement Regulatory Authority (PPRA) - Kenya",
  website: "https://tenders.go.ke/",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://tenders.go.ke/api/active-tenders",
  connectorIdentifier: "kenya-ppip-api",
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
  permissionsEvidenceUrl: "https://tenders.go.ke/ocds",
  licenseUrl: "https://tenders.go.ke/ocds",
  termsUrl: "https://tenders.go.ke/",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute the Kenya PPIP.",
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
  id: 311587,
  ocid: "ocds-5whusi-311587-NG-CDF/MATHIOYA/09/05/2025-2026",
  title: "SUPPLY AND DELIVERY OF BIOLOGY, PHYSICS & CHEMISTRY EQUIPMENT AT GITUGI MIXED SECONDARY SCHOOL",
  tender_ref: "NG-CDF/MATHIOYA/09/05/2025-2026",
  published_at: "2026-11-06 00:00:00",
  close_at: "2026-11-16 09:00:00",
  venue: "MATHIOYA NG-CDF OFFICE",
  created_by: { name: "JOSEPH KAMAU", id_number: "11843748", phone: "+254 722 320794", email: "cdfmathioya@ngcdf.go.ke" },
  pe: { id: 6974, name: "MATHIOYA NG-CDF" },
  procurement_category: { id: 1, title: "Goods", code: "goods" },
  procurement_method: { id: 1, title: "Open Tender", code: "open" },
};

const pageFixture = {
  current_page: 1,
  last_page: 2,
  next_page_url: "https://tenders.go.ke/api/active-tenders?page=2",
  per_page: 10,
  total: 11,
  data: [itemFixture],
};

const fixedNow = () => new Date("2026-11-13T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("Kenya PPIP active tenders client", () => {
  it("maps a tender to a parsed Kenyan opportunity without officer personal data", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pageFixture));
    const client = new KenyaPpipApiClient(approvedSource(), { fetcher, now: fixedNow });

    const result = await client.search({ page: 1 });
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      externalId: "311587",
      title: "SUPPLY AND DELIVERY OF BIOLOGY, PHYSICS & CHEMISTRY EQUIPMENT AT GITUGI MIXED SECONDARY SCHOOL",
      sourceCategoryTerm: "Active Tender",
      referenceNumber: "NG-CDF/MATHIOYA/09/05/2025-2026",
      countryCode: "KE",
      procuringOrganization: "MATHIOYA NG-CDF",
      publishedAt: "2026-11-06T00:00:00Z",
      closingAt: "2026-11-16T09:00:00Z",
      status: "open",
      sourceUrl: "https://tenders.go.ke/tenders/311587",
    });
    expect(JSON.stringify(result.rawRecords[0].payload)).not.toContain("11843748");
    expect(JSON.stringify(result.rawRecords[0].payload)).not.toContain("cdfmathioya@ngcdf.go.ke");
    expect(result.nextPage).toBe(2);
  });
});

describe("Kenya PPIP connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(pageFixture));
    const connector = createKenyaPpipSourceConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["311587"]);

    const retrieved = await connector.retrieve("311587");
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({ externalId: "311587", countryCode: "KE", status: "open" });

    const raw = await connector.toRawSourceRecord("311587", retrieved, collectionRunId);
    expect(raw.externalRecordId).toBe("311587");
  });
});