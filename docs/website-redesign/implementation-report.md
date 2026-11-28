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

Displayed: markets in the registry, markets holding notices, sources registered (with the
operational count), verified notices, sources collected in the last seven days, region
breakdown and the newest recorded collection time. Loading and error states are honest:
on failure the band says the figures could not be read rather than showing remembered
numbers.

Note on "verified notices": the public Data API reads through a row-level policy that
exposes only notices already verified to a source, so the anonymous-visible count is a
subset of the internal table (1,636 of 2,540 on 28 November 2026). The label matches what
the visitor can actually read.

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

### 1.8 Official source showcase

Fifteen genuine official sources, each matched against the live registry by name and
combined with the newest stored HTTP check. Five states are distinguished: *delivering
records*, *connected, no retrieval recorded*, *latest check did not answer*, *registered,
not connected* and *not integrated* (no registry row). The four summary counters cover all
fifteen sources and add up to fifteen. The strip of
source names is decorative, paused on hover and stopped under reduced motion. Statuses,
dates and the reconciling note come from
[source-verification.md](./source-verification.md).

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
- `/o/:id` remains public: share links are part of the approved product model
  (migration 0050). The page renders one notice snapshot, never workspace data.
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

1. **Database policy for opportunities.** The table still carries a `PUBLIC` read policy
   for verified notices (see acceptance ledger §5). Public marketing no longer reads it,
   and the UI gate is in place, but a signed-out caller can still query verified notices
   directly. Changing that policy would break the approved `/o/:id` share model and needs
   an owner decision; the exact SQL and impact are recorded, not applied.
2. **Four of the fifteen showcase sources are not integrated** (Ireland eTenders, Italy
   ANAC, OCDS registry, AIIB). They are labelled "Not integrated", not hidden.
3. **Only 11 of 15 candidates exist in the registry**, and several registered candidates
   have no recorded successful ingestion; the showcase says so per source.
4. **Checkout is not enabled**, so pricing is informational and paid access is arranged
   through contact.
5. **hreflang is not emitted**: the app has UI translations but no localised URLs, and
   emitting hreflang without regional variants would be incorrect.
6. **Analytics and Search Console are not installed.** No measurement ID or site
   verification token is available in this environment; readiness is documented instead.
7. **The legal pages** remain the product owner's existing text and were not re-drafted.
