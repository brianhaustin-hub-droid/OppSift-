# OppSift public website redesign — implementation report

Date: 28 November 2026
Scope: the public, pre-authentication website at https://getoppsift.com
Branch: `freebuff/fe40e5598501fed4d5f44bcc`

This report describes what was actually changed, what was preserved, and what remains
open. Every figure quoted here was read from the platform database on 28 November 2026;
the queries and results are in [source-verification.md](./source-verification.md).

---

## 1. What changed

### 1.1 One consolidated homepage

The five primary marketing areas are now sections of a single page with anchor
navigation, a sticky header and active-section indication:

| Section | Anchor | Previous separate page | Route behaviour today |
| --- | --- | --- | --- |
| Product capabilities | `#product` | `/product`, `/platform` | forwards to `/#product` |
| Opportunity categories | `#opportunities` | `/opportunities`, `/solutions` | forwards to `/#opportunities` |
| Markets | `#markets` | `/markets` | forwards to `/#markets` |
| Sources | `#sources` | `/sources` | forwards to `/#sources` |
| Pricing and access | `#pricing` | `/pricing` | forwards to `/#pricing` |
| How it works | `#how-it-works` | `/how-it-works` | forwards to `/#how-it-works` |

`SectionRedirect` in `src/ui/App.tsx` performs the forward with `history.replaceState`
and scrolls to the section, so old links keep working and the URL remains shareable as
`/#section`.

Homepage order: hero → platform figures → product capabilities → opportunity
categories → market coverage → official sources → credibility → how it works →
pricing → FAQ → final call to action → footer.

### 1.2 Hero

- Eyebrow: **GLOBAL OPPORTUNITY INTELLIGENCE**
- Headline: **Global opportunities. Clearer decisions.**
- Supporting: *Discover tenders, grants, RFPs and commercial opportunities through one
  global intelligence platform.*
- Primary CTA: **Get Started** → `/register`; secondary: **Explore the Platform** →
  `#product`.
- No superlatives, no invented customer claims, no countdowns.
- The product demonstration beside the hero is explicitly labelled
  "Illustrative product view with sample data. No live opportunity records are shown on
  this public page." It is static sample content, not a live feed.

### 1.3 Photographic background

`src/ui/components/media/PhotographicBackdrop.tsx` keeps the existing continuous
photographic sequence:

- The approved collection is `PHOTOGRAPHIC_SLIDESHOW_IMAGES`, currently **300 attributed
  images** (Wikimedia Commons and NASA), each with provider, licence and source URL in
  `src/ui/data/photographicSlideshow.ts`. The requested "100-image" experience is
  satisfied by this superset; no image is missing or substituted.
- Automatic crossfade every 7 s, wrapping indefinitely, with **no media controls**.
- Only the current image and the next two are requested; the collection is never
  downloaded up front. The first image is marked `fetchPriority="high"` and is preloaded
  from `index.html` because it is the LCP element.
- `prefers-reduced-motion: reduce` stops the sequence entirely (one static photograph)
  and disables the source marquee.
- Overlay scrims preserve headline contrast in both themes.

### 1.4 Verified statistics

`src/ui/data/platformStats.ts` derives every public figure from small public aggregate
views (`global_countries`, `coverage_truth`, `opportunity_sources`). The marketing page
never reads the `opportunities` table.

Displayed (production build snapshot, 28 November 2026): 101 markets in the registry,
18 markets holding verified notices, 180 source integrations of which 86 are marked
operational, 1,609 verified notices, the count of integrations with a successful
retrieval in the last seven days, a regional breakdown and the newest recorded
collection. Loading and error states are honest: on failure the band says the figures
could not be read rather than showing remembered numbers.

**How the figures are produced.** `scripts/build-public-stats.mjs` runs before
`vite build` and writes `public/platform-stats.json` from three aggregate views
(`public_platform_stats`, `public_market_coverage`, `public_region_coverage`). The
browser reads that file; it makes no database request at all. Three consequences:

- Anonymous visitors have no read path to the opportunity, provenance or source-registry
  tables (migration 0057), so no record and no provider identity can reach a visitor.
- The marketing bundle no longer ships the database/auth client.
- The file carries `generatedAt`, and the page shows the age of the newest collection, so
  a stale snapshot is visible rather than implied.

**Definitions, one per figure** (also recorded in the snapshot file):

| Figure | Definition |
| --- | --- |
| Markets in the registry | rows in `global_countries` with an ISO alpha-2 code (101) |
| Markets with verified notices | markets holding at least one verified notice (18) |
| Source integrations | rows in the internal acquisition registry (180) |
| Operational integrations | registry rows marked `operational` (86) — not a delivery guarantee |
| Verified notices | notices marked `valid`, source-verified and linked to a verified source (1,609) |

The distinction the review asked for: production stores **1,636** notices, of which
**1,609** meet the verification rules; the remaining 27 fail at least one rule and are
excluded from every public figure. The public site shows 1,609 and labels it "Verified
notices". The two numbers are never added together or used interchangeably. The dev
branch holds a larger corpus (2,540 stored / 2,513 verified) and is not what the public
site reports.

### 1.5 Product capabilities

Six capabilities with availability labels: Discovery, Profile matching, Monitoring and
Preparation & reporting are **Available now**; Eligibility and Intelligence are **Rolling
out**, with a plain-language explanation that unanalysed notices show verified source
fields and links to the published documents instead of guesses.

### 1.6 Opportunity categories

Three categories — government procurement, grants and funding, commercial opportunities —
each with a short description, the fields preserved per category, and a link to its
independent guide. The section states that no listings, buyers, reference numbers, values
or dossiers are published publicly.

### 1.7 Markets

- Four derived counts: markets in the registry, markets with registered sources, markets
  holding collected notices, sources with a successful retrieval in the last seven days.
- Region distribution bars and a market table (name, region, notices, sources with active
  count, newest collection), with a toggle to show all registered markets.
- Explicit note that a registry entry is not a supported market, and that a market whose
  sources answer but deliver nothing is not presented as covered.

### 1.8 Data ecosystem (no provider disclosure)

The public site does **not** name its data providers, show their logos or URLs, or publish
per-provider connection status. The Sources section describes the ecosystem by category:

- Government procurement
- Public tendering systems
- Grants and funding databases
- Commercial procurement channels
- Institutional data networks
- Open contracting data ecosystems

Copy: *Intelligence from a connected global data ecosystem* / *Structured information from
diverse public and institutional data environments across supported markets...*, followed by
an aggregate strip (markets in the registry, registered integrations, operational
integrations, collections in the last seven days), a decorative publisher-to-workspace flow
line that stops under reduced motion, and an explicit note that registered integrations
include environments still being verified.

The `/official-data-sources` landing page was rewritten the same way: its URL is preserved
for search, and its wording no longer lists publishers. The 15-candidate verification
remains an internal record in `source-verification.md`; the registry, connectors,
diagnostics and admin monitoring are untouched.

### 1.9 Credibility

There are no verified named customers, logos or testimonials, so the section is
**"Built for organisations pursuing global opportunities"** — six audience types, three
provenance/measurement statements, and a visible note that no customer is named until
they agree to be. No invented brands.

### 1.10 How it works

Five stages: Discover → Understand → Evaluate → Monitor → Pursue, one sentence each.

### 1.11 Pricing and access

The five plans come from `INITIAL_PLAN_CATALOG` (`src/ui/data/billingConfig.ts`): Free $0,
Solo $19, Professional $49, Consultant $99, Team custom. The section states per-month USD
pricing, that new accounts start on Free, and that **online checkout is not enabled in
this deployment**, so no payment is collected on the website. This matches the deployed
configuration: `VITE_BILLING_API_URL` and the Lemon Squeezy variant variables are not set,
so `isBillingServiceConfigured` is false.

### 1.12 FAQ and conversion

Eight FAQs rendered with native `<details>`/`<summary>` (keyboard accessible, no custom
ARIA needed). Final CTA uses the approved headline *Find the right opportunity. Know what
to do next.* with **Get Started** to `/register`.

### 1.13 Header, navigation and footer

- Header: logo, five section links, Sign In, Get Started, language switcher, mobile menu
  with `aria-expanded`, Escape handling, focus return and a skip link.
- Footer: Product / Resources / Company / Legal columns, brand description, theme toggle,
  contact address and copyright. Duplicated links and the former development-status strip
  (`DataSourceBanner`, "Opportunity database connected · synced …") were removed from the
  public layout.

### 1.14 Public / authenticated boundary

- All workspace routes (`/dashboard`, `/discover*`, `/opportunity/*`, `/saved*`,
  `/my-opportunities*`, `/intelligence`, `/alerts`, `/notifications`, `/analytics`,
  `/reports`, `/teams`, `/settings*`, `/billing`, `/checkout`, `/admin*`, `/integrations`,
  `/support`, `/matched`) render through `AuthGate`, which mounts the route only for a
  verified session. Signed-out visitors get a sign-in prompt and no workspace query is
  issued.
- The public site no longer mounts `AppStateProvider` at all: `src/ui/WorkspaceApp.tsx` is
  a lazy module, so the homepage cannot load opportunity records. This also removed an
  anonymous opportunity-table read that the previous homepage performed.
- `/o/:id` is public only for notices an owner has explicitly shared. The page asks the
  Pages Function `/api/shared-notice/:id`, which runs `get_shared_notice(id)` as the
  database owner; that function returns a row only when an active, revocable row exists in
  `opportunity_share_links` (migration 0057). With no share row it returns nothing, so a
  guessed id discloses nothing. Share creation from the workspace ("Copy public link")
  records who authorised the share.
- Client routes are only a UX boundary. Database authorization is unchanged and is
  described, with the open item, in [acceptance-ledger.md](./acceptance-ledger.md) §5.

### 1.15 SEO

Implemented in [technical-seo-audit.md](./technical-seo-audit.md): build-time prerender of
15 public routes, per-route titles/descriptions/canonicals/social metadata, Schema.org
JSON-LD, sitemap, robots, four independent landing pages and a keyword map. No sitemap
entry, canonical or JSON-LD field references a workspace or opportunity URL.

### 1.16 Performance

- The authenticated application is a separate lazy module; workspace, admin, billing and
  intelligence screens are further split per page.
- Initial JavaScript fell from 1,224.83 kB (291.51 kB gzip) to the figure recorded in
  [technical-seo-audit.md](./technical-seo-audit.md) §7 after splitting the application,
  and again after trimming the retired marketing page components from `PublicPages.tsx`.
- The public pages render server-prerendered HTML with content before hydration.

---

## 2. What was preserved

- React 19 + TypeScript + Vite stack, Tailwind v4, existing routing and design tokens.
- Burgundy Executive (#541B32) as the dominant identity with Global Intelligence navy
  (#164E8B), light and dark themes.
- The approved 300-image attributed photographic collection and its crossfade behaviour.
- Every utility, authentication, onboarding, workspace, billing and admin route and
  component; `/o/:id` share pages.
- Legal pages, documentation, security page, system status, contact and getting started.
- Neon auth/Data API architecture, RLS, ingestion infrastructure, migrations and worker
  configuration. No schema change was made in this work.
- No payment provider, plan or entitlement was added or changed.

## 3. What was removed

- The separate marketing page components for Product, Opportunities, Markets, Sources,
  Solutions, How it works, Pricing and the previous homepage, from
  `src/ui/pages/public/PublicPages.tsx` (their URLs forward to the homepage). Roughly 1,200
  lines of duplicated marketing markup were deleted rather than kept as dead code.
- The development-status banner from the public layout.
- The anonymous opportunity-feed preview in the homepage hero (replaced by labelled sample
  content).

## 4. Known limitations

1. **Stale Data API schema cache.** The managed Data API has not yet picked up the new
   aggregate views, the share table or `get_shared_notice`; it answers 404 (PGRST205) for
   them even after `NOTIFY pgrst, 'reload schema'`. Nothing public depends on them any
   more: statistics come from the build snapshot and share reads go through the Pages
   Function. Share creation from the workspace reports a warning until the cache refreshes.
2. **Share links need a deployment.** `/api/shared-notice/:id` is a Pages Function, so it
   does not exist under `vite dev`; locally the page correctly renders "not publicly
   shared". The SQL function itself was tested directly (a row is returned only while a
   share row exists), but the Worker route has not been exercised in a Workers runtime here.
3. **Coverage counts verified notices only** (18 markets), although the internal corpus
   holds notices for 23. The difference is rows that fail the verification rules.
4. **Checkout is not enabled**, so pricing is informational.
5. **No hreflang**: UI translations exist but there are no localised URLs.
6. **Analytics and Search Console are not installed**; no measurement ID or verification
   token is available in this environment.
7. **Legal pages** remain the owner's existing text.

## 5. Corrections applied after review (28 November 2026)

The first implementation treated the 15 verification candidates as a public showcase. That
was wrong: the candidates were internal verification input, and a provider directory is not
a marketing asset. This section records what was corrected and how it was checked.

### 5.1 Provider identities removed from every public surface

- Homepage Sources section rebuilt around six ecosystem categories; no names, logos,
  publisher URLs or per-provider status.
- `/official-data-sources` rewritten (title, description, H1, four sections, links); the URL
  is kept, the provider list is gone.
- `sourceShowcase.ts` deleted; `site-content.json` no longer contains a candidates array;
  the prerender snapshot emits categories instead of a provider list.
- The site-wide marquee of provider names was removed from markup and CSS.
- Checked: built HTML, sitemap, robots, JSON-LD and the client bundle contain none of the
  15 identifiers (SAM.gov, Grants.gov, CanadaBuys, AusTender, Contracts Finder, PhilGEPS,
  TenderNed, BOAMP, Tenders Electronic Daily, PPIP, ANAC, eTenders, AIIB, OCDS, TED), and
  the rendered page has no provider-status wording. Internal code paths (workspace and
  admin chunks, ingestion, registry) still use them and were not modified.

### 5.2 Statistics re-defined and decoupled from the database

- Public figures now come from a build-time aggregate snapshot; no anonymous query.
- Production truth: 1,636 stored notices, 1,609 verified, 18 markets with verified
  notices, 180 registered integrations, 86 operational. The review's concern about
  interchangeability is addressed by definitions in the UI, the snapshot file and this
  report.
- The previous report's "1,636 of 2,540" sentence conflated the production corpus (1,636)
  with the dev corpus (2,540); both are now stated separately and correctly.

### 5.3 Anonymous opportunity access closed

Migration `0057_close_anonymous_opportunity_reads.sql`, applied to the dev branch and to
the production branch:

- `verified_opportunities_public_read` dropped; `opportunities_authenticated_read` created
  with the same verification predicate, for `authenticated` only.
- `SELECT` revoked from `PUBLIC`/`anonymous`/`anon` on `opportunities`,
  `opportunity_source_records`, `opportunity_source_links`, `opportunity_sources`.
- New `opportunity_share_links` (RLS: owner-only, `created_by = auth.user_id()`), and
  `get_shared_notice(uuid)` (`SECURITY DEFINER`, execute granted to `anonymous`).
- Aggregate views for the build script, granted to `authenticated` and `anonymous`.

Evidence (direct database and API tests, not browser navigation):

| Actor | Statement | Result |
| --- | --- | --- |
| `anonymous` | `select count(*) from opportunities` | `permission denied for table opportunities` |
| `anonymous` | `select title from opportunities limit 1` | `permission denied` |
| `anonymous` | `select * from opportunity_source_records` | `permission denied` |
| `anonymous` | `select * from opportunity_sources` | `permission denied` |
| `anonymous` | `select * from opportunity_source_links` | `permission denied` |
| `anonymous` | `select count(*) from get_shared_notice(<unshared id>)` | 0 rows |
| `anonymous` | same call while an owner share row exists | 1 row |
| `anonymous` | same call after the share row is revoked | 0 rows |
| `authenticated` | `select count(*) from opportunities` | 1,609 (unchanged workspace visibility) |
| Data API (`anonymous` JWT) | `GET /rest/v1/opportunities?select=id&limit=1` | 403 `permission denied for table opportunities` |
| Data API (`anonymous` JWT) | `GET /rest/v1/opportunity_sources?select=id` | 403 `permission denied` |

The test share rows were deleted afterwards; production has zero share rows, so no notice
is publicly readable at the time of writing.

### 5.4 Share links kept, but only by explicit authorisation

`/o/:id` now renders through the Pages Function and shows "This notice is not shared
publicly" for anything not explicitly shared. The workspace "Copy public link" action
creates the share row first. This preserves the share feature without retaining a blanket
anonymous exception; it also means previously copied links stop resolving until the owner
shares them again, which is the intended consequence of the privacy boundary.

### 5.5 Credibility and trust section

Unchanged in substance and consistent with the review: "Built for organisations pursuing
global opportunities", the six audiences, and the explicit statement that no customer is
named until they agree to be.

### 5.6 Remaining anonymous database grants removed

Migration `0058_revoke_unused_anonymous_grants.sql` removes every grant the public site no
longer uses. Anonymous visitors have no database path at all now: figures come from
`public/platform-stats.json`, `/o/:id` reads through the Pages Function, and share creation
is the authenticated server route. `authenticated` access is unchanged — each object that
was reachable through a base `PUBLIC` grant is granted to `authenticated` explicitly, so the
workspace sees the same rows as before.

Removed from `PUBLIC`/`anonymous` (granted to `authenticated`): `global_countries`,
`currencies`, `country_currencies`, `country_languages`, `languages`,
`opportunity_categories`, `opportunity_types`, `opportunity_analyses`,
`opportunity_versions`, `coverage_override`, `country_classification_mappings`,
`ingestion_funnel`, `market_intelligence_summary`, `opportunity_dedupe_suspects`,
`coverage_truth`, `source_country_coverage`, `country_lead_summary`,
`country_live_summary`, `country_source_live_status`, `source_leads_public`,
`source_live_status`, `public_platform_stats`, `public_market_coverage`,
`public_region_coverage`, `opportunity_source_links`.

`source_leads_public` is the notable one: it exposed 7,373 acquisition leads — the provider
identities the public site is no longer allowed to publish — to any unauthenticated caller.

`get_shared_notice(uuid)` and `get_sources_coverage_summary()` keep no `PUBLIC`/`anonymous`
execute grant; the Pages Function calls the first as the owner role.

**Verification against the production database (after applying 0058).**

| Check | Result |
| --- | --- |
| `anonymous` select over all 25 objects above | `permission denied` on every one |
| `anonymous` execute `get_shared_notice(uuid)` | `permission denied for function` |
| `anonymous` execute `get_sources_coverage_summary()` | `permission denied for function` |
| `authenticated` counts (countries, coverage, categories, leads, sources, notices) | 101 / 101 / 3 / 7,373 / 516 / 1,609 — identical to the pre-migration baseline |
| `authenticated` `opportunity_source_links` / `opportunity_sources` | 1,636 / 180 (workspace unchanged) |
| `GET /api/shared-notice/<id>` after an owner share row | 200 with the notice payload |
| same call after revoking the share row | 404 `not publicly shared` |
| `POST /api/share-links` without a session | 401 (no share row written) |

The build also stopped importing the database client into the public entry: `formatLiveAge`
moved to `src/ui/data/relativeTime.ts`, taking the marketing bundle from 743.95 kB
(192.58 kB gzip) to 548.27 kB (133.09 kB gzip).

## 6. Deployment record (28 November 2026)

Deployed by pushing the branch to `main`; Cloudflare Pages built it and the new entry bundle
went live (`assets/index-BPFKle01.js`, 548.32 kB / 133.11 kB gzip). Verified on
`getoppsift.com`, signed out, in a real browser:

| Check | Result |
| --- | --- |
| Homepage figures | 101 markets, 180 integrations, 86 operational, 1,609 verified notices, "Aggregate snapshot of the platform database · newest collection 2 d ago" |
| `platform-stats.json` on the origin | `marketsRegistered 101`, `marketsWithNotices 18`, `verifiedNotices 1609`, `registeredSources 180`, `operationalSources 86` |
| Provider names in served HTML, JS bundle or `sitemap.xml` | none (0 matches for the provider list used in §5.1) |
| `/o/<unshared id>` | `noindex,nofollow`, renders "This shared notice is unavailable", no record content |
| `GET /api/shared-notice/<id>` | 404 when the function is configured; 503 today because `DATABASE_URL` is not set on the Pages project |
| `POST /api/share-links` with no session | 401 |
| `/login` | sign-in form renders (email, password, Google), session endpoint 200 |
| `/discover` signed out | "Sign in to open the workspace", no workspace data loaded |

Two defects were found by this verification and fixed in the same deploy:

1. `/login`, `/register` and the verification routes rendered **nothing** in production.
   `AuthScreensPage` called `useAppState()`, which throws outside `AppStateProvider`; the auth
   module deliberately does not mount that provider. It now uses an optional accessor and only
   shows toasts when a provider is present.
2. Shared-notice pages inherited the workspace title. They now use "Shared notice — OppSift".

Outstanding after deployment — both need Cloudflare dashboard access, not code:

- The Pages project does not set `DATABASE_URL` for Functions, so `/api/shared-notice/:id`
  returns 503 and the share feature is not usable until the variable is added. The page still
  exposes no record and stays `noindex`.
- The deployed HTML is the raw Vite shell (`<div id="root"></div>`, 4.3 kB) rather than the
  prerendered document produced by `scripts/prerender-seo.mjs`, so the head metadata and JSON-LD
  ship but the per-route body snapshot does not. The Pages build command therefore needs to be
  `npm run build` (not `vite build`).
