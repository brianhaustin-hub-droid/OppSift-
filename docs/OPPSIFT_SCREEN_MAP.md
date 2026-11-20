# OppSift screen map — post-reset state (18 Nov 2026)

The previous screen implementations were removed in the controlled frontend reset. Every preserved URL now renders a minimal placeholder boundary and keeps its authentication/permission semantics. There are no mock dashboards and no fabricated metrics anywhere in the UI.

## Preserved routes (all render placeholders)

Public: `/ /product /opportunities /markets /sources /solutions /how-it-works /about /contact`
Auth: `/login /register /forgot-password /reset-password /verify-email`
Workspace (account-gated where marked `protected`): `/dashboard (protected)` · `/discover` · `/discover/government` · `/discover/grants` · `/discover/commercial` · `/discover/search` · `/discover/country/:code` · `/opportunity/:id[/section]` · `/saved (protected)` · `/saved-searches` · `/search-history` · `/my-opportunities` · `/my-opportunities/:id` · `/intelligence` · `/alerts (protected)` · `/analytics (protected)` · `/teams (protected)` · `/accept-invitation` · `/settings (protected)` · `/backend-status` · `/admin` · `/admin/sources` · `/admin/coverage` · `/admin/ingestion` · `/admin/quality` · `/admin/source/:id` · `/support`.

## What each placeholder contains

- `src/features/placeholder/ScreenPlaceholder.tsx` — "Temporary screen placeholder", route path, note that routing/auth/data services remain active, "Stitch integration pending".
- `src/app/auth/AuthScreenPlaceholder.tsx` — "Authentication screen placeholder" (Neon Managed Auth / Google OAuth / email OTP / password policy retained).
- Protected routes are wrapped by `AuthenticationRequired` in `src/app/App.tsx` (sign-in / email-verification gates preserved).

## Where the real screens went

- Removed (44 files): public pages, auth screens, workspace pages, organisations pages, backend-status page, shell, screen-specific CSS, and their tests.
- Preserved services for Stitch (unchanged): `opportunity-feed.ts`, `coverage-truth.ts`, `market-summary.ts`, `auth-ready.ts`, `country-registry.ts`, `organization-service.ts`, `user-profile-service.ts`, all of `backend/neon/`, all of `functions/`, Neon client/auth, Cloudflare config.
- Preserved shared primitives: `src/shared/ui/`, `src/app/theme.css` (approved Burgundy Executive / Global Intelligence tokens).

## Back-end connections still available to Stitch

- `fetchLiveOpportunities` / `fetchLiveOpportunity` / `fetchLiveOpportunitiesByIds` / `fetchActiveSourceCount` → Neon `opportunities`, `opportunity_sources`.
- `useCoverageTruth` → `coverage_truth` view; `useMarketSummary` → `market_intelligence_summary`; `useVerifiedSources` / `useCountrySources` → `opportunity_sources` + `source_country_coverage`.
- `organization-service.ts` RPCs: members list, pending invitations, issue/revoke/accept/decline invitation, change role, remove member, transfer ownership.
- `user-profile-service.ts`: `user_profiles` load/save.
- `organization-service.ts` + `OrganizationProvider`: organisations, memberships, active org.

See `docs/OPPSIFT_STITCH_INTEGRATION_PLAN.md` for integration order and rules.
