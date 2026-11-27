# Live source verification (27 Nov 2026)

Every country page now shows what actually happened the last time OppSift
requested each registered source, instead of only a registration date.

A check is one HTTP GET to the publisher's own endpoint — its API/feed URL
first, then its official website — with the result stored in
`public.source_live_checks` (migration `0053`). Checks are append-only, so the
newest row per endpoint is the current status and older rows stay as history.

## What a check proves — and what it does not

| Proves | Does not prove |
| --- | --- |
| The publisher's registered URL answered (or refused) at a recorded time | That tender notices are being ingested from it |
| The HTTP status, final URL and latency of that reply | That the publisher's terms allow reuse |
| How many of a source's endpoints answered | That a lead has become a source |

Ingestion is still reported separately by `coverage_truth`, `ingestion_runs`
and stored opportunity records. A live check never changes a source's
`reliability_status`, `licensing_status` or `terms_status`.

## Result of the run on 27 Nov 2026 (app-facing production branch)

* 180 registered sources, **215 registered endpoints** (feed URL and/or
  official website), all requested with a 25 s timeout and the alternate-host
  retry from migration 0055.
* Latest result per endpoint:

| Target | Answered | Blocked (401/403/407/429) | Error (4xx/5xx) | Connection failed |
| --- | --- | --- | --- | --- |
| Official website | 128 | 13 | 2 | 37 |
| API / feed | 16 | 4 | 10 | 5 |

* **144 of 215 endpoints answered** and **130 of 180 sources answered at least
  one endpoint** (72.2%).
* **101 countries checked: 70 where every registered source answered,
  31 partial, 0 with no answering source.** No country is left unverified.
* Failures by cause: `blocked` 17, `timeout` 16, `dns_not_found` 12,
  `tls_incomplete_chain` 6, `http_error` 6, `not_a_feed` 6, `tls_expired` 4,
  `connection_reset` 2, `tls_name_mismatch` 2.
* 58 sources answered nothing; they are listed one by one with the exact
  failure and the action that would fix it in `SOURCE_ACCESS_OUTREACH.md`.
  `not_a_feed` covers 6 feeds that answer 200 with an HTML tender page: the
  publisher is alive, the data feed is not.

Blogged reasons are kept, not smoothed over:

* `PNCP — Public Consultation API (Brazil)`: feed returns **403** without the
  required `codigoModalidadeContratacao`/`dataInicial` parameters; the
  publisher's website answers **200**, so the source is counted as answered.
* `SAM.gov Contract Opportunities`: feed **404** (the API needs a key);
  website **200**.
* `TED published procurement notices`: feed **405** (the search endpoint takes
  POST); website **202**.
* `PS-PhilGEPS Open Opportunities`: website and feed return **500** — the
  publisher's own error, recorded as such.
* `UGANDA PPDA`, `PRAZ (Zimbabwe)`, `PPA Ghana`, `PROMISe`, `Portail
  Électronique des Marchés Publics (Algeria)`: no reply within 25 s from the
  build host. These may be reachable from other networks; the stored result
  says only what was observed here.
* Six publishers present a certificate chain Node cannot verify
  (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`), two have expired certificates
  (`CERT_HAS_EXPIRED`) and two serve a certificate for a different hostname
  (`ERR_TLS_CERT_ALTNAME_INVALID`); the source page shows that reason instead of
  a generic failure. TLS verification is never disabled to make one of these
  pass.

Honest limit: a datacenter address can be geo-blocked or firewalled where a
national user is not, and an endpoint that needs an API key or POST body
cannot answer anonymously. Those are recorded as `blocked`, `error` or
`unreachable`, never as verified.

## Where it shows

* **Country page** — the header states `Live: <status> (answered/total)`; the
  *Verified sources* panel carries the roll-up (e.g. "4 of 4 sources answered ·
  checked 8 min ago") and every source row shows its own latest result, HTTP
  status, latency, which endpoint was requested and how old the check is.
* **Source page** — a *Live verification* block with the latest result,
  answered/probed endpoints, exact check time and a direct link to the endpoint
  that was requested.
* **All Markets (`/markets`)** — a *Live Check* column per jurisdiction
  ("Verified live", "Partially verified", "Sources unreachable", "Not
  checked") with `answered/total` and the age of the newest check, a roll-up
  line above the table, and the same status on each market card.
* **Opportunity Explorer (`/discover`)** — a market live-check strip showing
  either the selected market's roll-up or the whole catalogue, the live status
  appended to every country in the country filter, and a status line on each
  result row and card.
* A source with no stored check reads **"Live check not recorded"**; a country
  with none reads **"Live check pending"**. Nothing is inferred.

## What the probe does beyond a plain GET (migration 0055)

* **Alternate host retry.** When a request fails with a DNS, hostname or
  connection error, the same URL is retried once on the other host (apex ↔
  `www`) and the URL that actually answered is the one stored in the check.
  Two sources were re-pointed permanently after that retry answered:
  `www.ppra.go.ke` → `https://ppra.go.ke/` (expired certificate on `www`) and
  `vra.com/...` → `https://www.vra.com/media/tenders.php` (handshake alert on
  the apex).
* **Payload evidence.** A feed URL that answers HTTP 200 with an HTML page is
  recorded as `Not a feed: answered HTTP 200 with html instead of feed data`,
  not as a working feed, and the source page says "HTML page, not a feed".
  Six Kenyan/South Sudanese portals are in this state; the publisher is alive,
  the data feed is not.
* **Failure classes.** Every failure is classified into what the publisher
  would have to change (`dns_not_found`, `tls_expired`,
  `tls_incomplete_chain`, `tls_name_mismatch`, `tls_handshake`, `timeout`,
  `connection_reset`, `blocked`, `http_error`, `not_a_feed`) and the run prints
  the tally. `docs/source-catalog/SOURCE_ACCESS_OUTREACH.md` turns that into a
  work queue.

## Automatic refresh

`.github/workflows/source-liveness.yml` runs the probe every six hours (and on
`workflow_dispatch`) against the app-facing database, so evidence ages instead
of going stale. It needs one repository secret, `LIVENESS_DATABASE_URL`, and
fails loudly if it is missing rather than reporting sources as verified. The
UI still prints the age of every check, so a paused workflow is visible instead
of silently trusted.

## Re-running

```bash
npm run sources:verify                       # every source, DATABASE_URL (dev branch)
LIVENESS_DATABASE_URL=postgres://… npm run sources:verify   # explicit branch
node scripts/check-source-liveness.mjs --country=BR         # one country
node scripts/check-source-liveness.mjs --retry-failed       # only sources that never answered
node scripts/check-source-liveness.mjs --stale-minutes=60   # skip fresh checks
LIVENESS_TIMEOUT_MS=25000 LIVENESS_CONCURRENCY=10 npm run sources:verify
```

The scheduled workflow above is what keeps the ages short; the UI reports the
age of the evidence rather than pretending it is live when it is not. The
`--retry-failed` flag re-probes only sources that have never answered, which is
the cheapest way to see whether a publisher fixed their side.
