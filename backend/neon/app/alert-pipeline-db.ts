/**
 * DB-backed alert pipeline scaffold (step 3).
 * Provides SQL/query helpers and an execution outline for generating
 * alert_notifications from active subscriptions. Not wired into production
 * scheduling/delivery yet.
 */

export const ACTIVE_SUBSCRIPTIONS_SQL = `
  SELECT
    a.id,
    a.organization_id AS "organizationId",
    a.saved_search_id AS "savedSearchId",
    a.opportunity_id AS "opportunityId",
    a.status,
    a.frequency,
    a.criteria,
    a.last_notified_at AS "lastNotifiedAt",
    s.filters AS "savedSearchFilters"
  FROM public.alert_subscriptions a
  LEFT JOIN public.saved_searches s ON s.id = a.saved_search_id
  WHERE a.status = 'active'
  ORDER BY a.updated_at DESC
`;

export const CANDIDATE_OPPORTUNITIES_SQL = `
  SELECT
    o.id,
    o.title,
    o.country_code AS "countryCode",
    o.category_code AS "categoryCode",
    o.status,
    o.published_at AS "publishedAt",
    o.closing_at AS "closingAt",
    r.source_id AS "sourceId"
  FROM public.opportunities o
  LEFT JOIN public.opportunity_source_records r ON r.opportunity_id = o.id
  WHERE o.updated_at >= COALESCE($1::timestamptz, NOW() - INTERVAL '7 days')
  GROUP BY o.id, r.source_id
  ORDER BY o.updated_at DESC
  LIMIT COALESCE($2::int, 500)
`;

export const INSERT_NOTIFICATION_SQL = `
  INSERT INTO public.alert_notifications
    (subscription_id, organization_id, opportunity_id, event_type, payload, delivery_status, scheduled_for)
  SELECT $1::uuid, $2::uuid, $3::uuid, $4::text, $5::jsonb, 'pending', NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.alert_notifications n
    WHERE n.subscription_id = $1::uuid
      AND n.opportunity_id IS NOT DISTINCT FROM $3::uuid
      AND n.event_type = $4::text
      AND n.created_at >= NOW() - INTERVAL '7 days'
  )
  RETURNING id
`;

export const TOUCH_SUBSCRIPTION_NOTIFIED_SQL = `
  UPDATE public.alert_subscriptions
  SET last_notified_at = NOW(), updated_at = NOW()
  WHERE id = $1::uuid
`;

export const ALERT_PIPELINE_NOTES = [
  "Run in trusted backend context with DB access; respect RLS boundaries if using user-scoped execution.",
  "Use frequency windows (immediate/daily/weekly) and per-subscription cursors to limit scans.",
  "Dedupe insert guard is a baseline; consider unique constraints for stronger guarantees.",
  "Delivery (email/in-app) should consume pending notifications idempotently and record sent/failed states.",
] as const;
