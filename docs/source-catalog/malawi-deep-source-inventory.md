# Malawi deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Malawi (national + districts/councils + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | PPDA notices | National procurement notices | HTML list/scraper | In catalog as `malawi-ppda-notices` (`operational` candidate; metadata verification needed) | Verify publisher/terms/robots, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Public Procurement and Disposal of Assets Authority (PPDA) | Procurement notices/regulation | Public web | https://www.ppda.mw/ (verify) | lead |
| 2 | e-Procurement / tender portal (if public) | Tenders/notices | Portal (to verify) | (verify) | lead |
| 3 | Ministry of Finance and Economic Affairs | Budget/procurement notices | Public web | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Districts & councils (target 28+)
Malawi has **28 districts** — target district councils and local authorities with public procurement/tender notices.

| # | District / Council | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Lilongwe City/District | Local procurement/tenders | (verify) | lead |
| 2 | Blantyre City/District | Local tenders | (verify) | lead |
| 3 | Mzuzu City | Local tenders | (verify) | lead |
| 4–28+ | Other districts/councils | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Roads Authority | Roads/transport | (verify) | lead |
| 2 | ESCOM / energy utilities | Energy | (verify) | lead |
| 3 | Water boards/utilities | Water | (verify) | lead |
| 4 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Malawi (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).