# OppSift infrastructure architecture

## Current topology

- **Web:** React/TypeScript/Vite, hosted as static assets on Cloudflare Pages.
- **Development backend:** Neon PostgreSQL, Managed Auth, and Data API on the
  separate `development` branch.
- **Production:** The existing `production` default branch is separate and was
  not changed by the development setup.
- **Browser configuration:** The app uses one Neon SDK client and public Auth
  and Data API endpoint URLs. Database passwords, provider secrets, and
  private storage credentials must never use a `VITE_` variable.
- **Auth:** Email/password signup requires email verification via OTP on
  development. Neon’s shared email provider is selected, but delivery and
  account flows have not been tested. Google OAuth is not verified.
- **Storage:** The inherited `assets` bucket and `oppsift-private-files` are
  private. No app upload/download flow or access policy has been validated.
- **Realtime:** Disabled on development; production remains unchanged.
- **Application schema:** Migrations `0001` and `0002` are applied to
  development only; 27 expected tables have RLS enabled. Live source data and
  cross-tenant access tests are not yet confirmed.
- **Inherited scaffolding:** The `hello` Neon Function and `assets` bucket
  remain; neither is connected to application flows.

## Intended trust boundaries

The browser is untrusted. Client-side route checks are only UX; database RLS
and permission-checked server-side operations must enforce authorization.
Never expose Neon management keys, database credentials, OAuth secrets,
Auth tokens, or storage credentials to the browser or source control. Keep
development and production endpoints, Auth origins, and credentials separate.

The static Pages app does not currently have a privileged API, ingestion
worker, scheduler, or durable opportunity repository. Do not treat demo data,
browser-local saved items, or a successful backend health probe as live or
tenant-isolated data.

## Safe change sequence

1. Confirm the Neon branch and environment before any write.
2. Review migration SQL and validate it on development only.
3. Inspect resulting schema, grants, RLS policies, and functions.
4. Exercise authentication, Data API, storage, and cross-tenant access with
   disposable accounts and exact test objects.
5. Promote separately reviewed changes to production only after explicit
   release approval.

See [backend setup](./BACKEND_SETUP.md), [local development](./LOCAL_DEVELOPMENT.md),
and [object storage setup](./OBJECT_STORAGE_SETUP.md).
