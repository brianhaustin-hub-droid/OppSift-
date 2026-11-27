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
  official website), all requested; a second pass with a 25 s timeout retried
  every source that had not answered.
* Latest result per endpoint:

| Target | Answered | Blocked (401/403/407/429) | Error (4xx/5xx) | Connection failed |
| --- | --- | --- | --- | --- |
| Official website | 126 | 13 | 2 | 39 |
| API / feed | 22 | 4 | 4 | 5 |

* **148 of 215 endpoints answered** and **128 of 180 sources answered at least
  one endpoint** (71.1%).
* **101 countries checked: 70 where every registered source answered,
  31 partial, 0 with no answering source.** No country is left unverified.
* 341 check rows stored, spanning 14:48–15:06 UTC.

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
  Électronique des Marchés Publics (Algeria)`: no reply within 20–25 s from the
  build host. These may be reachable from other networks; the stored result
  says only what was observed here.
* Five publishers present a certificate chain Node cannot verify
  (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) and three have expired certificates
  (`CERT_HAS_EXPIRED`); the source page shows that reason instead of a generic
  failure. TLS verification is never disabled to make one of these pass.

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
* A source with no stored check reads **"Live check not recorded"**; a country
  with none reads **"Live check pending"**. Nothing is inferred.

## Re-running

```bash
npm run sources:verify                       # every source, DATABASE_URL (dev branch)
LIVENESS_DATABASE_URL=postgres://… npm run sources:verify   # explicit branch
node scripts/check-source-liveness.mjs --country=BR         # one country
node scripts/check-source-liveness.mjs --retry-failed       # only sources that never answered
node scripts/check-source-liveness.mjs --stale-minutes=60   # skip fresh checks
LIVENESS_TIMEOUT_MS=25000 LIVENESS_CONCURRENCY=10 npm run sources:verify
```

Run it from a scheduled job to keep the ages short; the UI reports the age of
the evidence rather than pretending it is live when it is not.
