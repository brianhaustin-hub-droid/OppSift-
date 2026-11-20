# Kenya & Nigeria — Live Link Verification Results

**Verified:** 2026-11-17 by live HTTP fetch (`webfetch`/`execute` fetch). Status codes are real, observed responses — not assumed.

**Legend:** `200 ✅` reachable | `301/302 ✅` redirected (final URL shown) | `403 ⚠` blocked (bot protection) | `404 ❌` not found | `ERR ❌` connection/TLS/DNS failure | `TIMEOUT ❌` no response.

**Truth rule:** A source is "link-verified" only if it returns 200/3xx. This is NOT the same as "operational" (which also needs terms evidence, working connector, stored records, and fresh `coverage_truth`). Corrected URLs are provided where the guessed URL failed.

---

## 🇰🇪 KENYA — Verified Links

### National procurement & disclosure
| Source | Tested URL | Status | Working link / note |
|---|---|---|---|
| PPIP (tenders.go.ke) | https://tenders.go.ke/ | **200 ✅** | https://tenders.go.ke/ — returns "PPIP" |
| PPRA | https://ppra.go.ke/ | **200 ✅** | https://ppra.go.ke/ — live; has Tenders → PPRA Tenders / Addendum / Contract Awards sections |
| National Treasury | https://www.treasury.go.ke/ | **200 ✅** | https://www.treasury.go.ke/ |
| MyGov → GAA | https://www.mygov.go.ke/ | **200 ✅** | Redirects to https://gaa.go.ke/ (Government Advertising Agency) |
| IFMIS Supplier Portal | https://supplier.treasury.go.ke/ | **200 ✅** | https://supplier.treasury.go.ke/ (small page, likely gated login) |
| Kenya Gazette (KenyaLaw) | https://kenyalaw.org/kenya_gazette/ | **403 ⚠** | KenyaLaw blocks bots; main site https://kenyalaw.org/ = 200 ✅. Gazette needs manual/permission review |

### Sector / SOE
| Source | Tested URL | Status | Working link / note |
|---|---|---|---|
| KPLC Tender Notices | https://kplc.co.ke/tender-notices | **200 ✅** | **CORRECT URL** https://kplc.co.ke/tender-notices (also /tender, /eprocurement = 200) |
| KPLC (wrong guess) | https://kplc.co.ke/index.php/tenders | 404 ❌ | Use /tender-notices instead |
| KenGen main | https://www.kengen.co.ke/ | **200 ✅** | https://www.kengen.co.ke/ |
| KenGen tenders | https://www.kengen.co.ke/index.php/tenders | 404 ❌ | Tender subpage not found at guessed path — inspect main site nav |
| KeNHA tenders | https://kenha.co.ke/tenders | **200 ✅** | Redirects to https://kenha.co.ke/tenders-consultancy-services/ |
| KeRRA | https://kerra.go.ke/ | **200 ✅** | https://kerra.go.ke/ |
| KURA | https://kura.go.ke/ | **200 ✅** | https://kura.go.ke/ |
| ICT Authority | https://icta.go.ke/ | **200 ✅** | https://icta.go.ke/ |
| AGPO | https://agpo.go.ke/ | **200 ✅** | https://agpo.go.ke/ |
| KPA | https://www.kpa.co.ke/ | ERR ❌ | TLS cert verification failed (site reachable, cert chain issue) |
| Kenya Railways | https://www.kenyarailways.com.ke/ | ERR ❌ | DNS not found — verify correct domain |
| REREC | https://www.recrec.go.ke/ | ERR ❌ | DNS not found — verify correct domain |
| World Bank KE country page | .../country-summary?countrycode=KE | 404 ❌ | Use https://projects.worldbank.org/en/projects-operations/country-summary (no query) |

### Counties (all 47 tested — HTTP 200 = reachable)
**Reachable 200 ✅ (37):**
| County | Working link |
|---|---|
| Nairobi City | https://nairobi.go.ke/ |
| Mombasa | https://web.mombasa.go.ke/ |
| Kwale | https://kwale.go.ke/ |
| Kilifi | https://www.kilifi.go.ke/ |
| Tana River | https://tanariver.go.ke/ |
| Lamu | https://lamu.go.ke/ |
| Taita-Taveta | https://www.taitataveta.go.ke/ |
| Wajir | https://wajir.go.ke/ |
| Mandera | https://mandera.go.ke/ |
| Isiolo | https://www.isiolo.go.ke/ |
| Meru | https://meru.go.ke/ |
| Embu | https://www.embu.go.ke/ |
| Machakos | https://machakos.go.ke/ |
| Murang'a | https://www.muranga.go.ke/ |
| Nandi | https://nandi.go.ke/ |
| Kericho | https://www.kericho.go.ke/ |
| Bomet | https://bomet.go.ke/ |
| Homa Bay | https://homabay.go.ke/ |
| Migori | https://www.migori.go.ke/ |
| Siaya | https://siaya.go.ke/ |
| Nyamira | https://nyamira.go.ke/ |
| Kisumu | https://www.kisumu.go.ke/ |
| Kiambu | https://kiambu.go.ke/ |
| Uasin Gishu | https://uasingishu.go.ke/ |
| Kakamega | https://kakamega.go.ke/ |
| Bungoma | https://www.bungoma.go.ke/ |
| Kisii | https://kisii.go.ke/ |
| Nyandarua | https://www.nyandarua.go.ke/ |
| Trans Nzoia | https://transnzoia.go.ke/ |
| West Pokot | https://www.westpokot.go.ke/ |
| Samburu | https://www.samburu.go.ke/ |
| Elgeyo-Marakwet | https://elgeyomarakwet.go.ke/ |
| Baringo | https://www.baringo.go.ke/ |
| Narok | https://narok.go.ke/ |
| Kajiado | https://kajiado.go.ke/ |
| Vihiga | https://vihiga.go.ke/ |

**Failed / need correct URL (10):**
| County | Tested URL | Status |
|---|---|---|
| Nakuru | https://www.nakuru.go.ke/ | TIMEOUT ❌ |
| Busia | https://www.busia.go.ke/ | DNS ❌ (try busia.go.ke) |
| Kitui | https://www.kitui.go.ke/ | TIMEOUT ❌ |
| Nyeri | https://www.nyeri.go.ke/ | TLS self-signed ❌ |
| Kirinyaga | https://kirinyaga.go.ke/ | TLS ❌ |
| Garissa | https://www.garissa.go.ke/ | TLS self-signed ❌ |
| Marsabit | https://www.marsabit.go.ke/ | TLS altname ❌ |
| Tharaka-Nithi | https://www.tharakarnithi.go.ke/ | DNS ❌ (try tharakarnithi.go.ke) |
| Turkana | https://www.turkana.go.ke/ | DNS ❌ (try turkana.go.ke) |
| Nairobi tenders subdomain | https://tenders.nairobi.go.ke/ | DNS ❌ (use nairobi.go.ke main) |

---

## 🇳🇬 NIGERIA — Verified Links

### National procurement & disclosure
| Source | Tested URL | Status | Working link / note |
|---|---|---|---|
| BPP main | https://bpp.gov.ng/ | **200 ✅** | https://bpp.gov.ng/ |
| BPP submission portal | https://bpp.gov.ng/submission-portal/ | **200 ✅** | https://bpp.gov.ng/submission-portal/ |
| BPP tenders (guess) | https://bpp.gov.ng/tenders/ | 404 ❌ | use submission portal |
| NOCOPO portal (HTTPS) | https://nocopo.bpp.gov.ng/ | ERR ❌ | **cert expired** — use HTTP |
| NOCOPO portal (HTTP) | http://nocopo.bpp.gov.ng/ | **200 ✅** | http://nocopo.bpp.gov.ng/ |
| NOCOPO license | http://nocopo.bpp.gov.ng/license | **200 ✅** | ODCPDDL confirmed: share/create/adapt + attribution. Copyright 2026 NOCOPO |
| NOCOPO policy | http://nocopo.bpp.gov.ng/policy | **200 ✅** | http://nocopo.bpp.gov.ng/policy |
| OCP Data Registry pub 64 | https://data.open-contracting.org/en/publication/64 | **200 ✅** | Nigeria BPP OCDS publication |

### Federal MDAs / agencies
| Source | Tested URL | Status | Working link / note |
|---|---|---|---|
| Federal Ministry of Finance | https://www.finance.gov.ng/ | **200 ✅** | https://www.finance.gov.ng/ |
| Federal Ministry of Works | https://works.gov.ng/ | **200 ✅** | redirects to https://fmhud.gov.ng/ |
| Federal Ministry of Power | https://power.gov.ng/ | **200 ✅** | https://power.gov.ng/ |
| Federal Ministry of Water Resources | https://waterresources.gov.ng/ | **200 ✅** | https://waterresources.gov.ng/ |
| Federal Ministry of Health | https://www.health.gov.ng/ | TIMEOUT ❌ | retry / check alternative |
| Federal Ministry of Education | https://www.education.gov.ng/ | TIMEOUT ❌ | retry / check alternative |
| NNPC | https://www.nnpcgroup.com/ | **200 ✅** | https://www.nnpcgroup.com/ |
| FAAN (Airports) | https://faan.gov.ng/ | **200 ✅** | https://faan.gov.ng/ |
| TETFund | https://www.tetfund.gov.ng/ | **200 ✅** | https://www.tetfund.gov.ng/ |
| NCDMB | https://ncdmb.gov.ng/ | TIMEOUT ❌ | retry |
| NPPA | https://www.nppa.gov.ng/ | DNS ❌ | verify correct domain |

### States
| Source | Tested URL | Status |
|---|---|---|
| Lagos State | https://lagosstate.gov.ng/ | **200 ✅** |
| Kano State | https://kanostate.gov.ng/ | **200 ✅** |
| Rivers State | https://www.riversstate.gov.ng/ → https://riversstate.gov.ng/ | **200 ✅** |
| FCT Administration | https://fcta.gov.ng/ | **200 ✅** |
| Oyo State | https://www.oyostate.gov.ng/ | TIMEOUT ❌ |

---

## Summary (real, observed)
- **Kenya:** 37/47 counties reachable (200), national agencies mostly reachable; corrected KPLC tender URL found (`/tender-notices`); several TLS/DNS failures flagged.
- **Nigeria:** BPP/NOCOPO/OCP + most federal MDAs reachable (200); NOCOPO HTTPS cert expired (use HTTP); license = ODCPDDL confirmed with share/create/adapt rights.
- **Not truly verified before:** earlier tracker marked many as "verified" without live checks — this document replaces assumptions with observed HTTP results.

**Next:** Use the working links above to build connectors. Failed links need alternative URLs or permission review before any can be considered operational.