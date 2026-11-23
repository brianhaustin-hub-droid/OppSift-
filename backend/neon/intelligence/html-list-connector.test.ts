import { describe, expect, it, vi } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import { createHtmlListSourceConnector } from "./html-list-connector";
import { southSudanSite } from "./html-sites";
import { indiaSite } from "./html-sites";
import { philippinesSite } from "./html-sites";

const approvedSource = (overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord => ({
  id: "cf7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c",
  name: "PPDAA Tender Portal - Current Bids",
  publisher: "Public Procurement and Disposal of Assets Authority (PPDAA) - South Sudan",
  website: "https://tenderportal.ppdaa.gov.ss/",
  sourceCategory: "government",
  sourceType: "portal",
  accessMethod: "api",
  apiOrFeedUrl: "https://tenderportal.ppdaa.gov.ss/current-bids",
  connectorIdentifier: "html-south-sudan",
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
  permissionsEvidenceUrl: "https://tenderportal.ppdaa.gov.ss/current-bids",
  licenseUrl: "https://tenderportal.ppdaa.gov.ss/",
  termsUrl: "https://tenderportal.ppdaa.gov.ss/",
  reusePermissionStatus: "permitted",
  attributionRequirements: "Attribute the PPDAA South Sudan tender portal.",
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

const listHtml = `<html><body>
<div class="listing"><div class="row g-4">
  <div class="col-md-12">
    <a href="/bid/486/construction-flood-control-structures-bor-south-and-twic-east" class="card-to with-inset">
      <div class="sec-txt">
        <div class="cat-wrap"><span></span></div>
        <h4>Construction of Flood Control Structures in Bor South and Twic East Counties in Jonglei State</h4>
        <div class="when my-3">
          <small>Submission Deadline</small>
          <span><time datetime="2026-11-27T07:00:00Z">Friday, November 27, 2026 - 10:00</time></span>
        </div>
      </div>
    </a>
  </div>
</div></div>
</body></html>`;

const collectionRunId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

describe("South Sudan HTML-list connector", () => {
  it("extracts bids from the current-bids listing", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(listHtml, { headers: { "content-type": "text/html" } }),
    );
    const connector = createHtmlListSourceConnector(approvedSource(), southSudanSite, { fetcher });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["486"]);

    const retrieved = await connector.retrieve("486");
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({
      externalId: "486",
      countryCode: "SS",
      sourceCategoryTerm: "Invitation for Bids",
      closingAt: "2026-11-27T07:00:00.000Z",
      sourceUrl: "https://tenderportal.ppdaa.gov.ss/bid/486/construction-flood-control-structures-bor-south-and-twic-east",
    });

    const raw = await connector.toRawSourceRecord("486", retrieved, collectionRunId);
    expect(raw.externalRecordId).toBe("486");
  });

  it("fails cleanly when the listing has no bid items", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("<html><body><p>No bids.</p></body></html>"),
    );
    const connector = createHtmlListSourceConnector(approvedSource(), southSudanSite, { fetcher });
    await expect(connector.prepare?.(collectionRunId)).rejects.toThrow("no matching items");
  });
});

describe("Philippines PhilGEPS HTML-list connector", () => {
  it("extracts bid notices from the bulletin board table", async () => {
    const html = `<html><body>
      <table class="table table-bordered">
        <thead><tr><th>Bid Notice Reference Number</th><th>Notice Title</th><th>Mode of Procurement</th><th>Classification</th><th>Agency Name</th><th>Publish Date</th><th>Closing date</th></tr></thead>
        <tr>
          <td data-label="Bid Notice Reference Number"><a href="https://philgeps.gov.ph/Indexes/viewLiveTenderDetails/134866">134866</a></td>
          <td data-label="Control Number"><span class="wrapped-long-string">PROCUREMENT OF FULLY AUTOMATED BLOOD CHEMISTRY ANALYZER</span></td>
          <td><span>Competitive Bidding (Public Bidding) </span></td>
          <td><span>Goods </span></td>
          <td><span>MUNICIPALITY OF MAHAPLAG LEYTE </span></td>
          <td><span>13-Nov-2026 </span></td>
          <td><span>02-Dec-2026 10:00 AM</span></td>
        </tr>
      </table></body></html>`;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(html, { headers: { "content-type": "text/html" } }),
    );
    const connector = createHtmlListSourceConnector(approvedSource(), philippinesSite, { fetcher });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["philgeps-134866"]);

    const retrieved = await connector.retrieve("philgeps-134866");
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({
      externalId: "philgeps-134866",
      title: "PROCUREMENT OF FULLY AUTOMATED BLOOD CHEMISTRY ANALYZER",
      countryCode: "PH",
      referenceNumber: "134866",
      procuringOrganization: "MUNICIPALITY OF MAHAPLAG LEYTE",
      publishedAt: "2026-11-13T00:00:00.000Z",
      closingAt: "2026-12-02T02:00:00.000Z",
      status: "open",
      sourceUrl: "https://philgeps.gov.ph/Indexes/viewLiveTenderDetails/134866",
    });
  });
});

describe("India CPPP HTML-list connector", () => {
  it("extracts latest tenders from the homepage table", async () => {
    const html = `<html><body><table class="list_table">
      <tr class="list_header"><td>Tender Title</td><td>Reference No</td><td>Closing Date</td><td>Bid Opening Date</td></tr>
      <tr class="even" id="informal">
        <td><a id="DirectLink" class="link2" href="/epublish/app?component=%24DirectLink&amp;page=Home&amp;service=direct&amp;session=T&amp;sp=SVWZaXpo2tWssMAr2cYYT7A%3D%3D">1. Enquiry for Procurement of copper cable</a></td>
        <td>PE-373</td>
        <td>17-Nov-2020 03:30 PM</td>
        <td>17-Nov-2020 03:30 PM</td>
      </tr>
    </table></body></html>`;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(html, { headers: { "content-type": "text/html" } }),
    );
    const connector = createHtmlListSourceConnector(approvedSource(), indiaSite, { fetcher });

    await connector.prepare?.(collectionRunId);
    expect(await connector.discover()).toEqual(["cppp-PE-373"]);

    const retrieved = await connector.retrieve("cppp-PE-373");
    const parsed = await connector.parse(retrieved);
    expect(parsed).toMatchObject({
      externalId: "cppp-PE-373",
      title: "Enquiry for Procurement of copper cable",
      countryCode: "IN",
      referenceNumber: "PE-373",
      closingAt: "2020-11-17T10:00:00.000Z",
      status: "closed",
      sourceUrl: "https://eprocure.gov.in/epublish/app?component=%24DirectLink&page=Home&service=direct&session=T&sp=SVWZaXpo2tWssMAr2cYYT7A%3D%3D",
    });
  });
});