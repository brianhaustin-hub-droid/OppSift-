# Sierra Leone deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Sierra Leone (national + districts + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | NPPA bids/tenders | National procurement notices | HTML list/scraper | In catalog as `sierra-leone-nppa-bids` (`operational` candidate) | Verify terms/robots/permissions, validate scraping/parsing/quality, ingest & confirm freshness in `coverage_truth` |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | National Public Procurement Authority (NPPA) | Procurement notices/regulation | Public web | https://www.nppa.gov.sl/ (verify) | lead |
| 2 | Ministry of Finance | Budget/procurement notices | Public web | https://mof.gov.sl/ (verify) | lead |
| 3 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Districts (target 16+)
Sierra Leone has **16 districts** — target district councils and local entities with public procurement/tender notices (Bo, Bombali, Bonthe, Falaba, Kailahun, Kambia, Karene, Kenema, Koinadugu, Kono, Moyamba, Port Loko, Pujehun, Tonkolili, Western Area Rural, Western Area Urban).

| # | District | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Western Area Urban (Freetown) | Local procurement/tenders | (verify) | lead |
| 2–16 | Remaining districts | Procurement notices | (verify each) | lead |
| 17+ | Municipal/local entities with notices | Local procurement pages | (verify) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Sierra Leone Roads Authority | Roads/transport | (verify) | lead |
| 2 | Electricity/water utilities | Utilities | (verify) | lead |
| 3 | Ports/transport agencies | Transport/logistics | (verify) | lead |
| 4 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Sierra Leone (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).