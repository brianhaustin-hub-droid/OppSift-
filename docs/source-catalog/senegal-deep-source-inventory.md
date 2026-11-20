# Senegal deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Senegal (national + régions/départements/communes + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | Marchés publics portal notices | National procurement notices | HTML list/scraper | In catalog as `senegal-marchespub-notices` (`operational` candidate; metadata verification needed) | Verify publisher/terms/robots, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Autorité de Régulation des Marchés Publics (ARCOP) | Procurement notices/regulation | Public web | https://www.arcop.sn/ (verify) | lead |
| 2 | Portail des marchés publics du Sénégal | Tenders/notices | Public web | https://www.marchespublics.sn/ (verify) | lead |
| 3 | Ministry of Finance and Budget | Budget/procurement notices | Public web | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Régions & collectivités (target 30+)
Senegal has **14 régions** and many communes/départements — target regional and local collectivities with public procurement/tender notices.

| # | Région / Collectivité | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Dakar | Local procurement/tenders | (verify) | lead |
| 2 | Thiès | Local tenders | (verify) | lead |
| 3 | Diourbel | Local tenders | (verify) | lead |
| 4–30+ | Other régions/communes with public notices | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | AGEROUTE / road agencies | Roads/transport | (verify) | lead |
| 2 | SENELEC / energy utilities | Energy | (verify) | lead |
| 3 | SONES/SDE / water utilities | Water | (verify) | lead |
| 4 | Port/autonomous agencies | Transport/logistics | (verify) | lead |
| 5 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME/innovation grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Senegal (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).