import { describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { createCollectorSourceConnector } from "./collector-bridge";
import type {
  NormalizedOpportunity,
  QualityIssue,
  CategoryMapping,
  SourceRegistryRecord,
} from "./contracts";
import {
  runIngestion,
  type IngestionRepository,
  type IngestionSummary,
  type SourceConnector,
  type StoredOpportunity,
} from "./ingestion";

const sourceOne = "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd";
const sourceTwo = "eabeb635-57de-47ab-ab11-1cc6e28cc744";
const mapping: CategoryMapping = {
  sourceId: sourceOne,
  countryCode: "GB",
  sourceTerm: "Open tender",
  category: "government",
  globalType: "tender",
};

function fixtureRecord(overrides: Record<string, unknown> = {}) {
  return {
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
    sourceUrl: "https://procurement.example.invalid/notice/42",
    canonicalUrl: null,
    currency: "GBP",
    amount: "120000.00",
    originalValues: {},
    ...overrides,
  };
}

class FixtureConnector implements SourceConnector {
  discoverCalls = 0;
  collectionIssues: () => readonly QualityIssue[] = () => [];

  constructor(
    readonly sourceId: string,
    private readonly records: Record<string, unknown>[],
  ) {}

  async discover() {
    this.discoverCalls += 1;
    return this.records.map((record) => String(record.externalId));
  }

  async retrieve(externalId: string) {
    return this.records.find((record) => record.externalId === externalId);
  }

  async parse(payload: unknown) {
    return payload;
  }

  async toRawSourceRecord(
    externalId: string,
    payload: unknown,
    collectionRunId: string,
  ) {
    const text = JSON.stringify(payload);
    const checksum = createHash("sha256").update(text).digest("hex");
    const sourceUrl = payload !== null && typeof payload === "object" &&
        "sourceUrl" in payload && typeof payload.sourceUrl === "string"
      ? payload.sourceUrl
      : "https://source.example.invalid/notices";
    return {
      sourceId: this.sourceId,
      externalRecordId: externalId,
      sourceUrl,
      contentType: "application/json",
      payloadJson: payload,
      payloadChecksum: checksum,
      collectionRunId,
    };
  }
}

class MemoryRepository implements IngestionRepository {
  runs: IngestionSummary[] = [];
  issues: QualityIssue[] = [];
  opportunities: StoredOpportunity[] = [];
  duplicateCandidates: Array<{
    opportunityId: string;
    candidateOpportunityId: string;
    confidence: number;
  }> = [];
  reviewItems: unknown[] = [];
  rawRecords = new Map<string, { id: string; processingState: string }>();
  sourceIntegrationStatus: SourceRegistryRecord["integrationStatus"] = "operational";
  private readonly sourceRecords = new Map<string, string>();
  private nextId = 1;

  async beginRun() {
    return `run-${this.runs.length + 1}`;
  }

  async storeRawRecord(envelope: {
    sourceId: string;
    externalRecordId: string;
    payloadChecksum: string;
  }) {
    const key = `${envelope.sourceId}:${envelope.externalRecordId}:${envelope.payloadChecksum}`;
    const existing = this.rawRecords.get(key);
    if (existing) return { ...existing, inserted: false };
    const record = {
      id: `raw-${this.rawRecords.size + 1}`,
      processingState: "pending",
    };
    this.rawRecords.set(key, record);
    return { ...record, inserted: true };
  }

  async markRawProcessing(rawRecordId: string) {
    for (const raw of this.rawRecords.values()) {
      if (raw.id === rawRecordId) raw.processingState = "processing";
    }
  }

  async markRawProcessingFailure(rawRecordId: string) {
    for (const raw of this.rawRecords.values()) {
      if (raw.id === rawRecordId) raw.processingState = "failed";
    }
  }

  async markRawReview(rawRecordId: string) {
    for (const raw of this.rawRecords.values()) {
      if (raw.id === rawRecordId) raw.processingState = "review";
    }
  }

  async markRawAcceptedByExternalId(rawRecordId: string) {
    for (const raw of this.rawRecords.values()) {
      if (raw.id === rawRecordId) raw.processingState = "accepted";
    }
  }

  async getSourceForIngestion(sourceId: string): Promise<SourceRegistryRecord | null> {
    const operational = this.sourceIntegrationStatus === "operational";
    return {
      id: sourceId,
      name: "Fixture source",
      publisher: "Fixture publisher",
      website: "https://source.example.invalid",
      sourceCategory: "government",
      sourceType: "api",
      accessMethod: "api",
      apiOrFeedUrl: "https://source.example.invalid/api",
      connectorIdentifier: operational ? "fixture-source" : null,
      coverageScope: "country",
      coverageRegionCodes: [],
      apiOrFeedAvailable: true,
      opportunityCategories: ["government"],
      languages: ["en-GB"],
      publicationFrequency: "Daily",
      expectedRefreshHours: 24,
      reliability: "verified",
      licensingStatus: "approved",
      termsStatus: "verified",
      permissionsEvidenceUrl: "https://source.example.invalid/terms",
      licenseUrl: "https://source.example.invalid/license",
      termsUrl: "https://source.example.invalid/terms",
      reusePermissionStatus: operational ? "permitted" : "unknown",
      attributionRequirements: null,
      robotsRestrictions: null,
      retentionRestrictions: null,
      rateLimitRequests: null,
      rateLimitWindowSeconds: null,
      approvalStatus: operational ? "approved" : "unreviewed",
      approvalConstraints: [],
      approvalConstraintsEnforced: false,
      approvalExpiresAt: null,
      activationStatus: operational ? "active" : "inactive",
      integrationStatus: this.sourceIntegrationStatus,
      lastSuccessfulRetrieval: null,
      lastUnsuccessfulRetrieval: null,
      nextScheduledCollectionAt: null,
    };
  }

  async findSourceRecord(sourceId: string, externalId: string) {
    const id = this.sourceRecords.get(`${sourceId}:${externalId}`);
    const stored = this.opportunities.find((item) => item.id === id);
    return stored ?? null;
  }

  async listOpportunities() {
    return this.opportunities;
  }

  async save(
    opportunity: NormalizedOpportunity,
    issues: readonly QualityIssue[],
    duplicateCandidates: readonly { opportunityId: string; confidence: number }[],
  ): Promise<"created" | "updated" | "unchanged"> {
    this.issues.push(...issues);
    const key = `${opportunity.sourceId}:${opportunity.externalId}`;
    const existingId = this.sourceRecords.get(key);
    if (existingId) {
      const current = this.opportunities.find((item) => item.id === existingId);
      if (!current) throw new Error("Source record points at a missing opportunity.");
      this.opportunities = this.opportunities.map((item) =>
        item.id === existingId ? { id: existingId, opportunity } : item,
      );
      return "updated";
    }

    const id = `opportunity-${this.nextId++}`;
    this.sourceRecords.set(key, id);
    this.opportunities = [...this.opportunities, { id, opportunity }];
    this.duplicateCandidates.push(...duplicateCandidates.map((candidate) => ({
      opportunityId: id,
      candidateOpportunityId: candidate.opportunityId,
      confidence: candidate.confidence,
    })));
    return "created";
  }

  async reject(
    _runId: string,
    _externalId: string | null,
    issues: readonly QualityIssue[],
  ) {
    this.issues.push(...issues);
  }

  async review(
    _runId: string,
    _sourceId: string,
    _externalId: string,
    sourceRecord: unknown,
    issues: readonly QualityIssue[],
  ) {
    this.reviewItems.push(sourceRecord);
    this.issues.push(...issues);
  }

  async finishRun(summary: IngestionSummary) {
    this.runs.push(summary);
  }
}

describe("fixture-driven ingestion", () => {
  it("bridges approved collector output into raw and canonical ingestion storage", async () => {
    const repository = new MemoryRepository();
    const getSource = repository.getSourceForIngestion.bind(repository);
    repository.getSourceForIngestion = async (sourceId) => {
      const source = await getSource(sourceId);
      return source
        ? {
          ...source,
          website: "https://public.example.org",
          apiOrFeedUrl: "https://public.example.org/notices",
          connectorIdentifier: "fixture-notices",
        }
        : null;
    };
    repository.beginRun = async () => randomUUID();

    const connector = createCollectorSourceConnector(sourceOne, repository, {
      jobId: randomUUID(),
      framework: "cheerio",
      sourceBaseUrl: "https://public.example.org/notices",
      countryCode: "GB",
      limits: {
        maxPages: 1,
        maxRecords: 20,
        maxRequests: 10,
        timeoutMs: 2000,
        maxResponseBytes: 100_000,
        maxTotalBytes: 500_000,
        minimumRequestIntervalMs: 250,
      },
      adapter: {
        adapterId: "fixture-listing",
        format: "html",
        recordSelector: ".notice",
        fields: {
          externalId: { selector: ".id", required: true },
          title: { selector: ".title", required: true },
          sourceCategoryTerm: { selector: ".category", required: true },
          countryCode: { selector: ".country" },
          canonicalUrl: { selector: ".detail", attribute: "href" },
        },
      },
    }, {
      resolveAddresses: async () => ["93.184.216.34"],
      sleep: async () => undefined,
      fetcher: async () => new Response(`
        <article class="notice">
          <span class="id">notice-42</span>
          <span class="title">Solar equipment tender</span>
          <span class="category">Open tender</span>
          <span class="country">GB</span>
          <a class="detail" href="/notices/42">Details</a>
        </article>
      `, { headers: { "content-type": "text/html; charset=utf-8" } }),
    });

    const summary = await runIngestion(connector, repository, [mapping]);
    expect(summary.created).toBe(1);
    expect(repository.opportunities[0]?.opportunity).toMatchObject({
      externalId: "notice-42",
      countryCode: "GB",
      category: "government",
      sourceUrl: "https://public.example.org/notices/42",
    });
    expect(repository.rawRecords.size).toBe(1);
    expect([...repository.rawRecords.values()][0]?.processingState).toBe("accepted");
  });
  it("is idempotent for repeated imports and updates changed records", async () => {
    const repository = new MemoryRepository();
    const first = new FixtureConnector(sourceOne, [fixtureRecord()]);
    const initial = await runIngestion(first, repository, [mapping]);
    const repeated = await runIngestion(first, repository, [mapping]);
    const changed = new FixtureConnector(sourceOne, [
      fixtureRecord({ closingAt: "2026-04-01T11:00:00Z" }),
    ]);
    const updated = await runIngestion(changed, repository, [mapping]);

    expect(initial.created).toBe(1);
    expect(repeated.unchanged).toBe(1);
    expect(updated.updated).toBe(1);
    expect(repository.opportunities).toHaveLength(1);
    expect(repository.opportunities[0]?.opportunity.sourceDeadlineText).toBe(
      "31 March 2026, 12:00 BST",
    );
    expect(repository.runs).toHaveLength(3);
  });

  it("preserves records with unknown countries in review without creating canonical opportunities", async () => {
    const repository = new MemoryRepository();
    const connector = new FixtureConnector(sourceOne, [
      fixtureRecord({ countryCode: null }),
    ]);

    const summary = await runIngestion(connector, repository, [mapping]);

    expect(summary).toMatchObject({
      status: "completed_with_review",
      pendingReview: 1,
      failedCount: 0,
      rejected: 0,
    });
    expect(repository.opportunities).toHaveLength(0);
    expect(repository.reviewItems).toHaveLength(1);
    expect(repository.issues).toContainEqual(expect.objectContaining({
      code: "unmapped_country",
      field: "countryCode",
    }));
    expect([...repository.rawRecords.values()][0]?.processingState).toBe("review");
  });

  it("records collector warnings without marking the ingestion run as failed", async () => {
    const repository = new MemoryRepository();
    const connector = new FixtureConnector(sourceOne, [fixtureRecord()]);
    connector.collectionIssues = () => [{
      code: "collector_warning",
      message: "The configured page limit was reached.",
      severity: "warning",
    }];

    const result = await runIngestion(connector, repository, [mapping]);

    expect(result.created).toBe(1);
    expect(result.status).toBe("succeeded");
    expect(result.failedCount).toBe(0);
    expect(repository.issues).toContainEqual(expect.objectContaining({
      code: "collector_warning",
      severity: "warning",
    }));
  });

  it("records cross-source matches for review without merging records", async () => {
    const repository = new MemoryRepository();
    const first = new FixtureConnector(sourceOne, [fixtureRecord()]);
    await runIngestion(first, repository, [mapping]);

    const secondMapping: CategoryMapping = { ...mapping, sourceId: sourceTwo };
    const second = new FixtureConnector(sourceTwo, [
      fixtureRecord({
        externalId: "portal-item-77",
        sourceCategoryTerm: "Open tender",
        sourceUrl: "https://procurement.example.invalid/notice/42?utm_medium=feed",
      }),
    ]);
    const result = await runIngestion(second, repository, [secondMapping]);

    expect(result.created).toBe(1);
    expect(result.pendingReview).toBe(1);
    expect(result.status).toBe("completed_with_review");
    expect(repository.opportunities).toHaveLength(2);
    expect(repository.duplicateCandidates).toHaveLength(1);
    expect(repository.duplicateCandidates[0]?.confidence).toBe(1);
  });

  it("retains unmapped records in review instead of discarding them", async () => {
    const repository = new MemoryRepository();
    const connector = new FixtureConnector(sourceOne, [
      fixtureRecord({ sourceCategoryTerm: "Unmapped public notice" }),
    ]);

    const result = await runIngestion(connector, repository, [mapping]);

    expect(result.status).toBe("completed_with_review");
    expect(result.rejected).toBe(0);
    expect(result.pendingReview).toBe(1);
    expect(repository.issues[0]?.code).toBe("unmapped_category");
    expect(repository.reviewItems).toHaveLength(1);
    expect(repository.opportunities).toHaveLength(0);
  });

  it("reports invalid source records instead of persisting fabricated defaults", async () => {
    const repository = new MemoryRepository();
    const connector = new FixtureConnector(sourceOne, [
      fixtureRecord({ title: " " }),
    ]);

    const result = await runIngestion(connector, repository, [mapping]);

    expect(result.status).toBe("completed_with_errors");
    expect(result.rejected).toBe(1);
    expect(repository.issues[0]?.code).toBe("invalid_source_record");
    expect(repository.rawRecords).toHaveLength(1);
    expect(repository.opportunities).toHaveLength(0);
  });

  it("never invokes a connector until its source is verified and operational", async () => {
    const repository = new MemoryRepository();
    repository.sourceIntegrationStatus = "in_development";
    const connector = new FixtureConnector(sourceOne, [fixtureRecord()]);

    const result = await runIngestion(connector, repository, [mapping]);

    expect(result.status).toBe("failed");
    expect(result.rejected).toBe(1);
    expect(connector.discoverCalls).toBe(0);
    expect(repository.issues[0]?.code).toBe("source_not_authorized");
  });
});
