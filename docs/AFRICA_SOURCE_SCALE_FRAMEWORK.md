# Africa source scale framework (50+ source targets per country)

**Direction:** For each African target country, build a deep source inventory targeting **50+ source leads** where feasible (national, subnational/county, municipal, sector agencies, development/financier programmes, and permitted commercial signals). Kenya example: 47 counties → county-level procurement/publication sources plus national and sector sources to exceed 50+.

**Reality check:** A "source lead" is not a live integration. Every lead must pass: evidence → access/permission/terms (Cat A/B preferred) → technical feasibility → connector + mapping → dev ingest/quality → monitored live. Scale the inventory, but only claim live/trusted coverage for what is verified and ingesting with provenance/freshness.

## Source layers (to reach 50+ per country)

1. **National government procurement** — central e-procurement portal(s), treasury/finance procurement notices, public works, health/education procurement units, framework/standing offers, award/contract disclosures (Cat A/B first).
2. **Subnational / counties / states / municipalities** — each county/state/city procurement or notice publication where public (e.g. Kenya’s 47 counties: county tender portals, notice boards, gazette pages, county assembly/procurement sites). Prioritize those with public web/feeds/documents.
3. **Grants & funding** — national grant programmes, research councils, SME/innovation funds, donor/development-finance country windows, NGO/foundation calls relevant to the country.
4. **Sector regulators & agencies** — energy, transport, water, ICT, health, agriculture, mining, etc. that publish tenders/RFPs/opportunities publicly.
5. **Public-private / commercial (permissible)** — state-owned enterprises, utilities, public supplier portals, and other publicly accessible commercial opportunity sources where terms allow.
6. **Multilateral/regional overlays** — World Bank/ADB/AfDB/UNDP country-filtered notices, OCDS datasets, regional bodies (supplemental, not a substitute for national depth).

## Kenya template (target 50+)

- **National (baseline):** PPIP/tenders.go.ke, PPRA publications, national treasury/procurement notices, sector ministries/SOEs with public tenders (e.g. roads, energy, health, ICT) — identify and evidence each.
- **47 counties (subnational depth):** target a public procurement/notice source per county (county government website tenders page, county e-procurement if any, county assembly notices). Lead format: `{county name} County - procurement/tenders (URL, access, status)`.
- **Grants/funding:** national funds, development partner country calls, innovation/enterprise programmes.
- **Cataloging rule:** add each as a candidate with `countryCodes:["KE"]`, clear scope (national/county/sector), evidence URL, and status; promote only with permission + working connector + stored records.

## Execution approach (step by step)

1. **Inventory (per country):** enumerate national + all administrative subdivisions (counties/states/provinces) + key sectors; create candidate leads for each discoverable public source (target 50+, exceed where possible).
2. **Triage:** classify Cat A–E, check reachability/publisher, record terms/robots/access; prioritize Cat A/B and high-yield sources.
3. **Batch onboarding:** group by connector type (OCDS bulk, RSS/API, HTML list, portal-specific) to reuse/extend connectors; implement mappings preserving source terms/provenance.
4. **Validate & activate (dev):** permission evidence → bounded test fetch (if permitted) → connector run → quality/dedupe check → stored records → `coverage_truth` reflects reality.
5. **Monitor:** freshness, failures, source changes; keep claims data-derived.

## Immediate next actions

- Generate a **Kenya deep-inventory doc** (national + 47 counties + sectors/grants) as the template, then replicate per country.
- Extend `docs/AFRICA_SOURCE_BACKLOG.md` / per-country source registers to track subnational leads and counts toward the 50+ target.
- Start technical baseline in dev (using existing local config): confirm app connectivity, current African `coverage_truth`/opportunities, and ingestion readiness for the first beachhead sources.
