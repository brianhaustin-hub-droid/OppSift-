# OppSift — Google Stitch integration plan

This document explains how the Google Stitch screens will be integrated into the existing production application after the controlled frontend reset (18 Nov 2026).

## Ground rule

Stitch supplies **screens**. It does not supply routing, authentication, providers, database access, ingestion, or business logic. Any Stitch component that talks directly to the network/database is wrong for this codebase — wire it to the services below instead.

## Preserved infrastructure (do not rebuild)

| Layer | Path | Notes |
|---|---|---|
| Routing | `src/app/routing/routes.ts`, `src/app/routing/router.tsx`, `src/app/route-titles.ts` | All existing URL identities are preserved. `resolveRoute()` maps every path to a route kind; `getPageTitle()` supplies document titles. Do not introduce a second router. |
| Authentication | `src/app/auth/AuthProvider.tsx`, `neon-client.ts`, `OAuthButtons.tsx`, `OtpInput.tsx`, `password-policy.ts`, `otp-resend-cooldown.ts` | Neon Managed Auth, Google OAuth, email OTP, password policy and session state are unchanged. Protected-route handling lives in `AuthenticationRequired` inside `src/app/App.tsx`. |
| Providers | `AuthProvider`, `OrganizationProvider` (`src/app/organizations/OrganizationProvider.tsx`) | Mounted in `src/app/App.tsx` in that order. Organization memberships, create/update and active-org state are preserved. |
| Data services | `src/features/opportunities/` (`opportunity-feed.ts`, `coverage-truth.ts`, `market-summary.ts`, `auth-ready.ts`, `country-registry.ts`) | These are the only sanctioned path from UI to the Neon Data API for opportunities/coverage. |
| Organization & account services | `src/features/organizations/organization-service.ts`, `src/features/account/user-profile-service.ts` | Team members, invitations (issue/revoke/accept/decline/change role/remove/transfer) and `user_profiles` load/save. |
| Backend intelligence | `backend/neon/` (migrations, worker, connectors, ingestion) | Untouched. |
| Diagnostics | `src/app/diagnostics/backend-health.ts` | Connection checks for local dev; the old presentation screen is removed. |
| Shared UI primitives | `src/shared/ui/` (`components.tsx`, `feedback.tsx`, `BrandLogo.tsx`, `primitives.css`) | Kept. Stitch screens may reuse or be migrated off these incrementally. |
| Theme | `src/app/theme.css` | Approved Burgundy Executive / Global Intelligence tokens. Placeholders use them minimally. |

## Route inventory (preserved URLs)

All URLs from the pre-reset application remain valid. Each currently renders a minimal placeholder (`ScreenPlaceholder` / `AuthScreenPlaceholder`) and keeps the original auth guard/permission status:

`/ /product /opportunities /markets /sources /solutions /how-it-works /about /contact` · auth (`/login /register /forgot-password /reset-password /verify-email`) · `/dashboard` · `/discover` · `/discover/government` · `/discover/grants` · `/discover/commercial` · `/discover/search` · `/discover/country/:code` · `/opportunity/:id[/section]` · `/saved` · `/saved-searches` · `/search-history` · `/my-opportunities` · `/my-opportunities/:id` · `/intelligence` · `/alerts` · `/analytics` · `/teams` · `/accept-invitation` · `/settings` · `/backend-status` · `/admin` · `/admin/sources` · `/admin/coverage` · `/admin/ingestion` · `/admin/quality` · `/admin/source/:id` · `/support`.

## How a Stitch screen integrates

1. Drop the Stitch component into `src/features/<area>/` (e.g. `dashboard/stitch-dashboard.tsx`). Keep it presentational.
2. In `src/app/App.tsx`, replace the single `<ScreenPlaceholder>` for that route with the new component, inside the existing `<AuthenticationRequired>` guard when the route is protected.
3. Wire data through the services table above. Example shapes:
   - Opportunities list → `fetchLiveOpportunities({ category, countryCodes, query })`
   - Single opportunity → `useLiveOpportunity(id)` / `fetchLiveOpportunity(id)` (call from a wrapper hook if needed)
   - Coverage/status → `useCoverageTruth()` / `useMarketSummary()` / `useVerifiedSources()`
   - Team UI → `organization-service.ts`
   - Profile UI → `user-profile-service.ts`
4. Remove the placeholder import for that route; delete nothing else.
5. Keep the route in `src/app/routing/routes.ts` with the same `href`/`id`.
6. Add/update a focused test: route renders, guard holds, service mock called.
7. Run `node node_modules/typescript/bin/tsc -b --pretty`, `node node_modules/vitest/vitest.mjs run src`, `node node_modules/eslint/bin/eslint.js src`, `node node_modules/vite/bin/vite.js build`.

## Hard rules for Stitch components

- No new router, no second fetch layer, no new auth client.
- No SQL/PostgREST inside components — export/extend a service in `src/features/**/` or `src/app/auth/neon-client.ts`.
- No hardcoded opportunity counts, countries, or "live" claims; read from `coverage_truth` / `market_intelligence_summary`.
- Keep route paths exactly as listed; analytics, breadcrumbs and guards rely on them.
- Dark + light themes must both work from `src/app/theme.css` tokens (burgundy gradient sidebar remains the brand anchor).

## Recommended integration order

1. Auth screens (login/register/forgot/reset/verify) — unblocks real use.
2. Dashboard shell + overview.
3. Discovery (government/grants/commercial/search) — biggest user value.
4. Opportunity detail.
5. Saved searches / saved / search-history / my-opportunities.
6. Teams & invitations (wire to `organization-service.ts`).
7. Settings (`user-profile-service.ts`).
8. Intelligence / alerts / analytics / admin / support.
9. Marketing site (`/`, `/product`, `/markets`, …).

## Known gaps / blockers

- Stitch screens are not generated yet — every route renders the placeholder by design.
- `source-catalog.ts` (static 69-entry catalog) is now unused by the UI; kept for Stitch to consume or delete once a DB-backed source UI exists.
- `OrganizationProvider` preserves memberships/create/update; invitation/member RPCs live in `organization-service.ts` (no UI until Stitch).
- Old screen tests were removed; infrastructure tests (auth provider, Neon client, routes, backend) remain.
