# Neon backend boundary

This directory contains database migrations and backend-only
intelligence contracts. Neon services are deployed on the existing production
branch: Postgres, Managed Auth, Data API, Object Storage, Functions, and
Realtime. A minimal `hello` function and private `assets` bucket are deployed,
but no app-specific function, storage workflow, realtime subscription, or live
source connector is implemented. Application migrations 0001 and 0002 are
applied to development only; production remains unchanged. AI Gateway was
omitted because it is unavailable on the current plan.

The browser uses only public Neon Managed Auth and Data API URLs; database
credentials and OAuth secrets must remain server-side. The production database
does not have the app migrations; development does. Do not infer that app
persistence is operational from service deployment or schema creation alone.
The manual development ledger is `migrations/migration-status.json`; review
and validate future schema changes on development before considering
production use.
`docs/BACKEND_SETUP.md` documents the current deployment and development
workflow.

## Identity migration — 0001

`migrations/0001_identity_organizations.sql` defines user profiles,
organizations, memberships, invitations, organization settings, and audit
records. It enables RLS, restricts direct table access, and exposes
permission-checked RPCs for organization creation and membership changes.

The migration was applied transactionally to the Neon development branch.
Before a future schema change, confirm:

- Managed Auth has initialized `neon_auth."user"` with `id`, `email`, and
  `"emailVerified"` columns using the expected types.
- The Neon Data API has created the `authenticated` role and
  `auth.user_id()` helper.
- The migration role can reference the managed-auth table and install/use
  `pgcrypto`.
- `SECURITY DEFINER` ownership and function grants behave as intended.

## Global intelligence migration — 0002

`migrations/0002_global_opportunity_intelligence.sql` depends on 0001. It
defines country, currency, and language registries; category/type taxonomy;
source registry and country coverage; classification mappings; shared
opportunities, source records, versions, duplicate candidates, ingestion and
quality tracking; organization-saved opportunities; and an AI analysis
envelope. Public data is read-only and policies expose only approved source
records. Saved items are tenant-scoped through organization membership RLS.

The migration seeds only the three global category values. The approved
30-country list is in `docs/source-catalog/launch-countries.md`, but the
migration intentionally seeds no country, currency, language, source, or
opportunity rows: source research and permission reviews remain incomplete.
Platform admin writes and production persistence are not implemented.

Both migrations were applied transactionally to development, in order.
Post-migration inspection confirmed the expected tables, RLS, policies,
functions, and three category seed rows. The weighted opportunity search
vector is maintained by a trigger because the database does not permit the
stable `array_to_string` function in a generated-column expression.
Cross-account saved-item isolation, real Auth flows, and application CRUD
remain untested. Never apply an unverified migration directly to production.

There is no automated migration runner or database-side migration history
table. The JSON ledger is a manual repository-side development record, not
proof that the remote database matches source. The current development
database was inspected after applying both migrations: 27 expected tables
have RLS enabled, with 24 policies and 20 functions. Do not copy any endpoint
or credential into the ledger.
The demonstration opportunity and market fixtures are excluded from production
builds. Production discovery remains empty until a verified live source and
production persistence are implemented; this is not evidence that the data
pipeline is operational.

## Backend intelligence contracts

`intelligence/` contains country/source/opportunity contracts, configured
JSON API/GraphQL/JSON-feed and RSS/Atom adapters, CSV/JSON/XML parsers,
approved-host fetching, resilience helpers, and fixture ingestion. Source
payload caches are process-local. Fixture tests use in-memory repositories;
there is no production Neon repository, deployed worker, or verified
source-specific integration.

Source adapters must use authorized APIs, feeds, or datasets where available.
Before an integration is marked operational, document terms, licensing,
attribution, rate limits, robots restrictions, and evidence. Never bypass
authentication, CAPTCHAs, or technical restrictions.

`intelligence/sam-gov-api.ts` implements a bounded read-only client for the
documented SAM.gov Get Opportunities API v2. It requires an operational,
approved source record and an API key supplied by the server-side caller;
requests include the key in SAM.gov's required query parameter, so callers
must never log request URLs. The client validates the documented date window,
page limits, response shape, and pagination metadata. Its tests use mocked
responses only. It is not connected to a production ingestion job, and no
live SAM.gov request has been made. The GSA API guide does not settle
SAM.gov-specific commercial redistribution, customer display, retention, or
attribution rights, and gives no numeric role quota; the general GSA reuse
policy is not an explicit license for this API dataset or linked materials.
The source remains `permission_review_pending`. There is no production Neon
repository, persistent job/checkpoint implementation, or deployed ingestion
endpoint, and production does not have the application migrations. Do not
activate ingestion or expose source records until written permission and the
production persistence/security work are complete. In Cloudflare Pages, the
key is stored as the encrypted production secret `SAM_GOV_API_KEY`; do not
expose it to frontend code or use it until the source is approved.

`intelligence/ckan-discovery.ts` implements bounded CKAN Action API
`package_search` discovery for an explicitly allowlisted HTTPS catalog. It
only returns catalog metadata, validates the Action API's `success` and
pagination contract, and never downloads resource URLs. Mocked tests pass.
The attempted live `catalog.data.gov` check did not return valid CKAN JSON in
this environment; the client is not a production source connector. Each
catalog/resource's own access and license terms must be reviewed before any
resource is fetched or ingested.

`intelligence/ted-api.ts` implements a bounded read-only client for the
official TED v3 published-notice Search API. It validates the documented
pagination contract, requests a small fixed set of provenance and notice
fields, uses the shared approved-host fetch guard, and refuses sources that
are not marked operational after the normal permission checks. A separate
anonymous smoke request on 2026-11-10 returned HTTP 200 with three genuine
published notices. The source remains permission-review-pending; no TED
records were persisted, normalized into customer opportunities, or activated.
The legal notice and commercial display/retention terms still require review.

`intelligence/contracts-finder-api.ts` implements a bounded client for the
official Contracts Finder OCDS search and release endpoints. It validates
the OGL v3 package declaration, response shape, same-host pagination, and
active-tender status; it projects out descriptions, contact points, and raw
payloads. The client remains source-approval-gated. A one-release anonymous
live check returned an award package rather than an open tender, and the
official release lookup returned HTTP 200. The API payload includes
personal contact fields; OGL excludes personal data and third-party rights,
so no Contracts Finder records have been persisted or served. Source-specific
rights, privacy, and display review remain incomplete.

`canadabuys-worker/` contains the CanadaBuys Queue/Hyperdrive prototype and
`migrations/0007_canadabuys_candidate.sql` adds Canada and an inactive source
candidate. An HTTP check of the tender portal returned 403; no official JSON
feed/API contract or reuse permission was verified. The Worker therefore
requires an approved, active registry entry with a reviewed Canada-hosted JSON
feed URL, verified terms and licensing, and permissions evidence before it
collects or persists records. Migration 0007 depends on migrations 0001-0006;
apply and validate the full chain on an appropriate Neon branch first. This
connector is not deployed or operational until those prerequisites and a live
feed verification are complete.

## Manual account configuration

1. Use a disposable development branch; the currently deployed production
   branch is not a migration test environment.
2. Configure Google OAuth in Neon with the callback URL Neon provides.
3. Configure verified email delivery for email verification and password
   reset. The frontend calls these managed-auth endpoints but cannot configure
   their providers.
4. Set `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` from the
   development-branch endpoints locally and as public Cloudflare Pages
   environment values.
   Never set a database URL, OAuth client secret, or other credential under a
   `VITE_*` name.
5. Test sign-in, email verification, password reset, sign-out, organization
   creation/switching, invitations, role changes, removal, and ownership
   transfer.

Invitation email delivery and platform-administrator provisioning are not
implemented. Organization invitations are issued as one-time links for manual
sharing; only a hash is retained in the database.

## Future boundaries

- `intelligence/` — typed source, country, opportunity, validation, and
  ingestion contracts.
- A future repository implementation must be deployed through a verified
  Neon-supported Node.js/TypeScript workflow.
- Add one reviewed, permission-checked source adapter at a time.
- Add migration/RLS integration tests against a disposable Neon branch before
  exposing global or tenant data through the Data API.

No separate API runtime or database driver is configured. Select and document
one only after verifying Neon’s supported deployment workflow.
