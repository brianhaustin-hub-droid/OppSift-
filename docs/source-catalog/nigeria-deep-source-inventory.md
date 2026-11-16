# Nigeria deep source inventory (beachhead #1, 50+ target)

**Goal:** 50+ source leads for Nigeria (national + 36 states + FCT + sectors + grants/funding). Leads are **not** verified or live integrations.

**Status legend:** `lead` (identified, unverified) | `researching` | `permission_review` | `connector_ready` | `operational` (only with evidence + working ingest + stored records) | `blocked`.

## 0) Existing repo leads (starting point)

| # | Source lead | Scope | Type | Access (est.) | Catalog/migration status | Gap to trusted live |
|---|---|---|---|---|---|---|
| 1 | Nigeria NOCOPO OCDS (OCP Data Registry) | Federal procurement (compiled OCDS) | OCDS JSONL bulk | Cat A/B-style public dataset (verify terms/attribution/freshness) | In `backend/neon/intelligence/source-catalog.ts` as `nigeria-nocopo-ocds` (`operational`/`ocp_bulk_api` candidate); activation/migration history exists in dev ledger | Record permission/attribution/terms evidence, validate OCP bulk ingest+mapping on dev, confirm stored records & freshness in `coverage_truth`/Discover |

## 1) National government procurement & disclosure (target ~12+)

| # | Source lead | Scope | Likely category | Access (est.) | URL / evidence (verify) | Status | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Bureau of Public Procurement (BPP) – NOCOPO / open contracting portal | Federal procurement data & notices | Government | Public web/data (verify) | https://nocopo.bpp.gov.ng/ ; https://www.bpp.gov.ng/ | lead | Primary official lead; confirm datasets/APIs/feeds, terms, attribution. |
| 2 | Nigeria Open Contracting Portal (NOCOPO) – procurement records | Federal MDAs procurement records | Government | Public web/data | https://nocopo.bpp.gov.ng/ | lead | May overlap/supplement OCP mirror; verify canonical source & cadence. |
| 3 | Federal Tenders Journal / BPP advertisements (where public) | Federal tender advertisements | Government | Public publication/web | (verify official channel) | lead | Extraction/rights and structure to assess. |
| 4 | National Procurement portal / e-procurement initiatives (BPP) | Federal e-procurement | Government | To verify (may be gated) | (verify) | lead | Confirm public access vs registration. |
| 5 | Federal Ministry of Finance, Budget & National Planning (procurement notices) | National notices/plans | Government | Public web | https://finance.gov.ng/ (verify section) | lead | Locate procurement/opportunity publications. |
| 6 | Due Process / procurement disclosures by MDAs (aggregate) | MDA notices | Government | Mixed | (verify per MDA) | lead | Break into key MDAs below. |
| 7 | Public-Private Partnership projects (ICRC) | PPP procurement/opportunities | Government/Commercial-public | Public web | https://www.icrc.gov.ng/ (verify) | lead | Verify opportunity listings and access. |
| 8 | Nigeria Investment Promotion Commission (opportunities/programmes) | Investment/commercial signals | Commercial/Grants | Public web | https://www.nipc.gov.ng/ (verify) | lead | Permissible public opportunity signals only. |
| 9 | Corporate Affairs/sector notices relevant to public opportunities (as applicable) | Mixed | Mixed | To verify | (verify) | lead | Only where public and relevant. |
| 10 | Tenders/awards publications in official gazettes (where public) | Notices/awards | Government | Public publication | (verify) | lead | Rights/reuse and structure to assess. |

## 2) State-level sources — 36 states + FCT (target 37)

For each state/FCT, target the official state government procurement/tenders portal or notices page, and state due-process/bureau of public procurement where public. URLs/access must be verified.

| # | State / FCT | Expected source lead | URL (to verify) | Access (est.) | Status |
|---|---|---|---|---|---|
| 1 | Abia | State Govt / BPP – tenders & procurement | (verify) | Public web | lead |
| 2 | Adamawa | State Govt / procurement notices | (verify) | Public web | lead |
| 3 | Akwa Ibom | State Govt / e-procurement or tenders page | (verify) | Public web | lead |
| 4 | Anambra | State Govt / procurement notices | (verify) | Public web | lead |
| 5 | Bauchi | State Govt / procurement notices | (verify) | Public web | lead |
| 6 | Bayelsa | State Govt / procurement notices | (verify) | Public web | lead |
| 7 | Benue | State Govt / procurement notices | (verify) | Public web | lead |
| 8 | Borno | State Govt / procurement notices | (verify) | Public web | lead |
| 9 | Cross River | State Govt / procurement notices | (verify) | Public web | lead |
| 10 | Delta | State Govt / procurement notices | (verify) | Public web | lead |
| 11 | Ebonyi | State Govt / procurement notices | (verify) | Public web | lead |
| 12 | Edo | State Public Procurement Agency / tenders | (verify) | Public web | lead |
| 13 | Ekiti | State Govt / procurement notices | (verify) | Public web | lead |
| 14 | Enugu | State Govt / procurement notices | (verify) | Public web | lead |
| 15 | Gombe | State Govt / procurement notices | (verify) | Public web | lead |
| 16 | Imo | State Govt / procurement notices | (verify) | Public web | lead |
| 17 | Jigawa | State Govt / procurement notices | (verify) | Public web | lead |
| 18 | Kaduna | State Public Procurement Authority / e-procurement | (verify) | Public web | lead |
| 19 | Kano | State Govt / procurement notices | (verify) | Public web | lead |
| 20 | Katsina | State Govt / procurement notices | (verify) | Public web | lead |
| 21 | Kebbi | State Govt / procurement notices | (verify) | Public web | lead |
| 22 | Kogi | State Govt / procurement notices | (verify) | Public web | lead |
| 23 | Kwara | State Govt / procurement notices | (verify) | Public web | lead |
| 24 | Lagos | Lagos State Public Procurement Agency / e-procurement | (verify) | Public web | lead |
| 25 | Nasarawa | State Govt / procurement notices | (verify) | Public web | lead |
| 26 | Niger | State Govt / procurement notices | (verify) | Public web | lead |
| 27 | Ogun | State Govt / procurement notices | (verify) | Public web | lead |
| 28 | Ondo | State Govt / procurement notices | (verify) | Public web | lead |
| 29 | Osun | State Govt / procurement notices | (verify) | Public web | lead |
| 30 | Oyo | State Govt / procurement notices | (verify) | Public web | lead |
| 31 | Plateau | State Govt / procurement notices | (verify) | Public web | lead |
| 32 | Rivers | State Govt / procurement notices | (verify) | Public web | lead |
| 33 | Sokoto | State Govt / procurement notices | (verify) | Public web | lead |
| 34 | Taraba | State Govt / procurement notices | (verify) | Public web | lead |
| 35 | Yobe | State Govt / procurement notices | (verify) | Public web | lead |
| 36 | Zamfara | State Govt / procurement notices | (verify) | Public web | lead |
| 37 | Federal Capital Territory (FCT) | FCTA / procurement notices | (verify) | Public web | lead |

## 3) Sector / agency / SOE public tenders (target ~10+)

| # | Source lead | Sector | URL (to verify) | Access (est.) | Status |
|---|---|---|---|---|---|
| 1 | Transmission Company of Nigeria (TCN) tenders | Power | (verify) | Public web | lead |
| 2 | Rural Electrification Agency (REA) opportunities | Power/energy | (verify) | Public web | lead |
| 3 | Niger Delta Power Holding Company (NDPHC) tenders | Power | (verify) | Public web | lead |
| 4 | Federal Roads Maintenance Agency (FERMA) / works procurements | Transport | (verify) | Public web | lead |
| 5 | Federal Ministry of Works / highway procurements (public notices) | Transport | (verify) | Public web | lead |
| 6 | Nigerian Ports Authority (NPA) tenders | Transport/logistics | (verify) | Public web | lead |
| 7 | Nigerian Railway Corporation (NRC) tenders | Transport | (verify) | Public web | lead |
| 8 | Federal Ministry of Health / NPHCDA procurement notices | Health | (verify) | Public web | lead |
| 9 | Universal Basic Education Commission (UBEC) / education procurements | Education | (verify) | Public web | lead |
| 10 | NITDA / Galaxy Backbone / public ICT tenders | ICT | (verify) | Public web | lead |
| 11 | Water resources / River Basin Development Authorities (public notices) | Water | (verify) | Public web | lead |

## 4) Grants & funding (Nigeria-relevant, target ~5+)

| # | Source lead | Type | URL (to verify) | Access (est.) | Status |
|---|---|---|---|---|---|
| 1 | TETFund / research & intervention calls (where public) | Research/education funding | (verify) | Public web | lead |
| 2 | National/SME innovation & enterprise grants (e.g. govt programmes, when public) | Business/innovation funding | (verify) | Public web | lead |
| 3 | World Bank Nigeria-financed procurement (overlay via global notices) | Multilateral procurement | World Bank Procurement Notices (global) | Cat B/API (permitted) | lead (overlay) |
| 4 | AfDB/UNDP/other dev-finance country opportunities for Nigeria (official, public) | Multilateral/dev funding | (verify official portals) | Mixed | lead |
| 5 | Donor/foundation calls open to Nigerian entities (permitted public sources) | Grants/funding | (verify per source) | Mixed | lead |

## Totals (initial inventory)
- Existing repo lead: 1 (NOCOPO/OCP)
- National: 10
- States + FCT: 37
- Sector/agency/SOE: 11
- Grants/funding overlays: 5
- **Initial target total: 64+ leads** (all require verification, permission/terms review, and connector work before any can be live).

## Immediate next actions (Nigeria beachhead)
1. **Baseline (dev):** confirm app connectivity and Nigeria’s current `coverage_truth`/stored opportunities using existing `.env.local` dev config.
2. **Fastest path to trusted live:** validate the **NOCOPO/OCP** path (permission/attribution/terms evidence + OCP bulk ingest/mapping on dev) and confirm records appear with provenance/freshness in Discover/`coverage_truth`.
3. **Verify & prioritize Cat A/B:** confirm official URLs/access/terms for top national and high-yield state sources (start with Lagos, Kaduna, Edo, Rivers, FCT) and sector agencies.
4. **Connector onboarding:** reuse/extend OCP, RSS/API, and HTML connectors per source; map while preserving original terms/values; run dev ingest + quality checks.
5. **Expand inventory:** replace `(verify)` placeholders with evidenced URLs/access/terms as research progresses toward and beyond 50 verified-quality leads.
