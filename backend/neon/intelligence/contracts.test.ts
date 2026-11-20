import { describe, expect, it } from "vitest";
import {
  computeDedupeKey,
  countryConfigSchema,
  normalizeOpportunity,
  parsedSourceOpportunitySchema,
  sourceCountryCoverageSchema,
  sourceRegistryRecordSchema,
  type CategoryMapping,
} from "./contracts";

const sourceId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";

const parsedOpportunity = {
  externalId: "notice-42",
  title: "Framework for solar equipment",
  description: "Supply of solar equipment.",
  sourceCategoryTerm: "Open tender",
  referenceNumber: " ITT - 2026/42 ",
  countryCode: "GB",
  region: "North",
  city: null,
  issuingInstitution: "Example public institution",
  procuringOrganization: null,
  publisher: "Example source",
  publishedAt: "2026-03-01T10:00:00Z",
  sourceDeadlineText: "31 March 2026, 12:00 BST",
  closingAt: "2026-03-31T11:00:00Z",
  timeZone: "Europe/London",
  status: "open",
  sourceUrl: "https://procurement.example.invalid/notice/42?utm_source=feed",
  canonicalUrl: null,
  currency: "GBP",
  amount: "120000.00",
  originalValues: { deadline: "31 March 2026, 12:00 BST" },
};

const mapping: CategoryMapping = {
  sourceId,
  countryCode: "GB",
  sourceTerm: "Open tender",
  category: "government",
  globalType: "tender",
};

describe("global intelligence data contracts", () => {
  it("validates country standards and blocks unsupported live-coverage claims", () => {
    const config = {
      alpha2: "GB",
      alpha3: "GBR",
      name: "Example country",
      callingCode: "+44",
      primaryCurrency: "GBP",
      defaultLanguage: "en-GB",
      timeZones: ["Europe/London"],
      region: "europe",
    };

    expect(countryConfigSchema.safeParse(config).success).toBe(true);
    expect(countryConfigSchema.safeParse({ ...config, alpha2: "GBR" }).success).toBe(false);
    expect(countryConfigSchema.safeParse({ ...config, primaryCurrency: "POUND" }).success).toBe(false);
    expect(countryConfigSchema.safeParse({ ...config, defaultLanguage: "not_a_locale" }).success).toBe(false);
    expect(countryConfigSchema.safeParse({ ...config, timeZones: ["Not/A_Timezone"] }).success).toBe(false);
    expect(
      countryConfigSchema.safeParse({
        ...config,
        lifecycle: "live_coverage_verified",
      }).success,
    ).toBe(false);
    expect(
      countryConfigSchema.safeParse({
        ...config,
        lifecycle: "live_coverage_verified",
        sourceIds: [sourceId],
        liveCoverageCategories: ["government", "grants", "commercial"],
        coverageVerifiedAt: "2026-04-01T00:00:00Z",
        connectorTested: true,
      }).success,
    ).toBe(true);
  });

  it("never blocks an active connector on license or permission metadata", () => {
    const source = {
      id: sourceId,
      name: "Example procurement platform",
      publisher: "Example institution",
      website: "https://procurement.example.invalid",
      sourceCategory: "government",
      sourceType: "api",
      accessMethod: "api",
      apiOrFeedUrl: "https://procurement.example.invalid/api",
      connectorIdentifier: "example-procurement-api",
      coverageScope: "country",
      coverageRegionCodes: [],
      apiOrFeedAvailable: true,
      opportunityCategories: ["government"],
      languages: ["en-GB"],
      publicationFrequency: "Daily",
      expectedRefreshHours: 24,
      reliability: "verified",
      licensingStatus: "approved",
      termsStatus: "verified",
      permissionsEvidenceUrl: "https://example.invalid/terms",
      licenseUrl: "https://example.invalid/license",
      termsUrl: "https://example.invalid/terms",
      reusePermissionStatus: "permitted",
      attributionRequirements: "Credit the publisher",
      robotsRestrictions: null,
      retentionRestrictions: null,
      rateLimitRequests: 60,
      rateLimitWindowSeconds: 3600,
      approvalStatus: "approved",
      approvalConstraints: [],
      approvalConstraintsEnforced: false,
      activationStatus: "active",
      integrationStatus: "operational",
      lastSuccessfulRetrieval: null,
      lastUnsuccessfulRetrieval: null,
      nextScheduledCollectionAt: null,
    };
    expect(sourceRegistryRecordSchema.safeParse(source).success).toBe(true);
    expect(
      sourceRegistryRecordSchema.safeParse({
        ...source,
        coverageScope: "regional",
      }).success,
    ).toBe(false);
    expect(
      sourceRegistryRecordSchema.safeParse({
        ...source,
        coverageScope: "regional",
        coverageRegionCodes: ["europe"],
      }).success,
    ).toBe(true);
    // License metadata is informational: missing evidence or an unreviewed
    // license never invalidates an approved, active source.
    expect(
      sourceRegistryRecordSchema.safeParse({
        ...source,
        permissionsEvidenceUrl: null,
      }).success,
    ).toBe(true);
    expect(
      sourceRegistryRecordSchema.safeParse({
        ...source,
        licensingStatus: "unknown",
        termsStatus: "unknown",
        reusePermissionStatus: "unknown",
      }).success,
    ).toBe(true);
    // Governance still matters: an unreviewed source cannot be active.
    expect(
      sourceRegistryRecordSchema.safeParse({
        ...source,
        approvalStatus: "unreviewed",
      }).success,
    ).toBe(false);
    // Conditional approvals are no longer constrained by license enforcement.
    expect(
      sourceRegistryRecordSchema.safeParse({
        ...source,
        approvalStatus: "approved_with_constraints",
        reusePermissionStatus: "conditional",
        approvalConstraints: ["Do not retain source documents."],
        approvalConstraintsEnforced: false,
      }).success,
    ).toBe(true);
    expect(
      sourceRegistryRecordSchema.safeParse({
        ...source,
        approvalStatus: "approved_with_constraints",
        reusePermissionStatus: "conditional",
        approvalConstraints: ["Do not retain source documents."],
        approvalConstraintsEnforced: true,
      }).success,
    ).toBe(true);
  });

  it("validates source-country relationships and category mappings", () => {
    expect(
      sourceCountryCoverageSchema.safeParse({
        sourceId,
        countryCode: "GB",
        category: "government",
        terminology: [{ sourceTerm: "Open tender", globalType: "tender" }],
      }).success,
    ).toBe(true);
    expect(
      sourceCountryCoverageSchema.safeParse({
        sourceId,
        countryCode: "GB",
        category: "government",
        status: "verified",
        terminology: [],
      }).success,
    ).toBe(false);
    expect(
      sourceCountryCoverageSchema.safeParse({
        sourceId,
        countryCode: "GBR",
        category: "unsupported",
        terminology: [],
      }).success,
    ).toBe(false);
  });

  it("preserves source values while normalizing taxonomy, URLs, and references", () => {
    const input = parsedSourceOpportunitySchema.parse(parsedOpportunity);
    const result = normalizeOpportunity(sourceId, input, [mapping]);
    expect(result?.opportunity.category).toBe("government");
    expect(result?.opportunity.normalizedReference).toBe("ITT2026/42");
    expect(result?.opportunity.sourceDeadlineText).toBe("31 March 2026, 12:00 BST");
    expect(result?.opportunity.originalValues.deadline).toBe("31 March 2026, 12:00 BST");
    expect(result?.opportunity.canonicalUrlNormalized).toBe(
      "https://procurement.example.invalid/notice/42",
    );
    expect(result?.opportunity.currency).toBe("GBP");
    expect(result?.opportunity.amount).toBe("120000.00");
    expect(result?.issues).toEqual([]);
    expect(normalizeOpportunity(sourceId, input, [])).toBeNull();
  }, 15_000);

  it("preserves a missing country value without allowing canonical normalization", () => {
    const input = parsedSourceOpportunitySchema.parse({
      ...parsedOpportunity,
      countryCode: null,
    });
    expect(input.countryCode).toBeNull();
    expect(normalizeOpportunity(sourceId, input, [mapping])).toBeNull();
  });

  it("rejects malformed, untraceable and chronologically invalid source records", () => {
    expect(
      parsedSourceOpportunitySchema.safeParse({
        ...parsedOpportunity,
        title: " ",
      }).success,
    ).toBe(false);
    expect(
      parsedSourceOpportunitySchema.safeParse({
        ...parsedOpportunity,
        sourceUrl: "http://insecure.example.invalid/notice",
      }).success,
    ).toBe(false);
    expect(
      parsedSourceOpportunitySchema.safeParse({
        ...parsedOpportunity,
        currency: "EURO",
      }).success,
    ).toBe(false);
    expect(
      parsedSourceOpportunitySchema.safeParse({
        ...parsedOpportunity,
        publishedAt: "2026-04-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });
});

/**
 * Reference implementation of the identity derivation documented in
 * `backend/neon/migrations/0031_canonical_dedupe_key.sql`. Kept independent of
 * the production helper so a silent change to either side fails the test.
 */
function referenceDedupeKey(identity: string) {
  let hash = 0xcbf29ce484222325n;
  const mask = 0xffffffffffffffffn;
  // charCodeAt (not codePointAt) on purpose: the backfill script hashes UTF-16
  // code units, so a non-BMP title must hash identically in both places.
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= BigInt(identity.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & mask;
  }
  return `dk1_${hash.toString(16).padStart(16, "0")}`;
}

describe("notice identity keys", () => {
  const identity = {
    countryCode: "GB",
    buyerName: "Example public institution",
    title: "Framework for solar equipment",
    closingAt: "2026-03-31T11:00:00Z",
  };

  it("derives a stable dk1 key that matches the persisted contract", () => {
    // Migration 0031 CHECK (dedupe_key ~ '^dk1_[a-f0-9]{16}$') and the serving
    // path must agree on this exact shape.
    expect(computeDedupeKey(identity)).toBe(
      referenceDedupeKey(
        "GB|framework for solar equipment|example public institution|2026-03-31",
      ),
    );
    expect(computeDedupeKey(identity)).toMatch(/^dk1_[a-f0-9]{16}$/u);
    expect(computeDedupeKey({ ...identity })).toBe(computeDedupeKey(identity));
  });

  it("ignores formatting noise but not real identity changes", () => {
    // NFKC + case + punctuation + repeated whitespace are not identity.
    expect(
      computeDedupeKey({
        ...identity,
        title: "  FRAMEWORK   for solar—equipment ",
        buyerName: "Example  Public Institution.",
      }),
    ).toBe(computeDedupeKey(identity));
    // Time of day within the same UTC date bucket is not identity either.
    expect(
      computeDedupeKey({ ...identity, closingAt: "2026-03-31T23:59:00Z" }),
    ).toBe(computeDedupeKey(identity));

    // Different country, buyer, title or closing day is a different notice.
    for (const changed of [
      { countryCode: "KE" },
      { buyerName: "Another institution" },
      { title: "Framework for wind equipment" },
      { closingAt: "2026-04-01T00:00:00Z" },
    ]) {
      expect(computeDedupeKey({ ...identity, ...changed })).not.toBe(
        computeDedupeKey(identity),
      );
    }
  });

  it("returns null instead of a colliding key when identity is incomplete", () => {
    expect(computeDedupeKey({ ...identity, countryCode: null })).toBeNull();
    expect(computeDedupeKey({ ...identity, title: null })).toBeNull();
    expect(computeDedupeKey({ ...identity, buyerName: null })).toBeNull();
    // Punctuation-only values normalize to empty and must not merge notices.
    expect(computeDedupeKey({ ...identity, title: "---" })).toBeNull();
    // A missing deadline is bucketed as "none", not treated as unknown identity.
    expect(computeDedupeKey({ ...identity, closingAt: null })).toBe(
      referenceDedupeKey(
        "GB|framework for solar equipment|example public institution|none",
      ),
    );
  });

  it("hashes non-BMP titles exactly like the backfill script", () => {
    // Deseret small letter U+10437 is a letter, so NFKC normalization keeps it
    // and the key must hash its UTF-16 surrogate pair, not the code point.
    expect(
      computeDedupeKey({ ...identity, title: "\u{10437} supply framework" }),
    ).toBe(
      referenceDedupeKey(
        "GB|\u{10437} supply framework|example public institution|2026-03-31",
      ),
    );
  });

  it("never emits the superseded ck1: or md5 schemes", () => {
    const key = computeDedupeKey(identity) ?? "";
    expect(key.startsWith("ck1:")).toBe(false);
    expect(key).not.toMatch(/^[a-f0-9]{32}$/u);
  });

  it("propagates the key as canonicalKey through normalization", () => {
    const normalized = normalizeOpportunity(
      sourceId,
      parsedSourceOpportunitySchema.parse(parsedOpportunity),
      [mapping],
    );
    expect(normalized?.opportunity.canonicalKey).toBe(computeDedupeKey(identity));
  });
});
