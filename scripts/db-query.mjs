#!/usr/bin/env node
// Read-only diagnostic helper: runs a SQL file against the Neon database
// using DATABASE_URL from .env.local and prints the rows as JSON.
//
//   node scripts/db-query.mjs path/to/query.sql

import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("usage: node scripts/db-query.mjs <query.sql>");
  process.exit(2);
}

const envPath = path.resolve(process.cwd(), ".env.local");
const env = {};
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
if (!url) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 30 });
try {
  const rows = await sql.unsafe(fs.readFileSync(path.resolve(process.cwd(), sqlFile), "utf8"));
  console.log(JSON.stringify(rows, null, 1));
} finally {
  await sql.end();
}
