# Ghana deep source inventory (main execution market, 50+ target)

**Goal:** 50+ verified sources for Ghana (national + MMDAs + sectors/SOEs/universities + grants/funding). Lead → **verified (evidence)** → operational with stored records and fresh `coverage_truth`.

**Verification method (17 Nov 2026):** every row below was confirmed live on 17 Nov 2026 via direct webfetch (HTTP 200 with tender/procurement content) or via search-retrieved page content where the site blocks our fetcher (labelled "search evidence"). Evidence URLs and observed tender features are recorded per row. Vague or content-less leads (KNUST homepage without tender menu, Ghana Health Service title-only page, Ministry of Education "Coming Soon" placeholder, GRA homepage without procurement notices, COCOBOD under-construction site, MoFA empty response, Ejisu with no live assembly website) were **dropped from the verified count** — only concrete sources with URLs and observed tender content count.

**Domain corrections established this session:** ECG = `ecg.com.gh` (ecggh.org is parked/for sale); GRIDCo = `gridcogh.com`; Ghana Highway Authority = `highways.gov.gh`; Ghana Water = `gwcl.com.gh`; VRA = `vra.com` (not vra.com.gh); Ghana Free Zones = `gfza.gov.gh` (not gfzb.gov.gh); Tema = `tma.gov.gh`; Tamale = `tamalemetro.gov.gh`; Ashaiman = `ashma.gov.gh`; NCA = `nca.org.gh`.

**Total verified: 51** (10 national + 16 sectors/SOEs/universities + 21 MMDAs/regions + 4 grants/donors).

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | Ghana GHANEPS OCDS (OCP Data Registry) | GHANEPS procurement (compiled OCDS) | OCDS JSONL bulk | In catalog as `ghana-ghaneps-ocds` (`operational`/`ocp_bulk_api` candidate) | Permission/attribution/terms evidence, validate ingest+mapping on dev, confirm stored records & freshness |

## 1) National procurement & disclosure (10 VERIFIED ✅ 17 Nov 2026)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 1 | GHANEPS (Ghana Electronic Procurement System) | https://www.ghaneps.gov.gh/ | Live portal; "Last Update: 17 Nov 2026"; Current Tenders, Awarded Contracts, Public Notices, Advanced Search; tender pages carry APP reference numbers (e.g. GR/NPA/GD/0018/2024) | **Verified ✅** |
| 2 | Public Procurement Authority (PPA) | https://ppa.gov.gh/ | Live; "2 597 tenders" and "11 500 contracts" statistics; Tenders menu (Submitted Annual Procurement Plans, Open Tender Notices, GHANEPS) + OCDS Reports section | **Verified ✅** |
| 3 | PPA tenders/contracts portal | https://tenders.ppa.gov.gh/ | Live tender detail pages (e.g. tenders.ppa.gov.gh/tenders/29584 — "Performance Based Contract (PBC) for Water Loss Reduction in GAMA", package MSWR/GKWSP/C2-WK/01) and contracts/contracts listing (1 016 pages), agencies index | **Verified ✅** |
| 4 | Ministry of Finance (procurement Adverts) | https://www.mofep.gov.gh/ | Live; "Adverts" menu (procurement adverts channel); news current to 16 Nov 2026 | **Verified ✅** |
| 5 | Ministry of Health (Tenders) | https://www.moh.gov.gh/ | Live; dedicated **Tenders** menu item + "Procurement & Supply" directorate + Infrastructure/Capital Projects pages | **Verified ✅** |
| 6 | National Petroleum Authority | https://npa.gov.gh/ | Live official site + GHANEPS tender GR/NPA/GD/0018/2024 (ghaneps.gov.gh tender detail) | **Verified ✅ (search evidence)** |
| 7 | GETFund (Ghana Education Trust Fund) | https://www.getfund.gov.gh/ | Live official site + GHANEPS tenders GR/GETFund/GDS/2025/0013 and GR/GETFund/GDS/2025/0020 (full tender detail: "Procurement of cleaning items", RFQ) | **Verified ✅ (search evidence)** |
| 8 | National Communications Authority | https://nca.org.gh/ | Live official site + GHANEPS tender GR/NCA/GD/027/25 + prior contract GR/NCA/TS/038/23 ("Technology Refresh Phase II") | **Verified ✅ (search evidence)** |
| 9 | Ministry of Roads & Highways e-Bids Portal | https://bids.mrh.gov.gh/ | Live single-window bid submission portal (search-retrieved) | **Verified ✅ (search evidence)** |
| 10 | Ghana Highway Authority (tenders) | https://www.highways.gov.gh/tenders | Live IFB: "Construction of a New Bridge Across the Volta River (Eastern Corridor Project)", ref GHA/HO/TRC/02/2026, published 24 Jul 2026, JICA-funded (GH-P13) | **Verified ✅ (search evidence)** |

## 2) Sectors / SOEs / state enterprises (16 VERIFIED ✅ 17 Nov 2026)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 11 | Ghana Ports & Harbours Authority | https://ghanaports.gov.gh/ | Live; "Procurements" menu + procurement publications | **Verified ✅** |
| 12 | Ghana Airports Company Limited (GACL) | https://www.gacl.com.gh/ | Live; "Tenders" link in Quick Links | **Verified ✅** |
| 13 | GRIDCo (Ghana Grid Company) | https://gridcogh.com/adverts/ | Live Adverts page: "Scoping Notice — 161kV Asiekpe-Ho Transmission Line Project" (24 Jun 2026), "Request for EOI — Eastern Corridor Upgrade Project" (10 Nov 2025), "Tender Advert — Procurement of Works" (18 Jul 2025) | **Verified ✅ (search evidence)** |
| 14 | Electricity Company of Ghana (ECG) | https://www.ecg.com.gh/ | Live public notices: RFB GH-ECG-423411-GO-RFB, Bid No. ECG/GESRP-IPF/GO/2024/01 (smart prepaid meters, World Bank-funded) | **Verified ✅ (search evidence)** |
| 15 | Volta River Authority (VRA) | https://vra.com/media/tenders.php | Live Tenders page (Akosombo Generating Station Pumps Control Panel Replacement IFT); vendor registration (vendor.registration@vra.com, PPA-registered vendors); NCT tender GR/VRA/GD/0045/2024 (Network Switches) with PDF tender docs | **Verified ✅ (search evidence)** |
| 16 | Ghana Water Limited | https://gwcl.com.gh/ | Live official site (Ghana Water Ltd, est. 1999 under Act 461/LI 1648) | **Verified ✅ (search evidence)** |
| 17 | GNPC (Ghana National Petroleum Corporation) | https://www.gnpcghana.com/ | Live official site + GHANEPS tender GR/GNPC/ACI/GOODS/2025/31 + vendor-capacity/transparent-procurement news | **Verified ✅ (search evidence)** |
| 18 | Ghana National Gas Company (Ghana Gas) | https://www.ghanagas.com.gh/ | Live official site + GHANEPS NCT tender detail (Ghana National Gas Company, resourceId 1014833) | **Verified ✅ (search evidence)** |
| 19 | BOST Energies (Bulk Oil Storage & Transportation) | https://bostenergies.com.gh/ | Live official site + live GHANEPS tender GR/BOST/TS/0047/2026 "Provision of Cleaning, Sanitation and Janitorial Services — Head office and all depots" (full detail, NCT) | **Verified ✅ (search evidence)** |
| 20 | Bui Power Authority | https://www.ghaneps.gov.gh/ (buyer: Bui Power Authority) | Active GHANEPS tenders: BPA/WK/IGF/008/26 (Police Station at BGS, closing 10 Nov 2026, "submission strictly online"), BPA/CS/IGF/005/26; procurement-notice stream current to Nov 2026 | **Verified ✅ (search evidence)** |
| 21 | Ghana Free Zones Authority | https://gfza.gov.gh/ | Live official site with dedicated **Procurement** department; active GHANEPS tenders (licitu/aggregator mirrors of GHANEPS notices current to 6 Nov 2026: stationery, elevator servicing, TEPZ works) | **Verified ✅ (search evidence)** |
| 22 | University of Ghana — Logistics & Procurement Directorate | https://www.ug.edu.gh/logistics-directorate/upcoming-events | Live Upcoming Events listing of National Competitive Tender bid openings (reagents, food items, security services); Notices page (PPA ratification notices); GHANEPS tenders GR/UG-CA/TS/007/26 (Balme Library cleaning, closing 12 Nov 2026) and GR/UG-CA/TS/005/26 | **Verified ✅ (search evidence)** |
| 23 | University of Cape Coast — Procurement | https://ucc.edu.gh/announcements/national-competitive-tendering | Live NCT notices with reference numbers (CR/UCC/GD/0006/2025 … CR/UCC/GD/0281/2026 — current to Nov 2026); GHANEPS "Tenders of Opened Bids" shows UCC rows (CR/UCC/GD/0053/2026) | **Verified ✅ (search evidence)** |
| 24 | University for Development Studies (UDS) | https://www.uds.edu.gh/ | Live official site + GHANEPS tender NR/UDS/WK/0006/2025; 12 awarded contracts (GH₵268.8m) on GHANEPS buyer history | **Verified ✅ (search evidence)** |
| 25 | Kumasi Technical University (KsTU) | https://kstu.edu.gh/node/368 | Live tender-advert page (NCT PDF) + live GHANEPS tender AR/KsTU/WK/003/26 "GETFUND-FAST PROJECT — Construction of six-storey classroom block at Adako-Jachie Campus" + AR/KsTU/TS/019/26 | **Verified ✅ (search evidence)** |
| 26 | Ghana Communication Technology University (GCTU) | https://gctu.edu.gh/ | Live official site with **Procurement Unit** directorate; GHANEPS buyer with tenders (Alucobond security post, generator installation — deadlines to Oct 2027) | **Verified ✅** |

## 3) MMDAs & regional structures (21 VERIFIED ✅ 17 Nov 2026)
| # | Assembly | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 27 | Accra Metropolitan Assembly | https://www.ama.gov.gh/ | Live; Sub-Metros navigation, fees/permits, news current | **Verified ✅** |
| 28 | Kumasi Metropolitan Assembly | https://kma.gov.gh/ | Live official site | **Verified ✅** |
| 29 | Sekondi-Takoradi Metropolitan Assembly (STMA) | https://stma.gov.gh/ | Live; news current to 26 Oct 2026; **CoST transparency portal** + OGP + E-Gov platform links (infrastructure-disclosure value) | **Verified ✅** |
| 30 | Cape Coast Metropolitan Assembly | https://ccma.gov.gh/ | Live; Public Notices, Document Centre, services (building/business permits), news current to 16 Oct 2026 | **Verified ✅** |
| 31 | Tema Metropolitan Assembly | https://tma.gov.gh/ | Live; Useful Documents (DACF, Mastercard Foundation projects); GHANEPS buyer: tender GHANEPS-3517894 (6-unit classroom block, DACF-funded, closed 7 Oct 2026), GR/Tema/Wks/26/0033 school furniture IFT; 50 procurement notices Nov 2025–Nov 2026 | **Verified ✅ (search evidence)** |
| 32 | Tamale Metropolitan Assembly | https://tamalemetro.gov.gh/ | Live official site (departments incl. Urban Roads, Works) | **Verified ✅ (search evidence)** |
| 33 | Ashaiman Municipal Assembly | https://www.ashma.gov.gh/ | Live; Downloads (2025 Fee Fixing Resolution, composite budgets); PPA-sourced tenders (notices 30917, 31362 — U-drain construction) | **Verified ✅ (search evidence)** |
| 34 | Ga East Municipal Assembly | https://gema.gov.gh/ | Live official assembly site (Abokobi) | **Verified ✅ (search evidence)** |
| 35 | Ga Central Municipal Assembly | https://www.gcma.gov.gh/ | Live official assembly site (Odorkor, Accra) | **Verified ✅ (search evidence)** |
| 36 | Ho Municipal Assembly | https://www.hma.gov.gh/ | Live official site; GHANEPS organisation profile HMA (id 26616) | **Verified ✅ (search evidence)** |
| 37 | Sunyani Municipal Assembly | https://www.sma.gov.gh/ | Live; Documents page: 2025 Annual Progress Report (Feb 2026 upload), 2026 Annual Action Plan | **Verified ✅ (search evidence)** |
| 38 | Obuasi Municipal Assembly | https://oma.gov.gh/ | Live; Budget/Fee Fixing Resolution + Composite Annual Action Plan pages; 2026 news | **Verified ✅ (search evidence)** |
| 39 | Tarkwa Nsuaem Municipal Assembly | https://tnma.gov.gh/documents/ | Live Documents page including **2026 PROCUREMENT PLAN** and 2026 Approved Composite Budget | **Verified ✅ (search evidence)** |
| 40 | Sagnarigu Municipal Assembly | https://sagma.gov.gh/ | Live news site (projects/infrastructure postings); GHANEPS organisation SagMA (id 26596) | **Verified ✅ (search evidence)** |
| 41 | Wa Municipal Assembly | https://wamunicipal.gov.gh/ | Live; news current to Jul 2026; revenue-collector training, assembly meetings | **Verified ✅ (search evidence)** |
| 42 | Bolgatanga Municipal Assembly | https://bolma.gov.gh/ | Live; LATEST DOCUMENTS (2024 Composite Budget, 2022/2023 PBB, property valuation roll, action plans 2020–2023) | **Verified ✅ (search evidence)** |
| 43 | New Juaben South Municipal Assembly | https://www.njsma.gov.gh/ | Live official site (Koforidua) | **Verified ✅ (search evidence)** |
| 44 | Adentan Municipal Assembly | https://adma.gov.gh/ | Live official site; MoFEP composite budget 2025–2028 published | **Verified ✅ (search evidence)** |
| 45 | La Nkwantanang-Madina Municipal Assembly | https://lanmma.gov.gh/ | Live official site (departments incl. Works, Physical Planning) | **Verified ✅ (search evidence)** |
| 46 | Dormaa Central Municipal Assembly | https://dcma.gov.gh/ | Live official site (Bono Region) | **Verified ✅ (search evidence)** |
| 47 | Techiman Municipal Assembly | https://tecma.gov.gh/ | Live official assembly site | **Verified ✅ (search evidence)** |

## 4) Grants / donor / funding channels (4 VERIFIED ✅ 17 Nov 2026)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 48 | UNDP Ghana procurement | https://www.undp.org/ghana/procurement | Live current notices table: RFP UNDP-GHA-00569,1 "Management of Installation-Linked Subsidy for Eligible R-290 Air Conditioner — UNDP Ghana" (posted 02-Nov-26, deadline 18-Nov-26) linking to procurement-notices.undp.org | **Verified ✅ (search evidence)** |
| 49 | World Bank procurement (Ghana) | https://projects.worldbank.org/en/projects-operations/procurement | Live filter: Ghana = 4 485 procurement notices; procurement-notice dataset on financesone.worldbank.org | **Verified ✅ (search evidence)** |
| 50 | EU Delegation to Ghana | https://www.eeas.europa.eu/delegations/ghana/security-services-delegation-european-union-ghana_en | Live calls for tenders (security services competitive negotiation; cleaning services; maintenance services; tender value EUR 2 710 000, closing 20 Jan 2026) | **Verified ✅ (search evidence)** |
| 51 | African Development Bank (Ghana operations) | https://www.afdb.org/en/documents/category/specific-procurement-notices | Live Specific Procurement Notices incl. "Ghana — Supply, Delivery and Installation of Equipment for technical skills training centres"; corporate procurement for AfDB Ghana Country Office, Accra | **Verified ✅ (search evidence)** |

## 5) Excluded leads (not counted — evidence insufficient or no tender content)
| Source | Reason |
|---|---|
| KNUST (knust.edu.gh) | Site live but no tender/procurement menu on homepage — lead only |
| Ministry of Education (moe.gov.gh) | "Coming Soon" placeholder — not a usable source |
| Ghana Health Service (ghanahealthservice.org) | Title-only response — lead only |
| GRA (gra.gov.gh) | Live but tax-services site without procurement notices — lead only |
| COCOBOD (cocobod.gh) | Live but "work in progress" under construction, no tender section — lead only |
| MoFA (mofa.gov.gh) | Empty response — lead only |
| Ejisu Municipal Assembly | No live assembly website (FB page + MoFEP PDFs only) — lead only |
| Greater Accra RCC (gtarcc.gov.gh) | No reachable site content — lead only |
| Northern/Volta/Ashanti RCCs | Fetch timeouts — leads pending retry |
| GIFMIS (legacy claim) | Folded into MoF (row 4); not a standalone portal |

## 6) Notes for connector planning
- **GHANEPS is the single national window**: nearly every verified entity above publishes tenders through GHANEPS with APP reference numbers (`GR/<buyer>/<type>/<n>/<year>`), tender-unique IDs and downloadable documents. A GHANEPS connector (plus the PPA contracts/tenders portals) covers most national + SOE + university flow; MMDA flows also surface there (e.g. GR/Tema/Wks/26/0033).
- **Direct-portal exceptions** with their own tender pages: VRA (`vra.com/media/tenders.php`), Ghana Highway Authority (`highways.gov.gh/tenders`), MRH e-Bids (`bids.mrh.gov.gh`), UCC announcements, UG Logistics Directorate, KsTU node/368, STMA CoST portal, MoF Adverts, MoH Tenders.
- **MMDA document patterns** to mine: composite budgets, fee-fixing resolutions, procurement plans (Tarkwa 2026 Procurement Plan), annual action plans — published on assembly sites (tnma, bolma, ashma, sma, tnma, oma, adentan).
- **Region cascade status:** 21 MMDAs/regions verified of 261 MMDAs (16 regions) — far more assemblies available under the same *.gov.gh pattern for later expansion.
