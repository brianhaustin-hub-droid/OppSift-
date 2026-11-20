# Neon Auth + Google OAuth setup (OppSift)

This project already includes Neon Managed Auth integration (`@neon/neon-js` + Better Auth adapter), Google sign-in UI, and an OTP email webhook (`functions/api/neon-auth-webhook.ts`). To make auth work you must configure Neon/Auth providers and environment values (no provider secrets go in frontend `VITE_*` vars).

## 1) Enable Neon Auth (Neon Console)

1. Open your Neon project in the [Neon Console](https://console.neon.tech).
2. Select the correct branch/environment (e.g. `development` for local work, `production` for live). Keep branches/environments isolated.
3. Go to **Auth** (Neon Managed Auth) and **enable/configure** it for that branch.
4. In Auth settings, configure:
   - **Trusted domains/origins**: include the exact app origins that will sign in
     - Local dev: `http://localhost:5173` (Vite default in this repo)
     - Production: `https://getoppsift.com` (and/or `https://<project>.pages.dev` if you use it for auth testing)
     - Preview: the exact preview origin(s) only for the preview branch
   - **Sign-up / verification policy**: choose what you want for this environment (e.g. email/password enabled, OTP/email verification required as needed). Keep production locked down until tested.
   - **Email delivery**: Neon shared email can be used for testing on dev; for branded/reliable delivery use the webhook + Resend setup (see section 6). OTP/reset delivery must be verified before launch.
5. Enable/configure the **Neon Data API** for the same branch/database and ensure RLS policies/migrations are applied as required by the app (`backend/neon/migrations/*`). The browser needs the **Auth URL** and **Data API URL** (public endpoints).

> Copy the exact **Auth base URL** and **Data API URL** from Neon Console for the selected branch/database (do not guess paths).

## 2) Configure app environment variables (frontend, public)

These are **public** endpoint URLs used by the browser client (`src/app/auth/neon-client.ts`). Never put database URLs, OAuth client secrets, Resend keys, or other private credentials in `VITE_*`.

### Local development (`.env.local`, gitignored)
```dotenv
VITE_NEON_AUTH_URL=<dev branch Neon Auth URL>
VITE_NEON_DATA_API_URL=<dev branch Neon Data API URL>
VITE_NEON_DEPLOYMENT_ENV=development
VITE_NEON_BRANCH=development
VITE_NEON_GOOGLE_OAUTH_ENABLED=false
```
Set `VITE_NEON_GOOGLE_OAUTH_ENABLED=true` only after Google provider is configured in Neon and tested.

### Preview / Production (Cloudflare Pages environment variables)
Set the matching deployment/branch and branch-specific public endpoints (see `.env.preview.example`, `.env.production.example`):
- `VITE_NEON_DEPLOYMENT_ENV=preview|production`
- `VITE_NEON_BRANCH=preview|production` (must match deployment env per client checks)
- Preview: `VITE_NEON_AUTH_URL_PREVIEW`, `VITE_NEON_DATA_API_URL_PREVIEW`
- Production: `VITE_NEON_AUTH_URL_PRODUCTION`, `VITE_NEON_DATA_API_URL_PRODUCTION`
- `VITE_NEON_GOOGLE_OAUTH_ENABLED=true|false`

Restart/redeploy after changes.

## 3) Create Google OAuth credentials (Google Cloud Console)

You will create credentials and provide them to **Neon Auth** (not to the frontend).

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Configure the **OAuth consent screen** if not already done (app name, support email, scopes as required; for basic sign-in, standard profile/email scopes are typical).
3. Create **Credentials → OAuth client ID → Web application** (use separate clients per environment if possible: dev/preview/prod).
4. Add **Authorized JavaScript origins** for the exact app origin(s) for that environment:
   - Dev: `http://localhost:5173`
   - Prod: `https://getoppsift.com` (and any other trusted app origin you will use)
5. Add **Authorized redirect URI** = Neon Auth Google callback for that branch/environment:
   - Format: `{NEON_AUTH_BASE_URL}/callback/google`
   - Example pattern: `https://<your-neon-auth-endpoint>/neondb/auth/callback/google` (use the **exact** callback/base URL shown in Neon Console/Auth settings for that branch)
6. Save and copy the **Client ID** and **Client Secret**.

> Keep the Client Secret private. Do not add it to repo, `.env.local`, or `VITE_*` variables.

## 4) Configure Google provider in Neon Auth

1. In Neon Console → **Auth** for the target branch → **Providers/Social login** → **Google**.
2. Enable Google sign-in and paste the **Client ID** and **Client Secret** from Google Cloud.
3. Ensure the callback URI in Google Cloud exactly matches the one Neon expects for this branch.
4. Save. Repeat per branch/environment with the correct client/origins.

## 5) Enable Google button in OppSift and test

1. Set `VITE_NEON_GOOGLE_OAUTH_ENABLED=true` for the environment (local `.env.local` or Cloudflare Pages env var for preview/prod).
2. Restart dev server (`npm run dev`) or redeploy Pages.
3. Open sign-in/register page and click **Continue with Google** (`neonClient.auth.signIn.social({ provider: "google" })` is already implemented in `src/app/auth/AuthPages.tsx`).
4. Verify: redirect to Google, consent/login, callback to app, session established, and user can access authenticated routes as expected.

## 6) Email OTP delivery (optional but recommended for branded/reliable OTP)

This repo includes `functions/api/neon-auth-webhook.ts` (Cloudflare Pages Function) to deliver Neon `send.otp` events via Resend.

- **Cloudflare Pages (Functions) secrets/env vars** (server-side, not `VITE_*`): `NEON_AUTH_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (must match configured sender, e.g. `OppSift <noreply@getoppsift.com>` per webhook logic).
- Configure Neon Auth webhook for `send.otp` to point to your deployed endpoint (e.g. `https://getoppsift.com/api/neon-auth-webhook`) with the expected signing/timeout settings.
- Requires compatible Pages runtime settings (see `wrangler.toml`: `nodejs_compat`).
- Test with real delivery before enabling production sign-up/verification flows.

## 7) Troubleshooting checklist

- **"Authentication isn't configured" / config errors**: check `VITE_NEON_AUTH_URL*`, `VITE_NEON_DATA_API_URL*`, deployment env/branch match, and URL validity (HTTPS in non-local).
- **Google button disabled**: set `VITE_NEON_GOOGLE_OAUTH_ENABLED=true` (only after Neon provider configured).
- **OAuth redirect/callback errors**: trusted origin in Neon must exactly match app origin; Google authorized origin/redirect URI must exactly match Neon callback for that branch.
- **401/403 or no session after login**: verify Neon Auth/Data API same branch+DB, trusted origins, and RLS/migrations for app data; `/backend-status` can help diagnose public endpoint/auth status (dev diagnostics).
- **CORS/origin issues**: ensure the exact scheme/host/port is trusted in Neon Auth.
- **Preview/prod isolation**: use separate branches, endpoints, and Google OAuth clients/credentials per environment.

## Security notes
- Never commit `.env.local` or any secrets. Never use `VITE_*` for secrets.
- Configure Google client secrets, Resend keys, and DB credentials only in Neon/Cloudflare/provider dashboards or server-side secrets.
- Do not claim auth/email/OAuth production-ready until real end-to-end delivery and sign-in flows are verified.