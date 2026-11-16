# Connector development guide

## Connector boundary

Backend-only connector contracts are in
`backend/neon/intelligence/connectors.ts`. Adapters live in
`backend/neon/intelligence/adapters.ts`; parsers and row mapping live in
`format-parsers.ts`. Connector code must remain independent of React and must
not move secret values into browser-visible configuration.

`OpportunitySourceConnector` defines configuration validation, connection
testing, record discovery, record retrieval, parsing, and canonical mapping.
External records are untrusted; validate normalized records with
`parsedSourceOpportunitySchema` and map taxonomy terms explicitly.

## Adding an adapter

1. Confirm the official publisher, documented access method, permission
   evidence, licensing, attribution, rate limits, and retention conditions.
2. Define a source-specific configuration and mapper. Keep source-specific
   logic in the adapter, not in the shared ingestion flow.
3. Use `safeFetchApprovedSource` for network retrieval. Allow only HTTPS,
   approved source hostnames, expected MIME types, bounded response sizes, and
   bounded timeouts. Do not follow unapproved redirects or fetch user-supplied
   URLs.
4. Preserve source identifiers, source URLs, original date text, original
   currency/amounts, and relevant original values.
5. Map only known source taxonomy terms. Unmapped terms must remain in review,
   not be assigned a guessed global type.
6. Add deterministic fixture tests for valid and malformed responses,
   pagination, missing identifiers, content types, oversize responses, and
   source failures.
7. Leave a source non-operational until the separate verification and approval
   process is complete.

## Existing adapters

- `JsonApiConnector` supports configured REST-style JSON, read-only GraphQL,
  and JSON-feed mappings.
- `SyndicationFeedConnector` supports RSS/Atom entries.
- Manual CSV/JSON helpers and structured XML parsing validate formats, but
  they do not persist or publish imports.

The current API and feed adapters use in-memory maps to bridge discovery and
fetch. They are suitable for deterministic in-process tests only; do not
dispatch their IDs to another worker or queue consumer and assume the raw
payload remains available. Durable raw-record persistence or a stateless
fetch contract is required before that deployment model.

## Reliability and execution status

`resilience.ts` contains versioned queue-message and source-schedule schemas,
UTC due-time calculation, retry/backoff, circuit-breaker, per-source rate
limiting, and bounded batch helpers. These are reusable primitives, not a
Cloudflare Queue, Cron Trigger, Workflow, or deployed worker. The repository
does not yet have a production repository implementation or durable cursor
commit protocol.

Use an injected fixture fetcher and deterministic clock/random/sleep functions
in tests. Never call an unverified real source from unit tests. Do not claim a
connector is live until permission, runtime, persistence, monitoring, and
source-specific integration tests are all complete.
