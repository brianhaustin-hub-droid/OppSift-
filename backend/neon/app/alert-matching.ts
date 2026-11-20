/**
 * Alert matching primitives (backend foundation).
 * Intended to be used by a future worker/job that:
 * 1) loads active alert_subscriptions (+ saved_search filters/criteria)
 * 2) finds newly ingested/updated opportunities matching criteria
 * 3) inserts alert_notifications with dedupe/frequency controls
 *
 * This module provides deterministic in-memory matching helpers; persistence,
 * scheduling, and delivery are not implemented yet.
 */

export type OpportunityLike = {
  id: string;
  title?: string | null;
  countryCode?: string | null;
  categoryCode?: string | null;
  status?: string | null;
  publishedAt?: string | null;
  closingAt?: string | null;
  sourceId?: string | null;
};

export type SearchCriteria = {
  query?: string | null;
  countries?: string[];
  categories?: string[];
  statuses?: string[];
  sourceIds?: string[];
  publishedFrom?: string | null;
  publishedTo?: string | null;
  closingFrom?: string | null;
  closingTo?: string | null;
};

function inRange(value: string | null | undefined, from?: string | null, to?: string | null): boolean {
  if (!value) return !from && !to ? true : !from; // if bounded and missing, be conservative
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  if (from) {
    const f = Date.parse(from);
    if (!Number.isNaN(f) && t < f) return false;
  }
  if (to) {
    const e = Date.parse(to);
    if (!Number.isNaN(e) && t > e) return false;
  }
  return true;
}

export function matchesCriteria(opportunity: OpportunityLike, criteria: SearchCriteria): boolean {
  if (criteria.countries?.length && (!opportunity.countryCode || !criteria.countries.includes(opportunity.countryCode))) return false;
  if (criteria.categories?.length && (!opportunity.categoryCode || !criteria.categories.includes(opportunity.categoryCode))) return false;
  if (criteria.statuses?.length && (!opportunity.status || !criteria.statuses.includes(opportunity.status))) return false;
  if (criteria.sourceIds?.length && (!opportunity.sourceId || !criteria.sourceIds.includes(opportunity.sourceId))) return false;
  if (!inRange(opportunity.publishedAt, criteria.publishedFrom, criteria.publishedTo)) return false;
  if (!inRange(opportunity.closingAt, criteria.closingFrom, criteria.closingTo)) return false;
  if (criteria.query && criteria.query.trim()) {
    const q = criteria.query.trim().toLowerCase();
    const title = (opportunity.title || "").toLowerCase();
    if (!title.includes(q)) return false;
  }
  return true;
}

export function filterMatchingOpportunities(
  opportunities: OpportunityLike[],
  criteria: SearchCriteria,
): OpportunityLike[] {
  return opportunities.filter((o) => matchesCriteria(o, criteria));
}

export type NotificationCandidate = {
  subscriptionId: string;
  organizationId: string;
  opportunityId: string;
  eventType: "new_match" | "deadline_warning" | "status_change" | "digest";
  payload: Record<string, unknown>;
};

export function buildNewMatchCandidates(args: {
  subscriptionId: string;
  organizationId: string;
  matchedOpportunityIds: string[];
}): NotificationCandidate[] {
  return args.matchedOpportunityIds.map((opportunityId) => ({
    subscriptionId: args.subscriptionId,
    organizationId: args.organizationId,
    opportunityId,
    eventType: "new_match",
    payload: { matchedAt: new Date().toISOString() },
  }));
}
