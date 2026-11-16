import { describe, expect, it } from "vitest";
import {
  importCsvManually,
  parseStructuredXml,
} from "./adapters";
import {
  mapCsvRowsToOpportunities,
  parseCsv,
  parseJsonFeed,
  parseSyndicationFeed,
} from "./format-parsers";

const csvMapping = {
  externalId: "ID",
  title: "Title",
  sourceCategoryTerm: "Type",
  countryCode: "Country",
  publisher: "Publisher",
  sourceUrl: "URL",
  sourceDeadlineText: "Deadline",
};

describe("source format parsers", () => {
  it("parses quoted CSV, escaped quotes, CRLF, and row-level validation errors", () => {
    const csv = [
      "ID,Title,Type,Country,Publisher,URL,Deadline",
      'one,"Supply, install, and maintain ""solar"" panels",Tender,GB,Issuer,https://source.example.invalid/1,31/12/2026',
      "two,,Tender,GB,Issuer,https://source.example.invalid/2,",
    ].join("\r\n");
    const parsed = parseCsv(csv);
    expect(parsed.success).toBe(true);
    const mapped = mapCsvRowsToOpportunities(parsed, csvMapping);
    expect(mapped.records).toHaveLength(1);
    expect(mapped.records[0]?.title).toBe('Supply, install, and maintain "solar" panels');
    expect(mapped.records[0]?.sourceDeadlineText).toBe("31/12/2026");
    expect(mapped.records[0]?.closingAt).toBeNull();
    expect(mapped.rejected).toHaveLength(1);
  });

  it("rejects malformed or oversized CSV and duplicate headers", () => {
    expect(parseCsv('A,A\n1,2').success).toBe(false);
    expect(parseCsv('A,B\n"unterminated,2').errors).toContain(
      "CSV document has an unterminated quoted field.",
    );
    expect(parseCsv("A\n" + "x".repeat(2_000_001)).errors).toContain(
      "Source document exceeds the configured parser size limit.",
    );
  });

  it("retains imports with row-level errors for operator review", () => {
    const result = importCsvManually(
      "ID,Title,Type,Country,Publisher,URL\n1,,Tender,GB,Issuer,https://source.example.invalid/1",
      csvMapping,
    );
    expect(result.records).toHaveLength(0);
    expect(result.rejected[0]?.rowNumber).toBe(2);
    expect(result.rejected[0]?.original.Title).toBe("");
  });

  it("parses RSS and Atom IDs, links, publication dates, and text without executing markup", () => {
    const rss = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><guid>tender-1</guid><title><![CDATA[Road &amp; bridge works]]></title>
      <link>https://source.example.invalid/tender/1</link>
      <pubDate>Tue, 03 Nov 2026 10:00:00 GMT</pubDate>
      <description>Details &amp; scope</description></item></channel></rss>`;
    const parsed = parseSyndicationFeed(rss);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.id).toBe("tender-1");
    expect(parsed[0]?.title).toBe("Road & bridge works");
    expect(parsed[0]?.summary).toBe("Details & scope");

    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
      <id>grant-1</id><title>Research grant</title><link href="https://source.example.invalid/grant/1"/>
      <published>2026-11-03T10:00:00Z</published></entry></feed>`;
    expect(parseSyndicationFeed(atom)[0]?.link).toBe("https://source.example.invalid/grant/1");
  });

  it("rejects external entities and malformed feed envelopes", () => {
    expect(() => parseSyndicationFeed(
      '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel/></rss>',
    )).toThrow(/DTD and entity declarations/);
    expect(() => parseSyndicationFeed("<html><body>not a feed</body></html>")).toThrow();
    expect(() => parseStructuredXml("<!DOCTYPE data><data/>")).toThrow(/DTD/);
  });

  it("validates JSON feeds and reports structurally invalid input", () => {
    expect(parseJsonFeed('{"items":[{"id":"one"}]}')).toEqual([{ id: "one" }]);
    expect(() => parseJsonFeed('{"items":"not an array"}')).toThrow(/items array/);
    expect(() => parseJsonFeed("{invalid")).toThrow();
  });
});
