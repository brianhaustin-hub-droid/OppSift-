# Madagascar deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Madagascar (national + régions/communes + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | Procurement notices (DGCP/ARMP) | National procurement notices | HTML list/scraper | In catalog as `madagascar-dgcp-notices` (`operational` candidate; URL/metadata needs verification) | Verify correct official source/terms/robots, fix metadata, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Autorité de Régulation des Marchés Publics (ARMP) | Regulation/notices | Public web | https://www.armp.mg/ (verify) | lead |
| 2 | Direction Générale / portail des marchés publics | Tenders/notices | Public web | (verify official) | lead |
| 3 | Ministry of Economy and Finance | Budget/procurement notices | Public web | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Régions & communes (target 30+)
Madagascar has **23 régions** and many communes — target regional and local administrations with public procurement/tender notices.

| # | Région / Commune | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Analamanga (Antananarivo) | Local procurement/tenders | (verify) | lead |
| 2 | Atsinanana | Local tenders | (verify) | lead |
| 3–30+ | Other régions/communes with public notices | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Roads/transport agencies | Transport | (verify) | lead |
| 2 | JIRAMA / utilities | Energy/Water | (verify) | lead |
| 3 | Ports/transport agencies | Transport/logistics | (verify) | lead |
| 4 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Madagascar (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).