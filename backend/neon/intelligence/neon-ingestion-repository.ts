import {
  categoryMappingSchema,
  sourceRegistryRecordSchema,
  type CategoryMapping,
  type NormalizedOpportunity,
  type QualityIssue,
  type SourceRegistryRecord,
} from "./contracts";
import {
  ingestionJobSchema,
  rawSourceRecordEnvelopeSchema,
  sourceCursorSchema,
  type IngestionJob,
  type RawSourceRecordEnvelope,
  type SourceCursor,
} from "./persistence-contracts";
import type {
  DatabaseExecutor,
  DatabaseParameter,
  DatabaseTransaction,
} from "./database-executor";
import type {
  IngestionRepository,
  IngestionRunStatus,
  IngestionSummary,
  StoredOpportunity,
} from "./ingestion";
import type { SourceScheduleQuery } from "./orchestration";

type DbRow = Record<string, unknown>;

export class IngestionRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestionRepositoryError";
  }
}

export class JobLeaseError extends IngestionRepositoryError {
  constructor() {
    super("The ingestion job lease is missing, expired, or owned by another worker.");
    this.name = "JobLeaseError";
  }
}

export type JobLease = {
  jobId: string;
  workerId: string;
  leaseToken: string;
};

export type EnqueueIngestionJobInput = {
  sourceId: string;
  jobType: IngestionJob["jobType"];
  idempotencyKey: string;
  priority?: number;
  maximumRetries?: number;
  nextExecutionAt?: string;
  nextScheduledCollectionAt?: string;
  minimumCollectionIntervalMs?: number;
};

export type EnqueueScheduledIngestionJobInput = EnqueueIngestionJobInput & {
  nextScheduledCollectionAt: string;
  minimumCollectionIntervalMs: number;
};

export type RawSourceRecordResult = {
  id: string;
  inserted: boolean;
  processingState: string;
};

export type SourceCountryCoverageRecord = {
  sourceId: string;
  countryCode: string;
  categoryCode: string;
  coverageStatus: string;
  verifiedAt: string | null;
  evidenceUrl: string | null;
};

const sourceSelect = `
  SELECT
    id,
    name,
    publisher,
    official_website AS website,
    source_category AS "sourceCategory",
    source_type AS "sourceType",
    access_method AS "accessMethod",
    api_or_feed_url AS "apiOrFeedUrl",
    connector_identifier AS "connectorIdentifier",
    coverage_scope AS "coverageScope",
    coverage_region_codes AS "coverageRegionCodes",
    api_or_feed_available AS "apiOrFeedAvailable",
    supported_categories AS "opportunityCategories",
    languages,
    publication_frequency AS "publicationFrequency",
    expected_refresh_hours AS "expectedRefreshHours",
    reliability_status AS reliability,
    licensing_status AS "licensingStatus",
    terms_status AS "termsStatus",
    permissions_evidence_url AS "permissionsEvidenceUrl",
    license_url AS "licenseUrl",
    terms_url AS "termsUrl",
    reuse_permission_status AS "reusePermissionStatus",
    attribution_requirements AS "attributionRequirements",
    robots_restrictions AS "robotsRestrictions",
    retention_restrictions AS "retentionRestrictions",
    rate_limit_requests AS "rateLimitRequests",
    rate_limit_window_seconds AS "rateLimitWindowSeconds",
    approval_status AS "approvalStatus",
    approval_constraints AS "approvalConstraints",
    approval_constraints_enforced AS "approvalConstraintsEnforced",
    approval_expires_at AS "approvalExpiresAt",
    activation_status AS "activationStatus",
    integration_status AS "integrationStatus",
    last_successful_retrieval AS "lastSuccessfulRetrieval",
    last_unsuccessful_retrieval AS "lastUnsuccessfulRetrieval",
    next_scheduled_collection_at AS "nextScheduledCollectionAt"
  FROM public.opportunity_sources
`;

const opportunitySelect = `
  SELECT
    o.id,
    o.title,
    o.description,
    o.category_code,
    o.opportunity_type_code,
    o.country_code,
    o.region,
    o.city,
    o.issuing_institution,
    o.procuring_organization,
    o.publisher,
    o.reference_number,
    o.published_at,
    o.closing_at,
    o.time_zone,
    o.status,
    o.canonical_url,
    o.original_currency_code,
    o.published_amount,
    o.eligibility,
    o.dedupe_key,
    o.first_discovered_at,
    o.updated_at,
    r.id AS source_record_id,
    r.source_id,
    r.external_record_id,
    r.original_deadline_text,
    r.original_classification,
    r.source_url,
    r.original_values,
    r.content_fingerprint
  FROM public.opportunities AS o
  JOIN public.opportunity_source_records AS r
    ON r.opportunity_id = o.id
`;

function isRecord(value: unknown): value is DbRow {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function dateToIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new IngestionRepositoryError("Database returned an invalid timestamp.");
  }
  return date.toISOString();
}

function requiredString(row: DbRow, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new IngestionRepositoryError(`Database returned an invalid ${field}.`);
  }
  return value;
}

function nullableString(row: DbRow, field: string): string | null {
  const value = row[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new IngestionRepositoryError(`Database returned an invalid ${field}.`);
  }
  return value;
}

function numberValue(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new IngestionRepositoryError(`Database returned an invalid ${field}.`);
  }
  return parsed;
}

function jsonObject(value: unknown, field: string): Record<string, unknown> {
  if (isRecord(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (isRecord(parsed)) return parsed;
    } catch {
      throw new IngestionRepositoryError(`Database returned invalid JSON in ${field}.`);
    }
  }
  throw new IngestionRepositoryError(`Database returned invalid JSON in ${field}.`);
}

function jsonString(value: unknown, field: string): string {
  try {
    const result = JSON.stringify(value);
    if (result === undefined) throw new Error("not serializable");
    return result;
  } catch {
    throw new IngestionRepositoryError(`${field} must be JSON serializable.`);
  }
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/giu, "Bearer [REDACTED]")
    .replace(/\b([\w-]*(?:password|passwd|secret|token|authorization|api[_-]?key))\b\s*[:=]\s*[^,\s;]+/giu, "$1=[REDACTED]")
    .replace(/([?&](?:token|key|secret|password|signature|sig)=)[^&\s]*/giu, "$1[REDACTED]")
    .slice(0, 4000);
}

function sanitizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (!isRecord(value)) {
    return typeof value === "string" ? redactSensitiveText(value) : value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      /password|passwd|secret|token|authorization|cookie|api[_-]?key|credential/iu.test(key)
        ? "[REDACTED]"
        : sanitizeJson(child),
    ]),
  );
}

function mapSource(row: DbRow): SourceRegistryRecord | null {
  const constraints = row.approvalConstraints;
  if (!Array.isArray(constraints) || constraints.some((item) => typeof item !== "string")) {
    throw new IngestionRepositoryError("Source approval constraints are invalid.");
  }
  const candidate = {
    id: requiredString(row, "id"),
    name: row.name,
    publisher: row.publisher,
    website: row.website,
    sourceCategory: row.sourceCategory,
    sourceType: row.sourceType,
    accessMethod: row.accessMethod,
    apiOrFeedUrl: row.apiOrFeedUrl,
    connectorIdentifier: row.connectorIdentifier,
    coverageScope: row.coverageScope,
    coverageRegionCodes: row.coverageRegionCodes,
    apiOrFeedAvailable: row.apiOrFeedAvailable,
    opportunityCategories: row.opportunityCategories,
    languages: row.languages,
    publicationFrequency: row.publicationFrequency,
    expectedRefreshHours: Number(row.expectedRefreshHours),
    reliability: row.reliability,
    licensingStatus: row.licensingStatus,
    termsStatus: row.termsStatus,
    permissionsEvidenceUrl: row.permissionsEvidenceUrl,
    licenseUrl: row.licenseUrl,
    termsUrl: row.termsUrl,
    reusePermissionStatus: row.reusePermissionStatus,
    attributionRequirements: row.attributionRequirements,
    robotsRestrictions: row.robotsRestrictions,
    retentionRestrictions: row.retentionRestrictions,
    rateLimitRequests: row.rateLimitRequests === null ? null : Number(row.rateLimitRequests),
    rateLimitWindowSeconds: row.rateLimitWindowSeconds === null
      ? null
      : Number(row.rateLimitWindowSeconds),
    approvalStatus: row.approvalStatus,
    approvalConstraints: constraints,
    approvalConstraintsEnforced: row.approvalConstraintsEnforced,
    approvalExpiresAt: dateToIso(row.approvalExpiresAt),
    activationStatus: row.activationStatus,
    integrationStatus: row.integrationStatus,
    lastSuccessfulRetrieval: dateToIso(row.lastSuccessfulRetrieval),
    lastUnsuccessfulRetrieval: dateToIso(row.lastUnsuccessfulRetrieval),
    nextScheduledCollectionAt: dateToIso(row.nextScheduledCollectionAt),
  };
  const parsed = sourceRegistryRecordSchema.safeParse(candidate);
  if (!parsed.success) {
    // Loud, specific, non-fatal: a single malformed registry row must skip
    // its source, never abort the scheduler for every source (the
    // 2026-11-15 outage was exactly this failure mode).
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    console.error(
      `Source registry row failed contract validation and will be skipped. `
        + `sourceId=${candidate.id} sourceName=${candidate.name} issues=[${issues}]`,
    );
    return null;
  }
  return parsed.data;
}

// Validates a batch of source rows; contract-invalid rows are logged and
// skipped so one malformed source cannot block ingestion of the rest.
function mapSourceRows(rows: readonly DbRow[]): SourceRegistryRecord[] {
  const mapped: SourceRegistryRecord[] = [];
  for (const row of rows) {
    const source = mapSource(row);
    if (source) mapped.push(source);
  }
  return mapped;
}

function sourceIsCollectable(source: SourceRegistryRecord): boolean {
  return ["approved", "approved_with_constraints"].includes(source.approvalStatus) &&
    source.activationStatus === "active" &&
    source.integrationStatus === "operational" &&
    (source.approvalExpiresAt === null ||
      Date.parse(source.approvalExpiresAt) > Date.now());
}

function mapOpportunity(row: DbRow): StoredOpportunity {
  const sourceId = requiredString(row, "source_id");
  const type = nullableString(row, "opportunity_type_code");
  if (!type) {
    throw new IngestionRepositoryError("Stored opportunity is missing its canonical type.");
  }
  const values = jsonObject(row.original_values, "original_values");
  const amount = row.published_amount === null || row.published_amount === undefined
    ? null
    : String(row.published_amount);
  const normalized: NormalizedOpportunity = {
    externalId: requiredString(row, "external_record_id"),
    title: requiredString(row, "title"),
    description: nullableString(row, "description"),
    sourceCategoryTerm: nullableString(row, "original_classification") ?? type,
    referenceNumber: nullableString(row, "reference_number"),
    countryCode: requiredString(row, "country_code"),
    region: nullableString(row, "region"),
    city: nullableString(row, "city"),
    issuingInstitution: nullableString(row, "issuing_institution"),
    procuringOrganization: nullableString(row, "procuring_organization"),
    publisher: requiredString(row, "publisher"),
    publishedAt: dateToIso(row.published_at),
    sourceDeadlineText: nullableString(row, "original_deadline_text"),
    closingAt: dateToIso(row.closing_at),
    timeZone: nullableString(row, "time_zone"),
    status: requiredString(row, "status") as NormalizedOpportunity["status"],
    sourceUrl: requiredString(row, "source_url"),
    canonicalUrl: nullableString(row, "canonical_url"),
    currency: nullableString(row, "original_currency_code"),
    amount,
    originalValues: values,
    category: requiredString(row, "category_code") as NormalizedOpportunity["category"],
    globalType: type,
    sourceId,
    contentFingerprint: requiredString(row, "content_fingerprint"),
    canonicalUrlNormalized: requiredString(row, "canonical_url"),
    normalizedReference: nullableString(row, "reference_number"),
    // Stored as opportunities.dedupe_key (migration 0031); `canonicalKey` is
    // the domain name used throughout the ingestion pipeline.
    canonicalKey: nullableString(row, "dedupe_key"),
  };
  return {
    id: requiredString(row, "id"),
    opportunity: normalized,
  };
}

function mapJob(row: DbRow): IngestionJob {
  const parsed = ingestionJobSchema.safeParse({
    id: requiredString(row, "id"),
    sourceId: requiredString(row, "source_id"),
    jobType: row.job_type,
    priority: Number(row.priority),
    status: row.status,
    attemptCount: Number(row.attempt_count),
    maximumRetries: Number(row.maximum_retries),
    nextExecutionAt: dateToIso(row.next_execution_at),
    lockedBy: row.locked_by ?? null,
    lockedUntil: dateToIso(row.locked_until),
    leaseToken: row.lease_token ?? null,
    lastError: row.last_error ?? null,
    idempotencyKey: requiredString(row, "idempotency_key"),
    createdAt: dateToIso(row.created_at),
    updatedAt: dateToIso(row.updated_at),
    startedAt: dateToIso(row.started_at),
    completedAt: dateToIso(row.completed_at),
  });
  if (!parsed.success) {
    throw new IngestionRepositoryError("Stored ingestion job failed its contract validation.");
  }
  return parsed.data;
}

function toRunStatus(status: IngestionRunStatus): string {
  return status;
}

export class NeonIngestionRepository implements IngestionRepository {
  constructor(
    private readonly database: DatabaseExecutor,
    private readonly collectorIdentifier: string,
  ) {
    if (!/^[a-z0-9][a-z0-9._-]{0,119}$/u.test(collectorIdentifier)) {
      throw new IngestionRepositoryError("Collector identifier is invalid.");
    }
  }

  async getSourceById(sourceId: string): Promise<SourceRegistryRecord | null> {
    const result = await this.database.query<DbRow>(
      `${sourceSelect} WHERE id = $1`,
      [sourceId],
    );
    return result.rows[0] ? mapSource(result.rows[0]) : null;
  }

  async getSourceForIngestion(sourceId: string): Promise<SourceRegistryRecord | null> {
    const result = await this.database.query<DbRow>(
      `${sourceSelect}
       WHERE id = $1
         AND (approval_expires_at IS NULL OR approval_expires_at > now())`,
      [sourceId],
    );
    const source = result.rows[0] ? mapSource(result.rows[0]) : null;
    return source && sourceIsCollectable(source) ? source : null;
  }

  async listApprovedActiveSources(
    schedule?: SourceScheduleQuery,
  ): Promise<SourceRegistryRecord[]> {
    if (schedule) {
      if (
        !Number.isInteger(schedule.limit) ||
        schedule.limit < 1 ||
        schedule.limit > 1000 ||
        !Number.isInteger(schedule.minimumCollectionIntervalMs) ||
        schedule.minimumCollectionIntervalMs < 60_000 ||
        schedule.minimumCollectionIntervalMs > 30 * 24 * 60 * 60 * 1000
      ) {
        throw new IngestionRepositoryError("Source schedule query limits are invalid.");
      }
      if (schedule.connectorIds.length === 0) return [];
      const result = await this.database.query<DbRow>(
        `${sourceSelect}
         WHERE activation_status = 'active'
           AND integration_status = 'operational'
           AND approval_status IN ('approved', 'approved_with_constraints')
           AND reliability_status IN ('verified', 'reliable')
           AND connector_identifier = ANY($3::text[])
           AND (approval_expires_at IS NULL OR approval_expires_at > now())
           AND (
             next_scheduled_collection_at IS NULL
             OR next_scheduled_collection_at <= now()
           )
           AND (
             last_successful_retrieval IS NULL
             OR last_successful_retrieval +
               GREATEST(
                 expected_refresh_hours * interval '1 hour',
                 $2::double precision * interval '1 millisecond'
               ) <= now()
           )
           AND NOT EXISTS (
             SELECT 1
             FROM public.ingestion_jobs AS job
             WHERE job.source_id = opportunity_sources.id
               AND job.status IN ('pending', 'running')
           )
         ORDER BY COALESCE(
           next_scheduled_collection_at,
           last_successful_retrieval + GREATEST(
             expected_refresh_hours * interval '1 hour',
             $2::double precision * interval '1 millisecond'
           ),
           '-infinity'::timestamptz
         ), id
         LIMIT $1`,
        [schedule.limit, schedule.minimumCollectionIntervalMs, schedule.connectorIds],
      );
      return mapSourceRows(result.rows);
    }

    const result = await this.database.query<DbRow>(
      `${sourceSelect}
       WHERE activation_status = 'active'
         AND integration_status = 'operational'
         AND approval_status IN ('approved', 'approved_with_constraints')
         AND reliability_status IN ('verified', 'reliable')
         AND (approval_expires_at IS NULL OR approval_expires_at > now())
       ORDER BY name`,
    );
    return mapSourceRows(result.rows);
  }

  async getSourceCountryCoverage(
    sourceId: string,
  ): Promise<SourceCountryCoverageRecord[]> {
    const result = await this.database.query<DbRow>(
      `SELECT source_id, country_code, category_code, coverage_status,
              verified_at, verification_evidence_url
       FROM public.source_country_coverage
       WHERE source_id = $1
       ORDER BY country_code, category_code`,
      [sourceId],
    );
    return result.rows.map((row) => ({
      sourceId: requiredString(row, "source_id"),
      countryCode: requiredString(row, "country_code"),
      categoryCode: requiredString(row, "category_code"),
      coverageStatus: requiredString(row, "coverage_status"),
      verifiedAt: dateToIso(row.verified_at),
      evidenceUrl: nullableString(row, "verification_evidence_url"),
    }));
  }

  async hasVerifiedCountryCoverage(
    sourceId: string,
    countryCode: string,
    categoryCode: CategoryMapping["category"],
  ): Promise<boolean> {
    const result = await this.database.query<DbRow>(
      `SELECT 1
       FROM public.source_country_coverage AS coverage
       JOIN public.opportunity_sources AS source ON source.id = coverage.source_id
       WHERE coverage.source_id = $1
         AND coverage.country_code = $2
         AND coverage.category_code = $3
         AND coverage.coverage_status IN ('verified', 'operational', 'live_verified')
         AND source.activation_status = 'active'
         AND source.approval_status IN ('approved', 'approved_with_constraints')
       LIMIT 1`,
      [sourceId, countryCode, categoryCode],
    );
    return result.rows.length > 0;
  }

  async beginRun(sourceId: string, startedAt: string): Promise<string> {
    const result = await this.database.query<DbRow>(
      `INSERT INTO public.ingestion_runs (
         source_id, status, started_at, collector_identifier
       )
       SELECT id, 'running', $2::timestamptz,
              COALESCE(connector_identifier, $3)
       FROM public.opportunity_sources
       WHERE id = $1
       RETURNING id`,
      [sourceId, startedAt, this.collectorIdentifier],
    );
    if (!result.rows[0]) {
      throw new IngestionRepositoryError("Cannot create a collection run for an unknown source.");
    }
    return requiredString(result.rows[0], "id");
  }

  async beginRunForJob(
    lease: JobLease,
    startedAt: string,
  ): Promise<string> {
    return this.database.transaction(async (transaction) => {
      const job = await this.lockOwnedJob(transaction, lease);
      await this.assertCollectableSource(
        transaction,
        requiredString(job, "source_id"),
      );
      const result = await transaction.query<DbRow>(
        `INSERT INTO public.ingestion_runs (
           source_id, status, started_at, collector_identifier, job_id
         )
         SELECT source.id, 'running', $2::timestamptz,
                COALESCE(source.connector_identifier, $3), job.id
         FROM public.ingestion_jobs AS job
         JOIN public.opportunity_sources AS source ON source.id = job.source_id
         WHERE job.id = $1
         RETURNING id`,
        [requiredString(job, "id"), startedAt, this.collectorIdentifier],
      );
      if (!result.rows[0]) {
        throw new IngestionRepositoryError("Cannot create a collection run for the claimed job.");
      }
      return requiredString(result.rows[0], "id");
    });
  }

  async findSourceRecord(sourceId: string, externalId: string) {
    const result = await this.database.query<DbRow>(
      `${opportunitySelect}
       WHERE r.source_id = $1 AND r.external_record_id = $2
       LIMIT 1`,
      [sourceId, externalId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const stored = mapOpportunity(row);
    return { id: stored.id, opportunity: stored.opportunity };
  }

  async listOpportunities(): Promise<readonly StoredOpportunity[]> {
    const result = await this.database.query<DbRow>(
      `${opportunitySelect}
       ORDER BY o.first_discovered_at DESC, o.id, r.source_id`,
    );
    return result.rows.map(mapOpportunity);
  }

  async save(
    opportunity: NormalizedOpportunity,
    issues: readonly QualityIssue[],
    duplicateCandidates: readonly { opportunityId: string; confidence: number }[],
  ): Promise<"created" | "updated" | "unchanged"> {
    const mappingResult = categoryMappingSchema.safeParse({
      sourceId: opportunity.sourceId,
      countryCode: opportunity.countryCode,
      sourceTerm: opportunity.sourceCategoryTerm,
      category: opportunity.category,
      globalType: opportunity.globalType,
    });
    if (!mappingResult.success) {
      throw new IngestionRepositoryError("Normalized source opportunity failed its contract validation.");
    }
    return this.database.transaction(async (transaction) => {
      await this.assertCollectableSource(transaction, opportunity.sourceId);
      await this.assertCollectableCoverage(
        transaction,
        opportunity.sourceId,
        opportunity.countryCode,
        opportunity.category,
      );
      await transaction.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        [opportunity.sourceId, opportunity.externalId],
      );
      const existing = await transaction.query<DbRow>(
        `SELECT id, opportunity_id, content_fingerprint
         FROM public.opportunity_source_records
         WHERE source_id = $1 AND external_record_id = $2
         FOR UPDATE`,
        [opportunity.sourceId, opportunity.externalId],
      );
      const sourceRecord = existing.rows[0];
      if (
        sourceRecord &&
        sourceRecord.content_fingerprint === opportunity.contentFingerprint
      ) {
        await transaction.query(
          `UPDATE public.opportunity_source_records
           SET last_seen_at = now()
           WHERE id = $1`,
          [requiredString(sourceRecord, "id")],
        );
        return "unchanged";
      }

      const originalValues = jsonString(sanitizeJson(opportunity.originalValues), "originalValues");
      const canonicalUrl = opportunity.canonicalUrlNormalized;
      const qualityStatus = issues.some((issue) => issue.severity === "error")
        ? "pending_review"
        : issues.length > 0
          ? "incomplete"
          : "valid";
      const opportunityValues: DatabaseParameter[] = [
        opportunity.title,
        opportunity.description,
        opportunity.category,
        opportunity.globalType,
        opportunity.countryCode,
        opportunity.region,
        opportunity.city,
        opportunity.issuingInstitution,
        opportunity.procuringOrganization,
        opportunity.publisher,
        opportunity.referenceNumber,
        opportunity.publishedAt,
        opportunity.closingAt,
        opportunity.timeZone,
        opportunity.status,
        canonicalUrl,
        opportunity.currency,
        opportunity.amount,
        JSON.stringify({}),
        qualityStatus,
      ];

      let opportunityId: string;
      let sourceRecordId: string;
      let outcome: "created" | "updated";

      if (sourceRecord) {
        opportunityId = requiredString(sourceRecord, "opportunity_id");
        sourceRecordId = requiredString(sourceRecord, "id");
        await transaction.query(
          `SELECT id FROM public.opportunities WHERE id = $1 FOR UPDATE`,
          [opportunityId],
        );
        await transaction.query(
          `UPDATE public.opportunities SET
             title = $2, description = $3, category_code = $4,
             opportunity_type_code = $5, country_code = $6, region = $7,
             city = $8, issuing_institution = $9, procuring_organization = $10,
             publisher = $11, reference_number = $12, published_at = $13,
             closing_at = $14, time_zone = $15, status = $16,
             canonical_url = $17, original_currency_code = $18,
             published_amount = $19, amount_basis = CASE
               WHEN $19::numeric IS NULL THEN NULL ELSE 'published'
             END,
             eligibility = $20::jsonb, data_quality_status = $21,
             dedupe_key = $22,
             source_verified_at = now(), updated_at = now()
           WHERE id = $1`,
          [opportunityId, ...opportunityValues, opportunity.canonicalKey],
        );
        await transaction.query(
          `UPDATE public.opportunity_source_records SET
             original_title = $2, original_deadline_text = $3,
             original_classification = $4, source_url = $5, canonical_url = $6,
             original_values = $7::jsonb, content_fingerprint = $8,
             last_seen_at = now()
           WHERE id = $1`,
          [
            sourceRecordId,
            opportunity.title,
            opportunity.sourceDeadlineText,
            opportunity.sourceCategoryTerm,
            opportunity.sourceUrl,
            canonicalUrl,
            originalValues,
            opportunity.contentFingerprint,
          ],
        );
        await this.insertVersion(transaction, opportunityId, sourceRecordId, opportunity);
        outcome = "updated";
      } else {
        await transaction.query(
          "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
          [`${opportunity.countryCode}:${opportunity.category}`, canonicalUrl],
        );
        if (opportunity.canonicalKey) {
          // Cross-url dedupe serializes on notice identity too, so two
          // sources publishing the same notice at different urls cannot
          // both miss the match and insert duplicates.
          await transaction.query(
            "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
            [`dk1:${opportunity.countryCode}`, opportunity.canonicalKey],
          );
        }
        const canonicalMatch = await transaction.query<DbRow>(
          `SELECT opportunity.id
           FROM public.opportunities AS opportunity
           JOIN public.opportunity_source_records AS source_record
             ON source_record.opportunity_id = opportunity.id
           WHERE opportunity.country_code = $2
             AND opportunity.category_code = $3
             AND opportunity.opportunity_type_code = $4
             AND (
               opportunity.canonical_url = $1
               OR ($5::text IS NOT NULL AND opportunity.dedupe_key = $5)
             )
           ORDER BY opportunity.first_discovered_at, opportunity.id
           LIMIT 1
           FOR UPDATE OF opportunity`,
          [
            canonicalUrl,
            opportunity.countryCode,
            opportunity.category,
            opportunity.globalType,
            opportunity.canonicalKey,
          ],
        );
        const matchingOpportunity = canonicalMatch.rows[0];
        if (matchingOpportunity) {
          opportunityId = requiredString(matchingOpportunity, "id");
          const insertedRecord = await transaction.query<DbRow>(
            `INSERT INTO public.opportunity_source_records (
               opportunity_id, source_id, external_record_id, original_title,
               original_deadline_text, original_classification, source_url,
               canonical_url, original_values, content_fingerprint
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
             RETURNING id`,
            [
              opportunityId,
              opportunity.sourceId,
              opportunity.externalId,
              opportunity.title,
              opportunity.sourceDeadlineText,
              opportunity.sourceCategoryTerm,
              opportunity.sourceUrl,
              canonicalUrl,
              originalValues,
              opportunity.contentFingerprint,
            ],
          );
          const newSourceRecord = insertedRecord.rows[0];
          if (!newSourceRecord) {
            throw new IngestionRepositoryError("Source record insert returned no row.");
          }
          sourceRecordId = requiredString(newSourceRecord, "id");
          outcome = "updated";
        } else {
          const inserted = await transaction.query<DbRow>(
          `INSERT INTO public.opportunities (
             title, description, category_code, opportunity_type_code,
             country_code, region, city, issuing_institution,
             procuring_organization, publisher, reference_number,
             published_at, closing_at, time_zone, status, canonical_url,
             original_currency_code, published_amount, amount_basis,
             eligibility, data_quality_status, source_verified_at, dedupe_key
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15, $16, $17, $18,
             CASE WHEN $18::numeric IS NULL THEN NULL ELSE 'published' END,
             $19::jsonb, $20, now(), $21
           )
           RETURNING id`,
            [...opportunityValues, opportunity.canonicalKey],
          );
          const newOpportunity = inserted.rows[0];
          if (!newOpportunity) throw new IngestionRepositoryError("Opportunity insert returned no row.");
          opportunityId = requiredString(newOpportunity, "id");
          const insertedRecord = await transaction.query<DbRow>(
          `INSERT INTO public.opportunity_source_records (
             opportunity_id, source_id, external_record_id, original_title,
             original_deadline_text, original_classification, source_url,
             canonical_url, original_values, content_fingerprint
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
           RETURNING id`,
          [
            opportunityId,
            opportunity.sourceId,
            opportunity.externalId,
            opportunity.title,
            opportunity.sourceDeadlineText,
            opportunity.sourceCategoryTerm,
            opportunity.sourceUrl,
            canonicalUrl,
            originalValues,
            opportunity.contentFingerprint,
          ],
          );
          const newSourceRecord = insertedRecord.rows[0];
          if (!newSourceRecord) {
            throw new IngestionRepositoryError("Source record insert returned no row.");
          }
          sourceRecordId = requiredString(newSourceRecord, "id");
          await this.insertVersion(transaction, opportunityId, sourceRecordId, opportunity);
          outcome = "created";
        }
      }

      await this.insertQualityIssues(transaction, opportunityId, sourceRecordId, issues);
      for (const duplicate of duplicateCandidates) {
        await transaction.query(
          `INSERT INTO public.opportunity_duplicate_candidates (
             opportunity_id, candidate_opportunity_id, confidence, evidence
           )
           SELECT LEAST($1::uuid, $2::uuid), GREATEST($1::uuid, $2::uuid),
                  $3, ARRAY['normalized_match']::text[]
           WHERE $1::uuid <> $2::uuid
           ON CONFLICT (opportunity_id, candidate_opportunity_id)
           DO UPDATE SET confidence = GREATEST(
             public.opportunity_duplicate_candidates.confidence,
             EXCLUDED.confidence
           )`,
          [opportunityId, duplicate.opportunityId, duplicate.confidence],
        );
      }
      return outcome;
    });
  }

  async reject(
    runId: string,
    externalId: string | null,
    issues: readonly QualityIssue[],
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      for (const issue of issues) {
        await this.insertRunError(transaction, runId, externalId, issue, 0);
        await this.insertQualityIssue(transaction, runId, issue);
      }
    });
  }

  async review(
    runId: string,
    sourceId: string,
    externalId: string,
    sourceRecord: unknown,
    issues: readonly QualityIssue[],
  ): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const record = sanitizeJson(sourceRecord);
      await transaction.query(
        `INSERT INTO public.ingestion_review_queue (
           run_id, source_id, external_record_id,
           parsed_source_record, quality_issues
         ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)`,
        [
          runId,
          sourceId,
          externalId,
          jsonString(record, "sourceRecord"),
          jsonString(issues.map((issue) => ({
            ...issue,
            message: redactSensitiveText(issue.message),
          })), "qualityIssues"),
        ],
      );
      for (const issue of issues) {
        await this.insertRunError(transaction, runId, externalId, issue, 0);
        await this.insertQualityIssue(transaction, runId, issue);
      }
    });
  }

  async finishRun(summary: IngestionSummary, finishedAt: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      const result = await transaction.query(
        `UPDATE public.ingestion_runs SET
           status = $2,
           finished_at = $3::timestamptz,
           discovered_count = $4,
           parsed_count = $5,
           accepted_count = $6,
           created_count = $7,
           updated_count = $8,
           rejected_count = $9,
           review_count = $10,
           duplicate_count = $11,
           failed_count = $12,
           execution_duration_ms = GREATEST(
             0,
             floor(extract(epoch FROM ($3::timestamptz - started_at)) * 1000)::bigint
           )
         WHERE id = $1 AND status = 'running'`,
        [
          summary.runId,
          toRunStatus(summary.status),
          finishedAt,
          summary.discovered,
          summary.parsedCount ?? 0,
          summary.acceptedCount ?? summary.created + summary.updated + summary.unchanged,
          summary.created,
          summary.updated,
          summary.rejected,
          summary.pendingReview,
          summary.duplicateCount ?? 0,
          summary.failedCount ?? summary.rejected,
        ],
      );
      if (result.rowCount !== 1) {
        throw new IngestionRepositoryError("Ingestion run was not running or could not be completed.");
      }
      const source = await transaction.query(
        `UPDATE public.opportunity_sources AS source SET
           last_successful_retrieval = CASE
             WHEN $2 IN ('succeeded', 'completed_with_review')
               THEN $3::timestamptz
             ELSE source.last_successful_retrieval
           END,
           last_unsuccessful_retrieval = CASE
             WHEN $2 IN ('failed', 'completed_with_errors')
               THEN $3::timestamptz
             ELSE source.last_unsuccessful_retrieval
           END,
           source_health = CASE
             WHEN $2 IN ('succeeded', 'completed_with_review') THEN 'healthy'
             WHEN $2 = 'completed_with_errors' THEN 'degraded'
             ELSE 'unavailable'
           END,
           updated_at = now()
         WHERE source.id = (
           SELECT source_id FROM public.ingestion_runs WHERE id = $1
         )`,
        [summary.runId, summary.status, finishedAt],
      );
      if (source.rowCount !== 1) {
        throw new IngestionRepositoryError("Ingestion run source health could not be updated.");
      }
    });
  }

  async getCursor(sourceId: string, cursorName = "default"): Promise<SourceCursor | null> {
    const result = await this.database.query<DbRow>(
      `SELECT source_id, cursor_name, cursor_value, pagination_token,
              last_seen_external_id, etag, last_modified, state,
              synchronized_at, cursor_version
       FROM public.source_cursors
       WHERE source_id = $1 AND cursor_name = $2`,
      [sourceId, cursorName],
    );
    const row = result.rows[0];
    return row ? this.mapCursor(row) : null;
  }

  async commitCursorForJob(
    lease: JobLease,
    cursor: SourceCursor,
    expectedVersion: number,
  ): Promise<SourceCursor> {
    const parsed = sourceCursorSchema.parse(cursor);
    if (!parsed.synchronizedAt) {
      throw new IngestionRepositoryError("Cursor commits require a synchronization timestamp.");
    }
    return this.database.transaction(async (transaction) => {
      const job = await this.lockOwnedJob(transaction, lease);
      if (job.source_id !== parsed.sourceId) {
        throw new IngestionRepositoryError("Cursor source does not match the claimed job.");
      }
      return this.upsertCursor(transaction, parsed, expectedVersion);
    });
  }

  async enqueueJob(input: EnqueueIngestionJobInput): Promise<IngestionJob> {
    const result = await this.database.query<DbRow>(
      `INSERT INTO public.ingestion_jobs (
         source_id, job_type, idempotency_key, priority,
         maximum_retries, next_execution_at
       )
       SELECT source.id, $2, $3, $4, $5, COALESCE($6::timestamptz, now())
       FROM public.opportunity_sources AS source
       WHERE source.id = $1
         AND source.activation_status = 'active'
         AND source.integration_status = 'operational'
         AND source.approval_status IN ('approved', 'approved_with_constraints')
         AND source.reliability_status IN ('verified', 'reliable')
         AND source.connector_identifier IS NOT NULL
         AND source.access_method IN ('api', 'feed', 'permitted_web')
         AND (source.approval_expires_at IS NULL OR source.approval_expires_at > now())
       ON CONFLICT (source_id, job_type, idempotency_key)
       DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
       RETURNING *`,
      [
        input.sourceId,
        input.jobType,
        input.idempotencyKey,
        input.priority ?? 100,
        input.maximumRetries ?? 5,
        input.nextExecutionAt ?? null,
      ],
    );
    if (!result.rows[0]) {
      throw new IngestionRepositoryError(
        "Source is not authorized, active, operational, or within its approval period.",
      );
    }
    return mapJob(result.rows[0]);
  }

  // Finalizes ingestion_runs left in 'running' by crashed executions
  // (CPU-limit kills, isolate eviction): the owning job reached a terminal
  // state, or the run is beyond the execution window. Backed by the
  // reap_zombie_ingestion_runs() function from migration 0030. Zombies
  // otherwise pollute the run funnel that /admin/ingestion and the Stage 0
  // gate read.
  async reapZombieRuns(maximumRunningAge = "30 minutes"): Promise<number> {
    const result = await this.database.query<DbRow>(
      `SELECT public.reap_zombie_ingestion_runs($1::interval) AS reaped`,
      [maximumRunningAge],
    );
    const reaped = result.rows[0]?.reaped;
    const count = Number(reaped ?? 0);
    return Number.isFinite(count) ? count : 0;
  }

  async enqueueScheduledJob(
    input: EnqueueScheduledIngestionJobInput,
  ): Promise<IngestionJob | null> {
    if (
      !input.nextScheduledCollectionAt ||
      !Number.isInteger(input.minimumCollectionIntervalMs) ||
      input.minimumCollectionIntervalMs < 60_000 ||
      input.minimumCollectionIntervalMs > 30 * 24 * 60 * 60 * 1000
    ) {
      throw new IngestionRepositoryError("Scheduled jobs require a valid next schedule and interval.");
    }
    return this.database.transaction(async (transaction) => {
      const source = await transaction.query<DbRow>(
        `SELECT source.id
         FROM public.opportunity_sources AS source
         WHERE source.id = $1
           AND source.activation_status = 'active'
           AND source.integration_status = 'operational'
           AND source.approval_status IN ('approved', 'approved_with_constraints')
           AND source.reliability_status IN ('verified', 'reliable')
           AND source.connector_identifier IS NOT NULL
           AND source.access_method IN ('api', 'feed', 'permitted_web')
           AND (source.approval_expires_at IS NULL OR source.approval_expires_at > now())
           AND (source.next_scheduled_collection_at IS NULL
             OR source.next_scheduled_collection_at <= now())
           AND (source.last_successful_retrieval IS NULL
             OR source.last_successful_retrieval + GREATEST(
               source.expected_refresh_hours * interval '1 hour',
               $2::double precision * interval '1 millisecond'
             ) <= now())
           AND NOT EXISTS (
             SELECT 1 FROM public.ingestion_jobs AS job
             WHERE job.source_id = source.id
               AND job.status IN ('pending', 'running')
           )
         FOR UPDATE OF source`,
        [input.sourceId, input.minimumCollectionIntervalMs],
      );
      if (!source.rows[0]) return null;

      const inserted = await transaction.query<DbRow>(
        `INSERT INTO public.ingestion_jobs (
           source_id, job_type, idempotency_key, priority,
           maximum_retries, next_execution_at
         ) VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()))
         ON CONFLICT (source_id, job_type, idempotency_key) DO NOTHING
         RETURNING *`,
        [
          input.sourceId,
          input.jobType,
          input.idempotencyKey,
          input.priority ?? 100,
          input.maximumRetries ?? 5,
          input.nextExecutionAt ?? null,
        ],
      );
      const scheduleUpdate = await transaction.query(
        `UPDATE public.opportunity_sources
         SET next_scheduled_collection_at = $2::timestamptz
         WHERE id = $1
           AND (approval_expires_at IS NULL OR approval_expires_at > now())
           AND $2::timestamptz > now()`,
        [input.sourceId, input.nextScheduledCollectionAt],
      );
      if (scheduleUpdate.rowCount !== 1) {
        throw new IngestionRepositoryError("Source schedule could not be advanced.");
      }
      return inserted.rows[0] ? mapJob(inserted.rows[0]) : null;
    });
  }

  async getEligiblePendingJobs(limit = 100): Promise<IngestionJob[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new IngestionRepositoryError("Job batch size must be between 1 and 1000.");
    }
    const result = await this.database.query<DbRow>(
      `SELECT job.* FROM public.ingestion_jobs AS job
       JOIN public.opportunity_sources AS source ON source.id = job.source_id
       WHERE (
         (job.status = 'pending' AND job.next_execution_at <= now())
         OR (job.status = 'running' AND job.locked_until <= now())
       )
         AND job.attempt_count < job.maximum_retries + 1
         AND source.activation_status = 'active'
         AND source.integration_status = 'operational'
         AND source.approval_status IN ('approved', 'approved_with_constraints')
         AND source.reliability_status IN ('verified', 'reliable')
         AND source.connector_identifier IS NOT NULL
         AND source.access_method IN ('api', 'feed', 'permitted_web')
         AND (source.approval_expires_at IS NULL OR source.approval_expires_at > now())
       ORDER BY job.priority ASC, job.next_execution_at ASC, job.created_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map(mapJob);
  }

  async claimNextJob(
    workerId: string,
    leaseSeconds = 60,
    supportedConnectorIds?: readonly string[],
  ): Promise<{
    job: IngestionJob;
    lease: JobLease;
  } | null> {
    if (!workerId.trim() || workerId.length > 200) {
      throw new IngestionRepositoryError("Worker identifier is invalid.");
    }
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 5 || leaseSeconds > 3600) {
      throw new IngestionRepositoryError("Job lease must be between 5 and 3600 seconds.");
    }
    return this.database.transaction(async (transaction) => {
      await transaction.query(
        `UPDATE public.ingestion_jobs
         SET status = 'dead_lettered',
             completed_at = now(),
             started_at = COALESCE(started_at, now()),
             locked_by = NULL,
             locked_until = NULL,
             lease_token = NULL,
             last_error = COALESCE(last_error, 'Lease expired after retry limit.'),
             updated_at = now()
         WHERE status IN ('pending', 'running')
           AND attempt_count >= maximum_retries + 1
           AND (status = 'pending' OR locked_until <= now())`,
      );
      await transaction.query(
        `UPDATE public.ingestion_jobs
         SET status = 'pending',
             next_execution_at = LEAST(next_execution_at, now()),
             locked_by = NULL,
             locked_until = NULL,
             lease_token = NULL,
             last_error = COALESCE(last_error, 'Previous worker lease expired.'),
             updated_at = now()
         WHERE status = 'running'
           AND locked_until <= now()
           AND attempt_count < maximum_retries + 1`,
      );
      await transaction.query(
        `UPDATE public.ingestion_jobs AS job
         SET status = 'dead_lettered',
             completed_at = now(),
             started_at = COALESCE(started_at, now()),
             locked_by = NULL,
             locked_until = NULL,
             lease_token = NULL,
             last_error = 'Source is no longer authorized for collection.',
             updated_at = now()
         WHERE (job.status = 'pending' OR job.locked_until <= now())
           AND EXISTS (
             SELECT 1
             FROM public.opportunity_sources AS source
             WHERE source.id = job.source_id
               AND (
                 source.activation_status <> 'active'
                 OR source.integration_status <> 'operational'
                 OR source.approval_status NOT IN ('approved', 'approved_with_constraints')
                 OR source.reliability_status NOT IN ('verified', 'reliable')
                 OR source.connector_identifier IS NULL
                 OR source.access_method NOT IN ('api', 'feed', 'permitted_web')
                 OR (
                   source.approval_expires_at IS NOT NULL
                   AND source.approval_expires_at <= now()
                 )
               )
           )`,
      );
      const result = await transaction.query<DbRow>(
        `WITH candidate AS (
           SELECT job.id
           FROM public.ingestion_jobs AS job
           JOIN public.opportunity_sources AS source
             ON source.id = job.source_id
           WHERE job.status = 'pending'
             AND job.next_execution_at <= now()
             AND job.attempt_count < job.maximum_retries + 1
             AND source.activation_status = 'active'
             AND source.integration_status = 'operational'
             AND source.approval_status IN ('approved', 'approved_with_constraints')
             AND source.reliability_status IN ('verified', 'reliable')
             AND source.connector_identifier IS NOT NULL
             AND source.access_method IN ('api', 'feed', 'permitted_web')
             AND (source.approval_expires_at IS NULL OR source.approval_expires_at > now())
             AND ($3::text[] IS NULL OR source.connector_identifier = ANY($3::text[]))
             AND NOT EXISTS (
               SELECT 1
               FROM public.ingestion_jobs AS active_job
               WHERE active_job.source_id = source.id
                 AND active_job.status = 'running'
                 AND active_job.locked_until > now()
             )
           ORDER BY job.priority ASC, job.next_execution_at ASC, job.created_at ASC
           FOR UPDATE OF job, source SKIP LOCKED
           LIMIT 1
         )
         UPDATE public.ingestion_jobs AS job SET
           status = 'running',
           attempt_count = job.attempt_count + 1,
           locked_by = $1,
           locked_until = now() + ($2::double precision * interval '1 second'),
           lease_token = gen_random_uuid(),
           started_at = now(),
           completed_at = NULL,
           last_error = CASE
             WHEN job.status = 'running'
               THEN COALESCE(job.last_error, 'Previous worker lease expired.')
             ELSE job.last_error
           END,
           updated_at = now()
         FROM candidate
         WHERE job.id = candidate.id
         RETURNING job.*`,
        [workerId, leaseSeconds, supportedConnectorIds ?? null],
      );
      const row = result.rows[0];
      if (!row) return null;
      const job = mapJob(row);
      return {
        job,
        lease: {
          jobId: job.id,
          workerId,
          leaseToken: job.leaseToken ?? "",
        },
      };
    });
  }

  async renewJobLease(lease: JobLease, leaseSeconds = 60): Promise<IngestionJob> {
    if (!Number.isInteger(leaseSeconds) || leaseSeconds < 5 || leaseSeconds > 3600) {
      throw new IngestionRepositoryError("Job lease must be between 5 and 3600 seconds.");
    }
    const result = await this.database.query<DbRow>(
      `UPDATE public.ingestion_jobs SET
         locked_until = now() + ($4::double precision * interval '1 second'),
         updated_at = now()
       WHERE id = $1 AND status = 'running'
         AND locked_by = $2 AND lease_token = $3
         AND locked_until > now()
       RETURNING *`,
      [lease.jobId, lease.workerId, lease.leaseToken, leaseSeconds],
    );
    if (!result.rows[0]) throw new JobLeaseError();
    return mapJob(result.rows[0]);
  }

  async completeJob(
    lease: JobLease,
    cursorCommit?: { cursor: SourceCursor; expectedVersion: number },
  ): Promise<IngestionJob> {
    return this.database.transaction(async (transaction) => {
      const job = await this.lockOwnedJob(transaction, lease);
      await this.assertCollectableSource(
        transaction,
        requiredString(job, "source_id"),
      );
      if (cursorCommit) {
        const cursor = sourceCursorSchema.parse(cursorCommit.cursor);
        if (cursor.sourceId !== job.source_id || !cursor.synchronizedAt) {
          throw new IngestionRepositoryError("Cursor commit does not match the job source.");
        }
        await this.upsertCursor(transaction, cursor, cursorCommit.expectedVersion);
      }
      const result = await transaction.query<DbRow>(
        `UPDATE public.ingestion_jobs SET
           status = 'succeeded',
           locked_by = NULL, locked_until = NULL, lease_token = NULL,
           completed_at = now(), last_error = NULL, updated_at = now()
         WHERE id = $1 AND status = 'running'
           AND locked_by = $2 AND lease_token = $3
           AND locked_until > now()
         RETURNING *`,
        [lease.jobId, lease.workerId, lease.leaseToken],
      );
      if (!result.rows[0]) throw new JobLeaseError();
      return mapJob(result.rows[0]);
    });
  }

  async failJob(
    lease: JobLease,
    error: unknown,
    retryable = true,
  ): Promise<IngestionJob> {
    const message = redactSensitiveText(
      error instanceof Error ? error.message : "Ingestion job failed with an unknown error.",
    );
    return this.database.transaction(async (transaction) => {
      const job = await this.lockOwnedJob(transaction, lease);
      const attempts = numberValue(job.attempt_count, "attempt_count");
      const maximumRetries = numberValue(job.maximum_retries, "maximum_retries");
      const terminal = !retryable || attempts >= maximumRetries + 1;
      const delayMs = retryDelayMs(attempts);
      const result = await transaction.query<DbRow>(
        `UPDATE public.ingestion_jobs SET
           status = CASE WHEN $4 THEN 'dead_lettered' ELSE 'pending' END,
           next_execution_at = CASE
             WHEN $4 THEN next_execution_at
             ELSE now() + ($5::double precision * interval '1 millisecond')
           END,
           locked_by = NULL, locked_until = NULL, lease_token = NULL,
           completed_at = CASE WHEN $4 THEN now() ELSE NULL END,
           last_error = $6, updated_at = now()
         WHERE id = $1 AND status = 'running'
           AND locked_by = $2 AND lease_token = $3
           AND locked_until > now()
         RETURNING *`,
        [lease.jobId, lease.workerId, lease.leaseToken, terminal, delayMs, message],
      );
      if (!result.rows[0]) throw new JobLeaseError();
      return mapJob(result.rows[0]);
    });
  }

  async storeRawRecord(
    envelope: RawSourceRecordEnvelope,
  ): Promise<RawSourceRecordResult> {
    const parsed = rawSourceRecordEnvelopeSchema.parse(envelope);
    return this.database.transaction(async (transaction) => {
      await this.assertCollectableSource(transaction, parsed.sourceId);
      const inserted = await transaction.query<DbRow>(
        `INSERT INTO public.raw_source_records (
           source_id, external_record_id, source_url, content_type,
           payload_json, payload_text, r2_bucket, r2_object_key,
           payload_checksum, collection_run_id
         ) VALUES (
           $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10
         )
         ON CONFLICT (source_id, external_record_id, payload_checksum)
         DO UPDATE SET
           last_seen_at = GREATEST(
             public.raw_source_records.last_seen_at,
             EXCLUDED.last_seen_at
           ),
           collection_run_id = COALESCE(
             EXCLUDED.collection_run_id,
             public.raw_source_records.collection_run_id
           ),
           updated_at = now()
         RETURNING id, processing_state, (xmax = 0) AS inserted`,
        [
          parsed.sourceId,
          parsed.externalRecordId,
          parsed.sourceUrl,
          parsed.contentType,
          parsed.payloadJson === undefined ? null : jsonString(parsed.payloadJson, "payloadJson"),
          parsed.payloadText ?? null,
          parsed.r2Bucket ?? null,
          parsed.r2ObjectKey ?? null,
          parsed.payloadChecksum,
          parsed.collectionRunId,
        ],
      );
      const row = inserted.rows[0];
      if (!row) throw new IngestionRepositoryError("Raw record insert returned no row.");
      return {
        id: requiredString(row, "id"),
        inserted: row.inserted === true,
        processingState: requiredString(row, "processing_state"),
      };
    });
  }

  async markRawProcessing(rawRecordId: string): Promise<void> {
    const result = await this.database.query(
      `UPDATE public.raw_source_records SET
         processing_state = 'processing',
         next_processing_attempt_at = NULL,
         processing_error = NULL,
         updated_at = now()
       WHERE id = $1
         AND processing_state IN ('pending', 'processing', 'failed')
         AND (next_processing_attempt_at IS NULL OR next_processing_attempt_at <= now())`,
      [rawRecordId],
    );
    if (result.rowCount !== 1) {
      throw new IngestionRepositoryError("Raw source record is not eligible for processing.");
    }
  }

  async markRawProcessingFailure(
    rawRecordId: string,
    error: unknown,
  ): Promise<void> {
    const message = redactSensitiveText(
      error instanceof Error ? error.message : "Raw source processing failed.",
    );
    const result = await this.database.query(
      `UPDATE public.raw_source_records SET
         processing_state = 'failed',
         processing_attempt_count = processing_attempt_count + 1,
         processing_error = $2,
         next_processing_attempt_at = now() + (
           LEAST(
             3600000,
             1000 * power(2, LEAST(processing_attempt_count, 12))
           ) * interval '1 millisecond'
         ),
         updated_at = now()
       WHERE id = $1`,
      [rawRecordId, message],
    );
    if (result.rowCount !== 1) {
      throw new IngestionRepositoryError("Raw source record was not found.");
    }
  }

  async markRawReview(rawRecordId: string): Promise<void> {
    const result = await this.database.query(
      `UPDATE public.raw_source_records SET
         processing_state = 'review',
         processing_error = NULL,
         next_processing_attempt_at = NULL,
         updated_at = now()
       WHERE id = $1 AND processing_state IN ('pending', 'processing', 'failed')`,
      [rawRecordId],
    );
    if (result.rowCount !== 1) {
      throw new IngestionRepositoryError("Raw source record could not be moved to review.");
    }
  }

  async markRawAccepted(
    rawRecordId: string,
    sourceRecordId: string,
    canonicalOpportunityId: string,
  ): Promise<void> {
    const result = await this.database.query(
      `UPDATE public.raw_source_records AS raw SET
         processing_state = 'accepted',
         source_record_id = $2,
         canonical_opportunity_id = $3,
         processing_error = NULL,
         next_processing_attempt_at = NULL,
         updated_at = now()
       FROM public.opportunity_source_records AS source_record
       WHERE raw.id = $1
         AND source_record.id = $2
         AND source_record.source_id = raw.source_id
         AND source_record.opportunity_id = $3`,
      [rawRecordId, sourceRecordId, canonicalOpportunityId],
    );
    if (result.rowCount !== 1) {
      throw new IngestionRepositoryError("Raw record could not be linked to its canonical source record.");
    }
  }

  async markRawAcceptedByExternalId(
    rawRecordId: string,
    sourceId: string,
    externalId: string,
  ): Promise<void> {
    const result = await this.database.query(
      `UPDATE public.raw_source_records AS raw SET
         processing_state = 'accepted',
         source_record_id = source_record.id,
         canonical_opportunity_id = source_record.opportunity_id,
         processing_error = NULL,
         next_processing_attempt_at = NULL,
         updated_at = now()
       FROM public.opportunity_source_records AS source_record
       WHERE raw.id = $1
         AND raw.source_id = $2
         AND raw.external_record_id = $3
         AND source_record.source_id = raw.source_id
         AND source_record.external_record_id = raw.external_record_id`,
      [rawRecordId, sourceId, externalId],
    );
    if (result.rowCount !== 1) {
      throw new IngestionRepositoryError("Raw source record could not be linked to its persisted source record.");
    }
  }

  private async assertCollectableSource(
    transaction: DatabaseTransaction,
    sourceId: string,
  ): Promise<void> {
    const result = await transaction.query<DbRow>(
      `SELECT id FROM public.opportunity_sources
       WHERE id = $1
         AND activation_status = 'active'
         AND integration_status = 'operational'
         AND approval_status IN ('approved', 'approved_with_constraints')
         AND reliability_status IN ('verified', 'reliable')
         AND (approval_expires_at IS NULL OR approval_expires_at > now())
       FOR SHARE`,
      [sourceId],
    );
    if (!result.rows[0]) {
      throw new IngestionRepositoryError("Source is not approved and active for collection.");
    }
  }

  private async assertCollectableCoverage(
    transaction: DatabaseTransaction,
    sourceId: string,
    countryCode: string,
    categoryCode: string,
  ): Promise<void> {
    const coverage = await transaction.query<DbRow>(
      `SELECT 1
       FROM public.source_country_coverage
       WHERE source_id = $1
         AND country_code = $2
         AND category_code = $3
         AND coverage_status IN ('verified', 'operational', 'live_verified')
       FOR SHARE`,
      [sourceId, countryCode, categoryCode],
    );
    if (!coverage.rows[0]) {
      throw new IngestionRepositoryError("Source has no verified coverage for this country and category.");
    }
  }

  private async insertVersion(
    transaction: DatabaseTransaction,
    opportunityId: string,
    sourceRecordId: string,
    opportunity: NormalizedOpportunity,
  ): Promise<void> {
    const snapshot = jsonString({
      title: opportunity.title,
      description: opportunity.description,
      category: opportunity.category,
      type: opportunity.globalType,
      country: opportunity.countryCode,
      publisher: opportunity.publisher,
      reference: opportunity.referenceNumber,
      publishedAt: opportunity.publishedAt,
      closingAt: opportunity.closingAt,
      status: opportunity.status,
      canonicalUrl: opportunity.canonicalUrl ?? opportunity.canonicalUrlNormalized,
      amount: opportunity.amount,
      currency: opportunity.currency,
      contentFingerprint: opportunity.contentFingerprint,
    }, "opportunitySnapshot");
    await transaction.query(
      `INSERT INTO public.opportunity_versions (
         opportunity_id, version_number, source_record_id, snapshot,
         changed_fields
       )
       SELECT $1, COALESCE(MAX(version_number), 0) + 1, $2, $3::jsonb, $4::text[]
       FROM public.opportunity_versions
       WHERE opportunity_id = $1`,
      [
        opportunityId,
        sourceRecordId,
        snapshot,
        [
          "title", "description", "category", "type", "country", "publisher",
          "reference", "publishedAt", "closingAt", "status", "canonicalUrl",
          "amount", "currency",
        ],
      ],
    );
  }

  private async insertQualityIssues(
    transaction: DatabaseTransaction,
    opportunityId: string,
    sourceRecordId: string,
    issues: readonly QualityIssue[],
  ): Promise<void> {
    for (const issue of issues) {
      await transaction.query(
        `INSERT INTO public.opportunity_quality_issues (
           opportunity_id, source_record_id, issue_code, severity,
           field_name, message, decision
         ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          opportunityId,
          sourceRecordId,
          safeErrorCode(issue.code),
          issue.severity,
          issue.field ?? null,
          redactSensitiveText(issue.message),
          JSON.stringify({ decision: "recorded_during_ingestion" }),
        ],
      );
    }
  }

  private async insertQualityIssue(
    transaction: DatabaseTransaction,
    runId: string,
    issue: QualityIssue,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO public.opportunity_quality_issues (
         run_id, issue_code, severity, field_name, message, decision
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        runId,
        safeErrorCode(issue.code),
        issue.severity,
        issue.field ?? null,
        redactSensitiveText(issue.message),
        JSON.stringify({ decision: "recorded_during_ingestion" }),
      ],
    );
  }

  private async insertRunError(
    transaction: DatabaseTransaction,
    runId: string,
    externalId: string | null,
    issue: QualityIssue,
    retryCount: number,
  ): Promise<void> {
    await transaction.query(
      `INSERT INTO public.ingestion_errors (
         run_id, external_record_id, error_code, message, details, retry_count
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        runId,
        externalId,
        safeErrorCode(issue.code),
        redactSensitiveText(issue.message),
        JSON.stringify({ field: issue.field ?? null }),
        retryCount,
      ],
    );
  }

  private async mapCursor(row: DbRow): Promise<SourceCursor> {
    const parsed = sourceCursorSchema.safeParse({
      sourceId: row.source_id,
      cursorName: row.cursor_name,
      cursorValue: row.cursor_value,
      paginationToken: row.pagination_token,
      lastSeenExternalId: row.last_seen_external_id,
      etag: row.etag,
      lastModified: row.last_modified,
      state: jsonObject(row.state, "cursor.state"),
      synchronizedAt: dateToIso(row.synchronized_at),
      cursorVersion: numberValue(row.cursor_version, "cursor_version"),
    });
    if (!parsed.success) throw new IngestionRepositoryError("Stored source cursor failed validation.");
    return parsed.data;
  }

  private async upsertCursor(
    transaction: DatabaseTransaction,
    cursor: SourceCursor,
    expectedVersion: number,
  ): Promise<SourceCursor> {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
      throw new IngestionRepositoryError("Expected cursor version is invalid.");
    }
    const result = await transaction.query<DbRow>(
      `INSERT INTO public.source_cursors (
         source_id, cursor_name, cursor_value, pagination_token,
         last_seen_external_id, etag, last_modified, state,
         synchronized_at, cursor_version
       )
       SELECT $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz, 1
       WHERE $10 = 0
          OR EXISTS (
            SELECT 1
            FROM public.source_cursors
            WHERE source_id = $1
              AND cursor_name = $2
              AND cursor_version = $10
          )
       ON CONFLICT (source_id, cursor_name)
       DO UPDATE SET
         cursor_value = EXCLUDED.cursor_value,
         pagination_token = EXCLUDED.pagination_token,
         last_seen_external_id = EXCLUDED.last_seen_external_id,
         etag = EXCLUDED.etag,
         last_modified = EXCLUDED.last_modified,
         state = EXCLUDED.state,
         synchronized_at = EXCLUDED.synchronized_at,
         cursor_version = public.source_cursors.cursor_version + 1,
         updated_at = now()
       WHERE public.source_cursors.cursor_version = $10
         AND EXCLUDED.synchronized_at >= public.source_cursors.synchronized_at
       RETURNING source_id, cursor_name, cursor_value, pagination_token,
                 last_seen_external_id, etag, last_modified, state,
                 synchronized_at, cursor_version`,
      [
        cursor.sourceId,
        cursor.cursorName,
        cursor.cursorValue,
        cursor.paginationToken,
        cursor.lastSeenExternalId,
        cursor.etag,
        cursor.lastModified,
        jsonString(cursor.state, "cursor.state"),
        cursor.synchronizedAt,
        expectedVersion,
      ],
    );
    if (!result.rows[0]) {
      throw new IngestionRepositoryError("Cursor was changed by another run; stale cursor update rejected.");
    }
    return this.mapCursor(result.rows[0]);
  }

  private async lockOwnedJob(
    transaction: DatabaseTransaction,
    lease: JobLease,
  ): Promise<DbRow> {
    const result = await transaction.query<DbRow>(
      `SELECT * FROM public.ingestion_jobs
       WHERE id = $1 AND status = 'running'
         AND locked_by = $2 AND lease_token = $3
         AND locked_until > now()
       FOR UPDATE`,
      [lease.jobId, lease.workerId, lease.leaseToken],
    );
    if (!result.rows[0]) throw new JobLeaseError();
    return result.rows[0];
  }
}

function safeErrorCode(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]/gu, "_").slice(0, 120);
  return normalized || "ingestion_error";
}

function retryDelayMs(attemptCount: number): number {
  return Math.min(60 * 60 * 1000, 1000 * (2 ** Math.min(Math.max(attemptCount, 0), 12)));
}
