# OppSift collector network

## Status and scope

This is the bounded collector-runtime implementation for the first four
frameworks. It is not evidence that any public source is approved, activated,
connected to production, or returning live opportunity records. No source was
activated and no production configuration or database was changed.

The collector network supports Crawlee and Cheerio in an isolated Node package,
and Scrapy and Scrapling in an isolated Python package. All four use the same
versioned JSON Schema. Source-specific selectors and collection limits must be
provided by a trusted server-side caller; the packages do not contain a live
source catalog or fabricated opportunity data.

## Runtime flow

```mermaid
flowchart TD
    Registry[(Neon source registry)] --> Repo[NeonIngestionRepository]
    Repo --> Gate{Approved, active, operational,\nconnector matches?}
    Gate -->|No| Stop[Fail closed]
    Gate -->|Yes| Ingestion[runIngestion]
    Ingestion --> Prepare[Collector bridge prepare(run ID)]
    Prepare --> Request[Versioned collector request]
    Request --> Verify[Repository-backed approval authority]
    Verify --> Router{Collector registry}
    Router -->|Crawlee / Cheerio| Node[Isolated Node runtime]
    Router -->|Scrapy / Scrapling| Python[Private Python subprocess]
    Node --> Result[Versioned collector result]
    Python --> Result
    Result --> Raw[(Raw source records)]
    Result --> Parse[Parsed source opportunity]
    Parse --> Mapping[Existing category mapping]
    Mapping --> Canonical[(Canonical opportunities)]
    Parse --> Review[(Quality issues / review)]
```

The source approval authority reads the source through the existing
`IngestionRepository.getSourceForIngestion` contract. It requires the returned
source ID and connector identifier to match, as well as an active operational
source with approved reuse permission. Hosts are derived only from that
source's HTTPS website and API/feed URLs. HTTP methods are GET-only, and
conditional permissions fail closed because no constraint evaluator is
configured.

The ingestion bridge starts collection from `SourceConnector.prepare(runId)`.
It validates the shared result, exposes records through the existing
`discover`/`retrieve` methods, stores the original payload and checksum through
`toRawSourceRecord`, and maps extracted values to the existing parsed
opportunity contract. Canonicalization still uses the existing source/category
mapping and duplicate-detection logic; the collector does not invent missing
categories, locations, dates, eligibility, or amounts.

## Contract and safety boundaries

- `collectors/shared/collector-contract.schema.json` is the single request and
  result schema. Node validates it with Ajv 2020; Python validates it with
  `jsonschema` Draft 2020-12.
- Requests are capped by schema at 100 pages, 5,000 records, 500 requests,
  120 seconds per response, 2 MB per response, and 20 MB aggregate raw payload.
  Configured limits may be lower.
- Collection allows approved HTTPS hostnames only, disallows URL credentials,
  nonstandard ports, IP literals, local names, redirects outside the allowlist,
  unsupported response types, and non-public IPv4 destinations.
- The Node HTTP transport pins the validated public IPv4 address for the TLS
  connection while retaining the approved hostname for Host and certificate
  validation. Python records the vetted address in its bounded Scrapy DNS
  resolver before the request is scheduled.
- Redirects are manually revalidated and limited to three. Python also obeys
  robots.txt, disables automatic redirects and retries, uses one concurrent
  request per domain, and bounds response bytes before spider parsing.
- Both runtimes deduplicate external IDs, enforce request/page/record/payload
  limits, calculate SHA-256 payload checksums, and validate result identity and
  counters against the request.
- The Python subprocess receives only the request and a short-lived source
  approval snapshot from its trusted Node caller. It receives no database
  connection string or application credentials. Do not expose its module or
  process endpoint as a public unauthenticated service.
- The collectors do not execute JavaScript, launch browsers, use proxies,
  bypass access controls, or handle CAPTCHA challenges.

The address pinning and HTTP limits are locally implemented but still require
runtime testing against the supported Scrapy/Twisted versions and deployment
network policy. Use outbound network rules as a second boundary. Never rely on
a caller-supplied host list or result payload as proof of source permission.

## Ingestion and persistence

`createCollectorSourceConnector` is an adapter to the existing
`runIngestion` lifecycle. Raw records preserve the collector's source URL,
content type, original payload, checksum, and collection run ID. Existing
quality checks, category mapping, duplicate candidate handling, and database
repository writes remain responsible for canonical records.

The collector result includes a continuation URL in `nextCursor`, but this
bridge does not commit it to `source_cursors`. Cursor persistence must be
performed by the durable job worker using the existing lease-checked
`NeonIngestionRepository.commitCursorForJob` operation; a cursor must not be
advanced independently of a successful leased job. The generic
`runIngestion` call does not itself own a durable job lease.

Raw HTML/XML payloads larger than the database envelope's 2 MB limit are
rejected by collector limits. R2 object storage is not wired into this
collector bridge.

## Runtime deployment boundary

The Node package requires Node.js `>=22.13.0`; its available Crawlee release is
`3.18.2`. The Python runner requires Python `>=3.11` and the dependencies in
`collectors/python/pyproject.toml`.

Cloudflare Workers cannot spawn the local Python subprocess. Production use of
Scrapy/Scrapling therefore requires a separately hosted, private Python
runtime and an authenticated internal transport, or an equivalent managed
worker design. The subprocess adapter is for a trusted Node host and is not a
Cloudflare deployment adapter. No runtime service, scheduler, Hyperdrive
binding, source activation, migration application, or deployment is included
in this chunk.

## Files and validation

- Node package: `collectors/node/`
- Python package: `collectors/python/`
- Shared schema and fixtures: `collectors/shared/`
- Existing ingestion boundary: `backend/neon/intelligence/ingestion.ts`
- Bridge: `backend/neon/intelligence/collector-bridge.ts`
- Database design: `INGESTION_DATABASE_ARCHITECTURE.md`
- Third-party review: `THIRD_PARTY_COLLECTOR_REGISTER.md`

Use the isolated package scripts `npm run build` and `npm test` from
`collectors/node/`, and run Python tests with
`python -m unittest discover -s tests` from `collectors/python/`. Root project
tests/typecheck/build remain required because the bridge integrates with
existing ingestion code.
