import { z } from "zod";
import {
  connectorConfigurationSchema,
  validateConnectorConfiguration,
  type ConnectorConfiguration,
} from "./connectors";
import {
  parsedSourceOpportunitySchema,
  sourceRegistryRecordSchema,
  type ParsedSourceOpportunity,
  type SourceRegistryRecord,
} from "./contracts";
import { safeFetchApprovedSource } from "./safe-fetch";

const CANADABUYS_ORIGIN = "https://canadabuys.canada.ca";
const TENDER_NOTICES = `${CANADABUYS_ORIGIN}/en/jsonapi/node/tender_notice`;
const CANADABUYS_HOST = "canadabuys.canada.ca";

const nodeSchema = z.object({
  id: z.string().uuid(),
  attributes: z.object({
    title: z.string(),
    field_tender_reference_number: z.string().nullable().optional(),
    field_tender_solicitation_number: z.string().nullable().optional(),
    field_tender_publication_date: z.string().nullable().optional(),
    field_tender_closing_date: z.string().nullable().optional(),
    field_tender_organization: z.string().nullable().optional(),
    field_tender_notice_link: z.object({
      uri: z.string().url(),
    }).passthrough().nullable().optional(),
    path: z.object({
      alias: z.string().nullable().optional(),
    }).passthrough().nullable().optional(),
    drupal_internal__nid: z.number().int().optional(),
  }).passthrough(),
}).passthrough();

const collectionSchema = z.object({
  data: z.array(nodeSchema),
  meta: z.object({
    count: z.number().int().nonnegative(),
  }).passthrough(),
}).passthrough();

type CanadabuysApiDependencies = {
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
  now?: () => Date;
};

export type CanadabuysSearchResult = {
  records: ParsedSourceOpportunity[];
  rawRecords: Array<{ externalId: string; payload: Record<string, unknown> }>;
  count: number;
};

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function asTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00.000Z`;
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed)) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function noticeUrl(attributes: z.infer<typeof nodeSchema>["attributes"]): string {
  const link = attributes.field_tender_notice_link?.uri;
  if (link && link.startsWith("https://")) return link;
  const alias = attributes.path?.alias;
  if (alias) return new URL(alias, CANADABUYS_ORIGIN).toString();
  const nid = attributes.drupal_internal__nid;
  return nid
    ? `${CANADABUYS_ORIGIN}/en/tender-notice/${nid}`
    : `${CANADABUYS_ORIGIN}/en/tender-opportunities`;
}

function mapNotice(
  source: SourceRegistryRecord,
  node: z.infer<typeof nodeSchema>,
  now: Date,
): { success: true; record: ParsedSourceOpportunity } | { success: false; error: string } {
  const attributes = node.attributes;
  const title = text(attributes.title);
  if (!title) return { success: false, error: "CanadaBuys notice is missing its title." };

  const publishedAt = asTimestamp(text(attributes.field_tender_publication_date));
  const closingAt = asTimestamp(text(attributes.field_tender_closing_date));
  const cancelled = /^cancelled/i.test(title);
  const status = cancelled
    ? "cancelled"
    : closingAt && Date.parse(closingAt) <= now.getTime()
      ? "closed"
      : "open";

  const candidate: ParsedSourceOpportunity = {
    externalId: node.id,
    title: title.slice(0, 1000),
    description: null,
    sourceCategoryTerm: "Tender Notice",
    referenceNumber: text(attributes.field_tender_reference_number)?.slice(0, 200) ?? null,
    countryCode: "CA",
    region: null,
    city: null,
    issuingInstitution: null,
    procuringOrganization: text(attributes.field_tender_organization),
    publisher: source.publisher,
    publishedAt,
    sourceDeadlineText: closingAt?.slice(0, 500) ?? null,
    closingAt,
    timeZone: closingAt ? "America/Toronto" : null,
    status,
    sourceUrl: noticeUrl(attributes),
    canonicalUrl: null,
    currency: null,
    amount: null,
    originalValues: {
      nid: attributes.drupal_internal__nid ?? null,
      referenceNumber: text(attributes.field_tender_reference_number),
      solicitationNumber: text(attributes.field_tender_solicitation_number),
      publicationDate: text(attributes.field_tender_publication_date),
      closingDate: text(attributes.field_tender_closing_date),
      organization: text(attributes.field_tender_organization),
    },
  };
  const parsed = parsedSourceOpportunitySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    };
  }
  return { success: true, record: parsed.data };
}

function makeConfiguration(
  sourceId: string,
  dependencies: CanadabuysApiDependencies,
): ConnectorConfiguration {
  return connectorConfigurationSchema.parse({
    version: 1,
    sourceId,
    connectorType: "rest_api",
    endpoint: TENDER_NOTICES,
    allowedHosts: [CANADABUYS_HOST],
    pageSize: 100,
    maxPagesPerRun: 10,
    requestTimeoutMs: dependencies.requestTimeoutMs ?? 20_000,
    maxResponseBytes: dependencies.maxResponseBytes ?? 10_000_000,
    maxRetries: 3,
    minimumRetryDelayMs: 1_000,
    maximumRetryDelayMs: 30_000,
    allowedContentTypes: ["application/json"],
  });
}

export class CanadabuysApiClient {
  private readonly source: SourceRegistryRecord;
  private readonly configuration: ConnectorConfiguration;

  constructor(
    source: SourceRegistryRecord,
    private readonly dependencies: CanadabuysApiDependencies = {},
  ) {
    this.source = sourceRegistryRecordSchema.parse(source);
    this.configuration = makeConfiguration(this.source.id, dependencies);
  }

  async search(search: {
    offset: number;
    limit: number;
    signal?: AbortSignal;
  }): Promise<CanadabuysSearchResult> {
    if (!Number.isSafeInteger(search.offset) || search.offset < 0) {
      throw new Error("CanadaBuys offset must be a non-negative integer.");
    }
    if (!Number.isSafeInteger(search.limit) || search.limit < 1 || search.limit > 100) {
      throw new Error("CanadaBuys limit must be an integer from 1 to 100.");
    }

    const approval = validateConnectorConfiguration(this.source, this.configuration);
    if (!approval.success) {
      throw new Error("CanadaBuys source is not approved for operational ingestion.");
    }

    const url = new URL(TENDER_NOTICES);
    url.searchParams.set("page[offset]", String(search.offset));
    url.searchParams.set("page[limit]", String(search.limit));

    const response = await safeFetchApprovedSource(url.toString(), this.configuration, {
      signal: search.signal,
      fetcher: this.dependencies.fetcher,
      headers: { Accept: "application/json" },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("CanadaBuys returned invalid JSON.");
    }

    const result = collectionSchema.safeParse(body);
    if (!result.success) {
      throw new Error("CanadaBuys response did not match the documented tender-notice format.");
    }

    const now = this.dependencies.now?.() ?? new Date();
    const records: ParsedSourceOpportunity[] = [];
    const rawRecords: CanadabuysSearchResult["rawRecords"] = [];
    for (const node of result.data.data) {
      const mapped = mapNotice(this.source, node, now);
      if (mapped.success) {
        records.push(mapped.record);
        rawRecords.push({
          externalId: node.id,
          payload: {
            id: node.id,
            title: node.attributes.title,
            referenceNumber: node.attributes.field_tender_reference_number ?? null,
            publicationDate: node.attributes.field_tender_publication_date ?? null,
            closingDate: node.attributes.field_tender_closing_date ?? null,
            organization: node.attributes.field_tender_organization ?? null,
            url: noticeUrl(node.attributes),
          },
        });
      }
    }
    return { records, rawRecords, count: result.data.meta.count };
  }
}