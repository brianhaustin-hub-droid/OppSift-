import { describe, expect, it } from "vitest";
import { searchRequestSchema } from "./contracts";
import { buildOpportunitySearchQuery } from "./query-builder";

describe("opportunity search query", () => {
  it("builds parameterized full-text search with filters and bounded pagination", () => {
    const request = searchRequestSchema.parse({
      query: "solar construction",
      countries: ["KE", "UG"],
      categories: ["government", "grants"],
      minimumValue: 100,
      currency: "KES",
      page: 2,
      pageSize: 10,
      sort: "recent",
    });
    const query = buildOpportunitySearchQuery(request);

    expect(query.text).toContain("websearch_to_tsquery('simple'");
    expect(query.text).toContain("opportunity.country_code = ANY");
    expect(query.text).toContain("opportunity.category_code = ANY");
    expect(query.text).toContain("ORDER BY opportunity.published_at DESC");
    expect(query.values).toEqual([
      "solar construction",
      ["KE", "UG"],
      ["government", "grants"],
      "KES",
      100,
      10,
      10,
    ]);
  });

  it("keeps malicious-looking search text in bound parameters", () => {
    const phrase = "'; DROP TABLE public.opportunities; --";
    const query = buildOpportunitySearchQuery(
      searchRequestSchema.parse({ query: phrase }),
    );

    expect(query.text).not.toContain(phrase);
    expect(query.values[0]).toBe(phrase);
    expect(query.text).not.toContain("DROP TABLE");
  });

  it("uses deterministic exact-title and reference ranking before text relevance", () => {
    const query = buildOpportunitySearchQuery(
      searchRequestSchema.parse({ query: "RFQ-42", sort: "relevance" }),
    );

    expect(query.text).toContain("AS exact_title_match");
    expect(query.text).toContain("AS reference_match");
    expect(query.text).toContain(
      "ORDER BY exact_title_match DESC, reference_match DESC, relevance DESC",
    );
    expect(query.text).toContain("COUNT(*) OVER() AS total_count");
  });

  it("rejects invalid codes, date ranges, value ranges, and unbounded pages", () => {
    expect(() => searchRequestSchema.parse({ countries: ["ZZZ"] })).toThrow();
    expect(() =>
      searchRequestSchema.parse({
        publishedFrom: "2026-02-02",
        publishedTo: "2026-01-01",
      }),
    ).toThrow();
    expect(() =>
      searchRequestSchema.parse({ minimumValue: 10, maximumValue: 1 }),
    ).toThrow();
    expect(() =>
      searchRequestSchema.parse({ page: 100_001 }),
    ).toThrow();
  });

  it("orders values within currency instead of comparing different currencies", () => {
    const query = buildOpportunitySearchQuery(
      searchRequestSchema.parse({ sort: "value" }),
    );

    expect(query.text).toContain(
      "opportunity.original_currency_code ASC NULLS LAST, opportunity.published_amount DESC NULLS LAST",
    );
  });

  it("requires a currency for original-value range filtering", () => {
    expect(() =>
      searchRequestSchema.parse({ minimumValue: 5_000 }),
    ).toThrow(/original currency/);
  });
});
