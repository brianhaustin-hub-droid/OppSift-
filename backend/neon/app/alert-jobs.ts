import type { OpportunityLike, SearchCriteria } from "./alert-matching";
import { buildNewMatchCandidates, filterMatchingOpportunities } from "./alert-matching";

/**
 * Alert generation job scaffold (backend foundation).
 *
 * Intended execution model (future): scheduled worker/cron or queue consumer that
 * 1) selects active alert_subscriptions (+ saved_search filters) due for evaluation
 * 2) queries candidate opportunities (new/updated since last_notified_at / window)
 * 3) matches via alert-matching primitives
 * 4) inserts alert_notifications with dedupe (subscription_id + opportunity_id + event_type window)
 * 5) updates last_notified_at / schedules delivery
 *
 * Persistence, delivery, and scheduling are not implemented yet.
 */

export type AlertSubscriptionRecord = {
  id: string;
  organizationId: string;
  savedSearchId?: string | null;
  opportunityId?: string | null;
  status: "active" | "paused" | "archived";
  frequency: "immediate" | "daily" | "weekly";
  criteria: SearchCriteria | Record<string, unknown>;
  lastNotifiedAt?: string | null;
};

export type SavedSearchRecord = {
  id: string;
  filters: SearchCriteria | Record<string, unknown>;
};

export function resolveSubscriptionCriteria(
  subscription: AlertSubscriptionRecord,
  savedSearch?: SavedSearchRecord | null,
): SearchCriteria {
  const fromSearch = (savedSearch?.filters || {}) as SearchCriteria;
  const fromSub = (subscription.criteria || {}) as SearchCriteria;
  return { ...fromSearch, ...fromSub };
}

export function evaluateSubscriptionMatches(args: {
  subscription: AlertSubscriptionRecord;
  savedSearch?: SavedSearchRecord | null;
  opportunities: OpportunityLike[];
}) {
  const criteria = resolveSubscriptionCriteria(args.subscription, args.savedSearch);
  const matched = filterMatchingOpportunities(args.opportunities, criteria);
  const candidates = buildNewMatchCandidates({
    subscriptionId: args.subscription.id,
    organizationId: args.subscription.organizationId,
    matchedOpportunityIds: matched.map((o) => o.id),
  });
  return { criteria, matched, candidates };
}

export const ALERT_CANDIDATE_OPPORTUNITIES_SQL = `
  -- Example candidate query (to be refined with cursors/windows/indexes):
  -- select id, title, country_code as "countryCode", category_code as "categoryCode",
  --        status, published_at as "publishedAt", closing_at as "closingAt"
  -- from public.opportunities
  -- where updated_at >= $1
  -- order by updated_at asc
  -- limit $2;
`;

export const ALERT_DEDUPE_INSERT_HINT = `
  -- Dedupe strategy (future): unique constraint or NOT EXISTS guard on
  -- (subscription_id, opportunity_id, event_type, date bucket / recent window)
  -- before inserting into public.alert_notifications.
`;
