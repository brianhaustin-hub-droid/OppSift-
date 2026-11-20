#!/usr/bin/env node
// Backfill opportunities.dedupe_key using the EXACT same algorithm as
// contracts.ts computeDedupeKey (FNV-1a 16-hex fingerprint, conservative
// notice-identity key). Reads DATABASE_URL from .env.local.
//
// Safety: this script is a DRY RUN unless --apply is passed.
//   node scripts/backfill-dedupe-keys.mjs           # report what would change
//   node scripts/backfill-dedupe-keys.mjs --apply   # write dedupe_key values
//
// The key derivation helpers below are exported so
// backend/neon/intelligence/dedupe-key-parity.test.ts can prove this script and
// the serving path compute byte-identical keys. Importing this module performs
// no I/O: the env read, connection and batching all live inside the entry point.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

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

export { fingerprint, normalizeDedupeText, computeDedupeKey };

const BATCH_SIZE = 1000;

function loadDatabaseUrl() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(`Cannot read ${envPath}; create it with DATABASE_URL=<neon connection string>.`);
  }
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
  if (!url) throw new Error(`DATABASE_URL missing from ${envPath}`);
  return url;
}

/**
 * Populate `dedupe_key` for rows that do not have one yet.
 * Writes nothing unless `apply` is true.
 */
export async function backfillDedupeKeys({ apply = false, batchSize = BATCH_SIZE } = {}) {
  const url = loadDatabaseUrl();
  const sql = postgres(url, { max: apply ? 20 : 1, connect_timeout: 30 });
  const summary = { apply, scanned: 0, keyable: 0, unkeyable: 0, updated: 0, batches: 0, remaining: 0 };
  try {
    const [{ n: total }] = await sql`
      SELECT count(*)::int AS n FROM public.opportunities WHERE dedupe_key IS NULL
    `;
    summary.remaining = Number(total);
    console.log(`${apply ? "APPLY" : "DRY RUN"}: ${summary.remaining} opportunities have no dedupe_key.`);

    for (;;) {
      // Dry runs do not modify rows, so a second batch would return the same
      // rows; scan one batch and report.
      if (!apply && summary.batches >= 1) break;
      const rows = await sql`
        SELECT id, country_code, title, procuring_organization,
               issuing_institution, publisher, closing_at
        FROM public.opportunities
        WHERE dedupe_key IS NULL
        ORDER BY first_discovered_at
        LIMIT ${batchSize}
      `;
      if (rows.length === 0) break;
      summary.batches += 1;
      summary.scanned += rows.length;

      let batchUpdates = 0;
      for (const row of rows) {
        // Same inputs the serving path sees: buyer resolved through the same
        // fallback chain, deadline normalised to a UTC ISO timestamp.
        const key = computeDedupeKey({
          countryCode: row.country_code,
          title: row.title,
          procuringOrganization: row.procuring_organization,
          issuingInstitution: row.issuing_institution,
          publisher: row.publisher,
          closingAt: row.closing_at === null ? null : new Date(row.closing_at).toISOString(),
        });
        if (key === null) {
          summary.unkeyable += 1;
          continue;
        }
        summary.keyable += 1;
        if (!apply) continue;
        await sql`
          UPDATE public.opportunities
          SET dedupe_key = ${key}
          WHERE id = ${row.id} AND dedupe_key IS NULL
        `;
        batchUpdates += 1;
        summary.updated += 1;
      }

      // Rows that cannot be keyed conservatively (missing country/buyer/title)
      // stay NULL forever. Without this guard the loop would re-read them
      // indefinitely — the previous recursive version looped forever here.
      if (apply && batchUpdates === 0) {
        console.warn("Stopping: batch made no progress; remaining rows are unkeyable as-is.");
        break;
      }
      if (!apply) break;
    }

    if (apply) {
      const [{ n: left }] = await sql`
        SELECT count(*)::int AS n FROM public.opportunities WHERE dedupe_key IS NULL
      `;
      summary.remaining = Number(left);
    }
    return summary;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main(argv) {
  const apply = argv.includes("--apply");
  const unknown = argv.filter((arg) => arg !== "--apply");
  if (unknown.length > 0) {
    console.error(`Unknown argument(s): ${unknown.join(" ")}. Use --apply to write.`);
    process.exitCode = 2;
    return;
  }
  try {
    const summary = await backfillDedupeKeys({ apply });
    console.log(
      `${summary.apply ? "Updated" : "Would update"} ${summary.apply ? summary.updated : summary.keyable}`
      + ` of ${summary.scanned} scanned rows`
      + ` (${summary.unkeyable} unkeyable, ${summary.remaining} still NULL).`,
    );
    if (!summary.apply && summary.remaining > 0) {
      console.log("Dry run only. Re-run with --apply to write these keys.");
    }
  } catch (err) {
    console.error("Backfill failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;
if (invokedDirectly) {
  await main(process.argv.slice(2));
}
