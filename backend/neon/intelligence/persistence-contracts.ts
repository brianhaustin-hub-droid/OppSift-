import { z } from "zod";

const maximumRawPayloadBytes = 2_000_000;
// UUID-shape, not RFC variant enforcement: source ids are minted by our own
// activation migrations and several use synthetic ids outside the RFC
// variant range. See contracts.ts for the same rationale.
const uuidShape = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const sourceId = uuidShape;
const dateTime = z.string().datetime({ offset: true });

export const sourceCursorSchema = z.object({
  sourceId,
  cursorName: z.string().trim().min(1).max(120).default("default"),
  cursorValue: z.string().nullable().default(null),
  paginationToken: z.string().nullable().default(null),
  lastSeenExternalId: z.string().max(500).nullable().default(null),
  etag: z.string().nullable().default(null),
  lastModified: z.string().nullable().default(null),
  state: z.record(z.string(), z.unknown()).default({}),
  synchronizedAt: dateTime.nullable().default(null),
  cursorVersion: z.number().int().nonnegative().default(0),
});

export type SourceCursor = z.infer<typeof sourceCursorSchema>;

export const ingestionJobTypes = [
  "full_sync",
  "incremental_sync",
  "backfill",
  "health_check",
] as const;

export const ingestionJobStatuses = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "dead_lettered",
] as const;

export const ingestionJobSchema = z.object({
  id: uuidShape,
  sourceId,
  jobType: z.enum(ingestionJobTypes),
  priority: z.number().int().min(0).max(1000).default(100),
  status: z.enum(ingestionJobStatuses).default("pending"),
  attemptCount: z.number().int().nonnegative().default(0),
  maximumRetries: z.number().int().min(0).max(20).default(5),
  nextExecutionAt: dateTime,
  lockedBy: z.string().max(200).nullable().default(null),
  lockedUntil: dateTime.nullable().default(null),
  leaseToken: uuidShape.nullable().default(null),
  lastError: z.string().max(10000).nullable().default(null),
  idempotencyKey: z.string().trim().min(1).max(256),
  createdAt: dateTime,
  updatedAt: dateTime,
  startedAt: dateTime.nullable().default(null),
  completedAt: dateTime.nullable().default(null),
}).superRefine((job, context) => {
  if (job.attemptCount > job.maximumRetries + 1) {
    context.addIssue({
      code: "custom",
      message: "Attempt count cannot exceed the initial attempt plus configured retries.",
      path: ["attemptCount"],
    });
  }
  const isRunning = job.status === "running";
  const leaseFields = [job.lockedBy, job.lockedUntil, job.leaseToken];
  const hasCompleteLease = leaseFields.every((value) => value !== null);
  const hasAnyLease = leaseFields.some((value) => value !== null);
  if ((isRunning && !hasCompleteLease) || (!isRunning && hasAnyLease)) {
    context.addIssue({
      code: "custom",
      message: "Running jobs require a complete lease; non-running jobs must not retain one.",
      path: ["status"],
    });
  }
  if (job.status !== "pending" && job.startedAt === null) {
    context.addIssue({
      code: "custom",
      message: "Running and terminal jobs require a start timestamp.",
      path: ["startedAt"],
    });
  }
  const isTerminal = ["succeeded", "failed", "dead_lettered"].includes(job.status);
  if (isTerminal !== (job.completedAt !== null)) {
    context.addIssue({
      code: "custom",
      message: "Terminal jobs require a completion timestamp and non-terminal jobs must not have one.",
      path: ["completedAt"],
    });
  }
});

export type IngestionJob = z.infer<typeof ingestionJobSchema>;

export const rawSourceRecordEnvelopeSchema = z.object({
  sourceId,
  externalRecordId: z.string().trim().min(1).max(500),
  sourceUrl: z.string().url().refine((value) => new URL(value).protocol === "https:"),
  contentType: z.string().trim().min(1).max(200),
  payloadJson: z.unknown().optional(),
  payloadText: z.string().max(2_000_000).optional(),
  r2Bucket: z.string().max(128).optional(),
  r2ObjectKey: z.string().max(1024).optional(),
  payloadChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  collectionRunId: uuidShape.nullable().default(null),
}).superRefine((record, context) => {
  const hasR2Bucket = record.r2Bucket !== undefined;
  const hasR2Key = record.r2ObjectKey !== undefined;
  if (hasR2Bucket !== hasR2Key) {
    context.addIssue({
      code: "custom",
      message: "R2 bucket and object key must be provided together.",
      path: ["r2ObjectKey"],
    });
  }
  if (
    record.payloadJson === undefined &&
    record.payloadText === undefined &&
    !hasR2Key
  ) {
    context.addIssue({
      code: "custom",
      message: "A raw JSON payload, text payload, or R2 object reference is required.",
      path: ["payloadJson"],
    });
  }
  if (
    record.payloadText !== undefined &&
    new TextEncoder().encode(record.payloadText).byteLength > maximumRawPayloadBytes
  ) {
    context.addIssue({
      code: "custom",
      message: "Raw text payload exceeds the 2 MB storage limit.",
      path: ["payloadText"],
    });
  }
  if (record.payloadJson !== undefined) {
    try {
      const serialized = JSON.stringify(record.payloadJson);
      if (
        serialized === undefined ||
        new TextEncoder().encode(serialized).byteLength > maximumRawPayloadBytes
      ) {
        context.addIssue({
          code: "custom",
          message: "Raw JSON payload must be serializable and fit within the 2 MB storage limit.",
          path: ["payloadJson"],
        });
      }
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error
          ? `Raw JSON payload is not serializable: ${error.message}`
          : "Raw JSON payload is not serializable.",
        path: ["payloadJson"],
      });
    }
  }
});

export type RawSourceRecordEnvelope = z.infer<typeof rawSourceRecordEnvelopeSchema>;
