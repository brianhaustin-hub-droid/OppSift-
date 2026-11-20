import { describe, expect, it } from "vitest";
import { supportedCountries } from "../../../src/features/opportunities/country-registry";
import {
  getCountrySourceCoverage,
  getSourceCoverageSummary,
  sourceCatalog,
  worldBankProcurementRegistryCandidate,
} from "./source-catalog";

describe("source research catalog", () => {
  it("keeps unique candidate products separate from approved or operational sources", () => {
    const summary = getSourceCoverageSummary();
    const ids = sourceCatalog.map((source) => source.id);

    expect(sourceCatalog).toHaveLength(69);
    expect(new Set(ids).size).toBe(ids.length);
    expect(summary.sourceProducts).toBe(69);
    expect(summary.countryCandidateReferences).toBe(91);
    expect(summary.countriesWithCandidates).toBe(50);
    expect(summary.liveRetrievedSources).toBe(7);
    expect(summary.retrievedSamplesWithKnownCount).toBe(8);
    expect(summary.parsedSamples).toBe(0);
    expect(summary.storedRecords).toBe(0);
    expect(summary.permissionClearedSources).toBe(26);
    expect(summary.operationalConnectors).toBe(26);
    expect(
      sourceCatalog
        .filter((source) => source.stage === "operational")
        .map((source) => source.id)
        .sort(),
    ).toEqual([
      "bangkok-open-contract",
      "benin-armp-notices",
      "botswana-ppa-notices",
      "burkina-faso-armp-notices",
      "contracts-finder",
      "cote-ivoire-dgmp-appels",
      "cote-ivoire-dgmp-attributions",
      "gambia-ppag-notices",
      "ghana-ghaneps-ocds",
      "grants-gov",
      "indonesia-opentender-icw-ocds",
      "liberia-ppcc-ocds",
      "madagascar-dgcp-notices",
      "malawi-ppda-notices",
      "mauritius-ppo-notices",
      "mozambique-sisac-notices",
      "namibia-cpbn-notices",
      "niger-armp-notices",
      "nigeria-nocopo-ocds",
      "sam-gov-contract-opportunities",
      "senegal-marchespub-notices",
      "sierra-leone-nppa-bids",
      "south-africa-etenders-ocds",
      "ted-published-notices",
      "world-bank-procurement-notices",
      "zambia-zppa-ocds",
    ]);
    expect(sourceCatalog.every((source) => source.storedRecordCount === 0)).toBe(true);
  });

  it("matches the approved 50-country scope and candidate counts without claiming coverage", () => {
    const coverage = getCountrySourceCoverage(supportedCountries);
    const counts = Object.fromEntries(
      coverage.map((country) => [country.code, country.candidateSourceCount]),
    );

    expect(coverage).toHaveLength(50);
    expect(counts).toEqual({
      US: 5,
      GB: 2,
      CA: 1,
      IN: 2,
      SG: 1,
      JP: 2,
      KR: 2,
      MY: 1,
      ID: 3,
      PH: 1,
      TH: 3,
      VN: 1,
      AU: 3,
      DE: 3,
      FR: 3,
      NL: 4,
      IE: 3,
      IT: 4,
      ES: 3,
      SE: 2,
      PL: 3,
      DK: 3,
      BE: 3,
      KE: 2,
      UG: 3,
      TZ: 2,
      RW: 2,
      BI: 1,
      ET: 1,
      SS: 1,
      NG: 1,
      GH: 1,
      LR: 1,
      ZM: 1,
      ZA: 1,
      SL: 1,
      MU: 1,
      CI: 2,
      BJ: 1,
      SN: 1,
      GM: 1,
      NE: 1,
      BF: 1,
      BW: 1,
      NA: 1,
      MG: 1,
      MW: 1,
      MZ: 1,
      EG: 1,
      MA: 1,
    });
    expect(
      coverage.filter((country) => country.status === "candidate_research_only"),
    ).toHaveLength(50);
    expect(
      coverage.filter((country) => country.status === "not_researched"),
    ).toHaveLength(0);
  });

  it("uses only HTTPS links and labels bounded data retrieval distinctly from parsing", () => {
    for (const source of sourceCatalog) {
      expect(new URL(source.officialUrl).protocol).toBe("https:");
      if (source.documentationUrl) {
        expect(new URL(source.documentationUrl).protocol).toBe("https:");
      }
      if (source.lastSuccessfulRetrieval) {
        expect(source.parsedSampleCount).toBe(0);
        expect(source.storedRecordCount).toBe(0);
      }
    }

    expect(
      sourceCatalog.find((source) => source.id === "contracts-finder")?.sampleKind,
    ).toBe("award");
  });

  it("tracks the specifically requested sources without overstating verification", () => {
    const requiredSourceIds = [
      "ted-published-notices",
      "grants-gov",
      "ocp-data-registry",
      "kenya-ppip",
      "tanzania-nest",
      "philgeps",
      "etenders-ireland",
      "italy-anac-procurement-data",
      "germany-evergabe-online",
      "world-bank-procurement-notices",
      "aiib-procurement-opportunities",
    ];

    for (const id of requiredSourceIds) {
      expect(sourceCatalog.some((source) => source.id === id)).toBe(true);
    }

    for (const id of [
      "italy-anac-procurement-data",
      "germany-evergabe-online",
      "aiib-procurement-opportunities",
    ]) {
      const source = sourceCatalog.find((entry) => entry.id === id);
      expect(source?.stage).toBe("research_pending");
      expect(source?.lastSuccessfulRetrieval).toBeNull();
      expect(source?.connector).toBe("none");
    }
  });

  it("keeps the World Bank registry candidate global and active with attribution constraints", () => {
    expect(worldBankProcurementRegistryCandidate).toMatchObject({
      name: "World Bank Procurement Notices",
      publisher: "World Bank Group",
      apiOrFeedUrl: "https://search.worldbank.org/api/procnotices",
      coverageScope: "global",
      publicationFrequency: expect.stringContaining("Daily"),
      licensingStatus: "approved",
      termsStatus: "verified",
      reusePermissionStatus: "permitted",
      approvalStatus: "approved",
      activationStatus: "active",
      integrationStatus: "operational",
      rateLimitRequests: null,
      rateLimitWindowSeconds: null,
    });
    expect(sourceCatalog.find((source) => source.id === "world-bank-procurement-notices"))
      .toMatchObject({
        officialUrl: "https://search.worldbank.org/api/procnotices?format=json",
        stage: "operational",
        connector: "world_bank_procurement_api",
        countryCodes: [],
        storedRecordCount: 0,
      });
  });

  it("distinguishes operational API clients from unimplemented source leads", () => {
    expect(sourceCatalog.find((source) => source.id === "ted-published-notices"))
      .toMatchObject({ connector: "ted_api", stage: "operational" });
    expect(sourceCatalog.find((source) => source.id === "contracts-finder"))
      .toMatchObject({ connector: "contracts_finder_ocds_api", stage: "operational" });
    expect(sourceCatalog.find((source) => source.id === "sam-gov-contract-opportunities"))
      .toMatchObject({ connector: "sam_gov_api", stage: "operational" });
    expect(sourceCatalog.find((source) => source.id === "grants-gov"))
      .toMatchObject({ connector: "grants_gov_api", stage: "operational" });
  });
});
