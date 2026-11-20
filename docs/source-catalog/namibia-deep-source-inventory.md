# Namibia deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Namibia (national + regions/local authorities + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | CPBN/Procurement board notices | National procurement notices | HTML list/scraper | In catalog as `namibia-cpbn-notices` (`operational` candidate; metadata verification needed) | Verify publisher/terms/robots, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Central Procurement Board of Namibia (CPBN) | Procurement notices | Public web | https://www.cpbn.com.na/ (verify) | lead |
| 2 | Ministry of Finance and Public Enterprises (procurement) | Regulation/notices | Public web | https://mof.gov.na/ (verify) | lead |
| 3 | e-Procurement/portal (if public) | Tenders/notices | Portal (to verify) | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Regions & local authorities (target 30+)
Namibia has **14 regions** and local authorities — target regional councils and municipalities with public procurement/tender notices.

| # | Region / Local authority | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Khomas (Windhoek) | Local procurement/tenders | (verify) | lead |
| 2 | Erongo | Local tenders | (verify) | lead |
| 3–30+ | Other regions/local authorities | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Roads Authority | Roads/transport | (verify) | lead |
| 2 | NamPower | Energy | (verify) | lead |
| 3 | NamWater | Water | (verify) | lead |
| 4 | Namport / transport agencies | Transport/logistics | (verify) | lead |
| 5 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National SME/innovation grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Namibia (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).