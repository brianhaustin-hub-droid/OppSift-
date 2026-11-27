# Global leads inventory (unverified, per country)

**Purpose:** show the real depth of each market without inflating the number of
verified sources. Every country in the registry has 3–6 registered sources — the
publishers whose tender pages have actually been read. That is an honest source
count, not a count of the organisations that buy in the market.

The lead inventory records the wider set of **named buying functions** for a
country. It is the same concept as the 50+ inventories used for the African
markets ([`AFRICA_50PLUS_INVENTORY_INDEX.md`](AFRICA_50PLUS_INVENTORY_INDEX.md)),
extended to all 101 registry countries and stored in the database so the country
pages can show it.

## What a lead is, and is not

| | Verified source | Unverified lead |
|---|---|---|
| Publisher identity confirmed | Yes | No |
| Official tender URL read | Yes | No (`official_website` stays null) |
| Access method and reuse terms reviewed | Yes | No |
| Notices ingested | Yes | Never |
| Counted in `coverage_truth` / coverage status | Yes | **Never** |
| Shown on the country page | Under "Verified sources" | Under "Unverified leads" |

A lead is promoted to a source only after its publisher, official tender URL,
access method and reuse terms are confirmed, a connector exists and
`coverage_truth` reports stored records. The same rule as
[`source-verification-register.md`](source-verification-register.md).

## The 73 named buying functions

The catalogue is functional rather than speculative: it names buying functions
that every national administration has. No portal URL is invented, so a lead can
never imply a checked link.

| Kind | Count | Examples |
|---|---|---|
| National ministries and departments | 20 | health, education, finance, public works, transport, water, energy, agriculture, defence, interior, environment, housing, digital government, trade, labour, justice, foreign affairs, fisheries, mining, tourism |
| Central agencies and regulators | 9 | procurement regulator, audit office, central bank, statistics office, official gazette, anti-corruption commission, public service commission, revenue authority, PPP unit |
| State-owned enterprises and utilities | 12 | electricity utility, water utility, oil and gas company, ports, airports, railway, roads authority, telecom operator, postal service, housing corporation, mining company, broadcaster |
| Subnational government | 7 | capital-city council, metropolitan authority, provincial/state offices, district/county offices, public hospitals, public universities, public schools |
| Public programmes and funds | 8 | health insurance fund, social security, university grants commission, research fund, scholarship programme, agricultural programme, infrastructure programme, digital government programme |
| Development partners | 8 | multilateral development banks, regional development banks, UN country team, UN agency country offices, EU delegation, bilateral agencies, global health programmes, climate funds |
| Grants and business support | 5 | innovation/startup fund, SME agency, export promotion agency, environment fund, arts and culture fund |
| Commercial and membership bodies | 4 | chamber of commerce, employers federation, industry associations, private utilities and concessions |

Total: **73 leads per country**, above the 50-per-country threshold.

## Storage and reads

* `public.source_leads` — the inventory (id, country_code, name, lead_kind,
  sector, status, official_website, discovery_basis, sort_order). Unique on
  `(country_code, name)`.
* `public.source_leads_public` — public projection read by the country page.
* `public.country_lead_summary` — lead count per country, joined into the
  coverage table so the country header can show both numbers.
* Seeded idempotently from `backend/neon/intelligence/lead-inventory.ts` by
  `node scripts/seed-source-leads.mjs` (migration `0052`).

## Honest limits

* Leads are a research checklist, not confirmed publishers. Naming a ministry
  does not mean it advertises tenders online, and most will publish through the
  national portal that is already a registered source.
* The inventory is uniform across countries. It does not encode each country's
  exact ministry structure; that detail belongs to the per-country inventories
  (for example [`kenya-deep-source-inventory.md`](kenya-deep-source-inventory.md))
  where individual URLs and verification evidence are recorded.
* The count is not a coverage claim. A country with 73 leads and 3 sources has
  exactly 3 sources.
