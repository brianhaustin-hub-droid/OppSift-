import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import {
  assessSourceExecution,
  createContractsFinderSourceConnector,
  createGrantsGovSourceConnector,
  createSamGovSourceConnector,
  createTedSourceConnector,
} from "./api-client-source-connectors";
import { getSourceExecutionProfiles } from "../worker/src/profiles";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "c2e3057b-a6e3-48c4-80a3-3dc2cbefc2b9",
  name: "Test API source",
  publisher: "Test publisher",
  website: "https://source.example.test",
  sourceCategory: "government",
  sourceType: "api",
  accessMethod: "api",
  apiOrFeedUrl: "https://api.source.example.test/search",
  connectorIdentifier: "test-source",
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
  permissionsEvidenceUrl: "https://source.example.test/permissions",
  licenseUrl: "https://source.example.test/license",
  termsUrl: "https://source.example.test/terms",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribution required.",
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
  ...overrides,
});

const fixedNow = () => new Date("2026-11-11T12:00:00.000Z");
const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("API client source connector bridge", () => {
  it("buffers TED source evidence, parses notices, and retains bounded continuation state", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      notices: [{
        "publication-number": "779190-2026",
        "publication-date": "2026-11-10T12:00:00Z",
        "notice-title": { eng: "Published test notice" },
        "organisation-country-buyer": "DE",
        links: { html: { eng: "https://ted.europa.eu/en/notice/779190-2026" } },
      }],
      totalNoticeCount: 2,
    }));
    const connector = createTedSourceConnector(approvedSource({
      connectorIdentifier: "ted-published-notices",
    }), {
      fetcher,
      now: fixedNow,
      pageSize: 1,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["779190-2026"]);
    expect(connector.nextCursor?.()).toBeTruthy();
    const retrieved = await connector.retrieve("779190-2026");
    expect(await connector.parse(retrieved)).toMatchObject({
      externalId: "779190-2026",
      title: "Published test notice",
      countryCode: "DE",
      status: "unknown",
    });
    const raw = await connector.toRawSourceRecord("779190-2026", retrieved, collectionRunId);
    expect(raw.payloadJson).toMatchObject({
      "publication-number": "779190-2026",
    });
    expect(raw.sourceUrl).toContain("ted.europa.eu");
  });

  it("sends Contracts Finder sanitized evidence through the raw-record contract", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      license: "http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
      releases: [{
        id: "cf-notice-1",
        ocid: "ocds-test-1",
        date: "2026-11-10T12:00:00Z",
        tag: ["tender"],
        tender: {
          id: "CF-1",
          title: "Supply of equipment",
          status: "active",
          mainProcurementCategory: "goods",
          tenderPeriod: { endDate: "2026-12-01T12:00:00Z" },
        },
        parties: [{ contactPoint: { name: "Private contact" } }],
      }],
      links: {},
    }));
    const connector = createContractsFinderSourceConnector(approvedSource({
      id: "14aee40e-b755-4fd8-86a3-b7d599bc150b",
      name: "Contracts Finder",
      publisher: "UK Government",
      website: "https://www.contractsfinder.service.gov.uk",
      apiOrFeedUrl: "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search",
      connectorIdentifier: "contracts-finder-ocds",
    }), {
      fetcher,
      now: fixedNow,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["cf-notice-1"]);
    const retrieved = await connector.retrieve("cf-notice-1");
    const raw = await connector.toRawSourceRecord("cf-notice-1", retrieved, collectionRunId);
    expect(JSON.stringify(raw.payloadJson)).not.toContain("Private contact");
    expect(await connector.parse(retrieved)).toMatchObject({
      externalId: "cf-notice-1",
      countryCode: "GB",
      sourceCategoryTerm: "goods",
    });
  });

  it("passes the server-provided SAM.gov key only to the API client and resumes by offset", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      totalRecords: 2,
      limit: 1,
      offset: 0,
      opportunitiesData: [{
        noticeId: "sam-notice-1",
        title: "Facility maintenance",
        type: "Solicitation",
      }],
    }));
    const connector = createSamGovSourceConnector(approvedSource({
      id: "2f0c496e-8e51-4db4-b6a6-64064d65d001",
      name: "SAM.gov Contract Opportunities",
      publisher: "U.S. General Services Administration",
      website: "https://sam.gov",
      apiOrFeedUrl: "https://api.sam.gov/opportunities/v2/search",
      connectorIdentifier: "sam-gov-opportunities",
    }), "test-only-api-key", {
      fetcher,
      now: fixedNow,
      pageSize: 1,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["sam-notice-1"]);
    expect(connector.nextCursor?.()).toBeTruthy();
    expect(new URL(String(fetcher.mock.calls[0]?.[0])).searchParams.get("api_key"))
      .toBe("test-only-api-key");
    const retrieved = await connector.retrieve("sam-notice-1");
    const raw = await connector.toRawSourceRecord("sam-notice-1", retrieved, collectionRunId);
    expect(raw.payloadJson).toMatchObject({ noticeId: "sam-notice-1" });
    expect(await connector.parse(retrieved)).toMatchObject({
      externalId: "sam-notice-1",
      countryCode: "US",
      status: "unknown",
    });
  });

  it("pages the anonymous Grants.gov Search API without any credential", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      errorcode: 0,
      msg: "Webservice Succeeds",
      data: {
        hitCount: 2,
        startRecord: 0,
        oppHits: [{
          id: "364244",
          number: "DHS-27-061-COE-SUPP",
          title: "DHS S&amp;T Center of Excellence Applications",
          agencyCode: "DHS-OPO",
          agency: "Office of Procurement Operations",
          openDate: "11/09/2026",
          closeDate: "05/21/2027",
          oppStatus: "posted",
          docType: "synopsis",
          cfdaList: ["97.061"],
        }],
      },
    }));
    const connector = createGrantsGovSourceConnector(approvedSource({
      id: "6b0f5a3e-3f3b-4a49-8a63-2c2a9a4e51c7",
      name: "Grants.gov Search",
      publisher: "Grants.gov",
      website: "https://www.grants.gov",
      apiOrFeedUrl: "https://api.grants.gov/v1/api/search2",
      connectorIdentifier: "grants-gov-search",
      sourceCategory: "funding",
      opportunityCategories: ["grants"],
    }), {
      fetcher,
      now: fixedNow,
      pageSize: 1,
      maximumPages: 1,
    });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["364244"]);
    expect(connector.nextCursor?.()).toBeTruthy();

    const [requestUrl, requestInit] = fetcher.mock.calls[0] ?? [];
    expect(String(requestUrl)).toBe("https://api.grants.gov/v1/api/search2");
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      rows: 1,
      startRecordNum: 0,
      oppStatuses: "posted",
    });
    expect(requestInit?.headers).toMatchObject({ "Content-Type": "application/json" });

    const retrieved = await connector.retrieve("364244");
    expect(await connector.parse(retrieved)).toMatchObject({
      externalId: "364244",
      title: "DHS S&T Center of Excellence Applications",
      countryCode: "US",
      status: "open",
      sourceUrl: "https://www.grants.gov/search-results-detail/364244",
      publishedAt: "2026-11-09T00:00:00.000Z",
      closingAt: "2027-05-21T00:00:00.000Z",
    });
  });

  it("treats approval, activation and license labels as informational", () => {
    const source = approvedSource({
      activationStatus: "inactive",
      approvalStatus: "unreviewed",
      integrationStatus: "in_development",
      licensingStatus: "review_required",
      termsStatus: "review_required",
      reusePermissionStatus: "unknown",
    });

    expect(assessSourceExecution(source)).toEqual({ mode: "collection", blockers: [] });
  });

  it("uses investigation mode when the SAM.gov secret is absent", async () => {
    const source = approvedSource({
      id: "2f0c496e-8e51-4db4-b6a6-64064d65d001",
      name: "SAM.gov Contract Opportunities",
      publisher: "U.S. General Services Administration",
      website: "https://sam.gov",
      apiOrFeedUrl: "https://api.sam.gov/opportunities/v2/search",
      connectorIdentifier: "sam-gov-opportunities",
    });
    const fetcher = vi.fn<typeof fetch>();
    const connector = createSamGovSourceConnector(source, undefined, { fetcher });

    await expect(connector.prepare?.(collectionRunId))
      .rejects.toThrow("SAM.gov API key is not configured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a continuation cursor from a different source connector", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const connector = createTedSourceConnector(approvedSource({
      connectorIdentifier: "ted-published-notices",
    }), {
      fetcher,
      currentCursor: encodeURIComponent(JSON.stringify({
        kind: "sam_gov",
        from: "2026-11-04",
        to: "2026-11-11",
        position: 20,
      })),
    });

    await expect(connector.prepare?.(collectionRunId))
      .rejects.toThrow("invalid for this connector");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("registers all implemented native API clients in the Worker dispatcher", () => {
    const profiles = getSourceExecutionProfiles("test-only-api-key");
    expect([...profiles.keys()]).toEqual(expect.arrayContaining([
      "world-bank-procurement-notices",
      "austender-ocds",
      "boamp-opendata",
      "tenderned-api",
      "nest-ocds",
      "ocp-bulk-uganda",
      "ocp-bulk-nigeria",
      "ocp-bulk-zambia",
      "ocp-bulk-ghana",
      "ocp-bulk-liberia",
      "ocp-bulk-south-africa",
      "ocp-bulk-thailand-bma",
      "ocp-bulk-indonesia",
      "canadabuys-api",
      "kkj-api",
      "html-philippines",
      "html-india",
      "html-south-sudan",
      "html-sierra-leone",
      "html-mauritius",
      "html-ci-appel",
      "html-ci-attribution",
      "html-benin-armp-notices",
      "html-senegal-marchespub-notices",
      "html-gambia-ppag-notices",
      "html-niger-armp-notices",
      "html-burkina-faso-armp-notices",
      "html-botswana-ppa-notices",
      "html-namibia-cpbn-notices",
      "html-madagascar-dgcp-notices",
      "html-burundi-armp-notices",
      "html-malawi-ppda-notices",
      "html-mozambique-sisac-notices",
      "kenya-ppip-api",
      "ted-published-notices",
      "contracts-finder-ocds",
      "sam-gov-opportunities",
      "grants-gov-search",
    ]));
    expect([...profiles.values()].every((profile) => profile.kind === "native")).toBe(true);
  });
});
