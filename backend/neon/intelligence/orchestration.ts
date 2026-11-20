import type { CategoryMapping, SourceRegistryRecord } from "./contracts";
import type {
  EnqueueScheduledIngestionJobInput,
  JobLease,
} from "./neon-ingestion-repository";
import type {
  IngestionJob,
  SourceCursor,
} from "./persistence-contracts";
import {
  runIngestion,
  type IngestionRepository,
  type SourceConnector,
} from "./ingestion";
import type { CollectorIngestionOptions } from "./collector-source-connector";

const millisecondsPerHour = 60 * 60 * 1000;

export type SourceMappingProvider =
  | readonly CategoryMapping[]
  | ((source: SourceRegistryRecord) => readonly CategoryMapping[]);

export type NativeSourceConnectorOptions = Pick<
  CollectorIngestionOptions,
  "jobId" | "currentCursor"
> & {
  browser?: unknown;
};

export type CollectorSourceExecutionProfile = Omit<
  CollectorIngestionOptions,
  "jobId" | "currentCursor"
> & {
  kind?: "collector";
  mappings: SourceMappingProvider;
  priority?: number;
};

export type NativeSourceExecutionProfile = {
  kind: "native";
  mappings: SourceMappingProvider;
  priority?: number;
  createConnector(
    source: SourceRegistryRecord,
    options: NativeSourceConnectorOptions,
  ): SourceConnector;
};

export type SourceExecutionProfile =
  | CollectorSourceExecutionProfile
  | NativeSourceExecutionProfile;

export type SourceScheduleQuery = {
  limit: number;
  minimumCollectionIntervalMs: number;
  connectorIds: readonly string[];
};

export type OrchestrationRepository = IngestionRepository & {
  listApprovedActiveSources(
    query?: SourceScheduleQuery,
  ): Promise<SourceRegistryRecord[]>;
  enqueueScheduledJob(input: EnqueueScheduledIngestionJobInput): Promise<IngestionJob | null>;
  claimNextJob(
    workerId: string,
    leaseSeconds?: number,
    supportedConnectorIds?: readonly string[],
  ): Promise<{ job: IngestionJob; lease: JobLease } | null>;
  renewJobLease(lease: JobLease, leaseSeconds?: number): Promise<IngestionJob>;
  completeJob(
    lease: JobLease,
    cursorCommit?: { cursor: SourceCursor; expectedVersion: number },
  ): Promise<IngestionJob>;
  failJob(lease: JobLease, error: unknown, retryable?: boolean): Promise<IngestionJob>;
  getCursor(sourceId: string, cursorName?: string): Promise<SourceCursor | null>;
};

export type SchedulerOptions = {
  now?: () => Date;
  maximumSourcesPerTick?: number;
  minimumCollectionIntervalMs?: number;
  maximumRetries?: number;
  priorityForSource?: (source: SourceRegistryRecord) => number;
};

export type ScheduleResult = {
  examined: number;
  enqueued: number;
  skippedNotDue: number;
  skippedUnsupported: number;
  rejectedByRepository: number;
  duplicateOrRace: number;
  enqueueFailures: number;
};

export async function scheduleDueSources(
  repository: Pick<OrchestrationRepository, "listApprovedActiveSources" | "enqueueScheduledJob">,
  profiles: ReadonlyMap<string, SourceExecutionProfile>,
  options: SchedulerOptions = {},
): Promise<ScheduleResult> {
  const now = options.now ?? (() => new Date());
  const maximumSources = boundedInteger(options.maximumSourcesPerTick ?? 250, 1, 1000);
  const minimumIntervalMs = boundedInteger(
    options.minimumCollectionIntervalMs ?? 15 * 60 * 1000,
    60 * 1000,
    30 * 24 * millisecondsPerHour,
  );
  const sources = await repository.listApprovedActiveSources({
    limit: maximumSources,
    minimumCollectionIntervalMs: minimumIntervalMs,
    connectorIds: [...profiles.keys()],
  });
  const result: ScheduleResult = {
    examined: 0,
    enqueued: 0,
    skippedNotDue: 0,
    skippedUnsupported: 0,
    rejectedByRepository: 0,
    duplicateOrRace: 0,
    enqueueFailures: 0,
  };
  const currentTime = now();
  const currentMs = currentTime.getTime();
  if (!Number.isFinite(currentMs)) throw new Error("Scheduler clock returned an invalid date.");

  for (const source of sources) {
    if (result.enqueued >= maximumSources) break;
    result.examined += 1;
    if (!isSourceEligible(source, currentTime) || !source.connectorIdentifier) {
      result.rejectedByRepository += 1;
      continue;
    }
    const profile = profiles.get(source.connectorIdentifier);
    if (!profile) {
      result.skippedUnsupported += 1;
      continue;
    }
    const sourceIntervalMs = Math.max(
      minimumIntervalMs,
      source.expectedRefreshHours * millisecondsPerHour,
    );
    const lastSuccess = source.lastSuccessfulRetrieval
      ? Date.parse(source.lastSuccessfulRetrieval)
      : null;
    const configuredDue = source.nextScheduledCollectionAt
      ? Date.parse(source.nextScheduledCollectionAt)
      : lastSuccess === null ? 0 : lastSuccess + sourceIntervalMs;
    if (!Number.isFinite(configuredDue)) {
      result.rejectedByRepository += 1;
      continue;
    }
    const minimumDue = lastSuccess === null ? 0 : lastSuccess + sourceIntervalMs;
    const dueAt = Math.max(configuredDue, minimumDue);
    if (dueAt > currentMs) {
      result.skippedNotDue += 1;
      continue;
    }

    const priority = options.priorityForSource?.(source) ?? profile.priority ?? 100;
    if (!Number.isInteger(priority) || priority < 0 || priority > 1000) {
      throw new Error(`Scheduler priority for source "${source.id}" is invalid.`);
    }
    const slot = Math.floor(currentMs / sourceIntervalMs);
    let job: Awaited<ReturnType<typeof repository.enqueueScheduledJob>>;
    try {
      job = await repository.enqueueScheduledJob({
        sourceId: source.id,
        jobType: "incremental_sync",
        idempotencyKey: `scheduled-v1:${slot}`,
        priority,
        maximumRetries: options.maximumRetries ?? 5,
        nextExecutionAt: currentTime.toISOString(),
        nextScheduledCollectionAt: new Date(currentMs + sourceIntervalMs).toISOString(),
        minimumCollectionIntervalMs: minimumIntervalMs,
      });
    } catch (error) {
      // One source's enqueue failure (data constraint, transient db error)
      // must not abort the tick for the remaining sources — the same
      // single-bad-row principle that already applies to mapping.
      result.enqueueFailures += 1;
      console.error(
        `Scheduler enqueue failed for source "${source.id}" (${source.name}); continuing.`,
        {
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorMessage: error instanceof Error ? error.message.slice(0, 500) : String(error),
        },
      );
      continue;
    }
    if (job) result.enqueued += 1;
    else result.duplicateOrRace += 1;
  }
  return result;
}

export type DispatcherOptions = {
  browser?: unknown;
  workerId: string;
  now?: () => Date;
  maximumJobs?: number;
  maximumConcurrency?: number;
  maximumExecutionMs?: number;
  leaseSeconds?: number;
  leaseRenewalIntervalMs?: number;
  minimumCollectionIntervalMs?: number;
  connectorFactory(
    source: SourceRegistryRecord,
    options: CollectorIngestionOptions,
  ): SourceConnector;
};

export type DispatchResult = {
  claimed: number;
  succeeded: number;
  retried: number;
  deadLettered: number;
  failed: number;
};

export async function dispatchDueJobs(
  repository: OrchestrationRepository,
  profiles: ReadonlyMap<string, SourceExecutionProfile>,
  options: DispatcherOptions,
): Promise<DispatchResult> {
  if (!options.workerId.trim() || options.workerId.length > 200) {
    throw new Error("Dispatcher worker ID is invalid.");
  }
  const maximumJobs = boundedInteger(options.maximumJobs ?? 10, 1, 100);
  const maximumConcurrency = boundedInteger(
    options.maximumConcurrency ?? 2,
    1,
    Math.min(20, maximumJobs),
  );
  const maximumExecutionMs = boundedInteger(
    options.maximumExecutionMs ?? 5 * 60 * 1000,
    1000,
    15 * 60 * 1000,
  );
  const leaseSeconds = boundedInteger(options.leaseSeconds ?? 60, 5, 3600);
  const renewalMs = boundedInteger(
    options.leaseRenewalIntervalMs ?? Math.floor(leaseSeconds * 1000 / 3),
    1000,
    Math.max(1000, Math.floor(leaseSeconds * 1000 / 2)),
  );
  const connectorIds = [...profiles.keys()];
  const result: DispatchResult = {
    claimed: 0,
    succeeded: 0,
    retried: 0,
    deadLettered: 0,
    failed: 0,
  };
  if (connectorIds.length === 0) return result;

  const now = options.now ?? (() => new Date());
  const startedAt = now().getTime();
  let reservations = 0;
  const runWorker = async () => {
    while (reservations < maximumJobs && now().getTime() - startedAt < maximumExecutionMs) {
      reservations += 1;
      let claimed: Awaited<ReturnType<OrchestrationRepository["claimNextJob"]>>;
      try {
        claimed = await repository.claimNextJob(
          options.workerId,
          leaseSeconds,
          connectorIds,
        );
      } catch (error) {
        result.failed += 1;
        throw error;
      }
      if (!claimed) return;
      result.claimed += 1;
      const outcome = await executeClaimedJob(
        repository,
        claimed,
        profiles,
        options,
        now,
        leaseSeconds,
        renewalMs,
      );
      result[outcome] += 1;
    }
  };

  await Promise.all(
    Array.from({ length: maximumConcurrency }, () => runWorker()),
  );
  return result;
}

async function executeClaimedJob(
  repository: OrchestrationRepository,
  claimed: { job: IngestionJob; lease: JobLease },
  profiles: ReadonlyMap<string, SourceExecutionProfile>,
  options: DispatcherOptions,
  now: () => Date,
  leaseSeconds: number,
  renewalMs: number,
): Promise<"succeeded" | "retried" | "deadLettered" | "failed"> {
  const abortController = new AbortController();
  let heartbeatError: unknown = null;
  let heartbeatOperation: Promise<void> | null = null;
  const heartbeat = setInterval(() => {
    if (heartbeatOperation || heartbeatError) return;
    heartbeatOperation = repository.renewJobLease(claimed.lease, leaseSeconds)
      .then(() => undefined)
      .catch((error: unknown) => {
        heartbeatError = error;
        abortController.abort(error);
      })
      .finally(() => {
        heartbeatOperation = null;
      });
  }, renewalMs);
  heartbeat.unref?.();

  try {
    const source = await repository.getSourceForIngestion(claimed.job.sourceId);
    if (!source || !isSourceEligible(source, now()) || !source.connectorIdentifier) {
      throw new NonRetryableJobError("Source approval or activation is no longer valid.");
    }
    const profile = profiles.get(source.connectorIdentifier);
    if (!profile) throw new NonRetryableJobError("No collector execution profile is registered.");
    const previousCursor = await repository.getCursor(source.id);
    const connectorOptions = {
      jobId: claimed.job.id,
      currentCursor: previousCursor?.cursorValue ?? previousCursor?.paginationToken ?? null,
      ...(options.browser ? { browser: options.browser } : {}),
    };
    const mappings = typeof profile.mappings === "function"
      ? profile.mappings(source)
      : profile.mappings;
    let connector: SourceConnector;
    if (profile.kind === "native") {
      connector = profile.createConnector(source, connectorOptions);
    } else {
      const collectorProfile: Omit<CollectorIngestionOptions, "jobId" | "currentCursor"> = {
        framework: profile.framework,
        adapter: profile.adapter,
        limits: profile.limits,
        ...(profile.sourceBaseUrl ? { sourceBaseUrl: profile.sourceBaseUrl } : {}),
        ...(profile.countryCode ? { countryCode: profile.countryCode } : {}),
      };
      const sourceIntervalMs = Math.max(
        options.minimumCollectionIntervalMs ?? 15 * 60 * 1000,
        source.expectedRefreshHours * millisecondsPerHour,
      );
      const rateLimitedRequestBudget =
        source.rateLimitRequests && source.rateLimitWindowSeconds
          ? Math.max(
            1,
            Math.floor(
              source.rateLimitRequests * sourceIntervalMs /
                (source.rateLimitWindowSeconds * 1000),
            ),
          )
          : collectorProfile.limits.maxRequests;
      connector = options.connectorFactory(source, {
        ...collectorProfile,
        limits: {
          ...collectorProfile.limits,
          maxRequests: Math.min(
            collectorProfile.limits.maxRequests,
            source.rateLimitRequests ?? Number.MAX_SAFE_INTEGER,
            rateLimitedRequestBudget,
          ),
        },
        ...connectorOptions,
      });
    }
    const summary = await runIngestion(
      connector,
      repository,
      mappings,
      now,
      {
        lease: claimed.lease,
        signal: abortController.signal,
        async assertLease() {
          if (heartbeatError) throw heartbeatError;
          if (abortController.signal.aborted) {
            throw abortController.signal.reason instanceof Error
              ? abortController.signal.reason
              : new Error("Job lease was lost.");
          }
        },
      },
    );
    if (summary.status === "failed") {
      throw new Error("Ingestion did not complete cleanly; the source cursor was not advanced.");
    }
    if (heartbeatError) throw heartbeatError;
    await repository.renewJobLease(claimed.lease, leaseSeconds);
    const nextCursor = connector.nextCursor?.();
    const cursorCommit = nextCursor === undefined
      ? undefined
      : {
        cursor: {
          sourceId: source.id,
          cursorName: previousCursor?.cursorName ?? "default",
          cursorValue: nextCursor,
          paginationToken: null,
          lastSeenExternalId: previousCursor?.lastSeenExternalId ?? null,
          etag: previousCursor?.etag ?? null,
          lastModified: previousCursor?.lastModified ?? null,
          state: previousCursor?.state ?? {},
          synchronizedAt: now().toISOString(),
          cursorVersion: previousCursor?.cursorVersion ?? 0,
        },
        expectedVersion: previousCursor?.cursorVersion ?? 0,
      };
    await repository.completeJob(claimed.lease, cursorCommit);
    return "succeeded";
  } catch (error) {
    const failure = heartbeatError ?? error;
    const finalJob = await repository.failJob(
      claimed.lease,
      failure,
      !(failure instanceof NonRetryableJobError),
    );
    return finalJob.status === "dead_lettered" ? "deadLettered" : "retried";
  } finally {
    clearInterval(heartbeat);
    if (heartbeatOperation) await heartbeatOperation;
  }
}

class NonRetryableJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableJobError";
  }
}

function isSourceEligible(source: SourceRegistryRecord, now: Date): boolean {
  return source.activationStatus === "active" &&
    source.integrationStatus === "operational" &&
    ["approved", "approved_with_constraints"].includes(source.approvalStatus) &&
    ["verified", "reliable"].includes(source.reliability) &&
    ["api", "feed", "permitted_web"].includes(source.accessMethod) &&
    (source.approvalExpiresAt === null ||
      Date.parse(source.approvalExpiresAt) > now.getTime());
}

function boundedInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Orchestration configuration must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}
