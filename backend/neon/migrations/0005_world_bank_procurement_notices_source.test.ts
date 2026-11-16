import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationDirectory = resolve(process.cwd(), "backend", "neon", "migrations");
const migration = readFileSync(
  resolve(migrationDirectory, "0005_world_bank_procurement_notices_source.sql"),
  "utf8",
);

describe("World Bank source registry migration", () => {
  it("adds only an inactive, unapproved candidate under the existing source registry", () => {
    expect(migration).toMatch(/INSERT INTO public\.opportunity_sources/iu);
    expect(migration).toMatch(/'unreviewed'[\s\S]*'inactive'[\s\S]*'in_development'/iu);
    expect(migration).toMatch(/'review_required'[\s\S]*'review_required'[\s\S]*'unknown'/iu);
    expect(migration).toMatch(/'world-bank-procurement-notices'/iu);
    expect(migration).not.toMatch(/CREATE TABLE/iu);
    expect(migration).not.toMatch(/'approved'|'active'|'operational'/iu);
  });

  it("avoids duplicating a source already registered by ID or official name", () => {
    expect(migration).toMatch(/WHERE NOT EXISTS[\s\S]*WHERE id =[\s\S]*OR name = 'World Bank Procurement Notices'/iu);
    const ledger = JSON.parse(readFileSync(
      resolve(migrationDirectory, "migration-status.json"),
      "utf8",
    )) as { migrations: Array<{ version: string; status: string }> };
    expect(ledger.migrations.find(({ version }) => version === "0005")).toMatchObject({
      version: "0005",
      status: "applied",
    });
  });
});
