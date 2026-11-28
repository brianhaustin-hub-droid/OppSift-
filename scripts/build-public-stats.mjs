#!/usr/bin/env node
/**
 * Generates public/platform-stats.json, the only source the marketing site uses
 * for its figures.
 *
 * Why a file and not a live anonymous query:
 *
 *   - Anonymous visitors have no read access to the opportunity, provenance or
 *     source-registry tables (migration 0057). That is deliberate.
 *   - The public numbers are aggregates anyway, and they change slowly, so a
 *     snapshot regenerated at build time is both safer and faster than shipping
 *     an auth client to every visitor.
 *   - Every field comes from the aggregate views `public_platform_stats`,
 *     `public_market_coverage` and `public_region_coverage`; no notice, buyer
 *     or provider identity is copied into the file.
 *
 * Runs before `vite build` so the file is copied into dist/. If no database is
 * configured in the build environment, the committed snapshot is kept and the
 * build continues; that keeps previews working without credentials.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const target = join(root, 'public', 'platform-stats.json');

function databaseUrl() {
  // The marketing site describes the production platform, so prefer the
  // production branch connection when it is available.
  for (const key of ['DATABASE_URL_UNPOOLED', 'DATABASE_URL']) {
    const value = process.env[key];
    if (value) return value.trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

async function regenerate() {
  const url = databaseUrl();
  if (!url) {
    const existing = await readFile(target, 'utf8').catch(() => null);
    console.log(
      existing
        ? 'public stats: no database configured, keeping the committed snapshot'
        : 'public stats: no database configured and no snapshot present',
    );
    return;
  }

  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 20 });
  try {
    const [statsRows, marketRows, regionRows] = await Promise.all([
      sql`select * from public.public_platform_stats`,
      sql`select code, name, region, notices, sources, active_sources, last_success_at
            from public.public_market_coverage order by notices desc, name asc`,
      sql`select region, markets, markets_with_notices, notices
            from public.public_region_coverage order by notices desc, region asc`,
    ]);
    const stats = statsRows[0];
    const payload = {
      generatedAt: new Date().toISOString(),
      // Named so a reader of the file knows exactly what each figure counts.
      definitions: {
        marketsRegistered: 'Markets in the country registry',
        marketsWithSources: 'Markets with at least one linked source',
        marketsWithNotices: 'Markets holding verified notices',
        verifiedNotices: 'Notices marked valid, source-verified and linked to a verified source',
        registeredSources: 'Source integrations registered in the acquisition registry',
        operationalSources: 'Registered integrations marked operational',
        sourcesCollectedRecently: 'Integrations with a successful retrieval in the last 7 days',
        noticesVerifiedNote:
          'Stored notices that do not meet the verification rules are excluded from every public figure.',
      },
      stats: {
        marketsRegistered: Number(stats.markets_registered),
        marketsWithSources: Number(stats.markets_with_sources),
        marketsWithNotices: Number(stats.markets_with_notices),
        verifiedNotices: Number(stats.notices_verified),
        registeredSources: Number(stats.sources_registered),
        operationalSources: Number(stats.sources_operational),
        sourcesCollectedRecently: Number(stats.sources_collected_7d),
        newestCollectionAt: stats.newest_collection_at,
      },
      markets: marketRows.map((row) => ({
        code: row.code,
        name: row.name,
        region: row.region,
        records: Number(row.notices),
        sources: Number(row.sources),
        activeSources: Number(row.active_sources),
        lastSuccessAt: row.last_success_at,
      })),
      regions: regionRows.map((row) => ({
        region: row.region,
        markets: Number(row.markets),
        marketsWithNotices: Number(row.markets_with_notices),
        records: Number(row.notices),
      })),
    };
    await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(
      `public stats: ${payload.stats.verifiedNotices} verified notices across ${payload.stats.marketsWithNotices} markets, ${payload.stats.operationalSources}/${payload.stats.registeredSources} operational integrations`,
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

await regenerate();
