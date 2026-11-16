import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { OcpBulkClient } from "./ocp-bulk-api";
import { createOcpBulkSourceConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "bf6a7b8c-9d0e-4f1a-8b2c-3d4e5f6a7b8c",
  name: "Uganda PPDA OCDS (OCP Registry)",
  publisher: "Public Procurement and Disposal of Public Assets Authority (PPDA) - Uganda",
  website: "https://gpp.ppda.go.ug/",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "download",
  apiOrFeedUrl: "https://data.open-contracting.org/en/publication/130/download?name=2025.jsonl.gz",
  connectorIdentifier: "ocp-bulk-uganda",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["en"],
  publicationFrequency: "Daily",
  expectedRefreshHours: 1,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://data.open-contracting.org/en/publication/130",
  licenseUrl: "https://opendatacommons.org/licenses/by/1-0/",
  termsUrl: "https://data.open-contracting.org/en/publication/130",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute the Uganda PPDA via the OCP Data Registry.",
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

const lineA = {
  id: "ocds-rdvc92-A-2025-01-23T09:41:55+00:00",
  tag: ["compiled"],
  date: "2025-01-23T09:41:55+00:00",
  ocid: "ocds-rdvc92-A",
  buyer: { id: "433", name: "National Water & Sewerage Corporation" },
  awards: [{ id: "1", value: { amount: 17500000, currency: "UGX" } }],
  tender: {
    id: "92425",
    title: "Supply of Rubber Sheathed Flexible Signal Cable",
    status: "complete",
    tenderPeriod: { endDate: "2025-02-10T10:00:00+00:00" },
  },
};

const lineB = {
  id: "ocds-rdvc92-B-2025-01-23T09:41:55+00:00",
  tag: ["compiled"],
  date: "2025-01-23T09:41:55+00:00",
  ocid: "ocds-rdvc92-B",
  buyer: { id: "99", name: "Busitema University" },
  awards: [],
  tender: {
    id: "92426",
    title: "Rehabilitation of access roads",
    status: "active",
    tenderPeriod: { endDate: "2025-06-30T10:00:00+00:00" },
    value: { amount: "300000000", currency: "UGX" },
  },
};

const rawLine = `${JSON.stringify(lineA)}\n${JSON.stringify(lineB)}\n`;

async function gzipBody(text: string): Promise<Uint8Array> {
  const stream = new Response(text).body!.pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const fixedNow = () => new Date("2025-02-01T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("OCP bulk Uganda client", () => {
  it("decompresses, maps, and pages newest-first", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(await gzipBody(rawLine) as unknown as BodyInit),
    );
    const client = new OcpBulkClient(approvedSource(), {
      publicationId: 130,
      fileName: "2025.jsonl.gz",
      countryCode: "UG",
      pageSize: 500,
    }, { fetcher, now: fixedNow });

    const result = await client.search({ offset: 0, limit: 500 });
    expect(result.total).toBe(2);
    expect(result.records).toHaveLength(2);
    // Newest-first: lineB is processed first.
    expect(result.records[0]).toMatchObject({
      externalId: "ocds-rdvc92-B",
      title: "Rehabilitation of access roads",
      countryCode: "UG",
      procuringOrganization: "Busitema University",
      status: "open",
      currency: "UGX",
      amount: "300000000",
    });
    expect(result.records[1]).toMatchObject({
      externalId: "ocds-rdvc92-A",
      status: "awarded",
      currency: "UGX",
      amount: "17500000",
    });
    expect(result.nextOffset).toBeNull();
  });
});

describe("OCP bulk connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(await gzipBody(rawLine) as unknown as BodyInit),
    );
    const connector = createOcpBulkSourceConnector(approvedSource(), {
      publicationId: 130,
      fileName: "2025.jsonl.gz",
      countryCode: "UG",
      fetcher,
      now: fixedNow,
      pageSize: 500,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["ocds-rdvc92-B", "ocds-rdvc92-A"]);

    const retrieved = await connector.retrieve("ocds-rdvc92-B");
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({ externalId: "ocds-rdvc92-B", countryCode: "UG", status: "open" });

    const raw = await connector.toRawSourceRecord("ocds-rdvc92-B", retrieved, collectionRunId);
    expect(raw.externalRecordId).toBe("ocds-rdvc92-B");
  });
});