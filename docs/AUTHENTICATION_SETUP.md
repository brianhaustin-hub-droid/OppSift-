# Neon Auth and organization setup

This guide covers the OppSift browser flows backed by Neon Managed Auth and
the Neon Data API. Use development for setup and testing. Production schema
changes must follow the reviewed migration and recovery process below.

## Phase 2 implementation and verification status

- The installed browser SDK is `@neon/neon-js` 0.10.2 with `@neon/auth`
  0.8.2. The app uses its Better Auth-compatible Neon Managed Auth adapter;
  this is not a separately managed Better Auth service.
- The UI uses Managed Auth for email/password signup and sign-in, Google
  OAuth, email OTP verification and resend, password reset, session restore,
  and sign-out. OTPs and reset tokens are never stored by the app.
- The dashboard and account-data routes require an authenticated, verified
  session in the frontend. Database access still depends on Neon Data API
  authorization and the existing RLS policies; client-side route checks are
  not a substitute for backend authorization.
- A production or preview build now requires an explicit matching
  `VITE_NEON_DEPLOYMENT_ENV` and `VITE_NEON_BRANCH`. The checked-in
  `.env.production.example` and `.env.preview.example` contain only public
  endpoint placeholders and no credentials.
- Read-only Neon MCP inspection was completed on 2026-11-09 for project
  `solitary-frog-05898605` (`OppSift`, organization
  `org-raspy-unit-84322788`). The `production` branch
  (`br-orange-grass-baj3raxz`) is the existing default; `development`
  (`br-plain-fog-balo5ig1`) and `development-pre-schema-20261106`
  (`br-rough-rice-bab5ooks`) also exist. There is no `preview` branch.
- Development Managed Auth is active, trusts only `http://localhost:5173`,
  allows email/password sign-up, and requires OTP email verification.
  Google has no client configured, and email uses Neon’s shared provider.
- Production Managed Auth is active, and `https://getoppsift.com` was the only
  trusted origin in the previous Auth configuration read. Production Data API
  is active, but the last schema comparison found only Neon Auth tables in
  production; development has the application tables.
- The latest authenticated production Auth configuration read confirms
  `https://getoppsift.com` as the trusted origin, localhost disabled, email
  and password enabled, sign-up disabled, mandatory OTP verification on
  sign-in, and session revocation after password reset. Google remains on
  Neon shared keys with no owner-managed client. The configured email provider
  label remains Neon shared delivery, while the `send.otp` webhook below is
  enabled to deliver OTP messages through Resend.
- A production recovery snapshot was created before schema changes:
  `snap-icy-night-bakyxub5`
  (`pre-oppsift-production-schema-2026-11-09`, 2026-11-09 12:15:21 UTC).
- Schema comparison confirmed production lacks the application `public`
  tables/functions present in development. Migrations 0001/0002 create the
  app schema and seed three category reference rows; they do not copy users or
  development records. They contain `DROP ... IF EXISTS` statements for
  existing policies/triggers before recreating them. They have not been
  applied to production pending explicit operator confirmation.
- Development Google OAuth was successfully exercised from the trusted
  `http://localhost:5173` origin using Neon shared keys. This verifies the
  development login flow only; production still has no owner-managed Google
  OAuth client configured. Email/password is enabled on both branches, but
  both currently report Neon shared email delivery. Neon rejected its
  test-email helper for that provider. A production password-reset request
  returned the app's generic response, but the owner did not receive a
  message; real delivery is therefore not verified.
- Cloudflare Pages project `oppsift` has production deployments at
  `oppsift.pages.dev` and `getoppsift.com`. Encrypted production bindings named
  `NEON_AUTH_URL`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` exist; their
  values were not read. The owner reports that Resend marks the domain
  verified. The current deployment serves the webhook on all three production
  hosts, and an unsigned POST returns HTTP 401 as expected. Neon production
  has `send.otp` enabled for `https://getoppsift.com/api/neon-auth-webhook`
  with a 10-second timeout. The owner did not receive either of two
  password-reset test messages, so actual Resend delivery remains unverified.
  No preview branch was created.
- A direct unauthenticated GET to the development protected table was rejected
  with HTTP 400 and a missing-bearer-token error. This verifies the anonymous
  denial only; authenticated cross-tenant isolation is still untested.
- The existing screens and mocked tests do not establish real email delivery,
  provider-side verification enforcement, Google OAuth, password recovery, or
  production readiness. Keep public onboarding disabled until the manual
  provider checks below have passed.
- `functions/api/neon-auth-webhook.ts` implements Neon’s signed `send.otp`
  webhook for branded verification, sign-in, and password-reset email through
  Resend. It verifies the detached Ed25519 signature against the branch JWKS,
  rejects replayed timestamps, applies Resend idempotency by Neon event ID,
  calls Resend's REST API with the Worker-compatible `fetch` API, and logs only
  safe error identifiers. Its seven unit tests pass. Wrangler deployment
  requires `nodejs_compat` with compatibility date `2024-09-23`; the Function
  is deployed and registered in Neon production. Unsigned probes return HTTP
  401. Production email delivery remains unverified because neither of two
  password-reset test messages arrived.

### Phase 2 repository follow-up

The authentication UI and provider wiring described below are implemented in
the repository. Automated validation was rerun on 2026-11-10:

- `npm test -- --pool=threads --maxWorkers=1` passed: 186 tests across 30
  files, including seven signed Pages webhook tests.
- `npm run typecheck` passed.
- `npm run lint` passed with 0 errors and 7 warnings.
- `npm run build` passed with the existing dependency annotation and
  large-chunk warnings.
- Wrangler bundled and deployed the Pages Function with `nodejs_compat`.
  Live endpoint rejection and Neon webhook configuration were verified, but
  real email delivery and production Google sign-in remain unverified.

- `src/app/auth/password-policy.ts` is the single password rule set used by
  registration and reset. It keeps the bcrypt-safe 8–72 character window,
  rejects whitespace-only and edge-spaced values, a small breached-password
  list, and a password equal to a long enough email local part.
- `src/app/auth/otp-resend-cooldown.ts` keeps the 60-second resend window in
  browser storage keyed by the normalized address, so a reload cannot bypass
  it. It is UI throttling only; Neon still owns rate limiting and expiry.
- `src/app/auth/OtpInput.tsx` replaces the single OTP textbox with six
  labelled boxes: digit-only entry, paste distribution, Backspace cascade,
  arrow-key navigation, `autocomplete="one-time-code"`, and automatic submit
  once the sixth digit is entered. The provider call is the only thing that
  marks an address verified.
- A successful OTP check now re-reads the session before the verification
  screen continues, so the app navigates only when Managed Auth reports
  `emailVerified`. The intended `redirectTo` destination is preserved.
- `src/app/diagnostics/backend-health.ts` adds a signed-out read of
  `organization_saved_opportunities` against the Data API with no token
  attached, surfaced on `/backend-status` as the Authorization boundary card.
  It classifies the answer but never renders the response body.
- `public/_redirects` gives Cloudflare Pages the SPA fallback so a direct load
  of `/login` or an opportunity path returns the app instead of 404, and
  `public/_headers` sets `nosniff`, `no-referrer`, `DENY` framing and a
  restrictive permissions policy. Content-Security-Policy is deliberately not
  set yet because it needs the exact Auth and Data API origins.
- `scripts/live-auth-check.mjs` (`npm run test:auth:live`) drives the real
  Managed Auth HTTP surface for the provider checks listed under Required
  manual verification. It is opt-in, needs a developer-operated inbox, and is
  not part of `npm test`.
- The request to test migrations on a temporary branch was approved, but
  migrations have not been run there or on production. Neon’s migration
  workflow requires the exact migration SQL text, then a separate approval
  after branch testing before production changes can be applied.

## Current development state

- Neon currently reports email/password sign-up enabled and mandatory OTP
  verification on `development`; actual message delivery, expiry, one-time
  use, and resend rate limits have not been tested.
- Google OAuth credentials are not configured. The Google button remains
  disabled unless `VITE_NEON_GOOGLE_OAUTH_ENABLED=true`;
  enabling that UI flag does not configure Google in Neon.
- Neon confirmed the development branch and its localhost trusted origin.
  The application tables are present there; the repository's manual ledger
  records migrations 0001/0002 as applied, but there is no remote migration
  ledger proving the exact application history. Do not modify existing
  development data.
- Organization invitation email delivery is disabled. The team screen creates
  a one-time invitation link for the administrator to share; it does not send
  an email.
- Authenticated profile persistence, organization CRUD, session refresh, and
  cross-tenant RLS behavior remain unverified until disposable accounts are
  created and tested by a person in the local browser.

## Safe local setup

1. Follow [BACKEND_SETUP.md](./BACKEND_SETUP.md) to verify the selected Neon
   branch and configure only the public Auth and Data API endpoint URLs in
   ignored `.env.local`.
2. Keep the Vite origin at `http://localhost:5173` and confirm that exact
   origin is trusted in development Neon Auth.
3. Never put passwords, OTP codes, OAuth secrets, database URLs, or Auth
   tokens in `VITE_*` settings, source control, logs, or chat. Do not share
   passwords or verification codes with an assistant.
4. Do not run registration or email tests without the account holder operating
   the browser and inbox. Use disposable development-only email accounts.

## Google OAuth configuration

Configure the Google provider separately on each Neon Auth branch that needs
Google sign-in. Use separate OAuth clients for development, preview, and
production so credentials and allowed origins are isolated.

1. In the Google Cloud Console, create an OAuth 2.0 Client ID for a Web
   application.
2. Add the exact OppSift app origin for that environment to **Authorized
   JavaScript origins**.
3. Use the callback URI Neon documents for the inspected Auth base URL:
   `{NEON_AUTH_BASE_URL}/callback/google`. For production, Neon MCP reports
   the base URL
   `https://ep-proud-pond-baq327cn.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth`,
   so the production **Authorized redirect URI** is
   `https://ep-proud-pond-baq327cn.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth/callback/google`.
   Confirm it matches the callback shown in Neon Console before saving the
   Google client. See [Neon OAuth setup](https://neon.com/docs/auth/guides/setup-oauth).
4. Configure the client ID and secret in that branch's Neon Managed Auth
   Google provider settings. Never put the secret in source, Cloudflare
   frontend variables, `.env.local`, or chat.
5. Add only the environment's app origin to its Neon Auth trusted domains.
   Enable `VITE_NEON_GOOGLE_OAUTH_ENABLED=true` only after a real provider
   login and callback have succeeded on that environment.

## Production and preview isolation

1. The project and branches were inspected through Neon MCP on 2026-11-09.
   Reuse the existing `production` default branch; do not create a duplicate,
   change the default branch, or overwrite development data.
2. Confirm Neon Managed Auth and the Data API are configured independently
   for production. Configure production-specific trusted app domains, Google
   OAuth credentials, and email delivery. Do not reuse development provider
   credentials or endpoint URLs.
3. Create and use a separate preview Neon branch. Preview builds must target
   that branch and have preview-specific Auth origins and OAuth credentials;
   never point preview at development or production.
4. In Cloudflare Pages, set the build-time values from the matching checked-in
   example for each environment. Development uses `VITE_NEON_AUTH_URL` and
   `VITE_NEON_DATA_API_URL`; preview uses `VITE_NEON_AUTH_URL_PREVIEW` and
   `VITE_NEON_DATA_API_URL_PREVIEW`; production uses
   `VITE_NEON_AUTH_URL_PRODUCTION` and
   `VITE_NEON_DATA_API_URL_PRODUCTION`. Set
   `VITE_NEON_DEPLOYMENT_ENV`, `VITE_NEON_BRANCH`, and
   `VITE_NEON_GOOGLE_OAUTH_ENABLED` for each environment as well. The Auth and
   Data API URLs are public endpoints. Database URLs, SMTP credentials,
   Google client secrets, and any other private credential must not use
   `VITE_*`.
5. Keep `VITE_NEON_GOOGLE_OAUTH_ENABLED=false` until Google is verified on
   that exact branch. Production builds fail closed in the client if the
   deployment target and branch label do not match.
6. Configure a verified sending domain with the selected email provider
   (Resend SMTP is a candidate). Keep the SMTP secret in Neon Managed Auth,
   configure a sender such as `accounts@<verified-production-domain>`, and
   send a test email from the production branch before enabling registration.
   Publish the DNS records that Resend provides and verify the domain there
   before using it as a sender.
7. Neon inspection confirmed production has no Google client and initially
   used the shared email provider. Its canonical trusted origin and mandatory
   OTP settings are now configured, but the callback URI, Resend delivery, and
   production schema remain incomplete. Keep sign-up disabled until those
   pieces are configured and tested. Do not expose OTPs to a browser or create
   a separate OTP store.
8. The required branded verification message subject is
   `Verify your email address — OppSift`. Its server-generated message must
   include OppSift branding, the actual Managed Auth code, the expiry from the
   active Managed Auth policy, and security instructions never to share the
   code. Use only a documented Neon template variable or supported webhook
   payload for the code; do not guess template placeholders or mint a second
   code in application code. Apply the same provider-owned security and
   expiry policy to password recovery messages.

## Safe production migrations

1. Create a new, ordered SQL migration; never rewrite a migration already
   applied to development or production.
2. Apply it only to the development branch first, then inspect the resulting
   schema, policies, grants, functions, and representative data. Run
   authenticated positive and negative authorization tests using disposable
   accounts.
3. Review the migration and compare the production schema with the expected
   state before applying it. Take/confirm a recoverable Neon snapshot and
   schedule a low-risk change window. Do not copy users or development data
   into production.
4. Apply the reviewed migration transactionally to the dedicated production
   branch only after approval. Verify the resulting schema and RLS behavior,
   then update the repository migration ledger with the confirmed branch and
   result. The current JSON ledger is not proof of remote state.
5. Keep preview migrations isolated. Promote only reviewed SQL and intended
   seed data; do not reset, restore, or delete the development branch.

## Account flows

1. Open `/register`, enter a name, email, password, and matching confirmation.
2. Retrieve the OTP from the account's own inbox and submit it at
   `/verify-email`. The current Neon Auth configuration does not automatically
   sign in after verification; continue to `/login`.
3. Confirm the email is marked verified and that protected pages become
   available after sign-in. Reload and verify that the session is restored.
4. Test `/forgot-password` and `/reset-password` only after email delivery
   works. Sign out from `/settings` and confirm protected pages require a new
   sign-in.
5. Test Google only after configuring OAuth credentials and the exact callback
   and trusted origins in Neon. Then enable the UI flag and restart Vite.

Errors are shown to the user; invalid or expired verification codes prompt for
a new code. A resend response is intentionally non-enumerating and does not
confirm whether an account exists.

## Profile and organization flows

- `/settings` displays Auth-owned email, verification state, creation date and
  profile image when supplied by Neon Auth. The editable profile row stores
  preferences only; it does not duplicate passwords or verification tokens.
- `/teams` creates organizations through the existing `create_organization`
  database function, including country code, website, and description.
- Owners and administrators can edit organization details. Database grants
  and RLS remain the authorization boundary; hiding edit controls is not
  security enforcement.
- Only owners and administrators can load the full member directory or manage
  invitations. Only owners can grant the administrator role. Members/viewers
  see the organization but not the directory.
- Active organization preference is stored separately for each authenticated
  user in that browser.
- Invitation links are one-time tokens. Share them only with the intended
  person. The recipient must sign in with the invited, verified email address.

## Operator runbook for the steps an agent could not perform

Everything below needs a person with Neon, Google, Resend and Cloudflare
access. Repository work cannot substitute for it, and none of it should be
reported as done until the check actually passes.

### 1. Run the automated suite

From the repository root:

```powershell
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` is the mocked boundary only: it proves the screens call the right
Managed Auth operations and handle the responses. It sends no email and touches
no Neon project.

### 2. Remaining Neon Console checks

Read-only Neon MCP inspection is complete. Production Auth settings and the
production recovery snapshot were changed/created; migrations remain unapplied.

1. Confirm the project matches `.neon`: project
   `solitary-frog-05898605`, organization `org-raspy-unit-84322788`, current
   branch `development`.
2. The branch list, Auth settings, Data API endpoints, and table inventories
   were read via MCP. In the Neon Console, still confirm the exact Google
   callback URI, OTP/password-reset expiry and limits, and supported
   SMTP/template/webhook configuration. Do not infer these values from the
   endpoint hostname.
3. If the CLI is preferred instead of the Console, `npx neonctl projects list`,
   `npx neonctl branches --project-id solitary-frog-05898605` and
   `npx neonctl connection-string` are the read-only starting points; check
   `npx neonctl <command> --help` for the exact flags in the installed version
   rather than copying an example. Managed Auth provider settings are not CLI
   configurable and must be read in the Console.

### GitHub and Cloudflare checkpoint

- The local project directory has no `.git` directory, and Git/GitHub CLI are
  not installed. Therefore there is no trustworthy local Git status, staging
  area, commit, or remote URL to push from this workspace.
- The only matching public GitHub repository found is
  `brianhaustin-hub-droid/OppSift-`; its `main` branch contains only a README
  and one initial commit. No remote history was changed. Do not initialize and
  force-push this workspace over that history.
- `.gitignore` excludes `.env`, `.env.*`, `.dev.vars`, local Wrangler state,
  build output, and dependencies; only the named example env files are
  unignored. `.env.local` is therefore excluded by the checked-in ignore
  patterns, but no Git index could be inspected because this directory is not
  a repository.
- `wrangler.toml` targets Cloudflare Pages output `dist`. Wrangler OAuth is
  authenticated. The `oppsift` Pages project has production deployments on
  branch `main`, and both `oppsift.pages.dev` and `getoppsift.com` are attached.
  Production has encrypted bindings named `NEON_AUTH_URL`, `RESEND_API_KEY`,
  and `RESEND_FROM_EMAIL`; secret values were not read.

### Production email webhook activation

The Pages Function is `POST /api/neon-auth-webhook`. Neon’s documented
`send.otp` webhook skips Neon’s built-in email for that event, allowing the
handler to send the same Managed Auth code through Resend; no OTP is generated
or stored by OppSift. Neon’s docs confirm that custom SMTP alone changes the
sender, not the default template. See [Neon webhook signatures and payloads](https://neon.com/docs/auth/guides/webhooks)
and [customizing Auth emails](https://neon.com/docs/auth/guides/customize-emails).

Cloudflare Wrangler is authenticated; the production Pages project, assets,
Function, and bindings are deployed. The owner reports Resend has verified
`getoppsift.com`. Unsigned POSTs to the custom domain, Pages host, and current
deployment host return HTTP 401. Wrangler's Pages deploy command publishes the
static asset directory together with Functions; it has no functions-only
deployment option.

1. Verify the production bindings exist without displaying secret values.
   Never use a `VITE_*` variable or repository file for the API key.
2. Keep the Neon production Auth webhook subscribed only to `send.otp` with a
   10-second timeout. Sign-up remains disabled pending successful real
   verification and password-reset email delivery.
3. Test OTP verification, sign-in OTP, password recovery, expired codes,
   webhook retries, and sender alignment with disposable accounts before
   enabling sign-up.

### 3. Create the production and preview Neon environments

1. `docs/BACKEND_SETUP.md` records that this project already has a
   **production** default branch and that **development** was created from it,
   but that has not been re-read remotely in this phase. Confirm both branches
   and the default-branch indicator first. Then create one dedicated
   **preview** branch only. Never rename the default branch, never restore or
   delete `development`, and never copy development users or rows into
   preview or production.
2. Enable Managed Auth and the Data API on each new branch, then configure per
   branch: the app origin in trusted origins
   (`http://localhost:5173` for local, the Pages preview host pattern for
   preview, `https://getoppsift.com` plus `https://www.getoppsift.com` for
   production), email/password, email verification and password reset, and a
   Google OAuth client of its own.
3. Take a Neon snapshot/restore point of production before applying any
   migration, and keep the change inside an agreed window.
4. Apply migrations in order to the new branch with the Console SQL Editor:
   `backend/neon/migrations/0001_identity_organizations.sql`, then
   `backend/neon/migrations/0002_global_opportunity_intelligence.sql`. Verify the
   expected tables, RLS policies, grants and `SECURITY DEFINER` functions exist
   before the next migration, then record the confirmed branch and date in
   `backend/neon/migrations/migration-status.json`. That file currently
   describes `development` only, so extend it per branch rather than editing
   the existing development entries; the ledger is bookkeeping, and the SQL
   Editor result is the evidence.
5. Never rewrite an already-applied migration and never promote seed data that
   contains real user rows.

### 4. Google OAuth (per environment)

Follow the five numbered steps in **Google OAuth configuration** above. The two
values that cannot be guessed are the Authorized redirect URI, which must be
copied from that branch's Neon Auth page, and the exact Neon Auth URL used as
the origin. After configuring, test with an internal Google account: a first
sign-in must create the account and land on the intended protected page, and a
second sign-in with the same address must reuse it. Only then set
`VITE_NEON_GOOGLE_OAUTH_ENABLED=true` for that environment.

### 5. Email delivery and the branded verification message

The current implementation uses Neon’s signed `send.otp` webhook and the
Resend REST API, not Neon SMTP. The production Pages Function is deployed and
the Neon webhook is active, but the provider label remains shared and the
password-reset test message did not arrive. Do not put an API key in `VITE_*`,
`.env.local`, a repository file, or chat. Confirm an eligible production
account exists before repeating the test; then verify delivery, code
verification, expired-code rejection, and that no OTP or credential appears
in application logs.

### 6. Live provider test harness

Run it only with a disposable mailbox you control, on the development branch:

```powershell
npm run test:auth:live -- --test-email=you+oppsift-e2e@example.com --confirm-live-email
```

It reads `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` from the
environment, or accepts `--auth-url=` / `--data-api-url=`. It prints
PASS/FAIL/SKIP/MANUAL per check, exits non-zero on any FAIL, and never prints a
password, OTP, reset token or cookie. It asks you to paste the code or reset
token from the inbox when a check needs it. For the expiry check, wait longer
than the configured OTP TTL and add `--stale-otp=<that earlier code>`.

### 7. Cloudflare Pages, then the CSP follow-up

1. Point the Pages project at the repository with build command
   `npm run build` and output directory `dist`, and attach `getoppsift.com`.
2. Set build-time variables per environment: development uses
   `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL`; preview uses
   `VITE_NEON_AUTH_URL_PREVIEW` and `VITE_NEON_DATA_API_URL_PREVIEW`;
   production uses `VITE_NEON_AUTH_URL_PRODUCTION` and
   `VITE_NEON_DATA_API_URL_PRODUCTION`, plus
   `VITE_NEON_DEPLOYMENT_ENV` (`preview` or `production`), `VITE_NEON_BRANCH`
   (the matching branch label) and `VITE_NEON_GOOGLE_OAUTH_ENABLED` only after
   Google passes on that branch. These are public endpoint URLs and flags; no
   credential may be a `VITE_*` value.
3. Deploy a preview first, load `/login` and `/opportunity/demo-01` directly to
   prove `public/_redirects` works, register a test account end to end, and
   confirm `/backend-status` in a production build shows "Diagnostics unavailable".
4. Publish production only after the live harness passes on the production
   branch. Do not announce or market the deployment.
5. Remaining hardening: add a Content-Security-Policy to `public/_headers`
   once the exact Auth and Data API origins are known, with `connect-src` and
   `frame-src` limited to them, and verify the Google OAuth popup and callback
   still work under it.

## Required manual verification

Use the development branch and at least two separate disposable accounts.
Keep credentials and OTPs private and record only pass/fail results.

1. Register a new account and confirm a real verification email arrives.
   Check wrong and expired OTPs, single-use behavior, resend cooldown, resend
   rate limits, and email verification state. Attempt sign-in before
   verification and confirm protected dashboard access is denied.
2. Verify the account with the correct OTP, sign in, test an incorrect
   password, refresh to confirm session restoration, then log out.
3. Configure Google first on development. Test both a new Google account and
   an existing account, redirect handling, and session restoration.
4. Request a real password reset email. Test an incorrect/expired reset link,
   successful password update, single use, and sign-in with the new password.
5. Request the verification and reset emails from the configured provider and
   confirm branding, sender-domain alignment, expiry instructions, and that
   OTPs/tokens never appear in application logs.
6. With account A, create organization A and save profile and organization
   settings. Verify those values reload correctly.
7. With account B, create organization B and confirm it cannot see or change
   organization A's private membership or invitation data.
8. Directly request a protected Data API resource without a session and with
   an unverified session; confirm both receive an authorization failure.
   Exercise each relevant Data API read/write path with each verified account.
   Verify
   cross-tenant `SELECT` returns no unauthorized rows, and unauthorized
   `INSERT`, `UPDATE`, and `DELETE` requests are rejected or affect no rows.
   Include authorized same-tenant operations as positive controls.
9. Test owner/admin/member/viewer behavior and invitation acceptance with
   matching and non-matching verified email addresses.
10. Repeat the checks using actual Auth sessions/JWTs through the application
   Data API. Catalog inspection, a signed-out request, and UI hiding are not
   substitutes for authenticated RLS tests.

Do not claim the backend is fully verified until these checks have been
completed. Do not create real accounts, send email, or write database data on
the user's behalf.
