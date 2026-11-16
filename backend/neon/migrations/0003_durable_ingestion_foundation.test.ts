import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = resolve(process.cwd(), "backend", "neon", "migrations");
const migrationPath = (filename: string) => resolve(migrationDirectory, filename);
const migration = readFileSync(
  migrationPath("0003_durable_ingestion_foundation.sql"),
  "utf8",
);
const previousSql = [
  "0001_identity_organizations.sql",
  "0002_global_opportunity_intelligence.sql",
].map((filename) => readFileSync(migrationPath(filename), "utf8")).join("\n");

describe("durable ingestion migration", () => {
  it("adds only tables not present in the existing migrations", () => {
    const newTables = [...migration.matchAll(/CREATE TABLE\s+public\.([a-z_]+)/giu)]
      .map((match) => match[1]?.toLowerCase())
      .filter((name): name is string => name !== undefined);
    const existingTables = new Set(
      [...previousSql.matchAll(/CREATE TABLE IF NOT EXISTS public\.([a-z_]+)/giu)]
        .map((match) => match[1]?.toLowerCase())
        .filter((name): name is string => name !== undefined),
    );

    expect(newTables).toEqual(["source_cursors", "ingestion_jobs", "raw_source_records"]);
    expect(newTables.some((name) => existingTables.has(name))).toBe(false);
    expect(migration).not.toMatch(/CREATE TABLE IF NOT EXISTS/iu);
  });

  it("extends existing source/run records and preserves source provenance on canonical deletion", () => {
    expect(migration).toMatch(/ALTER TABLE public\.opportunity_sources[\s\S]*approval_status/iu);
    expect(migration).toMatch(/ALTER TABLE public\.ingestion_runs[\s\S]*parsed_count[\s\S]*accepted_count[\s\S]*failed_count/iu);
    expect(migration).toMatch(/ALTER COLUMN opportunity_id DROP NOT NULL/iu);
    expect(migration).toMatch(/ON DELETE SET NULL/iu);
    expect(migration).toMatch(/UNIQUE \(source_id, external_record_id, payload_checksum\)/iu);
  });

  it("keeps collection approval fail-closed and ingestion tables unavailable to public roles", () => {
    expect(migration).toMatch(/approval_status IN \('approved', 'approved_with_constraints'\)/iu);
    expect(migration).toMatch(/approval_constraints_enforced/iu);
    expect(migration).toMatch(/activation_status <> 'active'/iu);
    expect(migration).toMatch(/coverage_region_codes/iu);
    expect(migration).toMatch(/DROP POLICY IF EXISTS verified_source_registry_public_read/iu);
    expect(migration).toMatch(/approval_status IN \('approved', 'approved_with_constraints'\)[\s\S]*licensing_status = 'approved'/iu);
    expect(migration).toMatch(/ALTER TABLE public\.source_cursors ENABLE ROW LEVEL SECURITY/iu);
    expect(migration).toMatch(/ALTER TABLE public\.ingestion_jobs ENABLE ROW LEVEL SECURITY/iu);
    expect(migration).toMatch(/ALTER TABLE public\.raw_source_records ENABLE ROW LEVEL SECURITY/iu);
    expect(migration).toMatch(/REVOKE ALL ON TABLE[\s\S]*FROM PUBLIC/iu);
    expect(migration).toMatch(/'anon', 'authenticated'/iu);
  });

  it("does not seed, approve, activate, or apply the migration", () => {
    expect(migration).not.toMatch(/^\s*(INSERT|UPDATE)\s/imu);
    expect(migration).not.toMatch(/^UPDATE\s+[\w.]+\s+SET[\s\S]*?activation_status\s*=\s*'active'/imu);
    const ledger = JSON.parse(readFileSync(
      migrationPath("migration-status.json"),
      "utf8",
    )) as { migrations: Array<{ version: string; status: string }> };
    expect(ledger.migrations.find(({ version }) => version === "0003")).toMatchObject({
      version: "0003",
      status: "applied",
    });
    expect(ledger.migrations.find(({ version }) => version === "0004")).toMatchObject({
      version: "0004",
      status: "applied",
    });
  });
});
