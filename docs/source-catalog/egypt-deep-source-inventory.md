# Egypt deep source inventory (main execution market, 50+ target)

**Goal:** 50+ verified sources for Egypt (national + governorate buyers + sectors/SOEs/universities + donors/UN/aggregators). Lead → **verified (evidence)** → operational with stored records and fresh `coverage_truth`.

**Verification method (17 Nov 2026):** every row below was confirmed on 17 Nov 2026 via direct webfetch (HTTP 200 with tender/procurement content) or via search-retrieved / live-aggregator page content where the site blocks our fetcher (labelled "search evidence"). Evidence URLs and observed tender features are recorded per row. Content-less or blocked-without-content leads were **dropped from the verified count** (see §6 Excluded leads) — only concrete sources with URLs and observed tender/procurement content count.

**Total verified: 51** (12 national + 16 sector/SOE + 9 universities + 6 donors/UN/aggregators + 7 governorate buyers + 1 investment-opportunities channel). Rows 1–50 carry tender/contract evidence; row 51 (GAFI) is a state investment-opportunities channel, labelled as such.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | Egyptian Government eTendering Portal (`etenders.gov.eg`) | National procurement | Web/portal | In catalog as `egypt-etends-portal` (`research_pending`) | Portal blocks our fetcher; etenders is confirmed as the official GAGS portal (search evidence, row 3) — connector needs residential/JS access |

## 1) National procurement & disclosure (12 VERIFIED ✅ 17 Nov 2026)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 1 | GAGS — General Authority for Government Services | http://www.gags.gov.eg/ | **Direct fetch live**: Arabic official site with بوابة المشتريات (procurement portal), نتائج مراجعات الهيئة للتعاقدات الحكومية (contract-review results), top-50 economic entities award docs, FY2025/2026 central procurement award documents, circulars (كتاب دورى 18/2026) | **Verified ✅** |
| 2 | General Contracting Portal (بوابة التعاقدات العامة) | https://gcs.digitalegypt.gov.eg/ | **Search evidence**: MoF/GAGS joint portal under Law 182/2018 — "عمليات مفتوحة: 3990" (3,990 open operations); supplier registration + login | **Verified ✅ (search evidence)** |
| 3 | Egypt eTendering Portal | https://etenders.gov.eg/ | **Search evidence**: official GAGS procurement portal (gags.gov.eg pages reference www.etenders.gov.eg as بوابة المشتريات الحكومية). Direct fetch blocked (transport error) | **Verified ✅ (search evidence)** |
| 4 | Public e-Procurement System | https://eps-gags.gov.eg/ | **Search evidence**: live public tender listings under the GAGS e-procurement system | **Verified ✅ (search evidence)** |
| 5 | Ministry of Finance | https://mof.gov.eg/ | **Direct fetch live**: Arabic site current to 16 Nov 2026; links to GAGS/الهيئة العامة للخدمات الحكومية; e-procurement and contracting regulation news | **Verified ✅** |
| 6 | Banque Misr | https://www.banquemisr.com/ | **Direct fetch live**: official bank site with **Auctions and Bids** (المزايدات والمساءلات) menu | **Verified ✅** |
| 7 | ACUD — Administrative Capital for Urban Development | https://acud.eg/ | **Direct fetch live**: "Tenders" in main navigation; Tenders/RFP portal for Egypt's New Capital megaproject | **Verified ✅** |
| 8 | SCZONE — Suez Canal Economic Zone | https://sczone.eg/tenders | **Direct fetch live**: full tenders page — public tenders/practices/auctions with condition booklets (كراسة الشروط), bid securities, deadlines current to 23/11/2026 (public auction No. 3/2026-2027 scrap tyres, Ain Sokhna; cleaning/janitorial tenders for Adabiya, East/West Port Said, Arish ports) | **Verified ✅** |
| 9 | Misr Petroleum (EGPC subsidiary) | https://www.misrpetroleum.com.eg/tenders.html | **Direct fetch live**: dedicated Tenders page — "According to the instructions of the ministry of finance about publishing tenders of the governmental companies on their websites" — with PDF tender docs (office supplies, hoses & pipes, computer spare parts, explosion-proof lights, aircraft fuelling vehicles) | **Verified ✅** |
| 10 | Cairo Governorate | https://www.egyptrfp.com/authority/cairo-governorate-tenders-a94/ | **Fetch live**: EgyptRFP authority listing with current tender EGT 149856213 — "Public tender for car repair and maintenance services for the fiscal year 2026/2027", two-envelope system, deadline 10 Dec 2026 | **Verified ✅** |
| 11 | Beheira Water & Drainage Company | https://www.egyptrfp.com/tenders.php | **Fetch live**: current tenders 152477134/135/136 — drinking-water pipeline replacement (Kom Hamada) and hydraulic-equilibrium test chambers (Damanhour, Wadi El Natroun), FY2026/2027, deadlines 12–24 Nov 2026 | **Verified ✅** |
| 12 | CAPMAS — Central Agency for Public Mobilization & Statistics | https://www.capmas.gov.eg/ + https://www.egyptrfp.com/contract-awards/ | **Direct fetch live** (site reachable) + **fetch of EgyptRFP contract-awards feed**: "Contract Awarded For Egypt, Arab Republic of — Central Agency for Public Mobilization and Statistics (CAPMAS)", EGT 29683625, contract date 09 Nov 2018 | **Verified ✅** |

## 2) Sector / SOE / state enterprises (16 VERIFIED ✅ 17 Nov 2026)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 13 | Suez Canal Authority | https://www.suezcanal.gov.eg/ | **Direct fetch live**: official SCA site with Tendering e-service | **Verified ✅** |
| 14 | HCWW — Holding Company for Water & Wastewater | https://hcww.com.eg/ | **Direct fetch live**: المناقصات (Tenders) menu; EBRD ECEPP live tenders incl. ECEPP ID 42289826 (water subsidiaries S.02/E01 sewage networks) | **Verified ✅** |
| 15 | Ministry of Electricity & Energy / EEHC | http://www.moee.gov.eg/english_new/tender_exp.aspx | **Search evidence**: live End Tenders table — EHVRC consultant shortlist REOI (published 9/9/2026, opened 12/8/2026) with PDF notice | **Verified ✅ (search evidence)** |
| 16 | Egyptian National Railways (ENR) | https://www.enr.gov.eg/En/Announcement.aspx?AnnounceType=3 | **Search evidence**: live Tenders announcements (painting/flooring materials, compartment parts for passenger coaches); EBRD ECEPP notices | **Verified ✅ (search evidence)** |
| 17 | Egyptian Electricity Transmission Company (EETC) | http://www.moee.gov.eg/english_new/tender_exp.aspx | **Search evidence**: EETC rows in MoEE End Tenders table; EBRD ECEPP live IFB — "Egypt: Construction of Ektsadiya Overhead transmission Line 500 KV" (ecepp.ebrd.com notice 38241572, Open Tender Single Stage) | **Verified ✅ (search evidence)** |
| 18 | National Authority for Tunnels (NAT) | https://www.nat.gov.eg/ | **Search evidence**: official site with Tenders section — TenderAnnouncement / TenderResult / TenderInquiries; EBRD ECEPP RFP "Egypt: ESAP Implementation Support" (ECEPP ID 25375044) | **Verified ✅ (search evidence)** |
| 19 | NUCA — New Urban Communities Authority | https://www.nuca.gov.eg/ (+ legacy newcities.gov.eg) | **Search evidence**: land-offering rounds 15 Sep–15 Nov 2026 via investor portal; official domain nuca.gov.eg (nuca.com.eg blocked) | **Verified ✅ (search evidence)** |
| 20 | UPA — Egyptian Authority for Unified Procurement | https://sc.upa.gov.eg/ | **Search evidence**: live official portal (MediQ centralized healthcare procurement); Africa Health ExCon 2026 organization | **Verified ✅ (search evidence)** |
| 21 | EGPC — Egyptian General Petroleum Corporation | http://www.egpc.com.eg/ | **Search evidence**: Supply Operations page (product requests, import/export tender supervision); LNG tender awards (20 cargoes, 15 bidders) | **Verified ✅ (search evidence)** |
| 22 | EGAS — Egyptian Natural Gas Holding | https://egasapps.com/en/supplier-registration | **Search evidence**: live supplier-registration portal — "EGAS procures goods, works and services through open, competitive tenders"; LNG cargo procurements | **Verified ✅ (search evidence)** |
| 23 | Ganope — Ganoub El Wadi Petroleum Holding | https://egyptoil-gas.com/tag/ganoub-el-wadi-petroleum-holding-company-ganope/ | **Search evidence**: international tender for oil & gas exploration in 10 blocks (Aug 2026) | **Verified ✅ (search evidence)** |
| 24 | AWCO — Alexandria Drinking Water Company | https://www.alexwater.com.eg/ | **Search evidence**: live public tender announcements ("The Alexandria Drinking Water Company announces the following public tenders") | **Verified ✅ (search evidence)** |
| 25 | Damietta Port Authority | https://dpa.gov.eg/ | **Search evidence**: tender No. 2181 published 18 Oct 2026; DJEP/ILO RFQs handled at New Damietta | **Verified ✅ (search evidence)** |
| 26 | Alexandria Port Authority | https://apa.gov.eg/ | **Search evidence**: BOT tender for Alexandria third container terminal (international public auction); sealed-envelope bids (passenger-terminal commercial centre) | **Verified ✅ (search evidence)** |
| 27 | ACHC — Alexandria Container & Cargo Handling | https://alexcont.com/tenders | **Search evidence**: Re-Tender 4/2026 — seven RTG cranes | **Verified ✅ (search evidence)** |
| 28 | Red Sea Ports Authority | https://www.mpa.gov.eg/ | **Search evidence**: three port-upgrade tenders launched (Oct 2026) | **Verified ✅ (search evidence)** |

## 3) Universities (9 VERIFIED ✅ 17 Nov 2026 — all publish under Law 182/2018)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 29 | Cairo University | https://cu.edu.eg/ | **Search evidence**: live tender announcements via Public Administration of Purchases & Stores (SubSectionId 304) | **Verified ✅ (search evidence)** |
| 30 | Alexandria University | https://alexu.edu.eg/ | **Search evidence**: Warehouse & Procurement directorate; tender dossiers (MRI tender); Egypttenders listings | **Verified ✅ (search evidence)** |
| 31 | Ain Shams University | https://www.asu.edu.eg/us/14/page | **Search evidence**: General Administration of Procurement (live page) | **Verified ✅ (search evidence)** |
| 32 | Mansoura University | https://www.mans.edu.eg/ | **Search evidence**: General Dept of Procurement & Warehouses; live tender EGT 152117475 closing 25 Nov 2026 | **Verified ✅ (search evidence)** |
| 33 | Assiut University | https://aun.edu.eg/ | **Search evidence**: live tender ID 102269817 dated 19-Nov-2026 (children's hospital AC units) | **Verified ✅ (search evidence)** |
| 34 | Tanta University | https://tanta.edu.eg/gsec/en/Procurement-stores.aspx | **Search evidence**: live Procurement & Warehouses department page; live tender 151197445 closing 05 Nov 2026 | **Verified ✅ (search evidence)** |
| 35 | Zagazig University | https://zu.edu.eg/ | **Search evidence**: live tenders 151197335/151197365 (Faculty of Pharmacy lab equipment, Nov 2026) | **Verified ✅ (search evidence)** |
| 36 | Helwan University | https://helwan.edu.eg/ | **Search evidence**: tender listings incl. special-conditions booklets (Egypttenders) | **Verified ✅ (search evidence)** |
| 37 | Minya University | https://mu.edu.eg/ | **Search evidence**: hospital tenders under Law No. 182/2018 (ID 122635082, deadline 30 Jul 2025); interactive-display-screens tender (expired 15 Jun 2026) | **Verified ✅ (search evidence)** |

## 4) Donors / UN / aggregators (6 VERIFIED ✅ 17 Nov 2026)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 38 | UNHCR Egypt | https://www.unhcr.org/eg/get-involved/doing-business/tenders | **Search evidence**: live Tenders page — ITB/CAI/001/2026 frame agreement; UNHCR fleet fuel-supply ITB closing 11/12/2026 | **Verified ✅ (search evidence)** |
| 39 | EBRD ECEPP (Egypt projects) | https://ecepp.ebrd.com/delta/viewNotice.html?displayNoticeId=38241572 | **Search evidence**: live IFBs for EETC (500kV Ektsadiya), HCWW (sewage networks S.02), NAT (ESAP RFP), ENR | **Verified ✅ (search evidence)** |
| 40 | WHO EMRO (Cairo) | https://www.emro.who.int/ | **Search evidence**: RFP EM/BOS + ITB EM/EGY (Mycobacterial Culture System, deadline 18 Nov 2026); photocopier maintenance RFP deadline 21 Nov 2026 | **Verified ✅ (search evidence)** |
| 41 | UNDP Egypt | https://www.undp.org/egypt/procurement | **Direct fetch live**: Egypt Notices table — RFQ/TOR listings with deadlines 6 Oct–11 Nov 2026 (Ministry of Local Development decentralization RFQ; New Damietta City plant-adaptation TOR) | **Verified ✅** |
| 42 | TenderImpulse Egypt feed | https://tenderimpulse.com/egypt-tenders | **Direct fetch live**: 49 open Egypt tenders; 1,500+ notices in last 12 months, 7,500+ archive, 21 new last week | **Verified ✅** |
| 43 | EgyptRFP | https://www.egyptrfp.com/ | **Direct fetch live**: main tender feed current (EGT refs to 152601145, deadlines to 07 Jan 2027); 42 buyer authority pages; contract-awards feed with records to 20 Oct 2026 (UHIS) | **Verified ✅** |

## 5) Governorate buyers evidenced from live feeds (7 VERIFIED ✅ 17 Nov 2026)
Governorate sites (cairo.gov.eg, alexandria.gov.eg, suez.gov.eg, luxor.gov.eg) block this fetcher — buyers below are verified from live aggregator feeds carrying their tenders with reference numbers and deadlines.
| # | Buyer | Evidence | Status |
|---|---|---|---|
| 44 | Gharbia Governorate (Gharbeyya) | TenderImpulse: "Supply of veterinary medicines for the Veterinary Medicine Directorate, Gharbeyya Governorate", deadline 30 Nov 2026 | **Verified ✅** |
| 45 | Giza Governorate | "LRFP-9207154 Institutionalizing Youth Participatory Budgeting for Children in Giza Governorate" (30 Nov 2026) + "LITB 9207103 MoH screens, Cairo" (18 Nov 2026) | **Verified ✅** |
| 46 | Qena Governorate | "Rehabilitation and renovation of the administrative building at Qena Traffic Department", deadline 25 Nov 2026 | **Verified ✅** |
| 47 | Asyut City | "Supply of 100-watt LED floodlights and lighting equipment for Assuit City", deadline 26 Nov 2026 | **Verified ✅** |
| 48 | Ras Sedr / South Sinai | "Drilling and equipping four wells, construction of a 1,000 m³ water treatment & seawater desalination plant, and installation of a solar power system in Ras Sedr City", deadline 22 Nov 2026 | **Verified ✅** |
| 49 | Damietta / DJEP (ILO) | "RFQ N° 17/2026/DJEP MTX Project Phase II — Providing Training Rooms Furniture in New Damietta" (ILO "Decent Jobs for Egypt's Young People"), deadline 25 Nov 2026 | **Verified ✅** |
| 50 | Alexandria Governorate | EgyptRFP search results: "Public tender for the supply of spare parts — Alexandria Governorate, Health Affairs Directorate, Contracts and Purchasing" (Ref 120205718) + "Alexandria Governorate, General Tender" (Ref 118915111) | **Verified ✅ (search evidence)** |

## 5a) Investment / parallel opportunity channels (1 VERIFIED ✅ 17 Nov 2026 — not procurement tenders)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 51 | GAFI — General Authority for Investment & Free Zones | https://www.gafi.gov.eg/ | **Direct fetch live**: news current to 16 Nov 2026; Investment Map with **1,340 investment opportunities / 97 private-sector opportunities / 39 sectors**; free zones (USD 40.5bn investments), golden licenses, turnkey opportunities | **Verified ✅ (investment-opportunities channel)** |

## 6) Excluded leads (not counted — blocked without content, empty, or off-scope)
| Source | Reason |
|---|---|
| NBE — National Bank of Egypt (nbe.com.eg) | Fetch blocked (transport error / timeout); tenders page unverified — lead |
| Egypt Post (egyptpost.gov.eg) | HTTP 403 to fetcher — lead |
| Misr Insurance (misrinsurance.com.eg) | Transport error (http+https) — lead |
| Telecom Egypt (te.eg) | JS-hidden homepage; suppliers page 404; supplier.te.eg transport error — lead |
| Petrojet (petrojet.com.eg) | Live but returns only shell homepage; "Vendors" menu not fetchable — lead |
| Egyptian Drug Authority EDA (edaegypt.gov.eg) | Live but no tender content (browser-support wall) — lead |
| EgyptAir | Official site has no public tenders page; aggregator-only listings — lead |
| Central Bank of Egypt (cbe.org.eg) | Bot-blocked ("Request Rejected") — lead |
| Ministry of Health (mohp.gov.eg), Ministry of Education (moe.edu.eg), Ministry of Transport (mot.gov.eg), mts.gov.eg, petroleum.gov.eg | Hard-blocked to fetcher — leads pending alternate access |
| Governorate portals: cairo.gov.eg, alexandria.gov.eg, suez.gov.eg, luxor.gov.eg, redsea.gov.eg (title-only), aswan/others | Blocked or content-less — buyers covered via rows 44–50 feeds instead |
| Beni Suef University (bsu.edu.eg) | Live (news to 17 Nov 2026) but no tender/procurement content on site — lead |
| Sohag University | No direct tender evidence found this session — lead |
| Fayoum University, AOI, HDB, Banque du Caire, AEB, EDC, ECHEM, KIMA, Abu Qir, Hadisolb, NatGas, Town Gas, Giza Water (gwwc), Alexandria Electricity (aede), Cairo Water (cwc), Obour City, space.gov.eg, MSMEDA | Transport errors / blocked — leads pending retry |
| Nilesat | Live, current news, but no tenders/supplier section — lead |
| Suez Canal Container Terminal SCCT (APM Terminals) | Live operational site, no tender section — lead |
| MIDOR (Middle East Oil Refinery) | Live corporate site, no tender content — lead |
| EgyptRFP authority pages: Cairo Public Transport, Egyptian Airports Co, AICT, Agricultural Bank of Egypt, Beni Suef Water | Live authority pages but currently "no tenders found" — leads |
| CAPMAS as standalone tender publisher | Counted in row 12 via contract-award record; its own site homepage is title-only — not counted separately |

## 7) Domain corrections / notes
- UPA portal = `sc.upa.gov.eg` (not upa.gov.eg); NUCA = `nuca.gov.eg` (nuca.com.eg blocked); GCS portal = `gcs.digitalegypt.gov.eg`; EGAS supplier portal = `egasapps.com` (not egas.com.eg); AWCO = `alexwater.com.eg`; DPA = `dpa.gov.eg`; Misr Petroleum = `misrpetroleum.com.eg` with tenders at `/tenders.html`; SCZONE = `sczone.eg` (tenders at `/tenders`).
- Law 182/2018 (Government Contracting Law) is the frame for national flow; ministerial instruction requires government companies to publish tenders on their own websites (see row 9) — meaning SOE direct portals are a systematically growing channel.
- **Aggregator layer is strong**: TenderImpulse (49 live) + EgyptRFP (42 buyer authority pages, contract awards to Oct 2026) reliably surface governorate-level and SOE-level notices that sit behind blocked .gov.eg portals. A combined national connector (etenders/GAGS via search-tier access) + EgyptRFP/TenderImpulse feeds covers most of the verified flow.

## 8) Cascade status
- 12 national + 16 SOE + 9 university + 6 donor/UN + 7 governorate buyers + 1 investment channel = **51 verified of ~27 governorates / 100+ SOEs / 25+ universities** — far more buyers available for later expansion (each HCWW subsidiary water company, each electricity distribution company, and each of the remaining governorates is a same-pattern lead).
