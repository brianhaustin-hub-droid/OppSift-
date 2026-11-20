# App domain backend foundations

This folder contains backend/domain contracts and scaffolding for product
features that were not fully worked on before UI screens are connected.

## Added in this pass (draft foundations)
- **0033_user_onboarding_and_preferences.sql**: per-user onboarding/profile
  preferences (`user_onboarding`) with RLS.
- **0034_saved_searches_and_alerts.sql**: `saved_searches`,
  `alert_subscriptions`, `alert_notifications` (tenant-scoped).
- **0035_applications_pipeline.sql**: `opportunity_applications` and
  `opportunity_application_events` (pipeline tracking).
- **0036_product_analytics_and_support.sql**: `product_events` and
  `support_requests`.
- **0037_app_domain_rpcs.sql**: draft RPCs for onboarding upsert/get, saved
  searches and alert subscriptions list/create, applications list/upsert,
  support request create, and sources/coverage summary read model.
- **0038_app_domain_rpcs_more.sql**: draft RPCs for notification reads,
  alert subscription status updates, saved search delete, and support request
  listing.
- **0039_saved_opportunities_and_profile_rpcs.sql**: draft RPCs for
  saved-opportunities list/upsert/delete (existing table) and profile get/upsert.
- **contracts.ts**: zod schemas/types for onboarding, saved searches, alerts,
  applications, analytics events, support, and coverage summary shapes.
- **coverage.ts**: evidence-backed coverage summary helpers/SQL for server-side
  use (no "working/active" claims without DB evidence).
- **alert-matching.ts**: deterministic matching/candidate-building primitives
  for future alert generation jobs (no persistence/delivery yet).
- **alert-jobs.ts**: alert evaluation/generation job scaffold (candidate query,
  dedupe, scheduling/delivery still to implement).
- **Pages Functions (scaffolds/endpoints)**: `functions/api/app/coverage.ts`
  (DB-backed read), `support.ts`, `onboarding.ts`, `saved-searches.ts`,
  `alerts.ts`, `applications.ts`, `events.ts`, `saved-opportunities.ts`,
  `settings.ts` with shared helpers in `functions/api/_lib/*` (validation and
  integration points; authenticated session/tenant wiring and full CRUD still
  required for protected ops).

## Status / next required steps
- Migrations `0033–0037` are **drafts pending review and application on Neon
  development** (then validated before production), following existing process.
  DB connectivity timed out in prior checks (`ETIMEDOUT`), so apply/verify when
  reachable.
- App-facing HTTP/functions exposure and full CRUD/RPC coverage (update/delete,
  notification reads, saved opportunities wiring, richer settings/teams flows)
  still need implementation/refinement; UI can connect once endpoints and DB are
  ready.
- Background logic not yet implemented: alert matching/generation/delivery jobs,
  analytics aggregation/views as needed.
- `organization_saved_opportunities` exists (0002); align API patterns with it.
- Teams/org basics exist (0001) but may need additional product-specific endpoints.

## Notes
- RLS/RPCs assume helpers like `public.is_organization_member(...)`,
  `public.current_verified_user_email()`, and `auth.user_id()` from prior
  migrations; validate grants/behavior on dev.
- Keep source/coverage status **evidence-backed** (records, runs, health/errors).
