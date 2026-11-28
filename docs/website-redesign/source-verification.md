# Source and coverage verification (internal)

Date: 28 November 2026

> **Internal document — do not publish.** This file exists so the team can re-check
> coverage claims. Provider identities, endpoints and per-provider status must not appear
> on any public page, sitemap, structured data or marketing metadata. Since the review of
> 28 November 2026 the public site describes its data ecosystem by category only; the
> section that used to publish these fifteen sources has been removed.
Database: the platform's configured Neon branch (the same endpoint the deployed Data API
serves). Read-only queries only; no schema or data was changed.

This document is the evidence behind every figure and every source status on the public
website. If a number is not in this file, it does not belong on the site.

---

## 1. Queries run

Production branch (the one the public site reports from) and the dev branch hold different
corpora. Production: **1,636 stored / 1,609 verified notices**. Dev: **2,540 stored / 2,513
verified**. The figures below were taken on the dev branch unless marked production; the
public site only ever shows the production snapshot.

```sql
select count(*) from global_countries;                                   -- 101
select count(*) from coverage_truth where record_count > 0;              -- 23
select coalesce(sum(record_count),0) from coverage_truth;                -- 2540 (dev, owner)
select count(*) from opportunities;                                      -- 2540 dev / 1636 production
select count(distinct country_code) from opportunities;                  -- 23
select count(*) from opportunity_sources;                                -- 180
select count(*) from opportunity_sources where integration_status='operational'; -- 86
select count(*) from opportunity_sources
  where integration_status='operational' and source_health='healthy';    -- 16
select count(*) from opportunity_sources
  where last_successful_retrieval is not null;                           -- 30
select count(*) from opportunity_sources
  where last_successful_retrieval > now() - interval '7 days';           -- 17
select max(last_successful_retrieval) from opportunity_sources;          -- 2026-11-28T04:05Z
select max(last_success_at) from coverage_truth;                         -- 2026-11-28T05:20Z
select count(*), count(*) filter (where outcome='answered')
  from source_live_checks;                                               -- 225 rows, 149 answered
select max(checked_at) from source_live_checks;                          -- 2026-11-27T20:22Z
select count(distinct source_id),
       count(distinct source_id) filter (where answered_targets>0)
  from country_source_live_status;                                       -- 180 probed, 129 answered
select status, count(*) from coverage_truth group by 1;                  -- 99 monitored, 2 live
```

`coverage_truth.status` is `live` only when a successful ingestion run with new or updated
records finished within the last 72 hours; otherwise a market with an active operational
source is `monitored`. This is why only two markets read "live" at the time of the query
even though many sources are operational.

Source health distribution for the 86 operational connectors: 16 `healthy`, 32
`unavailable`, 2 `degraded`, 36 `unknown`. The website therefore reports the operational
count (86) and the count with a recorded successful retrieval, and never equates
"operational" with "delivering data".

### Why the public figure is 1,609 and not 1,636

The verification rules are `data_quality_status = 'valid'`, `source_verified_at is not
null` and `opportunity_has_verified_source(id)`. On production 27 of 1,636 notices fail at
least one rule, leaving **1,609 verified**. The public site shows 1,609 and labels it
"Verified notices"; the stored total is never displayed. (The earlier note in this file
quoted 1,636 as "anonymous-visible", which conflated the production corpus with a public
read that no longer exists — anonymous access to the table is closed by migration 0057.)

Markets: 23 hold stored notices, **18 hold verified notices**. The public market count is
18. The dev branch's larger corpus is not published.

---

## 2. The fifteen showcased sources

Matched by name against `opportunity_sources` and combined with the newest stored check in
`country_source_live_status`. "Latest check" is the newest HTTP observation of any endpoint
for that source, and "Last successful retrieval" is the newest ingestion record.

| # | Source | Registry row | Integration status | Last successful retrieval | Live check | Public label |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | TED — Tenders Electronic Daily | TED published procurement notices | operational | none recorded | answered 1/2, ~14 h old | Connected, no retrieval recorded |
| 2 | Grants.gov | Grants.gov Search | operational | 15 Nov 2026 | answered | Delivering records |
| 3 | SAM.gov | SAM.gov Contract Opportunities | operational | 12 Nov 2026 | answered | Delivering records |
| 4 | CanadaBuys | CanadaBuys Tender Notices | operational | none recorded | answered 2/2 | Connected, no retrieval recorded |
| 5 | AusTender | AusTender Contract Notices | operational | none recorded | answered | Connected, no retrieval recorded |
| 6 | UK Contracts Finder | Contracts Finder | operational (`degraded`) | 17 Nov 2026 | answered | Delivering records |
| 7 | Kenya PPIP | Kenya PPIP Active Tenders | operational | 15 Nov 2026 | answered | Delivering records |
| 8 | Tanzania NeST | NeST OCDS Procurement Data | operational | none recorded | — | Connected, no retrieval recorded |
| 9 | PhilGEPS | PS-PhilGEPS Open Opportunities | operational (`healthy`) | 28 Nov 2026 | answered | Delivering records |
| 10 | Ireland eTenders | not in registry | — | — | — | Not integrated |
| 11 | Italy ANAC | not in registry | — | — | — | Not integrated |
| 12 | TenderNed | TenderNed Publicaties | operational | none recorded | — | Connected, no retrieval recorded |
| 13 | France BOAMP | BOAMP Avis de marchés publics | operational | none recorded | — | Connected, no retrieval recorded |
| 14 | Open Contracting Data Standard | not in registry as a source | — | — | — | Not integrated |
| 15 | Asian Infrastructure Investment Bank | not in registry | — | — | — | Not integrated |

The showcase recomputes these labels in the browser from the same tables, so it cannot
drift from the database between reports. A source with no registry row is shown as *not
integrated* even though the official portal exists and is linked — the gap is stated, not
hidden.

## 3. Country coverage summary

- 101 markets in `global_countries` (ISO alpha-2).
- 23 markets hold verified notices. Largest holdings by verified records: Japan 494,
  Netherlands 315, Australia 217, Kenya 188, United States 169.
- 78 markets have a registry record but no verified notices visible publicly; they are
  shown as registry entries, not as covered markets.
- 516 source-country links exist (`source_country_coverage`), which is why the number of
  registered sources (180) and the number of source links (516) differ.

## 4. Live check semantics (unchanged, restated)

- `answered` means a real HTTP request to the publisher's endpoint returned a response.
- `blocked`, `unreachable` and `error` are failures and never count as verified.
- A feed that returns `text/html` is recorded as a web page, not as a working data feed
  (`feedPayloadNote` in `src/ui/data/liveness.ts`).
- Checks are written by `scripts/check-source-liveness.mjs`; the newest check is exposed
  by `country_source_live_status` and `country_live_summary`.

## 5. What the website may and may not claim

May claim: the counts above, the newest recorded collection time, per-source status as
listed, and that every stored notice is linked to its issuing source.

May not claim: global coverage, "all fifteen sources live", customer numbers, awards,
success rates, market coverage beyond the 23 markets with verified notices, or any pricing
feature that checkout does not implement.
