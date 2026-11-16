# OppSift implementation ledger

This ledger distinguishes repository implementation from deployed or live
functionality. A completed local implementation does not imply a production
database, credential, source connector, or scheduled service is active.

## Ingestion database and repository foundation

| Capability | Repository status | Runtime status | Evidence / remaining work |
|---|---|---|---|
| Existing schema reconciliation | Implemented | Not a remote schema inspection | Migration `0003` is additive and uses the existing source, opportunity, run, versioning and quality tables. |
| Durable source metadata and approval gates | Implemented | No sources activated | Approval, reuse, evidence and activation fields/checks are in migration `0003`; no real source is approved or collected by this work. |
| Jobs, cursors, raw records and collection metrics | Implemented | Not applied to Neon | Migration `0003` defines durable tables, checks, references and indexes. |
| Parameterized executor | Implemented | No production binding | Generic query/transaction interface and Postgres.js Hyperdrive adapter exist. `HYPERDRIVE_ID` is supplied at deployment time through the temporary-config deploy helper; no production resource is configured. |
| Durable repository | Implemented | No production worker connection | Source, run, raw, canonical, error, job and cursor operations exist; repository lease and cursor transitions are locally integration-tested. |
| Scheduler and dispatcher | Implemented | Not deployed / all candidates inactive | Bounded scheduling and dispatch are implemented. Native profiles route World Bank, TED, Contracts Finder, and SAM.gov clients; the registry approval/activation gates remain in force. TED, Contracts Finder, and SAM.gov lack taxonomy mappings and route records to review. |
| Cloudflare scheduled Worker and Queue handoff | Implemented in code; two Queues provisioned | Not deployed / no Hyperdrive configured / Queues unbound | Five-minute Cron persists due jobs and sends Queue wake-ups. Bounded Queue consumer dispatches through durable DB job leases; queue retries use the provisioned dead-letter Queue. |
| Private Node/Python runner boundary | Implemented | Not deployed / no secret configured | Timestamped HMAC request signing, replay rejection, bounded private runner endpoint, Node framework routing and existing Python subprocess bridge are locally tested. Cloudflare does not spawn Python. |
| Worker permission provisioning | SQL prepared | Not applied / no login provisioned | Separate role/grant/policy SQL; the worker receives only column-level schedule updates on the source registry. No password or credential is stored in the repository. |
| SQL integration tests | Implemented | Local isolated database only | PGlite executes migrations `0001`-`0006` and provisioning SQL with mock auth dependencies. Does not verify Neon-specific behavior. |
| Migration ledger | `0003` through `0006` pending | Not applied by this work | `0005` adds the World Bank candidate; `0006` adds TED, Contracts Finder, and SAM.gov candidates. All remain inactive, unreviewed, and pending. |
| Source-specific API bridge | Implemented for World Bank, TED, Contracts Finder, and SAM.gov | Fixture-tested only; no live collection | Each native profile uses the existing `SourceConnector`, raw record, and ingestion path. The SAM.gov key is read from Worker secret binding `SAM_GOV_API_KEY`; it is not configured in this repository. Non-World-Bank taxonomy mappings remain absent. |
| 30-country national coverage | Not implemented | No country-specific active sources | Existing World Bank, TED, Contracts Finder, and SAM.gov profiles do not establish national coverage for the requested 30-country list; all registry candidates are inactive. |
| Scheduling, monitoring and retention | Scheduler and dispatcher implemented; source health alerting, retention jobs, and R2 lifecycle integration incomplete | Not operational | Cron source config exists, but Worker deployment, Hyperdrive, runner, source-specific profiles, monitoring and retention controls remain outstanding. |

## Bounded collector network

| Capability | Repository status | Runtime status | Evidence / remaining work |
|---|---|---|---|
| Shared versioned collector request/result contract | Implemented | Fixture-validated in Node and Python | `collectors/shared/collector-contract.schema.json` is consumed by both runtimes. |
| Crawlee and Cheerio adapters | Implemented | Local fixture-tested; no active source | Isolated Node package; approved registry callback and public-destination transport are required for network collection. |
| Scrapy and Scrapling adapters | Implemented | Python package tests required; no active source | Isolated Python package; Scrapy transport obeys robots.txt and uses the bounded spider. |
| Approval gate and source-host allowlist | Implemented | Repository-backed in ingestion bridge; no source approved/activated | Requires active operational source metadata; conditional permissions fail closed without an evaluator. |
| Ingestion bridge | Implemented | Local fixture integration only | Maps collector records into the existing raw-record and canonical ingestion lifecycle; does not mean real source data has been collected. |
| Python dispatch | Implemented for trusted Node hosts | Not deployed; not compatible with direct Cloudflare Worker spawning | Cloudflare needs a private authenticated Python runtime or a different worker architecture. |
| Cursor commit and durable job orchestration | Connected in local orchestration code | Not operational | The dispatcher commits continuation state under the active lease only after clean ingestion; no Worker is deployed and no source profile is configured. |
| Source-specific native API connectors | Implemented for four listed sources | Fixture-tested only; no sources active | API client bridges and profiles exist for World Bank, TED, Contracts Finder, and SAM.gov. TED/Contracts Finder/SAM.gov require reviewed taxonomy mappings; all candidates require approval and activation in a configured registry. |
| Source execution in production | Not configured | No live collection | Migrations were not applied remotely, no scheduler is deployed, no Hyperdrive resource is configured, and no source was activated by this work. |

## Validation

- Root suite before Queue integration: `npm.cmd test -- --pool=threads --maxWorkers=1 --reporter=dot` —
  **40 files and 247 tests passed** in 385.52 seconds. This rerun includes the
  updated Markets page source-status assertion; no tests were skipped.
- Queue consumer unit tests: **3 passed** for successful dispatch, retry on
  failure, and malformed wake-up handling.
- `npm.cmd exec -- tsc --noEmit -p backend/neon/worker/tsconfig.json` passed
  after Queue integration.
- Worker `npm.cmd run worker:deploy -- --dry-run` passed using a dummy
  Hyperdrive ID; it confirms the Queue binding compiles, not that the Worker
  has been deployed or connected to a database.
- Focused source-catalog and Markets page tests:
  `npm.cmd exec -- vitest run src/features/public/MarketsPage.test.tsx backend/neon/intelligence/source-catalog.test.ts --pool=threads --maxWorkers=1 --reporter=dot`
  — **2 files and 7 tests passed**.
- World Bank connector fixtures: **9 passed**.
- Connected contracts/source-catalog/ingestion/orchestration/migration unit
  tests: **5 files and 28 tests passed**.
- PGlite integration: migrations `0001`-`0005` and ingestion repository —
  **2 files and 16 tests passed**. This is local PostgreSQL-compatible
  validation only.
- Root `npm.cmd run typecheck` and Worker
  `npm.cmd exec -- tsc --noEmit -p backend/neon/worker/tsconfig.json` passed.
- Root `npm.cmd run build` passed. Existing Zod annotation and 500 kB
  bundle-size warnings remain; the generated JavaScript bundle is 652.57 kB.
- `npm.cmd run lint` passed with **7 warnings and no errors**; warnings are in
  existing UI files. An unused-variable lint error in the modified
  orchestration branch was fixed and lint re-run successfully.
- Node collector tests passed (**14**); Python `unittest` collector tests
  passed (**10**). `pytest` is not installed and is not the repository's test
  runner.
- The dedicated Worker typecheck passed. No live World Bank API smoke test was
  run. A single read-only `rows=1&os=0` endpoint-shape check returned valid
  JSON; it was not a connector or end-to-end run and did not store records.
- Wrangler dry-run bundled successfully with the placeholder Hyperdrive ID;
  it did not deploy the Worker.
- No migration or provisioning SQL was applied remotely, no credentials were
  created, no source was activated, and no live source data was collected.

## Implementation files

- Database foundation: `backend/neon/migrations/0003_durable_ingestion_foundation.sql`
- Approval expiry: `backend/neon/migrations/0004_ingestion_orchestration.sql`
- Generic executor: `backend/neon/intelligence/database-executor.ts`
- Hyperdrive adapter: `backend/neon/intelligence/hyperdrive-executor.ts`
- Durable repository: `backend/neon/intelligence/neon-ingestion-repository.ts`
- Worker permissions: `backend/neon/provisioning/ingestion-worker-permissions.sql`
- Isolated PostgreSQL harness: `backend/neon/testing/pglite-database.ts`
- World Bank API connector: `backend/neon/intelligence/world-bank-procurement.ts`
- World Bank connector tests: `backend/neon/intelligence/world-bank-procurement.test.ts`
- API client-to-ingestion bridge: `backend/neon/intelligence/api-client-source-connectors.ts`
- API bridge tests: `backend/neon/intelligence/api-client-source-connectors.test.ts`
- World Bank source migration: `backend/neon/migrations/0005_world_bank_procurement_notices_source.sql`
- Additional API source candidates: `backend/neon/migrations/0006_api_client_source_candidates.sql`
- Worker deployment config helper: `scripts/deploy-ingestion-worker.mjs`
- Collector network: `collectors/shared/`, `collectors/node/`, and `collectors/python/`
- Ingestion bridge: `backend/neon/intelligence/collector-bridge.ts`
- Orchestration core: `backend/neon/intelligence/orchestration.ts`
- Scheduled Worker: `backend/neon/worker/`
- Authenticated runner transport/server: `backend/neon/intelligence/worker-collector-transport.ts` and `collectors/node/src/authenticated-server.ts`
- Collector architecture: `docs/COLLECTOR_NETWORK_ARCHITECTURE.md`
- Orchestration architecture: `docs/INGESTION_ORCHESTRATION_ARCHITECTURE.md`
- Third-party register: `docs/THIRD_PARTY_COLLECTOR_REGISTER.md`
- Integration suites:
  - `backend/neon/migrations/0003_durable_ingestion_foundation.integration.test.ts`
  - `backend/neon/intelligence/neon-ingestion-repository.integration.test.ts`
  - `backend/neon/intelligence/orchestration.test.ts`
  - `backend/neon/intelligence/worker-collector-transport.test.ts`
- Architecture reference: `docs/INGESTION_DATABASE_ARCHITECTURE.md`
- Repository implementation notes: `docs/INGESTION_REPOSITORY_IMPLEMENTATION.md`
- World Bank connector and evidence notes: `docs/WORLD_BANK_PROCUREMENT_CONNECTOR.md`

## Operational guardrails

- Do not claim live opportunities or working source coverage based on schema,
  test fixtures, catalog metadata, or repository code alone.
- Do not apply migration/provisioning SQL or create credentials without
  explicit environment selection, review and authorization.
- Keep database and worker credentials server-side; never add them to frontend
  source or committed configuration.
- Keep all sources inactive until their reuse conditions are reviewed and
  enforced.
- Record remote migration completion only after a real operator-verified
  application; the local PGlite test is not a migration ledger event.
