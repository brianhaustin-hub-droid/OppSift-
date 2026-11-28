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
| 8 | Markets section distinct from registry | Done | Four separate counts, region bars, market table, explanatory note; 18 markets with verified notices (1,609 notices) from the production snapshot |
| 9 | Provider identities not disclosed publicly | Done | Sources section rebuilt as six ecosystem categories; `/official-data-sources` rewritten; candidate array, showcase component and provider marquee deleted; built HTML, sitemap, JSON-LD and rendered page contain no provider name or per-provider status |
| 9 | No fake "15 live integrations" claim | Done | Summary shows delivering / connected-without-retrieval / not integrated |
| 10 | Credibility without invented customers | Done | "Built for organisations pursuing global opportunities"; explicit no-customer-named note |
| 11 | Five-stage workflow | Done | Discover → Understand → Evaluate → Monitor → Pursue |
| 12 | Pricing agrees with product configuration and is honest | Done | Plans from `INITIAL_PLAN_CATALOG`; checkout-disabled notice; no invented provider |
| 13 | Public/authenticated boundary | Done | Client gate (`AuthGate`), no workspace mount on public pages, and migration 0057 closing anonymous reads at the database; verified with anonymous role and Data API requests — see §5 |
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
| 18 | Performance | Partial | Public entry is 743.95 kB minified (192.58 kB gzip) with no database client; hero preload; images lazy (see audit §7) |
| 18 | Accessibility | Done | Skip link, focus states, labels, semantic headings, aria-live status text, reduced motion, no horizontal overflow at 390 px |
| 19 | Security and data integrity | Done | No secrets in client code, no schema changes, no weakened RLS, no new public endpoints, source metadata rendered as text |
| 20 | Documentation | Done | Six documents in `docs/website-redesign/` |
| 21 | Typecheck | Done | `tsc -p tsconfig.ui.json` and `tsc -p tsconfig.app.json` pass; `tsc -b` passes after installing the separate collector package's dependencies |
| 21 | Production build | Done | `npm run build` passes and prerenders 15 routes |
| 21 | Unit tests | Partial | 286 of 287 pass; one pre-existing date-dependent failure (see §6) |
| 21 | Lint | Partial | `eslint src main.tsx` clean; 44 pre-existing errors remain in `backend/`, `functions/` and `scripts/` (outside this change) |
| 21 | Mobile / tablet / desktop rendering | Partial | Homepage inspected at 390 px, ~540 px and 1280 px; no horizontal overflow; tablet width not opened in this session |
| 21 | Dark mode | Partial | Theme toggle retained and tokens unchanged; dark rendering not visually inspected in this session |
| 21 | Background looping and reduced motion | Done | Loop code and reduced-motion branch reviewed; static-image behaviour under `prefers-reduced-motion` is code-verified, not visually tested |
| 21 | Public route security | Done | Anonymous role and Data API both denied on opportunity tables; share page limited to explicitly shared notices (§5) |
| 21 | Sitemap / robots / metadata / JSON-LD | Done | Generated files inspected in `dist/`; JSON-LD parsed successfully; no provider name in any of them |
| 21 | Core Web Vitals measurement | Blocked | No Lighthouse/CrUX measurement available in this environment; only build-size measurements are reported |

---

## 5. Anonymous opportunity access — closed (resolved 28 November 2026)

**Previous finding.** `verified_opportunities_public_read` granted `SELECT` on
`opportunities` to `PUBLIC`, and `anonymous` also held a direct grant, so a signed-out
caller could page through every verified notice (1,609 rows on production at the time),
including buyers, references, values and deadlines. Public HTML and the client gate did
not change that.

**Resolution.** `backend/neon/migrations/0057_close_anonymous_opportunity_reads.sql`,
applied to the dev branch and to production:

```sql
drop policy verified_opportunities_public_read on public.opportunities;
create policy opportunities_authenticated_read on public.opportunities
  for select to authenticated
  using (data_quality_status = 'valid' and source_verified_at is not null
         and public.opportunity_has_verified_source(id));
revoke select on public.opportunities from public, anonymous;
grant select on public.opportunities to authenticated;
-- same treatment for opportunity_source_records, opportunity_source_links,
-- opportunity_sources, and the new opportunity_share_links table
```

The product's share feature is preserved through explicit authorisation instead of a
blanket exception:

- `opportunity_share_links(id, opportunity_id, created_by, created_at, revoked_at)`, RLS
  owner-only (`created_by = auth.user_id()`), one active row per notice.
- `get_shared_notice(uuid)` (`SECURITY DEFINER`, `search_path` pinned) returns one
  verified notice **only** while an active share row exists. Execute is granted to the
  owner role used by the Pages Function, not to `anonymous` (migration 0058); the table
  itself is not readable by `anonymous`.
- `/o/:id` reads through `/api/shared-notice/:id` (Pages Function) and renders "not shared
  publicly" for everything else.

**Verification (direct, not browser-only).**

| Check | Result |
| --- | --- |
| `set role anonymous; select count(*) from opportunities` | `permission denied for table opportunities` |
| `set role anonymous; select * from opportunity_source_records` | `permission denied` |
| `set role anonymous; select * from opportunity_source_links` | `permission denied` |
| `set role anonymous; select * from opportunity_sources` | `permission denied` |
| `set role anonymous; select from opportunity_share_links` | `permission denied` |
| `get_shared_notice(<unshared id>)` as owner role | 0 rows |
| `get_shared_notice(<shared id>)` as owner role | 1 row |
| `get_shared_notice(<shared id>)` after revoking the share | 0 rows |
| `get_shared_notice(<shared id>)` as `anonymous` | `permission denied for function` |
| `set role authenticated; select count(*) from opportunities` | 1,609 (workspace unchanged) |
| Data API, anonymous JWT, `/rest/v1/opportunities` | 403 `permission denied for table opportunities` |
| Data API, anonymous JWT, `/rest/v1/opportunity_sources` | 403 `permission denied` |

Test share rows were deleted; production currently holds no share rows, so no notice is
publicly readable.

**Migration 0058 — remaining anonymous grants removed.** Every object the public site no
longer queries (the aggregate views, the country/reference tables, coverage views,
`source_leads_public`, `opportunity_source_links`) lost its `PUBLIC`/`anonymous` SELECT
grant; each is granted to `authenticated` so workspace visibility is unchanged.

| Check | Result |
| --- | --- |
| `anonymous` select over all 25 objects | `permission denied` on every one |
| `anonymous` execute `get_sources_coverage_summary()` | `permission denied` |
| `authenticated`: countries / coverage / categories / leads / sources / notices | 101 / 101 / 3 / 7,373 / 516 / 1,609 (names of the pre-migration baseline) |
| `POST /api/share-links` without a session | 401, no row written |
| `GET /api/shared-notice/<id>` with an active share row | 200 |
| `GET /api/shared-notice/<id>` after revoking it | 404 |
| public entry bundle | 548.27 kB (133.09 kB gzip), no database client |

**Consequence to be accepted by the owner.** Previously copied `/o/<id>` links no longer
resolve until an owner shares them again from the workspace. That is the intended result of
the privacy boundary, and it is recorded here rather than worked around.

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
