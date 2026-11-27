#!/usr/bin/env node
// Seeds public.source_leads with the per-country lead inventory.
//
//   node scripts/seed-source-leads.mjs                  # DATABASE_URL (dev branch)
//   SEED_DATABASE_URL=postgres://... node scripts/...   # any explicit target
//
// Lead rows are unverified named buying functions. They are never sources: no
// notice is ingested from them and they are excluded from coverage counts.
// The seed is idempotent and only inserts missing (country_code, name) pairs, so
// re-running it never duplicates or overwrites reviewed rows.

import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { buildCountryLeads } from '../backend/neon/intelligence/lead-inventory.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

function readDatabaseUrl() {
  if (process.env.SEED_DATABASE_URL) return process.env.SEED_DATABASE_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('No SEED_DATABASE_URL, DATABASE_URL or .env.local found');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)$/.exec(line);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found in .env.local');
}

const sql = postgres(readDatabaseUrl(), { max: 1, connect_timeout: 30 });

try {
  const table = await sql`
    select to_regclass('public.source_leads')::text as name
  `;
  if (!table[0]?.name) {
    throw new Error('public.source_leads does not exist: apply migration 0052 first');
  }

  const countries = await sql`
    select alpha2_code from public.global_countries order by alpha2_code
  `;

  let inserted = 0;
  await sql.begin(async (tx) => {
    for (const { alpha2_code: code } of countries) {
      const leads = buildCountryLeads(code);
      const rows = leads.map((lead) => ({
        country_code: lead.countryCode,
        name: lead.name,
        lead_kind: lead.kind,
        sector: lead.sector,
        status: lead.status,
        official_website: lead.officialWebsite,
        discovery_basis: lead.discoveryBasis,
        sort_order: lead.sortOrder,
      }));
      const result = await tx`
        insert into public.source_leads ${tx(
          rows,
          'country_code',
          'name',
          'lead_kind',
          'sector',
          'status',
          'official_website',
          'discovery_basis',
          'sort_order',
        )}
        on conflict (country_code, name) do nothing
        returning 1
      `;
      inserted += result.length;
    }
  });

  const [summary] = await sql`
    select
      count(*)::int as leads,
      count(distinct country_code)::int as countries,
      min(per_country)::int as min_per_country,
      max(per_country)::int as max_per_country
    from (
      select country_code, count(*)::int as per_country
      from public.source_leads
      group by country_code
    ) grouped
  `;
  console.log(`inserted ${inserted} new leads`);
  console.log(
    `inventory: ${summary.leads} leads across ${summary.countries} countries ` +
      `(min ${summary.min_per_country}, max ${summary.max_per_country} per country)`,
  );
} finally {
  await sql.end();
}
