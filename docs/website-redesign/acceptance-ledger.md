# Acceptance ledger — public website redesign

Date: 28 November 2026
Legend: **Done** = implemented and checked; **Partial** = implemented with a stated limit;
**Blocked** = cannot be completed safely in this environment; **Not done** = deliberately
out of scope.

| # | Requirement | Status | Evidence / verification |
| --- | --- | --- | --- |
| 0 | Inspect the current repository, routes, data and design system before editing | Done | Files read: route table, `App.tsx`, `PublicLayout`, `PublicPages`, `PublicOpportunityPage`, `live.ts`, `liveness.ts`, `billingConfig.ts`, `photographicSlideshow.ts`, tsconfigs, migrations 0043/0050/0053, `wrangler.toml`, `_redirects`, `_headers` |
| 0 | Verify actual country / source / record data | Done | Read-only SQL against the configured Neon branch; results in [source-verification.md](./source-verification.md) |
| 1 | Five primary marketing areas on one homepage | Done | `src/ui/pages/public/PublicHomePage.tsx`; ids `product`, `opportunities`, `markets`, `sources`, `pricing` |
| 1 | Retired marketing URLs keep working | Done | `SectionRedirect` in `src/ui/App.tsx`; `/product`, `/platform`, `/opportunities`, `/markets`, `/sources`, `/pricing`, `/how-it-works`, `/solutions` |
| 1 | Utility, auth and legal pages preserved | Done | About, contact, docs, getting started, security, status, four legal pages, auth suite, onboarding, workspace routes |
| 1 | Sticky header, active section, mobile menu, anchor deep links | Done | `PublicLayout` with IntersectionObserver, `aria-expanded`, Escape, skip link, scroll-margin |
| 2 | Burgundy-dominant identity, navy support, both themes | Done | Existing tokens retained; burgundy accents on header CTA, section eyebrows, pricing highlight, CTA panel |
| 2 | Professional visual standards, no generic SaaS clutter | Done | Smaller radii, restrained shadows, 3 capability columns, one accent per category |
| 3 | 100-image background preserved, automatic, no controls | Done | `PHOTOGRAPHIC_SLIDESHOW_IMAGES` has 300 attributed images (superset of 100); 7 s crossfade loop; no player UI |
| 3 | Only initial images loaded; responsive; reduced motion | Done | Initial image `fetchPriority="high"` + preload; next 2 prefetched; `prefers-reduced-motion` stops the loop |
| 4 | Approved hero copy and CTAs | Done | Eyebrow, headline, supporting line, Get Started → `/register`, Explore the Platform → `#product` |
| 5 | Statistics from application data, no hardcoded figures | Done | `usePlatformStats` reads `global_countries`, `coverage_truth`, `opportunity_sources`; timestamps displayed |
| 5 | No planned market counted as active; no config counted as connection | Done | Markets with records derived from `record_count > 0`; sources reported as registered vs operational vs with successful retrieval |
| 6 | Six capabilities with honest availability | Done | Four "Available now", two "Rolling out", with explanatory note |
| 7 | Three opportunity categories, no public listings | Done | Category cards + guides; explicit note that no listings/dossiers are public |
| 8 | Markets section distinct from registry | Done | Four separate counts, region bars, market table, explanatory note |
| 9 | Fifteen genuine official sources with real status | Done | Registry match + live checks; 11 registered, 4 labelled not integrated; per-source evidence in [source-verification.md](./source-verification.md) |
| 9 | No fake "15 live integrations" claim | Done | Summary shows delivering / connected-without-retrieval / not integrated |
| 10 | Credibility without invented customers | Done | "Built for organisations pursuing global opportunities"; explicit no-customer-named note |
| 11 | Five-stage workflow | Done | Discover → Understand → Evaluate → Monitor → Pursue |
| 12 | Pricing agrees with product configuration and is honest | Done | Plans from `INITIAL_PLAN_CATALOG`; checkout-disabled notice; no invented provider |
| 13 | Public/authenticated boundary | Partial | Client gate (`AuthGate`) and no workspace mount on public pages; **database policy still allows anonymous reads of verified notices** — see §5 |
| 13 | No opportunity records in public HTML, JSON-LD, sitemap or marketing UI | Done | Marketing pages read no `opportunities`; hero demo is labelled sample data; sitemap and JSON-LD contain no opportunity URLs |
| 14 | Accessible FAQ | Done | Native `<details>`/`<summary>`, visible focus ring |
| 15 | Final conversion section | Done | Approved headline and CTA to registration |
| 16 | Compact footer, no duplicated or broken links | Done | Four columns; development-status banner removed |
| 17 | Technical SEO, crawlable output | Done | 15 prerendered routes, unique metadata, canonical, sitemap, robots, JSON-LD, semantic HTML |
| 17 | Keyword research and mapping | Partial | [keyword-map.md](./keyword-map.md); **volumes/difficulty not invented**, no tool available |
| 17 | Small number of genuine landing pages | Done | Four guides (government tenders, grants, official sources, commercial RFPs) |
| 17 | Structured data | Done | Organization, WebSite, SoftwareApplication, BreadcrumbList, FAQPage — parsed from the built output |
| 17 | International SEO | Partial | `lang`, ISO country/currency naming; **no hreflang** because there are no localised URLs |
| 17 | Measurement readiness | Partial | Instructions documented; no GSC/GA4/Bing property or verification token available |
| 18 | Performance | Partial | Application code split from the public bundle; hero preload; images lazy. Bundle still ~210 kB gzip (see audit §7) |
| 18 | Accessibility | Done | Skip link, focus states, labels, semantic headings, aria-live status text, reduced motion, no horizontal overflow at 390 px |
| 19 | Security and data integrity | Done | No secrets in client code, no schema changes, no weakened RLS, no new public endpoints, source metadata rendered as text |
| 20 | Documentation | Done | Six documents in `docs/website-redesign/` |
| 21 | Typecheck | Done | `tsc -p tsconfig.ui.json` and `tsc -p tsconfig.app.json` pass; `tsc -b` passes after installing the separate collector package's dependencies |
| 21 | Production build | Done | `npm run build` passes and prerenders 15 routes |
| 21 | Unit tests | Partial | 286 of 287 pass; one pre-existing date-dependent failure (see §6) |
| 21 | Lint | Partial | `eslint src main.tsx` clean; 44 pre-existing errors remain in `backend/`, `functions/` and `scripts/` (outside this change) |
| 21 | Mobile / tablet / desktop rendering | Partial | Homepage inspected at 390 px and ~540 px; no horizontal overflow; desktop layout not visually inspected at ≥1280 px |
| 21 | Dark mode | Partial | Theme toggle retained and tokens unchanged; dark rendering not visually inspected in this session |
| 21 | Background looping and reduced motion | Done | Loop code and reduced-motion branch reviewed; static-image behaviour under `prefers-reduced-motion` is code-verified, not visually tested |
| 21 | Public route security | Partial | See §5 |
| 21 | Sitemap / robots / metadata / JSON-LD | Done | Generated files inspected in `dist/`; JSON-LD parsed successfully |
| 21 | Core Web Vitals measurement | Blocked | No Lighthouse/CrUX measurement available in this environment; only build-size measurements are reported |

---

## 5. Open security item: anonymous read of verified notices

**Finding.** `opportunities` carries the policy `verified_opportunities_public_read`
(role `PUBLIC`, `SELECT`) with the predicate:

```
data_quality_status = 'valid'
AND source_verified_at IS NOT NULL
AND opportunity_has_verified_source(id)
```

and the `anonymous` role has `SELECT` on the table. A signed-out caller with the public
Data API endpoint can therefore query verified notice rows directly, including titles,
buyers, reference numbers, values and deadlines.

**What this change did.**

1. Removed the previous homepage behaviour that read the opportunity table anonymously
   (the old hero preview and `useLiveData` on public routes).
2. Split the application so `AppStateProvider` is only mounted for application routes.
3. Added `AuthGate` so workspace routes do not render for a signed-out visitor.
4. Kept `/o/:id` public, because shareable notices are part of the approved product model
   (migration 0050).

**Why the policy was not changed here.** Tightening it would break the approved share-link
feature and any future public notice preview, which is a product and security decision
rather than a website change. Applying an unreviewed authorization change to the
production branch was judged unsafe without the owner's explicit approval.

**Recommended decision (owner).** Either:

- **Keep the share model, restrict bulk reads:** replace the table-wide policy with one
  that permits a row only when it is explicitly published as a share link (for example a
  `public_share` flag or a share-token table), and revoke `SELECT` on `opportunities` from
  `anonymous`. `/o/:id` then needs a server route that returns exactly the shared notice.
- **Protect all notices:** drop the public policy, grant `SELECT` only to `authenticated`,
  and render `/o/:id` through an authenticated route (share links become sign-in links).

Both options should be tested with a signed-out client against the Data API, and the
chosen policy recorded in `docs/` together with the migration that applied it.

---

## 6. Pre-existing failures (not introduced by this work)

- `backend/neon/intelligence/canadabuys-api.test.ts` fails on 28 November 2026 because the
  fixture closing date is `2026-11-27T14:00:00-05:00` and the connector compares it to the
  real clock: expected `open`, received `closed`. The test supplies a fixed clock
  (`2026-11-13`) for publication but status uses the current time. Fix by injecting the
  same fixed clock into the status decision, not by moving the fixture.
- `npm run lint` reports 44 errors in `backend/`, `functions/` and `scripts/`
  (`no-explicit-any`, `prefer-const`, useless escapes, one unused import). None are in the
  files changed here.
- `tsc -b` fails in a clean checkout until `collectors/node` dependencies are installed
  (`crawlee`, `cheerio`, `ajv`), because backend code imports that package. Installed with
  `npm ci --prefix collectors/node` for verification; the root build does not install it.

## 7. Not done (deliberately)

- No new payment provider, plan, entitlement or checkout.
- No database schema change, ingestion change or worker change.
- No mass-generated country pages.
- No fabricated customers, testimonials, logos, ratings or search volumes.
- No analytics or advertising tags.
