import { describe, expect, it } from "vitest";
import {
  ingestionJobSchema,
  rawSourceRecordEnvelopeSchema,
  sourceCursorSchema,
} from "./persistence-contracts";

const sourceId = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";
const now = "2026-11-11T00:00:00Z";
const job = {
  id: "c2e3057b-a6e3-48c4-80a3-3dc2cbefc2b9",
  sourceId,
  jobType: "incremental_sync",
  priority: 100,
  status: "pending",
  attemptCount: 0,
  maximumRetries: 5,
  nextExecutionAt: now,
  lockedBy: null,
  lockedUntil: null,
  leaseToken: null,
  lastError: null,
  idempotencyKey: "source-sync-2026-11-11",
  createdAt: now,
  updatedAt: now,
  startedAt: null,
  completedAt: null,
};

describe("durable persistence contracts", () => {
  it("validates source cursors with a stable default cursor name", () => {
    expect(sourceCursorSchema.parse({ sourceId })).toMatchObject({
      sourceId,
      cursorName: "default",
      state: {},
      synchronizedAt: null,
    });
    expect(sourceCursorSchema.safeParse({ sourceId, cursorName: " " }).success).toBe(false);
  });

  it("requires complete leases only while jobs are running", () => {
    expect(ingestionJobSchema.safeParse(job).success).toBe(true);
    expect(ingestionJobSchema.safeParse({ ...job, status: "running" }).success).toBe(false);
    expect(ingestionJobSchema.safeParse({
      ...job,
      status: "running",
      lockedBy: "worker-1",
      lockedUntil: now,
      leaseToken: "14aee40e-b755-4fd8-86a3-b7d599bc150b",
      startedAt: now,
    }).success).toBe(true);
    expect(ingestionJobSchema.safeParse({
      ...job,
      lockedBy: "worker-1",
    }).success).toBe(false);
    expect(ingestionJobSchema.safeParse({
      ...job,
      status: "running",
      lockedBy: "worker-1",
      lockedUntil: now,
      leaseToken: "14aee40e-b755-4fd8-86a3-b7d599bc150b",
    }).success).toBe(false);
    expect(ingestionJobSchema.safeParse({
      ...job,
      status: "succeeded",
      startedAt: now,
      completedAt: now,
    }).success).toBe(true);
    expect(ingestionJobSchema.safeParse({
      ...job,
      attemptCount: 7,
    }).success).toBe(false);
  });

  it("requires a payload location and valid checksum provenance", () => {
    const raw = {
      sourceId,
      externalRecordId: "notice-123",
      sourceUrl: "https://source.example.org/notices/123",
      contentType: "application/json",
      payloadChecksum: "a".repeat(64),
      payloadJson: { id: "notice-123" },
    };
    expect(rawSourceRecordEnvelopeSchema.safeParse(raw).success).toBe(true);
    expect(rawSourceRecordEnvelopeSchema.safeParse({
      ...raw,
      payloadJson: undefined,
      r2ObjectKey: "raw/notice-123.json",
    }).success).toBe(false);
    expect(rawSourceRecordEnvelopeSchema.safeParse({
      ...raw,
      r2Bucket: "oppsift-raw",
      r2ObjectKey: "raw/notice-123.json",
    }).success).toBe(true);
  });

  it("measures raw payload limits in UTF-8 bytes and rejects non-JSON values", () => {
    const raw = {
      sourceId,
      externalRecordId: "notice-123",
      sourceUrl: "https://source.example.org/notices/123",
      contentType: "application/json",
      payloadChecksum: "a".repeat(64),
    };
    const oversizedText = "💡".repeat(600_000);
    expect(rawSourceRecordEnvelopeSchema.safeParse({
      ...raw,
      payloadText: oversizedText,
    }).success).toBe(false);
    expect(rawSourceRecordEnvelopeSchema.safeParse({
      ...raw,
      payloadJson: { text: oversizedText },
    }).success).toBe(false);
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(rawSourceRecordEnvelopeSchema.safeParse({
      ...raw,
      payloadJson: circular,
    }).success).toBe(false);
  });
});
