import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { KkjApiClient, nextKkjDay } from "./kkj-api";
import { createKkjApiConnector } from "./api-client-source-connectors";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "c1a2d3e4-5f60-4a1b-8c2d-9e0f1a2b3c4d",
  name: "Japan Official Public Demand Portal (KKJ)",
  publisher: "Japan SME Agency (Kankouju Information Portal, kkj.go.jp)",
  website: "https://www.kkj.go.jp/",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://www.kkj.go.jp/api/",
  connectorIdentifier: "kkj-api",
  coverageScope: "country",
  coverageRegionCodes: [],
  apiOrFeedAvailable: true,
  opportunityCategories: ["government"],
  languages: ["ja"],
  publicationFrequency: "Hourly",
  expectedRefreshHours: 1,
  reliability: "verified",
  licensingStatus: "approved",
  termsStatus: "verified",
  permissionsEvidenceUrl: "https://www.kkj.go.jp/s/?tc=1",
  licenseUrl: "https://www.kkj.go.jp/s/?tc=1",
  termsUrl: "https://www.kkj.go.jp/s/?tc=1",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute the kkj.go.jp search API and link back to the portal.",
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

const resultXml = `<?xml version="1.0" encoding="utf-8" ?>
<Results>
<Version>1.0</Version>
<SearchResults>
<SearchHits>11</SearchHits>
<SearchResult>
<ResultId>1</ResultId>
<Key><![CDATA[b2theWFtYS9va2F5YW1hX3VfYWMvMjAyNi8yMDI2MTExOV8wMDE5Mgo=]]></Key>
<ExternalDocumentURI><![CDATA[https://example.ac.jp/notice.pdf]]></ExternalDocumentURI>
<ProjectName>外注検査 肺がんコンパクトパネルDx</ProjectName>
<Date>2026-11-10T19:05:33+09:00</Date>
<FileType>pdf</FileType>
<FileSize>551670</FileSize>
<LgCode>33</LgCode>
<PrefectureName>岡山県</PrefectureName>
<CityCode>331007</CityCode>
<CityName>岡山市</CityName>
<OrganizationName>国立大学法人岡山大学</OrganizationName>
<CftIssueDate>2026-11-19T00:00:00+09:00</CftIssueDate>
<ProjectDescription>入札公告の本文です。</ProjectDescription>
</SearchResult>
</SearchResults>
</Results>`;

const fixedNow = () => new Date("2026-11-13T00:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("KKJ XML client", () => {
  it("maps a search result to a parsed Japanese opportunity", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response(resultXml, { headers: { "content-type": "text/xml" } }),
    );
    const client = new KkjApiClient(approvedSource(), { fetcher, now: fixedNow });

    const result = await client.search({ lgCode: 33, day: "2026-11-12" });
    expect(result.totalHits).toBe(11);
    expect(result.records[0]).toMatchObject({
      externalId: "b2theWFtYS9va2F5YW1hX3VfYWMvMjAyNi8yMDI2MTExOV8wMDE5Mgo=",
      title: "外注検査 肺がんコンパクトパネルDx",
      countryCode: "JP",
      region: "岡山県",
      city: "岡山市",
      procuringOrganization: "国立大学法人岡山大学",
      publishedAt: "2026-11-10T10:05:33.000Z",
      closingAt: "2026-11-18T15:00:00.000Z",
      status: "open",
      sourceUrl: "https://www.kkj.go.jp/d/?D=b2theWFtYS9va2F5YW1hX3VfYWMvMjAyNi8yMDI2MTExOV8wMDE5Mgo%3D&L=ja",
      canonicalUrl: "https://example.ac.jp/notice.pdf",
    });
    const requestedUrl = String(fetcher.mock.calls[0][0]);
    expect(requestedUrl).toContain("LG_Code=33");
    expect(requestedUrl).toContain("CFT_Issue_Date=2026-11-12%2F2026-11-12");
    expect(requestedUrl).toContain("Count=100");

    // Single-digit prefecture codes must be zero-padded to match the API's
    // two-digit LgCode values.
    await client.search({ lgCode: 6, day: "2026-11-12" });
    expect(String(fetcher.mock.calls[1][0])).toContain("LG_Code=06");
  });

  it("rejects a bad prefecture code without fetching", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new KkjApiClient(approvedSource(), { fetcher });
    await expect(client.search({ lgCode: 48, day: "2026-11-12" })).rejects.toThrow("prefecture code");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces API errors from the XML error element", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response("<Results><Error>no searchword</Error></Results>", {
        headers: { "content-type": "text/xml" },
      }),
    );
    const client = new KkjApiClient(approvedSource(), { fetcher });
    await expect(client.search({ lgCode: 33, day: "2026-11-12" })).rejects.toThrow("no searchword");
  });
});

describe("KKJ date helpers", () => {
  it("advances the day window", () => {
    expect(nextKkjDay("2026-11-30")).toBe("2026-12-01");
    expect(nextKkjDay("2026-11-12")).toBe("2026-11-13");
  });
});

describe("KKJ connector bridge", () => {
  it("buffers, discovers, parses, and produces raw records", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response(resultXml, { headers: { "content-type": "text/xml" } }),
    );
    const connector = createKkjApiConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      sleep: async () => undefined,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual([
      "b2theWFtYS9va2F5YW1hX3VfYWMvMjAyNi8yMDI2MTExOV8wMDE5Mgo=",
    ]);

    const retrieved = await connector.retrieve(
      "b2theWFtYS9va2F5YW1hX3VfYWMvMjAyNi8yMDI2MTExOV8wMDE5Mgo=",
    );
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({ countryCode: "JP", status: "open" });

    const raw = await connector.toRawSourceRecord(
      "b2theWFtYS9va2F5YW1hX3VfYWMvMjAyNi8yMDI2MTExOV8wMDE5Mgo=",
      retrieved,
      collectionRunId,
    );
    expect(raw.externalRecordId).toBe("b2theWFtYS9va2F5YW1hX3VfYWMvMjAyNi8yMDI2MTExOV8wMDE5Mgo=");
  });

  it("walks prefectures across pages and keeps the cursor advancing", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      new Response(resultXml, { headers: { "content-type": "text/xml" } }),
    );
    const connector = createKkjApiConnector(approvedSource(), {
      fetcher,
      now: fixedNow,
      sleep: async () => undefined,
      backfillDays: 21,
      maximumPages: 10,
    });

    await connector.prepare?.(collectionRunId);
    expect(fetcher).toHaveBeenCalledTimes(10);

    const storedCursor = connector.nextCursor?.();
    expect(storedCursor).not.toBeNull();
    const decoded = JSON.parse(decodeURIComponent(storedCursor as string));
    expect(decoded.kind).toBe("kkj");
    expect(decoded.from).toBe("2026-10-23");
    expect(decoded.position).toBe(11);
    expect(decoded.to).toBe("2026-11-12");
  });
});
