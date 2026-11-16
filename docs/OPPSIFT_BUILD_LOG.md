# OppSift build log

## 2026-11-07 — Standalone authentication and responsive navigation

- Moved authentication routes into a full-viewport navy and Earth-art layout,
  separate from the dashboard shell on desktop and mobile.
- Gave the dashboard sidebar a dark logo surface for clear wordmark contrast.
  The compact rail now expands on mouse hover or keyboard focus and retracts
  when the pointer or focus leaves; touch users can still expand it explicitly.
- Validation: production build passed. App shell and branding tests passed
  (14 tests); the existing Auth page tests continue to fail on stale
  accessible-name expectations (`Name`/`Email` versus `Full Name`/`Work Email`).

## 2026-11-07 — Full-bleed Earth heroes and transparent logos

- Extended the animated Earth artwork across product, opportunities, markets,
  and about hero sections. Full-width hero backgrounds now fade into the page
  surface instead of ending at a hard border; the product hero fills the first
  viewport.
- Removed the solid backdrop from the shared wordmark, app mark, and favicon
  assets so each mark blends into its surface.
- Validation: production build and typecheck passed; focused brand and market
  tests passed (2 tests).

## 2026-11-07 — Brand assets and flatter editorial surfaces

- Cropped the supplied brand artwork into reusable OppSift wordmark and app
  mark assets; wired the shared logo into public navigation/footer, Auth, and
  the application sidebar, and added the app mark as the browser icon.
- Reworked the public product page around the Earth-from-orbit artwork with a
  restrained animated backdrop and orbital accents. Motion respects reduced
  motion preferences.
- Removed rounded card surfaces across the application and rebuilt dashboard,
  discovery, organization, opportunity, and public capability layouts around
  typography, whitespace, and fine dividers.
- Rewrote product/solution/workflow copy to distinguish product direction from
  features that are not connected in the current preview.
- Validation: production build and typecheck passed; focused route and market
  tests passed (10 tests); updated component lint passed with one existing
  Fast Refresh warning. Desktop and mobile checks confirmed the brand assets
  load, the product-page backdrop animates, and reviewed routes have no
  horizontal overflow.

## 2026-11-06 — Earth-art direction and map removal

- Added the supplied Earth-from-orbit artwork as a local brand asset and used
  it for the homepage and authentication backdrop. Replaced the homepage's
  interactive map hero with a concise editorial hero.
- Removed the interactive country-map component, country detail map panel,
  their styles, and the unused map dependency. Replaced public market cards
  with regional text lists and the dashboard map with explicit research-scope
  counts.
- Added public opportunity-category, About, and Contact destinations; kept
  `/platform` as a compatibility route for `/product`. Removed placeholder
  social/legal `#` links and avoided implying operational source coverage.
- Added the design audit, final route inventory, and navigation architecture.
- Validation: production build and typecheck passed. Focused route and market
  filtering tests passed (9 tests); lint passed with seven existing warnings.
  The full test run was stopped after it stalled; its Auth page tests reported
  three pre-existing accessible-name mismatches (`Name`/`Email` expectations).
- Browser review covered the homepage, markets filters, and login at desktop
  and narrow widths. The login Earth artwork loads on desktop and its aside
  hides on narrow screens. No horizontal overflow was observed; screenshots
  were not exported to the workspace. Other application screens remain
  unreviewed.

## 2026-11-06 — Public homepage visual refinement

- Reworked the public hero into a responsive editorial layout with the former
  map-based visual, clear launch-scope figures, and explicit non-live coverage
  language. This map experience was later removed under the new brand direction.
- Changed the public brand logo destination to `/` so it returns to the
  marketing homepage rather than the application dashboard.
- Added `docs/OPPSIFT_DESIGN_SYSTEM.md` and
  `docs/OPPSIFT_FINAL_SCREEN_INVENTORY.md`; the inventory distinguishes existing
  routes from screens visually checked in this pass.
- Validation: production build and typecheck passed. ESLint passed with seven
  existing warnings. The full test run reported 82 passing and 3 failing tests
  in `src/app/auth/AuthPages.test.tsx`; those tests currently expect accessible
  input names (`Name`, `Email`) that differ from the form labels (`Full Name`,
  `Work Email`, `Email Address`). Authentication code was not changed in this
  design pass. Homepage desktop/mobile renders were reviewed in-browser; the
  browser tool did not provide a workspace screenshot export.

## 2026-11-06 — Neon Auth and organization flow completion (Prompt 09)

- Added signup password confirmation, distinct invalid/expired OTP guidance,
  explicit Google OAuth UI gating, and per-user active-organization storage.
- Added Auth-owned email verification, account creation date, available profile
  image, and sign-out controls to account settings. Extended organization
  creation with country, website, and description; added owner/admin editing.
- Restricted member-directory and invitation reads to owner/admin UI flows
  and only offered administrator-role grants to owners. Database RLS/RPC
  authorization remains authoritative.
- Added development diagnostics for email OTP and Google UI state and wrote
  `docs/AUTHENTICATION_SETUP.md` with user-operated account and two-account
  RLS verification steps. Google OAuth credentials and email delivery are
  still unverified; no Auth account or OTP was created or requested.
- Added focused Auth, profile, viewer-access, and route tests. Final
  typecheck passed; 84/84 tests passed; lint has zero errors and seven existing
  warnings; production build passed with upstream Zod annotation and
  bundle-size warnings.
- Remaining manual work: verify email delivery and real Auth/session flows,
  then exercise tenant isolation with two disposable verified accounts and
  actual authenticated Data API requests. Production was not changed.

## 2026-11-06 — Neon development schema migrations

- Created the `development-pre-schema-20261106` child branch as a restore
  point. Neon snapshots are unavailable for this non-root branch.
- Applied migrations 0001 and 0002 transactionally to `development` only;
  production was not modified. The first 0002 attempt rolled back because
  PostgreSQL rejected `array_to_string` in a generated column. Replaced that
  expression with a trigger-maintained weighted search vector and applied
  successfully.
- Verified 27 expected tables with RLS enabled, 24 policies, 20 functions,
  three category rows, authenticated saved-opportunity SELECT privilege, and
  the opportunity search-vector trigger. A rollback-only insert verified that
  titles and keywords are indexed; the manual migration ledger was updated.
- The signed-out Data API probe still requires a bearer token. No Auth user
  was created, so the authenticated browser read remains to be tested.
- No disposable Auth user was created. Email delivery, OAuth, signed-in CRUD,
  cross-tenant isolation, and storage upload/download remain untested.

## 2026-11-06 — Neon development branch and email OTP

- Created and selected a separate Neon `development` branch from the existing
  `production` default branch. The local Neon context and ignored
  `.env.local` target development; production remains unchanged.
- Disabled Realtime on development only and configured email verification
  using OTP on development. Neon’s shared email provider is configured, but
  email delivery, OAuth, and real account flows have not been tested.
- Updated the verification page to submit and resend OTP codes through the
  Neon SDK. Both observed storage buckets are private; no storage operations
  have been tested. The inherited Function and bucket were left untouched.
- Corrected unapplied migration user-ID fields and RPC signatures to match
  Neon Auth's UUID user primary key; `auth.user_id()` returns text, so the SQL
  now casts it explicitly before UUID comparisons.
- Completed `/backend-status` with the local branch marker, Auth status,
  Data API result, verified private-bucket provisioning, and local migration
  ledger state.
- Confirmed the branch database, Data API and Auth endpoints are provisioned;
  PostgreSQL `SELECT 1` succeeded. The local browser reports Auth ready and
  signed out. A real anonymous Data API read reached Neon and was denied for
  missing authentication/grants. No Auth user or email was created.
- Migrations 0001 and 0002 remain pending; app tables are absent. No
  authenticated CRUD, RLS isolation, email delivery, OAuth, or storage
  upload/download test has been completed.
- Validation: typecheck passed; 78/78 tests passed with `--testTimeout=12000`
  (one test timed out at the default 5 seconds on the first full run and
  passed when rerun); lint has zero errors and seven warnings; build passed
  with upstream Zod annotation and bundle-size warnings. The local Vite server
  is running at `http://127.0.0.1:5173`.

## 2026-11-05 — Neon development setup and diagnostics (Prompt 08)

- Re-audited the installed Neon SDK (`@neon/neon-js` 0.10.2), the existing
  singleton Auth/Data API client, sign-in/registration/verification/reset
  flows, profile and organization reads/writes, migrations, Vite, Pages
  configuration, environment examples, and ignore rules.
- Confirmed `node_modules` and the lockfile are present; Node.js, npm and
  Corepack are absent from PATH and local/global environment files are absent.
  Node engine requirements are Neon SDK `>=20.19.0`, Vite/react plugin
  `^20.19.0 || >=22.12.0`; documented a supported Node 24 LTS option.
- Added `/backend-status`, which reports non-secret Auth session/configuration
  state and runs an explicit read-only Data API check against the
  `government` category seeded by migration 0002. It distinguishes missing
  configuration, request failure, permission denial and a missing migration
  table/seed; a successful read does not assert RLS or migration completeness.
- Set Vite to use `http://localhost:5173` strictly so a Neon trusted origin
  does not silently change when another port is selected.
- Replaced illustrative endpoint host strings in `.env.example` with empty
  public endpoint keys. `.gitignore` already excludes `.env.*` and local
  `.dev.vars`; no `.env.local` was created because no branch endpoints exist.
- Added a manual development migration ledger at
  `backend/neon/migrations/migration-status.json`; 0001 and 0002 remain
  pending. Added `docs/BACKEND_SETUP.md` with project creation, endpoint,
  trusted-origin, environment, migration, test and troubleshooting steps.
- Reviewed migration drafts statically. 0001 depends on Neon-managed
  `neon_auth."user"`, `auth.user_id()`, Data API roles and expected grants;
  0002 adds the global catalogue and verified-source/RLS filters. No hosted
  Neon project is configured, so SQL compatibility, execution, Auth claims,
  RLS, and tenant isolation are not verified. No migrations were run and no
  production resource was created.
- Existing account forms/providers and Data API query paths are retained;
  code-level SDK calls do not establish live auth, email delivery, database
  persistence, or secure tenancy. Live search RPC/repository, workspace
  persistence, ingestion Worker and platform-admin API remain absent.
- `npm run typecheck; npm test; npm run lint; npm run build` could not start:
  PowerShell reports `npm` is not recognized. No test/build/lint result is
  claimed. VS Code diagnostics report no errors on the inspected new/changed
  TypeScript files. No local browser server or Neon integration test ran.

## 2026-11-05 — Opportunity profile and pursuit workspace preview (Prompt 07)

- Inspected Prompt 07, current route and detail implementation, opportunity
  preview model, Neon search query primitive, Neon client boundary, identity
  and organization provider, permission gates, migrations, and current project
  continuity documents.
- Added profile section routes for overview, category-specific procurement/
  grant/commercial fields, documents, deadlines, source provenance, history,
  and requirements. Missing evidence is stated as unavailable; source links
  are disabled when the demo record has no original URL.
- Added a browser-only `/my-opportunities` workspace with list/card/table/
  kanban views and a `/my-opportunities/:itemId` preparation page. Internal
  status is kept separate from public status; tasks, notes, date-only internal
  milestones, and local activity events are validated and saved to browser
  storage. The UI warns this is not private, secure, shared, or server-backed.
- Added local requirement-reference entry and internal assessment controls.
  User-provided citations are explicitly unverified, and assessments are not
  official eligibility decisions or AI predictions.
- Added share/copy actions and profile-to-workspace tracking. Team assignment,
  organization sharing, external submission, source documents, AI analysis,
  and notifications are not represented as connected.
- Added route and focused UI tests. Also corrected a pre-existing malformed
  nested test declaration in `routes.test.ts` so the route cases register as
  top-level tests.
- No migration was added: the Neon branch and data API are not configured,
  existing migrations remain unvalidated drafts, and tenant policies have not
  been exercised. Search persistence/repository and Prompt 05 admin screens
  remain blocked; client-side admin access remains deny-by-default.
- Environment recheck found `node_modules`, but no Node.js executable, npm, or
  Corepack in PATH or common install locations. A VS Code Electron runtime
  probe did not provide an executable Node runtime. Typecheck, tests, lint, and
  build were not run. VS Code diagnostics found no errors in inspected
  changed TypeScript files. No browser, responsive visual check, screenshots,
  database/RLS tests, or Neon query execution were available.

## 2026-11-05 — Discovery/search preview (Prompt 06)

- Audited the existing routes, shell, opportunity preview records, Neon
  migration draft, identity/organization flows, permissions, source evidence,
  and project continuity documents before implementation.
- Added the shared 30-country frontend research-scope registry with region
  codes. It is not a database seed or claim of operational coverage.
- Added `/discover/search`, `/discover/government`, `/discover/grants`,
  `/discover/commercial`, `/discover/country/:countryCode`,
  `/saved-searches`, and `/search-history`. Existing category URLs remain
  aliases. Source, country coverage, ingestion, quality, and source-detail
  admin routes remain deny-by-default; no server-side admin boundary exists.
- Added a responsive unified discovery UI with URL state for terms, supported
  filters, categories, sorting, view, and page; category tabs; active filter
  chips; list/card/compact-table layouts; pagination; mobile filters; global
  suggestions; and an accessible keyboard-dismissible quick view.
- Implemented save/unsave, saved searches, saved opportunity preview, and
  search history in user-keyed local browser storage (anonymous preview when
  signed out). The UI explicitly says this is not server-synced, shared, or a
  secure account record. No saved-search or history migration/RLS was added.
- Added validated backend search contracts and a parameterized SQL query
  builder using the existing PostgreSQL `tsvector` column/index. Ranking
  deterministically prioritizes exact title, exact reference and `ts_rank`;
  currency-value sorting groups by original currency without conversion.
  This is not a deployed query service or a tested database integration.
- Added focused route, UI, schema-validation, currency-sorting, ranking, and
  parameterization tests. No fixture/live database repository, query plan, or
  API endpoint exists.
- The only available opportunities remain the three visibly synthetic demo
  records. Live metrics remain zero. Source links, amounts, eligibility, and
  AI analysis are not invented.
- A linked Bing search page about South Sudan procurement is not primary
  evidence; no South Sudan source is added or marked verified from that page.
- Validation: VS Code diagnostics reported no errors in inspected app files.
  VS Code test discovery has zero test controllers. Node.js/npm are absent
  from shell PATH, so typecheck, unit tests, lint, and build could not be run.
  No browser/responsive visual check or screenshot was completed.

## 2026-11-04 — Connector framework continuation (Prompt 05)

- Read the Prompt 05 attachment and reviewed the project context, build log,
  implementation checklist, source inventory templates, migration draft,
  frontend route/security boundaries, and existing backend intelligence code.
- Confirmed the country list was missing at the start; the product owner then
  supplied the 30 markets. Recorded the approved list and explicit
  zero-coverage matrix. Neon branch, backend runtime, platform-admin API, and
  verified sources remain unavailable. No integrations were fabricated or
  activated.
- Reviewed the existing generic JSON API/GraphQL/JSON-feed and RSS/Atom
  adapters, CSV/JSON/XML parsers, approved-host fetch guard, fixture ingestion
  flow, schedule/queue schemas, retries, circuit breaker, and batch helpers.
- Fixed concurrent per-source rate-limiter calls so they are serialized rather
  than all reserving the same delay; added IANA timezone validation for
  schedule contracts.
- Tightened connector connection tests to verify API envelopes and stable IDs,
  return failures rather than throwing, reject mismatched RSS/Atom connector
  types, and label Atom payloads with the correct MIME type.
- Added adapter tests for API response validation and connection-failure
  reporting, plus an overlapping-request rate-limit test.
- Added `docs/INGESTION_OPERATIONS.md` and
  `docs/CONNECTOR_DEVELOPMENT_GUIDE.md`, documenting actual operator and
  deployment boundaries, including process-local adapter payload caches.
- Updated master context and checklist to distinguish framework helpers from
  production workers, persistence, scheduling, and live source integrations.
- Reviewed primary documentation for three distinct source candidates:
  SAM.gov Contract Opportunities (U.S. government, API key and terms review
  pending), Grants.gov Search (U.S. grants, public search API not verified),
  and TED API (published EU procurement notices, reuse rights and country
  mapping pending). These are discovery candidates only; none is permission
  approved, configured, tested, or active.
- Broader country-by-country research remains incomplete: direct portal fetches
  were blocked by the available network resolver and search pages did not
  return usable primary-source evidence. Kept other sources unlisted rather
  than guessing URLs, rights, or APIs.
- Validation status: `npm test` and `npm run typecheck` could not start because
  Node.js/npm are not available on the current shell PATH. Lint/build were not
  run. VS Code test discovery has no registered controller. TypeScript
  diagnostics for the changed connector files reported no errors, but the
  changes remain unverified by the project test/build commands.

## 2026-11-04 — Global data architecture foundation

- Inspected the existing React/Vite/Cloudflare Pages shell, Neon auth and
  organization code, migration 0001, and project documentation.
- Confirmed that neither the repository nor saved project context contained
  the exact 30-country launch list. No substitute list was fabricated.
- Added country lifecycle, source registry, source-country coverage, taxonomy
  mapping, opportunity provenance, normalization, quality issue, and
  confidence-based duplicate contracts.
- Added a typed connector/ingestion orchestration contract with deterministic
  fixture tests; no production Neon persistence or external source connector
  was added.
- Drafted migration 0002 for the global catalogue, source/evidence history,
  ingestion status, search indexes, AI result envelope, and organization-RLS
  saved items. No countries, sources, or opportunities are seeded.
- Added permanent master context and updated checklist; schema migrations
  remain unvalidated and unapplied because no Neon development branch is
  configured in this workspace.
- Validation: 33 tests passed across 6 files; TypeScript typecheck passed;
  ESLint had zero errors and five existing Fast Refresh warnings; production
  build passed with upstream Zod comment-annotation warnings. Neon migrations
  and RLS were not executed or validated against a database.

## Previous milestones

The existing application provides a React/TypeScript/Vite shell, centralized
light/dark design tokens, responsive navigation, explicitly labelled
demonstration opportunity records, and Neon Managed Auth/organization
foundations. See `OPPSIFT_MASTER_CONTEXT.md` and `implementation-checklist.md`
for current validation status; prior test results do not prove Neon database or
tenant isolation behavior.
