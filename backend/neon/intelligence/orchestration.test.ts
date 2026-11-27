// @vitest-environment node

import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { SourceRegistryRecord } from "./contracts";
import type {
  EnqueueScheduledIngestionJobInput,
  JobLease,
} from "./neon-ingestion-repository";
import type {
  IngestionSummary,
  SourceConnector,
  StoredOpportunity,
} from "./ingestion";
import type { OrchestrationRepository } from "./orchestration";
import {
  dispatchDueJobs,
  scheduleDueSources,
  type CollectorSourceExecutionProfile,
  type SourceExecutionProfile,
} from "./orchestration";
import type {
  IngestionJob,
  SourceCursor,
} from "./persistence-contracts";

const now = new Date("2026-11-11T12:00:00.000Z");
function source(overrides: Partial<SourceRegistryRecord> = {}): SourceRegistryRecord {
  return {
    id: randomUUID(),
    name: "Approved fixture source",
    publisher: "Fixture publisher",
    website: "https://procurement.example.test",
    sourceCategory: "government",
    sourceType: "api",
    accessMethod: "api",
    apiOrFeedUrl: "https://procurement.example.test/api",
    connectorIdentifier: "fixture-connector",
    coverageScope: "country",
    coverageRegionCodes: [],
    apiOrFeedAvailable: true,
    opportunityCategories: ["government"],
    languages: ["en"],
    publicationFrequency: "Daily",
    expectedRefreshHours: 24,
    reliability: "verified",
    licensingStatus: "approved",
    termsStatus: "verified",
    permissionsEvidenceUrl: "https://procurement.example.test/terms",
    licenseUrl: "https://procurement.example.test/license",
    termsUrl: "https://procurement.example.test/terms",
    reusePermissionStatus: "permitted",
    attributionRequirements: null,
    robotsRestrictions: null,
    retentionRestrictions: null,
    rateLimitRequests: 60,
    rateLimitWindowSeconds: 3600,
    approvalStatus: "approved",
    approvalConstraints: [],
    approvalConstraintsEnforced: false,
    approvalExpiresAt: null,
    activationStatus: "active",
    integrationStatus: "operational",
    lastSuccessfulRetrieval: null,
    lastUnsuccessfulRetrieval: null,
    nextScheduledCollectionAt: null,
    ...overrides,
  };
}

function profile(
  overrides: Partial<CollectorSourceExecutionProfile> = {},
): CollectorSourceExecutionProfile {
  return {
    framework: "cheerio",
    adapter: {
      adapterId: "fixture-listing",
      format: "html",
      recordSelector: ".notice",
      fields: { externalId: { selector: ".id", required: true } },
    },
    limits: {
      maxPages: 2,
      maxRecords: 10,
      maxRequests: 4,
      timeoutMs: 2000,
      maxResponseBytes: 100_000,
      maxTotalBytes: 200_000,
      minimumRequestIntervalMs: 250,
    },
    mappings: [],
    ...overrides,
  };
}

function pendingJob(
  sourceId: string,
  overrides: Partial<IngestionJob> = {},
): IngestionJob {
  const timestamp = now.toISOString();
  return {
    id: randomUUID(),
    sourceId,
    jobType: "incremental_sync",
    priority: 100,
    status: "pending",
    attemptCount: 0,
    maximumRetries: 2,
    nextExecutionAt: timestamp,
    lockedBy: null,
    lockedUntil: null,
    leaseToken: null,
    lastError: null,
    idempotencyKey: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

class FakeRepository implements OrchestrationRepository {
  readonly sources = new Map<string, SourceRegistryRecord>();
  readonly jobs: IngestionJob[] = [];
  readonly enqueuedInputs: EnqueueScheduledIngestionJobInput[] = [];
  readonly completedCursors: Array<{ cursor: SourceCursor; expectedVersion: number }> = [];
  readonly claimOrder: string[] = [];
  finishedRuns: IngestionSummary[] = [];
  activeDiscoveries = 0;
  maximumActiveDiscoveries = 0;
  discoveryError = false;

  constructor(sources: readonly SourceRegistryRecord[]) {
    for (const item of sources) this.sources.set(item.id, item);
  }

  async listApprovedActiveSources() {
    return [...this.sources.values()];
  }

  async enqueueScheduledJob(input: EnqueueScheduledIngestionJobInput) {
    this.enqueuedInputs.push(input);
    if (this.jobs.some((job) =>
      job.sourceId === input.sourceId &&
      job.jobType === input.jobType &&
      job.idempotencyKey === input.idempotencyKey
    )) return null;
    const job = pendingJob(input.sourceId, {
      priority: input.priority ?? 100,
      maximumRetries: input.maximumRetries ?? 5,
      nextExecutionAt: input.nextExecutionAt ?? now.toISOString(),
      idempotencyKey: input.idempotencyKey,
    });
    this.jobs.push(job);
    return job;
  }

  async claimNextJob(
    workerId: string,
    _leaseSeconds = 60,
    supportedConnectorIds?: readonly string[],
  ) {
    const job = this.jobs
      .filter((candidate) =>
        candidate.status === "pending" &&
        Date.parse(candidate.nextExecutionAt) <= now.getTime() &&
        (supportedConnectorIds === undefined ||
          supportedConnectorIds.includes(
            this.sources.get(candidate.sourceId)?.connectorIdentifier ?? "",
          ))
      )
      .sort((left, right) => left.priority - right.priority)[0];
    if (!job) return null;
    this.claimOrder.push(job.id);
    job.status = "running";
    job.attemptCount += 1;
    job.lockedBy = workerId;
    job.lockedUntil = new Date(now.getTime() + _leaseSeconds * 1000).toISOString();
    job.leaseToken = randomUUID();
    job.startedAt = now.toISOString();
    return {
      job,
      lease: { jobId: job.id, workerId, leaseToken: job.leaseToken },
    };
  }

  async renewJobLease(lease: JobLease) {
    const job = this.requireLease(lease);
    job.lockedUntil = new Date(now.getTime() + 60_000).toISOString();
    return job;
  }

  async completeJob(
    lease: JobLease,
    cursorCommit?: { cursor: SourceCursor; expectedVersion: number },
  ) {
    const job = this.requireLease(lease);
    job.status = "succeeded";
    job.lockedBy = null;
    job.lockedUntil = null;
    job.leaseToken = null;
    job.completedAt = now.toISOString();
    if (cursorCommit) this.completedCursors.push(cursorCommit);
    return job;
  }

  async failJob(lease: JobLease, error: unknown, retryable = true) {
    const job = this.requireLease(lease);
    job.lastError = error instanceof Error ? error.message : "failed";
    job.lockedBy = null;
    job.lockedUntil = null;
    job.leaseToken = null;
    if (!retryable || job.attemptCount >= job.maximumRetries + 1) {
      job.status = "dead_lettered";
      job.completedAt = now.toISOString();
    } else {
      job.status = "pending";
      job.nextExecutionAt = new Date(now.getTime() + 1000).toISOString();
    }
    return job;
  }

  async getCursor() {
    return null;
  }

  async beginRun() {
    return randomUUID();
  }

  async beginRunForJob() {
    return randomUUID();
  }

  async getSourceForIngestion(sourceId: string) {
    const value = this.sources.get(sourceId);
    return value && isApproved(value) ? value : null;
  }

  async findSourceRecord() {
    return null;
  }

  async listOpportunities(): Promise<readonly StoredOpportunity[]> {
    return [];
  }

  async save(): Promise<"created"> {
    return "created";
  }

  async reject(): Promise<void> {}

  async review(): Promise<void> {}

  async finishRun(summary: IngestionSummary): Promise<void> {
    this.finishedRuns.push(summary);
  }

  async storeRawRecord(): Promise<{ id: string; inserted: boolean; processingState: string }> {
    throw new Error("No records are expected in this test.");
  }

  async markRawProcessing(): Promise<void> {}

  async markRawProcessingFailure(): Promise<void> {}

  async markRawReview(): Promise<void> {}

  async markRawAcceptedByExternalId(): Promise<void> {}

  private requireLease(lease: JobLease): IngestionJob {
    const job = this.jobs.find((candidate) =>
      candidate.id === lease.jobId &&
      candidate.status === "running" &&
      candidate.lockedBy === lease.workerId &&
      candidate.leaseToken === lease.leaseToken
    );
    if (!job) throw new Error("Job lease is no longer valid.");
    return job;
  }
}

function isApproved(item: SourceRegistryRecord): boolean {
  return item.activationStatus === "active" &&
    item.integrationStatus === "operational" &&
    ["approved", "approved_with_constraints"].includes(item.approvalStatus) &&
    (item.approvalExpiresAt === null || Date.parse(item.approvalExpiresAt) > now.getTime());
}

describe("durable ingestion orchestration", () => {
  it("schedules due sources at their individual cadence and enforces a global minimum interval", async () => {
    const first = source({
      expectedRefreshHours: 1,
      lastSuccessfulRetrieval: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    });
    const tooSoon = source({
      expectedRefreshHours: 1,
      lastSuccessfulRetrieval: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    });
    const slower = source({
      expectedRefreshHours: 24,
      lastSuccessfulRetrieval: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    });
    const repository = new FakeRepository([first, tooSoon, slower]);
    const profiles = new Map([["fixture-connector", profile({ priority: 25 })]]);
    const options = {
      now: () => now,
      minimumCollectionIntervalMs: 15 * 60 * 1000,
      priorityForSource: () => 10,
    };

    const firstTick = await scheduleDueSources(repository, profiles, options);
    const repeatedTick = await scheduleDueSources(repository, profiles, options);

    expect(firstTick).toMatchObject({
      enqueued: 1,
      skippedNotDue: 2,
      skippedUnsupported: 0,
    });
    expect(repeatedTick.enqueued).toBe(0);
    expect(repeatedTick.duplicateOrRace).toBe(1);
    expect(repository.enqueuedInputs[0]).toMatchObject({
      sourceId: first.id,
      priority: 10,
      jobType: "incremental_sync",
    });
  });

  it("never blocks on approval labels: every wired source collects", async () => {
    const conditional = source({
      approvalStatus: "approved_with_constraints",
      reusePermissionStatus: "conditional",
      approvalConstraints: ["No raw payload retention"],
      approvalConstraintsEnforced: true,
    });
    const unenforced = source({
      approvalStatus: "approved_with_constraints",
      reusePermissionStatus: "conditional",
      approvalConstraints: ["No raw payload retention"],
      approvalConstraintsEnforced: false,
    });
    const expired = source({
      approvalExpiresAt: new Date(now.getTime() - 1000).toISOString(),
    });
    const unsupported = source({ connectorIdentifier: "no-profile" });
    const repository = new FakeRepository([
      conditional,
      unenforced,
      expired,
      unsupported,
    ]);
    const result = await scheduleDueSources(
      repository,
      new Map([["fixture-connector", profile()]]),
      { now: () => now },
    );
    expect(result).toMatchObject({
      enqueued: 3,
      skippedUnsupported: 1,
      rejectedByRepository: 0,
    });
    expect(repository.enqueuedInputs).toHaveLength(3);
    expect(repository.enqueuedInputs.map((input) => input.sourceId)).toEqual(
      expect.arrayContaining([conditional.id, unenforced.id, expired.id]),
    );
  });

  it("prioritizes bounded parallel jobs and commits cursors only after clean ingestion", async () => {
    const first = source({ expectedRefreshHours: 1 });
    const second = source({ expectedRefreshHours: 1 });
    const repository = new FakeRepository([first, second]);
    repository.jobs.push(
      pendingJob(first.id, { priority: 20 }),
      pendingJob(second.id, { priority: 10 }),
    );
    const profiles = new Map([["fixture-connector", profile()]]);

    const result = await dispatchDueJobs(repository, profiles, {
      workerId: "test-dispatcher",
      now: () => now,
      maximumJobs: 2,
      maximumConcurrency: 2,
      leaseSeconds: 60,
      connectorFactory(sourceValue) {
        return createTestConnector(sourceValue.id, repository, false);
      },
    });

    expect(result).toMatchObject({ claimed: 2, succeeded: 2, retried: 0 });
    expect(repository.completedCursors).toHaveLength(2);
    expect(repository.finishedRuns).toHaveLength(2);
    expect(repository.maximumActiveDiscoveries).toBe(2);
    expect(repository.claimOrder[0]).toBe(repository.jobs[1]?.id);
    expect(repository.jobs.map((job) => job.status)).toEqual(["succeeded", "succeeded"]);
  });

  it("retries failed discovery without advancing the source cursor", async () => {
    const item = source({ expectedRefreshHours: 1 });
    const repository = new FakeRepository([item]);
    repository.jobs.push(pendingJob(item.id));
    const result = await dispatchDueJobs(
      repository,
      new Map([["fixture-connector", profile()]]),
      {
        workerId: "test-dispatcher",
        now: () => now,
        maximumJobs: 1,
        maximumConcurrency: 1,
        connectorFactory(sourceValue) {
          return createTestConnector(sourceValue.id, repository, true);
        },
      },
    );
    expect(result).toMatchObject({ claimed: 1, retried: 1, succeeded: 0 });
    expect(repository.completedCursors).toHaveLength(0);
    expect(repository.jobs[0]?.status).toBe("pending");
    expect(repository.finishedRuns[0]?.status).toBe("failed");
  });

  it("dispatches native API profiles without invoking the collector runner", async () => {
    const nativeSource = source({ connectorIdentifier: "native-api" });
    const repository = new FakeRepository([nativeSource]);
    repository.jobs.push(pendingJob(nativeSource.id));
    const profiles = new Map<string, SourceExecutionProfile>([[
      "native-api",
      {
        kind: "native",
        mappings: [],
        createConnector(sourceValue) {
          return createTestConnector(sourceValue.id, repository, false);
        },
      },
    ]]);

    const result = await dispatchDueJobs(repository, profiles, {
      workerId: "native-dispatcher",
      now: () => now,
      maximumJobs: 1,
      maximumConcurrency: 1,
      connectorFactory() {
        throw new Error("Native API profiles must not invoke the collector runner.");
      },
    });

    expect(result).toMatchObject({ claimed: 1, succeeded: 1, failed: 0 });
    expect(repository.completedCursors).toHaveLength(1);
    expect(repository.completedCursors[0]?.cursor.cursorValue).toBe("next-page");
  });

  it("reduces each source execution request budget to its configured rate limit", async () => {
    const item = source({
      expectedRefreshHours: 1,
      rateLimitRequests: 10,
      rateLimitWindowSeconds: 3600,
    });
    const repository = new FakeRepository([item]);
    repository.jobs.push(pendingJob(item.id));
    let requestLimit = 0;
    await dispatchDueJobs(
      repository,
      new Map([["fixture-connector", profile({
        limits: {
          ...profile().limits,
          maxRequests: 100,
        },
      })]]),
      {
        workerId: "test-dispatcher",
        now: () => now,
        maximumJobs: 1,
        maximumConcurrency: 1,
        connectorFactory(sourceValue, options) {
          requestLimit = options.limits.maxRequests;
          return createTestConnector(sourceValue.id, repository, false);
        },
      },
    );
    expect(requestLimit).toBe(10);
  });

  it("dead-letters a source whose approval expired after scheduling", async () => {
    const item = source({ expectedRefreshHours: 1 });
    const repository = new FakeRepository([item]);
    repository.jobs.push(pendingJob(item.id, { maximumRetries: 0 }));
    repository.sources.set(item.id, {
      ...item,
      approvalExpiresAt: new Date(now.getTime() - 1000).toISOString(),
    });
    const result = await dispatchDueJobs(
      repository,
      new Map([["fixture-connector", profile()]]),
      {
        workerId: "test-dispatcher",
        now: () => now,
        maximumJobs: 1,
        maximumConcurrency: 1,
        connectorFactory() {
          throw new Error("Expired sources must never reach collector setup.");
        },
      },
    );
    expect(result).toMatchObject({ claimed: 1, deadLettered: 1 });
    expect(repository.completedCursors).toHaveLength(0);
  });
});

function createTestConnector(
  sourceId: string,
  repository: FakeRepository,
  failDiscovery: boolean,
): SourceConnector {
  return {
    sourceId,
    async discover() {
      if (failDiscovery) throw new Error("temporary fixture discovery failure");
      repository.activeDiscoveries += 1;
      repository.maximumActiveDiscoveries = Math.max(
        repository.maximumActiveDiscoveries,
        repository.activeDiscoveries,
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
      repository.activeDiscoveries -= 1;
      return [];
    },
    async retrieve() {
      throw new Error("No fixture record is expected.");
    },
    async parse() {
      return null;
    },
    async toRawSourceRecord() {
      throw new Error("No fixture record is expected.");
    },
    nextCursor() {
      return "next-page";
    },
  };
}
