# Tanzania deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Tanzania (national + regions/districts + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | NeST / PPRA (National e-Procurement System of Tanzania) | National procurement (OCDS/portal) | Portal/API (to verify) | In catalog as `tanzania-nest` (candidate) | Verify official Cat A/B access (API/feed/OCDS), publisher/terms/rights, build & validate connector, ingest & monitor |
| 2 | NeST OCDS releases (if published) | Compiled OCDS | OCDS (to verify) | Research | Confirm publication/terms, validate ingest & mapping |

## 1) National procurement & disclosure (target ~12+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Public Procurement Regulatory Authority (PPRA) | Regulation, notices, procurement info | Public web | https://www.ppra.go.tz/ (verify) | lead |
| 2 | NeST - National e-Procurement System of Tanzania | Tenders/notices | Portal (public access to verify) | https://nest.go.tz/ (verify) | lead |
| 3 | Ministry of Finance and Planning | Budget/procurement notices | Public web | https://www.mof.go.tz/ (verify) | lead |
| 4 | Government tender/notice publications (official gazette/portals) | Notices | Public web | (verify) | lead |
| 5 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Regions & districts (target 30+)
Tanzania has 31 regions (mainland and Zanzibar) and many districts/municipal councils. Target regional secretariats and local government authorities with public procurement/tender notices.

| # | Region / Authority | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Dar es Salaam (city/region authorities) | Local procurement/tenders | (verify) | lead |
| 2 | Dodoma | Local tenders | (verify) | lead |
| 3 | Arusha | Local tenders | (verify) | lead |
| 4 | Mwanza | Local tenders | (verify) | lead |
| 5 | Zanzibar (relevant authorities) | Procurement notices | (verify) | lead |
| 6–30+ | Other regions/districts/councils with public notices | Local procurement pages | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~10+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | TANROADS | Roads/transport | (verify) | lead |
| 2 | TANESCO / energy utilities | Energy | (verify) | lead |
| 3 | DAWASA / water authorities | Water | (verify) | lead |
| 4 | Tanzania Ports Authority / transport agencies | Transport/logistics | (verify) | lead |
| 5 | Health/education sector public procurements | Health/Education | (verify) | lead |
| 6+ | Other public agencies/SOEs with tender pages | Various | (verify each) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National innovation/research/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Tanzania (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).