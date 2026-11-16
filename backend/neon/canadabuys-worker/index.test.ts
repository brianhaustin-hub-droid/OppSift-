import { describe, expect, it } from "vitest";
import { normalizeRecord } from "./index";

describe("CanadaBuys feed normalization", () => {
  it("maps an OCDS tender into the normalized opportunity shape", () => {
    const record = normalizeRecord({
      id: "release-123",
      ocid: "ocds-abc-123",
      date: "2026-10-10",
      buyer: { name: "Public Services and Procurement Canada" },
      tender: {
        id: "solicitation-123",
        title: "Bridge maintenance",
        description: "<p>Repair work &amp; inspection.</p>",
        tenderPeriod: { endDate: "2026-11-30T17:00:00-05:00" },
        value: { amount: "125000.50", currency: "CAD" },
      },
      url: "https://canadabuys.canada.ca/en/tender-opportunities/123",
    });

    expect(record).toMatchObject({
      kind: "opportunity",
      type: "tender",
      category: "government",
      externalId: "release-123",
      title: "Bridge maintenance",
      description: "Repair work & inspection.",
      issuingOrganization: "Public Services and Procurement Canada",
      publishedAt: "2026-10-10T00:00:00.000Z",
      deadline: "2026-11-30T22:00:00.000Z",
      amount: "125000.50",
      currency: "CAD",
      originalUrl: "https://canadabuys.canada.ca/en/tender-opportunities/123",
    });
  });

  it("rejects records without required identity and provenance", () => {
    expect(() => normalizeRecord({
      id: "missing-url",
      title: "Tender",
      buyer: { name: "Government of Canada" },
    })).toThrow("ID, title, issuing organization, and HTTPS source URL");
  });

  it("rejects invalid calendar dates and non-ISO currency values", () => {
    expect(() => normalizeRecord({
      id: "bad-date",
      title: "Tender",
      buyer: { name: "Government of Canada" },
      date: "2026-02-30",
      url: "https://canadabuys.canada.ca/tender/1",
    })).toThrow("valid calendar date");

    expect(() => normalizeRecord({
      id: "bad-currency",
      title: "Tender",
      buyer: { name: "Government of Canada" },
      value: { amount: "100", currency: "CAD$" },
      url: "https://canadabuys.canada.ca/tender/1",
    })).toThrow("non-ISO currency code");
  });
});
