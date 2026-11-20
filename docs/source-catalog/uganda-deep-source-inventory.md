# Uganda deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Uganda (national + districts/cities + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | Uganda eGP (Electronic Government Procurement) | National procurement | Portal (access to verify) | In catalog as `uganda-egp` (`research_pending` candidate) | Confirm official Cat A/B access (API/feed/export), publisher/terms/rights, build & test connector |
| 2 | Government Procurement Portal / PPDA (GPP) | National notices/regulation | Portal/web (to verify) | In catalog as `uganda-government-procurement-portal` (candidate) | Verify official URLs/access/terms, connector feasibility, ingest & monitor |
| 3 | Uganda GPP OCDS / OCP Data Registry (if available) | Compiled OCDS releases | OCDS bulk (to verify) | Research (OCP publication may exist) | Confirm publication, permission/attribution/terms, validate ingest & mapping |

## 1) National procurement & disclosure (target ~12+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | PPDA - Public Procurement and Disposal of Public Assets Authority | Notices, regulations, procurement data | Public web | https://www.ppda.go.ug/ (verify) | lead |
| 2 | Electronic Government Procurement (eGP) portal | Tenders/notices | Portal (public access to verify) | https://egpuganda.go.ug/ (verify) | lead |
| 3 | Government Procurement Portal (GPP) | Tender notices | Public web | (verify official) | lead |
| 4 | Ministry of Finance, Planning and Economic Development | Budget/procurement notices | Public web | https://finance.go.ug/ (verify) | lead |
| 5 | Office of the Prime Minister / government notices | Public notices | Public web | (verify) | lead |
| 6 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Districts & cities (target 30+)
Uganda has numerous districts and cities (e.g. Kampala Capital City, Wakiso, Mukono, Gulu, Mbarara, Jinja, Mbale, Arua, Lira, Fort Portal, Masaka, Hoima, Soroti, Entebbe, and others). Target district local government and city procurement/tender notice pages where publicly accessible.

| # | District / City | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Kampala Capital City Authority (KCCA) | City procurement/tenders | (verify) | lead |
| 2 | Wakiso District LG | District tenders | (verify) | lead |
| 3 | Gulu City/District | Local tenders | (verify) | lead |
| 4 | Mbarara City/District | Local tenders | (verify) | lead |
| 5 | Jinja City/District | Local tenders | (verify) | lead |
| 6–30+ | Other districts/cities with public notices | Local procurement pages | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~10+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Uganda National Roads Authority (UNRA) | Roads/transport | (verify) | lead |
| 2 | Uganda Electricity Generation/Transmission/Distribution entities | Energy | (verify) | lead |
| 3 | National Water and Sewerage Corporation (NWSC) | Water | (verify) | lead |
| 4 | Civil Aviation Authority / Uganda Airlines related public tenders | Transport | (verify) | lead |
| 5 | Ministry of Health / education sector procurements (public) | Health/Education | (verify) | lead |
| 6+ | Other public agencies/SOEs with tender pages | Various | (verify each) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National innovation/research/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Uganda (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).