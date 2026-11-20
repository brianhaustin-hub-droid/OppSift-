# Botswana deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Botswana (national + districts/councils + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | PPRA notices | National procurement notices | HTML list/scraper | In catalog as `botswana-ppa-notices` (`operational` candidate; metadata verification needed) | Verify publisher/terms/robots, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Public Procurement Regulatory Authority (PPRA) | Procurement notices/regulation | Public web | https://www.ppra.co.bw/ (verify) | lead |
| 2 | Integrated Procurement Management System (IPMS) / e-tender portal | Tenders/notices | Portal (public access to verify) | (verify) | lead |
| 3 | Ministry of Finance | Budget/procurement notices | Public web | https://www.finance.gov.bw/ (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Districts & councils (target 30+)
Botswana has districts and councils (city, town, district councils) — target local government procurement/tender notices (Gaborone, Francistown, and district councils across the country).

| # | Council / District | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Gaborone City Council | Local procurement/tenders | (verify) | lead |
| 2 | Francistown City Council | Local tenders | (verify) | lead |
| 3–30+ | Other town/district councils | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Roads/transport authorities | Transport | (verify) | lead |
| 2 | Botswana Power Corporation | Energy | (verify) | lead |
| 3 | Water Utilities Corporation | Water | (verify) | lead |
| 4 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National SME/innovation grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Botswana (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).