#!/usr/bin/env node
// Backfill opportunities.dedupe_key using the EXACT same algorithm as
// contracts.ts computeDedupeKey (FNV-1a 16-hex fingerprint, conservative
// notice-identity key). Reads DATABASE_URL from .env.local.

import { createClient } from "@neon/neon-js";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";

// ---- Inline FNV-1a fingerprint (16-hex) ----
function fingerprint(input) {
  let hash = 0xcbf29ce484222325n;  // FNV offset basis, 64-bit
  const mask = 0xffffffffffffffffn;  // 64-bit mask
  for (let index = 0; index < input.length; index += 1) {
    hash ^= BigInt(input.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & mask;  // FNV prime
  }
  return hash.toString(16).padStart(16, "0");
}

// ---- NFKC normalize (same as contracts.ts normalizeDedupeText) ----
function normalizeDedupeText(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- Compute dedupe key (exact copy of contracts.ts computeDedupeKey) ----
function computeDedupeKey(record) {
  const normalizedTitle = normalizeDedupeText(record.title);
  const buyer =
    record.procuringOrganization ?? record.issuingInstitution ?? record.publisher;
  const normalizedBuyer = normalizeDedupeText(buyer);
  if (!normalizedTitle || !normalizedBuyer) return null;
  const closingBucket = record.closingAt ? record.closingAt.slice(0, 10) : "none";
  const identity = [
    record.countryCode,
    normalizedTitle,
    normalizedBuyer,
    closingBucket,
  ].join("|");
  return `dk1_${fingerprint(identity)}`;
}

// ---- DB entry point ----
const envPath = path.resolve(process.cwd(), ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = /^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[match[1]] = value;
}
const url = env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL missing"); process.exit(1); }

const sql = postgres(url, { max: 100, connect_timeout: 30 });

try {
  const rows = await sql`
    SELECT id, country_code, title, procuring_organization,
           issuing_institution, publisher, closing_at
    FROM public.opportunities
    WHERE dedupe_key IS NULL
    ORDER BY first_discovered_at
    LIMIT 1000
  `;
  console.log(`Rows missing dedupe_key (batch): ${rows.length}`);
  if (rows.length === 0) { console.log("Nothing to backfill."); process.exit(0); }

  let updated = 0;
  for (const row of rows) {
    const key = computeDedupeKey({
      countryCode: row.country_code,
      title: row.title,
      procuringOrganization: row.procuring_organization,
      issuingInstitution: row.issuing_institution,
      publisher: row.publisher,
      closingAt: row.closing_at === null ? null : new Date(row.closing_at).toISOString(),
    });
    if (key === null) continue;
    await sql`
      UPDATE public.opportunities
      SET dedupe_key = ${key}
      WHERE id = ${row.id} AND dedupe_key IS NULL
    `;
    updated += 1;
  }
  console.log(`Updated ${updated} dedupe keys in this batch.`);

  // Recurse for remaining rows
  const next = await sql`
    SELECT count(*) AS n FROM public.opportunities WHERE dedupe_key IS NULL
  `;
  if (Number(next[0].n) > 0) {
    await arguments.callee();
  } else {
    console.log("All opportunities now have dedupe_key populated.");
  }
} catch (err) {
  console.error("Backfill failed:", err);
} finally {
  await sql.end({ timeout: 5 });
}