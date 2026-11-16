# OppSift implementation checklist

This checklist is the delivery sequence, not a claim that the listed product
capabilities are already active.

## Milestone 0 — Project foundation

- [x] Establish React, TypeScript, Vite, and a tested application shell.
- [x] Establish light/dark brand tokens and responsive accessible styling.
- [x] Add reusable accessible UI primitives for controls, status, tables, and
      dialogs without additional dependencies.
- [x] Add WCAG AA text/control colors, focus indicators, reduced-motion support,
      safe-area handling, and responsive table/dialog behavior.
- [x] Add a responsive global shell, client-side route table, permission-gated
      administration preview, and mobile navigation/filter controls.
- [x] Add the overview and discovery foundations with explicitly labelled
      illustrative records and honest not-connected states.
- [x] Add focused route, navigation, filter, theme, and access-state tests.
- [x] Add strict type checking, linting, and unit-test commands.
- [x] Configure Cloudflare Pages to publish the Vite `dist` directory.
- [x] Document module boundaries, dependency intent, and manual account setup.
- [x] Install dependencies and run typecheck, unit tests, lint, and build.
      The full suite passes with an increased per-test timeout; lint reports
      seven warnings and no errors.
- [ ] Browser-check light/dark layouts at 320px, 768px, and desktop widths,
      including current iOS Safari and Android Chrome (not yet run).
- [ ] Create Cloudflare Pages project and validate a preview deployment.
- [ ] Confirm Neon project region, Neon Functions availability, CLI workflow,
      and Neon Managed Better Auth setup against current official guidance.

## Milestone 1 — Backend and database baseline

- [ ] Select the Neon-supported Node.js/TypeScript function deployment workflow.
- [ ] Add PostgreSQL migration tooling and the first reversible migration.
- [ ] Establish structured logs, request validation, and explicit error mapping.
- [ ] Add backend tests and a non-production Neon branch for migration checks.
- [ ] Define tenant and authorization boundaries before adding customer data.
- [x] Apply and inspect the RLS-backed identity/organization and global
      catalogue migrations on Neon development; production is unchanged.

## Milestone 2 — Identity and company workspace

- [x] Add the Neon Managed Auth/Data API browser client, session state, and
      account flows for email/password, OTP verification, reset, and sign-out;
      keep Google OAuth hidden until its provider credentials are configured.
- [x] Add profile preferences, organization switching, organization creation,
      organization settings editing, role-aware member access, invitation
      links, and ownership transfer UI.
- [x] Add password confirmation, clear invalid/expired OTP feedback, per-user
      organization selection, Auth account details, and safe sign-out controls.
- [x] Document the user-operated authentication and two-account RLS test steps
      in `docs/AUTHENTICATION_SETUP.md`.
- [x] Create and select a separate Neon `development` branch; keep the
      existing `production` default branch unchanged. Configure localhost as
      a trusted origin and require email verification using OTP on development.
- [x] Provision Neon Managed Auth and the Data API on development.
- [x] Add `/backend-status` indicators for environment, Auth session, Data API
      response, private bucket provisioning, and the local migration ledger.
- [ ] Configure and test Google OAuth separately; verify actual email delivery
      and end-to-end account flows before relying on them.
- [x] Confirm Neon Auth table/function assumptions, then apply both migrations
      transactionally to the isolated development branch.
- [ ] Test sign-in, sign-out, session expiry, and account verification.
- [ ] Run cross-organization RLS tests with at least two accounts and two
      organizations; frontend route checks do not replace these tests.
- [ ] Configure email delivery and test password reset/verification flows.
- [ ] Add company capabilities with validated, tenant-scoped APIs.
- [ ] Provision platform administration separately; organization roles do not
      grant access to platform administration.

## Milestone 3 — Sources and opportunity evidence

- [x] Define typed country/source registry, country coverage, taxonomy mapping,
      opportunity, provenance, and quality contracts (country/source rows
      remain unseeded pending ISO data and source permission reviews).
- [x] Define a backend-only connector/ingestion contract with deterministic
      fixture-driven validation, permission gating, idempotency, and
      duplicate-review behavior.
- [x] Apply global data migration 0002 and organization-scoped saved-item RLS
      on development; production remains unchanged.
- [x] Add fixture tests for country/source contracts, timezone/language
      validation, category mapping, normalization/provenance, invalid records,
      source permission gating, idempotency, and duplicate review.
- [x] Record the product-owner-approved 30-country launch list in
      `docs/source-catalog/launch-countries.md`.
- [x] Apply migrations 0001/0002 transactionally to Neon development and
      inspect the schema, functions, policies, and RLS.
- [ ] Validate cross-tenant access with separate development accounts.
- [ ] Load verified ISO currency/language/country data after the launch list is
      approved; current country/source registry row counts are zero.
- [ ] Build server-side authorized country/source administration APIs and
      responsive views; platform-admin authorization does not exist yet.
- [ ] Review each source's terms, access permissions, and rate limits.
- [ ] Implement and test one authorized source adapter at a time.
- [ ] Persist source records and historical versions with evidence references.
- [ ] Add duplicate detection and change detection with auditable results.
- [ ] Publish no country/category coverage until its source is implemented,
      permission checked, and tested.

## Milestone 3 status

The schema and pure ingestion contracts are implemented and covered by fixture
tests. The 30-country scope is approved, but no Neon country/source rows,
production source integration, administrative UI, or live opportunity coverage
is operational.
See `OPPSIFT_MASTER_CONTEXT.md` for the migration and setup blockers.

## Source discovery inventory status

- [x] Draft the source-discovery inventory templates under
      `docs/source-catalog/` with explicit approval, verification, and coverage
      status tracking.
- [x] Confirm and record the 30-country scope; keep each source/category
      blocked until its own evidence and permission review are complete.
- [ ] Replace the placeholder inventory rows with official country and source
      records after market approval and permission validation.

## Prompt 05 — Global source connectors and ingestion

- [x] Add generic JSON API/GraphQL/JSON-feed and RSS/Atom connector adapters.
- [x] Add bounded CSV, JSON, RSS/Atom, and XML parsers and approved-host fetch
      safeguards.
- [x] Add retry, circuit-breaker, source-rate-limit, batch, queue-message, and
      schedule-schema primitives.
- [x] Add fixture coverage for source formats, fetch restrictions, and
      resilience behavior.
- [ ] Run current tests, typecheck, lint, and build (Node.js/npm unavailable on
      the current shell PATH during this continuation).
- [x] Confirm and record the exact approved 30-country list before source
      research.
- [x] Document primary-source evidence and explicit open questions for SAM.gov,
      Grants.gov, and TED API; none is approved or active.
- [ ] Complete official-source evidence, rights, attribution, and access
      research across all selected country/categories (public-site browsing
      was blocked for most country portals during this continuation).
- [ ] Add persistent raw-record and cursor handoff before queue/worker
      separation; current adapter payload caches are process-local.
- [ ] Select and validate a backend runtime; implement a least-privileged Neon
      repository and transactional cursor advancement.
- [ ] Implement server-side platform administration and audited source
      approval/pause/retry APIs before operational controls.
- [ ] Add a Cloudflare scheduler/queue only after runtime, persistence,
      authorization, and source approval are in place.
- [ ] Implement and test real sources only after access and permission
      conditions are verified; no real source is currently active.
- [ ] Add responsive administration and monitoring UI only after the
      server-side authorization boundary exists.
- [ ] Validate migration 0002 and RLS on a disposable Neon branch; do not
      apply drafts to production.

## Milestone 4 — Matching and workflow

- [ ] Model eligibility requirements separately from inferred match scores.
- [ ] Add explainable matching with evidence and uncertainty surfaced to users.
- [ ] Add watchlists, alerts, and pursuit management with tenant authorization.
- [ ] Test alert delivery, opt-outs, retries, and duplicate suppression.
- [ ] Add multi-client consultant workspaces only after tenant isolation tests.

## Milestone 5 — Storage and commercial readiness

- [ ] Add Neon Object Storage only for a defined document/evidence use case.
- [ ] Define access controls, retention, malware handling, and signed access.
- [ ] Add Function Triggers only for tested, idempotent scheduled workloads.
- [ ] Integrate Lemon Squeezy after merchant approval and entitlement design.
- [ ] Complete production security, privacy, backup, monitoring, and recovery
      checks before launch.

## Prompt 06 — Global discovery and advanced search

- [x] Add a centralized frontend list of the approved 30 research-market
      countries and canonical region codes; this does not seed Neon or prove
      source coverage.
- [x] Add `/discover`, `/discover/search`, category discovery routes, and
      `/discover/country/:countryCode`; category and country pages share one
      preview search experience.
- [x] Add URL-driven query, category, country, region, supported filter
      controls, sort, result view, active filter chips, and pagination.
- [x] Add responsive desktop filters and a mobile filter drawer, accessible
      suggestion surface, list/card/compact-table views, and keyboard-
      dismissible opportunity quick view.
- [x] Add demo-only save/unsave actions, saved-search edit/duplicate/run/delete,
      saved-opportunity preview, and search history/remove/clear/repeat.
- [x] Partition browser-preview data by signed-in user ID where available and
      label it as browser-only; this is not server-side privacy or persistence.
- [x] Add validated search contracts and a parameterized PostgreSQL query
      builder with weighted full-text, exact-title/reference ranking, verified
      source filtering, bounded page size/offset, and currency-aware value
      ordering.
- [ ] Connect search to an authorized Neon repository/API and return real
      catalogue records and total counts; the current UI uses three synthetic
      records only.
- [ ] Add persistent saved searches/history, RLS policies, retention rules,
      and cross-user/cross-organization tests.
- [ ] Complete the authorized source registry, source detail, country coverage,
      ingestion monitoring, and data-quality admin screens. Routes exist but
      remain permission-denied because server-side platform administration is
      not configured.
- [ ] Validate filter behavior against database fixtures, run query plans and
      scale tests, and verify database RLS; no database execution is available.
- [x] Add focused route, UI, and search-query tests.
- [ ] Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`;
      Node.js/npm were unavailable in the shell during this continuation.
- [ ] Visually inspect desktop/tablet/mobile layouts and capture screenshots;
      no browser test runtime was available.
- [ ] Implement server-backed global suggestions with debouncing; current
      topbar suggestions are local preview phrases and country-registry matches.

## Prompt 07 — Opportunity profiles and pursuit workspace

- [x] Add `/opportunity/:id` profile navigation for overview, category profile,
      documents, timeline, source/provenance, history, and requirements.
- [x] Add government procurement, grant/funding, and commercial profile field
      groups without inferring details missing from source records.
- [x] Clearly identify unavailable provenance, documents, verification, source
      dates, eligibility, and source history; do not generate fake links or
      verification claims.
- [x] Add share-link dialog, copy-link action, local save/track action, and a
      disabled original-source action when a source URL is unavailable.
- [x] Add `/my-opportunities` list/card/table/kanban preview with separate
      internal workflow status and public opportunity status.
- [x] Add `/my-opportunities/:itemId` local preparation workspace with task
      checklist, notes, date-only internal milestones, and local activity.
- [x] Allow user-entered requirement references and internal assessments in
      browser storage; clearly mark references as unverified and assessments
      as non-official.
- [x] Keep preview state in validated browser storage keyed by the current
      account ID when available; clearly warn this is not private, secure,
      shared, or server-persisted.
- [x] Add route and focused UI tests for profile sections, local tracking,
      internal status, tasks, notes, source limitations, and sharing.
- [ ] Implement an opportunity detail/version repository and connect these
      screens to verified catalogue data; no database executor/API is
      configured.
- [ ] Add persistent personal and organisation workspaces, task assignment,
      comments/notes, events, and requirements assessments with tested RLS.
- [ ] Add secure document metadata and permitted original-source links.
      Uploads/storage/scanning are not configured.
- [ ] Complete Prompt 05 source registry, country coverage, ingestion, and
      quality-review admin screens only after server-enforced platform-admin
      authorization and APIs exist. They remain restricted.
- [ ] Connect search, saved searches, and history to server-backed persistence
      with result-count/pagination and cross-tenant tests.
- [x] Run typecheck, tests, lint, and build. Typecheck and build passed; all 84
      tests passed with a 12-second timeout; lint reported zero errors and
      seven warnings. Build output includes upstream warnings.
- [ ] Visually inspect all profile/workspace routes across desktop and mobile
      viewports and capture screenshots. The `/backend-status` route was
      manually inspected; full cross-device checks remain incomplete.

## Prompt 08 — Development backend activation

- [x] Re-audit Neon SDK, Auth/Data API clients, migrations, Vite, Wrangler,
      environment examples, ignore rules, and current database access paths.
- [x] Record exact public frontend variables: `VITE_NEON_AUTH_URL` and
      `VITE_NEON_DATA_API_URL`; `.env.local` is configured locally and
      gitignored, so endpoint values are not stored in the repository.
- [x] Add `/backend-status` with non-secret Auth/session state and a manual
      read-only Data API check against the seeded government category. It
      explicitly does not certify migration completeness or RLS isolation.
- [x] Pin local Vite origin to `http://localhost:5173` with strict-port
      behavior for trusted-origin setup.
- [x] Add a local development migration ledger at
      `backend/neon/migrations/migration-status.json`; both migrations are
      recorded as applied. This ledger is not proof of remote schema state.
- [x] Add `docs/BACKEND_SETUP.md` with Node, Neon project/branch, Auth, Data
      API, env-file, migration, connection-test, and troubleshooting steps.
- [x] Install Node.js/npm and run typecheck, tests, lint, and build.
- [x] Configure the Neon development branch, Auth, Data API, and local public
      endpoint mapping; email delivery and OAuth still need live validation.
- [x] Apply migrations 0001 and 0002 on development only; verify schema, RLS,
      policies, and RPC/function definitions.
- [ ] Verify Auth claims and cross-tenant behavior with separate accounts.
- [ ] Complete real login/registration/session/reset/organization integration
      tests with development accounts; existing client call paths have not
      been tested against Neon.
- [ ] Implement server-side search execution, opportunity repositories,
      saved-search/history persistence and workspace persistence. Existing
      search builder and browser previews are not database-backed.
- [ ] Select and configure a secure backend/Worker only when privileged
      search, ingestion or platform-admin functionality requires it. No
      production deployment is part of this milestone.

## Prompt 09 — Auth, profile, and organization completion

- [x] Add password confirmation and specific invalid/expired OTP guidance;
      keep Google OAuth hidden until its Neon credentials are configured.
- [x] Show Auth-owned account identity/verification and sign-out controls;
      keep profile preferences separate from Auth credentials.
- [x] Pass country, website, and description to organization creation and add
      owner/admin settings updates guarded by existing grants and RLS.
- [x] Make member-directory access role-aware and allow administrator-role
      grants only from organization owners.
- [x] Scope the saved active-organization preference to the current Auth user
      and report provider/test state without displaying secrets.
- [x] Add focused Auth, profile, viewer access, and route regression tests;
      add `docs/AUTHENTICATION_SETUP.md`.
- [ ] Have the account holder verify signup OTP delivery, sign-in, session
      restore/expiry, reset, and sign-out using disposable development accounts.
- [ ] Verify cross-tenant read/write boundaries with two separate verified
      development users and actual authenticated Data API requests.
- [ ] Configure and test Google OAuth separately; no provider credentials are
      currently configured. Do not treat UI/provider diagnostics as proof of
      a successful OAuth flow.
