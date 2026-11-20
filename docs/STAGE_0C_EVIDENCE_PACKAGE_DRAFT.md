# Stage 0c Evidence Package (Draft, DB-queried)

**Date:** 2026-11-16 (snapshot, updated)
**Worker:** `oppsift-ingestion-orchestrator` v`6c71a91e-099b-486c-b3ed-166dd9881033` (browser/headers/large-page guard/error-detail improvements deployed)
**Scope:** Kenya (`kenya-ppip-api` + `planned-ke-*`)
**Status:** Draft evidence only; **owner verification required**. **Stage 1 remains blocked** until Stage 0c passes with owner-verified evidence. No source/coverage claimed operational without successful run + stored records evidence.

## 1) Volume and traceability (DB evidence)
- Source records: **265**
- Distinct opportunities: **188**
- Records linked to opportunities: **265/265** (traceability proxy: stored source records linked to opportunities)
- Source-record IDs/URLs present: `external_record_id` 265/265, `source_url` 265/265
- Canonical keys: 188/188 opportunities have `canonical_key`; canonical-key duplicates: **0**
- Source/external ID duplicates: **0** (265 records)
- `dedupe_key` populated: 0/188 in snapshot (canonical_key present)

### By source (records)
| connector_identifier | records |
|---|---:|
| kenya-ppip-api | 133 |
| planned-ke-mombasa-county-procurement | 65 |
| planned-ke-kura-tenders | 36 |
| planned-ke-kerra-tenders | 10 |
| planned-ke-ppra-notices | 6 |
| planned-ke-krc-tenders | 4 |
| planned-ke-nairobi-county-procurement | 4 |
| planned-ke-kaa-tenders | 3 |
| planned-ke-kenha-tenders | 3 |
| planned-ke-mygov-gaa-all-tenders | 1 |
| **Total** | **265** |

## 2) Type / classification signals
- `opportunity_type_code`: `tender` = 188 (1 code)
- `original_classification` (source records): `Active Tender` 133, `Tender Notice` 80, `Tender` 52 (**3 distinct values observed**)
- Category: `government` = 188
- Status: `open` 137, `unknown` 47, `closed` 4

> Gate interpretation of “≥3 notice types” must be confirmed against project definition (codes vs source classifications/notice taxonomy).

## 3) Completeness (key fields, Kenya opportunities)
| Field | Present | Total | % |
|---|---:|---:|---:|
| title | 188 | 188 | 100% |
| buyer/org (`buyer_name`/`procuring_organization`/`issuing_institution`) | 188 | 188 | 100% |
| country_code | 188 | 188 | 100% |
| canonical_url | 188 | 188 | 100% |
| canonical_key | 188 | 188 | 100% |
| reference_number | 141 | 188 | 75.0% |
| closing_at | 137 | 188 | 72.9% |
| published_at | 133 | 188 | 70.7% |
| description | 0 | 188 | 0% |

## 4) Stage 0c threshold check (current snapshot)
- **Kenya records:** 265 (**below ≥300 target**) — gap remains.
- **Traceability:** 265/265 stored source records linked to opportunities with IDs/URLs/keys present; confirm against “traceable to raw rows” audit definition if stricter than DB linkage.
- **Completeness:** strong identity/URL/buyer/key coverage; **description absent**, dates/reference partial — validate against defined thresholds.
- **Duplicates:** 0 canonical-key duplicates; 0 duplicate `(source_id, external_record_id)` by proxy (**<5%** by these measures).
- **Notice types:** 3 `original_classification` values observed; 1 `opportunity_type_code` — confirm against gate definition.
- **20 owner-confirmed records:** **not completed** (owner action required).
- **`/discover` visibility:** **not yet evidenced** in this package (requires runtime/app verification with truthful, stored records).

## 5) Owner verification sample (20 candidates, DB-queried)
Owner should confirm each exists at source URL, key fields match, and is visible/usable where required.

| # | connector_identifier | external_record_id | title | reference | org | status | published | closing | source_url |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | kenya-ppip-api | 312363 | SUPPLY AND DELIVERY COMPUTERS, I.T & OTHER OFFICE EQUIPMENT | NCC/PSM/T/096/2026-2027 | Nairobi County Government | open | 2026-11-11 | 2026-11-17 | https://tenders.go.ke/tenders/312363 |
| 2 | kenya-ppip-api | 312364 | SUPPLY AND DELIVERY OF OFFICE STATIONERY | NCC/PSM/T/097/2026-2027 | Nairobi County Government | open | 2026-11-11 | 2026-11-17 | https://tenders.go.ke/tenders/312364 |
| 3 | kenya-ppip-api | 312044 | PROVISION OF STAFF MEDICAL COVER | CHEWASCO/WSP/TENDER/03/2026-2027 | CHEMUSUSU WATER COMPANY | open | 2026-11-10 | 2026-11-17 | https://tenders.go.ke/tenders/312044 |
| 4 | kenya-ppip-api | 312166 | PROPOSED LANDSCAPING AND CIVIL WORKS AT PCEA PROF. SAITOTI PRIMARY SCHOOL | NG-CDF/KJD-N/T/018/2026-2027 | Kajiado North NGCDF | open | 2026-11-10 | 2026-11-17 | https://tenders.go.ke/tenders/312166 |
| 5 | kenya-ppip-api | 312167 | PROPOSED LANDSCAPING AND CIVIL WORKS AT HON ODUPOI SECONDARY SCHOOL | NG-CDF/KJD-N/T/019/2026-2027 | Kajiado North NGCDF | open | 2026-11-10 | 2026-11-17 | https://tenders.go.ke/tenders/312167 |
| 6 | kenya-ppip-api | 312169 | PROPOSED CONSTRUCTION OF ADMINISTRATION BLOCK AT NALEPO PRIMARY SCHOOL | NG-CDF/KJD-N/T/020/2026-2027 | Kajiado North NGCDF | open | 2026-11-10 | 2026-11-17 | https://tenders.go.ke/tenders/312169 |
| 7 | kenya-ppip-api | 312171 | PROPOSED REHABILITATION AND EXTENSION OF ADMINISTRATION BLOCK AT ONGATA RONGAI PRIMARY SCHOOL | NG-CDF/KJD-N/T/021/2026-2027 | Kajiado North NGCDF | open | 2026-11-10 | 2026-11-17 | https://tenders.go.ke/tenders/312171 |
| 8 | kenya-ppip-api | 312172 | PROPOSED CONSTRUCTION OF 2NO CLASSROOMS... AT OLOOLAISER SECONDARY SCHOOL | NG-CDF/KJD-N/T/022/2026-2027 | Kajiado North NGCDF | open | 2026-11-10 | 2026-11-17 | https://tenders.go.ke/tenders/312172 |
| 9 | kenya-ppip-api | 312173 | PROPOSED REHABILITATION AND EXTENSION OF ADMINISTRATION BLOCK AT OLOOLUA SECONDARY SCHOOL | NG-CDF/KJD-N/T/023/2026-2027 | Kajiado North NGCDF | open | 2026-11-10 | 2026-11-17 | https://tenders.go.ke/tenders/312173 |
| 10 | kenya-ppip-api | 312174 | PROPOSED CONSTRUCTION OF 2NO CLASSROOMS... AT ENOOMATASIAN PRIMARY SCHOOL (Retender) | NG-CDF/KJD-N/T/024/2026-2027 | Kajiado North NGCDF | open | 2026-11-10 | 2026-11-17 | https://tenders.go.ke/tenders/312174 |
| 11 | kenya-ppip-api | 311667 | Proposed construction of 3 no classroom and demolition of the existing classrooms at majaoni pri school | NGCDF/KLF/MAJAONI/CONS/017/2026-2027 | KILIFI NORTH NGCDF | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311667 |
| 12 | kenya-ppip-api | 311668 | Renovation of 4 no classroom,2 offices at mijomboni primary | NGCDF/KLF/MIJOMBONI/REN/021/2026-2027 | KILIFI NORTH NGCDF | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311668 |
| 13 | kenya-ppip-api | 311669 | Renovation of 8 no classrooms and administration block at ngerenya primary school | NGCDF/KLF/NGERENYA/REN/026/2026-2027 | KILIFI NORTH NGCDF | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311669 |
| 14 | kenya-ppip-api | 311670 | Renovation of 7 no classroom at majajani pri | NGCDF/KLF/MAJAJANI/REN/016/2026-2027 | KILIFI NORTH NGCDF | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311670 |
| 15 | kenya-ppip-api | 311671 | Construction to completion of 2 no classroom at Ngala primary school | NGCDF/KLF/NGALA/CON/025/2026-2027 | KILIFI NORTH NGCDF | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311671 |
| 16 | kenya-ppip-api | 311672 | Renovation of 7 no classroom and 2 offices at Kiwandani primary school | NGCDF/KLF/KIWANDANI/REN/012/2026-2027 | KILIFI NORTH NGCDF | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311672 |
| 17 | kenya-ppip-api | 311803 | SUPPLY AND DELIVERY OF 45-51 SEATER ISUZU FRR90 SEMI-LUXURY SCHOOL BUS AT KIENI SENIOR SCHOOL | NGCDF/MAR/002-2026/2027 | MAARA NG-CDF | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311803 |
| 18 | kenya-ppip-api | 311815 | REAFFORESTATION OF SABOTI FOREST... (24,000 ASSORTED TREE SEEDLINGS) | KFS/NGCDF/138/2640510/1 | NATIONAL GOVERNMENT CONSTITUENCY DEVELOPMENT FUND SABOTI CONSTITUENCY | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311815 |
| 19 | kenya-ppip-api | 311826 | REAFFORESTATION OF SOSION FOREST... (24,000 ASSORTED TREE SEEDLINGS) | KFS-SOSION/NGCDF/138/2640510/110/2 | NATIONAL GOVERNMENT CONSTITUENCY DEVELOPMENT FUND SABOTI CONSTITUENCY | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311826 |
| 20 | kenya-ppip-api | 311907 | THE PROPOSED CONSTRUCTION OF TWO NUMBER CLASSROOMS AT PWANI FYM COMPREHENSIVE SCHOOL -TONGAREN CONSTITUENCY BUNGOMA COUNTY | MOE/PFYMCS/PSSIPPP/2026/2027FY | COUNTY COMMISSIONER BUNGOMA | open | 2026-11-09 | 2026-11-17 | https://tenders.go.ke/tenders/311907 |

## 6) Ingestion follow-up snapshot (post-deploy observations)
- **Improved with stored records (evidenced):** `html-ci-attribution` **2 records**, `ocp-bulk-thailand-bma` **6 records**.
- **Kenya extraction quality/opportunity (in progress):** `planned-ke-kura-tenders` and `planned-ke-mombasa-county-procurement` pages contain multiple tender/download items (inspected). Extractors were tightened/rewritten and browser-enabled (deployed v`90432737...`), then jobs reset for rerun — **new record/quality outcomes pending verified DB evidence**. `planned-ke-mygov-gaa-all-tenders` observed HTTP 530 on recent attempts; `planned-ke-agpo-opportunities`/`planned-ke-kplc-tenders` endpoints unavailable (404) and IFMIS lacks confirmed public listing (0 records, not evidenced operational).
- **Other priority sources (latest observed):** MG/MW/MZ previously succeeded with 0 discovered/extracted; BW/BF/GM/NE/SN showed HTTP discovery failures and lease/cursor instability in runs. Configs/connector improved and jobs reset across deploys — **final outcomes pending next verified runs**.
- **CI attribution:** records stored but lease/long-page risk observed; monitor completion stability. No source claimed operational without successful run + stored records evidence.

## 7) Required actions to close Stage 0c
1. Increase Kenya to **≥300** verified, traceable records where feasible (additional operational KE sources/runs with stored evidence).
2. Confirm notice-type and completeness thresholds against gate definitions; remediate extraction/mapping (e.g. description, dates/reference gaps) as needed.
3. Demonstrate **`/discover` visibility** in runtime with truthful, stored records.
4. Obtain **owner confirmation for 20 records** and formal Stage 0c sign-off (with evidence). Do not advance to Stage 1 without this.
