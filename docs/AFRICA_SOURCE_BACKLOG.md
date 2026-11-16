# Africa source backlog (Step 2)

**Purpose:** Country-by-country backlog for the Africa-first MVP. “Best in Africa” means verified/permitted sources, provenance, and freshness — not unverified volume.

**Status key:** `candidate` = in catalog/docs as lead; `connector` = source-specific connector/profile exists in repo; `migration/activation` = DB migration/config present in dev ledger; `operational/live` = **only** when permission-approved, actively ingesting, and stored records are visible (prove via `coverage_truth`/Discover). Do not claim live from code alone.

**Access priority:** Cat A/B (public files/APIs/feeds without credentials) first. Cat C–E (account/credentials/permission) only with explicit approval.

## Priority beachhead (MVP depth first)
1. **Kenya (KE)** — strong regional signal; existing leads.
2. **Nigeria (NG)** — large market; OCDS bulk candidate in repo.
3. **South Africa (ZA)** — large market; OCDS bulk candidate in repo.
4. **Ghana (GH)** — OCDS bulk candidate in repo.
5. **Egypt (EG)** — newly added North Africa priority; research pending.
6. **Morocco (MA)** — newly added North Africa priority; research pending.
7. **Uganda (UG), Tanzania (TZ), Rwanda (RW), Ethiopia (ET)** — deepen East Africa cluster.

## Country backlog (all African target markets)

> Catalog references are from `backend/neon/intelligence/source-catalog.ts` (current repo state). Verify publisher identity, terms/reuse, attribution, robots, and live record access before activation.

| Country | Govt procurement (primary leads) | Grants/funding | Commercial (permissible/public) | Repo/catalog status (summary) | Gap to trusted live |
|---|---|---|---|---|---|
| Kenya (KE) | PPIP/tenders portal (`kenya-ppip`, discovered); OCP registry context present | Research pending (donor/dev-bank, govt programmes) | Research pending | Candidate lead(s) in catalog; activation/migration history exists in dev ledger — confirm actual stored records & freshness | Permission/terms evidence, Cat A/B feed/API where possible, connector validation, end-to-end ingest, `coverage_truth` live |
| Uganda (UG) | eGP Uganda (`uganda-egp`), GPP/PPDA (`uganda-government-procurement-portal`) | Research pending | Research pending | Candidate leads in catalog | Verify official endpoints/rights, implement/validate connector, ingest & monitor |
| Tanzania (TZ) | NeST/PPRA (`tanzania-nest`) | Research pending | Research pending | Candidate in catalog | Verify access/API/rights, connector, ingest |
| Rwanda (RW) | UMUCYO (`rwanda-umucyo`) | Research pending | Research pending | Candidate in catalog | Verify rights & machine access, connector, ingest |
| Burundi (BI) | ARMP notices (`burundi-armp`) | Research pending | Research pending | Candidate in catalog | Verify current notices/access/rights, connector feasibility |
| Ethiopia (ET) | Federal e-GP (`ethiopia-fppa-egp`) | Research pending | Research pending | Candidate in catalog | Verify public access/rights, connector, ingest |
| South Sudan (SS) | PPDAA tender portal (`south-sudan-ppdaa-tender-portal`) | Research pending | Research pending | Candidate in catalog | Verify automated access/rights & stability, connector, ingest |
| Nigeria (NG) | NOCOPO OCDS via OCP Data Registry (`nigeria-nocopo-ocds`, catalog: operational/ocp_bulk_api candidate) | Research pending | Research pending | OCP bulk source represented in catalog/migrations | Confirm permission/attribution/terms for reuse, validate OCP bulk ingest & mapping, ensure stored records/freshness live |
| Ghana (GH) | GHANEPS OCDS via OCP (`ghana-ghaneps-ocds`, operational/ocp_bulk_api) | Research pending | Research pending | OCP bulk represented | Same as NG: permission/terms + validated ingest + freshness |
| Liberia (LR) | PPCC OCDS via OCP (`liberia-ppcc-ocds`, operational/ocp_bulk_api) | Research pending | Research pending | OCP bulk represented | Permission/terms + validated ingest |
| Sierra Leone (SL) | NPPA bids/tenders (`sierra-leone-nppa-bids`, operational/html_list_scraper) | Research pending | Research pending | HTML scraper candidate represented | Verify terms/robots/permissions, validate scraping/parsing/quality, ingest |
| Côte d'Ivoire (CI) | DGMP appels/attributions (`cote-ivoire-dgmp-appels`, `cote-ivoire-dgmp-attributions`, operational/html_list_scraper) | Research pending | Research pending | HTML scraper candidates represented | Verify rights/terms, validate parsing (FR fields), ingest |
| Benin (BJ) | ARMP notices (`benin-armp-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (catalog metadata needs publisher verification) | Verify official publisher/URL/terms, improve metadata, validate connector |
| Senegal (SN) | Marchés publics portal (`senegal-marchespub-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (metadata verification needed) | Verify publisher/terms, validate connector |
| Gambia (GM) | GPPA notices (`gambia-ppag-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (metadata verification needed) | Verify publisher/terms, validate connector |
| Niger (NE) | ARMP notices (`niger-armp-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (metadata verification needed) | Verify publisher/terms, validate connector |
| Burkina Faso (BF) | ARCOP/ARMP notices (`burkina-faso-armp-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (metadata verification needed) | Verify publisher/terms, validate connector |
| Mauritius (MU) | PPO procurement notices (`mauritius-ppo-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented | Verify terms, validate connector/ingest |
| Zambia (ZM) | ZPPA e-GP OCDS via OCP (`zambia-zppa-ocds`, operational/ocp_bulk_api) | Research pending | Research pending | OCP bulk represented | Permission/terms + validated ingest/freshness |
| South Africa (ZA) | eTenders OCDS via OCP (`south-africa-etenders-ocds`, operational/ocp_bulk_api) | Research pending | Research pending | OCP bulk represented | Permission/terms + validated ingest/freshness |
| Botswana (BW) | PPRA notices (`botswana-ppa-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (metadata verification needed) | Verify publisher/terms, validate connector |
| Namibia (NA) | Procurement board notices (`namibia-cpbn-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (metadata verification needed) | Verify publisher/terms, validate connector |
| Madagascar (MG) | Procurement notices (`madagascar-dgcp-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (URL/metadata needs verification) | Verify correct official source/terms, fix metadata, validate connector |
| Malawi (MW) | PPDA notices (`malawi-ppda-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (metadata verification needed) | Verify publisher/terms, validate connector |
| Mozambique (MZ) | UFSA/SISAC or official portal (`mozambique-sisac-notices`, operational/html_list_scraper) | Research pending | Research pending | Represented (metadata verification needed) | Verify correct official source/terms, validate connector |
| Egypt (EG) | eTendering portal candidate (`egypt-etenders-portal`, research_pending) | Research pending | Research pending | **Newly added lead** | Identify official Cat A/B access (API/feed/bulk) if available, verify publisher/terms/rights, build & test connector |
| Morocco (MA) | Public procurement portal candidate (`morocco-marches-publics-portal`, research_pending) | Research pending | Research pending | **Newly added lead** | Identify official Cat A/B access, verify terms/rights, build & test connector |

## Cross-cutting Africa sources (high leverage)
- **World Bank Procurement Notices** (global, operational candidate in repo) — covers Bank-financed opportunities across African countries; excellent Cat B-style supplement, not a substitute for national coverage.
- **Open Contracting Partnership Data Registry (OCDS)** — already leveraged for several African countries; confirm per-dataset license/attribution/freshness and that bulk cadence meets user needs.

## Immediate execution sequence (in progress)
1. **Baseline (dev config present):** connect to development Neon via existing local `.env.local`, check `/backend-status`, and measure actual `coverage_truth` + stored opportunities for African markets (Nigeria first).
2. **Nigeria beachhead (active):** prove the pipeline starting with highest-leverage permitted/public leads — validate **NOCOPO/OCP** (`nigeria-nocopo-ocds`, OCP bulk) with permission/attribution/terms evidence + dev ingest/mapping/quality → confirm stored records & freshness in `coverage_truth`/Discover. In parallel, verify and prioritize Cat A/B national/state/sector sources from `docs/source-catalog/nigeria-deep-source-inventory.md`.
3. **Research & add Cat A/B leads for EG/MA + grants/funding per beachhead:** document official endpoints and terms, then implement connectors.
4. **Iterate country-by-country:** replicate the 50+ deep-inventory and onboarding flow per market (candidate → verified → operational/live with monitored freshness); update backlog with evidence.

## What I need from you now (to execute Step 3 live)
Provide/configure the following **securely** (do not paste secrets into committed files; keep DB credentials out of the frontend). A local, gitignored `.env.local` is fine for public Vite endpoints:
- **Neon (development branch):** `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` (public endpoints) so the app can run against dev; confirmation that migrations `0001`–`0031` are the intended dev state.
- **Cloudflare (if deploying/running ingestion worker):** Wrangler-authenticated environment and the target worker/project details (and any required bindings such as Hyperdrive/Queues/secrets like `SAM_GOV_API_KEY` only if/when that source is in scope) — configured in Cloudflare/secret stores, not in source.
- **Access/permissions decisions:** which specific sources you want prioritized first and any permission/terms approvals you have (I can only activate/claim what’s permitted and evidenced).

Once you share the **Neon dev Auth/Data API URLs** (public) and confirm the dev target, I can guide/run the local connection checks and move from backlog to live, verified ingestion for the first African beachhead.
