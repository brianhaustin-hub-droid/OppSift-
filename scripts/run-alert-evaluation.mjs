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

function normalizeCriteria(subscription, savedSearchFilters) {
  const c = { ...(savedSearchFilters || {}), ...(subscription.criteria || {}) };
  // Accept common shapes
  return {
    query: c.query ?? c.q ?? null,
    countries: Array.isArray(c.countries) ? c.countries : (c.country ? [c.country] : []),
    categories: Array.isArray(c.categories) ? c.categories : (c.category ? [c.category] : []),
    statuses: Array.isArray(c.statuses) ? c.statuses : (c.status ? [c.status] : []),
    sourceIds: Array.isArray(c.sourceIds) ? c.sourceIds : [],
  };
}

function matches(opportunity, criteria) {
  if (criteria.countries?.length && (!opportunity.countryCode || !criteria.countries.includes(opportunity.countryCode))) return false;
  if (criteria.categories?.length && (!opportunity.categoryCode || !criteria.categories.includes(opportunity.categoryCode))) return false;
  if (criteria.statuses?.length && (!opportunity.status || !criteria.statuses.includes(opportunity.status))) return false;
  if (criteria.sourceIds?.length && (!opportunity.sourceId || !criteria.sourceIds.includes(opportunity.sourceId))) return false;
  if (criteria.query && String(criteria.query).trim()) {
    const q = String(criteria.query).trim().toLowerCase();
    const hay = `${opportunity.title || ""} ${opportunity.referenceNumber || ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

const LOOKBACK_DAYS = Number(process.env.ALERT_LOOKBACK_DAYS || 7);
const CANDIDATE_LIMIT = Number(process.env.ALERT_CANDIDATE_LIMIT || 500);
const DRY_RUN = process.argv.includes("--dry-run");

const sql = postgres(readDatabaseUrl(), { max: 1, connect_timeout: 30 });

async function main() {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const subscriptions = await sql`
    SELECT a.id, a.organization_id AS "organizationId", a.saved_search_id AS "savedSearchId",
           a.opportunity_id AS "opportunityId", a.status, a.frequency, a.criteria,
           a.last_notified_at AS "lastNotifiedAt", s.filters AS "savedSearchFilters"
    FROM public.alert_subscriptions a
    LEFT JOIN public.saved_searches s ON s.id = a.saved_search_id
    WHERE a.status = 'active'
    ORDER BY a.updated_at DESC
    LIMIT 500
  `;

  const opportunities = await sql`
    SELECT
      o.id,
      o.title,
      o.country_code AS "countryCode",
      o.category_code AS "categoryCode",
      o.status,
      o.published_at AS "publishedAt",
      o.closing_at AS "closingAt",
      o.reference_number AS "referenceNumber",
      min(r.source_id::text) AS "sourceId",
      max(o.updated_at) AS "updatedAt"
    FROM public.opportunities o
    LEFT JOIN public.opportunity_source_records r ON r.opportunity_id = o.id
    WHERE o.updated_at >= ${since}::timestamptz
    GROUP BY o.id
    ORDER BY max(o.updated_at) DESC
    LIMIT ${CANDIDATE_LIMIT}
  `;

  let evaluated = 0;
  let matched = 0;
  let inserted = 0;

  for (const sub of subscriptions) {
    evaluated++;
    const criteria = normalizeCriteria(sub, sub.savedSearchFilters);
    let candidates = opportunities;

    // Direct opportunity watch
    if (sub.opportunityId) {
      candidates = opportunities.filter((o) => o.id === sub.opportunityId);
    }

    const hits = candidates.filter((o) => matches(o, criteria));
    matched += hits.length;

    for (const opp of hits) {
      // Dedupe: same subscription/opportunity/event within lookback window
      const existing = await sql`
        SELECT 1 FROM public.alert_notifications
        WHERE subscription_id = ${sub.id}::uuid
          AND opportunity_id = ${opp.id}::uuid
          AND event_type = 'new_match'
          AND created_at >= ${since}::timestamptz
        LIMIT 1
      `;
      if (existing.length) continue;

      if (DRY_RUN) {
        inserted++;
        continue;
      }

      const payload = {
        matchedAt: new Date().toISOString(),
        opportunityId: opp.id,
        title: opp.title,
        countryCode: opp.countryCode,
        source: "run-alert-evaluation",
      };
      const ins = await sql`
        INSERT INTO public.alert_notifications
          (subscription_id, organization_id, opportunity_id, event_type, payload, delivery_status, scheduled_for)
        VALUES (${sub.id}::uuid, ${sub.organizationId}::uuid, ${opp.id}::uuid, 'new_match', ${sql.json(payload)}::jsonb, 'pending', NOW())
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      if (ins.length) inserted++;
    }

    if (!DRY_RUN && hits.length) {
      await sql`UPDATE public.alert_subscriptions SET last_notified_at = NOW(), updated_at = NOW() WHERE id = ${sub.id}::uuid`;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun: DRY_RUN,
    since,
    subscriptions: subscriptions.length,
    evaluated,
    candidateOpportunities: opportunities.length,
    matchedPairs: matched,
    notificationsInserted: inserted,
    note: "Idempotent dedupe by (subscription, opportunity, new_match, lookback). Delivery sending not implemented.",
  }, null, 2));
}

try {
  await main();
} finally {
  await sql.end();
}
