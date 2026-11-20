# Burundi deep source inventory (beachhead, 50+ target)

**Goal:** 50+ source leads for Burundi (national + provinces/communes + sectors + grants/funding). Leads are **not** verified or live integrations.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | ARMP Burundi notices | National procurement notices | Web/html (to verify) | In catalog as `burundi-armp` (candidate) | Verify official URL/access/terms/robots, build & validate connector, ingest & monitor |

## 1) National procurement & disclosure (target ~10+)
| # | Source lead | Scope | Access (est.) | URL (verify) | Status |
|---|---|---|---|---|---|
| 1 | Autorité de Régulation des Marchés Publics (ARMP) | Procurement notices/regulation | Public web | https://www.armp.bi/ (verify) | lead |
| 2 | Ministry of Finance / budget and procurement notices | National notices | Public web | (verify) | lead |
| 3 | Official government publications | Notices | Public web | (verify) | lead |
| 4 | National MDAs procurement pages (aggregate) | Ministry/agency tenders | Public web | (verify per MDA) | lead |

## 2) Provinces & communes (target 30+)
Burundi has provinces and communes — target provincial administrations and commune-level entities with public procurement/tender notices where accessible (e.g. Bujumbura Mairie, Gitega, Ngozi, Rumonge, and others).

| # | Province / Commune | Expected source lead | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Bujumbura Mairie | Local procurement/tenders | (verify) | lead |
| 2 | Gitega | Local tenders | (verify) | lead |
| 3 | Ngozi | Local tenders | (verify) | lead |
| 4–30+ | Other provinces/communes with public notices | Procurement notices | (verify each) | lead |

## 3) Sector / SOE / agency tenders (target ~8+)
| # | Source lead | Sector | URL (verify) | Status |
|---|---|---|---|---|
| 1 | Roads/transport agencies | Transport | (verify) | lead |
| 2 | REGIDESO / water-energy utilities | Utilities | (verify) | lead |
| 3 | Health/education sector public procurements | Health/Education | (verify) | lead |
| 4+ | Other public agencies/SOEs with tender pages | Various | (verify each) | lead |

## 4) Grants & funding (target ~5+)
| # | Source lead | Type | URL (verify) | Status |
|---|---|---|---|---|
| 1 | National/SME grant calls (public) | Grants/funding | (verify) | lead |
| 2 | Development finance/multilateral opportunities for Burundi (public) | Funding/procurement overlay | (verify) | lead |

**Initial target:** 50+ leads (verify URLs/access/terms, prioritize Cat A/B, onboard connectors; do not claim live without `coverage_truth` evidence).