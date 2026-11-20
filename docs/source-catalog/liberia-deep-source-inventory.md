# Liberia deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Liberia (national + counties + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | PPCC OCDS (OCP Data Registry) | National procurement (compiled OCDS) | OCDS JSONL bulk | In catalog as `liberia-ppcc-ocds` (`operational`/`ocp_bulk_api` candidate) | Permission/attribution/terms evidence, validate ingest+mapping on dev, confirm stored records & freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Public Procurement and Concessions Commission (PPCC) | Regulation, notices, procurement data | Public web | https://ppcc.gov.lr/ (verify) | lead |
| 2 | PPCC e-procurement / tender notices | Tenders/notices | Portal/web (to verify) | (verify official) | lead |
| 3 | Ministry of Finance and Development Planning | Budget/procurement notices | Public web | https://www.mfdp.gov.lr/ (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Counties (target 15, expandable to 30+ with entities)
Liberia has **15 counties** — target county administrations and local entities with public procurement/tender notices (Bomi, Bong, Gbarpolu, Grand Bassa, Grand Cape Mount, Grand Gedeh, Grand Kru, Lofa, Margibi, Maryland, Montserrado, Nimba, River Cess, River Gee, Sinoe).

| # | County | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Montserrado | County/city procurement notices | (verify) | lead |
| 2 | Nimba | Local tenders | (verify) | lead |
| 3 | Bong | Local tenders | (verify) | lead |
| 4 | Grand Bassa | Local tenders | (verify) | lead |
| 5–15 | Remaining counties | Procurement notices | (verify each) | lead |
| 16+ | Municipalities/district entities with notices | Local procurement pages | (verify) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Ministry of Public Works / road agencies | Roads/transport | (verify) | lead |
| 2 | Liberia Electricity Corporation | Energy | (verify) | lead |
| 3 | Liberia Water and Sewer Corporation | Water | (verify) | lead |
| 4 | National Port Authority / transport agencies | Transport/logistics | (verify) | lead |
| 5 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Liberia (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).