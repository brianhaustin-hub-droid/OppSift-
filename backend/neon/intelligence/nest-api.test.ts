import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { NestOcdsClient } from "./nest-api";
import { createNestSourceConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "9e4d5f6a-7b8c-4d9e-8f1a-2b3c4d5e6f7a",
  name: "NeST OCDS Procurement Data",
  publisher: "Public Procurement Regulatory Authority (PPRA) - Tanzania",
  website: "https://nest.go.tz/",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://nest.go.tz/gateway/nest-data-portal-api/api/releases",
  connectorIdentifier: "nest-ocds",
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
  permissionsEvidenceUrl: "https://data.nest.go.tz/",
  licenseUrl: "https://data.nest.go.tz/license",
  termsUrl: "https://data.nest.go.tz/publication-policy",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute the NeST data portal (PPRA Tanzania).",
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
  ocid: "ocds-mv5oob-S833-2024-2025-G-24-S002",
  id: "60fc0fa7-d758-4cc1-8e68-6abb3592d9d9",
  date: "2022-02-22T00:00:00Z",
  tag: ["tender"],
  buyer: { id: "02323dd1-7633-4671-8442-2cb340a66636", name: "WOTTA SECONDARY SCHOOL" },
  tender: {
    id: "S.833/2024/2025/G/24-S002",
    description: "Supply of Doors and Windows",
    status: "active",
    tenderPeriod: {
      startDate: "2022-02-22T00:00:00Z",
      endDate: "2022-02-25T10:00:00Z",
    },
    procuringEntity: { id: "02323dd1-7633-4671-8442-2cb340a66636", name: "WOTTA SECONDARY SCHOOL" },
  },
  parties: [],
};

const packageFixture = {
  license: "https://data.nest.go.tz/license",
  publicationPolicy: "https://data.nest.go.tz/publication-policy",
  version: "1.1",
  publisher: { name: "PPRA" },
  uri: "https://nest.go.tz/gateway/nest-data-portal-api/api/releases",
  publishedDate: "2023-06-11T09:53:52.347",
  releases: [releaseFixture],
  links: { next: "https://nest.go.tz/gateway/nest-data-portal-api/api/releases?since=2023-06-11T09:53:52.347&cursor=2320074" },
};

const fixedNow = () => new Date("2022-03-01T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("NeST OCDS client", () => {
  it("maps a release to a parsed Tanzanian opportunity", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(packageFixture));
    const client = new NestOcdsClient(approvedSource(), { fetcher, now: fixedNow });

    const result = await client.search({});
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({
      externalId: releaseFixture.id,
      title: "Supply of Doors and Windows",
      sourceCategoryTerm: "Tender",
      referenceNumber: "S.833/2024/2025/G/24-S002",
      countryCode: "TZ",
      procuringOrganization: "WOTTA SECONDARY SCHOOL",
      publishedAt: "2022-02-22T00:00:00.000Z",
      closingAt: "2022-02-25T10:00:00.000Z",
      status: "closed",
    });
    expect(result.nextCursor).toBe(packageFixture.links.next);
  });
});

describe("NeST connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(packageFixture));
    const connector = createNestSourceConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual([releaseFixture.id]);

    const retrieved = await connector.retrieve(releaseFixture.id);
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({ externalId: releaseFixture.id, countryCode: "TZ", status: "closed" });

    const raw = await connector.toRawSourceRecord(releaseFixture.id, retrieved, collectionRunId);
    expect(raw.externalRecordId).toBe(releaseFixture.id);
  });
});