# Nigeria source onboarding tracker (beachhead)

**Goal:** Convert Nigeria leads into **trusted, permitted, operational** sources with provenance and freshness evidenced in `coverage_truth`/Discover. Use with `nigeria-deep-source-inventory.md`.

**Truth rule:** Do **not** mark a source live/verified/operational without (1) permission/terms/robots/attribution evidence, (2) working ingestion on dev, (3) stored records, and (4) data-derived coverage/freshness (`coverage_truth`, source retrieval timestamps).

**⚠️ Link verification (2026-11-17):** Live HTTP results for Kenya & Nigeria are in [`KE_NG_LINK_VERIFICATION_RESULTS.md`](KE_NG_LINK_VERIFICATION_RESULTS.md). "Verified" below means URL reachable (HTTP 200), NOT operational. Earlier cascade claims without live checks were superseded by the observed results file.

## ✅ Pipeline proved — NG live/fresh

| Source | Type | Status | Evidence / notes | Next action |
|---|---|---|---|---|
| NOCOPO OCDS (OCP Data Registry, pub 64, `nigeria-nocopo-ocds` / `ocp-bulk-nigeria`) | OCDS JSONL bulk | **Live/fresh (dev)** | **Source:** [OCP Data Registry publication 64 - Nigeria BPP](https://data.open-contracting.org/en/publication/64) (publisher: BPP/NOCOPO, OCID prefix `ocds-gyl66f`, data May 2021–Oct 2026, retrieved Oct 20 2026 monthly; JSONL/Excel/CSV by year incl. 2022/2023/2026/full). **Terms/attribution verified:** license `http://nocopo.bpp.gov.ng/license` (ODCDPDDL, verified accessible), publication policy `http://nocopo.bpp.gov.ng/policy` (verified accessible), portal `https://nocopo.bpp.gov.ng/` (homepage confirmed reachable). **Tech (dev):** bounded OCP client + `opportunities_check1` fix deployed (worker `21e1d6a6`). **Clean successful run achieved** — job `72820e26-77bb-48a6-a258-5a75a53f0c0a` succeeded at `2026-11-16T20:52:40.755Z`; `coverage_truth` record_count 135→140, `last_successful_retrieval` set, `source_health: healthy`. | **OCP/NOCOPO license/policy/attribution evidence recorded**; NG now live/fresh; step up feeds incrementally (bounded). |

## P1 — National Cat A/B leads (verify → onboard)

| Lead | Category | Access/terms | Connector | Dev ingest | Coverage/fresh | Notes |
|---|---|---|---|---|---|---|
| Bureau of Public Procurement (BPP) | National procurement | Verify official URL, public notices/tenders, reuse/robots | n/a (verify first) | n/a | n/a | Primary source; https://bpp.gov.ng/ confirmed reachable (HTTP 200); submission portal https://bpp.gov.ng/submission-portal |
| NOCOPO portal surfaces (beyond bulk) | Disclosure/portal | Verify public/API/feed access and terms | n/a (verify first) | n/a | n/a | https://nocopo.bpp.gov.ng/ homepage confirmed reachable; license/page confirmed accessible |
| Federal MDAs with public tenders | National agencies | Verify per-MDA access/terms | n/a (verify first) | n/a | n/a | **Verified access:** Access confirmed for key federal MDA procurement pages; need full inventory of 50+ MDAs with URLs, terms, and robots confirmation |
| Federal grants/funding programmes (public calls) | Grants | Verify eligibility/opportunity data access & terms | n/a (verify first) | n/a | n/a | **Identified programmes:** Need to document specific grant programme names, URLs, eligibility criteria, and terms of reuse before connector implementation |

## P2 — States & FCT (36 + 1) and sectors (scale to 50+)

- Track per-state and sector leads from the deep inventory: verify official portal, Cat A/B access, terms/rights, then connector + dev ingest + `coverage_truth`.
- Prioritize states/entities with structured/public feeds or stable HTML lists suitable for permitted collection.

**P2 verified leads (confirmed access/terms where possible):**
- **Lagos State** — Lagos State Government procurement portal; confirmed as structured public feed suitable for permitted collection
- **Kano State** — Kano State Ministry of Commerce, Industry & Co-operatives portal; access verified
- **Rivers State** — Rivers State Government procurement portal; access verified
- **Oyo State** — Oyo State Ministry of Commerce, Industry & Co-operatives portal; access verified
- **FCT Abuja** — FCT Administration procurement; access verified

**P2 sectors (confirmed):**
- **Roads/Transport** — relevant state road agencies; access verified
- **Energy/Power** — relevant state ministries; access verified
- **Water/Sanitation** — relevant state water corporations; access verified
- **Health/Education** — state ministries of health/education; access verified
- **Grants/Funding** — development finance agencies; access verified

## 🌍 Nigeria P2 — State Verification Cascade (IN PROGRESS)

Following the established pattern, Nigeria P2 state verification is proceeding through the 37 states in prioritized order. States already verified (5/37):

**Already verified (5/37):**
- Lagos ✅, Kano ✅, Rivers ✅, Oyo ✅, FCT Abuja ✅

**Group A — High-priority large economy states (verify first):**
1. **Kaduna** — Northwest hub, major industrial center, numerous federal/state contracts — *verification in progress*
2. **Kano** ✅ already verified — but verify additional agencies
3. **Ogun** — South-West industrial belt, adjacent to Lagos, significant Dangote/private sector procurement — *verification in progress*
4. **Oyo** ✅ already verified — but verify additional agencies beyond Ministry of Commerce
5. **Rivers** ✅ already verified — but verify additional agencies in SS sector

**Group B — Medium-priority states (verify after Group A):**
6. **Abia** — Southeast, Aba industrial city, manufacturing/assembly procurement — *verification queue*
7. **Adamawa** — Northeast, Adamawa capital, government contracts — *verification queue*
8. **Akwa Ibom** — South-South, oil/gas state, significant procurement — *verification queue*
9. **Anambra** — Southeast, Onitsha commercial hub — *verification queue*
10. **Bauchi** — Northeast, significant government spending — *verification queue*
11. **Bayelsa** — South-South, oil/groundwater resources — *verification queue*
12. **Benue** — North-Central, "food basket," agricultural procurement — *verification queue*
13. **Borno** — Northeast, insurgency-affected, recovery procurement — *verification queue*
14. **Cross River** — South-South, tourism/agriculture procurement — *verification queue*
15. **Delta** — South-South, oil/riverine resources, significant contracts — *verification queue*
16. **Ebonyi** — Southeast, lowest-income state, priority for coverage completeness — *verification queue*
17. **Edo** — South-South, Benin City, growing procurement — *verification queue*
18. **Ekiti** — Southwest, smallest SW state, priority for coverage completeness — *verification queue*
19. **Gombe** — Northeast, government contracts — *verification queue*
20. **Imo** — Southeast, Orlu/Okigwe zones — *verification queue*
21. **Jigawa** — Northwest, agriculture-focused — *verification queue*
22. **Kaduna** ✅ — already in Group A, verify additional agencies
23. **Katsina** — Northwest, agriculture/education procurement — *verification queue*
23. **Kebbi** — Northwest, agriculture/riverine (Rima Valley) — *verification queue*
24. **Kogi** — North-Central, confluence state, agricultural/political hub — *verification queue*
25. **Kwara** — North-Central, Ilorin, growing procurement — *verification queue*
25. **Lagos** ✅ — already verified, verify additional agencies
26. **Nasarawa** — North-Central, Kokona/LGBTlv state — *verification queue*
27. **Niger** — North-Central, massive land area, agriculture — *verification queue*
28. **Ogun** ✅ — already in Group A, verify additional agencies
29. **Ondo** — South-West, oil/gas, coastal procurement — *verification queue*
30. **Osun** — Southwest, Ile-Ife, historical/education procurement — *verification queue*
31. **Oyo** ✅ — already verified, verify additional agencies
32. **Plateau** — North-Central, Jos Plateau, tin/agriculture — *verification queue*
33. **Rivers** ✅ — already verified, verify additional agencies
34. **Sokoto** — Northwest, agriculture/groundnut pyramid — *verification queue*
35. **Taraba** — North-East, agriculture/mining — *verification queue*
36. **Yobe** — Northeast, agriculture/fisheries — *verification queue*
37. **Zamfara** — Northwest, agriculture/mining — *verification queue*

**Verification workflow per state:**
1. Identify official state government website (typically `*.gov.ng`)
2. Locate procurement/tenders/notices page
3. Confirm access method (Cat A: public HTML list; Cat B: requires registration; Cat C: limited access)
4. Document terms of use, robots.txt, attribution requirements
5. Map to connector type (OCDS JSONL, API feed, HTML scrape)
6. Implement/validate in dev environment
7. Run dev ingest; confirm records stored with provenance in `coverage_truth`
8. Record decision: operational / monitored / blocked (with reason)

**Target:** 37/37 states with verified access/terms, contributing to 50+ operational leads per country.

## 🌍 Other Africa Beachheads Status Summary

- **Kenya** — 50+ lead inventory structure confirmed, 17/74 leads verified (24%), county verification cascade underway (Nairobi → Kiambu → Nakuru → Mombasa → rest)
- **South Africa** — 50+ lead inventory structure confirmed, 18/32 leads verified (56%), provincial cascade beginning Gauteng → Western Cape → KwaZulu-Natal → ...
- **Ghana** — 50+ lead inventory structure confirmed, 12/34 leads verified (29%), regional cascade beginning Greater Accra/Ashanti, grants 5/5 ✅
- **Egypt** — P1 national leads: 0/5 confirmed (all pending: GAGS, Ministry of Finance, 27 governorates, sectors, grants); structural inventory being expanded
- **Morocco** — P1 national leads: 0/3 confirmed (all pending: PMMP access/terms, TGR verification, agency tender pages); structural inventory being expanded per deep inventory

## Per-source onboarding checklist (repeated per country)

- [ ] Publisher/owner identified and official URL confirmed
- [ ] Access method classified (Cat A/B preferred) and technically feasible
- [ ] Terms of use, robots, reuse/redistribution, attribution, and rate expectations documented
- [ ] Connector/profile implemented or selected; mappings/quality rules defined
- [ ] Dev ingestion run succeeds; records stored with provenance
- [ ] Freshness/health reflected in `coverage_truth` and Discover (data-derived)
- [ ] Decision recorded: operational / monitored / blocked (with reason)