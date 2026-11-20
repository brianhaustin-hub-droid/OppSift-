import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { sourceRegistryRecordSchema } from "./contracts";

// One-off diagnostic: replicate NeonIngestionRepository.listApprovedActiveSources
// exactly (sourceSelect + mapSource candidate construction) and validate every
// source row against sourceRegistryRecordSchema, reporting which source fails
// and why. This found the silent cron-killer during the 2026-11-15 outage.

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing string field: ${field}`);
  }
  return value;
}

function dateToIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

const sourceSelect = `
  SELECT
    id,
    name,
    publisher,
    official_website AS website,
    source_category AS "sourceCategory",
    source_type AS "sourceType",
    access_method AS "accessMethod",
    api_or_feed_url AS "apiOrFeedUrl",
    connector_identifier AS "connectorIdentifier",
    coverage_scope AS "coverageScope",
    coverage_region_codes AS "coverageRegionCodes",
    api_or_feed_available AS "apiOrFeedAvailable",
    supported_categories AS "opportunityCategories",
    languages,
    publication_frequency AS "publicationFrequency",
    expected_refresh_hours AS "expectedRefreshHours",
    reliability_status AS reliability,
    licensing_status AS "licensingStatus",
    terms_status AS "termsStatus",
    permissions_evidence_url AS "permissionsEvidenceUrl",
    license_url AS "licenseUrl",
    terms_url AS "termsUrl",
    reuse_permission_status AS "reusePermissionStatus",
    attribution_requirements AS "attributionRequirements",
    robots_restrictions AS "robotsRestrictions",
    retention_restrictions AS "retentionRestrictions",
    rate_limit_requests AS "rateLimitRequests",
    rate_limit_window_seconds AS "rateLimitWindowSeconds",
    approval_status AS "approvalStatus",
    approval_constraints AS "approvalConstraints",
    approval_constraints_enforced AS "approvalConstraintsEnforced",
    approval_expires_at AS "approvalExpiresAt",
    activation_status AS "activationStatus",
    integration_status AS "integrationStatus",
    last_successful_retrieval AS "lastSuccessfulRetrieval",
    last_unsuccessful_retrieval AS "lastUnsuccessfulRetrieval",
    next_scheduled_collection_at AS "nextScheduledCollectionAt"
  FROM public.opportunity_sources
`;

function mapSource(row: Record<string, unknown>) {
  const constraints = row.approvalConstraints;
  if (!Array.isArray(constraints) || constraints.some((item) => typeof item !== "string")) {
    throw new Error(`Source ${requiredString(row, "id")} approval constraints are invalid.`);
  }
  const candidate = {
    id: requiredString(row, "id"),
    name: row.name,
    publisher: row.publisher,
    website: row.website,
    sourceCategory: row.sourceCategory,
    sourceType: row.sourceType,
    accessMethod: row.accessMethod,
    apiOrFeedUrl: row.apiOrFeedUrl,
    connectorIdentifier: row.connectorIdentifier,
    coverageScope: row.coverageScope,
    coverageRegionCodes: row.coverageRegionCodes,
    apiOrFeedAvailable: row.apiOrFeedAvailable,
    opportunityCategories: row.opportunityCategories,
    languages: row.languages,
    publicationFrequency: row.publicationFrequency,
    expectedRefreshHours: Number(row.expectedRefreshHours),
    reliability: row.reliability,
    licensingStatus: row.licensingStatus,
    termsStatus: row.termsStatus,
    permissionsEvidenceUrl: row.permissionsEvidenceUrl,
    licenseUrl: row.licenseUrl,
    termsUrl: row.termsUrl,
    reusePermissionStatus: row.reusePermissionStatus,
    attributionRequirements: row.attributionRequirements,
    robotsRestrictions: row.robotsRestrictions,
    retentionRestrictions: row.retentionRestrictions,
    rateLimitRequests: row.rateLimitRequests === null ? null : Number(row.rateLimitRequests),
    rateLimitWindowSeconds: row.rateLimitWindowSeconds === null
      ? null
      : Number(row.rateLimitWindowSeconds),
    approvalStatus: row.approvalStatus,
    approvalConstraints: constraints,
    approvalConstraintsEnforced: row.approvalConstraintsEnforced,
    approvalExpiresAt: dateToIso(row.approvalExpiresAt),
    activationStatus: row.activationStatus,
    integrationStatus: row.integrationStatus,
    lastSuccessfulRetrieval: dateToIso(row.lastSuccessfulRetrieval),
    lastUnsuccessfulRetrieval: dateToIso(row.lastUnsuccessfulRetrieval),
    nextScheduledCollectionAt: dateToIso(row.nextScheduledCollectionAt),
  };
  return sourceRegistryRecordSchema.safeParse(candidate);
}

describe("diagnose: source registry contract validation", () => {
  it(
    "validates every source row and reports the exact failures",
    { timeout: 120_000 },
    async () => {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const env: Record<string, string> = {};
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value;
    }
    const url = env.DATABASE_URL;
    expect(url).toBeTruthy();
    const sql = postgres(url!, { max: 1, connect_timeout: 30 });
    try {
      const rows = await sql.unsafe(sourceSelect) as any[];
      const failures: { id: string; name: string; issues: string[] }[] = [];
      for (const row of rows as any[]) {
        const parsed = mapSource(row);
        if (!parsed.success) {
          failures.push({
            id: String(row.id),
            name: String(row.name),
            issues: parsed.error.issues.map(
              (issue) => `${issue.path.join(".")}: ${issue.message}`,
            ),
          });
          console.log(
            `FAIL ${row.id} | ${row.name} | activation=${row.activationStatus} `
              + `integration=${row.integrationStatus} :: `
              + `${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
          );
        }
      }
      console.log(`Validated ${rows.length} sources, ${failures.length} failures.`);
      expect(failures.length, "see FAIL lines above").toBe(0);
    } finally {
      await sql.end();
    }
  });
});
