# OppSift final screen inventory

This is the current implementation inventory and the target navigation
architecture. "Implemented" means a frontend route/flow exists; it does not
mean backend connectivity, production readiness, or visual QA.

## Public website

| Route | Current state | Target/constraint |
|---|---|---|
| `/` | Implemented | Earth-art hero; no country map |
| `/platform` | Implemented | Product overview; compatibility alias |
| `/product` | Implemented | Product overview |
| `/opportunities` | Implemented | Category overview, not listings masquerading as live |
| `/markets` | Implemented | Regional text groupings; no map or country cards |
| `/solutions` | Implemented | Keep and align to design system |
| `/how-it-works` | Implemented | Keep and align to design system |
| `/about` | Implemented | Public mission and scope page |
| `/contact` | Implemented | Uses the existing public contact address |

## Authentication and onboarding

| Route | Current state | Target/constraint |
|---|---|---|
| `/login` | Neon email/password; Google config gated | Redesign only; retain real auth and error behavior |
| `/register` | Neon registration, password confirmation, terms | Redesign only; retain verification flow |
| `/forgot-password` | Neon reset request | Preserve |
| `/reset-password` | Neon token reset | Preserve |
| `/verify-email` | Neon OTP verification/resend | Preserve |
| `/accept-invitation` | Organization invitation flow | Preserve |
| `/onboarding*` | No route or persistence contract | Blocked for persistence until profile schema/RLS/API contract exists |

Apple OAuth presentation exists but the callback/action is not integrated.
Never report it as available.

## Authenticated application

| Route(s) | Current state | Target/constraint |
|---|---|---|
| `/dashboard` | Demonstration dashboard | Textual market-scope counts; examples clearly non-live |
| `/discover`, `/discover/search` | Search/filter/results and URL state | Preserve behavior; refresh visual hierarchy |
| `/discover/government`, `/discover/grants`, `/discover/commercial` | Category discovery | Preserve |
| `/discover/country/:code` | Country-filtered discovery | Preserve as a route; no map required |
| `/opportunity/:id[/section]`, `/opportunities/:id[/section]` | Category-aware opportunity intelligence; plural-path alias | Preserve source limits and browser preview behavior |
| `/my-opportunities`, `/my-opportunities/:id` | Browser-local pursuit workspace | Preserve local-only disclosure |
| `/saved-searches`, `/search-history` | Browser-local discovery state | Preserve |
| `/saved` | Shortlist preview route | Preserve its existing route behavior |
| `/intelligence` | Preparation state | No fake AI assessment/actions |
| `/alerts` | Monitoring preparation/preview | Do not imply live notifications |
| `/teams`, `/organizations*` | Organization flows | Preserve Auth and role checks |
| `/settings` | Profile/account settings | Preserve Auth |
| `/backend-status` | Development diagnostics | Keep out of public navigation |
| `/admin*` | Restricted/planned | Keep deny-by-default; backend auth required for operations |
| `/applications`, `/analytics`, `/support` | Planned destinations | Keep explicit unavailable/planned state or implement honest content |

## Visual QA state

## Visual QA state

- Homepage: checked at desktop and narrow widths; Earth-art hero renders with
  no horizontal overflow.
- Product page: Earth-art motion, product overview and the shared brand mark
  checked at desktop width. Mobile review remains pending.
- Application dashboard: checked for the shared app mark and flat, transparent
  card surfaces; review of all other app routes remains pending.
- Markets: tested region filtering and reset behavior; Europe shows 10 markets,
  Asia-Pacific shows 10 including Australia, and all regions returns 30.
- Login: checked at desktop and narrow widths; Earth art loads on desktop and
  the decorative aside is hidden on narrow screens.
- Other application screens remain unreviewed. Authenticated-only paths
  require a safe development session; do not fabricate one or report them as
  visually checked when inaccessible.
- Screenshots were not exported to `docs/screenshots/design-review/`.
