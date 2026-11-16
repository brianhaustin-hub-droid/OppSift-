# OppSift ingestion repository implementation

## Status and boundaries

The database executor and ingestion repository are implemented and covered by
isolated PostgreSQL-compatible integration tests. They provide durable
persistence primitives, not a production ingestion service. No real collector,
job dispatcher, scheduled trigger, Cloudflare Hyperdrive binding, Neon worker
identity, or active source is configured by this work.

Migration `0003_durable_ingestion_foundation.sql` and the separate worker
provisioning SQL remain unapplied to Neon. Local PGlite tests execute migrations
`0001` through `0003` plus the provisioning SQL using mocked Neon Auth objects.
This does not verify Neon Auth behavior, Cloudflare networking, Hyperdrive, or
remote database configuration.

## Database access

`backend/neon/intelligence/database-executor.ts` defines the typed,
parameterized `DatabaseExecutor` and transaction interfaces. Database errors
are wrapped in `DatabaseOperationError`; safe PostgreSQL error codes and
constraint names are retained without retaining query text or credentials.

`backend/neon/intelligence/hyperdrive-executor.ts` implements the executor
using Postgres.js and an injected Hyperdrive binding. It uses a small connection
pool, disables prepared statements for proxy compatibility, and wraps
transaction and query failures. Application code must supply the binding at
runtime; `wrangler.toml` currently declares no Hyperdrive binding.

The repository is constructed server-side:

```ts
const executor = createHyperdriveDatabaseExecutor(env.HYPERDRIVE);
const repository = new NeonIngestionRepository(executor, workerIdentifier);
```

This illustrates the intended composition only. `env.HYPERDRIVE` and
`workerIdentifier` are not currently defined or wired into a deployed worker.
Do not expose a database URL or worker credential to browser code.

## Repository responsibilities

`backend/neon/intelligence/neon-ingestion-repository.ts` implements the
existing `IngestionRepository` contract and durable operations:

| Area | Behavior |
|---|---|
| Source gate and coverage | Returns only explicitly approved, active, operational sources whose reuse/license/terms/reliability evidence passes the repository checks; supports verified country/category coverage lookups. |
| Runs and errors | Creates source or job-linked runs; persists completion counts, durations, source health, rejection/review data and quality issues. |
| Raw payloads | Stores JSON/text or R2 object references, deduplicates by source/external ID/checksum, preserves changed payload revisions, and tracks processing/retry state. |
| Canonical records | Saves source attribution and normalized opportunities transactionally, versions material changes, maintains cross-source provenance, and records duplicate candidates and quality issues. |
| Jobs | Enqueues idempotently; claims with transactional row locking; returns a lease token; supports lease renewal, completion, retry scheduling and dead-lettering. Expired leases are reclaimed before new claims. |
| Cursors | Reads and advances versioned cursors with compare-and-swap protection; cursor advancement can commit atomically with job completion and is tied to the active job lease. |

Error messages and JSON source fields are redacted for common credential and
token patterns before persistence. Raw payload retention and access still
require an approved operational policy.

`backend/neon/intelligence/ingestion.ts` captures a connector's raw envelope
before parsing and advances its processing state as ingestion succeeds, is
rejected, enters review, or fails. The connector must supply the original
payload and checksum. The repository does not fetch any external source itself.

## Least-privilege worker provisioning

`backend/neon/provisioning/ingestion-worker-permissions.sql` defines an
idempotent `NOLOGIN`, `NOSUPERUSER`, `NOBYPASSRLS` privilege role and narrowly
scoped table grants/policies for source reads and ingestion writes. The role
cannot access organization tables and receives no delete grants. It is not a
credential and cannot log in by itself.

Before any real worker deployment, an operator must review and apply the SQL to
an explicitly selected non-production Neon branch, provision a separate
server-side login identity and secret, verify the role membership and policies,
and configure Hyperdrive outside source control. The provisioning SQL has not
been run against Neon. Production rollout requires separate approval and
verification; this implementation does not create credentials or change
Cloudflare configuration.

## Integration-test scope

The PGlite helper in `backend/neon/testing/pglite-database.ts` creates an
isolated database, supplies minimal mock authentication dependencies, applies
the actual migration files in dependency order, and runs the worker
provisioning SQL. The integration suites verify:

- Table, column, foreign-key, index, function, RLS and policy creation.
- Source approval and activation constraints.
- Worker role attributes and explicit privilege boundaries.
- Job lease and idempotency constraints.
- Source approval gates, raw payload idempotency/revisions and error
  redaction.
- Cursor version checks and lease ownership.
- Canonical versioning and multi-source provenance.
- Run counts, source health, expired-lease reclamation, retries,
  dead-lettering, and transaction rollback.

These are local SQL execution tests, not evidence that any live source has been
collected or that a Neon/Cloudflare deployment is operational.

## Remaining production work

1. Review and apply migration `0003` on a disposable Neon branch; reconcile the
   manually maintained migration ledger only after the actual operation.
2. Review and apply worker provisioning on the intended branch; create
   credentials outside the repository and verify effective grants and RLS.
3. Configure Hyperdrive and a server-side worker environment without exposing
   secrets to the frontend.
4. Implement approved source-specific collectors and parser fixtures.
5. Add a scheduler/dispatcher that claims jobs, executes connectors, renews
   leases, commits cursors, and handles shutdown/cancellation safely.
6. Add operational monitoring, retry/dead-letter review, source health
   alerting, retention enforcement and R2 object lifecycle management.
7. Verify every source's commercial reuse terms and enforce any conditional
   approval requirements before activating collection.
8. Run end-to-end checks against a disposable Neon/Cloudflare setup before
   considering production use.
