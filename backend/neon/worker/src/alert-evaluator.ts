import type { AlertSubscriptionRecord, SavedSearchRecord } from "../../app/alert-jobs";
import { evaluateSubscriptionMatches } from "../../app/alert-jobs";
import type { OpportunityLike } from "../../app/alert-matching";

/**
 * Alert evaluation scaffold for ingestion/worker integration (step 3 foundation).
 *
 * Future integration points:
 * - after successful ingestion runs, load active subscriptions affected by
 *   source/country/category updates and candidate opportunities
 * - evaluate matches, dedupe, insert alert_notifications, update last_notified_at
 * - enqueue delivery by channel/frequency
 *
 * Not wired into orchestration yet.
 */

export type AlertEvaluationInput = {
  subscription: AlertSubscriptionRecord;
  savedSearch?: SavedSearchRecord | null;
  opportunities: OpportunityLike[];
};

export function evaluateAlertsBatch(inputs: AlertEvaluationInput[]) {
  return inputs.map((input) => evaluateSubscriptionMatches(input));
}

export const ALERT_EVALUATION_TODO = [
  "Query active subscriptions + saved searches (0034) due by frequency/window",
  "Select candidate opportunities since cursor/last_notified_at",
  "Dedupe (subscription, opportunity, event_type, window) before insert",
  "Persist alert_notifications and update last_notified_at transactionally",
  "Schedule/send delivery and record delivery_status/errors",
] as const;
