import { describe, expect, it } from "vitest";
import { computeDedupeKey, normalizeDedupeText } from "./contracts";

type KeyScript = {
  fingerprint(input: string): string;
  normalizeDedupeText(value: string): string;
  computeDedupeKey(record: {
    countryCode: string | null;
    title: string | null;
    procuringOrganization?: string | null;
    issuingInstitution?: string | null;
    publisher?: string | null;
    closingAt: string | null;
  }): string | null;
};

// The operator script is plain ESM with no type declarations; importing it must
// stay side-effect free (no env read, no database connection).
// @ts-expect-error - untyped ESM module
const script = (await import("../../../scripts/backfill-dedupe-keys.mjs")) as KeyScript;

/**
 * Executable parity between the serving path (`computeDedupeKey` in
 * contracts.ts) and the backfill script that rewrites `opportunities.dedupe_key`.
 * If these ever diverge, backfilled rows stop matching newly ingested ones and
 * cross-url dedupe silently stops working, so this test asserts byte equality
 * rather than "same shape".
 */
describe("backfill script / serving path key parity", () => {
  const cases = [
    {
      countryCode: "GB",
      title: "Framework for solar equipment",
      buyer: "Example public institution",
      closingAt: "2026-03-31T11:00:00Z",
    },
    {
      countryCode: "KE",
      title: "SUPPLY AND DELIVERY OF BIOLOGY, PHYSICS & CHEMISTRY EQUIPMENT",
      buyer: "MATHIOYA NG-CDF",
      closingAt: "2026-11-16T09:00:00Z",
    },
    {
      countryCode: "PH",
      title: "PROCUREMENT OF FULLY AUTOMATED BLOOD CHEMISTRY ANALYZER",
      buyer: "MUNICIPALITY OF MAHAPLAG LEYTE",
      closingAt: "2026-12-02T02:00:00Z",
    },
    {
      // Formatting noise must collapse identically on both sides.
      countryCode: "IN",
      title: "  ENQUIRY   for Procurement of copper—cable ",
      buyer: "India CPPP",
      closingAt: "2020-11-17T10:00:00Z",
    },
    {
      // Non-BMP letters: both sides must hash UTF-16 code units.
      countryCode: "SS",
      title: "\u{10437} supply framework",
      buyer: "École Nationale",
      closingAt: null,
    },
    { countryCode: "US", title: "---", buyer: "Acme Holdings", closingAt: null },
    { countryCode: "DE", title: "Rahmenvertrag", buyer: "Bundesamt", closingAt: "2026-12-02" },
  ];

  it("computes byte-identical keys for representative records", () => {
    for (const testCase of cases) {
      const fromServingPath = computeDedupeKey({
        countryCode: testCase.countryCode,
        buyerName: testCase.buyer,
        title: testCase.title,
        closingAt: testCase.closingAt,
      });
      const fromScript = script.computeDedupeKey({
        countryCode: testCase.countryCode,
        title: testCase.title,
        procuringOrganization: testCase.buyer,
        issuingInstitution: null,
        publisher: null,
        closingAt: testCase.closingAt,
      });
      expect(fromScript, JSON.stringify(testCase)).toBe(fromServingPath);
      if (fromServingPath !== null) {
        expect(fromServingPath).toMatch(/^dk1_[a-f0-9]{16}$/u);
      }
    }
  });

  it("agrees on the buyer fallback chain used when procuring org is absent", () => {
    const record = {
      countryCode: "KE",
      title: "Supply of laboratory reagents",
      procuringOrganization: null,
      issuingInstitution: "Ministry of Health",
      publisher: "PPIP",
      closingAt: "2026-10-01T09:00:00Z",
    };
    expect(script.computeDedupeKey(record)).toBe(
      computeDedupeKey({
        countryCode: record.countryCode,
        buyerName: record.issuingInstitution ?? record.publisher,
        title: record.title,
        closingAt: record.closingAt,
      }),
    );
  });

  it("agrees on normalization and hashing across a generated corpus", () => {
    const alphabet = [
      "a", "Z", " ", "  ", "\t", "\n", "-", "—", ".", "(", ")", "/", "&",
      "é", "Ü", "Ω", "Ж", "ع", "न", "ß", "𐐷", "🛠", "Ⅻ",
    ];
    const countries = ["GB", "KE", "PH", "IN", "SS", "US", "DE"];
    const deadlines = [
      null,
      "2026-12-02T02:00:00.000Z",
      "2026-11-16T09:00:00Z",
      "2026-03-31T11:00:00Z",
      "2026-12-02",
    ];
    let seed = 987654321;
    const next = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const text = () => {
      let value = "";
      const length = 1 + Math.floor(next() * 10);
      for (let index = 0; index < length; index += 1) {
        value += alphabet[Math.floor(next() * alphabet.length)];
      }
      return value;
    };

    for (let index = 0; index < 250; index += 1) {
      const title = text() + text();
      const buyer = text() + text();
      const countryCode = countries[Math.floor(next() * countries.length)];
      const closingAt = deadlines[Math.floor(next() * deadlines.length)];

      expect(script.normalizeDedupeText(title))
        .toBe(normalizeDedupeText(title));

      const fromServingPath = computeDedupeKey({
        countryCode,
        buyerName: buyer,
        title,
        closingAt,
      });
      const fromScript = script.computeDedupeKey({
        countryCode,
        title,
        procuringOrganization: buyer,
        issuingInstitution: null,
        publisher: null,
        closingAt,
      });
      // Covers normalization, the buyer chain, the closing-date bucket and the
      // FNV-1a fingerprint in one assertion.
      expect(fromScript).toBe(fromServingPath);
      if (fromServingPath !== null) {
        expect(fromServingPath).toMatch(/^dk1_[a-f0-9]{16}$/u);
      }
    }
  });
});
