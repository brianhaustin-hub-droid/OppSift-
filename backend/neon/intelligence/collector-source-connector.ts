import {
  parsedSourceOpportunitySchema,
  type QualityIssue,
  type SourceRegistryRecord,
} from "./contracts";
import type {
  IngestionRepository,
  SourceConnector,
} from "./ingestion";
import {
  rawSourceRecordEnvelopeSchema,
} from "./persistence-contracts";
import type {
  ApprovalAuthority,
  ApprovedSource,
} from "../../../collectors/node/src/approval.js";
import type {
  CollectorRequest,
  CollectorResult,
} from "../../../collectors/node/src/contract.js";

export type CollectorIngestionOptions = {
  jobId: string;
  framework: CollectorRequest["collectorFramework"];
  adapter: CollectorRequest["adapter"];
  limits: CollectorRequest["limits"];
  sourceBaseUrl?: string;
  currentCursor?: string | null;
  countryCode?: string;
};

export type CollectorExecution = (
  request: CollectorRequest,
  approvalAuthority: ApprovalAuthority,
  signal?: AbortSignal,
) => Promise<CollectorResult>;

export function createCollectorApprovalAuthority(
  repository: Pick<IngestionRepository, "getSourceForIngestion">,
): ApprovalAuthority {
  return {
    async loadApprovedSource(sourceId: string, connectorId: string): Promise<ApprovedSource | null> {
      const source = await repository.getSourceForIngestion(sourceId);
      if (
        !source ||
        source.id !== sourceId ||
        source.connectorIdentifier !== connectorId ||
        source.activationStatus !== "active" ||
        source.integrationStatus !== "operational" ||
        !["approved", "approved_with_constraints"].includes(source.approvalStatus) ||
        (source.approvalExpiresAt !== null &&
          Date.parse(source.approvalExpiresAt) <= Date.now()) ||
        !["api", "feed", "permitted_web"].includes(source.accessMethod)
      ) {
        return null;
      }

      const allowedHosts = [
        source.website,
        ...(source.apiOrFeedUrl ? [source.apiOrFeedUrl] : []),
      ].map(approvedHostname).filter((host): host is string => host !== null);
      const minimumRequestIntervalMs = source.rateLimitRequests && source.rateLimitWindowSeconds
        ? Math.max(
          250,
          Math.ceil(source.rateLimitWindowSeconds * 1000 / source.rateLimitRequests),
        )
        : 250;
      if (minimumRequestIntervalMs > 3_600_000 || allowedHosts.length === 0) return null;

      return {
        sourceId,
        connectorId,
        approvalStatus: "approved",
        reusePermission: "permitted",
        active: true,
        allowedHosts: [...new Set(allowedHosts)],
        methods: ["GET"],
        conditionalConstraintsEnforced: false,
        minimumRequestIntervalMs,
        maxRequests: Math.min(source.rateLimitRequests ?? 500, 500),
      };
    },
  };
}

export function createCollectorSourceConnector(
  sourceId: string,
  repository: Pick<IngestionRepository, "getSourceForIngestion">,
  options: CollectorIngestionOptions,
  execute: CollectorExecution,
): SourceConnector {
  let request: CollectorRequest | null = null;
  let result: CollectorResult | null = null;
  let source: SourceRegistryRecord | null = null;

  const requireCollection = () => {
    if (!request || !result || !source) {
      throw new Error("Collector collection has not completed for this ingestion run.");
    }
    return { request, result, source };
  };

  return {
    sourceId,

    async prepare(collectionRunId, signal) {
      source = await repository.getSourceForIngestion(sourceId);
      if (
        !source ||
        source.id !== sourceId ||
        !source.connectorIdentifier ||
        source.activationStatus !== "active" ||
        source.integrationStatus !== "operational" ||
        !["approved", "approved_with_constraints"].includes(source.approvalStatus) ||
        (source.approvalExpiresAt !== null &&
          Date.parse(source.approvalExpiresAt) <= Date.now())
      ) {
        throw new Error("Source registry did not authorize this ingestion run.");
      }

      const sourceBaseUrl = options.sourceBaseUrl ?? source.apiOrFeedUrl ?? source.website;
      const allowedHosts = [...new Set([
        approvedHostname(source.website),
        approvedHostname(source.apiOrFeedUrl),
      ].filter((host): host is string => host !== null))];
      const minimumRequestIntervalMs = source.rateLimitRequests && source.rateLimitWindowSeconds
        ? Math.ceil(source.rateLimitWindowSeconds * 1000 / source.rateLimitRequests)
        : 250;
      request = {
        contractVersion: "1.0",
        jobId: options.jobId,
        ingestionRunId: collectionRunId,
        sourceId,
        connectorId: source.connectorIdentifier,
        collectorFramework: options.framework,
        sourceBaseUrl,
        allowedHosts,
        currentCursor: options.currentCursor ?? null,
        limits: {
          ...options.limits,
          maxRequests: Math.min(
            options.limits.maxRequests,
            source.rateLimitRequests ?? options.limits.maxRequests,
          ),
          minimumRequestIntervalMs: Math.max(
            options.limits.minimumRequestIntervalMs,
            250,
            minimumRequestIntervalMs,
          ),
        },
        constraints: {
          approvalStatus: "approved",
          reusePermission: "permitted",
          conditionalConstraintsEnforced: false,
          allowedMethods: ["GET"],
          attribution: source.attributionRequirements ?? "",
        },
        adapter: options.adapter,
      };
      result = await execute(
        request,
        createCollectorApprovalAuthority(repository),
        signal,
      );
    },

    collectionIssues(): readonly QualityIssue[] {
      const { result: completed } = requireCollection();
      const issues: QualityIssue[] = completed.errors.map((error) => ({
        code: `collector_${error.code}`,
        message: error.message,
        severity: "error",
      }));
      issues.push(...completed.warnings.map((message) => ({
        code: "collector_warning",
        message,
        severity: "warning" as const,
      })));
      if (completed.recordsRejected > 0) {
        issues.push({
          code: "collector_records_rejected",
          message: `${completed.recordsRejected} record(s) were rejected by collector validation.`,
          severity: "warning",
        });
      }
      return issues;
    },

    nextCursor() {
      return requireCollection().result.nextCursor;
    },

    async discover() {
      return requireCollection().result.records.map((record) => record.externalRecordId);
    },

    async retrieve(externalId) {
      const record = requireCollection().result.records.find(
        (candidate) => candidate.externalRecordId === externalId,
      );
      if (!record) throw new Error("Collector result is missing the requested external record.");
      return record;
    },

    async parse(payload) {
      const { result: completed, source: approvedRegistrySource } = requireCollection();
      const record = collectorRecord(payload, completed);
      const extracted = record.extracted;
      const value = (name: string) => extracted[name]?.trim() || null;
      const status = value("status")?.toLowerCase();
      return parsedSourceOpportunitySchema.parse({
        externalId: record.externalRecordId,
        title: value("title"),
        description: value("description"),
        sourceCategoryTerm: value("sourceCategoryTerm"),
        referenceNumber: value("referenceNumber"),
        countryCode: (value("countryCode") ?? options.countryCode)?.toUpperCase(),
        region: value("region"),
        city: value("city"),
        issuingInstitution: value("organization"),
        procuringOrganization: null,
        publisher: value("publisher") ?? approvedRegistrySource.publisher,
        publishedAt: isoTimestamp(value("publishedAt")),
        sourceDeadlineText: value("sourceDeadlineText"),
        closingAt: isoTimestamp(value("closingAt")),
        timeZone: value("timeZone"),
        status: status && ["open", "closed", "cancelled", "awarded"].includes(status)
          ? status
          : "unknown",
        sourceUrl: record.sourceUrl,
        canonicalUrl: record.canonicalUrl,
        currency: value("currency")?.toUpperCase() ?? null,
        amount: numericAmount(value("amount")),
        originalValues: {
          collector: {
            framework: completed.collectorFramework,
            fetchedAt: record.fetchedAt,
            httpStatus: record.httpStatus,
            payloadChecksum: record.payloadChecksum,
            warnings: record.warnings,
          },
          extracted,
        },
      });
    },

    async toRawSourceRecord(externalId, payload, collectionRunId) {
      const { result: completed } = requireCollection();
      const record = collectorRecord(payload, completed);
      if (record.externalRecordId !== externalId) {
        throw new Error("Collector record identity does not match the ingestion record.");
      }
      const rawPayload = typeof record.payload === "string"
        ? { payloadText: record.payload }
        : { payloadJson: record.payload };
      return rawSourceRecordEnvelopeSchema.parse({
        sourceId,
        externalRecordId: externalId,
        sourceUrl: record.sourceUrl,
        contentType: record.contentType,
        ...rawPayload,
        payloadChecksum: record.payloadChecksum,
        collectionRunId,
      });
    },
  };
}

function collectorRecord(
  value: unknown,
  completed: CollectorResult,
): CollectorResult["records"][number] {
  const record = completed.records.find((candidate) => candidate === value);
  if (!record) throw new Error("Collector returned a malformed source record.");
  return record;
}

function approvedHostname(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) {
      return null;
    }
    return url.hostname.toLowerCase().replace(/\.$/u, "");
  } catch {
    return null;
  }
}

function isoTimestamp(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
    return null;
  }
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function numericAmount(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  return /^\d{1,16}(?:\.\d{1,4})?$/u.test(normalized) ? normalized : null;
}
