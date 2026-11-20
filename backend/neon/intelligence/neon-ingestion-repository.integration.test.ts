// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import type { CategoryMapping, NormalizedOpportunity } from "./contracts";
import { normalizeOpportunity, parsedSourceOpportunitySchema } from "./contracts";
import { IngestionRepositoryError, JobLeaseError, NeonIngestionRepository } from "./neon-ingestion-repository";
import type { RawSourceRecordEnvelope } from "./persistence-contracts";
import { createMigratedTestDatabase } from "../testing/pglite-database";

const sourceOneId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";
const sourceTwoId = "eabeb635-57de-47ab-ab11-1cc6e28cc744";
const inactiveSourceId = "f5933977-6051-49ab-a7a7-6b418f813e84";
const expiredSourceId = "c07da2f5-09cb-4e31-b13f-a113d03264e2";
const sourceUrl = "https://procurement.example.test/notices/42";
const canonicalUrl = "https://procurement.example.test/opportunities/42";

const sourceOneMapping: CategoryMapping = {
  sourceId: sourceOneId,
  countryCode: "GB",
  sourceTerm: "Open tender",
  category: "government",
  globalType: "tender",
};

const baseOpportunity = {
  externalId: "notice-42",
  title: "Framework for solar equipment",
  description: "Supply of solar equipment.",
  sourceCategoryTerm: "Open tender",
  referenceNumber: "ITT-2026/42",
  countryCode: "GB",
  region: "North",
  city: null,
  issuingInstitution: "Example public institution",
  procuringOrganization: null,
  publisher: "Example source",
  publishedAt: "2026-03-01T10:00:00Z",
  sourceDeadlineText: "31 March 2026, 12:00 BST",
  closingAt: "2026-03-31T11:00:00Z",
  timeZone: "Europe/London",
  status: "open",
  sourceUrl,
  canonicalUrl,
  currency: "GBP",
  amount: "120000.00",
  originalValues: { authorization: "Bearer do-not-store" },
};

describe("Neon ingestion repository against isolated PostgreSQL", () => {
  let context: Awaited<ReturnType<typeof createMigratedTestDatabase>>;
  let repository: NeonIngestionRepository;
  let sourceTwoMapping: CategoryMapping;

  beforeAll(async () => {
    context = await createMigratedTestDatabase();
    repository = new NeonIngestionRepository(context.executor, "integration-worker");
    sourceTwoMapping = { ...sourceOneMapping, sourceId: sourceTwoId };
    await context.executor.query(
      `INSERT INTO public.currencies (code, name, minor_unit)
       VALUES ('GBP', 'Pound sterling', 2)`,
    );
    await context.executor.query(
      `INSERT INTO public.languages (tag, name) VALUES ('en-GB', 'English (UK)')`,
    );
    await context.executor.query(
      `INSERT INTO public.global_countries (
         alpha2_code, alpha3_code, name, calling_code,
         primary_currency_code, default_language_tag, time_zones, region
       ) VALUES (
         'GB', 'GBR', 'United Kingdom', '+44', 'GBP', 'en-GB',
         ARRAY['Europe/London'], 'europe'
       )`,
    );
    await context.executor.query(
      `INSERT INTO public.opportunity_types (code, category_code, name)
       VALUES ('tender', 'government', 'Tender')`,
    );
    await insertCollectableSource(context.executor, sourceOneId, "source-one");
    await insertCollectableSource(context.executor, sourceTwoId, "source-two");
    await insertCollectableSource(context.executor, expiredSourceId, "expired-source");
    await context.executor.query(
      `UPDATE public.opportunity_sources
       SET approval_expires_at = now() - interval '1 minute'
       WHERE id = $1`,
      [expiredSourceId],
    );
    await context.executor.query(
      `INSERT INTO public.opportunity_sources (
         id, name, publisher, official_website, source_category, source_type,
         access_method, supported_categories, languages, publication_frequency,
         expected_refresh_hours
       ) VALUES (
         $1, 'Inactive test source', 'Test publisher',
         'https://inactive.example.test', 'government', 'api', 'api',
         ARRAY['government'], ARRAY['en'], 'Daily', 24
       )`,
      [inactiveSourceId],
    );
  }, 120_000);

  afterAll(async () => {
    await context?.database.close();
  });

  it("retrieves approved active sources and rejects inactive or unapproved sources", async () => {
    expect(await repository.getSourceForIngestion(sourceOneId)).toMatchObject({
      id: sourceOneId,
      approvalStatus: "approved",
      activationStatus: "active",
      reusePermissionStatus: "permitted",
    });
    expect(await repository.getSourceForIngestion(inactiveSourceId)).toBeNull();
    expect(await repository.getSourceForIngestion(expiredSourceId)).toBeNull();
    expect(await repository.getSourceForIngestion("00000000-0000-0000-0000-000000000001"))
      .toBeNull();
    expect(await repository.listApprovedActiveSources()).toHaveLength(2);
    await expect(repository.storeRawRecord(rawEnvelope(sourceOneId, "reject", "a")))
      .resolves.toMatchObject({ inserted: true });
    await expect(repository.storeRawRecord(rawEnvelope(inactiveSourceId, "reject", "b")))
      .rejects.toBeInstanceOf(IngestionRepositoryError);
  });

  it("does not queue or claim a source whose approval expired", async () => {
    await expect(repository.enqueueJob({
      sourceId: expiredSourceId,
      jobType: "incremental_sync",
      idempotencyKey: "expired-source-must-not-queue",
    })).rejects.toThrow("not authorized");

    const queued = await repository.enqueueJob({
      sourceId: sourceOneId,
      jobType: "incremental_sync",
      idempotencyKey: "expires-before-claim",
    });

    await context.executor.query(
      `UPDATE public.opportunity_sources
       SET approval_expires_at = now() - interval '1 minute'
       WHERE id = $1`,
      [sourceOneId],
    );
    expect(await repository.claimNextJob("expired-source-test")).toBeNull();
    const state = await context.executor.query<{ status: string }>(
      `SELECT status FROM public.ingestion_jobs WHERE id = $1`,
      [queued.id],
    );
    expect(state.rows[0]?.status).toBe("dead_lettered");
    await context.executor.query(
      `UPDATE public.opportunity_sources SET approval_expires_at = NULL WHERE id = $1`,
      [sourceOneId],
    );
  });

  it("persists raw source records idempotently and retains checksum revisions", async () => {
    const first = await repository.storeRawRecord(rawEnvelope(sourceOneId, "raw-1", "c"));
    const duplicate = await repository.storeRawRecord(rawEnvelope(sourceOneId, "raw-1", "c"));
    const changed = await repository.storeRawRecord(rawEnvelope(sourceOneId, "raw-1", "d"));
    expect(first.inserted).toBe(true);
    expect(duplicate.inserted).toBe(false);
    expect(changed.inserted).toBe(true);
    expect(changed.id).not.toBe(first.id);

    await repository.markRawProcessing(first.id);
    await repository.markRawProcessingFailure(first.id, new Error("api_token=very-secret"));
    const row = await context.executor.query<{
      processing_state: string;
      processing_attempt_count: number;
      processing_error: string;
      next_processing_attempt_at: string;
    }>(
      `SELECT processing_state, processing_attempt_count,
              processing_error, next_processing_attempt_at
       FROM public.raw_source_records WHERE id = $1`,
      [first.id],
    );
    expect(row.rows[0]).toMatchObject({
      processing_state: "failed",
      processing_attempt_count: 1,
      processing_error: "api_token=[REDACTED]",
    });
    expect(row.rows[0]?.next_processing_attempt_at).toBeTruthy();
  });

  it("persists versioned cursor state with job-lease and optimistic-version protection", async () => {
    const queued = await repository.enqueueJob({
      sourceId: sourceOneId,
      jobType: "incremental_sync",
      idempotencyKey: "cursor-test",
    });
    const duplicate = await repository.enqueueJob({
      sourceId: sourceOneId,
      jobType: "incremental_sync",
      idempotencyKey: "cursor-test",
    });
    expect(duplicate.id).toBe(queued.id);
    expect(await repository.getEligiblePendingJobs()).toHaveLength(1);

    const claim = await repository.claimNextJob("worker-a");
    expect(claim?.job.status).toBe("running");
    if (!claim) throw new Error("Expected an eligible job to be claimed.");
    const cursor = cursorUpdate(sourceOneId);
    const firstWrite = await repository.commitCursorForJob(claim.lease, cursor, 0);
    expect(firstWrite.cursorVersion).toBe(1);
    expect(await repository.getCursor(sourceOneId)).toMatchObject({
      cursorValue: "page-2",
      cursorVersion: 1,
    });
    await expect(repository.commitCursorForJob(claim.lease, cursor, 0))
      .rejects.toThrow("stale cursor update rejected");

    await repository.renewJobLease(claim.lease);
    const completion = await repository.completeJob(claim.lease, {
      cursor: { ...cursor, cursorValue: "page-3" },
      expectedVersion: 1,
    });
    expect(completion.status).toBe("succeeded");
    expect(await repository.getCursor(sourceOneId)).toMatchObject({
      cursorValue: "page-3",
      cursorVersion: 2,
    });
  });

  it("upserts canonical records, versions material updates and preserves multiple source records", async () => {
    const first = normalized(sourceOneId, sourceOneMapping);
    expect(await repository.save(first, [], [])).toBe("created");
    const sourceRecordCountBefore = await countSourceRecords();

    expect(await repository.save(first, [], [])).toBe("unchanged");
    expect(await countSourceRecords()).toBe(sourceRecordCountBefore);

    const secondSource = normalized(
      sourceTwoId,
      sourceTwoMapping,
      { externalId: "second-source-42", publisher: "Second publisher" },
    );
    expect(await repository.save(secondSource, [], [])).toBe("updated");
    const sourceRows = await context.executor.query<{
      source_id: string;
      opportunity_id: string;
    }>(
      `SELECT source_id, opportunity_id
       FROM public.opportunity_source_records
       WHERE source_id IN ($1, $2)
       ORDER BY source_id`,
      [sourceOneId, sourceTwoId],
    );
    expect(sourceRows.rows).toHaveLength(2);
    expect(sourceRows.rows[0]?.opportunity_id).toBe(sourceRows.rows[1]?.opportunity_id);

    const revised = normalized(
      sourceOneId,
      sourceOneMapping,
      { title: "Updated solar equipment framework" },
    );
    expect(await repository.save(revised, [], [])).toBe("updated");
    const versions = await context.executor.query<{ count: number }>(
      `SELECT count(*)::int AS count
       FROM public.opportunity_versions
       WHERE opportunity_id = $1`,
      [sourceRows.rows[0]?.opportunity_id],
    );
    expect(versions.rows[0]?.count).toBe(2);
    expect(await repository.findSourceRecord(sourceOneId, "notice-42"))
      .toMatchObject({ opportunity: { title: "Updated solar equipment framework" } });
  });

  it("persists the dk1 notice-identity key and merges cross-url duplicates", async () => {
    const title = "Cross-url duplicate notice";
    const countByTitle = async () => {
      const result = await context.executor.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM public.opportunities WHERE title = $1",
        [title],
      );
      return result.rows[0]?.count ?? 0;
    };

    const primary = normalized(sourceOneId, sourceOneMapping, {
      externalId: "cross-url-1",
      title,
      sourceUrl: "https://procurement.example.test/notices/cross-url-1",
      canonicalUrl: "https://procurement.example.test/opportunities/cross-url-1",
    });
    // Migration 0031 constrains the column to `dk1_` + 16 hex characters.
    expect(primary.canonicalKey).toMatch(/^dk1_[a-f0-9]{16}$/u);
    expect(await repository.save(primary, [], [])).toBe("created");

    const storedKeys = await context.executor.query<{ dedupe_key: string | null }>(
      "SELECT dedupe_key FROM public.opportunities WHERE title = $1",
      [title],
    );
    expect(storedKeys.rows).toHaveLength(1);
    expect(storedKeys.rows[0]?.dedupe_key).toBe(primary.canonicalKey);

    // The key must survive the read path too (mapOpportunity -> canonicalKey).
    expect(await repository.findSourceRecord(sourceOneId, "cross-url-1"))
      .toMatchObject({ opportunity: { canonicalKey: primary.canonicalKey } });

    // The same notice at a DIFFERENT url from another source must attach to the
    // existing opportunity instead of creating a cross-url duplicate.
    const mirror = normalized(sourceTwoId, sourceTwoMapping, {
      externalId: "cross-url-2",
      title,
      sourceUrl: "https://mirror.example.test/notices/9001",
      canonicalUrl: "https://mirror.example.test/opportunities/9001",
      publisher: "Second publisher",
    });
    expect(mirror.canonicalKey).toBe(primary.canonicalKey);
    expect(await repository.save(mirror, [], [])).toBe("updated");
    expect(await countByTitle()).toBe(1);

    // A different closing-date bucket is a different notice identity: false
    // merges are worse than duplicates (0031), so it must not attach.
    const laterDeadline = normalized(sourceTwoId, sourceTwoMapping, {
      externalId: "cross-url-3",
      title,
      closingAt: "2026-04-30T11:00:00Z",
      sourceDeadlineText: "30 April 2026, 12:00 BST",
      sourceUrl: "https://mirror.example.test/notices/9002",
      canonicalUrl: "https://mirror.example.test/opportunities/9002",
    });
    expect(laterDeadline.canonicalKey).not.toBe(primary.canonicalKey);
    expect(await repository.save(laterDeadline, [], [])).toBe("created");
    expect(await countByTitle()).toBe(2);

    // The database, not just the TypeScript contract, enforces the key format:
    // the superseded `ck1_`/md5 scheme can never be written.
    await expect(
      context.executor.query(
        "UPDATE public.opportunities SET dedupe_key = 'ck1_0123456789abcdef' WHERE title = $1",
        [title],
      ),
    ).rejects.toThrow(/dedupe_key/u);
    // Connection still usable after the constraint rejection.
    expect(await countByTitle()).toBe(2);
  });

  it("tracks run counts and source health together", async () => {
    const runId = await repository.beginRun(sourceOneId, new Date().toISOString());
    await repository.finishRun({
      runId,
      status: "completed_with_errors",
      discovered: 4,
      parsedCount: 3,
      acceptedCount: 2,
      duplicateCount: 1,
      failedCount: 1,
      created: 1,
      updated: 1,
      unchanged: 0,
      rejected: 1,
      pendingReview: 1,
    }, new Date(Date.now() + 10).toISOString());
    const run = await context.executor.query<{
      status: string;
      discovered_count: number;
      parsed_count: number;
      accepted_count: number;
      duplicate_count: number;
      failed_count: number;
      collector_identifier: string;
      execution_duration_ms: number;
    }>(
      `SELECT status, discovered_count, parsed_count, accepted_count,
              duplicate_count, failed_count, collector_identifier,
              execution_duration_ms
       FROM public.ingestion_runs WHERE id = $1`,
      [runId],
    );
    expect(run.rows[0]).toMatchObject({
      status: "completed_with_errors",
      discovered_count: 4,
      parsed_count: 3,
      accepted_count: 2,
      duplicate_count: 1,
      failed_count: 1,
      collector_identifier: "source-one",
    });
    expect(run.rows[0]?.execution_duration_ms).toBeGreaterThanOrEqual(0);
  });

  it("atomically claims jobs, expires leases, retries and dead-letters exhausted jobs", async () => {
    const concurrentJob = await repository.enqueueJob({
      sourceId: sourceOneId,
      jobType: "health_check",
      idempotencyKey: "concurrent-claim",
      maximumRetries: 2,
    });
    const parallelClaims = await Promise.all([
      repository.claimNextJob("worker-a"),
      repository.claimNextJob("worker-b"),
    ]);
    const claimed = parallelClaims.filter((result) => result !== null);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.job.id).toBe(concurrentJob.id);
    const initial = claimed[0];
    if (!initial) throw new Error("Expected a single atomic claim.");

    await context.executor.query(
      `UPDATE public.ingestion_jobs
       SET locked_until = now() - interval '1 second'
       WHERE id = $1`,
      [concurrentJob.id],
    );
    await expect(repository.completeJob(initial.lease)).rejects.toBeInstanceOf(JobLeaseError);
    const reclaimed = await repository.claimNextJob("worker-c");
    expect(reclaimed?.job.attemptCount).toBe(2);
    if (!reclaimed) throw new Error("Expired lease was not reclaimed.");
    const retry = await repository.failJob(reclaimed.lease, new Error("temporary failure"));
    expect(retry.status).toBe("pending");
    await context.executor.query(
      `UPDATE public.ingestion_jobs
       SET next_execution_at = now() - interval '1 second'
       WHERE id = $1`,
      [concurrentJob.id],
    );
    const lastAttempt = await repository.claimNextJob("worker-d");
    expect(lastAttempt?.job.attemptCount).toBe(3);
    if (!lastAttempt) throw new Error("Expected final retry to be claimable.");
    const deadLetter = await repository.failJob(
      lastAttempt.lease,
      new Error("authorization: token=private-value"),
    );
    expect(deadLetter.status).toBe("dead_lettered");
    expect(deadLetter.lastError).toContain("[REDACTED]");
    await expect(repository.completeJob(lastAttempt.lease)).rejects.toBeInstanceOf(JobLeaseError);
  });

  it("serializes concurrent jobs for one source while allowing another source to proceed", async () => {
    await Promise.all([
      repository.enqueueJob({
        sourceId: sourceOneId,
        jobType: "incremental_sync",
        idempotencyKey: "same-source-a",
        priority: 10,
      }),
      repository.enqueueJob({
        sourceId: sourceOneId,
        jobType: "incremental_sync",
        idempotencyKey: "same-source-b",
        priority: 20,
      }),
      repository.enqueueJob({
        sourceId: sourceTwoId,
        jobType: "incremental_sync",
        idempotencyKey: "other-source",
        priority: 5,
      }),
    ]);

    const firstClaims = await Promise.all([
      repository.claimNextJob("parallel-a"),
      repository.claimNextJob("parallel-b"),
      repository.claimNextJob("parallel-c"),
    ]);
    const claimed = firstClaims.filter(
      (claim): claim is NonNullable<typeof claim> => claim !== null,
    );
    expect(claimed).toHaveLength(2);
    expect(new Set(claimed.map(({ job }) => job.sourceId)).size).toBe(2);

    await Promise.all(claimed.map(({ lease }) => repository.completeJob(lease)));
    const finalClaim = await repository.claimNextJob("same-source-final");
    expect(finalClaim?.job.sourceId).toBe(sourceOneId);
    if (!finalClaim) throw new Error("The unclaimed same-source job should become available.");
    await repository.completeJob(finalClaim.lease);
  });

  it("rolls back all writes in a failed transaction", async () => {
    const before = await context.executor.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM public.ingestion_jobs`,
    );
    await expect(context.executor.transaction(async (transaction) => {
      await transaction.query(
        `INSERT INTO public.ingestion_jobs (
           source_id, job_type, idempotency_key
         ) VALUES ($1, 'full_sync', 'rollback-case')`,
        [sourceOneId],
      );
      throw new Error("force rollback");
    })).rejects.toThrow("force rollback");
    const after = await context.executor.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM public.ingestion_jobs`,
    );
    expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
  });

  it("atomically schedules a due source and advances its next collection time", async () => {
    const nextScheduledCollectionAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const input = {
      sourceId: sourceTwoId,
      jobType: "incremental_sync" as const,
      idempotencyKey: "scheduled-source-two",
      nextExecutionAt: new Date().toISOString(),
      nextScheduledCollectionAt,
      minimumCollectionIntervalMs: 15 * 60 * 1000,
    };
    const concurrentJobs = await Promise.all([
      repository.enqueueScheduledJob(input),
      repository.enqueueScheduledJob(input),
    ]);
    expect(concurrentJobs.filter(Boolean)).toHaveLength(1);
    const job = concurrentJobs.find((candidate) => candidate !== null);
    if (!job) throw new Error("Expected the due source to create a scheduled job.");
    expect(job?.status).toBe("pending");
    expect(await repository.enqueueScheduledJob(input)).toBeNull();

    const source = await repository.getSourceById(sourceTwoId);
    expect(source?.nextScheduledCollectionAt).toBe(nextScheduledCollectionAt);
    const dueSources = await repository.listApprovedActiveSources({
      limit: 10,
      minimumCollectionIntervalMs: 15 * 60 * 1000,
      connectorIds: ["source-two"],
    });
    expect(dueSources).toHaveLength(0);

    await context.executor.query(
      `UPDATE public.ingestion_jobs
       SET status = 'succeeded', started_at = now(), completed_at = now()
       WHERE id = $1`,
      [job.id],
    );
    await context.executor.query(
      `UPDATE public.opportunity_sources
       SET next_scheduled_collection_at = NULL
       WHERE id = $1`,
      [sourceTwoId],
    );
    expect(await repository.enqueueScheduledJob(input)).toBeNull();
    expect((await repository.getSourceById(sourceTwoId))?.nextScheduledCollectionAt)
      .toBe(nextScheduledCollectionAt);
  });

  async function countSourceRecords() {
    const result = await context.executor.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM public.opportunity_source_records",
    );
    return result.rows[0]?.count ?? 0;
  }
});

async function insertCollectableSource(
  executor: Awaited<ReturnType<typeof createMigratedTestDatabase>>["executor"],
  id: string,
  connectorIdentifier: string,
): Promise<void> {
  await executor.query(
    `INSERT INTO public.opportunity_sources (
       id, name, publisher, official_website, source_category, source_type,
       access_method, supported_categories, languages, publication_frequency,
       expected_refresh_hours, reliability_status, licensing_status, terms_status,
       permissions_evidence_url, license_url, terms_url, reuse_permission_status,
       connector_identifier, approval_status, activation_status, integration_status
     ) VALUES (
       $1, $2, $3, $4, 'government', 'api', 'api',
       ARRAY['government'], ARRAY['en-GB'], 'Daily', 24,
       'verified', 'approved', 'verified', $4 || '/permissions',
       $4 || '/license', $4 || '/terms', 'permitted',
       $5, 'approved', 'active', 'operational'
     )`,
    [id, `Test source ${connectorIdentifier}`, connectorIdentifier, `https://${connectorIdentifier}.example.test`, connectorIdentifier],
  );
  await executor.query(
    `INSERT INTO public.source_country_coverage (
       source_id, country_code, category_code, coverage_status,
       verified_at, verification_evidence_url
     ) VALUES ($1, 'GB', 'government', 'verified', now(), $2)`,
    [id, `https://${connectorIdentifier}.example.test/coverage`],
  );
}

function normalized(
  sourceId: string,
  mapping: CategoryMapping,
  overrides: Record<string, unknown> = {},
): NormalizedOpportunity {
  const parsed = parsedSourceOpportunitySchema.parse({
    ...baseOpportunity,
    ...overrides,
  });
  const result = normalizeOpportunity(sourceId, parsed, [mapping]);
  if (!result) throw new Error("Test fixture did not match its approved taxonomy.");
  return result.opportunity;
}

function rawEnvelope(
  sourceId: string,
  externalRecordId: string,
  checksumLetter: string,
): RawSourceRecordEnvelope {
  const payloadJson = { id: externalRecordId, checksumLetter };
  const checksum = createHash("sha256").update(JSON.stringify(payloadJson)).digest("hex");
  return {
    sourceId,
    externalRecordId,
    sourceUrl,
    contentType: "application/json",
    payloadJson,
    payloadChecksum: checksum,
    collectionRunId: null,
  };
}

function cursorUpdate(sourceId: string) {
  return {
    sourceId,
    cursorName: "default",
    cursorValue: "page-2",
    paginationToken: "page-token-2",
    lastSeenExternalId: "notice-42",
    etag: '"fixture-etag"',
    lastModified: "Tue, 10 Nov 2026 10:00:00 GMT",
    state: { page: 2 },
    synchronizedAt: new Date().toISOString(),
    cursorVersion: 0,
  };
}
