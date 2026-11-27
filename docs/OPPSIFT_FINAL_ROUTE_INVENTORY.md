# OppSift Final Route & Screen Inventory

Audit against: the original screen map, the public website/authentication
report, the master Stitch prompt, the advanced UX expansion prompt, and the
financial/production-completion brief.

Conventions used below:

- **Access** is the intended audience. Client-side gating is a UX boundary
  only; Neon RLS and checked server endpoints remain the authorization
  boundary.
- **States** are loading / empty / error. Every route below uses the shared
  `DataSourceBanner`, `EmptyStatePanel`, `ErrorStatusBanner`, toast and
  confirmation primitives where data or mutations exist.
- Theme and layout: every route renders inside `PublicLayout` or
  `WorkspaceLayout`, so dark and light themes, the burgundy gradient sidebar,
  responsive navigation and mobile single-column reflow apply globally. Any
  exception is called out in the table.
- “Provider” means the billing service/API contract in
  `OPPSIFT_BILLING_ARCHITECTURE.md`.

## Public website

| Route | Screen | Access | Purpose | Key components | Primary actions | Backend data | States |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Homepage | Public | Position OppSift, show coverage and product proof boundaries | Cinematic hero, coverage panel, category cards, CTAs | Explore product, pricing, markets, sign-in | Country/source/opportunity totals from live API | Loading banner, no-record panel, error banner |
| `/product` | Product capabilities | Public | Discovery → matching → eligibility → monitoring → preparation → reporting | Capability grid, workflow cards | Start free, view pricing | None | Static |
| `/opportunities` | Categories | Public | Explain tender, procurement, RFP, grant and commercial categories | Category cards, CTA bands | Browse discovery after sign-in | None | Static |
| `/markets` | Global markets | Public | Supported markets, coverage status, currency/time zone facts | Country table, coverage bars, charts | Filter markets, open sign-in | Country coverage | Loading, empty, error |
| `/sources` | Data sources | Public | Source provenance, access method, attribution | Source cards/table | Explore markets | Source registry | Loading, empty, error |
| `/solutions` | Solutions by role | Public | Workflows for business, consultant, NGO, researcher | Role cards | Choose plan | None | Static |
| `/how-it-works` | How it works | Public | Step-by-step workflow | Step timeline | Start free | None | Static |
| `/about` | About | Public | Mission and transparency posture | Editorial sections | Contact | None | Static |
| `/contact` | Contact | Public | Enterprise/team/coverage inquiries | Validated form, confirmation, direct emails | Submit inquiry, reset form | Mail endpoint (not wired) | Validation, submitted |
| `/contact/confirmed` | Contact confirmation | Public | Confirmation state for contact submissions | Confirmation panel | Submit another | None | Submitted |
| `/pricing` | Pricing | Public | Five plans, monthly/annual toggle, entitlement matrix, FAQ, MoR transparency | `PlanTierCard`, `PlanComparisonMatrix`, `CheckoutModal` | Select plan, contact sales, open checkout | Plan catalogue, provider config | Current-plan marker, checkout states |
| `/status` | System status | Public | Honest service state | Status list, badges | Report incident | Runtime checks; no fabricated probes | Unverified/monitored labels |
| `/getting-started` | Getting started | Public | Onboarding guide | Step cards | Create account, docs | None | Static |
| `/docs` | Documentation hub | Public | Search operators, OCDS mapping, eligibility guidance | Doc cards, accordions | Open guides | None | Static |
| `/security` | Security & provenance | Public | Auth, encryption, AI provenance boundaries | Trust sections | Contact | None | Static |
| `/privacy`, `/legal/privacy` | Privacy policy | Public | Data handling, rights, sub-processors, version history | Legal document layout | Cookie preferences | None | Static |
| `/terms`, `/legal/terms` | Terms of service | Public | Usage, billing cadence, disclaimers | Legal document layout | Contact | None | Static |
| `/cookies`, `/legal/cookies` | Cookie preferences | Public | Essential/analytics preferences | Preference toggles | Save preferences | Browser storage | Saved state |
| `/legal/dpa` | Data processing | Public | Sub-processor and erasure information | Legal document layout | Contact | None | Static |

## Authentication and onboarding

| Route | Screen | Access | Purpose | Key components | Actions | Backend | States |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/auth`, `/auth/*` | Authentication suite | Public | Sign in, register, verify, recover, invitation acceptance | Auth cards, OTP, Google OAuth, password policy | Sign in/up, verify, reset, resend | Neon Managed Auth + Google OAuth | Session loading, unverified email, unconfigured service, invalid credentials, rate limit |
| `/login`, `/register`, `/verify-email`, `/reset-password` | Auth aliases | Public | Backwards-compatible auth URLs | Same as `/auth` | Same | Same | Same |
| `/onboarding` | Onboarding wizard | Authenticated | Resumable 10-step profile calibration | Stepper, forms, validation, resume | Save step, continue, finish | Profile endpoint; local draft | Empty, validation, resumed |
| `/accept-invitation` | Invitation | Public/invited | Accept a team invitation | Invitation panel, accept/decline | Accept, decline, sign in | Teams endpoint | Pending, accepted, declined, expired |

## Workspace

| Route | Screen | Access | Purpose | Key components | Actions | Backend | States |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | Dashboard | Authenticated | KPI overview, trend, coverage, quick actions, activity | KPI cards, chart, country table, feed | Navigate, search | Live opportunity/country/source API | Loading, empty workspace, error |
| `/discover` | Explorer | Authenticated | Search and filter the opportunity index | Filter bar, result list/grid/table, compare tray | Search, filter, save, compare, quick view | Discover endpoint | Loading, no results, invalid filters, error |
| `/discover/government` | Government | Authenticated | Category-filtered discovery | Result components | Filter, save | Discover endpoint | Loading/empty/error |
| `/discover/grants` | Grants | Authenticated | Grant discovery | Result components | Filter, save | Discover endpoint | Loading/empty/error |
| `/discover/commercial` | Commercial | Authenticated | Commercial RFP discovery | Result components | Filter, save | Discover endpoint | Loading/empty/error |
| `/discover/search` | Search results | Authenticated | Query results with pagination and sorting | Result list, pagination, sort | Paginate, sort, save search | Discover endpoint | Loading, zero results, invalid filters |
| `/discover/compare` | Comparison | Authenticated | Compare up to three notices | Comparison matrix | Remove, open notice | Opportunity records | Empty tray, loading |
| `/discover/country/:code` | Country profile | Authenticated | Jurisdiction profile, sources, institutions, notices | Country header, source table, notice list | Filter, open source | Coverage/discover endpoints | Loading, unknown country, empty |
| `/sources/:id` | Source detail | Authenticated | Source provenance and verification | Source header, metadata, notices | Open notice | Source record | Loading, not found, empty |
| `/opportunity/:id` | Opportunity dossier | Authenticated | Full notice, requirements, documents, Q&A, eligibility | Tabs, sticky actions, evidence matrix | Save, compare, add to pipeline, copy link, open source | Opportunity record | Loading, withdrawn/expired, missing id |
| `/matched` | Matched opportunities | Authenticated | Matches against profile | Match cards/table | Open, save, tune profile | Matches endpoint | Loading, no matches, error |
| `/saved` | Saved opportunities | Authenticated | Shortlist | Saved list | Remove, open, add to pipeline | Saved endpoint | Empty, loading |
| `/saved-searches` | Saved searches | Authenticated | Managed queries and alerts | Search list | Delete, toggle alerts, re-run | Saved-search endpoint | Empty, loading |
| `/search-history` | Search history | Authenticated | Recent queries | History list | Re-run, clear | History endpoint | Empty |
| `/my-opportunities` | Pipeline | Authenticated | Seven-stage pursuit pipeline | Kanban/list/table, filters | Move stage, set priority, open | Applications endpoint | Empty pipeline, loading |
| `/my-opportunities/:id` | Preparation | Authenticated | Tasks, documents, milestones, notes, activity | Tabs, checklists, forms | Add/complete task, change stage, edit notes | Applications endpoint | Missing item, empty tabs |
| `/intelligence` | AI intelligence | Authenticated | Evidence-oriented analysis workspace | Module tabs, eligibility matrix, chat, report | Select notice, ask question, save analysis, print | Opportunity record; no inference service | No notice selected, insufficient evidence, loading |
| `/alerts` | Alerts & monitoring | Authenticated | Alert rules | Rule cards, creation dialog | Create, pause/resume | Alerts endpoint | Empty rules, validation |
| `/notifications` | Notifications | Authenticated | Match/deadline/amendment events | Notification list | Mark read, open | Events endpoint | Empty |
| `/analytics` | Analytics | Authenticated | Category, market and trend views | Charts, metric cards | Filter, export | Live data aggregates | Empty, loading, error |
| `/reports` | Reporting studio | Authenticated | CSV/JSON/printable reports | Report configuration, preview | Export, save report | Live records | Empty scope, success toast |
| `/teams` | Organisation & team | Authenticated | Members, invitations, capabilities | Member table, invite form, drawer, settings | Invite, inspect, edit org | Teams/settings endpoints | Empty team, validation, permission |
| `/integrations` | Integrations | Authenticated | Supported integrations and state | Integration cards | Connect/disconnect | Integration service | Empty, configuration required |

## Account, security and operations

| Route | Screen | Access | Purpose | Key components | Actions | Backend | States |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/profile`, `/settings` | Profile settings | Authenticated | Identity, organisation, markets, notifications | Tabbed forms | Save profile | Settings endpoint | Loading, validation, saved |
| `/settings/security` | Account security | Authenticated | Sessions, auth method, recovery, deletion, export | Session list, dialogs | Reset password, revoke sessions, export, request deletion | Neon Auth; session revocation via provider | Empty sessions, confirmation, restricted |
| `/settings/preferences` | Global preferences | Authenticated | Language, country, currency, time zone, date format, notifications | Preference forms | Save | Settings endpoint | Validation, saved |
| `/settings/activity` | Activity & audit | Authenticated | User/team/org/billing events | Filter bar, event list | Filter, search | Audit service; locally recorded events | Empty, permission-filtered |
| `/settings/billing` (alias `/billing`) | Subscription & billing | Billing administrator | Plan, status, renewal, entitlements, recovery, seats | Status badge, cards, banner, checkout modal | Upgrade, change frequency, cancel, reactivate, retry payment | Provider snapshot | Free, past due, cancelled, pending change, loading |
| `/settings/usage` | Usage & limits | Billing administrator | Eight metered allowances | Usage cards with progress | Upgrade | Usage endpoint (derived locally today) | Empty, at/near limit |
| `/settings/billing/history` | Billing history | Billing administrator | Invoices and receipts | Invoice table, filters | Filter, open receipt | Provider invoices | No invoices, pending, paid, failed, refunded |
| `/settings/billing/change` | Change plan | Billing administrator | Compare plans, frequency, effective timing | Plan cards, transition summary | Checkout, schedule downgrade, cancel pending | Provider | Current plan, pending change, unavailable |
| `/settings/billing/cancel` | Cancellation | Billing administrator | Consequences, reason, keep plan, confirm | Consequence panel, form | Keep, confirm cancel | Provider | Confirmation, failure, cancelled |
| `/checkout` | Checkout | Authenticated | Standalone checkout | `CheckoutExperiencePanel` | Select plan/frequency, accept terms, pay | Provider checkout | All 10 checkout states |
| `/support`, `/help` | Support tickets | Authenticated | Submit and track requests | Ticket form, list, conversation | Create, reply, resolve, attach | Support endpoint | Empty, open, in review, awaiting reply, resolved |
| `/status` | System status | Public | Service state | Status list | Report incident | Runtime checks | Monitored/unmonitored |
| `/journeys` | Journey state hub | Admin (gated) | Internal QA of lifecycle states | Journey grid | Trigger state | None | Gated |
| `/first-time` | First-time experience | Admin (gated) | Empty-workspace journey | Onboarding empty state | Resume onboarding | None | Gated |
| `/brand-system` | Brand system | Admin (gated) | Design tokens and primitives | Swatches, type scale, components | Copy token | None | Static |

## Financial administration (protected, deny-by-default)

| Route | Screen | Purpose | Components / actions |
| --- | --- | --- | --- |
| `/admin` | Platform operations | Sources, coverage, ingestion, quality overview | Operational tables; admin gate |
| `/admin/sources`, `/admin/coverage`, `/admin/ingestion`, `/admin/quality` | Ingestion operations | Source registry, coverage matrix, job history, quality issues | Tables, retry actions, admin gate |
| `/admin/audit` | Platform audit | Administrative and billing audit events | Filters, event detail, admin gate |
| `/admin/billing` | Billing overview | Confirmed subscriptions, MRR/ARR, failures/churn, revenue trend boundary | Metric cards, no fabricated figures |
| `/admin/subscriptions` | Subscription administration | Customer, plan, status, dates, provider reference, history | Table with empty state |
| `/admin/transactions` | Transactions | Reference, customer, amount, currency, status, provider, date, subscription | Table with empty state |
| `/admin/invoices` | Invoices | Invoice ledger | Invoice table |
| `/admin/plans` | Plans & entitlements | Name, price, frequency, entitlements, availability, provider IDs | Editable form, audited |
| `/admin/coupons` | Coupons | Provider discount codes | Table with empty state |
| `/admin/refunds` | Refunds & disputes | Refund ledger | Table with empty state |

## Duplicate, alias and missing-route audit

- **Aliases (intentional, preserved for compatibility):** `/billing` →
  `/settings/billing`; `/profile` → `/settings` (profile tab);
  `/privacy` → `/legal/privacy`; `/terms` → `/legal/terms`;
  `/cookies` → `/legal/cookies`; `/help` → `/support`; legacy auth paths.
- **Duplicate content risks resolved:** public pricing and in-app plan cards
  share `PlanTierCard`/`PlanComparisonMatrix`; invoice tables share
  `InvoiceHistoryTable`; billing sub-navigation is now mirrored only through
  `BillingSubNav` and the original billing index tabs.
- **Routes deliberately removed from public reach:** `/journeys`,
  `/first-time` and `/brand-system` are internal and gated; they are not
  linked from customer navigation.
- **Missing routes still to add when the backend exists:** no dedicated
  `/admin/customers` or `/admin/usage` route; usage is shown per account and
  plan administration is route-scoped. No separate `/legal/subprocessors`
  route; DPA content covers it.
- **One screen known to be provider-dependent:** every billing mutation
  (checkout, portal, plan change, cancellation, reactivation) is unavailable
  until the billing service is deployed and configured. The UI reports this
  honestly instead of simulating success.

## Design-system consistency

- Public, auth, onboarding, workspace, billing and administration screens use
  the same burgundy/navy tokens, `font-display` headings, `oppsift-card`
  surfaces, `oppsift-sidebar-active` actions, semantic status colours and
  `font-mono tabular-nums` for money, references and dates.
- All tables scroll horizontally on small screens; forms collapse to one
  column; sticky action panels are suppressed in print (`no-print`).
- Native dialogs/drawers provide Escape and focus containment; status badges
  always include a text label (no colour-only meaning).
- Empty states are explicit and actionable on dashboards, discovery, saved
  items, alerts, notifications, reports, invoices, payment methods, refunds,
  team members, support and administration.
