# OppSift

OppSift is a global-first opportunity intelligence platform. This repository
contains the initial frontend and deployment foundation, not a live data
service. It does not claim that any country, source, opportunity category,
eligibility rule, or opportunity record is live.

## What's here

- React and TypeScript application built with Vite.
- Central light/dark OppSift design tokens and a responsive, accessible
  application shell with a locally persisted theme preference.
- Responsive public brand pages with the supplied OppSift logo and
  Earth-from-orbit artwork; see the
  [design system](./docs/OPPSIFT_DESIGN_SYSTEM.md) and
  [screen inventory](./docs/OPPSIFT_FINAL_SCREEN_INVENTORY.md) for visual
  standards and honest implementation status.
- Reusable buttons, cards, labeled inputs, semantic badges, navigation links,
  responsive data tables, and native accessible dialogs.
- Cloudflare Pages build configuration (`npm run build`, output in `dist`).
- Vitest and Testing Library test setup, strict TypeScript checks, and ESLint.
- Planned modular-monolith boundaries for the web app and Neon backend.
- No database credentials, OAuth secrets, live opportunity records, or
  production integrations. No local demonstration records are currently
  populated; any that are added must be explicitly labelled as
  demonstrations.
- A browser client for Neon Managed Auth and the Neon Data API, gated on
  deployment endpoint configuration. Sign-in, registration, Google OAuth,
  email verification, password reset, profile preferences, organization
  switching, invitations, and team administration are wired to Neon APIs but
  require the development branch's reviewed/applied database migrations.
  Email verification is implemented with OTP; delivery and account flows are
  not yet end-to-end tested.

## Project structure

```text
src/
  app/
    auth/               Neon client, session context, and account flows
    organizations/      Tenant context, organization switcher, and team flows
    routing/            Route table and browser History API navigation
    security/           Central permission checks for preview routes
    shell/             Global navigation, search, market, and profile controls
    diagnostics/        Non-secret Neon Auth/Data API development status
    ...                Application shell, page styles, and theme tokens
  features/
    dashboard/         Demonstration overview and metrics
    discovery/         Search, filters, saved-search preview, and result views
    opportunities/     Demo records, opportunity profiles, and pursuit preview
  shared/
    ui/                Reusable accessible React primitives and styles
    ...                Browser-safe utilities
backend/
  tsconfig.json       Type-checks backend-only contracts and tests
  neon/
    migrations/        Versioned PostgreSQL migrations
    intelligence/      Contracts, generic source adapters, parsers, and ingestion helpers
    search/             Search validation and parameterized PostgreSQL query builder
docs/
  BACKEND_SETUP.md
  OPPSIFT_MASTER_CONTEXT.md
  OPPSIFT_BUILD_LOG.md
  INGESTION_OPERATIONS.md
  CONNECTOR_DEVELOPMENT_GUIDE.md
  implementation-checklist.md
  source-catalog/
    launch-countries.md
    country-source-inventory.md
    government-sources.md
    funding-sources.md
    commercial-sources.md
    source-verification-register.md
    source-coverage-matrix.md
    source-integration-priorities.md
```

The browser application is public code. It receives only the public Neon Auth
and Data API endpoint URLs; it must never receive Neon database credentials or
provider secrets. Database access depends on PostgreSQL row-level security and
the migration SQL under `backend/neon/migrations/`. The backend intelligence
framework includes generic JSON API/GraphQL/JSON-feed and RSS/Atom adapters,
format parsers, approved-host fetching, resilience helpers, and fixture
ingestion. It currently uses in-memory test repositories; there is no
production ingestion service, Neon Function, verified source-specific
integration, or deployed scheduler/queue. Cloudflare Pages serves the Vite
frontend. Do not add a Pages Function or a second API runtime without first
confirming the platform boundary and deployment model.

The client uses a small History API router and a centralized route table. The
overview and discovery routes use local, explicitly labelled demonstration
records. Discovery includes URL-based search/filter state, category and market
routes, quick view, result layouts, pagination, and browser-local saved-search,
history, and shortlist previews. It has no live search API or persistence;
browser-local records are not private server-side account data. Other planned
product areas still show not-connected states. Organization and account routes
require an authenticated, verified account. Platform
administration remains deny-by-default and is separate from organization
roles. Client-side checks are a UX boundary only; database RLS and checked
server-side RPCs are the authorization boundary for tenant data.

Demonstration opportunity data is currently empty: `demonstrationOpportunities`
in `src/features/opportunities/demo-data.ts` holds no records, and a test
asserts that. Opportunity routes still resolve but render an honest
unavailable state rather than a populated profile.
`/my-opportunities` and its item pages provide a browser-only pursuit preview
with internal stages, tasks, notes, date-only milestones, and local activity.
These pages display unavailable source fields honestly and do not claim live
records, verified dates, source documents, AI analysis, secure persistence, or
team collaboration. No workspace migration or server API is connected.

Open `/backend-status` for safe development Auth/Data API status and a
read-only category-registry probe. The local Neon context points to a separate
`development` branch; migrations 0001 and 0002 are applied there, and
production remains untouched. Authenticated account and tenant-isolation
flows still require end-to-end testing. See
[the backend setup guide](./docs/BACKEND_SETUP.md),
[infrastructure architecture](./docs/INFRASTRUCTURE_ARCHITECTURE.md),
[object storage setup](./docs/OBJECT_STORAGE_SETUP.md), and
[local development guide](./docs/LOCAL_DEVELOPMENT.md) for branch configuration,
migration review, and manual verification. A green status check is not proof of
authentication or tenant RLS.

## Local development

Prerequisites: a supported Node.js LTS release and npm.

```powershell
npm ci
npm run dev
```

The application has a client-side route shell and an overview/discovery
experience built with clearly labelled illustrative records. Preview markets
and opportunity examples are not real listings or evidence of source coverage.
No verified live source connector, live opportunity data, or eligibility
calculation is implemented. The product-owner-approved 30-country scope is
recorded in `docs/source-catalog/launch-countries.md`; all country/source
coverage remains pending research and permission review. Authentication and
organization flows are implemented in code, but are not operational until
the development migrations are validated and applied. The design
tokens are in `src/app/theme.css`;
shell, page, and responsive styles are colocated with their respective app and
feature modules. A slightly darker secondary-text token is used on tinted
surfaces and the page background where the exact brand secondary color falls
just short of WCAG AA contrast.

Prompt 07 profile and pursuit screens are preview-only until a Neon branch,
authorized search/detail API, source evidence, and tenant-tested workspace
persistence are configured. The Prompt 05 operational administration screens
remain restricted because no server-side platform administrator authorization
or administrative API exists.

The shared component primitives live in `src/shared/ui/components.tsx` with
their styles in `src/shared/ui/primitives.css`. Use the semantic status and
action variants rather than adding one-off component colors. The brand teal
`#0D9488` is retained as the light-theme action fill; the foreground and
hover shades are adjusted to meet contrast requirements.

The shared UI layer provides `Button`, `Card`, `TextInput`, `Badge`,
`NavigationLink`, `DataTable`, and `Modal`. Status badges always include a
visible text label, data tables have captions and keyboard-scrollable overflow,
and dialogs use native `<dialog>` behavior for focus containment and Escape
handling. Use WCAG-tested semantic variants and leave source-specific
opportunity content to the corresponding product feature.

## Quality checks

```powershell
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` is the mocked browser boundary: it exercises the auth screens,
route guards, and the signed-out Data API classification without contacting
any provider. Real email delivery, OTP expiry, Google OAuth, password recovery
and RLS behavior are verified separately with
`npm run test:auth:live` plus the operator runbook in
[`docs/AUTHENTICATION_SETUP.md`](./docs/AUTHENTICATION_SETUP.md), which needs a
Neon-signed-in account and a disposable mailbox you operate.

## Cloudflare Pages

`wrangler.toml` identifies the Pages build output. In Cloudflare, create or
connect the Pages project to this repository and configure:

- Framework preset: **React (Vite)**
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: the branch you choose for releases

These are also Cloudflare's documented React (Vite) build command and output
directory. The custom domain `getoppsift.com` can be attached after the first
successful Pages deployment. Do not add credentials to Pages build variables
unless a later, documented frontend integration explicitly requires a
non-secret public value.

Cloudflare currently recommends considering Workers for new projects, while
Pages remains available. Pages is retained here because it is the confirmed
hosting decision; revisit only if a required capability makes that decision
inadequate.

## Neon identity and organization setup

The identity schema and browser flows are not active until these steps have
been completed on a **disposable development branch**:

1. Create a Neon project and enable Neon Managed Auth and the Neon Data API.
2. Confirm that the initialized branch has `neon_auth."user"` with the
   expected `id`, `email`, and `"emailVerified"` columns, and that the Data API
   provides the `authenticated` role and `auth.user_id()` function. The
   migration intentionally depends on these managed-auth objects.
3. Review and apply
   [`backend/neon/migrations/0001_identity_organizations.sql`](./backend/neon/migrations/0001_identity_organizations.sql)
   to that development branch only. It creates tenant tables, RLS policies,
   audit triggers, and permission-checked RPCs. It has **not** been run or
   validated against a Neon branch yet.
4. Configure Google OAuth in Neon Managed Auth using the exact callback URL
   shown by Neon. Configure email verification and password-reset delivery in
   Neon as well. Keep provider secrets in Neon’s dashboard/secret store, never
   in `VITE_*` variables.
5. Set the public endpoint URLs in the local `.env` file using
   `.env.example` as a template. In Cloudflare Pages, set the same two public
   endpoint values for preview and production deployments. These URLs are not
   credentials; do not add a database connection string or OAuth secret.
6. Test with two separate accounts and two organizations: confirm that a
   member cannot read or modify another organization, invitations are
   email-bound and single-use, and manager/owner role restrictions hold.
   Do not use customer data until these checks pass.

Invitation email delivery is not implemented. Managers can create a
single-display invitation link and share it manually; the database stores only
its hash. Platform administration is not provisioned by this organization
schema and remains unavailable.

## Global opportunity data foundation

The backend-only contracts in `backend/neon/intelligence/` define country and
source registries, country-specific taxonomy mapping, validated opportunity
normalization, source provenance, data-quality issues, and a fixture-tested
connector/ingestion boundary. The ingestion interface is not yet connected to
a Neon repository, a scheduled runtime, or a real external source.

`backend/neon/migrations/0002_global_opportunity_intelligence.sql` defines the
shared country/source/opportunity schema, PostgreSQL full-text search indexes,
source and version history, duplicate review candidates, ingestion status, and
organization-RLS saved records. It depends on migration 0001. The manual
migration ledger records both migrations as applied to the isolated
development branch; the setup docs record prior post-application checks.
Remote Neon state could not be independently inspected during the current
review, so verify the branch and schema before further database changes.
Production is documented as unchanged. Only the three global opportunity
categories are seeded; no country, currency, language, source, or opportunity
records are seeded.

The product-owner-approved launch-country list is documented in
[`docs/source-catalog/launch-countries.md`](./docs/source-catalog/launch-countries.md).
The configured country count is still zero. Verify source evidence and
permissions before adding source registry entries or claiming coverage.
Platform-admin authorization and country/source administration APIs are not
implemented, so `/admin` remains permission-restricted.

See the [repository architecture report](./docs/REPOSITORY_ARCHITECTURE.md)
and [`docs/OPPSIFT_MASTER_CONTEXT.md`](./docs/OPPSIFT_MASTER_CONTEXT.md) for
architecture, migration state, coverage limitations, actual validation status,
and next steps. Official standards references for future vetted registry data
are [ISO 3166](https://www.iso.org/iso-3166-country-codes.html),
[ISO 4217](https://www.iso.org/iso-4217-currency-codes.html),
[BCP 47](https://www.rfc-editor.org/rfc/rfc5646), and the
[IANA time-zone database](https://www.iana.org/time-zones).

## Dependency plan

Current dependencies are deliberately limited to the UI, Neon client, and
foundation:

- React, Vite, TypeScript, and `@neon/neon-js` for the browser application and
  managed auth/Data API client.
- Zod for runtime validation shared only where it is safe to do so.
- Vitest, jsdom, and Testing Library for focused UI and domain tests.
- ESLint for static checks.
- Wrangler for Cloudflare Pages local/deployment tooling.

No backend/database driver, Neon Functions runtime, or migration runner is
configured. Select those only after verifying the supported Neon Functions
workflow; keep credentials in Neon, not source code. Lemon Squeezy,
object storage, and scheduled triggers are later milestones, not dependencies
or active integrations today.

## Official platform references

- [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
  documents the React (Vite) build command and `dist` output.
- [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/)
- [Neon documentation](https://neon.tech/docs)
- [Neon CLI documentation](https://neon.tech/docs/reference/neon-cli)
- [Neon Functions documentation](https://neon.tech/docs/guides/neon-functions)
- [Neon Managed Better Auth documentation](https://neon.tech/docs/guides/neon-auth)

Confirm Neon product names, availability, and exact setup instructions in the
official docs/dashboard before enabling those integrations; Neon documentation
was inaccessible from the environment used to establish this foundation.
