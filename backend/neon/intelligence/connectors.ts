import { z } from "zod";
import {
  opportunityCategories,
  parsedSourceOpportunitySchema,
  sourceRegistryRecordSchema,
  uuidShapeSchema,
  type ParsedSourceOpportunity,
  type SourceRegistryRecord,
} from "./contracts";

export const connectorTypes = [
  "rest_api",
  "graphql",
  "rss",
  "atom",
  "json_feed",
  "xml_feed",
  "csv",
  "approved_html",
  "manual_json",
  "manual_csv",
] as const;

export const connectorConfigurationSchema = z.object({
  version: z.literal(1),
  sourceId: uuidShapeSchema,
  connectorType: z.enum(connectorTypes),
  endpoint: z.string().url(),
  allowedHosts: z.array(z.string().min(1)).min(1),
  pageSize: z.number().int().positive().max(500).default(100),
  maxPagesPerRun: z.number().int().positive().max(100).default(10),
  requestTimeoutMs: z.number().int().positive().max(120_000).default(15_000),
  maxResponseBytes: z.number().int().positive().max(10_000_000).default(2_000_000),
  maxRetries: z.number().int().min(0).max(5).default(3),
  minimumRetryDelayMs: z.number().int().min(100).max(60_000).default(1_000),
  maximumRetryDelayMs: z.number().int().min(100).max(300_000).default(30_000),
  allowedContentTypes: z.array(z.string().min(1)).min(1),
}).superRefine((config, context) => {
  try {
    const url = new URL(config.endpoint);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      !config.allowedHosts.includes(url.hostname.toLowerCase())
    ) {
      context.addIssue({
        code: "custom",
        message: "Connector endpoint must be HTTPS, credential-free, and match an approved hostname.",
        path: ["endpoint"],
      });
    }
  } catch {
    context.addIssue({
      code: "custom",
      message: "Connector endpoint is invalid.",
      path: ["endpoint"],
    });
  }
});

export type ConnectorConfiguration = z.infer<typeof connectorConfigurationSchema>;
export type ConnectorErrorKind =
  | "configuration"
  | "permission"
  | "authentication"
  | "rate_limit"
  | "timeout"
  | "network"
  | "http_client"
  | "http_server"
  | "invalid_content"
  | "payload_too_large"
  | "schema_change"
  | "connector_state"
  | "record_invalid"
  | "unknown";

export type ConnectorError = {
  kind: ConnectorErrorKind;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  status?: number;
};

export type ConnectorValidationResult =
  | { success: true; warnings: string[] }
  | { success: false; errors: string[] };

export type ConnectorHealth = {
  sourceId: string;
  status: "unknown" | "healthy" | "degraded" | "unavailable" | "paused";
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: ConnectorError | null;
};

export type CursorState = {
  cursor: string | null;
  etag: string | null;
  lastModified: string | null;
  updatedAt: string | null;
};

export type DiscoveryContext = {
  source: SourceRegistryRecord;
  configuration: ConnectorConfiguration;
  cursor: CursorState;
  runId: string;
  signal?: AbortSignal;
};

export type FetchContext = DiscoveryContext & {
  externalIds: readonly string[];
};

export type RawSourceRecord = {
  externalId: string;
  retrievedAt: string;
  sourceUrl: string;
  connectorVersion: string;
  contentType: string;
  payload: unknown;
};

export type DiscoveryResult = {
  externalIds: readonly string[];
  nextCursor: string | null;
  etag: string | null;
  lastModified: string | null;
  hasMore: boolean;
};

export type FetchResult = {
  records: readonly RawSourceRecord[];
  errors: readonly ConnectorError[];
};

export type ParsedOpportunityResult =
  | { success: true; record: ParsedSourceOpportunity }
  | { success: false; errors: ConnectorError[] };

export type CanonicalOpportunityResult =
  | {
      success: true;
      record: ParsedSourceOpportunity;
      category: (typeof opportunityCategories)[number];
      globalType: string;
    }
  | { success: false; errors: ConnectorError[] };

export interface OpportunitySourceConnector {
  readonly sourceId: string;
  readonly connectorType: (typeof connectorTypes)[number];
  validateConfiguration(): Promise<ConnectorValidationResult>;
  testConnection(context: DiscoveryContext): Promise<ConnectorValidationResult>;
  discoverRecords(context: DiscoveryContext): Promise<DiscoveryResult>;
  fetchRecords(context: FetchContext): Promise<FetchResult>;
  parseRecord(rawRecord: RawSourceRecord): Promise<ParsedOpportunityResult>;
  mapToCanonical(parsedRecord: ParsedSourceOpportunity): Promise<CanonicalOpportunityResult>;
}

export type SourceApprovalStage =
  | "discovered"
  | "research_pending"
  | "permission_review_pending"
  | "access_verified"
  | "technical_assessment_passed"
  | "connector_developed"
  | "connector_tested"
  | "approved_for_activation"
  | "active"
  | "paused"
  | "deprecated";

export const sourceApprovalTransitionSchema = z.object({
  from: z.enum([
    "discovered",
    "research_pending",
    "permission_review_pending",
    "access_verified",
    "technical_assessment_passed",
    "connector_developed",
    "connector_tested",
    "approved_for_activation",
    "active",
    "paused",
    "deprecated",
  ]),
  to: z.enum([
    "discovered",
    "research_pending",
    "permission_review_pending",
    "access_verified",
    "technical_assessment_passed",
    "connector_developed",
    "connector_tested",
    "approved_for_activation",
    "active",
    "paused",
    "deprecated",
  ]),
});

const allowedApprovalTransitions: Readonly<Record<SourceApprovalStage, readonly SourceApprovalStage[]>> = {
  discovered: ["research_pending", "deprecated"],
  research_pending: ["permission_review_pending", "deprecated"],
  permission_review_pending: ["access_verified", "paused", "deprecated"],
  access_verified: ["technical_assessment_passed", "paused"],
  technical_assessment_passed: ["connector_developed", "paused"],
  connector_developed: ["connector_tested", "paused"],
  connector_tested: ["approved_for_activation", "paused"],
  approved_for_activation: ["active", "paused"],
  active: ["paused", "deprecated"],
  paused: ["permission_review_pending", "access_verified", "technical_assessment_passed", "connector_developed", "connector_tested", "approved_for_activation", "active", "deprecated"],
  deprecated: [],
};

export function canTransitionSourceStage(from: SourceApprovalStage, to: SourceApprovalStage) {
  return allowedApprovalTransitions[from].includes(to);
}

export function validateConnectorConfiguration(
  source: SourceRegistryRecord,
  rawConfiguration: unknown,
): ConnectorValidationResult {
  const parsedSource = sourceRegistryRecordSchema.safeParse(source);
  if (!parsedSource.success) {
    return { success: false, errors: parsedSource.error.issues.map((issue) => issue.message) };
  }
  const parsedConfiguration = connectorConfigurationSchema.safeParse(rawConfiguration);
  if (!parsedConfiguration.success) {
    return {
      success: false,
      errors: parsedConfiguration.error.issues.map((issue) => issue.message),
    };
  }
  if (parsedConfiguration.data.sourceId !== source.id) {
    return { success: false, errors: ["Connector source ID does not match the registry source."] };
  }
  return { success: true, warnings: [] };
}

export function validateParsedRecord(raw: unknown): ParsedOpportunityResult {
  const result = parsedSourceOpportunitySchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        kind: "record_invalid",
        message: `${issue.path.join(".") || "record"}: ${issue.message}`,
        retryable: false,
      })),
    };
  }
  return { success: true, record: result.data };
}
