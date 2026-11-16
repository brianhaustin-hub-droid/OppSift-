# OppSift master project context

Last reviewed: 2026-11-06

This document records the current repository state. Source code and applied
database state take precedence over this summary if they differ.

## Product vision

OppSift is a global-first opportunity intelligence platform for businesses,
suppliers, contractors, founders, consultants, and organisations. The product
descriptor is **Global Opportunity Intelligence**. The tagline is **Find the
right opportunity. Know what to do next.**

The planned product has three unified stages:

1. Government contracts, public procurement, tenders, RFPs, RFQs, EOIs, notices,
   procurement plans, awards, and supplier opportunities.
2. Grants and funding, including public, international development, NGO,
   institutional, research, innovation, and business-financing programmes.
3. Commercial opportunities, private procurement, contracts, projects,
   subcontracting, partnerships, supplier opportunities, and business
   intelligence.

No country, category source, listing, eligibility result, or coverage is live
unless its source and permissions have been verified and its integration tested.
The three records currently shown in the frontend are clearly labelled
demonstrations.

## Intended launch markets

The product owner approved 30 launch countries on 2026-11-04; the authoritative
list is in `docs/source-catalog/launch-countries.md`. The research scope is
therefore 30 countries, but the database country registry is unseeded and
configured/live country counts remain zero. Source research is still pending.

Country and standards references for future vetted seed data:

- ISO 3166 country codes: <https://www.iso.org/iso-3166-country-codes.html>
- ISO 4217 currency codes: <https://www.iso.org/iso-4217-currency-codes.html>
- BCP 47 language tags: <https://www.rfc-editor.org/rfc/rfc5646>
- IANA time-zone database: <https://www.iana.org/time-zones>

The TypeScript contracts validate ISO-code shapes, BCP 47 tags, and IANA time
zone identifiers. ISO alpha-2/alpha-3 and currency membership must also be
checked against the approved reference registry during database seeding; syntax
validation alone is not proof that a code is assigned.

## Confirmed technology stack

The current visual direction and route-by-route UI status are documented in
[`OPPSIFT_DESIGN_SYSTEM.md`](./OPPSIFT_DESIGN_SYSTEM.md),
[`OPPSIFT_FINAL_SCREEN_INVENTORY.md`](./OPPSIFT_FINAL_SCREEN_INVENTORY.md),
[`OPPSIFT_DESIGN_AUDIT.md`](./OPPSIFT_DESIGN_AUDIT.md), and
[`OPPSIFT_NAVIGATION_ARCHITECTURE.md`](./OPPSIFT_NAVIGATION_ARCHITECTURE.md).
The supplied Earth artwork is at `public/assets/oppsift-earth-orbit.png`.
Country-map UI has been removed; market scope is communicated textually.
Reviewing a single route does not imply every screen or backend is complete.

- Frontend: React 19, TypeScript, Vite.
- Hosting: Cloudflare Pages (`dist`, configured in `wrangler.toml`).
- Backend and database: Neon PostgreSQL, Data API, and Managed Auth are
  configured on a separate `development` branch forked from the existing
  `production` default branch. The local Neon context and `.env.local` target
  development. Realtime is disabled on development and remains unchanged on
  production. Both observed storage buckets are private. The inherited
  `hello` Function and `assets` bucket are scaffolding. Application migrations
  0001 and 0002 are applied to development only; production remains unchanged.
- Installed browser SDK: `@neon/neon-js` 0.10.2. The single client is
  `src/app/auth/neon-client.ts`; it is configured only with the public
  `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL`.
- Local dev server origin is fixed to `http://localhost:5173` with Vite
  `strictPort`, so Neon trusted-origin configuration is predictable.
- Authentication: development email/password signup now requires OTP email
  verification. Signup checks password confirmation, Google login remains
  disabled until explicitly enabled, and profile settings expose Auth account
  state and sign-out. Neon shared email delivery and end-to-end account flows
  have not been tested.
- The inherited `hello` function and private `assets` bucket are scaffolding;
  `oppsift-private-files` is also private. No app storage upload/download or
  scheduled work has been tested or connected.
- Neon CLI support packages were added for deployment configuration.

## Application architecture

- `src/app/` owns shell, routing, authentication, permissions, and organization
  experience.
- `src/features/` owns dashboard and opportunity preview features.
- `src/shared/ui/` owns accessible reusable UI primitives.
- `backend/neon/migrations/` contains ordered PostgreSQL migrations, applied
  to the isolated development branch only.
- `backend/neon/intelligence/` contains backend-only data contracts, generic
  API/feed adapters and parsers, approved-host fetching, resilience helpers,
  and fixture-based ingestion orchestration.
- `backend/neon/search/` contains a validated search request schema and
  parameterized PostgreSQL query builder. It is not connected to a deployed
  service or repository.
- `backend/tsconfig.json` brings backend TypeScript into `npm run typecheck`.
- `wrangler.toml` configures static Cloudflare Pages output; no separate API
  runtime or production scheduler is configured.

The browser receives only public Neon endpoint URLs from `VITE_*` settings. It
must never receive a database connection string, OAuth secret, or other private
credential.

## Authentication and tenancy

The frontend includes Neon Managed Auth account flows, a session provider,
verified-email gating, profile settings, organization switching, role-aware
team access, organization creation/editing, invitations, and ownership
transfer. Organization preferences are stored per Auth user in the browser.
Neon Auth and Data API are deployed, and the app schema migrations are applied
to development only. Hosted account flows have not been tested end to end.
`.env.local` is present locally and gitignored;
it contains credentials and must never be printed or committed. Its Vite
variables contain only public Auth/Data API endpoints. `/backend-status`
shows non-secret session state and can perform a read-only check for the
seeded `government` category through the existing Data API client; it cannot
prove complete migrations, authenticated RLS, or tenant isolation. See
`docs/BACKEND_SETUP.md` and `docs/AUTHENTICATION_SETUP.md`.

The intended shared/public data boundary is:

- Global catalogue, reference metadata, and approved public source records:
  shared across organisations and read-only through the public data API.
- Saved opportunities, notes, and private analyses: scoped to an existing
  organisation and protected by PostgreSQL RLS using organization membership
  and the authenticated user identity.

Migration 0001 uses the UUID primary key in `neon_auth."user"`; on this
development branch `auth.user_id()` returns text, so both migrations cast its
value to UUID at identity comparisons and writes. The schema and policy
definitions were inspected after application; cross-account verification is
still pending. The
frontend organisation selector is not an authorization boundary.

Platform administration remains deny-by-default. No server-side platform
administrator provisioning or backend admin API exists. Organisation roles do
not grant platform administration; source/country mutations are not granted to
browser roles.

## Database schema and migration status

### Migration 0001

`backend/neon/migrations/0001_identity_organizations.sql` defines user profiles,
organisations, memberships, invitations, organization settings, audit logs,
RLS policies, and permission-checked RPCs. It is applied and inspected on
development; it is not applied on production.

### Migration 0002

`backend/neon/migrations/0002_global_opportunity_intelligence.sql` defines:

- ISO-oriented country, currency, language, country-currency, and
  country-language registries.
- Three shared opportunity categories and extensible opportunity types.
- Source registry, country-to-source coverage, and local-to-global taxonomy
  mapping.
- Canonical opportunities, source-specific provenance, version history,
  duplicate candidates, and data quality issue records.
- Ingestion run and error tracking.
- Organization-scoped saved opportunities and an AI-analysis result envelope.
- PostgreSQL full-text search and indexes for country, category, dates,
  currency/value, provenance, and ingestion operations.
- Read-only public policies for approved data, private organization RLS, and
  no browser write access to global registry/catalogue tables.

The migration intentionally does not seed countries, currencies, languages,
sources, or opportunities. Only the three global category rows are seeded.
Country and source data must be vetted and populated after the launch-country
list, source permissions, attribution, and terms have been established.

Both migrations were applied transactionally to the development branch and
inspected; production remains unchanged. Migration 0002 depends on migration
0001. SQL migrations support storage and policy design; production
persistence, ingestion triggers, and source administration are not wired to
the frontend.

## Country, source, opportunity, and ingestion architecture

`backend/neon/intelligence/contracts.ts` provides:

- Country lifecycle states from `planned` through `live_coverage_verified`;
  live status requires verified source IDs, all three opportunity-category
  coverage states, a verification timestamp, and a tested connector.
- BCP 47/IANA validation, ISO code shape checks, and extensible currency,
  language, and time-zone arrays.
- Source registry verification rules that prevent an integration from being
  called operational until license, terms, evidence, and reliability checks
  pass.
- Migration triggers prevent a country from being marked live without
  operational, permission-verified sources for all three categories and block
  retiring the last verified category source while the country remains live.
- Explicit source-country and source-terminology-to-global-category mapping.
- A source record schema that retains original titles, deadlines, currencies,
  monetary values, and original values next to normalized classification.
- Canonical URL normalization and confidence-based duplicate candidate
  comparison. Candidate matches are not automatic merges.

`backend/neon/intelligence/ingestion.ts` defines source discovery, retrieval,
parsing, repository, error, and run-summary contracts. It will not call a
connector unless its source is marked operational and its license, terms,
evidence, and reliability checks pass. It validates each record, retains
unmapped records in a review queue, tracks invalid records as quality errors,
and asks the repository to save idempotently and retain cross-source matches
for review. The repository interface has no production Neon implementation.

`adapters.ts` contains generic configured JSON API/GraphQL/JSON-feed and RSS/
Atom adapters; `format-parsers.ts` contains CSV, JSON, RSS/Atom, and XML
parsers. `safe-fetch.ts` enforces HTTPS, exact approved hostnames, redirect
checks, MIME allowlists, timeouts, and response size limits. `resilience.ts`
contains queue/schedule message schemas, retry, circuit-breaker, per-source
rate-limiting, and bounded batch helpers. These are framework components, not
deployed Workers, Cron Triggers, Queues, or Workflows. Adapter discovery
payloads currently live in process memory, manual import helpers only parse
and validate, and no real source connector is registered or tested.

Fixture tests use in-memory repositories and injected fetchers only; there is
no external source crawling or live data ingestion. See
`docs/INGESTION_OPERATIONS.md` and `docs/CONNECTOR_DEVELOPMENT_GUIDE.md` for
the current safe operating boundary and connector limitations.

The category taxonomy codes are `government`, `grants`, and `commercial`.
Country-specific labels stay separate and must be mapped while preserving the
source's original terms.

## Design system and routes

- Central theme tokens: `src/app/theme.css`; the shell supports light and dark
  themes with persisted preference.
- Shared primitives: `src/shared/ui/components.tsx` and feedback components.
- Shell: `src/app/shell/GlobalSidebar.tsx`,
  `src/app/shell/GlobalTopbar.tsx`.
- Route table: `src/app/routing/routes.ts`; route resolution uses the existing
  History API router in `src/app/routing/router.tsx`.
- `src/features/opportunities/country-registry.ts` is the frontend's central
  30-country research-scope registry. It is sourced from the approved list
  but is not a seeded database registry or evidence of source coverage.
- Dashboard and discovery use clearly labelled demonstration records.
- Discovery experience routes: `/discover`, `/discover/search`,
  `/discover/government`, `/discover/grants`, `/discover/commercial`,
  `/discover/country/:countryCode`, `/saved-searches`, and `/search-history`.
  Category routes share the same search UI; legacy `/opportunities/...`
  category paths resolve as aliases.
- Query, country, category, sort, result-view, and pagination state use URL
  parameters. The demonstration dataset is currently empty
  (`demonstrationOpportunities` in `src/features/opportunities/demo-data.ts`);
  any record added there shows example labels rather than verified publication
  or deadline dates.
- Search results support the title/reference/text query, category and market
  filters, browser-local history/saved-search configuration, browser-local
  shortlist actions, deterministic preview sorting, pagination, list/card/
  table layouts, and an accessible quick-view panel. These actions operate on
  local demonstration data only and are not backed by a database.
- Opportunity profile routes include `/opportunity/:id` with overview,
  government/grant/commercial profile sections, `/documents`, `/timeline`,
  `/source`, `/history`, and `/requirements`. The screens expose only fields
  present in the demonstration records; unavailable source evidence,
  documents, dates, eligibility, provenance, and change history are stated as
  unavailable rather than invented. Source-opening is disabled when no
  original URL exists.
- `/my-opportunities` and `/my-opportunities/:itemId` provide a browser-only
  pursuit preview with list/card/table/kanban views, internal workflow states,
  tasks, notes, date-only internal milestones, and local activity events.
  Users can also record a source citation and internal requirement assessment;
  self-entered citations are explicitly unverified.
  State uses a browser-local storage key and is not private, secure, shared, or
  server-persisted. Team assignment, organisation workspace, source uploads,
  and notifications are not connected.
- `src/features/opportunities/OpportunityIntelligence.tsx` contains the
  profile, category-specific field sets, local workspace model, and forms;
  `opportunity-intelligence.css` adds responsive, theme-token-based layouts.
  These preview screens do not provide live catalogue retrieval or qualify as
  secure personal/tenant persistence.
- Browser-local saved searches and history use a separate storage key for the
  current authenticated user ID when available, or an anonymous-preview key.
  They are not server-synced, shared, or secure account records. No saved-search
  RLS or history-retention migration exists.
- `backend/neon/migrations/migration-status.json` is a manual local ledger
  recording both migrations as applied to development. It is not a remote
  migration history table and does not verify the current database schema.
- `backend/neon/search/contracts.ts` validates filters, date/value ranges,
  sort, and bounded pagination. `query-builder.ts` binds all user values,
  queries the existing `opportunities` schema, uses PostgreSQL full-text
  ranking plus exact title/reference tie-breaks, and groups monetary sorting
  by original currency without conversion. It is currently a query primitive;
  no API, database executor, count repository, or connection is implemented.
- Migration 0002 installs a weighted `tsvector` search column maintained by
  trigger and a GIN index. Query plans, index performance, language
  behavior, and Neon RLS behavior have not been tested.
- Administration routes are registered for sources, source details, country
  coverage, ingestion, and quality review, but remain inaccessible through
  the deny-by-default platform permission boundary. No administration screens,
  API, or server-enforced platform-admin identity are implemented.
- Account and organization views require authenticated, verified account state.
- `/admin` and its operational subroutes stay permission-restricted until
  server-side authorization and data APIs exist.

## Completed milestones

- React/Vite/Cloudflare Pages application foundation and responsive shell.
- Light/dark design system, shared accessible controls, demo dashboard, and
  route/navigation tests.
- Neon Managed Auth and organization/team frontend foundations; the
  development schema is applied, while Auth flow verification and frontend
  application persistence remain pending.
- Global data contracts, applied development schema, connector orchestration
  boundary, deterministic fixture tests, and project continuity documents.

## Outstanding bugs and configuration

- The 30-country selection is approved and documented; the database registry
  still has no country rows, and source research remains incomplete.
- 24 government/grant candidates are documented across the source catalogs:
  three documentation-backed leads (SAM.gov, Grants.gov, TED API) and 21
  country portal URLs whose pages returned HTTP 200. Portal reachability does
  not verify publisher, terms, rights, APIs, or coverage. None is registered
  in the database, approved, connector-tested, or active. Operational and live
  coverage counts are zero.
- Neon development is linked locally and separately from the production
  default branch. Neon Auth, Data API, PostgreSQL, private buckets, and
  development-only Realtime settings are provisioned; production was not
  modified. Migrations 0001/0002 are applied and verified on development; a
  pre-migration restore branch named `development-pre-schema-20261106` exists.
  Cross-tenant testing remains pending. Do not apply them to production.
- Cross-tenant saved-record access has not been exercised with two accounts
  and two organizations.
- Google OAuth, email delivery, Cloudflare Pages deployment, and browser device
  checks remain manual setup/validation tasks.
- No production ingestion repository, scheduled job, Cloudflare Queue/Worker,
  country/source admin API, credential mechanism, or authorized live source
  connector has been implemented.
- Generic API/feed adapters retain discovered payloads in local process maps;
  they require durable raw-record handoff before use across stateless worker or
  queue boundaries.
- Source schedule and queue message schemas are not connected to a runtime,
  persistent cursor store, retry worker, or operator controls.
- No semantic search, AI inference, currency conversion, or alerting is
  operational.
- Existing lint warnings are Fast Refresh warnings in component/provider
  modules. Upstream Zod comment-annotation warnings have appeared in builds.

## Actual checks

Node.js v26.13.0 and npm 11.20.0 are installed on the setup workstation.
Current typecheck passed; 84/84 tests passed with `--testTimeout=12000`;
lint has zero errors and seven warnings; production build passed with upstream
Zod annotation and bundle-size warnings. The local `/backend-status` page
shows Auth ready/signed-out. The Data API responds but requires a bearer token;
the signed-out category probe is denied. Retest after signing in. Development
Postgres accepted the schema transactions. All 27 expected
application tables have RLS enabled, with 24 policies, 20 functions, and three
category rows verified. Migrations 0001/0002 are recorded as applied to
development only. Development Realtime is disabled;
production Realtime remains enabled. Both buckets are private, but storage
operations are untested. No disposable Auth account was created, and email
delivery, OAuth, authenticated CRUD, and application-table RLS remain
unverified. The local Vite server is running at `http://127.0.0.1:5173`.

## Current milestone and next work

Current milestone: Neon services are provisioned on the isolated development
branch, migrations 0001/0002 are applied and catalog-checked, and the local
app points at development. Production remains unchanged. Signed-in account
flows and two-tenant authorization tests are not complete. Discovery,
profiles, and pursuit controls still use synthetic records/browser storage.
A live search repository/API, saved-search persistence, opportunity-detail
repository, secure personal/organisation workspace, and operational admin
surfaces are not implemented. Source research and production data runtime
remain blockers. No live source integrations are active.

Source research is partial. Official documentation was retrieved for three
API/source candidates (SAM.gov, Grants.gov, TED API), and 21 additional
national portal URLs responded with HTTP 200. A Bing search page about South
Sudan procurement is not primary-source evidence and is not recorded as a
verified source. No candidate is permission-verified or operational. Most
country/category research remains incomplete; do not treat source discovery,
portal reachability, or generic adapter tests as verified coverage.

Recommended next steps:

1. Research official source ecosystems for each approved country/category and
   record direct evidence, access rights, and licensing.
2. Verify email delivery and complete a development sign-up/OTP/sign-in test;
   keep credentials out of chat and source control.
3. Use separate disposable accounts and organizations to verify authenticated
   Data API behavior and cross-tenant RLS. Never use production for these tests.
4. Load ISO reference data and country rows only after verifying them against
   the cited standards.
5. Add durable raw-record/cursor persistence and a transactional Neon
   repository on development before splitting adapter work across
   queue or worker invocations.
6. Select a backend runtime and implement server-side platform-admin
   authorization before source administration or activation controls.
7. Implement one permission-approved source adapter at a time; keep all
   sources inactive until integration, permission, and persistence tests pass.
8. Implement a search repository/API on the selected server runtime, add
   server execution for the parameterized query builder, and verify pagination,
   result counts, query plans, and the existing public catalogue RLS policy.
9. Add saved-search/history persistence only after defining user identity,
   retention, RLS, and cross-tenant tests; replace browser-local preview
   storage before describing these as private or synced.
10. Implement opportunity detail/version repositories and organisation-owned
   workspace tables/RLS only after the Neon auth claims and membership
   policies have been tested with separate organisations.
11. Keep the Prompt 07 profile and workspace previews visibly non-production
    until source provenance, permitted document links, verified date/timezone
    data, and tenant-authorized persistence are available.
12. Prompt 09 should add evidence-linked eligibility/relevance analysis only
    after verified source-backed opportunity fields and secure server-side
    persistence exist; do not generate or imply AI analysis before then.
