# Gambia deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for The Gambia (national + local government areas + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | GPPA notices | National procurement notices | HTML list/scraper | In catalog as `gambia-ppag-notices` (`operational` candidate; metadata verification needed) | Verify publisher/terms/robots, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Gambia Public Procurement Authority (GPPA) | Procurement notices/regulation | Public web | https://gppa.gm/ (verify) | lead |
| 2 | Ministry of Finance and Economic Affairs | Budget/procurement notices | Public web | (verify) | lead |
| 3 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Local government areas (target 20+)
The Gambia has local government areas (Banjul, Kanifing, Brikama, Mansakonko, Kerewan, Kuntaur, Janjanbureh, Basse) and wards/municipal entities — target councils and local bodies with public procurement notices.

| # | LGA / Council | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Banjul City Council | Local procurement/tenders | (verify) | lead |
| 2 | Kanifing Municipal Council | Local tenders | (verify) | lead |
| 3 | Brikama Area Council | Local tenders | (verify) | lead |
| 4–20+ | Other LGAs/wards/entities | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National Roads Authority | Roads/transport | (verify) | lead |
| 2 | NAWEC / utilities | Energy/Water | (verify) | lead |
| 3 | Ports/transport agencies | Transport/logistics | (verify) | lead |
| 4 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~10+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for The Gambia (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).