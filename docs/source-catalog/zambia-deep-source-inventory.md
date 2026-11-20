# Zambia deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Zambia (national + provinces/districts + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | ZPPA e-GP OCDS (OCP Data Registry) | National procurement (compiled OCDS) | OCDS JSONL bulk | In catalog as `zambia-zppa-ocds` (`operational`/`ocp_bulk_api` candidate) | Permission/attribution/terms evidence, validate ingest+mapping on dev, confirm stored records & freshness |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Zambia Public Procurement Authority (ZPPA) | Regulation, notices, e-GP | Public web | https://www.zppa.org.zm/ (verify) | lead |
| 2 | ZPPA Electronic Government Procurement (e-GP) system | Tenders/notices | Portal (public access to verify) | https://eprocure.zppa.org.zm/ (verify) | lead |
| 3 | Ministry of Finance and National Planning | Budget/procurement notices | Public web | https://www.mofnp.gov.zm/ (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Provinces & districts (target 30+)
Zambia has **10 provinces** and many districts — target provincial and local authority procurement/tender notice pages where publicly accessible (Lusaka, Copperbelt, Central, Eastern, Luapula, Muchinga, Northern, North-Western, Southern, Western).

| # | Province / District | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Lusaka Province / Lusaka City Council | Local procurement/tenders | (verify) | lead |
| 2 | Copperbelt Province / councils | Local tenders | (verify) | lead |
| 3 | Central Province | Local tenders | (verify) | lead |
| 4 | Eastern Province | Local tenders | (verify) | lead |
| 5 | Southern Province | Local tenders | (verify) | lead |
| 6–30+ | Other provinces/district councils | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Road Development Agency (RDA) | Roads/transport | (verify) | lead |
| 2 | ZESCO / energy utilities | Energy | (verify) | lead |
| 3 | Water & sanitation utilities | Water | (verify) | lead |
| 4 | Health/education sector public procurements | Health/Education | (verify) | lead |
| 5+ | Other public agencies/SOEs with tender pages | Various | (verify each) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National innovation/research/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Zambia (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).