import { z } from "zod";

export const opportunityCategories = [
  "government",
  "grants",
  "commercial",
] as const;

// UUID-shape (8-4-4-4-12 hex), not RFC variant enforcement: source and run
// ids are minted by our own migrations and several use synthetic ids whose
// variant nibble falls outside [8-9-a-b]. Requiring RFC variant bits made
// one bad-looking id abort the entire scheduler on every cron tick (the
// 2026-11-15 outage). Shape is what the contract actually needs. External
// identifiers issued by third-party APIs keep their stricter validation.
export const uuidShapeSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

export const countryLifecycle = [
  "planned",
  "configured",
  "sources_identified",
  "sources_verified",
  "integration_operational",
  "live_coverage_verified",
] as const;

export const sourceApprovalStatuses = [
  "unreviewed",
  "approved",
  "approved_with_constraints",
  "denied",
] as const;

export const sourceActivationStatuses = ["inactive", "active", "paused"] as const;
export const sourceCoverageRegions = [
  "africa",
  "asia",
  "europe",
  "north_america",
  "south_america",
  "oceania",
  "antarctica",
  "other",
] as const;

const isoAlpha2 = z.string().regex(/^[A-Z]{2}$/);
const isoAlpha3 = z.string().regex(/^[A-Z]{3}$/);
const isoCurrency = z.string().regex(/^[A-Z]{3}$/);
const bcp47Language = z.string().min(2).max(35).refine((value) => {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}, "Language must be a valid BCP 47 tag.");
const ianaTimeZone = z.string().min(1).max(80).refine((value) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Time zone must be a recognized IANA identifier.");
const httpsUrl = z.string().url().refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "URL must use HTTPS.");

export const countryConfigSchema = z.object({
  alpha2: isoAlpha2,
  alpha3: isoAlpha3,
  name: z.string().trim().min(1).max(120),
  callingCode: z.string().regex(/^\+[1-9]\d{0,2}$/),
  primaryCurrency: isoCurrency,
  additionalCurrencies: z.array(isoCurrency).default([]),
  defaultLanguage: bcp47Language,
  additionalLanguages: z.array(bcp47Language).default([]),
  timeZones: z.array(ianaTimeZone).min(1),
  region: z.enum([
    "africa",
    "asia",
    "europe",
    "north_america",
    "south_america",
    "oceania",
    "antarctica",
    "other",
  ]),
  lifecycle: z.enum(countryLifecycle).default("planned"),
  sourceIds: z.array(uuidShapeSchema).default([]),
  liveCoverageCategories: z.array(z.enum(opportunityCategories)).default([]),
  coverageVerifiedAt: z.string().datetime({ offset: true }).nullable().default(null),
  connectorTested: z.boolean().default(false),
}).superRefine((country, context) => {
  if (
    country.lifecycle === "live_coverage_verified" &&
    (
      country.sourceIds.length === 0 ||
      !country.coverageVerifiedAt ||
      !country.connectorTested ||
      opportunityCategories.some((category) => !country.liveCoverageCategories.includes(category))
    )
  ) {
    context.addIssue({
      code: "custom",
      message: "Live coverage requires all three categories, a source, a verification timestamp, and a tested connector.",
      path: ["lifecycle"],
    });
  }
});

export type CountryConfig = z.infer<typeof countryConfigSchema>;

export const sourceRegistryRecordSchema = z.object({
  // UUID-shape (see uuidShapeSchema rationale below): source ids are
  // minted by our own activation migrations, and several use synthetic ids
  // whose variant nibble is outside [8-9-a-b]. Requiring RFC variant bits
  // made one bad-looking id abort the entire scheduler on every cron tick
  // (2026-11-15 outage). Shape is what the contract actually needs.
  id: uuidShapeSchema,
  name: z.string().trim().min(1).max(200),
  publisher: z.string().trim().min(1).max(200),
  website: httpsUrl,
  sourceCategory: z.enum(["government", "funding", "commercial", "multilateral", "other"]),
  sourceType: z.enum(["portal", "api", "rss", "dataset", "document_feed", "other"]),
  accessMethod: z.enum(["api", "feed", "download", "permitted_web", "manual"]),
  apiOrFeedUrl: httpsUrl.nullable().default(null),
  connectorIdentifier: z
    .string()
    .regex(/^[a-z0-9][a-z0-9._-]{0,119}$/)
    .nullable()
    .default(null),
  coverageScope: z.enum(["global", "regional", "country", "multi_country"]).default("country"),
  coverageRegionCodes: z.array(z.enum(sourceCoverageRegions)).default([]),
  apiOrFeedAvailable: z.boolean(),
  opportunityCategories: z.array(z.enum(opportunityCategories)).min(1),
  languages: z.array(bcp47Language).min(1),
  publicationFrequency: z.string().trim().min(1).max(100),
  expectedRefreshHours: z.number().int().positive().max(8760),
  reliability: z.enum(["unknown", "unverified", "verified", "reliable", "degraded"]),
  licensingStatus: z.enum(["unknown", "review_required", "approved", "restricted", "prohibited"]),
  termsStatus: z.enum(["unknown", "review_required", "verified", "restricted", "prohibited"]),
  permissionsEvidenceUrl: httpsUrl.nullable(),
  licenseUrl: httpsUrl.nullable().default(null),
  termsUrl: httpsUrl.nullable().default(null),
  reusePermissionStatus: z.enum(["unknown", "permitted", "conditional", "prohibited"]).default("unknown"),
  attributionRequirements: z.string().max(2000).nullable(),
  robotsRestrictions: z.string().max(2000).nullable(),
  retentionRestrictions: z.string().max(5000).nullable().default(null),
  rateLimitRequests: z.number().int().positive().nullable().default(null),
  rateLimitWindowSeconds: z.number().int().positive().nullable().default(null),
  approvalStatus: z.enum(sourceApprovalStatuses).default("unreviewed"),
  approvalConstraints: z.array(z.string().trim().min(1).max(1000)).max(100).default([]),
  approvalConstraintsEnforced: z.boolean().default(false),
  approvalExpiresAt: z.string().datetime({ offset: true }).nullable().default(null),
  activationStatus: z.enum(sourceActivationStatuses).default("inactive"),
  integrationStatus: z.enum(["not_started", "in_development", "tested", "operational", "paused"]),
  lastSuccessfulRetrieval: z.string().datetime({ offset: true }).nullable(),
  lastUnsuccessfulRetrieval: z.string().datetime({ offset: true }).nullable(),
  nextScheduledCollectionAt: z.string().datetime({ offset: true }).nullable().default(null),
}).superRefine((source, context) => {
  if (source.coverageScope === "regional" && source.coverageRegionCodes.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Regional sources must declare at least one covered region.",
      path: ["coverageRegionCodes"],
    });
  }
  if ((source.rateLimitRequests === null) !== (source.rateLimitWindowSeconds === null)) {
    context.addIssue({
      code: "custom",
      message: "Rate-limit request count and time window must be configured together.",
      path: ["rateLimitRequests"],
    });
  }
  // License, terms, reuse-permission and attribution constraints are recorded
  // as informational metadata only. They never gate approval, activation, or
  // collection: this platform aggregates public open data without license
  // restrictions.
  if (
    source.activationStatus === "active" &&
    (
      source.integrationStatus !== "operational" ||
      !source.connectorIdentifier ||
      !["approved", "approved_with_constraints"].includes(source.approvalStatus)
    )
  ) {
    context.addIssue({
      code: "custom",
      message: "Active collection requires an operational connector and an approved source.",
      path: ["activationStatus"],
    });
  }
  if (
    source.integrationStatus === "operational" &&
    source.activationStatus !== "active"
  ) {
    context.addIssue({
      code: "custom",
      message: "Operational source integration requires explicit active approval.",
      path: ["integrationStatus"],
    });
  }
  if (
    source.approvalStatus === "denied" &&
    (source.activationStatus === "active" || source.integrationStatus === "operational")
  ) {
    context.addIssue({
      code: "custom",
      message: "Denied sources must remain inactive and non-operational.",
      path: ["approvalStatus"],
    });
  }
});

export type SourceRegistryRecord = z.infer<typeof sourceRegistryRecordSchema>;

export const sourceCountryCoverageSchema = z.object({
  sourceId: uuidShapeSchema,
  countryCode: isoAlpha2,
  category: z.enum(opportunityCategories),
  status: z.enum(["planned", "identified", "verified", "operational", "live_verified", "paused"])
    .default("planned"),
  verifiedAt: z.string().datetime({ offset: true }).nullable().default(null),
  verificationEvidenceUrl: httpsUrl.nullable().default(null),
  terminology: z.array(z.object({
    sourceTerm: z.string().trim().min(1).max(200),
    globalType: z.string().trim().min(1).max(100),
  })),
}).superRefine((coverage, context) => {
  if (
    ["verified", "operational", "live_verified"].includes(coverage.status) &&
    (!coverage.verifiedAt || !coverage.verificationEvidenceUrl)
  ) {
    context.addIssue({
      code: "custom",
      message: "Verified coverage requires a timestamp and evidence URL.",
      path: ["status"],
    });
  }
});

export const categoryMappingSchema = z.object({
  sourceId: uuidShapeSchema,
  countryCode: isoAlpha2,
  sourceTerm: z.string().trim().min(1).max(200),
  category: z.enum(opportunityCategories),
  globalType: z.string().trim().min(1).max(100),
});

export type CategoryMapping = z.infer<typeof categoryMappingSchema>;

export const parsedSourceOpportunitySchema = z.object({
  externalId: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(1000),
  description: z.string().nullable().default(null),
  sourceCategoryTerm: z.string().trim().min(1).max(200),
  referenceNumber: z.string().trim().max(200).nullable().default(null),
  countryCode: isoAlpha2.nullable().default(null),
  region: z.string().trim().max(200).nullable().default(null),
  city: z.string().trim().max(200).nullable().default(null),
  issuingInstitution: z.string().trim().max(300).nullable().default(null),
  procuringOrganization: z.string().trim().max(300).nullable().default(null),
  publisher: z.string().trim().min(1).max(300),
  publishedAt: z.string().datetime({ offset: true }).nullable().default(null),
  sourceDeadlineText: z.string().trim().max(500).nullable().default(null),
  closingAt: z.string().datetime({ offset: true }).nullable().default(null),
  timeZone: ianaTimeZone.nullable().default(null),
  status: z.enum(["open", "closed", "cancelled", "awarded", "unknown"]).default("unknown"),
  sourceUrl: httpsUrl,
  canonicalUrl: httpsUrl.nullable().default(null),
  currency: isoCurrency.nullable().default(null),
  amount: z.string().regex(/^\d{1,16}(\.\d{1,4})?$/).nullable().default(null),
  originalValues: z.record(z.string(), z.unknown()).default({}),
}).superRefine((record, context) => {
  if (
    record.publishedAt &&
    record.closingAt &&
    Date.parse(record.closingAt) < Date.parse(record.publishedAt)
  ) {
    context.addIssue({
      code: "custom",
      message: "Closing timestamp precedes publication timestamp.",
      path: ["closingAt"],
    });
  }
});

export type ParsedSourceOpportunity = z.infer<typeof parsedSourceOpportunitySchema>;

export type NormalizedOpportunity = ParsedSourceOpportunity & {
  countryCode: string;
  category: (typeof opportunityCategories)[number];
  globalType: string;
  sourceId: string;
  contentFingerprint: string;
  canonicalUrlNormalized: string;
  normalizedReference: string | null;
  /**
   * Cross-URL notice-identity key, derived by `computeDedupeKey`.
   * Persisted to `public.opportunities.dedupe_key` (migration 0031).
   */
  canonicalKey: string | null;
};

export type QualityIssue = {
  code: string;
  message: string;
  severity: "warning" | "error";
  field?: string;
};

export function canonicalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.toString();
}

function normalizeReference(value: string | null) {
  return value?.normalize("NFKC").toUpperCase().replace(/[\s-]+/g, "") || null;
}

// Notice-identity dedupe key, persisted to public.opportunities.dedupe_key
// (migration 0031, which enforces CHECK dedupe_key ~ '^dk1_[a-f0-9]{16}$').
// Domain name in TypeScript is `canonicalKey`; both names refer to the same
// value. The algorithm is fixed by 0031 and mirrored by
// scripts/backfill-dedupe-keys.mjs: NFKC-normalised title and buyer, the UTC
// closing-date bucket, and the country code, hashed with the FNV-1a 16-hex
// fingerprint. Versioned prefix `dk1_` so the derivation can change later.
// Returns null when the row cannot be keyed conservatively (0031: only when
// title, buyer and country are all present; false merges are worse than
// duplicates).
export function normalizeDedupeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function computeDedupeKey(record: {
  countryCode: string | null;
  buyerName: string | null;
  title: string | null;
  closingAt: string | null;
}): string | null {
  if (!record.countryCode || !record.title || !record.buyerName) return null;
  const normalizedTitle = normalizeDedupeText(record.title);
  const normalizedBuyer = normalizeDedupeText(record.buyerName);
  if (!normalizedTitle || !normalizedBuyer) return null;
  const closingBucket = record.closingAt
    ? record.closingAt.slice(0, 10) // UTC date bucket
    : "none";
  const identity = [
    record.countryCode,
    normalizedTitle,
    normalizedBuyer,
    closingBucket,
  ].join("|");
  return `dk1_${fingerprint(identity)}`;
}

function fingerprint(input: string) {
  let hash = 0xcbf29ce484222325n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return "null";
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    return `{${entries
      .map(([key, child]) => `${JSON.stringify(key)}:${stableSerialize(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function normalizeOpportunity(
  sourceId: string,
  record: ParsedSourceOpportunity,
  mappings: readonly CategoryMapping[],
): { opportunity: NormalizedOpportunity; issues: QualityIssue[] } | null {
  if (!record.countryCode) return null;
  const countryCode = record.countryCode;

  const mapping = mappings.find(
    (item) =>
      item.sourceId === sourceId &&
      item.countryCode === countryCode &&
      item.sourceTerm.toLowerCase() === record.sourceCategoryTerm.toLowerCase(),
  );
  if (!mapping) return null;

  const normalizedReference = normalizeReference(record.referenceNumber);
  const canonicalUrlNormalized = canonicalizeUrl(record.canonicalUrl ?? record.sourceUrl);
  const identity = [
    record.title.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(),
    record.publisher.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(),
    record.countryCode,
    record.sourceCategoryTerm,
    record.description ?? "",
    record.referenceNumber ?? "",
    record.region ?? "",
    record.city ?? "",
    record.issuingInstitution ?? "",
    record.procuringOrganization ?? "",
    record.publishedAt ?? "",
    record.sourceDeadlineText ?? "",
    record.closingAt ?? "",
    record.timeZone ?? "",
    record.status,
    record.sourceUrl,
    record.canonicalUrl ?? "",
    mapping.category,
    mapping.globalType,
    record.currency ?? "",
    record.amount ?? "",
    stableSerialize(record.originalValues),
  ].join("|");
  const issues: QualityIssue[] = [];

  if (!record.issuingInstitution && !record.procuringOrganization) {
    issues.push({
      code: "missing_issuer",
      message: "No issuing or procuring institution was provided by the source.",
      severity: "warning",
      field: "issuingInstitution",
    });
  }

  const buyerName = record.procuringOrganization ?? record.issuingInstitution ?? record.publisher ?? null;
  return {
    opportunity: {
      ...record,
      countryCode,
      category: mapping.category,
      globalType: mapping.globalType,
      sourceId,
      contentFingerprint: fingerprint(identity),
      canonicalUrlNormalized,
      normalizedReference,
      canonicalKey: computeDedupeKey({
        countryCode,
        buyerName,
        title: record.title,
        closingAt: record.closingAt,
      }),
    },
    issues,
  };
}

export function findDuplicateConfidence(
  left: NormalizedOpportunity,
  right: NormalizedOpportunity,
) {
  if (left.sourceId === right.sourceId && left.externalId === right.externalId) return 1;
  if (left.canonicalUrlNormalized === right.canonicalUrlNormalized) return 1;
  if (
    left.countryCode === right.countryCode &&
    left.normalizedReference &&
    left.normalizedReference === right.normalizedReference &&
    left.publisher.toLowerCase() === right.publisher.toLowerCase()
  ) return 0.98;
  if (left.contentFingerprint === right.contentFingerprint) return 0.85;
  return 0;
}
