import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import schema from "../../shared/collector-contract.schema.json" with { type: "json" };

export type CollectorFramework = "crawlee" | "cheerio" | "scrapy" | "scrapling";
export type CollectorPayloadType =
  | "json"
  | "html"
  | "xml"
  | "csv_row"
  | "text"
  | "document_reference";

export type CollectorSelector = {
  selector: string;
  attribute?: string | null;
  required?: boolean;
};

export type CollectorRequest = {
  contractVersion: "1.0";
  jobId: string;
  ingestionRunId: string;
  sourceId: string;
  connectorId: string;
  collectorFramework: CollectorFramework;
  sourceBaseUrl: string;
  allowedHosts: string[];
  currentCursor: string | null;
  limits: {
    maxPages: number;
    maxRecords: number;
    maxRequests: number;
    timeoutMs: number;
    maxResponseBytes: number;
    maxTotalBytes: number;
    minimumRequestIntervalMs: number;
  };
  constraints: {
    approvalStatus: "approved" | "approved_with_constraints";
    reusePermission: "permitted" | "conditional";
    conditionalConstraintsEnforced: boolean;
    allowedMethods: Array<"GET" | "HEAD">;
    attribution: string;
    retentionDays?: number | null;
  };
  adapter: {
    adapterId: string;
    format: "html" | "xml";
    recordSelector: string;
    fields: Partial<Record<
      | "externalId"
      | "title"
      | "description"
      | "sourceCategoryTerm"
      | "countryCode"
      | "publisher"
      | "region"
      | "city"
      | "sourceDeadlineText"
      | "timeZone"
      | "status"
      | "currency"
      | "amount"
      | "publishedAt"
      | "closingAt"
      | "organization"
      | "referenceNumber"
      | "canonicalUrl"
      | "pagination"
      | "links",
      CollectorSelector
    >>;
  };
};

export type CollectorRecord = {
  externalRecordId: string;
  sourceUrl: string;
  canonicalUrl: string | null;
  httpStatus: number | null;
  contentType: string;
  fetchedAt: string;
  publishedAt: string | null;
  etag: string | null;
  lastModified: string | null;
  payloadType: CollectorPayloadType;
  payload: Record<string, unknown> | string;
  documentUrl?: string | null;
  payloadChecksum: string;
  extracted: Record<string, string | null>;
  extractionConfidence: number;
  warnings: string[];
};

export type CollectorResult = {
  contractVersion: "1.0";
  sourceId: string;
  jobId: string;
  ingestionRunId: string;
  connectorId: string;
  collectorFramework: CollectorFramework;
  collectorVersion: string;
  startedAt: string;
  completedAt: string;
  requestCount: number;
  pagesVisited: number;
  recordsDiscovered: number;
  recordsRejected: number;
  warnings: string[];
  errors: Array<{
    code: string;
    message: string;
    url?: string | null;
    retryable: boolean;
  }>;
  nextCursor: string | null;
  records: CollectorRecord[];
};

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addFormat("uuid", /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu);
ajv.addFormat("uri", (value: string) => {
  try {
    return new URL(value).protocol.length > 0;
  } catch {
    return false;
  }
});
ajv.addFormat("date-time", (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value) &&
  Number.isFinite(Date.parse(value)),
);
ajv.addSchema(schema);
const validateRequestSchema = ajv.compile<CollectorRequest>({
  $ref: `${schema.$id}#/$defs/request`,
});
const validateResultSchema = ajv.compile<CollectorResult>({
  $ref: `${schema.$id}#/$defs/result`,
});

export class CollectorContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectorContractError";
  }
}

export function validateCollectorRequest(value: unknown): CollectorRequest {
  if (!validateRequestSchema(value)) {
    throw new CollectorContractError(
      `Invalid collector request: ${formatAjvErrors(validateRequestSchema)}`,
    );
  }
  return value as CollectorRequest;
}

export function validateCollectorResult(value: unknown): CollectorResult {
  if (!validateResultSchema(value)) {
    throw new CollectorContractError(
      `Invalid collector result: ${formatAjvErrors(validateResultSchema)}`,
    );
  }
  return value as CollectorResult;
}

function formatAjvErrors(validate: ValidateFunction): string {
  return (validate.errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("; ");
}
