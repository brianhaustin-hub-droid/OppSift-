# OppSift design audit

Audit basis: current React/TypeScript/Vite routes, shared UI and styles, Auth
and organization providers, public pages, feature pages, README, and existing
product/backend documentation. Source code and applied backend state take
precedence over design intentions.

## Keep

- React 19, TypeScript, Vite, the History API route table, and current app
  boundaries.
- Neon Auth/Data API client, OTP verification, session handling, organization
  context, invitation flows, and current permission checks.
- Discovery URL state, opportunity detail/pursuit preview behavior, theme
  preference, accessible shared controls, and the 30-country research registry.
- Truthful source/provenance language and backend-status diagnostics.

## Remove or replace

- The interactive country choropleth, country pin/selection map UX, zoom
  controls, and country-map-specific detail panel in marketing/dashboard
  screens.
- Removed map component styles and `react-simple-maps` after confirming no
  application imports remain.
- Decorative world map as a proxy for source coverage; replace any useful
  dashboard role with precise text and registry-backed states.
- Placeholder `href="#"` social/legal actions and other controls that imply a
  destination or operation that does not exist.

## Redesign

- Public hero around the user-supplied Earth-from-orbit artwork, with readable
  overlay, concise positioning, and clear discovery/account paths.
- Public navigation/footer and repeated section layouts into one consistent
  brand system.
- Auth presentation around the Earth artwork while preserving Neon flows and
  accurately gating OAuth providers.
- App shell, dashboard, discovery, opportunity, workspace, monitoring,
  organization, and account surfaces to a shared hierarchy and content grid.
- Replace map-led market selection with regional text groupings and honest
  research-scope messaging.

## Current route and integration findings

- Public routes exist for `/`, `/markets`, `/platform` (also aliased from
  `/product`), `/opportunities`, `/solutions`, `/how-it-works`, `/about`, and
  `/contact`. Onboarding routes are not registered.
- Auth routes exist for login, register, forgot/reset password, verification,
  and invitation acceptance. Existing forms call Neon; Google configuration is
  explicitly gated. Apple UI exists but its OAuth action is not implemented.
- Dashboard, discovery, opportunity detail, saved searches/history, and
  browser-local pursuit preview are implemented. Some sidebar destinations are
  deliberate planned/restricted states.
- Organization and profile surfaces exist. Platform admin routes are
  permission-restricted; client-side checks are not a substitute for RLS or a
  server authorization boundary.
- No production ingestion/source coverage is live. Do not recast sample data
  as operational intelligence.

## Implementation status

- Completed in this pass: Earth-art public hero and Auth backdrop, removal of
  interactive country maps, regional text groupings, dashboard scope summary,
  public company/category pages and navigation, and design documentation.
- Preserved: Neon Auth flows, organization behavior, route behavior,
  permissions, and source/coverage disclosures.
- Remaining: broader visual refinement of authenticated application screens,
  visual QA for the remaining application routes, and further test coverage.
- Deferred: onboarding persistence, reports, and admin operations
  until the required backend contracts and authorization exist.

Detailed route states are in
[`OPPSIFT_FINAL_SCREEN_INVENTORY.md`](./OPPSIFT_FINAL_SCREEN_INVENTORY.md);
user flows and route aliases are in
[`OPPSIFT_NAVIGATION_ARCHITECTURE.md`](./OPPSIFT_NAVIGATION_ARCHITECTURE.md).
