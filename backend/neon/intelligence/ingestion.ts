import {
  findDuplicateConfidence,
  normalizeOpportunity,
  parsedSourceOpportunitySchema,
  sourceRegistryRecordSchema,
  type CategoryMapping,
  type NormalizedOpportunity,
  type QualityIssue,
  type SourceRegistryRecord,
} from "./contracts";
import type { RawSourceRecordEnvelope } from "./persistence-contracts";

export interface SourceConnector {
  readonly sourceId: string;
  prepare?(collectionRunId: string, signal?: AbortSignal): Promise<void>;
  collectionIssues?(): readonly QualityIssue[];
  nextCursor?(): string | null;
  discover(): Promise<readonly string[]>;
  retrieve(externalId: string): Promise<unknown>;
  parse(payload: unknown): Promise<unknown>;
  toRawSourceRecord(
    externalId: string,
    payload: unknown,
    collectionRunId: string,
  ): Promise<RawSourceRecordEnvelope>;
}

export type IngestionRunStatus =
  | "succeeded"
  | "completed_with_review"
  | "completed_with_errors"
  | "failed";

export type IngestionSummary = {
  runId: string;
  status: IngestionRunStatus;
  discovered: number;
  parsedCount?: number;
  acceptedCount?: number;
  duplicateCount?: number;
  failedCount?: number;
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  pendingReview: number;
};

export type StoredOpportunity = {
  id: string;
  opportunity: NormalizedOpportunity;
};

export interface IngestionRepository {
  beginRun(sourceId: string, startedAt: string): Promise<string>;
  beginRunForJob?(
    lease: IngestionJobLease,
    startedAt: string,
  ): Promise<string>;
  getSourceForIngestion(sourceId: string): Promise<SourceRegistryRecord | null>;
  findSourceRecord(sourceId: string, externalId: string): Promise<{
    id: string;
    opportunity: NormalizedOpportunity;
  } | null>;
  listOpportunities(): Promise<readonly StoredOpportunity[]>;
  save(
    opportunity: NormalizedOpportunity,
    issues: readonly QualityIssue[],
    duplicateCandidates: readonly { opportunityId: string; confidence: number }[],
  ): Promise<"created" | "updated" | "unchanged">;
  reject(
    runId: string,
    externalId: string | null,
    issues: readonly QualityIssue[],
  ): Promise<void>;
  review(
    runId: string,
    sourceId: string,
    externalId: string,
    sourceRecord: unknown,
    issues: readonly QualityIssue[],
  ): Promise<void>;
  finishRun(summary: IngestionSummary, finishedAt: string): Promise<void>;
  storeRawRecord(envelope: RawSourceRecordEnvelope): Promise<{
    id: string;
    inserted: boolean;
    processingState: string;
  }>;
  markRawProcessing(rawRecordId: string): Promise<void>;
  markRawProcessingFailure(rawRecordId: string, error: unknown): Promise<void>;
  markRawReview(rawRecordId: string): Promise<void>;
  markRawAcceptedByExternalId(
    rawRecordId: string,
    sourceId: string,
    externalId: string,
  ): Promise<void>;
}

export type IngestionJobLease = {
  jobId: string;
  workerId: string;
  leaseToken: string;
};

export type IngestionExecutionContext = {
  lease: IngestionJobLease;
  signal: AbortSignal;
  assertLease(): Promise<void>;
};

export async function runIngestion(
  connector: SourceConnector,
  repository: IngestionRepository,
  mappings: readonly CategoryMapping[],
  now: () => Date = () => new Date(),
  execution?: IngestionExecutionContext,
): Promise<IngestionSummary> {
  const startedAt = now().toISOString();
  if (execution && !repository.beginRunForJob) {
    throw new Error("The ingestion repository cannot associate a run with its job lease.");
  }
  const runId = execution
    ? await repository.beginRunForJob!(execution.lease, startedAt)
    : await repository.beginRun(connector.sourceId, startedAt);
  let source: SourceRegistryRecord | null;
  try {
    source = await repository.getSourceForIngestion(connector.sourceId);
  } catch (error) {
    source = null;
    const issue: QualityIssue = {
      code: "source_registry_lookup_failed",
      message: error instanceof Error ? error.message : "Source registry lookup failed with a non-Error value.",
      severity: "error",
    };
    const summary: IngestionSummary = {
      runId,
      status: "failed",
      discovered: 0,
      parsedCount: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      failedCount: 1,
      created: 0,
      updated: 0,
      unchanged: 0,
      rejected: 1,
      pendingReview: 0,
    };
    await repository.reject(runId, null, [issue]);
    await repository.finishRun(summary, now().toISOString());
    return summary;
  }

  const validatedSource = sourceRegistryRecordSchema.safeParse(source);
  if (
    !validatedSource.success ||
    validatedSource.data.id !== connector.sourceId ||
    validatedSource.data.integrationStatus !== "operational"
  ) {
    const summary: IngestionSummary = {
      runId,
      status: "failed",
      discovered: 0,
      parsedCount: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      failedCount: 1,
      created: 0,
      updated: 0,
      unchanged: 0,
      rejected: 1,
      pendingReview: 0,
    };
    await repository.reject(runId, null, [{
      code: "source_not_authorized",
      message: "The source is missing, unverified, or not approved for operational ingestion.",
      severity: "error",
    }]);
    await repository.finishRun(summary, now().toISOString());
    return summary;
  }

  let externalIds: readonly string[];

  try {
    await connector.prepare?.(runId, execution?.signal);
    await assertExecutionActive(execution);
    externalIds = await connector.discover();
  } catch (error) {
    const issue: QualityIssue = {
      code: "source_discovery_failed",
      message: error instanceof Error ? error.message : "Source discovery failed with a non-Error value.",
      severity: "error",
    };
    const summary: IngestionSummary = {
      runId,
      status: "failed",
      discovered: 0,
      parsedCount: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      failedCount: 1,
      created: 0,
      updated: 0,
      unchanged: 0,
      rejected: 1,
      pendingReview: 0,
    };
    await repository.reject(runId, null, [issue]);
    await repository.finishRun(summary, now().toISOString());
    return summary;
  }

  const summary: IngestionSummary = {
    runId,
    status: "succeeded",
    discovered: externalIds.length,
    parsedCount: 0,
    acceptedCount: 0,
    duplicateCount: 0,
    failedCount: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    rejected: 0,
    pendingReview: 0,
  };

  for (const issue of connector.collectionIssues?.() ?? []) {
    await repository.reject(runId, null, [issue]);
    if (issue.severity === "error") {
      summary.rejected += 1;
      summary.failedCount = (summary.failedCount ?? 0) + 1;
      summary.status = "completed_with_errors";
    }
  }

  for (const externalId of externalIds) {
    await assertExecutionActive(execution);
    let rawRecordId: string | null = null;
    try {
      const payload = await connector.retrieve(externalId);
      const envelope = await connector.toRawSourceRecord(externalId, payload, runId);
      if (envelope.sourceId !== connector.sourceId ||
          envelope.externalRecordId !== externalId ||
          envelope.collectionRunId !== runId) {
        throw new Error("Connector raw-record provenance does not match the active collection.");
      }
      const rawRecord = await repository.storeRawRecord(envelope);
      rawRecordId = rawRecord.id;
      if (rawRecord.processingState !== "accepted") {
        await repository.markRawProcessing(rawRecord.id);
      }
      const parsed = parsedSourceOpportunitySchema.safeParse(
        await connector.parse(payload),
      );
      if (!parsed.success) {
        summary.rejected += 1;
        summary.failedCount = (summary.failedCount ?? 0) + 1;
        await repository.markRawProcessingFailure(
          rawRecord.id,
          new Error("Source payload failed opportunity validation."),
        );
        await repository.reject(runId, externalId, parsed.error.issues.map((issue) => ({
          code: "invalid_source_record",
          message: issue.message,
          severity: "error" as const,
          field: issue.path.join("."),
        })));
        continue;
      }

      summary.parsedCount = (summary.parsedCount ?? 0) + 1;
      const normalized = normalizeOpportunity(connector.sourceId, parsed.data, mappings);
      if (!normalized) {
        summary.pendingReview += 1;
        summary.status = "completed_with_review";
        await repository.markRawReview(rawRecord.id);
        await repository.review(runId, connector.sourceId, externalId, parsed.data, [{
          code: parsed.data.countryCode ? "unmapped_category" : "unmapped_country",
          message: parsed.data.countryCode
            ? `No approved taxonomy mapping exists for "${parsed.data.sourceCategoryTerm}".`
            : "The source did not provide a country code that OppSift can map safely.",
          severity: "error",
          field: parsed.data.countryCode ? "sourceCategoryTerm" : "countryCode",
        }]);
        continue;
      }

      const existing = await repository.findSourceRecord(connector.sourceId, externalId);
      if (existing && existing.opportunity.contentFingerprint === normalized.opportunity.contentFingerprint) {
        summary.unchanged += 1;
        continue;
      }

      const duplicateCandidates = (await repository.listOpportunities())
        .filter((candidate) => candidate.opportunity.externalId !== externalId
          || candidate.opportunity.sourceId !== connector.sourceId)
        .map((candidate) => {
          const confidence = findDuplicateConfidence(normalized.opportunity, candidate.opportunity);
          return confidence > 0
            ? { opportunityId: candidate.id, confidence }
            : null;
        })
        .filter((candidate): candidate is { opportunityId: string; confidence: number } => candidate !== null);

      const result = await repository.save(
        normalized.opportunity,
        normalized.issues,
        duplicateCandidates,
      );
      await repository.markRawAcceptedByExternalId(
        rawRecord.id,
        connector.sourceId,
        externalId,
      );
      summary[result] += 1;
      summary.acceptedCount = (summary.acceptedCount ?? 0) + 1;
      if (duplicateCandidates.length > 0) {
        summary.duplicateCount = (summary.duplicateCount ?? 0) + 1;
        summary.pendingReview += 1;
        summary.status = "completed_with_review";
      }
    } catch (error) {
      if (execution?.signal.aborted) throw error;
      if (rawRecordId) {
        await repository.markRawProcessingFailure(rawRecordId, error);
      }
      summary.rejected += 1;
      summary.failedCount = (summary.failedCount ?? 0) + 1;
      summary.status = "completed_with_errors";
      await repository.reject(runId, externalId, [{
        code: "record_ingestion_failed",
        message: error instanceof Error ? error.message : "Ingestion failed with a non-Error value.",
        severity: "error",
      }]);
    }
  }

  await assertExecutionActive(execution);
  if (summary.rejected > 0) summary.status = "completed_with_errors";
  await repository.finishRun(summary, now().toISOString());
  return summary;
}

async function assertExecutionActive(
  execution: IngestionExecutionContext | undefined,
): Promise<void> {
  if (!execution) return;
  if (execution.signal.aborted) {
    throw execution.signal.reason instanceof Error
      ? execution.signal.reason
      : new Error("Ingestion execution was cancelled.");
  }
  await execution.assertLease();
}
