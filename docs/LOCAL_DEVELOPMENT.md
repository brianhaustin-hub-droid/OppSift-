# OppSift local development

## Requirements

Use a supported Node.js LTS release and npm. The setup workstation has
Node.js v26.13.0 and npm 11.20.0 installed. In PowerShell, `npm.cmd` avoids
PowerShell script execution-policy issues.

## Start the app

From the repository root:

```powershell
npm.cmd ci
npm.cmd run dev
```

Vite binds strictly to `http://localhost:5173`. If that port is occupied,
stop the process that owns it rather than changing the configured origin
without updating Neon Auth trusted origins.

The ignored `.env.local` contains local Neon-generated server values and the
public `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` mappings. Never print
or commit its contents. These browser endpoint URLs are public; no database
password or provider secret belongs in a Vite variable. The local Neon context
is the development branch, not the production branch. `VITE_NEON_BRANCH` is
display-only metadata for `/backend-status`, not a security control.

## Neon branch and environment

The installed Neon CLI is 8.23.1. The repository is linked to project
**OppSift**, and `.neon` pins local work to `development`. The project default
is still `production`; always select/verify the development branch before a
write. To switch and refresh only the selected branch's Neon environment:

```powershell
neon checkout development
neon env pull
```

Review `.env.local` variable names and update the public `VITE_NEON_*` mapping
without printing or copying private values. The `NEON_*`, database, and storage
credentials remain server-side. No Neon Function is currently connected to
the app, so there is no function runtime to start locally.

## Database inspection and migrations

The reviewed migrations 0001 and 0002 are applied to the **development**
branch only; production is unchanged. The pre-migration restore branch is
`development-pre-schema-20261106`. Verify the exact branch before future
schema writes. Inspect tables with
`information_schema.tables`, RLS state with `pg_class.relrowsecurity`, and
policies with `pg_policies`. A database connection string is not needed in
the frontend.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

The development app tables are migrated. `/backend-status` can report safe
Auth/Data API state but does not prove authenticated account flows, cross-tenant
RLS, or object-storage access. See
[backend setup](./BACKEND_SETUP.md) and
[authentication setup](./AUTHENTICATION_SETUP.md) before testing accounts or
applying SQL.
