# Africa 50+ deep source inventory index

**Purpose:** Track 50+ source-lead inventories for all African target markets (Africa-first MVP). Inventories list **leads** (not verified/live) across national + subnational/admin units + sectors/SOEs + grants/funding. Convert lead → **verified (Cat A/B, terms/rights evidenced)** → **operational** with stored records and fresh `coverage_truth` (data-derived; no unverified “live” claims).

**Status (inventories):** 27/27 African markets covered with deep-inventory docs (50+ target structure each).

| Country | Code | Region | Inventory | Repo/catalog leads (summary) |
|---|---|---|---|---|
| Benin | BJ | West Africa | [benin-deep-source-inventory.md](benin-deep-source-inventory.md) | `benin-armp-notices` (html, candidate) |
| Botswana | BW | Southern Africa | [botswana-deep-source-inventory.md](botswana-deep-source-inventory.md) | `botswana-ppa-notices` (html, candidate) |
| Burkina Faso | BF | West Africa | [burkina-faso-deep-source-inventory.md](burkina-faso-deep-source-inventory.md) | `burkina-faso-armp-notices` (html, candidate) |
| Burundi | BI | East Africa | [burundi-deep-source-inventory.md](burundi-deep-source-inventory.md) | `burundi-armp` (candidate) |
| Côte d'Ivoire | CI | West Africa | [cote-divoire-deep-source-inventory.md](cote-divoire-deep-source-inventory.md) | `cote-ivoire-dgmp-appels`, `cote-ivoire-dgmp-attributions` (html, candidates) |
| Egypt | EG | North Africa | [egypt-deep-source-inventory.md](egypt-deep-source-inventory.md) | `egypt-etenders-portal` (research_pending); **51 VERIFIED 17 Nov 2026** (12 national + 16 SOE + 9 universities + 6 donors/UN + 7 governorate buyers + 1 investment channel) |
| Ethiopia | ET | East Africa | [ethiopia-deep-source-inventory.md](ethiopia-deep-source-inventory.md) | `ethiopia-fppa-egp` (candidate) |
| Gambia | GM | West Africa | [gambia-deep-source-inventory.md](gambia-deep-source-inventory.md) | `gambia-ppag-notices` (html, candidate) |
| Ghana | GH | West Africa | [ghana-deep-source-inventory.md](ghana-deep-source-inventory.md) | `ghana-ghaneps-ocds` (OCP bulk, candidate); **51 VERIFIED 17 Nov 2026** (10 national + 16 SOE/universities + 21 MMDAs + 4 donors) |
| Kenya | KE | East Africa | [kenya-deep-source-inventory.md](kenya-deep-source-inventory.md) | `kenya-ppip` + planned leads (candidates) |
| Liberia | LR | West Africa | [liberia-deep-source-inventory.md](liberia-deep-source-inventory.md) | `liberia-ppcc-ocds` (OCP bulk, candidate) |
| Madagascar | MG | Southern Africa | [madagascar-deep-source-inventory.md](madagascar-deep-source-inventory.md) | `madagascar-dgcp-notices` (html, candidate) |
| Malawi | MW | Southern Africa | [malawi-deep-source-inventory.md](malawi-deep-source-inventory.md) | `malawi-ppda-notices` (html, candidate) |
| Mauritius | MU | Southern Africa | [mauritius-deep-source-inventory.md](mauritius-deep-source-inventory.md) | `mauritius-ppo-notices` (html, candidate) |
| Morocco | MA | North Africa | [morocco-deep-source-inventory.md](morocco-deep-source-inventory.md) | `morocco-marches-publics-portal` (research_pending); **61 VERIFIED 17 Nov 2026** (1 national portal + 20 central agencies + 20 local authorities + 14 universities/hospitals + 6 SOE/donor channels) |
| Mozambique | MZ | Southern Africa | [mozambique-deep-source-inventory.md](mozambique-deep-source-inventory.md) | `mozambique-sisac-notices` (html, candidate) |
| Namibia | NA | Southern Africa | [namibia-deep-source-inventory.md](namibia-deep-source-inventory.md) | `namibia-cpbn-notices` (html, candidate) |
| Niger | NE | West Africa | [niger-deep-source-inventory.md](niger-deep-source-inventory.md) | `niger-armp-notices` (html, candidate) |
| Nigeria | NG | West Africa | [nigeria-deep-source-inventory.md](nigeria-deep-source-inventory.md) | `nigeria-nocopo-ocds` (OCP bulk, **active beachhead in dev**; clean live run pending) |
| Rwanda | RW | East Africa | [rwanda-deep-source-inventory.md](rwanda-deep-source-inventory.md) | `rwanda-umucyo` (candidate) |
| Senegal | SN | West Africa | [senegal-deep-source-inventory.md](senegal-deep-source-inventory.md) | `senegal-marchespub-notices` (html, candidate) |
| Sierra Leone | SL | West Africa | [sierra-leone-deep-source-inventory.md](sierra-leone-deep-source-inventory.md) | `sierra-leone-nppa-bids` (html, candidate) |
| South Africa | ZA | Southern Africa | [south-africa-deep-source-inventory.md](south-africa-deep-source-inventory.md) | `south-africa-etenders-ocds` (OCP bulk, candidate) |
| South Sudan | SS | East Africa | [south-sudan-deep-source-inventory.md](south-sudan-deep-source-inventory.md) | `south-sudan-ppdaa-tender-portal` (candidate) |
| Tanzania | TZ | East Africa | [tanzania-deep-source-inventory.md](tanzania-deep-source-inventory.md) | `tanzania-nest` (candidate) |
| Uganda | UG | East Africa | [uganda-deep-source-inventory.md](uganda-deep-source-inventory.md) | `uganda-egp`, `uganda-government-procurement-portal` (candidates) |
| Zambia | ZM | Southern Africa | [zambia-deep-source-inventory.md](zambia-deep-source-inventory.md) | `zambia-zppa-ocds` (OCP bulk, candidate) |

## Execution rules
- **Per-source checklist:** verify publisher/identity, official URL, access method (Cat A/B preferred), terms/reuse/robots/attribution, then implement/validate connector → ingest on dev → confirm stored records & freshness in `coverage_truth`/Discover.
- **No false claims:** do not mark a market/source live, verified, or operational without evidence, permissions, working ingestion, stored records, and data-derived coverage.
- **Beachhead priority:** NG (prove clean live run + evidence) → KE/ZA/GH/EG/MA → rest of continent, depth-first with trusted provenance.

See `../AFRICA_SOURCE_BACKLOG.md`, `../AFRICA_SOURCE_SCALE_FRAMEWORK.md`, and `../AFRICA_FIRST_MVP_PLAN.md`.