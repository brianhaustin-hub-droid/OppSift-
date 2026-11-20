# Mozambique deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Mozambique (national + províncias/distritos + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | UFSA/SISAC or official portal notices | National procurement notices | HTML list/scraper | In catalog as `mozambique-sisac-notices` (`operational` candidate; metadata verification needed) | Verify correct official source/terms/robots, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Unidade Funcional de Supervisão das Aquisições (UFSA) | Procurement oversight/notices | Public web | https://www.ufsa.gov.mz/ (verify) | lead |
| 2 | Portal/SISAC de contratação pública | Tenders/notices | Portal (public access to verify) | (verify) | lead |
| 3 | Ministry of Economy and Finance | Budget/procurement notices | Public web | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Províncias & distritos (target 30+)
Mozambique has **11 províncias** and many distritos — target provincial governments and municipalities with public procurement/tender notices (Maputo Cidade, Maputo Província, Gaza, Inhambane, Sofala, Manica, Tete, Zambézia, Nampula, Cabo Delgado, Niassa).

| # | Província / Distrito | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Maputo Cidade | Local procurement/tenders | (verify) | lead |
| 2 | Maputo Província | Local tenders | (verify) | lead |
| 3 | Sofala (Beira) | Local tenders | (verify) | lead |
| 4–30+ | Other províncias/distritos | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | ANE / roads agencies | Roads/transport | (verify) | lead |
| 2 | EDM / energy utilities | Energy | (verify) | lead |
| 3 | Water utilities | Water | (verify) | lead |
| 4 | Port/transport agencies | Transport/logistics | (verify) | lead |
| 5 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Mozambique (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).