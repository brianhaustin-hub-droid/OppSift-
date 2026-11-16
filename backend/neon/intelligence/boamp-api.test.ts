import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { BoampApiClient } from "./boamp-api";
import { createBoampSourceConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "7c2b3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  name: "BOAMP Avis de marchés publics",
  publisher: "Direction de l'information légale et administrative (DILA)",
  website: "https://www.boamp.fr/",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records",
  connectorIdentifier: "boamp-opendata",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["fr"],
  publicationFrequency: "Daily",
  expectedRefreshHours: 24,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://www.boamp.fr/",
  licenseUrl: "https://www.etalab.gouv.fr/licence-ouverte-open-licence",
  termsUrl: "https://www.boamp.fr/",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute BOAMP (DILA).",
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

const noticeFixture = {
  id: "26_110146",
  idweb: "26-110146",
  objet: "Fourniture de sacs translucides et de sacs jaunes",
  dateparution: "2026-11-12",
  datelimitereponse: "2026-12-03T13:00:00+00:00",
  nomacheteur: "SICTOM Région Montluçonnaise",
  nature_libelle: "Avis de marché",
  type_avis: "5 1",
  etat: "INITIAL",
  url_avis: "https://www.boamp.fr/pages/avis/?q=idweb:26-110146",
  code_departement: "3",
};

const responseFixture = { total_count: 1, results: [noticeFixture] };

const fixedNow = () => new Date("2026-11-12T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("BOAMP Opendatasoft client", () => {
  it("maps a notice to a parsed French opportunity", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(responseFixture));
    const client = new BoampApiClient(approvedSource(), { fetcher, now: fixedNow });

    const result = await client.search({ publishedFrom: "2026-11-01", publishedTo: "2026-11-12" });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      externalId: "26_110146",
      title: "Fourniture de sacs translucides et de sacs jaunes",
      sourceCategoryTerm: "Marché public",
      referenceNumber: "26-110146",
      countryCode: "FR",
      procuringOrganization: "SICTOM Région Montluçonnaise",
      publishedAt: "2026-11-12T00:00:00.000Z",
      closingAt: "2026-12-03T13:00:00.000Z",
      status: "open",
      sourceUrl: "https://www.boamp.fr/pages/avis/?q=idweb:26-110146",
    });
    expect(result.nextOffset).toBeNull();
  });
});

describe("BOAMP connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(responseFixture));
    const connector = createBoampSourceConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      pageSize: 100,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["26_110146"]);

    const retrieved = await connector.retrieve("26_110146");
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({ externalId: "26_110146", countryCode: "FR", status: "open" });

    const raw = await connector.toRawSourceRecord("26_110146", retrieved, collectionRunId);
    expect(raw.externalRecordId).toBe("26_110146");
  });
});