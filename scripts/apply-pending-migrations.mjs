import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "backend", "neon", "migrations");
const STATUS_FILE = process.env.MIGRATION_STATUS_FILE
  ? path.resolve(ROOT, process.env.MIGRATION_STATUS_FILE)
  : path.join(MIGRATIONS_DIR, "migration-status.json");
const BACKUP_DIR = path.join(ROOT, "scripts", "migration-backups");

const SNAPSHOT_TABLES = [
  "opportunity_sources",
  "opportunity_source_records",
  "source_country_coverage",
  "country_classification_mappings",
  "opportunities",
  "ingestion_runs",
];

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("DATABASE_URL not found in .env.local");
}

async function snapshot(sql, stamp) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const target = path.join(BACKUP_DIR, `pre-${stamp}.json`);
  const payload = {};
  for (const table of SNAPSHOT_TABLES) {
    const exists = await sql`
      SELECT to_regclass(${`public.${table}`})::text AS name
    `;
    if (!exists[0].name) continue;
    const rows = await sql.unsafe(`SELECT * FROM public.${table}`);
    payload[table] = rows;
  }
  fs.writeFileSync(target, JSON.stringify(payload, null, 2));
  const totals = Object.entries(payload)
    .map(([table, rows]) => `${table}=${rows.length}`)
    .join(" ");
  console.log(`snapshot -> ${target} (${totals || "no snapshot tables present"})`);
}

const status = JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
const pending = status.migrations.filter((m) => m.status === "pending");
if (pending.length === 0) {
  console.log("no pending migrations");
  process.exit(0);
}

const sql = postgres(readDatabaseUrl(), { max: 1, connect_timeout: 30 });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

try {
  await snapshot(sql, stamp);

  for (const migration of pending) {
    const file = path.join(MIGRATIONS_DIR, migration.file);
    const body = fs.readFileSync(file, "utf8");
    console.log(`applying ${migration.version} (${migration.file})...`);
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
    });
    migration.status = "applied";
    migration.appliedAt = new Date().toISOString();
    console.log(`  applied ${migration.version}`);
  }

  fs.writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2) + "\n");
  console.log(`updated ${path.relative(ROOT, STATUS_FILE)}`);
} finally {
  await sql.end();
}
