# OppSift — Master Build Report (Everything Built So Far)

> Last updated: 2026-11-14 (session continuation). Source code and applied database
> state take precedence over any summary here. Copy/paste this document into ChatGPT
> (accio.ai) for design-pattern brainstorming and future-screens suggestions.

## 1. Product vision

OppSift is a **Global Opportunity Intelligence** platform for businesses, suppliers,
contractors, founders, consultants, and organisations.

- Tagline: **"Find the right opportunity. Know what to do next."**
- Three unified product stages:
  1. **Government contracts** — public procurement, tenders, RFPs/RFQs/EOIs, notices,
     procurement plans, awards, supplier opportunities.
  2. **Grants and funding** — public, international development, NGO, institutional,
     research, innovation, and business-financing programmes.
  3. **Commercial opportunities** — private procurement, contracts, projects,
     subcontracting, partnerships, supplier opportunities, business intelligence.

- No country, category source, listing, eligibility result, or coverage is live
  unless its source and permissions have been verified and its integration tested.

## 2. Technology stack

- Frontend: **React 19 + TypeScript + Vite**, custom design-system CSS (no component
  library), History-API routing via `src/app/routing`.
- Backend: **Neon PostgreSQL**, Postgres.js, **Hyperdrive**, **Cloudflare Worker**
  orchestrator (`oppsift-ingestion-orchestrator`), Cloudflare **Queue** + **Cron `*/5`**.
- Frontend hosting: Cloudflare Pages (`dist`).
- Auth/data: Neon Auth + Neon Data API (`@neon/neon-js` 0.10.2), single client
  `src/app/auth/neon-client.ts`; OTP email verification required for dev signup;
  Google OAuth gated off; Apple UI present but OAuth action not integrated.

## 3. Backend / ingestion state (as of 2026-11-14)

### Applied migrations (Neon dev branch)

- `0001`–`0002` — identity/organizations + global opportunity intelligence.
- `0003`–`0006` — durable ingestion foundation, approval gates, orchestration.
- `0007`–`0010` — CanadaBuys, approvals, grants/SAM, World Bank.
- `0011`–`0022` — license gates removed, NEST, Kenya PPIP, Uganda OCP, South Sudan,
  Austender, Boamp, Tenderned, Japan, India, Canada, Philippines, OCP bulk.
- `0023`–`0024` — Japan second source, Philippines.
- `0025` — **OCP bulk activation** (7 sources: Nigeria, Zambia, Ghana, Liberia,
  South Africa, Thailand BMA, Indonesia).
- `0026` — **HTML scrapers activation** (4: Sierra Leone, Mauritius, Côte d'Ivoire appels,
  Côte d'Ivoire attributions).
- `0027` — **10 new African HTML scrapers** (Benin, Senegal, Gambia, Niger, Burkina Faso,
  Botswana, Namibia, Madagascar, Malawi, Mozambique) — applied 2026-11-14 after fixing
  missing language seeds (pt/fr/en).
- `0028` — **ingestion parse-status** (`opportunities.parse_status` additive column) —
  drafted 2026-11-14, **pending apply**.

### Worker

- Deployed version: **`647bcda1-dc7e-4112-be66-7faffeb20d3f`**.
- Schedule: cron `*/5`; bindings: `INGESTION_QUEUE`, `HYPERDRIVE`
  (internal resource id — do not paste into third-party tools), `MAX_SOURCES_PER_TICK=250`,
  `MINIMUM_COLLECTION_INTERVAL_SECONDS=300`, retries 5, jobs/tick 10, concurrent 5.
- Secrets: `PROBE_TOKEN` (rotated 2026-11-14; do not paste into third-party tools —
  treat as compromised and rotate again before sharing externally), `SAM_GOV_API_KEY` (gated).

### Source catalog state

- **67 source products** in catalog; **26 operational sources/connectors**;
  **89 country-source candidate references**; **48 countries with candidates**;
  **7 live-retrieved sources**; retrieved samples with known count: **8**;
  parsed samples: **0**; stored records: **0**.
- Permission-cleared (operational) sources include (26):
  `bangkok-open-contract`, `benin-armp-notices`, `botswana-ppa-notices`,
  `burkina-faso-armp-notices`, `contracts-finder`, `cote-ivoire-dgmp-appels`,
  `cote-ivoire-dgmp-attributions`, `gambia-ppag-notices`, `ghaneps-ghaneps-ocds`,
  `grants-gov`, `indonesia-opentender-icw-ocds`, `liberia-ppcc-ocds`,
  `madagascar-dgcp-notices`, `malawi-ppda-notices`, `mauritius-ppo-notices`,
  `mozambique-sisac-notices`, `namibia-cpbn-notices`, `niger-armp-notices`,
  `nigeria-nocopo-ocds`, `sam-gov-contract-opportunities`, `senegal-marchespub-notices`,
  `sierra-leone-nppa-bids`, `south-africa-etenders-ocds`, `ted-published-notices`,
  `world-bank-procurement-notices`, `zambia-zppa-ocds`.
- (Full 26-item list is in `backend/neon/intelligence/source-catalog.test.ts`.)

### Live-retrieved sources (7) and their data

- OCP bulk mirror: Nigeria, Zambia, Ghana, Liberia, South Africa, Thailand-BMA,
  Indonesia, Uganda, Kenya, Rwanda, Tanzania, Nigeria (Osun/Ebonyi sub), etc.
- Live run evidence: Uganda OCP runs succeeded (8/8 and 3/3 parsed → accepted);
  Sierra-Leone/HTML and India/HTML runs succeeded; Philippines HTML run
  dead-lettered ("source cursor was not advanced"); TED/Contracts-Finder/SAM and
  NEST/TenderNed occasional failures.

### Latest African additions (this session's batch)

| Country | Source connector | Style |
|---|---|---|
| Benin | `html-benin-armp-notices` | HTML list |
| Senegal | `html-senegal-marchespub-notices` | HTML list |
| Gambia | `html-gambian-ppag-notices` → `html-gambia-ppag-notices` | HTML list |
| Niger | `html-niger-armp-notices` | HTML list |
| Burkina Faso | `html-burkina-faso-armp-notices` | HTML list |
| Botswana | `html-botswana-ppa-notices` | HTML list |
| Namibia | `html-namibia-cpbn-notices` | HTML list |
| Madagascar | `html-madagascar-dgcp-notices` | HTML list |
| Malawi | `html-malawi-ppda-notices` | HTML list |
| Mozambique | `html-mozambique-sisac-notices` | HTML list |

- Migrated to DB as operational sources (approved/verified/operational), currencies
  GMD/BWP/NAD/MGA/MWK/MZN added, country rows added, coverage rows set to
  `coverage_status='operational'`.
- Force-scheduled via `scripts/db-query.mjs` against 20 sources.
- Worker probe allowlist extended with Gabon hosts (`lejmp.ga`, `armpgabon.com`, etc.).

## 4. Country coverage state

- **101 supported countries** in frontend registry (`src/features/opportunities/country-registry.ts`).
- Migration 0048 adds 31 markets — Latin America (Brazil, Chile, Colombia, Peru, Argentina, Mexico), the Middle East (Saudi Arabia, UAE, Qatar, Oman, Bahrain, Kuwait, Jordan), remaining Europe (Switzerland, Norway, Finland, Portugal, Czechia, Romania, Greece, Hungary, Austria) and Asia-Pacific (New Zealand, Bangladesh, Pakistan, Sri Lanka, Kazakhstan, Uzbekistan, Taiwan, Hong Kong, Mongolia) — each with one verified official procurement portal registered as `not_started`/`inactive` with licensing `review_required`.
  - **Applied to the live Neon database on 2026-11-26:** 101 countries, 176 source registrations, 214 `source_country_coverage` rows, 31 new portals (all `planned-*`, `inactive`).
- **Migration 0049 activates the first of those portals end-to-end:** the Brazil PNCP
  consultation API (`connector_identifier = pncp-api`) is now
  `approved`/`active`/`operational`, with a native connector
  (`backend/neon/intelligence/pncp-api.ts`) and a worker profile, and a verified
  real ingest:
  - run `419b5432-ceab-4b66-8c17-97f2f81928f5` (`succeeded`): 100 records
    discovered, 100 parsed, 52 created, 48 unchanged, 0 rejected, 0 pending review;
  - 100 live Brazilian opportunities stored with BRL amounts, state/municipality,
    buyer, closing date and the official
    `https://pncp.gov.br/app/editais/<cnpj>/<ano>/<sequencial>` URL;
  - `coverage_truth` for `BR` reports `live`, 100 records, 1 active source;
    `opportunity_sources.last_successful_retrieval` set and `source_health = healthy`.
  - Connector facts: one modality per request (`codigoModalidadeContratacao` is
    required and comma lists are rejected), `tamanhoPagina` must be 10–50, so it
    walks 8 modalities (Pregão Eletrônico, Inexigibilidade, Concorrência
    Eletrônica, Dispensa, Credenciamento, Pregão Presencial, Concorrência
    Presencial, Concurso) at 50 records × 10 pages = 500 records per run and
    carries a `pncp` cursor between runs. The 7-day backlog is far larger than one
    run, so coverage accumulates over successive runs rather than same-day.
  - Licensing evidence is the public OpenAPI document
    (`https://pncp.gov.br/api/consulta/v3/api-docs`, maintained by Serpro) and the
    Swagger UI; the document publishes no explicit reuse licence, and a formal
    licence review of the portal terms is still advisable.
- The other 30 portals added by 0048 have no connector and therefore produce no
  opportunities; they stay `not_started`/`inactive` until each has a verified live sample.
- **Why some markets look thin (measured, not hidden):** of the 101 jurisdictions,
  57 are covered by exactly one registered portal and 78 are `Partial`. Kenya (38),
  Ghana (18) and Egypt (16) carry the deep source sets; Brazil has one operational
  connector. The catalogue itself is complete — 176 sources and 214 coverage rows are
  publicly readable — but a market only shows live notices once its portal has a
  working connector.
- **Migration 0050 (`opportunity_source_links`)**: a three-column public view
  (`opportunity_id`, `source_id`, `source_url`) for opportunities whose source is
  approved, active and operational. It gives every record an outbound "open original
  notice" link without exposing the stored source payloads.

## 4b. Provenance links and the language kit

- Every opportunity now has a stable public URL, `/o/<opportunity-id>`, rendered by
  `PublicOpportunityPage`. It needs no workspace seat: it re-reads the live record,
  links out to the issuing notice, offers copy-link, and detects the notice language.
- `OpportunityDetailPage` no longer falls back to `opportunities[0]` when a deep link
  misses; a bad link shows the empty state instead of an unrelated notice.
- Source detail pages now list their own notices: opportunities carry a real
  `sourceId` resolved from `opportunity_source_links` (it was always empty before).
- Country pages count a source against **every** jurisdiction in its coverage set, so
  multi-country feeds (World Bank 30 markets, TED 10) no longer disappear.
- **Language kit** (`src/i18n/`): `I18nProvider` with browser detection, a persisted
  user choice, `<html lang>/<html dir>` switching, and catalogue fallback to English.
  Shipped locales: English, Portuguese, Spanish, French and Arabic (RTL).
  `detectLanguage()` classifies notice text (script + stopword scoring, `und` when it
  cannot tell), and `translateDataValue()` localises controlled database values
  (status, category, availability, coverage). Free-text notices are never rewritten:
  the original wording is shown with the detected language beside it.
  Tests: `src/i18n/i18n.test.ts` (11 cases).
- **Notice content translation** (`src/i18n/noticeTranslation.ts`,
  `useNoticeTranslation.ts`): titles and descriptions are translated into the
  reader's language, not just the labels around them. Text is chunked on
  sentence boundaries, cached in `localStorage` (400 entries), and every
  translated field keeps a "show original" control. Detection still runs first:
  text already in the chosen language is never sent to a provider, and text whose
  language cannot be determined is shown as-is.
  Providers, in order: the same-origin proxy `functions/api/translate.ts`
  (uses `DEEPL_API_KEY` when set, server-side only), then MyMemory's public
  no-key endpoint. A failed translation keeps the original wording and says so;
  no text is ever invented. Tests: `src/i18n/noticeTranslation.test.ts` (9 cases).

## 4c. Source depth per country (migration 0051)

- Four verified multilateral publishers were added (all fetched HTTP 200 on
  2026-11-27): UNGM (UNOPS), the UN Procurement Division, the EU Funding &
  Tenders Portal and the EBRD. World Bank coverage was extended from 30 to every
  country in the registry, since the Bank advertises procurement in each.
- Result: **180 sources, 516 coverage rows across all 101 countries**, minimum 3
  sources per country (was 1 in 57 markets), average 5.1.
- **Not 50 per country.** Reaching 50 verified publishers in every country would
  mean registering roughly 4,900 more sources, and most countries publish their
  procurement through a single national portal. The registry stores real,
  fetchable publishers only; inventing 4,800 rows to hit a number would break the
  no-fabrication rule. Real paths to more depth: connector work on the registered
  portals, and agency-level expansion (ministries, utilities, state enterprises)
  in the markets that matter most.
- Regions (frontend groupings):
  - North America: US, Canada (2)
  - Europe: GB, DE, FR, NL, IE, IT, ES, SE, PL, DK, BE (11)
  - Asia-Pacific: IN, SG, JP, KR, MY, ID, PH, TH, VN, AU (10)
  - East Africa: KE, UG, TZ, RW, BI, ET, SS (7)
  - **West Africa: NG, GH, LR, SL, CI, **BJ, SN, GM, NE, BF** (10 — including the 5
    newest Benin/Senegal/Gambia/Niger/Burkina Faso)**
  - **Southern Africa: MU, ZM, ZA, **BW, NA, MG, MW, MZ** (8 — including the 5 newest
    Botswana/Namibia/Madagascar/Malawi/Mozambique)**
- Africa total in supported list: 25 countries.

## 5. Frontend — complete screen inventory

### Public marketing / informational routes

| Route | Screen | State |
|---|---|---|
| `/` | Home | Implemented — Earth-art hero, mission, categories, markets teaser, CTA |
| `/platform`, `/product` | Platform public | Implemented — product overview, stage cards |
| `/opportunities` | Opportunity categories | Implemented — category overview (not live listings) |
| `/markets` | Markets | Implemented — regional text groupings, 48 countries after expansion |
| `/solutions` | Solutions | Implemented — audience pages |
| `/how-it-works` | How it works | Implemented |
| `/about` | About | Implemented — public mission/scope |
| `/contact` | Contact | Implemented — existing public contact address |

### Auth / onboarding

| Route | Screen | State |
|---|---|---|
| `/login` | Login | Implemented — Neon email/password; Google gated |
| `/register` | Register | Implemented — Neon signup, OTP verification required |
| `/forgot-password`, `/reset-password` | Password reset | Implemented — Neon |
| `/verify-email` | OTP verify | Implemented — Neon |
| `/accept-invitation` | Invite accept | Implemented — org invitation |
| `/onboarding*` | Onboarding | **Not registered** (blocked) |

### Authenticated workspace routes (`src/app/routing/routes.ts`)

| Route | Screen | Status |
|---|---|---|
| `/dashboard` | Overview | Implemented — demo dashboard, textual scope counts |
| `/discover` (+`/discover/search`) | Discover | Implemented — search/filter/results, URL state |
| `/discover/government` | Government contracts | Implemented |
| `/discover/grants` | Grants & funding | Implemented |
| `/discover/commercial` | Commercial opportunities | Implemented |
| `/discover/country/:code` | Country detail | Implemented — country-filtered discovery |
| `/opportunity/:id[/section]`, `/opportunities/:id[/section]` | Opportunity detail | Implemented — category-aware intelligence + sections: overview, government, grants, commercial, documents, timeline, source, history, requirements |
| `/my-opportunities`, `/my-opportunities/:id` | My Opportunities | Implemented — browser-local pursuit workspace |
| `/saved-searches`, `/search-history` | Saved/search history | Implemented — browser-local |
| `/saved` | Saved opportunities | Implemented — shortlist preview |
| `/intelligence` | AI intelligence | **Planned** — preparation state, no fake AI |
| `/alerts` | Alerts & monitoring | **Planned** — monitoring prep, no live notifications implied |
| `/teams`, `/organizations*` | Organizations | Implemented — org flows, roles |
| `/settings` | Settings | **Planned** — profile/account (partial) |
| `/backend-status` | Backend status | Implemented — dev diagnostics |
| `/admin`, `/admin/sources`, `/admin/coverage`, `/admin/ingestion`, `/admin/quality` | Admin | **Restricted** (admin:access) |
| `/applications`, `/analytics`, `/support` | Planned destinations | **Planned/unavailable** |

### Shell / shared UI

- `src/app/shell/GlobalTopbar.tsx`, `GlobalSidebar.tsx`, `PlatformIcon.tsx`
- `src/app/PlatformPage.tsx`, `src/app/auth/*` (AuthPages, OAuthButtons, OtpInput, ProfileSettingsPage), `src/app/organizations/*`, `src/app/diagnostics/BackendStatusPage.tsx`, `src/app/security` (exists, not detailed).

### Shared UI

- `src/shared/ui/`: BrandLogo, components, feedback, PublicNavbar, PublicFooter, PublicLayout, theme handling.

## 6. Design / visual state (2026-11-14 context)

- Design docs: `OPPSIFT_DESIGN_SYSTEM.md`, `OPPSIFT_DESIGN_AUDIT.md`,
  `OPPSIFT_FINAL_SCREEN_INVENTORY.md`, `OPPSIFT_NAVIGATION_ARCHITECTURE.md`,
  `OPPSIFT_MASTER_CONTEXT.md`, `OPPSIFT_BUILD_LOG.md`, `OPPSIFT_IMPLEMENTATION_LEDGER.md`.
- Earth artwork: `public/assets/oppsift-earth-orbit.png`; Earth-from-orbit hero on
  public home + auth backdrop; decorative Earth art on auth.
- **Maps removed**: interactive country choropleth/pin map UX, `react-simple-maps`
  styles, decorative world-map-as-coverage-proxy — all removed per design audit.
- Market scope now communicated **textually** via regional groupings.
- Dashboard: flat, transparent card surfaces; textual market-scope counts.
- Visual QA: home checked (desktop+narrow, no overflow); product page checked desktop;
  dashboard checked for shared mark/flat cards; markets region filtering tested;
  login checked desktop+narrow; other app screens pending visual QA.

## 7. Validation / build state

- `npm run typecheck` — **green**.
- `npm test` — **278 tests / 50 files passed** (was 247/40 before latest round; latest full run: 278/278).
- Worker typecheck — passed.
- `npm run build` — passed; warnings: Zod annotation + ~500 kB bundle-size.
- Lint — passed with warnings only.

## 8. Verified architecture notes (2026-11-14, post-AI-critique audit)

- Unclassified-first behavior already implemented in `backend/neon/intelligence/ingestion.ts`
  (lines ~274-287): unmapped source terms / countries route to `pendingReview`, mark raw record
  `review`, and emit quality issues (`unmapped_category` / `unmapped_country`) — no hard reject.
- Raw layer already exists as `public.raw_source_records`
  (payload_json/payload_text/R2 refs, payload_checksum, first/last_seen_at,
  processing_state incl. `review`, next_processing_attempt_at, canonical opportunity link).
  AI-proposed `raw_document` table is subsumed by this existing design.
- Token rotation: attempted via wrangler CLI (v4.157 lacks `--text`; stdin→API error
  "Binding already in use"); doc scrubbed (value + Hyperdrive ID redacted) ✅; live rotation
  still pending interactive/dashboard/API step.

## 9. Known issues / open items (as of 2026-11-15)

1. **RESOLVED (2026-11-15): 36-hour ingestion outage.** Migrations 0026–0028
   activated sources with synthetic UUID ids whose RFC variant nibble fell
   outside `[8-9-a-b]`; the strict `z.string().uuid()` contract in
   `sourceRegistryRecordSchema` rejected them, and because `mapSource`
   validated every row before returning, ONE bad row aborted
   `listApprovedActiveSources` — so every cron tick from 2026-11-14 ~02:00
   threw and no jobs were created. The scheduled path had no catch, so the
   failure was invisible. Fixes: (a) contract now enforces UUID *shape*
   (`contracts.ts`); (b) `mapSourceRows` skips and loudly logs per-row
   validation failures; (c) scheduler enqueue is per-source fault-isolated
   with an `enqueueFailures` counter; (d) every tick logs its full funnel
   counters (`Scheduler tick completed.`). Ingestion resumed 2026-11-15
   ~17:50 UTC (19 jobs on the first post-fix tick).
2. Sequencing note: a tick that dies mid-loop previously also skipped the
   queue wakeup (`INGESTION_QUEUE.send` runs after scheduling), so jobs
   created by a crashed tick sat pending with no dispatcher. The per-source
   enqueue isolation removes this coupling.
2b. **Second contract site fixed (2026-11-15):** `ingestionJobSchema` (and
   the rest of `persistence-contracts.ts`, `connectors.ts`, `resilience.ts`,
   `search/contracts.ts`) used `z.string().uuid()` on system-minted ids —
   jobs whose source had a synthetic variant-invalid UUID failed
   "Stored ingestion job failed its contract validation" on store-then-map.
   All internal id validators now use the shared UUID-shape rule
   (`uuidShapeSchema`); external API-issued ids (canadabuys) stay strict.
2c. **CPU-limit kills on the queue consumer (2026-11-15):** one invocation
   processed up to 10 jobs with 5-way concurrency; heavy parses (OCP mirror
   megabyte payloads) blew the per-invocation CPU budget mid-batch
   ("Exceeded CPU Limit"), the message retried, and historical
   "Previous worker lease expired" dead-letters match this pattern.
   Mitigation deployed: `MAX_JOBS_PER_TICK=2`, `MAX_CONCURRENT_JOBS=1` —
   spread work across more invocations so each job gets a fresh budget.
   **Root fix (same day):** the OCP bulk connector decompressed the FULL
   bulk file and split the entire multi-MB text into an array on every
   `search()` call regardless of page size — the real per-invocation CPU
   sink. Rewritten to stream-decompress with a constant-memory line buffer
   (only the last `offset + limit` lines retained; whole-file line count
   still tracked so offset paging semantics are unchanged), plus a
   decompressed-size cap; OCP profiles reduced from `pageSize: 500` to
   `100` so JSON-parsing the slice fits comfortably. Verified: OCP client
   + connector-bridge tests pass on the rewritten path.
3. **Migrations 0029–0031 applied (2026-11-15).** `0029`: `coverage_truth`
   derived view (48 rows, Live/Monitored/Roadmap computed from
   `ingestion_runs` + `source_country_coverage`; drives `/markets` via the
   new `src/features/opportunities/coverage-truth.ts` data layer — the
   hardcoded 48-country *status claim* is replaced; the registry file now
   supplies display names/regions only). `0030`: zombie-run reaper + reusable
   `reap_zombie_ingestion_runs()` + `ingestion_funnel` view for
   `/admin/ingestion`. `0031`: nullable `opportunities.dedupe_key`
   (`dk1_` + 16-hex FNV of country+normalized title+buyer+closing-date
   bucket), populated at insert time; cross-URL same-notice dedupe now works
   under the existing advisory-lock pattern (same-URL dedupe already
   existed); `opportunity_dedupe_suspects` view for QA.
4. Test fixture (`backend/neon/testing/pglite-database.ts`) now applies 0028
   + 0031 on top of 0001–0006 so insert-time dedupe is exercised in tests.
5. Kenya PPIP `access_method=api` verified accurate: connector fetches the
   real JSON endpoint `tenders.go.ke/api/active-tenders` (32 raw rows stored
   prove it). Earlier assumption that PPIP had no public API was wrong.
6. Worker redeploys: latest version see deploy log; previous
   `16ab1e81-00a7-4db8-acc8-cd8ab449d5af`, `d0f88ea6-…`, `647bcda1-…`.
7. National portals newly allowlisted are mostly Cloudflare-egress-blocked
   (530); OCP bulk mirror is the reliable fallback.
8. Gabon probes: `lejmp.ga` 520, `armpgabon.com` 530; SL `/bid/` TablePress
   verified; CI/MU structures probed.
9. Tanzania NeST + Rwanda UMUCYO upstream intermittent 500/530.
10. Philippines pattern: 71/71 rejections (sourceTerm "Bid Notice" vs
    bulletin classification) — investigation pending.
11. Local → Neon connectivity flaky (ETIMEDOUT/ENETUNREACH; retries after
    ~20s sleep ok). This cost time during diagnostics; DB-dependent tests
    should carry explicit long timeouts.
12. Korea KONEPS excluded (key later); Thailand key wired; user may add more
    African countries freely.
13. Frontend redesign (Stitch AI) deferred until eligibility ships; user
    dislikes current branding.
14. Onboarding persistence, reports/analytics, admin ops deferred pending
    contracts.
15. Stage 0 gate (redefined per AI critique): ≥300 Kenya records with field
    completeness (title 100%, buyer ≥98%, deadline ≥95%, currency
    normalized 100%), duplicate rate <5%, ≥3 notice types, manual
    verification of 20 records, every record traceable to a raw row. Current
    Kenya state: 31 valid records stored; ingestion resuming now.

## 10. Copy-paste-ready summary for design brainstorming (Accio AI)

> OppSift is a Global Opportunity Intelligence platform (React 19 + Vite frontend,
> Neon Postgres/Neon Auth/Data API backend, Cloudflare Worker + Queue orchestrator
> with 5-minute cron). It ingests government procurement, grants, and commercial
> opportunities from free national sources, OCP bulk mirrors, and open registries.
> Current launch footprint: 101 supported countries (Africa, Europe, Asia-Pacific,
> Middle East and Latin America),
> 67 source products, 26 operational connectors, 7 live-retrieved sources, 0 parsed
> records stored yet. Latest deployed batch added 10 African HTML-scraper sources
> (Benin, Senegal, Gambia, Niger, Burkina Faso, Botswana, Namibia, Madagascar,
> Malawi, Mozambique) via migrations 0025–0027; worker live at v647bcda1…; full test
> suite green (278/278); typecheck green.
> Frontend screens built: public (home, platform, opportunities, markets, solutions,
> how-it-works, about, contact; auth: login/register/forgot/reset/verify/invite),
> workspace (dashboard, discover + 3 categories, country detail, opportunity detail
> with 9 sections, my-opportunities, saved-searches, search-history, saved,
> intelligence(planned), alerts(planned), teams/organizations, settings(planned),
> backend-status, admin restricted, applications/analytics/support planned).
> Design language: Earth-from-orbit hero artwork, flat transparent dashboard cards,
> textual regional market groupings, no maps. Branding currently considered
> unsatisfactory and a redesign is planned using Google Stitch AI design generation
> before porting into the existing React design system.

## 11. Per-country lead inventory (27 Nov 2026)

Coverage counts stayed honest: 180 registered sources, 516 coverage rows and
3–6 sources per country. Rather than inflate that number, the per-country lead
inventory used for the African markets now covers all 101 registry countries.

* `public.source_leads` (migration `0052`) stores **73 named buying functions
  per country — 7,373 leads** across 101 countries, all `unverified_lead`.
  `official_website` is null for every lead: no URL is claimed until it has been
  read from the publisher.
* Public reads: `source_leads_public` (country page) and `country_lead_summary`
  (lead count joined into the coverage table). Both granted to the anonymous
  role; the base table is not exposed.
* Leads are excluded from `coverage_truth`, the source catalogue and every
  coverage status. The country page shows "Verified sources (n)" and
  "Unverified leads (73)" as separate panels, the leads grouped by kind with a
  "Not verified · excluded from coverage" badge.
* Seed: `node scripts/seed-source-leads.mjs` from
  `backend/neon/intelligence/lead-inventory.ts` (idempotent, unique on
  `(country_code, name)`). Applied to the dev branch and the app-facing
  production branch.
* Method, limits and the source/lead distinction: `docs/source-catalog/GLOBAL_LEADS_INVENTORY.md`.

## 12. Live verification of every source (27 Nov 2026)

Registration dates said when a publisher was catalogued, not whether it
answers now. Migration `0053` adds append-only HTTP checks of each source's own
endpoint, and both the country page and the source page show the latest result
with its age.

* All **215 registered endpoints across 180 sources** were requested on the
  app-facing branch, then every silent source retried with a 25 s timeout:
  **148 endpoints answered**, 17 refused automated access, 6 returned an error
  status and 44 failed to connect.
* **128 of 180 sources answered at least one endpoint.**
* **All 101 countries now have live evidence: 70 have every registered source
  answering, 31 are partial, 0 have none.** No country is left unverified.
* New reads: `source_live_status`, `country_source_live_status` and
  `country_live_summary`; the base check table stays private. The country page
  shows `Live: <status> (answered/total)` plus a per-source result line, and the
  source page shows the latest result, answered endpoints, check time and the
  requested URL.
* Honesty guard: a blocked, errored or silent endpoint is never counted as
  verified, and a live check never changes reliability, licensing or terms
  status. Ingestion stays a separate, connector-backed claim.
* Re-run with `npm run sources:verify` (see
  `docs/source-catalog/LIVE_SOURCE_VERIFICATION.md`).

---

*End of master build report.*
