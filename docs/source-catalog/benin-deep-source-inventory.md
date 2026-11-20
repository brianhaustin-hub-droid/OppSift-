# Benin deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Benin (national + départements/communes + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | ARMP Benin notices | National procurement notices | HTML list/scraper | In catalog as `benin-armp-notices` (`operational` candidate; metadata needs publisher verification) | Verify official publisher/URL/terms/robots, improve metadata, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Autorité de Régulation des Marchés Publics (ARMP) | Procurement notices/regulation | Public web | https://www.armp.bj/ (verify) | lead |
| 2 | Portail des marchés publics / DNCMP | Tenders/notices | Public web | https://marches-publics.bj/ (verify) | lead |
| 3 | Ministry of Economy and Finance | Budget/procurement notices | Public web | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Départements & communes (target 30+)
Benin has **12 départements** and 77 communes — target département and commune administrations with public procurement/tender notices.

| # | Département / Commune | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Littoral (Cotonou) | Local procurement/tenders | (verify) | lead |
| 2 | Atlantique | Local tenders | (verify) | lead |
| 3 | Ouémé | Local tenders | (verify) | lead |
| 4–30+ | Other départements/communes with public notices | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Roads/transport agencies | Transport | (verify) | lead |
| 2 | SBEE / energy-water utilities | Utilities | (verify) | lead |
| 3 | Port/autonomous agencies | Transport/logistics | (verify) | lead |
| 4 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME/innovation grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Benin (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).