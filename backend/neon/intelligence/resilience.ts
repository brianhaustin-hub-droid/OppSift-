import { z } from "zod";
import { uuidShapeSchema } from "./contracts";
import type { ConnectorError } from "./connectors";
import { SafeFetchError } from "./safe-fetch";

export const ingestionMessageSchema = z.object({
  messageVersion: z.literal(1),
  sourceId: uuidShapeSchema,
  ingestionRunId: uuidShapeSchema,
  operation: z.enum(["discover", "fetch", "process", "retry"]),
  cursor: z.string().max(2000).nullable().default(null),
  correlationId: z.string().uuid(),
  enqueuedAt: z.string().datetime({ offset: true }),
  attempt: z.number().int().min(0).max(10).default(0),
});

export type IngestionMessage = z.infer<typeof ingestionMessageSchema>;

export const sourceScheduleSchema = z.object({
  sourceId: uuidShapeSchema,
  enabled: z.boolean(),
  minimumIntervalMinutes: z.number().int().min(15).max(43_200),
  preferredUtcHour: z.number().int().min(0).max(23).nullable(),
  jitterMinutes: z.number().int().min(0).max(180),
  timeZone: z.string().min(1).max(80).refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Schedule timezone must be a recognized IANA identifier."),
  lastRunAt: z.string().datetime({ offset: true }).nullable(),
});

export type SourceSchedule = z.infer<typeof sourceScheduleSchema>;

export function isSourceDue(schedule: SourceSchedule, now: Date) {
  const parsed = sourceScheduleSchema.safeParse(schedule);
  if (!parsed.success || !schedule.enabled) return false;
  if (!schedule.lastRunAt) return true;
  const lastRun = Date.parse(schedule.lastRunAt);
  if (!Number.isFinite(lastRun)) return false;
  return now.getTime() - lastRun >= schedule.minimumIntervalMinutes * 60_000;
}

export function stableUtcScheduleSlot(sourceId: string, hour: number, minuteCount: number) {
  const hash = [...sourceId].reduce((value, character) => (value * 31 + character.charCodeAt(0)) >>> 0, 0);
  return (hour * 60 + (minuteCount > 0 ? hash % minuteCount : 0)) % 1440;
}

export type RetryPolicy = {
  maxRetries: number;
  minimumDelayMs: number;
  maximumDelayMs: number;
};

export type RetryDependencies = {
  sleep: (milliseconds: number) => Promise<void>;
  random: () => number;
};

export class ClassifiedRequestError extends Error {
  constructor(readonly details: ConnectorError) {
    super(details.message);
    this.name = "ClassifiedRequestError";
  }
}

function classifyError(error: unknown): ConnectorError {
  if (error instanceof ClassifiedRequestError) return error.details;
  if (error instanceof SafeFetchError) return error.details;
  if (error instanceof Error && error.name === "AbortError") {
    return { kind: "timeout", message: error.message || "Request timed out.", retryable: true };
  }
  return {
    kind: "network",
    message: error instanceof Error ? error.message : "Request failed with a non-Error value.",
    retryable: true,
  };
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  dependencies: RetryDependencies = {
    sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    random: Math.random,
  },
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      const classified = classifyError(error);
      if (!classified.retryable || attempt >= policy.maxRetries) {
        throw new ClassifiedRequestError(classified);
      }

      const exponentialDelay = Math.min(
        policy.maximumDelayMs,
        policy.minimumDelayMs * 2 ** attempt,
      );
      const jitter = Math.floor(Math.max(0, Math.min(1, dependencies.random())) * exponentialDelay * 0.25);
      const delay = Math.min(
        policy.maximumDelayMs,
        Math.max(classified.retryAfterMs ?? 0, exponentialDelay + jitter),
      );
      await dependencies.sleep(delay);
      attempt += 1;
    }
  }
}

export type CircuitState = {
  failures: number;
  openedAt: number | null;
};

export class SourceCircuitBreaker {
  private readonly states = new Map<string, CircuitState>();

  constructor(
    private readonly failureThreshold = 5,
    private readonly coolDownMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  isOpen(sourceId: string) {
    const state = this.states.get(sourceId);
    if (!state?.openedAt) return false;
    if (this.now() - state.openedAt >= this.coolDownMs) {
      this.states.set(sourceId, { failures: 0, openedAt: null });
      return false;
    }
    return true;
  }

  recordSuccess(sourceId: string) {
    this.states.set(sourceId, { failures: 0, openedAt: null });
  }

  recordFailure(sourceId: string) {
    const current = this.states.get(sourceId) ?? { failures: 0, openedAt: null };
    const failures = current.failures + 1;
    this.states.set(sourceId, {
      failures,
      openedAt: failures >= this.failureThreshold ? this.now() : null,
    });
  }
}

export class SourceRateLimiter {
  private readonly nextAllowedAt = new Map<string, number>();
  private readonly sourceQueues = new Map<string, Promise<void>>();

  constructor(private readonly now: () => number = Date.now) {}

  async wait(sourceId: string, minimumIntervalMs: number, sleep: (milliseconds: number) => Promise<void>) {
    const previous = this.sourceQueues.get(sourceId) ?? Promise.resolve();
    let releaseQueue!: () => void;
    const current = new Promise<void>((resolve) => {
      releaseQueue = resolve;
    });
    this.sourceQueues.set(sourceId, current);
    await previous;

    try {
      const currentTime = this.now();
      const next = this.nextAllowedAt.get(sourceId) ?? currentTime;
      const delay = Math.max(0, next - currentTime);
      if (delay > 0) await sleep(delay);
      this.nextAllowedAt.set(
        sourceId,
        Math.max(this.now(), next) + Math.max(0, minimumIntervalMs),
      );
    } finally {
      releaseQueue();
      if (this.sourceQueues.get(sourceId) === current) {
        this.sourceQueues.delete(sourceId);
      }
    }
  }
}

export async function processBatch<T, R>(
  records: readonly T[],
  concurrency: number,
  handler: (record: T, index: number) => Promise<R>,
) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 32) {
    throw new Error("Batch concurrency must be an integer between 1 and 32.");
  }
  const results = new Array<PromiseSettledResult<R>>(records.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= records.length) return;
      try {
        results[index] = { status: "fulfilled", value: await handler(records[index] as T, index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from(
    { length: Math.min(concurrency, records.length) },
    () => runWorker(),
  ));
  return results;
}
