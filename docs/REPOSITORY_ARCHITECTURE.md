# OppSift repository architecture report

**Review date:** 2026-11-07  
**Scope:** Phase 1 repository, authentication, backend, database, integration,
configuration, and documentation inspection. No application or database code
was changed during this phase.

## Executive summary

OppSift is an existing React/TypeScript/Vite application with a static
Cloudflare Pages deployment target and a Neon development backend. The browser
uses Neon Managed Auth and the Neon Data API; authentication is not implemented
as a separate Better Auth server in this repository.

The repository includes reviewed SQL migrations for identity, organizations,
and opportunity intelligence, plus substantial backend-only contracts and
fixture-tested integration primitives. It does **not** contain a deployed
application API, a production database repository for ingestion, scheduled
workers, or source-specific production connectors. The user-facing opportunity
catalogue still uses labelled local demonstration records.

The local migration ledger and several backend setup documents say migrations
0001 and 0002 were applied to the isolated development branch. A current remote
database inspection could not be completed during this review: the Neon MCP
connection requires sign-in, and `psql` is not installed. Treat the migration
state as documented, not freshly verified; confirm the branch and schema before
any database write. Production is documented as unchanged.

## Application and deployment architecture

- **Frontend:** React 19, TypeScript, Vite, Zod, and a small History API router.
- **UI:** `src/app/` owns routing, shell, auth, organization, permission, and
  diagnostics concerns. `src/features/` contains dashboard, discovery,
  opportunities, and public pages. `src/shared/ui/` contains shared UI.
- **Backend code:** `backend/neon/` contains SQL migrations, backend-only
  intelligence contracts/adapters/parsers/resilience/fixture ingestion, and a
  parameterized search query builder. `backend/tsconfig.json` includes these
  modules in type-checking.
- **Hosting:** `wrangler.toml` configures static Cloudflare Pages output at
  `dist`. No Pages Function, API runtime, deployed Neon Function, queue
  consumer, scheduled job, or production worker is connected to the app.
- **Neon configuration:** `.neon` selects the `development` branch. The
  ignored `.env.local` contains server-side credentials as well as local
  configuration; its values were not read or disclosed. `.env.example`
  exposes only public Neon endpoint placeholders and a display-only branch
  value. `.dev.vars.example` explicitly warns against putting secrets in local
  worker variables.
- **Tests and tooling:** Vitest/Testing Library, ESLint, TypeScript project
  references, Vite, and Wrangler are configured. `npm run build` runs
  `tsc -b` followed by the Vite production build; `npm test` runs Vitest.

## Authentication and authorization

### Existing implementation

- A single browser client is created in `src/app/auth/neon-client.ts` with
  `@neon/neon-js` and `BetterAuthReactAdapter`, using public
  `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL`.
- `AuthProvider` restores the Neon session, exposes the current user, and
  delegates sign-out to Neon.
- `AuthPages.tsx` implements email/password sign-up and sign-in, email OTP
  send/verify, password reset request and completion, and Google social sign-in
  calls. The OTP helpers use a local narrow type over the SDK client.
- Protected organization/account routes use the Auth session and verified
  email state. Organization/profile access uses the Neon Data API and relies
  on database RLS and checked SQL RPCs for authorization.
- Google OAuth is not configured in the checked-in example configuration and
  is disabled by default. The rendered button is disabled with a
  “Not configured” indicator unless explicitly enabled after provider setup.
  The Apple button is presentation-only and is not part of the requested
  Google/email flow.
- The Auth setup documentation says Neon’s shared email provider is selected,
  but real message delivery, OAuth, account lifecycle, password recovery, and
  cross-tenant behavior have not been end-to-end tested.

### Differences from the requested production design

- There is no custom Better Auth server or application-owned auth runtime; the
  current design delegates to Neon Managed Auth.
- No Resend client, mail service, template, or `RESEND_*` configuration exists.
  Delivery must be configured through the selected Neon Auth provider unless
  a separately reviewed server-side design is chosen.
- No app-specific `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, or Google client
  secret is configured in the app. Google provider credentials belong in
  Neon’s provider configuration for the current architecture.
- Registration currently creates the user before OTP verification using
  Neon Managed Auth. The frontend itself does not manage password hashing,
  token storage, OTP persistence, attempt limits, or cooldowns; these are
  provider responsibilities and need verification against the actual Neon
  configuration and documented capabilities.
- Existing UI tests mock Auth APIs. They do not prove provider delivery or
  backend session security.

## Neon schema and migration state

### Schema in source

Migration `0001_identity_organizations.sql` defines seven public application
tables: user profiles, organizations, memberships, organization settings,
invitations, invitation token hashes, and audit logs. It adds
organization-scoped RLS, verified-user and membership helpers, checked
`SECURITY DEFINER` RPCs for organization/member/invitation operations, and
audit/update triggers.

Migration `0002_global_opportunity_intelligence.sql` defines twenty further
tables for currencies/languages/countries, category and opportunity types,
sources and source-country coverage, mappings, normalized opportunities,
source records, versions, duplicate candidates, ingestion runs/errors/review,
quality issues, organization-saved opportunities, and analyses. It includes
full-text search, verification/coverage guards, triggers, and RLS.

The opportunity category table is constrained in SQL to the three current
values (`government`, `grants`, `commercial`). The source registry tracks
publisher, source and access types, categories, languages, frequency,
reliability, licensing/terms evidence, approval status, and retrieval health.
The schema does not yet include every requested registry field (for example,
documented API endpoint, auth method/reference, access cost, and rate-limit
metadata). Original values are held on source records and the schema includes
version and review history, but there is no separate durable raw-import
repository implementation.

### Deployment state and verification limit

- `backend/neon/migrations/migration-status.json`, `backend/neon/README.md`,
  `docs/BACKEND_SETUP.md`, and `docs/LOCAL_DEVELOPMENT.md` record both
  migrations applied to the isolated development branch and describe a prior
  post-application inspection.
- Those records say no countries, sources, or opportunities were seeded; only
  the three category rows are seeded. The approved 30-country list is
  documentation-only and does not imply live coverage.
- Neon MCP inspection was unavailable because that server requires
  authentication in this session. `psql` was not installed, so this report does
  not claim a fresh remote schema check. Do not apply a migration or assume
  remote state until the development branch is verified.
- The repository has no automated migration runner or database-side migration
  history table; the JSON ledger is manual.

## Opportunity sources and ingestion

### Existing groundwork

- `connectors.ts` defines typed connector/source lifecycle contracts,
  configuration validation, and normalized record validation.
- `adapters.ts` implements generic configured JSON API/GraphQL/JSON-feed and
  RSS/Atom adapters. API/feed adapter discovery results are held in process
  memory.
- `format-parsers.ts` provides bounded CSV, JSON/feed, and XML parsing and
  mapping helpers.
- `safe-fetch.ts` enforces HTTPS, approved hosts, redirects, content types,
  timeouts, response size limits, and HTTP error classification.
- `resilience.ts` provides schemas/helpers for retries, backoff, circuit
  breakers, rate limiting, scheduling metadata, and bounded batches.
- `ingestion.ts` implements fixture-oriented normalization and deduplication
  orchestration against an `IngestionRepository` interface. Tests use an
  in-memory implementation.
- `backend/neon/search/` validates bounded search requests and builds
  parameterized PostgreSQL search SQL. No deployed service executes the query.
- Source-catalog documents identify candidate sources and explicitly track
  discovery, permission review, licensing, and source evidence separately.

### Not implemented

- No source-specific World Bank, TED, SAM.gov, Simpler.Grants.gov, or Open
  Contracting Data Registry connector was found. Other source mentions are
  research candidates, not integrations.
- No Neon-backed implementation of `IngestionRepository`, durable cursor/raw
  payload store, authenticated source credential store, source registry
  administration API, or source health API is present.
- No scheduled execution, queue/worker consumer, deployed ingestion function,
  monitoring surface backed by real runs, or verified source connectivity is
  configured.
- The frontend catalogue and search use fictional demonstration records; no
  live opportunities are persisted or served.
- Source licensing/reuse and attribution remain open for all listed candidates.

## Configuration and secret boundaries

The checked-in `.env.example` currently contains only:

- `VITE_NEON_AUTH_URL`
- `VITE_NEON_DATA_API_URL`
- `VITE_NEON_BRANCH`
- `VITE_NEON_GOOGLE_OAUTH_ENABLED`

The local ignored `.env.local` variable **names** include database connection
variables, Neon Auth/Data API URLs, branch metadata, and object-storage
credentials. Values were not inspected, included in this report, or sent to an
external system. `.gitignore` excludes local environment files. No Resend,
Google server credential, ingestion API-key reference, or scheduler secret is
documented in `.env.example`; do not add private values to `VITE_*`.

## Documentation and consistency findings

- The backend setup, local development, master context, and migration ledger
  describe 0001/0002 as applied to development. The README contained a
  contradictory statement that neither migration was validated or applied;
  that stale wording has been corrected to reflect the manual ledger and this
  review's remote-verification limitation.
- Repository documentation describes an isolated development branch and an
  unchanged production branch. This review did not independently verify either
  remote branch.
- The implementation checklist and source catalogs describe outstanding work;
  source candidates must remain inactive until evidence, rights, and tests are
  complete.

## Recommended implementation sequence and gates

1. **Auth/provider verification:** confirm Neon Managed Auth OTP expiry,
   one-time use, throttling/resend behavior, email delivery, OAuth callback,
   recovery, session persistence, and logout on a disposable development
   account. Decide explicitly whether Neon Managed Auth remains the selected
   architecture or whether a separately deployed Better Auth runtime is
   required before adding Resend.
2. **Auth hardening:** add only the server-side/provider configuration and
   tests supported by that decision; never create a competing auth system.
3. **Schema review:** reconcile actual development schema against migrations
   and ledger, then design additive migrations for missing normalized fields
   and raw-record/audit needs.
4. **Backend runtime decision:** select a supported server-side execution
   boundary compatible with static Cloudflare Pages and Neon; define secret
   storage, authorization, scheduling, and durable persistence.
5. **Source-by-source integrations:** document official access, rate limits,
   licensing, attribution, and credentials first; then add one connector with
   fixtures and separately authorized live connectivity tests.
6. **Ingestion and app integration:** implement durable idempotent ingestion,
   run history, review/version handling, search API, and tenant-protected user
   data before replacing demonstrations.

Do not treat UI/provider wiring, generic adapters, migration files, or a
successful endpoint probe as proof of production-ready authentication or live
opportunity coverage.
