# Mauritius deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Mauritius (national + districts/local authorities + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | PPO procurement notices | National procurement notices | HTML list/scraper | In catalog as `mauritius-ppo-notices` (`operational` candidate) | Verify terms/robots, validate connector/ingest, confirm freshness |

## 1) National procurement & disclosure (target ~12+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Procurement Policy Office (PPO) | Notices, regulations, e-procurement | Public web | https://ppo.govmu.org/ (verify) | lead |
| 2 | Government e-Procurement System | Tenders/notices | Portal (public access to verify) | https://eproc.publicprocurement.govmu.org/ (verify) | lead |
| 3 | Ministry of Finance, Economic Planning and Development | Budget/procurement notices | Public web | (verify) | lead |
| 4 | National ministries/departments procurement pages (aggregate) | Agency tenders | Public web | (verify per entity) | lead |

## 2) Districts & local authorities (target 20+)
Mauritius has districts and local authorities (municipal councils, district councils) — target public procurement/tender notices where accessible (Port Louis, Beau Bassin-Rose Hill, Quatre Bornes, Curepipe, Vacoas-Phoenix, and district councils).

| # | Local authority / District | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | City Council of Port Louis | Local procurement/tenders | (verify) | lead |
| 2 | Municipal Council of Beau Bassin-Rose Hill | Local tenders | (verify) | lead |
| 3–20+ | Other councils/districts/entities | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~12+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Road Development Authority | Roads/transport | (verify) | lead |
| 2 | Central Electricity Board (CEB) | Energy | (verify) | lead |
| 3 | Central Water Authority | Water | (verify) | lead |
| 4 | Mauritius Ports Authority | Transport/logistics | (verify) | lead |
| 5 | Airports/transport agencies | Transport | (verify) | lead |
| 6 | Health/education sector public procurements | Health/Education | (verify) | lead |

## 4) Grants & funding (target ~8+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National SME/innovation/research grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Mauritius (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).