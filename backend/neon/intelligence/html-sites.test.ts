import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { createHtmlListSourceConnector } from "./html-list-connector";
import { burundiSite, malawiSite, sierraLeoneAwardsSite, sierraLeoneSite } from "./html-sites";

function approvedSource(connectorIdentifier: string, overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord {
  return {
    id: "cf7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c",
    name: "Fixture source",
    publisher: "Fixture publisher",
    website: "https://procurement.example.test/",
    sourceCategory: "government",
    sourceType: "portal",
    accessMethod: "permitted_web",
    apiOrFeedUrl: "https://procurement.example.test/",
    connectorIdentifier,
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
    permissionsEvidenceUrl: "https://procurement.example.test/",
    licenseUrl: null,
    termsUrl: null,
    reusePermissionStatus: "permitted",
    attributionRequirements: null,
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
  };
}

function tableRow(cells: string[], link?: string): string {
  const tds = cells.map((cell) => `<td> ${cell}</td>`).join("");
  const attachment = link
    ? `<td><a href="${link}">View and Download</a></td>`
    : "<td></td>";
  return `<tr>${tds}${attachment}</tr>`;
}

describe("Sierra Leone NPPA listing", () => {
  it("keeps one record per listing row even when descriptions repeat", async () => {
    const repeated = Array.from({ length: 5 }, (_, index) => tableRow(
      ["MINISTRY OF FINANCE (MoF)", "02-11-2026", "01-12-2026", "PROCUREMENT OF GOODS AND SERVICES"],
      `https://nppa.gov.sl/wp-content/uploads/2026/11/IFB-${index + 1}.pdf`,
    ));
    const distinct = Array.from({ length: 23 }, (_, index) => tableRow(
      [`BUYER ${index}`, "03-11-2026", "05-12-2026", `SUPPLY OF GOODS AND SERVICES LOT ${index}`],
      `https://nppa.gov.sl/wp-content/uploads/2026/11/BID-${index}.pdf`,
    ));
    const html = `<html><body><table id="tablepress-1"><tbody>
      <tr><th>Bidding Organization</th><th>Date Posted</th><th>Expiration Date</th><th>Description of Bidding</th><th>Download Bid</th></tr>
      ${[...repeated, ...distinct].join("\n")}
    </tbody></table></body></html>`;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(html));
    const connector = createHtmlListSourceConnector(
      approvedSource("html-sierra-leone"),
      sierraLeoneSite,
      { fetcher },
    );

    await connector.prepare?.("run-1");
    const discovered = await connector.discover();
    expect(discovered).toHaveLength(28);
    expect(new Set(discovered).size).toBe(28);

    const payloads = await Promise.all(discovered.map((id) => connector.retrieve(id))) as Array<{
      payload: { organization: string; postedText: string; expirationText: string };
    }>;
    expect(payloads).toHaveLength(28);
    expect(payloads[0]?.payload).toMatchObject({
      organization: "MINISTRY OF FINANCE (MoF)",
      postedText: "02-11-2026",
      expirationText: "01-12-2026",
    });
  });
});

describe("Sierra Leone NPPA contract awards", () => {
  it("extracts award rows from every register table", async () => {
    const awardRow = (cells: string[]) => `<tr>${cells.map((cell) => `<td> ${cell}</td>`).join("")}</tr>`;
    const html = `<html><body>
      <table class="wpDataTable" id="table_1"><tbody>
        <tr><th>SN</th><th>ENTITY</th><th>CONTRACT DESCRIPTION</th></tr>
        ${awardRow(["1", "National Electoral Commission SL", "Supply and delivery of Laptop Computers and Printers", "NEC/DIT/NCB/2021/0017", "Le 752,100,000", "GoSL", "Office World Group (SL) Limited", "18 Bathurst Street, Freetown", "David Stanley Coker", "19 January 2022", "NCB", ""])}
      </tbody></table>
      <table class="wpDataTable" id="table_5"><tbody>
        ${awardRow(["1", "Accountant General's Department", "Procurement of Office Furniture", "MoF/GoSL/AGD/NCB/2021/008", "Le 300,000,000.00", "GoSL", "A.A Enterprises Limited", "12 Howe Street, Freetown", "Hassan Fakih", "1 January 2022", "NCB", "Framework Contract"])}
      </tbody></table>
    </body></html>`;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(html));
    const connector = createHtmlListSourceConnector(
      approvedSource("html-sierra-leone-awards"),
      sierraLeoneAwardsSite,
      { fetcher },
    );

    await connector.prepare?.("run-4");
    const discovered = await connector.discover();
    expect(discovered).toHaveLength(2);
    expect(discovered.every((id) => id.startsWith("sl-nppa-award-"))).toBe(true);
    const parsed = await connector.parse(await connector.retrieve(discovered[0]));
    expect(parsed).toMatchObject({
      countryCode: "SL",
      status: "awarded",
      sourceCategoryTerm: "Contract Award",
      procuringOrganization: "National Electoral Commission SL",
      referenceNumber: "NEC/DIT/NCB/2021/0017",
      publishedAt: "2022-01-19T00:00:00.000Z",
    });
  });
});

describe("Burundi ARMP listing", () => {
  it("extracts notice cards captured from armp.gov.bi", async () => {
    const html = readFileSync("backend/neon/intelligence/fixtures/burundi-armp.html", "utf8");
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(html));
    const connector = createHtmlListSourceConnector(
      approvedSource("html-burundi-armp-notices"),
      burundiSite,
      { fetcher },
    );

    await connector.prepare?.("run-3");
    const discovered = await connector.discover();
    expect(discovered.length).toBeGreaterThan(0);
    expect(discovered.every((id) => id.startsWith("bi-armp-"))).toBe(true);
    const parsed = await connector.parse(await connector.retrieve(discovered[0]));
    expect(parsed).toMatchObject({ countryCode: "BI", sourceCategoryTerm: "Avis d'appel d'offres" });
  });
});

describe("Malawi PPDA listing", () => {
  it("extracts the procurement notices table with reference numbers and deadlines", async () => {
    const rows = [
      tableRow(
        ["SUPPLY AND DELIVERY OF STATIONERY", "DEPARTMENT OF PROCUREMENT AND SUPPLIES", "NCB 090/IPDC/DPSS/G/2026-27/02", "2026-11-21", "2026-12-11"],
        "https://ppda.mw/storage/documents/opentenders/Stationery.pdf",
      ),
      tableRow(
        ["SUPPLY OF MEDICINE AND SURGICALS", "Mzuzu Central Hospital", "031/MzCH/2026-27/88a", "2026-11-21", "2026-11-30"],
        "https://ppda.mw/storage/documents/opentenders/Medicine.pdf",
      ),
    ];
    const html = `<html><body><table id="tenderstable"><tbody>
      <tr><th>Title</th><th>Institution</th><th>Reference No.</th><th>Publish Date</th><th>Closing Date</th><th>Attachment</th></tr>
      ${rows.join("\n")}
    </tbody></table></body></html>`;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(html));
    const connector = createHtmlListSourceConnector(
      approvedSource("html-malawi-ppda-notices"),
      malawiSite,
      { fetcher },
    );

    await connector.prepare?.("run-2");
    const discovered = await connector.discover();
    expect(discovered).toEqual([
      "mw-ppda-ncb-090-ipdc-dpss-g-2026-27-02",
      "mw-ppda-031-mzch-2026-27-88a",
    ]);
    const payload = await connector.retrieve(discovered[0]) as {
      payload: { institution: string; closingText: string };
      parsed: { closingAt: string | null; procuringOrganization: string | null };
    };
    expect(payload.payload).toMatchObject({
      institution: "DEPARTMENT OF PROCUREMENT AND SUPPLIES",
      closingText: "2026-12-11",
    });
    expect(payload.parsed.procuringOrganization).toBe("DEPARTMENT OF PROCUREMENT AND SUPPLIES");
    expect(payload.parsed.closingAt).toBe("2026-12-11T00:00:00.000Z");
  });
});
