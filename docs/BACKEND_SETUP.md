# OppSift Neon backend setup and status

This guide records the current Neon deployment and the safe process for
development work. Do not send database credentials, OAuth secrets, Auth
tokens, or private connection strings to Copilot, ChatGPT, GitHub, or a
browser-facing `VITE_*` setting.

## Current status

- The app uses the existing `@neon/neon-js` 0.10.2 client and its
  `@neon/auth` 0.8.2 dependency for Neon Managed Auth and the Neon Data API.
  Do not create a second browser client or a separately managed auth service.
- Read-only Neon MCP inspection on 2026-11-09 confirmed project
  `solitary-frog-05898605` (`OppSift`) and organization
  `org-raspy-unit-84322788`. Existing branches are `development`
  (`br-plain-fog-balo5ig1`), default `production`
  (`br-orange-grass-baj3raxz`), and `development-pre-schema-20261106`
  (`br-rough-rice-bab5ooks`). No `preview` branch exists. Local `.neon`
  targets `development`. No application data or database schema was changed;
  production Auth was hardened and a recovery snapshot was created.
  The inherited `hello` Function and private `assets` bucket remain
  scaffolding, alongside the private `oppsift-private-files` bucket.
- Development endpoint variables are `VITE_NEON_AUTH_URL` and
  `VITE_NEON_DATA_API_URL`; preview and production use the suffixed
  `VITE_NEON_AUTH_URL_PREVIEW` / `VITE_NEON_DATA_API_URL_PREVIEW` and
  `VITE_NEON_AUTH_URL_PRODUCTION` / `VITE_NEON_DATA_API_URL_PRODUCTION`
  variables. They are public service endpoints, not
  credentials, and Vite includes their values in the client bundle.
  `VITE_NEON_BRANCH` is a deployment-intent label and production-build
  mismatch check, not a credential or proof of the connected branch. The local
  `.env.local` maps the endpoint URLs from Neon-generated variables.
- `.env.local` is present and gitignored. It contains private server-side
  credentials as well as public endpoints; never print, share, or commit it.
- Neon currently reports development email/password sign-up with mandatory
  OTP verification, localhost trusted origin, no Google client, and the shared
  email provider. Actual message delivery and account flows remain untested.
  Production now trusts `https://getoppsift.com`, but has no Google client and
  still uses Neon’s shared email provider. As a safety measure, production Auth
  now requires OTP verification, sends verification on sign-up and unverified
  sign-in, does not auto-login after verification, revokes sessions on password
  reset, disallows
  localhost, and temporarily disables new sign-ups until all launch settings
  and real delivery are tested.
- Phase 1 notes report development Realtime disabled, production Realtime
  enabled, and two private storage buckets with no objects at inspection.
  These settings have not been reverified in Phase 2; no upload/download test
  has been performed.
- The development database has the Neon Auth tables and application tables
  defined by migrations 0001/0002; the production database currently has only
  Neon Auth tables. The repository's manual ledger records 0001/0002 as applied
  to development, but there is no remote migration-history table confirming
  the exact application history. The repository ledger is
  `backend/neon/migrations/migration-status.json`, not proof of remote state.
- Email delivery, OAuth, successful credentialed sign-in, signed-in CRUD,
  cross-tenant isolation, and storage upload/download remain untested. No Auth
  test user was created. An anonymous production Auth session request returned
  HTTP 200 with a null session; this verifies endpoint reachability, not a
  successful sign-in.
- A direct unauthenticated GET to the development tenant-scoped table returned
  HTTP 400 with a missing-bearer-token error. This is an anonymous denial, not
  proof of authenticated cross-tenant isolation.
- Production snapshot `snap-icy-night-bakyxub5` was created on
  2026-11-09 12:15:21 UTC, before any schema change. Schema comparison confirms
  production lacks the application `public` schema objects present in
  development. Migrations 0001/0002 were reviewed; their `DROP ... IF EXISTS`
  statements replace existing policies/triggers. They have not been applied.
- A Cloudflare Pages `send.otp` webhook handler exists at
  `functions/api/neon-auth-webhook.ts`. It validates Neon Ed25519 signatures
  and sends OppSift-branded OTP messages through the Resend SDK. The static
  deployment does not include this Function: a deployment attempt failed
  because the Resend bundle imports unsupported `node:stream`. Neon webhook
  registration and actual delivery remain untested. See
  `docs/AUTHENTICATION_SETUP.md`.
- **Static Pages deployment (2026-11-10):** the existing `oppsift` project is
  mapped to `https://oppsift.pages.dev` and `https://getoppsift.com`. Latest
  deployment `f4facee4-3202-440b-9e01-87019205c3bf` is production branch
  `main`; its deployment URL, Pages hostname, and custom domain returned HTTP
  200. The deployment includes the public Neon Auth/Data API endpoint URLs in
  the frontend build, as intended for this SDK. The live `/login` page
  rendered and its Auth session request returned HTTP 200 with no active
  session. `/register` explains that sign-up is unavailable; this matches
  Neon production configuration (`allow_sign_up=false`). Google OAuth remains
  disabled. These checks do not prove successful credentialed login, email
  OTP delivery, or account/workspace CRUD.
- The frontend hides demonstration opportunities and explains that live
  listings are unavailable. Production application migrations, opportunity
  ingestion, and opportunity persistence remain unimplemented; do not
  describe this as a live-data launch.
- The production environment has encrypted bindings named `NEON_AUTH_URL`,
  `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `SAM_GOV_API_KEY`; values were
  not read. These bindings serve Functions and are separate from the public
  Auth/Data API URLs in the frontend bundle. Auth configuration inspection
  showed password sign-in enabled, sign-up disabled, mandatory email
  verification, Google OAuth without a configured client, and Neon shared
  email provider. No credentials were used, no Auth user was created, and no
  DNS or database changes were made.
- No database password, unrestricted connection string, Neon management API
  key, Auth secret, or service credential is required by the browser.
- Cloudflare Pages currently serves the static frontend only. There is no
  scheduled ingestion job or production Neon repository.

## 1. Install a compatible Node.js runtime

The setup workstation has Node.js v26.13.0 and npm 11.20.0 installed. The
Neon SDK requires Node.js `>=20.19.0`; Vite and its React plugin require
`^20.19.0 || >=22.12.0`. If setting up another workstation, install a
supported Node.js release satisfying those engines from the official site:

<https://nodejs.org/en/download>

On Windows, choose the Node.js 24 LTS **Windows Installer (.msi)** for the
machine architecture. Keep the npm package-manager and Add to PATH installer
options enabled. No third-party version manager or installer is required.

Close and reopen PowerShell after installation, then check:

```powershell
node --version
npm.cmd --version
```

From `C:\Users\User\Desktop\OppSift`, install exactly from the lockfile and
run the project checks:

```powershell
Set-Location 'C:\Users\User\Desktop\OppSift'
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Do not delete `package-lock.json` or substitute an unpinned package install.

## 2. Verify isolated Neon development resources

In the Neon Console:

1. Select the existing **OppSift** project. Its region is Frankfurt
   (`aws-eu-central-1`); do not create a duplicate project or use production
   data for tests.
2. Select the existing **development** branch. It was created from the
   existing **production** default branch because the project had no `main`
   branch. Confirm the branch indicator before copying endpoints or running
   SQL. Do not recreate it or use production for development work.
3. Use a disposable development database on that branch. Keep production and
   development branches distinct.
4. Confirm Neon Auth and the Neon Data API are provisioned on the development
   branch. Do not provision or modify services on production as part of local
   development.
5. In Neon Auth, configure trusted origins for the local Vite origin:
   `http://localhost:5173`. Vite is configured to bind port 5173 strictly; if
   that port is in use, stop the conflicting local server rather than silently
   accepting an unexpected callback origin.
6. If enabling Google login, add `http://localhost:5173` to the OAuth
   provider's authorized JavaScript origins and use the exact callback URL
   shown by Neon. Enter OAuth client credentials only in Neon/provider
   dashboards, never in the app, `.env.local`, or chat.
7. Email verification uses OTP, as supported by Neon’s shared email provider.
   The app has registration, OTP verification/resend, sign-in, sign-out,
   session restoration, and password reset flows. Message delivery has not
   been validated; use a configured provider and a disposable account before
   relying on these flows. Never send provider credentials in chat.
8. Use the Console's branch-specific connection/API information to copy the
   Neon Auth endpoint and Data API endpoint for the development branch and
   intended database. Do not construct either endpoint by guessing its host
   or path. Do not copy a PostgreSQL connection string into the frontend.

Endpoint names and paths in the Console are authoritative. Both required
browser endpoints must be HTTPS, use the same intended development branch and
database, and have no username, password, query string, or fragment.
`VITE_NEON_BRANCH` is display-only diagnostic metadata, not a credential and
not a security control.

## 3. Configure local public endpoints

Neon deployment writes the `NEON_AUTH_BASE_URL` and `NEON_DATA_API_URL`
variables into the ignored `.env.local`. The app expects the public Vite names
shown below. On this workstation they are already mapped locally; when setting
up another checkout, copy only these two endpoint values (not other Neon
variables) into `.env.local`:

```powershell
code .env.local
```

The required development entries are:

```dotenv
VITE_NEON_AUTH_URL=<development branch Neon Auth endpoint>
VITE_NEON_DATA_API_URL=<development branch Neon Data API endpoint>
VITE_NEON_DEPLOYMENT_ENV=development
VITE_NEON_BRANCH=development
```

If Neon generated its base variables, map them locally to the `VITE_*` names.
Do not expose database, Realtime, or Object Storage credentials with a `VITE_`
prefix. Never paste endpoint values into an issue, commit, or chat.

`.gitignore` already excludes `.env`, `.env.*`, and local `.dev.vars` files
while allowing the example templates. Confirm the ignore rules without
printing local environment contents:

```powershell
Select-String -Path .gitignore -Pattern '^\.(env|dev\.vars)'
```

Vite's `VITE_*` prefix is explicitly public: configured endpoint values are
compiled into the browser bundle so it can reach Auth and Data API. The
Neon SDK does not require the database password in browser code. Do not put
secrets in any Vite variable. The current production build passed, and its
output was checked for the private database, Realtime, and Object Storage
values. Never inspect or share `.env.local` contents in logs.

After changing `.env.local`, stop and restart Vite:

```powershell
npm.cmd run dev
```

The expected local origin is `http://localhost:5173`.

## 4. Migration status and post-application checks

The repository does not have an automated migration runner or an executed
migration history table. Use
`backend/neon/migrations/migration-status.json` as a manual development
ledger; it is not remote migration history. Both migrations were applied in
order to the isolated `development` branch after creating a pre-migration
restore branch (`development-pre-schema-20261106`). Neon snapshots are not
available for this non-root branch.

Post-application inspection confirmed 27 expected tables with RLS enabled,
24 policies, 20 functions, and three category seed rows. Both migrations use
UUID foreign keys for Neon Auth IDs and explicitly cast `auth.user_id()`
from text. Migration 0002 maintains the weighted search vector in a trigger,
since `array_to_string` is not immutable and cannot be used in a generated
column. Production was not changed.

For future schema work, verify the project, branch, and database first; review
the complete SQL and Auth/Data API assumptions; create a restore point; apply
in dependency order; and inspect tables, functions, grants, indexes, triggers,
and RLS before updating the ledger. Test signed-in CRUD and cross-tenant
isolation with disposable accounts before calling persistence production
ready. Never run schema changes on production without separate release
approval.

Example read-only verification queries after the migrations:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_profiles',
    'organizations',
    'organization_memberships',
    'opportunity_categories',
    'opportunities',
    'organization_saved_opportunities'
  )
ORDER BY table_name;

SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'user_profiles',
    'organizations',
    'organization_memberships',
    'opportunities',
    'organization_saved_opportunities'
  )
ORDER BY c.relname;

SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'organizations',
    'organization_memberships',
    'opportunities',
    'organization_saved_opportunities'
  )
ORDER BY tablename, policyname;
```

These catalog checks do not prove policies are correct. Update each entry in
`migration-status.json` with an ISO timestamp only after the migration and
post-apply inspection have succeeded. Record any SQL changes in a new,
ordered migration rather than editing a version confirmed to be applied.
Never include endpoint values, connection strings or credentials in the
ledger.

The app's `/backend-status` read-only probe checks one row in the category
registry. It is not a migration runner, does not prove all schema objects
exist, and does not test authenticated access or RLS isolation.

## 5. Verify the app and authentication manually

Open `http://localhost:5173/backend-status`. The endpoint test is disabled
outside Vite development mode and the diagnostics page does not display
connection details in production builds. This checkout is linked to the development branch, and migrations 0001/0002
are already applied there. Do not create disposable accounts or run write
tests until email delivery is confirmed.

1. Before `.env.local` is configured, expect Auth and Data API to report
   **Not configured**; the Data API test is disabled.
2. After adding development URLs and restarting Vite, the Auth provider
   attempts session restoration. A signed-out response is not a signed-in
   session. Review Neon trusted origins if the request fails.
3. Sign in with a disposable development account, then select **Test Data
   API**. A success confirms only one read of the seeded `government`
   category. The Data API requires an authenticated token in the current
   deployment. A token/permission error, missing-table/migration error, or
   request failure is surfaced as a distinct status.
4. The app now checks password confirmation on `/register`, displays clearer
   invalid/expired OTP errors, and keeps Google login hidden unless explicitly
   enabled. Register a disposable development account, enter the emailed OTP
   at `/verify-email`, then sign in at `/login`. This has not yet been tested
   end to end.
5. Reload and confirm the Neon Auth session is restored. Test sign-out,
   password reset, and Google login only after their Neon/email/OAuth settings
   are configured.
6. With separate disposable users and organizations, test profile and
   organization reads/writes and cross-tenant isolation before storing any
   real private data.
7. A successful category probe does not establish authentication, role
   claims, organization isolation, or correct RLS. Those require controlled
   integration tests on the development branch.

See [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) for user-operated
account steps and the required two-account RLS verification checklist.

If an error occurs, record its generic status and request ID from the Neon
Console where available. Do not copy tokens or full request headers into
logs. Verify branch, database, endpoint origin/path, trusted origin,
migration/table, role grants and RLS policy separately. The diagnostics UI
intentionally does not display raw backend errors or endpoint values.

## 6. What remains unconnected

The existing SDK integration supports auth endpoints and Data API CRUD used
by profile/organization code after correct provisioning. It does **not** make
the following work automatically:

- The parameterized SQL search builder is not executed by the browser client;
  no secure search RPC/repository/API is implemented.
- No verified opportunity rows exist or are seeded. Current search/profile
  examples remain demonstrations.
- Saved searches/history, opportunity details, and Prompt 07 workspace items
  remain browser-local previews. They are not private or server-persisted.
- The source registry and ingestion framework have no production repository,
  worker, scheduler, or privileged admin API. Platform administration stays
  deny-by-default.
- No personal/organization workspace tables or tested RLS exist for tasks,
  notes, milestones, requirements, assignments, or activity.

Do not switch these screens to a "live" label or store sensitive pursuit data
until those repositories, policies and integration tests exist. Do not
reintroduce browser-embedded database credentials to execute complex SQL.

## 7. Cloudflare boundary

This project remains a static Cloudflare Pages frontend (`wrangler.toml`,
build output `dist`). Neon services are deployed, but the site has not been
connected to a Cloudflare Pages release. Public
Neon Auth and Data API endpoint URLs can be used by a browser after the
corresponding database policies are reviewed. A future privileged search,
ingestion, or platform-admin API requires a separately reviewed server-side
runtime and secret boundary; no Worker has been selected or deployed.

The checked-in `.env.preview.example` and `.env.production.example` are
placeholder templates only. Copy the appropriate public endpoint values into
Cloudflare Pages build-time variables for each environment. Preview and
production builds require `VITE_NEON_DEPLOYMENT_ENV` and `VITE_NEON_BRANCH` to
match (`preview`/`preview` or `production`/`production`); otherwise the
frontend refuses to initialize Neon Auth/Data API. Each build selects only
its own suffixed endpoint variables, so the development values in
`.env.local` are not used in preview or production builds. This is a
misconfiguration guard, not proof that the endpoints belong to the named
branch.

Use an isolated Neon preview branch with preview-specific Auth origins and
OAuth credentials; no preview branch exists yet. Keep the existing production
default branch separate, with its own endpoints and provider secrets. Its
application schema is currently absent, so do not deploy the frontend to it
yet. Apply only reviewed, tested migrations to production after approval;
never point a production deployment at development. No Cloudflare release was
deployed or verified.
