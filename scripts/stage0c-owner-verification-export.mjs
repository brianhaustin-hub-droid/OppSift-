#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function readDatabaseUrl() {
  const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)$/);
    if (match) return match[1].trim().replace(/^['"]|['"]$/g, "");
  }
  throw new Error("DATABASE_URL not found in .env.local");
}

const limit = Number(process.argv[2] || 20);
const sql = postgres(readDatabaseUrl(), { max: 1, connect_timeout: 30 });

try {
  const rows = await sql`
    SELECT
      row_number() OVER (ORDER BY coalesce(o.published_at, o.updated_at) DESC NULLS LAST, o.id DESC)::int AS sample_no,
      s.connector_identifier,
      r.external_record_id,
      r.source_url,
      o.id AS opportunity_id,
      o.title,
      o.reference_number,
      coalesce(o.procuring_organization, o.buyer_name, o.issuing_institution) AS organization,
      o.status,
      o.published_at,
      o.closing_at,
      o.canonical_url,
      o.canonical_key
    FROM public.opportunity_source_records r
    JOIN public.opportunity_sources s ON s.id = r.source_id
    JOIN public.opportunities o ON o.id = r.opportunity_id
    WHERE s.connector_identifier = 'kenya-ppip-api' OR s.connector_identifier LIKE 'planned-ke-%'
    GROUP BY s.connector_identifier, r.external_record_id, r.source_url, o.id
    ORDER BY coalesce(o.published_at, o.updated_at) DESC NULLS LAST, o.id DESC
    LIMIT ${limit}
  `;

  const out = {
    generatedAt: new Date().toISOString(),
    scope: "Kenya (kenya-ppip-api + planned-ke-*)",
    purpose: "Stage 0c owner verification sample (DB-evidenced). Owner must confirm source accuracy and discover/UI visibility as required.",
    count: rows.length,
    records: rows,
  };

  const target = path.join(process.cwd(), "docs", "STAGE_0C_OWNER_VERIFICATION_SAMPLE.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ok: true, target, count: rows.length }, null, 2));
} finally {
  await sql.end();
}
