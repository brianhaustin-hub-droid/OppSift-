# Source access: what is blocked, broken or silent — and how each gets fixed (27 Nov 2026)

58 of 180 registered sources did not answer a single endpoint in the 27 Nov
live run (215 endpoints requested). None of them are hidden: the app shows each
one as **no source answered**, with the exact failure, and no coverage claim
counts them as verified. This file is the work queue for changing that.

Nothing below is guessed. Each row is the failure Node reported when OppSift
requested the publisher's own URL, classified into what the publisher would
have to change.

## The rule for every fix

1. **Re-point the registry only when the replacement has answered.** A URL is
   changed after a real request to the new host returns a response — never
   because a domain "looks like" the old one.
2. **Never weaken verification to make a source pass.** TLS is not disabled,
   certificates are not ignored, and a refusal is not relabelled as success.
3. **Ask the publisher when the fix is theirs.** An expired certificate, an
   incomplete chain, a WAF rule or a keyed API is their decision. The stored
   failure text is specific enough to send them.

## Already fixed — wrong host on our side (migration 0055)

| Source | Registered URL that failed | Why | Now registered |
| --- | --- | --- | --- |
| PPRA Kenya — Procurement Notices | `https://www.ppra.go.ke/` | certificate expired on `www`; the apex answers **200** | `https://ppra.go.ke/` |
| Volta River Authority — Tenders | `https://vra.com/media/tenders.php` | TLS handshake alert on the apex; `www` answers **200** | `https://www.vra.com/media/tenders.php` |

The probe now retries the alternate host (apex ↔ www) once before recording a
failure, so this class of mistake is caught automatically from now on.

## Group A — the host no longer exists (DNS does not resolve) — 12 sources

The domain does not exist, so there is nothing to negotiate: the registry is
out of date. The action is research, not outreach — find the agency's current
portal from the parent ministry or the national procurement authority, verify
it answers over HTTPS, then update `official_website`. Verified in migration
`0056_group_a_url_repairs.sql` (applied dev + prod, 27 Nov 2026).

### Group A — re-pointed (8 of 12)

Replacement verified with a real HTTPS request (2xx) before the registry was
changed. `official_website` and `api_or_feed_url` moved together where they
were the same registered portal.

| Source | Old registered URL | New registered URL | Verified | Notes |
| --- | --- | --- | --- | --- |
| Burkina Faso ARMP | `https://armp.gov.bf/` | `https://arcop.bf/` | 200 OK (11.5 s) | Agency renamed ARCOP (Autorité de Régulation des Commandes Publiques) |
| Gambia PPAG | `https://gppagal.gov.gm/` | `https://gppa.gm/` | 200 OK | Gambia Public Procurement Authority |
| Malawi PPDA | `https://ppdamlawi.org/` | `https://www.ppda.mw/` | 200 OK | Public Procurement and Disposal of Assets Authority |
| Namibia CPBN | `https://cpbn.gov.na/` | `https://www.cpbn.com.na/` | 200 OK | Central Procurement Board of Namibia |
| Xarid — Uzbekistan | `https://xarid.mf.uz/` | `https://xarid.uzex.uz/` | 200 OK | UZEX special procurement portal |
| Niger ARMP | `https://armp.ne/` | `https://www.marchespublics.ne/` | 200 OK | `armp-niger.org` now redirects to csi-freight.com — hijacked, do not use |
| Mozambique SISAC | `https://sisac.mf.gov.mz/` | `https://ufsa.gov.mz/` | 200 OK at verification (now 503) | UFSA regulator site; original SISAC e-procurement system is gone. Site currently returns 503/403 — may be intermittent; kept because the old host does not resolve at all |
| GAGS — Egypt | `https://gags.gov.eg/` | `https://www.eps-gags.gov.eg/` | 200 OK | General Authority for Government Services |

### Group A — unconfirmed (4 of 12)

No verified HTTPS replacement. Each stays in the registry untouched (still
pointing at the dead host) and remains an outreach/research item.

| Source | Registered URL | Why unconfirmed |
| --- | --- | --- |
| Botswana PPRA | `https://ppra.co.bw/` (apex) / `https://www.ppra.co.bw/` (www) | apex `ENOTFOUND`; `www` accepts the connection but never replies (timeout); only `https://ipms.ppadb.co.bw/` (IPMS registration portal) answers — not the agency portal itself. http-only portals cannot be re-pointed (`^https://` check) |
| General Contracting Portal (Egypt) | `https://gcs.digitalegypt.gov.eg/` | `ENOTFOUND` on apex; `https://etenders.gov.eg/` and `http://gcs.digitalegypt.gov.eg/` both time out. No verified HTTPS endpoint |
| Helwan University | `https://helwan.edu.eg/` | apex `ENOTFOUND`; `www.helwan.edu.eg` has an incomplete certificate chain (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`); `https://hu.edu.eg/` answers 403 (different host, blocked, not verified) |
| Madagascar DGCP | `https://dgcp.gov.ml/` | `ENOTFOUND` — note the `.ml` (Mali) TLD on a Madagascar source: the registry row is wrong, not the internet. `https://armp.mg/` has a certificate altname mismatch. http-only portals cannot be re-pointed (`^https://` check) |

## Group B — certificate problems the publisher must fix — 10 sources

Send each publisher's web team the exact Node error. These are one-line server
fixes for them and cannot be fixed from our side.

| Source | Registered URL | Finding | What to ask for |
| --- | --- | --- | --- |
| AGPO Kenya | `https://www.agpo.go.ke/` (and `/pages/tenders`) | `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | install the intermediate CA in the served chain |
| Alexandria Port Authority | `https://apa.gov.eg/` | same | same |
| Grants.gov | `https://www.grants.gov` | same | same |
| Monaqasat (Qatar MoF) | `https://monaqasat.mof.gov.qa/...` | same | same |
| TUNEPS (Tunisia) | `https://www.tuneps.tn/` | same | same |
| Helwan University | `https://www.helwan.edu.eg/` | same | same |
| Ghana Water Company | `https://gwcl.com.gh/` | `CERT_HAS_EXPIRED` | renew the certificate |
| Tunisia Marchés Publics | `https://www.marchespublics.gov.tn/fr` | `CERT_HAS_EXPIRED` | renew |
| MyGov Kenya | `https://www.mygov.go.ke/index.php/all-tenders` | `ERR_TLS_CERT_ALTNAME_INVALID` | certificate must cover `www.mygov.go.ke` |
| Goszakup (Kazakhstan) | `https://www.goszakup.gov.kz/ru/search/lots` | `ERR_TLS_CERT_ALTNAME_INVALID` | certificate must cover the host clients request |
| Nyeri County | `https://www.nyeri.go.ke/cgntenders/` | `SELF_SIGNED_CERT_IN_CHAIN`, then timeout | chain signed by a public CA, then check the WAF |

## Group C — automated access refused (401/403/407/429) — 13 sources

The publisher exists and answered, but refused this client. That is a data
access conversation: API registration, an allowlisted client, or a data-use
agreement. Several are a country's only registered source, so the conversation
matters commercially, not just technically.

| Source | Registered URL | Note |
| --- | --- | --- |
| AusTender Contract Notices | website `https://www.tenders.gov.au/`, feed `https://api.tenders.gov.au/ocds/findByDates/contractPublished` | 403 on both; AusTender publishes a registered OCDS API |
| Grants.gov Search | feed `https://api.grants.gov/v1/api/search2` | 403 without the documented search parameters/key |
| Alexandria Container Handling | `https://alexcont.com/tenders` | 403 |
| CAPT Kuwait | `https://capt.gov.kw/en/tenders/opening-tenders/` | 403 |
| ESPPRA (Eswatini) | `https://esppra.co.sz/` and `/tender.php` | 403 |
| Chad Journal Officiel | `https://journalofficiel.td/...` | 403 |
| Kajiado County | `https://kajiado.go.ke/` | 403 |
| Kenya Airports Authority | `https://kaa.go.ke/` and `/corporate/procurement/tenders/` | 403 on the page and on the "feed" path |
| National Oil Corporation (Libya) | `https://noc.ly/en/tenders` | 403 |
| Mauritania Marchés Publics | `https://marchespublics.gov.mr/` | 403 |
| SEACE (Peru) | `https://prod2.seace.gob.pe/...` | 403 |
| SECOP II (Colombia) | `https://community.secop.gov.co/...` | 403 on the community host; SECOP publishes a public API |
| Mongolia tender portal | `https://user.tender.gov.mn/en/invitation` | 403 |

## Group D — the connection never completes from this network — 14 sources

Timeouts and resets from a European datacenter. These are the ones most likely
to work from a national network, so the first step is a second vantage point
before anyone is contacted.

| Source | Registered URL | Observed |
| --- | --- | --- |
| CPPP (India) | `https://eprocure.gov.in/` and its e-publish path | connection reset |
| Alexandria Water | `https://www.alexwater.com.eg/` | 25 s connect timeout |
| Damietta Port Authority | `https://dpa.gov.eg/` | 25 s connect timeout |
| IFMIS Supplier Portal (Kenya) | `https://supplier.treasury.go.ke/` and `/site/tenders.go` | 25 s connect timeout |
| Ministère des Finances (Algeria) | `https://www.mf.gov.dz/` | 25 s connect timeout |
| Nairobi City County | `https://nairobi.go.ke/` and `/tenders/` | 25 s connect timeout |
| National Petroleum Authority (Ghana) | `https://npa.gov.gh/` | request aborted at timeout |
| PPA Ghana tender portal | `https://tenders.ppa.gov.gh/tenders` | 25 s connect timeout |
| PRAZ (Zimbabwe) | `https://www.praz.org.zw/` | 25 s connect timeout |
| EGP Zimbabwe (PRAZ) | `https://www.egp.praz.org.zw/` | 25 s connect timeout |
| PROMISe (Sri Lanka) | `https://promise.lk/?a=all_procurements&...` | 25 s connect timeout |
| Portail Électronique des Marchés Publics (Algeria) | `https://marches-publics.gov.dz/` | 25 s connect timeout |
| Senegal Marchespublics | `https://www.marchespublics.sn/` | 25 s connect timeout |
| Portail National des Marchés Publics (Mauritania) | `https://marchespublics.gov.mr/` | also 403; timeout on the alternate host |

## Group E — answered, but with an error or no data — 2 sources

| Source | Registered URL | Observed |
| --- | --- | --- |
| Embu County Government | `https://embu.go.ke/` | error status on every request |
| PS-PhilGEPS Open Opportunities | `https://philgeps.gov.ph/` and `/Indexes/index` | HTTP 500 on both — the publisher's own error |

## Group F — silent feeds: answered 200, but not with data — 6 feeds

The URL answers, but with an HTML tender page where the registry declares a
machine feed. A browser can read these; a connector cannot. They stay counted
as reachable (the publisher is alive) but not as a data feed, and the app now
says so: `Answered · HTTP 200 · feed endpoint · HTML page, not a feed`.

| Source | Registered feed URL |
| --- | --- |
| KPLC Tenders | `https://kplc.co.ke/tender-notices` |
| KURA Tenders | `https://kura.go.ke/tender-documents-2` |
| KeNHA Tenders | `https://kenha.co.ke/tenders/` |
| KeRRA Tenders | `https://kerra.go.ke/document-category/tenders` |
| Kenya Railways Corporation | `https://krc.co.ke/tenders/` |
| PPDAA Tender Portal (South Sudan) | `https://tenderportal.ppdaa.gov.ss/current-bids` |

Two further answers are silent for a different reason and are already recorded
as observed: **Japan KKJ** returns `<Error>no searchword</Error>` (the API needs
a query) and **Mombasa County** returns 500 on its feed path.

## Outreach sequence

1. **Reachability from a second network.** Run the probe with a national egress
   (or a colleague's machine in-country) for Group D. If it answers there, the
   finding is network policy, not a publisher fault, and the row is annotated
   instead of escalated.
2. **Registry research for Group A.** One pass per country: procurement
   authority → current portal → verify with
   `node scripts/check-source-liveness.mjs --source=<uuid>` → update the URL.
3. **Certificate letters for Group B.** Short, specific, technical: host,
   error, what to install. Ask for the portal owner's web team; most agencies
   have a published `webmaster@` or a contact form.
4. **Access requests for Group C.** Ask for API registration or allowlisting,
   state the client (source IPs, user agent) and the intended use, and ask for
   their terms for reuse. AusTender, SECOP, Grants.gov and SAM.gov all publish
   a formal route — use it rather than scraping a 403.
5. **Feed requests for Group F.** Ask whether an OCDS/JSON endpoint exists for
   the same notices, and offer to attribute and link back.

### Letter template (certificate or WAF issues)

> Subject: OppSift cannot read <portal> — TLS chain / automated access
>
> We operate OppSift, a procurement-intelligence service that indexes public
> tender notices and links every record back to your portal. On <date> a request
> to <URL> from our crawler failed with:
>
> `<exact Node error>`
>
> A normal browser may still work; our client validates certificates strictly,
> so we cannot read the portal until the chain is complete. Could your web team
> confirm the fix, or tell us the correct endpoint for machine access and the
> terms you require for reuse? We will attribute the source and send you the
> list of notices we index.

## Tracker

| # | Source | Group | Owner | Contacted | Response | Resolution |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PPRA Kenya (website) | fixed | — | — | — | re-pointed to apex host, answers 200 |
| 2 | Volta River Authority | fixed | — | — | — | re-pointed to `www`, answers 200 |
| 3–10 | Group A re-pointed (Burkina, Gambia, Malawi, Namibia, Xarid, Niger, Mozambique, GAGS) | A | done | — | — | re-pointed in migration 0056, 7 of 8 answer 200 (Mozambique 503) |
| 11–14 | Group A unconfirmed (Botswana PPRA, Egypt GCS portal, Helwan University, Madagascar DGCP) | A | unassigned | not yet | — | open — no verified HTTPS replacement |
| 15–58 | remaining sources (Groups B–F) | B–F | unassigned | not yet | — | open |

The tracker is deliberately empty apart from what has actually happened: no
publisher has been contacted yet, and this file should not claim otherwise.

## Follow-ups worth doing next (brainstorm, not commitments)

Ordered by what removes the most uncertainty per unit of work.

1. **Second-vantage probe.** A small scheduled run from a second region (or a
   contributor's machine) would reclassify most of Group D without a single
   email. Highest value for the least work.
2. **Certificate-expiry watch.** The probe already sees `CERT_HAS_EXPIRED`;
   alerting on the *first* occurrence instead of discovering it a month later
   turns a lost source into a maintenance ticket.
3. **Official API connectors for the big 403s** (AusTender, SECOP, Grants.gov,
   SAM.gov) with keys in the deployment's secret store. These are large notice
   volumes behind a documented registration, not hostile sites.
4. **Feed-schema validation, not just reachability.** Parse the first record of
   each feed and assert an OCDS/JSON shape, so "answered 200 with an empty
   object" stops counting as a working feed.
5. **Registry freshness check.** Compare each country against its procurement
   authority's published portal list quarterly; Group A exists because nothing
   did this.
6. **Per-country "data rights" line** on the country page: what the publisher's
   terms allow (attribution only, reuse with notice, no redistribution), with
   the date it was last confirmed.
7. **Public access-status page** generated from the same views, so a blocked
   publisher can see exactly what OppSift observes about their site.
8. **Alternate egress for blocked publishers** only where their terms allow it:
   a documented API is always preferable to a different IP address.
9. **URL repair history** as a table rather than a migration comment, so a
   re-pointed source keeps its audit trail.
10. **Coverage honesty on ingestion.** Now that reachability is separate, the
    next honest gap is "how many notices did the last successful run actually
    store per country", which `ingestion_runs` can answer.
11. **Lead promotion workflow.** A lead becomes a source only with a verified
    publisher, official tender page and reuse terms — make that a form with
    evidence fields, not a hand edit.
12. **Refresh cadence per source.** Government portals publish weekly, some
    daily; the check interval should follow `expected_refresh_hours` instead of
    one global cadence.
