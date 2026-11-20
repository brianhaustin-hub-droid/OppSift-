# Burkina Faso deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Burkina Faso (national + régions/communes + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | ARCOP/ARMP notices | National procurement notices | HTML list/scraper | In catalog as `burkina-faso-armp-notices` (`operational` candidate; metadata verification needed) | Verify publisher/terms/robots, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Autorité de Régulation de la Commande Publique (ARCOP) | Procurement notices/regulation | Public web | https://www.arcop.bf/ (verify) | lead |
| 2 | Portail des marchés publics | Tenders/notices | Public web | (verify) | lead |
| 3 | Ministry of Economy and Finance | Budget/procurement notices | Public web | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Régions & communes (target 30+)
Burkina Faso has **13 régions** and many communes — target regional and local administrations with public procurement/tender notices.

| # | Région / Commune | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Centre (Ouagadougou) | Local procurement/tenders | (verify) | lead |
| 2 | Hauts-Bassins (Bobo-Dioulasso) | Local tenders | (verify) | lead |
| 3–30+ | Other régions/communes with public notices | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Roads/transport agencies | Transport | (verify) | lead |
| 2 | SONABEL / energy utilities | Energy | (verify) | lead |
| 3 | ONEA / water utilities | Water | (verify) | lead |
| 4 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Burkina Faso (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).