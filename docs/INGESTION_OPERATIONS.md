# Ingestion operations

## Current operating boundary

The repository contains typed connector contracts, JSON API and RSS/Atom
adapters, CSV/JSON/XML parsers, approved-host fetch checks, retry and
rate-limiting helpers, and a fixture-driven in-memory ingestion flow. Database
migrations 0001 and 0002 are marked applied in the development ledger.
Migrations 0003 through 0006 remain pending. A durable Neon repository,
orchestration scheduler/dispatcher, and separate Cloudflare scheduled Worker
are implemented in the repository, but no Worker is deployed or connected to a
configured Hyperdrive instance. Native profiles route the World Bank, TED,
Contracts Finder, and SAM.gov clients through the existing ingestion contract.
Their source candidates remain unreviewed and inactive, so no sources are
scheduled or collected. TED, Contracts Finder, and SAM.gov have no category
mappings yet and would be routed to review rather than canonical publication
after explicit source approval.

Do not run a production ingestion job or describe a source as active. Do not
add credentials to frontend variables, source files, fixtures, or connector
configuration.

## Country coverage boundary

The four existing API profiles are not 30 country-specific pipelines:
World Bank notices cover World Bank-financed procurement globally, TED covers
published EU notices, Contracts Finder is UK-specific, and SAM.gov covers U.S.
federal opportunities. No national connectors are currently registered for
Canada, India, Singapore, Japan, South Korea, Malaysia, Indonesia, Philippines,
Thailand, Vietnam, Australia, Germany, France, Netherlands, Ireland, Italy,
Spain, Sweden, Poland, Denmark, Belgium, Kenya, Uganda, Tanzania, Rwanda,
Burundi, Ethiopia, or South Sudan. Even the existing profile regions are not
active coverage because their source candidates remain inactive.

## Registering and approving a source

1. Use the approved launch scope in
   `docs/source-catalog/launch-countries.md`; do not claim country coverage
   until source and permission evidence are complete.
2. Record the publisher's official domain and primary documentation in
   `docs/source-catalog/`. Confirm access method, terms, licensing, attribution,
   rate limits, privacy requirements, and retention rights separately.
3. Keep the source in a non-operational state until permission evidence and
   technical testing are complete. `sourceRegistryRecordSchema` rejects an
   operational source without approved licensing, verified terms, evidence,
   and verified reliability.
4. Configure the connector with an HTTPS endpoint, exact approved hostnames,
   an explicit content-type allowlist, and conservative response, timeout, and
   pagination limits. Connector configuration currently has no secret store
   or authentication-reference mechanism; do not put credentials in it.
5. Add source-specific field and taxonomy mappings. Preserve original values
   and do not infer missing dates, categories, or currency.
6. Add deterministic fixture tests. A successful connection test alone is not
   source permission approval.

There is no source-management UI or server-side platform-admin API yet. Do not
write to global source tables through the public browser API.

## Testing a connector

Use the adapter tests and fixture parsers to test response shape, stable IDs,
pagination, malformed data, error classification, and safe-fetch behavior.
Keep test domains under reserved `.example` names and inject a fixture fetcher.
Never use an ordinary user's URL as a fetch target.

The current API and feed adapters hold discovered records in process memory.
Queue messages contain only dispatch wake-ups, not records or pagination
state, so a single ingestion job remains within one consumer invocation. Do
not split a connector's pages or discovered records across queue deliveries
until raw discovery results are persisted or the fetch contract is made
stateless.

## Running and monitoring

The orchestration implementation lives in
`backend/neon/intelligence/orchestration.ts`; the separate scheduled Worker is
under `backend/neon/worker/`. It queries a bounded batch of due, approved
sources with registered connector profiles; serializes job creation and source
schedule advancement; claims prioritized jobs with leases; retries failures
with bounded backoff; and dead-letters exhausted or unauthorized work. Cursor
state is committed only after clean ingestion under the current lease.

The Worker config declares a five-minute Cron, bounded limits, and a Cloudflare
Queue producer/consumer. The Cron scheduler persists jobs and sends a Queue
wake-up; the Queue consumer claims durable jobs and runs bounded dispatch.
The `oppsift-ingestion` and `oppsift-ingestion-dead-letter` resources have been
created in the authenticated Cloudflare account, but remain unbound because
the Worker is not deployed. Confirm that this is the intended production
account before deployment.
Its Hyperdrive binding ID is supplied at deploy time through
`HYPERDRIVE_ID` by `scripts/deploy-ingestion-worker.mjs`; Wrangler bindings
are deployment-time configuration, not runtime variables. Its API profiles
cannot schedule until the registry sources are approved and active.
`SAM_GOV_API_KEY` is read from the Worker secret binding and is never placed
in Wrangler `vars`.
The private Node runner transport and authenticated server are implemented,
but no runner URL or HMAC secret is configured for collector-framework
profiles. Cloudflare cannot spawn the Python collector runtime; the trusted
Node host invokes the existing local Python subprocess adapter.

Use `docs/INGESTION_ORCHESTRATION_ARCHITECTURE.md` for the execution and
deployment boundary. Do not treat source configuration, local tests, or a
Cron declaration as evidence of live ingestion.

When a backend runtime and authorized repository are added, each run must
persist source/run state and only advance its cursor after all records in that
cursor batch have been durably saved. Record per-source errors and keep
individual invalid records from aborting unrelated records.

## Diagnosing failures

- **Configuration/permission:** check HTTPS, exact hostname allowlist, source
  lifecycle, and documented permission evidence.
- **Authentication:** SAM.gov receives `SAM_GOV_API_KEY` from a Worker secret;
  no key is committed or included in plain-text Wrangler variables. Secret
  provisioning and rotation must be handled through the Cloudflare dashboard
  or Wrangler's secret management.
- **Rate limit / server error:** retry helpers support bounded exponential
  delay and `Retry-After`, but no production worker currently invokes them.
- **Invalid content / schema change:** inspect a sanitized fixture, update the
  source-specific parser and tests, and keep the source paused until reviewed.
- **Rejected or unmapped record:** preserve the source value and route it to
  review; do not publish it as a confirmed opportunity.

Diagnostic exports and future logs must redact credentials and avoid retaining
full copyrighted documents unless the source's terms explicitly permit it.

## Deployment prerequisites

Before deployment, review and rehearse migrations 0003 through 0006 on an
authorized non-production Neon branch, provision the restricted worker role
out of band, and configure a real Hyperdrive resource. Confirm that the
provisioned Queues are in the intended Cloudflare account. Set `HYPERDRIVE_ID`
and run `npm run worker:deploy` for a dry run; `--deploy` is required to deploy.
Provision `SAM_GOV_API_KEY` with `wrangler secret put SAM_GOV_API_KEY` only
after a SAM.gov source is authorized. The source candidates remain inactive,
and collection remains blocked until source evidence, permission review,
category mappings, monitoring, and retention conditions are complete.
