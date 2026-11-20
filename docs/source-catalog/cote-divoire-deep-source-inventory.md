# Côte d'Ivoire deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Côte d'Ivoire (national + districts/régions + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | DGMP appels d'offres | National procurement notices | HTML list/scraper | In catalog as `cote-ivoire-dgmp-appels` (`operational` candidate) | Verify rights/terms/robots, validate parsing (FR fields), ingest & confirm freshness |
| 2 | DGMP avis d'attribution | Award notices | HTML list/scraper | In catalog as `cote-ivoire-dgmp-attributions` (`operational` candidate) | Same: verify & validate ingest |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Direction Générale des Marchés Publics (DGMP) | Procurement notices/awards/regulation | Public web | https://www.marchespublics.ci/ (verify) | lead |
| 2 | Portail des marchés publics (if distinct) | Tenders/notices | Public web | (verify) | lead |
| 3 | Ministry of Finance and Budget | Budget/procurement notices | Public web | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Districts, régions & communes (target 30+)
Côte d'Ivoire has districts, régions and communes — target local administrations with public procurement/tender notices (Abidjan, Yamoussoukro, Bouaké, San-Pédro, Daloa, Korhogo, etc.).

| # | District / Région / Commune | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | District Autonome d'Abidjan | Local procurement/tenders | (verify) | lead |
| 2 | Yamoussoukro | Local tenders | (verify) | lead |
| 3 | Bouaké | Local tenders | (verify) | lead |
| 4–30+ | Other régions/communes with public notices | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | AGEROUTE / road agencies | Roads/transport | (verify) | lead |
| 2 | CI-Énergies / electricity utilities | Energy | (verify) | lead |
| 3 | SODECI / water utilities | Water | (verify) | lead |
| 4 | Port/transport agencies | Transport/logistics | (verify) | lead |
| 5 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME/innovation grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Côte d'Ivoire (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).