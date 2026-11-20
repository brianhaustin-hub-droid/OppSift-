# OppSift — other screens report — post-reset state (18 Nov 2026)

The complete presentation layer (public site, authentication visuals, workspace screens, organisation/account screens, administration visuals and utility screens) was removed in the controlled frontend reset. Every route identity is preserved and now renders a minimal placeholder.

## Public marketing site

All public pages render `ScreenPlaceholder` (route path + “Stitch integration pending”): `/ /product /opportunities /markets /sources /solutions /how-it-works /about /contact`. Public navbar/footer are removed; `PublicLayout` removed; `public-pages.css` removed.

## Authentication

`/login /register /forgot-password /reset-password /verify-email` render `AuthScreenPlaceholder`. Neon Managed Auth, Google OAuth, email OTP, password policy, resend cooldown, session handling and the `AuthProvider` remain fully intact — only the visual layer is removed. Auth rules (sign-up enable/disable, terms, valid email, password policy, verified-email gating) are preserved in the services and `AuthenticationRequired`.

## Utility / system states

- `/` public placeholder.
- Protected routes: sign-in required / email-verification required / session loading (same behaviour as before, new minimal UI).
- Unknown routes: placeholder with route path ("Page not found" title from `getPageTitle`).
- `/accept-invitation`: placeholder (invitation RPCs preserved in `organization-service.ts`).
- `/admin*`: permission semantics unchanged via `hasPermission`/`currentPreviewRole`; renders placeholder.
- `/backend-status`: placeholder; `backend-health.ts` preserved for local diagnostics.
- `/support`: placeholder; `/analytics`: placeholder.

## Organisation & account

- Organisations/teams/invitations: visual removed; DB/RPC functionality extracted into `src/features/organizations/organization-service.ts` (list members, pending invitations, issue/revoke/accept/decline invitation, change role, remove member, transfer ownership) and preserved `OrganizationProvider` (memberships, create/update organization, active organization).
- Settings: visual removed; `user_profiles` functionality extracted into `src/features/account/user-profile-service.ts`.
- Backend status: visual removed; `backend-health.ts` preserved.

## Administration

`/admin`, `/admin/sources`, `/admin/coverage`, `/admin/ingestion`, `/admin/quality`, `/admin/source/:id` — unchanged permission semantics; placeholder rendering. No admin backend ever existed; none was added.

## Missing vs master blueprint

Pricing, Integrations, Subscription & billing, separate Reports screen, onboarding wizard, notifications list, and a real help centre remain unimplemented (not implemented in the reset either).
