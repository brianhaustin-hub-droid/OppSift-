import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { createUgandaEgpSourceConnector } from "./uganda-egp";

function approvedSource(overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord {
  return {
    id: "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
    name: "EGP Uganda - Bid Notices",
    publisher: "PPDA Uganda",
    website: "https://egpuganda.go.ug/",
    sourceCategory: "government",
    sourceType: "portal",
    accessMethod: "permitted_web",
    apiOrFeedUrl: "https://egpuganda.go.ug/",
    connectorIdentifier: "html-uganda-egp-notices",
    coverageScope: "country",
    coverageRegionCodes: [],
    apiOrFeedAvailable: true,
    opportunityCategories: ["government"],
    languages: ["en"],
    publicationFrequency: "Daily",
    expectedRefreshHours: 12,
    reliability: "verified",
    licensingStatus: "approved",
    termsStatus: "verified",
    permissionsEvidenceUrl: "https://egpuganda.go.ug/",
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

const listingHtml = `<html><body>
  <table><tbody>
    <tr><td><a href="/index/427579196_egp" class="font-weight-semibold">Works</a></td>
        <td><a href="/index/427579196_egp"><strong>FEASIBILITY STUDY AND ENGINEERING DESIGNS FOR...</strong></a></td>
        <td>Dec-04 2099</td></tr>
    <tr><td><a href="/index/424139048_egp" class="font-weight-semibold">Supplies</a></td>
        <td><a href="/index/424139048_egp"><strong>Supply of Four (04) Double Cabin Pickup Motor...</strong></a></td>
        <td>Jan-15 2020</td></tr>
    <tr><td><a href="/index/427579196_egp" class="font-weight-semibold">Works</a></td>
        <td><a href="/index/427579196_egp"><strong>duplicate row</strong></a></td>
        <td>Dec-04 2099</td></tr>
  </tbody></table>
</body></html>`;

function detailHtml(reference: string, subject: string, buyer: string, heading: string) {
  return `<html><body>
    <h2>${heading}</h2>
    <table class="table table-bordered"><tbody>
      <tr><th>No #</th><th>Procurement Ref Number</th><th>Subject of Procurement</th></tr>
      <tr><td>1</td><td>${reference}</td><td>${subject}</td></tr>
    </tbody></table>
    <p>${buyer} has allocated funds to be used for the above indicated.</p>
  </body></html>`;
}

describe("Uganda e-GP connector", () => {
  it("follows each notice to build full records and dedupes repeated rows", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url === "https://egpuganda.go.ug/") return new Response(listingHtml);
      if (url.endsWith("/427579196_egp")) {
        return new Response(detailHtml(
          "UCAA/WRKS/2025-2026/00035",
          "FEASIBILITY STUDY AND ENGINEERING DESIGNS FOR THE UPGRADE AND EXPANSION OF ARUA AIRPORT",
          "Uganda Civil Aviation Authority",
          "Request for Quotation Notice",
        ));
      }
      if (url.endsWith("/424139048_egp")) {
        return new Response(detailHtml(
          "MOWT/SUPLS/2025-2026/00042",
          "Supply of Four (04) Double Cabin Pickup Motor Vehicles",
          "Ministry of Works and Transport",
          "Invitation for Bid",
        ));
      }
      return new Response("not found", { status: 404 });
    });

    const connector = createUgandaEgpSourceConnector(approvedSource(), { fetcher });
    await connector.prepare?.("run-1");

    const discovered = await connector.discover();
    expect(discovered).toEqual(["ug-egp-427579196", "ug-egp-424139048"]);

    const first = await connector.retrieve("ug-egp-427579196") as {
      payload: { category: string; referenceNumber: string };
      parsed: {
        title: string;
        referenceNumber: string;
        procuringOrganization: string;
        closingAt: string;
        status: string;
        sourceCategoryTerm: string;
      };
    };
    expect(first.payload).toMatchObject({
      category: "Works",
      referenceNumber: "UCAA/WRKS/2025-2026/00035",
    });
    expect(first.parsed).toMatchObject({
      title: "FEASIBILITY STUDY AND ENGINEERING DESIGNS FOR THE UPGRADE AND EXPANSION OF ARUA AIRPORT",
      referenceNumber: "UCAA/WRKS/2025-2026/00035",
      procuringOrganization: "Uganda Civil Aviation Authority",
      closingAt: "2099-12-04T00:00:00.000Z",
      status: "open",
      sourceCategoryTerm: "Request for Quotation Notice",
    });

    const second = await connector.parse(await connector.retrieve("ug-egp-424139048"));
    expect(second).toMatchObject({ countryCode: "UG", status: "closed" });
  });

  it("still returns a listing row when its notice page cannot be read", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      if (String(input) === "https://egpuganda.go.ug/") return new Response(listingHtml);
      return new Response("blocked", { status: 503 });
    });
    const connector = createUgandaEgpSourceConnector(approvedSource(), { fetcher });
    await connector.prepare?.("run-2");
    const discovered = await connector.discover();
    expect(discovered).toHaveLength(2);
    const record = await connector.retrieve("ug-egp-424139048") as { parsed: { title: string } };
    expect(record.parsed.title).toBe("Supply of Four (04) Double Cabin Pickup Motor");
  });
});
