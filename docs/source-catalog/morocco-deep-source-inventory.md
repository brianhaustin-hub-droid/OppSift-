# Morocco deep source inventory (main execution market, 50+ target)

**Goal:** 50+ verified sources for Morocco (national portal + regions/communes + central agencies + sectors/SOEs/universities/hospitals + donors). Lead → **verified (evidence)** → operational with stored records and fresh `coverage_truth`.

**Verification method (17 Nov 2026):** every row below carries a concrete live-publication reference observed on 17 Nov 2026. Most rows are direct fetches of the **Portail Marocain des Marchés Publics (PMMP) "Liste des avis d'achat"** (https://www.marchespublics.gov.ma/bdc/entreprise/consultation/) — the portal reports **1,702 current notices across 171 pages**; the first 12 pages (112 non-cancelled notices) yielded 60 distinct named buyers with reference numbers, objects and closing dates. Rows marked "search evidence" were retrieved via search or via the TenderImpulse Morocco feed where the buyer's own .ma site blocks our fetcher. Cancelled notices (Annulé) were excluded from the verified count.

**Total verified: 61** (1 national portal + 20 central agencies + 20 local authorities + 14 universities/hospitals/research + 6 SOEs/donor channels). Note: most .ma domains (oncf.ma, onee.ma, adm.ma, maroctelecom.ma, ocpgroup.com, marsamaroc.com) hard-block this fetcher — PMMP and live aggregator evidence are the reliable verification path.

## 0) Existing repo leads
| # | Source lead | Scope | Type | Catalog status | Gap to trusted live |
|---|---|---|---|---|---|
| 1 | Moroccan Public Procurement Portal (PMMP) | National procurement | Web/portal | In catalog as `morocco-marches-publics-portal` (`research_pending`) | Portal confirmed live (row 1); connector needs official access/export terms, publisher metadata, ingest/mapping validation |

## 1) National portal (1 VERIFIED ✅ 17 Nov 2026)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 1 | Portail Marocain des Marchés Publics (PMMP) + Trésorerie Générale du Royaume | https://www.marchespublics.gov.ma/ + https://www.marchespublics.gov.ma/bdc/entreprise/consultation/ | **Direct fetch live**: portal homepage (Consultations en cours, Bons de commande, Enchères, résultats, sociétés exclues) + live *Liste des avis d'achat* with 1,702 results, filterable by reference/buyer/category, paginated to 171 pages; footer: Trésorerie Générale du Royaume — Ministère de l'Économie, des Finances et de la Performance Publique | **Verified ✅** |

## 2) Central agencies & public establishments (20 VERIFIED ✅ 17 Nov 2026 — all from PMMP live notices)
| # | Buyer | Evidence (PMMP ref — objet — deadline) | Status |
|---|---|---|---|
| 2 | Fonds d'Équipement Communal (FEC) | BC064/2026 — "Production de supports personnalisés FEC", Rabat — 24 Nov 2026 | **Verified ✅** |
| 3 | Caisse Nationale de Sécurité Sociale (CNSS) | CONS55/2026 — "Achat des Pochettes pour Pc-portable", Casablanca — 24 Nov 2026 | **Verified ✅** |
| 4 | CNSS — Direction Régionale Meknès-Ismaïlia | 028/95100/2026 — "Habillage publicitaire mural et édition des articles publicitaires", Meknès — 20 Nov 2026 | **Verified ✅** |
| 5 | Agence Nationale pour la Promotion de la PME (ANPME) | 09/BC/ANPME/2026 — maintenance du progiciel Sage FRP 1000, Rabat — 23 Nov 2026 | **Verified ✅** |
| 6 | Agence pour le Développement Agricole (ADA) | 21/2026/ADA — entretien/maintenance des installations, Rabat — 24 Nov 2026 | **Verified ✅** |
| 7 | Agence Urbaine de Fès | 27/26 — "Achat de fourniture pour matériel informatique et technique", Fès — 24 Nov 2026 | **Verified ✅** |
| 8 | Agence Urbaine de Béni Mellal | 34/2026/AUBM — "Achat d'habillement de travail pour des agents", Béni Mellal — 25 Nov 2026 | **Verified ✅** |
| 9 | Agence du Bassin Hydraulique de Sakia El Hamra & Oued Eddahab | 17/BCE/2026/ABHSHOD — inventaire physique des immobilisations, Laayoune/Dakhla — 23 Nov 2026 | **Verified ✅** |
| 10 | Direction Régionale de l'Agence Nationale des Eaux et Forêts — Marrakech-Safi | 103/2026/DRANEF-MS — "Achat de fournitures électriques", Marrakech — 24 Nov 2026 | **Verified ✅** |
| 11 | Direction Régionale de l'Entraide Nationale — Drâa-Tafilalet | 10/DR-ERRACHIDIA/2026 — bois de chauffage pour CEF Midelt etc. — 25 Nov 2026 | **Verified ✅** |
| 12 | Direction Régionale d'Agriculture — Tanger-Tétouan-Al Hoceïma | 17/2026/DRATTH/DSF — "Achat de matériel de literie", Larache — 23 Nov 2026 | **Verified ✅** |
| 13 | Direction Générale de la Sûreté Nationale | 11/DGSN/DEB/DF/SB/2026 — "Achat de matériel médical" (Institut Royal de Police), Kenitra — 23 Nov 2026 | **Verified ✅** |
| 14 | Sûreté Provinciale de Kenitra | 126/2026 — remplacement de 8 extracteurs d'air, Sidi Slimane — 27 Nov 2026 | **Verified ✅** |
| 15 | Direction Régionale des Impôts — Fès-Meknès | 28/2026/DRIFES — étude technique et suivi, Taounate — 25 Nov 2026 | **Verified ✅** |
| 16 | Direction Provinciale des Impôts — Meknès | 21/2026 — "Achat des imprimés fiscaux", Meknès — 23 Nov 2026 | **Verified ✅** |
| 17 | Direction Régionale des Impôts — Agadir-Ida Ou Tanane | 39/2026/DRI/AG — "Achat de Mobilier de Bureau", Sidi Ifni — 23 Nov 2026 | **Verified ✅** |
| 18 | Gouverneur de la Province d'Ouarzazate | 13/BDC/BG/2026 — "Achat de matériel informatique au profit de la province", Ouarzazate — 23 Nov 2026 | **Verified ✅** |
| 19 | Gouverneur de la Préfecture d'Arrondissements My Rchid | 95/SBMC/2026 — "Achat d'articles de vaisselle", Casablanca — 23 Nov 2026 | **Verified ✅** |
| 20 | Chambre de Commerce, d'Industrie et de Services — Béni Mellal-Khénifra | 15/CCISBK/2026 — achat de véhicule Skoda Kodiaq — 23 Nov 2026 | **Verified ✅** |
| 21 | Chambre de l'Artisanat de la Région Souss-Massa | 58BIS/2026 — "Achat de matériel informatique", Agadir — 20 Nov 2026 | **Verified ✅** |

## 3) Regions, provinces, communes & local authorities (20 VERIFIED ✅ 17 Nov 2026 — PMMP live notices)
| # | Buyer / locality | Evidence (PMMP ref — objet — deadline) | Status |
|---|---|---|---|
| 22 | Commune Ait Kamra (Al Hoceima) | 22/2026 — achat d'un camion nacelle pour éclairage public — 24 Nov 2026 | **Verified ✅** |
| 23 | Commune Tameslohte (Al Haouz) | 17/2026 — achat et pose de caméras de surveillance — 24 Nov 2026 | **Verified ✅** |
| 24 | Commune Rurale de Mnasra (Kenitra) | 13/2026 — achat de matériel informatique — 23 Nov 2026 | **Verified ✅** |
| 25 | Commune Oued Naanaa (Settat) | 4/CON/2026 — études techniques d'entretien des pistes — 23 Nov 2026 | **Verified ✅** |
| 26 | Commune Laatamna (Berkane) | 34/2026 — construction d'un abri de stationnement des grands taxis — 23 Nov 2026 | **Verified ✅** |
| 27 | Commune Rurale de Jbilat (Rehamna) | 25/2026 — location d'engins — 23 Nov 2026 | **Verified ✅** |
| 28 | Commune urbaine de Dcheira El Jihadia (Inezgane) | 57/2026 — acquisition de matériel informatique — 23 Nov 2026 | **Verified ✅** |
| 29 | Commune urbaine de Bouznika (Ben Slimane) | 19/2026 — formation continue du personnel communal — 23 Nov 2026 | **Verified ✅** |
| 30 | Commune Timlit (Chichaoua) | 19/2026 — aménagement d'une route — 23 Nov 2026 | **Verified ✅** |
| 31 | Commune rurale de Ouled Said Loued (Béni Mellal) | 12/2026 — poteaux et cablages, réseau d'électricité — 23 Nov 2026 | **Verified ✅** |
| 32 | Commune rurale de Sidi Ali Belqassem (Taourirt) | 25/2026 — aménagement cimetière Taraout — 23 Nov 2026 | **Verified ✅** |
| 33 | Commune Zemrane Charqia (El Kelaa des Sraghna) | 8/2026 — fournitures et pièces de rechange informatiques — 23 Nov 2026 | **Verified ✅** |
| 34 | Commune rurale de Oulad Zbair (Taza) | 36/2026 — achat de matériel technique/droguerie — 23 Nov 2026 | **Verified ✅** |
| 35 | Arrondissement de Mers-Sultan (Casablanca) | BC07-2026 — achat de petit matériel pour BMH — 23 Nov 2026 | **Verified ✅** |
| 36 | Collectivité Territoriale de Zaaroura (Larache) | 41/2026 — mobilier de bureau et salle de réunion — 23 Nov 2026 | **Verified ✅** |
| 37 | Commune de Taliouine Assaka (Guelmim) | 27/2026 — fourniture de matériel technique et informatique — 23 Nov 2026 | **Verified ✅** |
| 38 | Commune urbaine de Immouzer Marmoucha (Boulemane) | 27/2026 — équipement salle de réunion — 23 Nov 2026 | **Verified ✅** |
| 39 | C.T. d'Argana (Taroudannt) | 45/2026 — aménagement logement communal — 23 Nov 2026 | **Verified ✅** |
| 40 | Commune rurale de Ait Hani (Tinghir) | 21/2026 — entretien courant de bâtiments administratifs — 20 Nov 2026 | **Verified ✅** |
| 41 | Commune urbaine de El Aïoun Sidi Mellouk (Taourirt) | 22/2026 — étude technique d'aménagement du réseau d'éclairage — 20 Nov 2026 | **Verified ✅** |

## 4) Universities, research, training & hospitals (14 VERIFIED ✅ 17 Nov 2026 — PMMP live notices)
| # | Buyer | Evidence (PMMP ref — objet — deadline) | Status |
|---|---|---|---|
| 42 | Faculté des Lettres et des Sciences Humaines Ben M'Sik (Casablanca) | 31/FLSHBM/2026 — diagnostic/maintenance réseau informatique et fibre optique (notice active; the separateannulation concerns a bon de commande) — 3 Déc 2026 | **Verified ✅** |
| 43 | Lycée Moulay Ali Cherif — Centre CPGE Errachidia | 03/2026 — achat de fournitures d'enseignement — 30 Nov 2026 | **Verified ✅** |
| 44 | Institut National de la Statistique et d'Économie Appliquée (INSEA) | 46/2026/INSEA — achat de matériel informatique et audiovisuel, Rabat — 23 Nov 2026 | **Verified ✅** |
| 45 | INRA — Centre Régional de la Recherche Agronomique d'Oujda | 35/2026/CRRAO — achat de produits chimiques de séquençage — 24 Nov 2026 | **Verified ✅** |
| 46 | INRA — Centre Régional de la Recherche Agronomique de Rabat | 68/2026/CRRAR — construction/aménagement d'une serre tunnel — 23 Nov 2026 | **Verified ✅** |
| 47 | Institut National de Recherche Halieutique (INRH) | 64/2026/INRH/CRA — maintenance groupe électrogène, Agadir — 23 Nov 2026 | **Verified ✅** |
| 48 | Institut de Technologie des Pêches Maritimes — Safi | 63/2026 — fourniture de gasoil pour le navire-école Al Manar — 23 Nov 2026 | **Verified ✅** |
| 49 | Institut de Technologie des Pêches Maritimes — Larache | 108/ITPM/2026 — remise en état et recharge des extincteurs du navire Al Mounir — 22 Nov 2026 | **Verified ✅** |
| 50 | École Nationale Supérieure d'Électricité et de Mécanique (ENSEM), Casablanca | 123/ENSEM/2026 — réparation/extension conduits d'eau potable et incendie — 23 Nov 2026 | **Verified ✅** |
| 51 | École Nationale d'Intelligence Artificielle et du Digital (Berkane) | AVISN28/2026 — achat de petit outillage — 23 Nov 2026 | **Verified ✅** |
| 52 | École Nationale de Commerce et Gestion — Marrakech | 17/ENCGM/2026 — achat de fournitures de bureau — 20 Nov 2026 | **Verified ✅** |
| 53 | Faculté des Sciences d'Oujda | 111/2026/FSO — achat de fournitures de bureau — 23 Nov 2026 | **Verified ✅** |
| 54 | Faculté des Sciences Juridiques et Politiques — Taza | 12-2026FSJPT — papeterie et imprimés — 20 Nov 2026 | **Verified ✅** |
| 55 | CHU Mohammed VI — Oujda + Centre Hospitalier Provincial de Safi + GSTRSK Rabat (Hôpital des Spécialités, Maternité Souissi) + Conseil Régional des Oulémas de l'Oriental | CHU Oujda 84/2026 (articles hôteliers), CHP Safi 46/2026 (amplificateur de brillance), GSTRSK R1/BCHSR/26/2026 (médicaments) & BCHMS./30/2026 (photocopieurs), CRO 95/26 (restauration) — all 23 Nov 2026, Rabat/Oujda/Safi | **Verified ✅** |

## 5) SOEs, regional programmes & donor channels (6 VERIFIED ✅ 17 Nov 2026)
| # | Source | URL (verified) | Evidence | Status |
|---|---|---|---|---|
| 56 | Maroc Telecom | https://tenderimpulse.com/morocco-tenders | **Fetch live**: multiple open invitations PR639459/PI, PR640316/COU/DRCA, PR638360/COU/DRF/2026, PR635208/COU/SI, PR 636453/SI, PR637208/COU/SI — deadlines 23 Nov–9 Dec 2026 | **Verified ✅ (feed evidence)** |
| 57 | ONCF — Office National des Chemins de Fer | https://tenderimpulse.com/morocco-tenders | **Fetch live**: "Refurbishment work on the internal combustion engines of ONCF track and overhead line vehicles", deadline 25 Nov 2026 | **Verified ✅ (feed evidence)** |
| 58 | Région Béni Mellal-Khénifra + Région Laayoune-Sakia El Hamra + communes de Chefchaouen, Tatoft/Boujediane, Tinghir, Fès | https://tenderimpulse.com/morocco-tenders | **Fetch live**: LRFQ-2026-9206739 "Box Kangourou Maman-Bébé" (25 Nov 2026); regional water & soil conservation master plan Laayoune (2 Dec 2026); Chefchaouen electrical spares (25 Nov); drinking water supply Tatoft/Boujediane (9 Dec); mosque architectural consultation Tinghir (17 Nov); waste-sorting bins Fès (23 Nov) | **Verified ✅ (feed evidence)** |
| 59 | ILO — DIASSOSEC Morocco project | https://tenderimpulse.com/morocco-tenders | **Fetch live**: "Appel à collaboration externe (Excoll) — Évaluation finale indépendante du projet DIASSOSEC : dialogue social et santé/sécurité au travail au Maroc", deadline 20 Nov 2026 | **Verified ✅ (feed evidence)** |
| 60 | UNDP Morocco — ICAT climate finance transparency project | https://tenderimpulse.com/morocco-tenders | **Fetch live**: "Projet ICAT de transparence du financement climatique Maroc — Phase II", deadline 24 Nov 2026; UNDP Morocco country page lists Acquisitions (procurement) section (https://www.undp.org/morocco) | **Verified ✅ (feed evidence)** |
| 61 | TenderImpulse Morocco feed + AfDB (Morocco operations) | https://tenderimpulse.com/morocco-tenders + https://www.afdb.org/en/documents/category/specific-procurement-notices | **Fetch live**: feed reports **159 open Morocco tenders**, 22,000+ notices in 12 months, 120,000+ archive, sectors (Infrastructure 43, Telecom 23, IT 15); AfDB Specific Procurement Notices feed live with Morocco country desk | **Verified ✅** |

## 6) Excluded leads (not counted)
| Source | Reason |
|---|---|
| ONEE (onee.ma), ADM (adm.ma) | Transport errors — official sites block fetcher; no direct tender evidence captured this session |
| OCP Group (ocpgroup.com), Marsa Maroc (marsamaroc.com), Maroc Telecom direct site (maroctelecom.ma) | Transport errors — wait, Maroc Telecom is counted via the live feed (row 56), not direct site |
| ANP — Agence Nationale des Ports, Ministry of Agriculture irrigation directorate | Named by TenderImpulse as frequent Morocco buyers but no concrete tender with ref/URL observed — leads only |
| SAR / MENPIA (menpria.gov.ma) | Old doc claim not re-verified this session — lead only |
| UNDP Morocco "procurement" URL (/morocco/procurement) | 404; Acquisitions section exists on country page but no current notice list — country office covered via row 60 feed evidence |
| World Bank / EU direct Morocco pages | No Morocco-specific tender evidence captured this session — leads pending retry |
| Cancelled notices (e.g. Commune Izemmouren 6/2026, Commune Bni Lent 7/2026, Agence Urbaine Fès 05/INV/2026 topographic studies) | "Annulé" — excluded from verification count |

## 7) Domain / access notes
- PMMP is the authoritative national window (`www.marchespublics.gov.ma`), run by the Trésorerie Générale du Royaume; the buyer-facing notice list is at `/bdc/entreprise/consultation/` and paginates with `?page=N`.
- Most `.ma` buyer sites hard-block this fetcher; PMMP notices + TenderImpulse's 159-live-tender Morocco feed are the two reliable, evidence-rich sources.
- The PMMP buyer field is free text (e.g. "Charge de la Direction Provinciale des Impots…", "GSTRSK – HÔPITAL…"), so a Morocco connector should normalise buyer names into stable IDs while keeping the raw string as provenance.
- **Cascade status:** 61 verified of 12 regions / 1,502+ communes / 100+ public establishments — large expansion headroom using the same PMMP listing pattern.
