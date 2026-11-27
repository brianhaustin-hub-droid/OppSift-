import { z } from "zod";

function md5Hex(input: string): string {
  // Minimal synchronous MD5 for canonical key generation (browser + Node safe).
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = (a + q + x + t) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  function md5cycle(x: number[], k: number[]) {
    let [a,b,c,d] = x;
    a=ff(a,b,c,d,k[0],7,-680876936); d=ff(d,a,b,c,k[1],12,-389564586); c=ff(c,d,a,b,k[2],17,606105819); b=ff(b,c,d,a,k[3],22,-1044525330);
    a=ff(a,b,c,d,k[4],7,-176418897); d=ff(d,a,b,c,k[5],12,1200080426); c=ff(c,d,a,b,k[6],17,-1473231341); b=ff(b,c,d,a,k[7],22,-45705983);
    a=ff(a,b,c,d,k[8],7,1770035416); d=ff(d,a,b,c,k[9],12,-1958414417); c=ff(c,d,a,b,k[10],17,-42063); b=ff(b,c,d,a,k[11],22,-1990404162);
    a=ff(a,b,c,d,k[12],7,1804603682); d=ff(d,a,b,c,k[13],12,-40341101); c=ff(c,d,a,b,k[14],17,-1502002290); b=ff(b,c,d,a,k[15],22,1236535329);
    a=gg(a,b,c,d,k[1],5,-165796510); d=gg(d,a,b,c,k[6],9,-1069501632); c=gg(c,d,a,b,k[11],14,643717713); b=gg(b,c,d,a,k[0],20,-373897302);
    a=gg(a,b,c,d,k[5],5,-701558691); d=gg(d,a,b,c,k[10],9,38016083); c=gg(c,d,a,b,k[15],14,-660478335); b=gg(b,c,d,a,k[4],20,-405537848);
    a=gg(a,b,c,d,k[9],5,568446438); d=gg(d,a,b,c,k[14],9,-1019803690); c=gg(c,d,a,b,k[3],14,-187363961); b=gg(b,c,d,a,k[8],20,1163531501);
    a=gg(a,b,c,d,k[13],5,-1444681467); d=gg(d,a,b,c,k[2],9,-51403784); c=gg(c,d,a,b,k[7],14,1735328473); b=gg(b,c,d,a,k[12],20,-1926607734);
    a=hh(a,b,c,d,k[5],4,-378558); d=hh(d,a,b,c,k[8],11,-2022574463); c=hh(c,d,a,b,k[11],16,1839030562); b=hh(b,c,d,a,k[14],23,-35309556);
    a=hh(a,b,c,d,k[1],4,-1530992060); d=hh(d,a,b,c,k[4],11,1272893353); c=hh(c,d,a,b,k[7],16,-155497632); b=hh(b,c,d,a,k[10],23,-1094730640);
    a=hh(a,b,c,d,k[13],4,681279174); d=hh(d,a,b,c,k[0],11,-358537222); c=hh(c,d,a,b,k[3],16,-722521979); b=hh(b,c,d,a,k[6],23,76029189);
    a=hh(a,b,c,d,k[9],4,-640364487); d=hh(d,a,b,c,k[12],11,-421815835); c=hh(c,d,a,b,k[15],16,530742520); b=hh(b,c,d,a,k[2],23,-995338651);
    a=ii(a,b,c,d,k[0],6,-198630844); d=ii(d,a,b,c,k[7],10,1126891415); c=ii(c,d,a,b,k[14],15,-1416354905); b=ii(b,c,d,a,k[5],21,-57434055);
    a=ii(a,b,c,d,k[12],6,1700485571); d=ii(d,a,b,c,k[3],10,-1894986606); c=ii(c,d,a,b,k[10],15,-1051523); b=ii(b,c,d,a,k[1],21,-2054922799);
    a=ii(a,b,c,d,k[8],6,1873313359); d=ii(d,a,b,c,k[15],10,-30611744); c=ii(c,d,a,b,k[6],15,-1560198380); b=ii(b,c,d,a,k[13],21,1309151649);
    a=ii(a,b,c,d,k[4],6,-145523070); d=ii(d,a,b,c,k[11],10,-1120210379); c=ii(c,d,a,b,k[2],15,718787259); b=ii(b,c,d,a,k[9],21,-343485551);
    x[0]=(a+x[0])|0; x[1]=(b+x[1])|0; x[2]=(c+x[2])|0; x[3]=(d+x[3])|0;
  }
  function md51(s: string) {
    const n = s.length;
    let state = [1732584193, -271733879, -1732584194, 271733878];
    let i: number;
    for (i = 64; i <= n; i += 64) {
      const blk: number[] = [];
      for (let j = 0; j < 64; j += 4) blk[j>>2] = s.charCodeAt(i-64+j) + (s.charCodeAt(i-64+j+1)<<8) + (s.charCodeAt(i-64+j+2)<<16) + (s.charCodeAt(i-64+j+3)<<24);
      md5cycle(state, blk);
    }
    const tail = new Array(16).fill(0);
    const rem = n % 64;
    for (i = 0; i < rem; i++) tail[i>>2] |= s.charCodeAt(n-rem+i) << ((i%4)<<3);
    tail[i>>2] |= 0x80 << ((i%4)<<3);
    if (i > 55) { md5cycle(state, tail); for (i=0;i<16;i++) tail[i]=0; }
    const bits = n * 8;
    tail[14] = bits & 0xffffffff;
    tail[15] = Math.floor(bits / 0x100000000);
    md5cycle(state, tail);
    return state;
  }
  const hex = "0123456789abcdef";
  const out: string[] = [];
  for (const x of md51(unescape(encodeURIComponent(input)))) {
    for (let j = 0; j < 4; j++) { const b=(x>>(j*8))&0xff; out.push(hex[(b>>4)&0xf]+hex[b&0xf]); }
  }
  return out.join("");
}

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
  // License, terms, approval and attribution fields are informational metadata.
  // They never gate activation, integration, or collection: the platform owner
  // decides which public sources run, and every wired connector is live.
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

// Canonical key per AGENTS.md: md5(lower(buyer)||'|'||lower(title)||'|'||UTC date)
// UTC date must use UTC timezone to avoid session-dependent keys.
// Returns null when buyer or title is missing (unkeyable row).
function computeCanonicalKey(record: {
  buyerName: string | null;
  title: string;
  closingAt: string | null;
}): string | null {
  const buyer = record.buyerName?.trim();
  const title = record.title?.trim();
  if (!buyer || !title) return null;
  let closingDate = "";
  if (record.closingAt) {
    const d = new Date(record.closingAt);
    if (!Number.isNaN(d.getTime())) {
      closingDate = d.toISOString().slice(0, 10); // UTC date
    }
  }
  const identity = `${buyer.toLowerCase()}|${title.toLowerCase()}|${closingDate}`;
  return md5Hex(identity);
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
      canonicalKey: computeCanonicalKey({
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
