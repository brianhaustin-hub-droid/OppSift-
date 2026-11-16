import {
  type ConnectorConfiguration,
  type ConnectorValidationResult,
  type DiscoveryContext,
  type DiscoveryResult,
  type FetchContext,
  type FetchResult,
  type CanonicalOpportunityResult,
  type OpportunitySourceConnector,
  type ParsedOpportunityResult,
  type RawSourceRecord,
  validateConnectorConfiguration,
  validateParsedRecord,
} from "./connectors";
import type { SourceRegistryRecord } from "./contracts";
import {
  mapCsvRowsToOpportunities,
  parseCsv,
  parseJsonFeed,
  parseSyndicationFeed,
  parseXmlRecordFeed,
  type CsvColumnMapping,
} from "./format-parsers";
import { safeFetchApprovedSource } from "./safe-fetch";

export type AdapterDependencies = {
  fetcher?: typeof fetch;
  now?: () => Date;
};

function dottedValue(value: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function asRecordArray(value: unknown, path: string): Record<string, unknown>[] {
  const resolved = dottedValue(value, path);
  if (!Array.isArray(resolved) || !resolved.every(
    (item) => item !== null && typeof item === "object" && !Array.isArray(item),
  )) {
    throw new Error(`API response field "${path}" must be an array of objects.`);
  }
  return resolved as Record<string, unknown>[];
}

function toExternalId(record: Record<string, unknown>, idField: string) {
  const id = dottedValue(record, idField);
  if (typeof id !== "string" && typeof id !== "number") {
    throw new Error(`API record is missing stable identifier "${idField}".`);
  }
  return String(id);
}

export type JsonApiAdapterOptions = {
  source: SourceRegistryRecord;
  configuration: ConnectorConfiguration;
  itemsPath: string;
  idField: string;
  nextCursorPath?: string;
  graphqlQuery?: string;
  graphqlItemsPath?: string;
  graphqlCursorVariable?: string;
  mapRecord: (raw: Record<string, unknown>) => unknown;
  mapToCanonical: (record: Parameters<OpportunitySourceConnector["mapToCanonical"]>[0]) => CanonicalOpportunityResult;
  dependencies?: AdapterDependencies;
};

export class JsonApiConnector implements OpportunitySourceConnector {
  readonly sourceId: string;
  readonly connectorType: ConnectorConfiguration["connectorType"];
  private readonly pages = new Map<string, Record<string, unknown>>();

  constructor(private readonly options: JsonApiAdapterOptions) {
    this.sourceId = options.source.id;
    this.connectorType = options.configuration.connectorType;
  }

  async validateConfiguration(): Promise<ConnectorValidationResult> {
    const result = validateConnectorConfiguration(this.options.source, this.options.configuration);
    if (this.options.configuration.connectorType !== "rest_api" &&
        this.options.configuration.connectorType !== "graphql" &&
        this.options.configuration.connectorType !== "json_feed") {
      return { success: false, errors: ["JSON API adapter requires a REST, GraphQL, or JSON feed connector type."] };
    }
    if (this.options.configuration.connectorType === "graphql") {
      if (!this.options.graphqlQuery || /\bmutation\b/iu.test(this.options.graphqlQuery)) {
        return { success: false, errors: ["GraphQL connectors require a configured read-only query."] };
      }
      if (!this.options.graphqlItemsPath || !this.options.graphqlCursorVariable) {
        return { success: false, errors: ["GraphQL connectors require item and cursor response mappings."] };
      }
    }
    return result;
  }

  async testConnection(context: DiscoveryContext): Promise<ConnectorValidationResult> {
    const validation = await this.validateConfiguration();
    if (!validation.success) return validation;
    try {
      const page = await this.fetchPage(context, null);
      if (!page.notModified) {
        const records = asRecordArray(page.body, this.options.itemsPath);
        for (const record of records) toExternalId(record, this.options.idField);
      }
      return { success: true, warnings: [] };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "API connection test failed."],
      };
    }
  }

  async discoverRecords(context: DiscoveryContext): Promise<DiscoveryResult> {
    const externalIds: string[] = [];
    let cursor = context.cursor.cursor;
    let etag = context.cursor.etag;
    let lastModified = context.cursor.lastModified;
    let hasMore = true;
    let pagesFetched = 0;
    while (hasMore && pagesFetched < this.options.configuration.maxPagesPerRun) {
      const page = await this.fetchPage(context, cursor);
      etag = page.etag ?? etag;
      lastModified = page.lastModified ?? lastModified;
      if (page.notModified) {
        hasMore = false;
        break;
      }
      const records = asRecordArray(page.body, this.options.itemsPath);
      for (const record of records) {
        const id = toExternalId(record, this.options.idField);
        this.pages.set(id, record);
        externalIds.push(id);
      }
      const nextCursor = this.options.nextCursorPath
        ? dottedValue(page.body, this.options.nextCursorPath)
        : null;
      if (nextCursor !== null && typeof nextCursor !== "string" && typeof nextCursor !== "number") {
        throw new Error("API pagination cursor must be a string, number, or null.");
      }
      cursor = nextCursor === null ? null : String(nextCursor);
      hasMore = cursor !== null && cursor !== "";
      pagesFetched += 1;
    }
    return {
      externalIds,
      nextCursor: cursor,
      etag,
      lastModified,
      hasMore,
    };
  }

  async fetchRecords(context: FetchContext): Promise<FetchResult> {
    const records: RawSourceRecord[] = [];
    const errors: FetchResult["errors"][number][] = [];
    for (const externalId of context.externalIds) {
      try {
        let payload = this.pages.get(externalId);
        if (!payload) {
          const response = await safeFetchApprovedSource(
            this.options.configuration.endpoint,
            this.options.configuration,
            {
              signal: context.signal,
              fetcher: this.options.dependencies?.fetcher,
              headers: { Accept: "application/json" },
            },
          );
          const body: unknown = await response.json();
          const apiRecords = asRecordArray(body, this.options.itemsPath);
          payload = apiRecords.find(
            (item) => toExternalId(item, this.options.idField) === externalId,
          );
          if (!payload) throw new Error(`Discovered record "${externalId}" is missing from the fetched response.`);
        }
        records.push({
          externalId,
          retrievedAt: (this.options.dependencies?.now?.() ?? new Date()).toISOString(),
          sourceUrl: this.options.configuration.endpoint,
          connectorVersion: "1",
          contentType: "application/json",
          payload,
        });
      } catch (error) {
        errors.push({
          kind: "network",
          message: error instanceof Error ? error.message : "API record retrieval failed.",
          retryable: false,
        });
      }
    }
    return { records, errors };
  }

  async parseRecord(rawRecord: RawSourceRecord): Promise<ParsedOpportunityResult> {
    try {
      const raw = rawRecord.payload as Record<string, unknown>;
      return validateParsedRecord(this.options.mapRecord(raw));
    } catch (error) {
      return {
        success: false,
        errors: [{
          kind: "record_invalid",
          message: error instanceof Error ? error.message : "API record mapping failed.",
          retryable: false,
        }],
      };
    }
  }

  async mapToCanonical(parsedRecord: Parameters<OpportunitySourceConnector["mapToCanonical"]>[0]) {
    return this.options.mapToCanonical(parsedRecord);
  }

  private async fetchPage(context: DiscoveryContext, cursor: string | null) {
    const url = new URL(this.options.configuration.endpoint);
    const isGraphql = this.options.configuration.connectorType === "graphql";
    if (!isGraphql) {
      if (cursor) url.searchParams.set("cursor", cursor);
      url.searchParams.set("limit", String(this.options.configuration.pageSize));
    }
    const response = await safeFetchApprovedSource(url.toString(), this.options.configuration, {
      signal: context.signal,
      fetcher: this.options.dependencies?.fetcher,
      headers: {
        Accept: "application/json",
        ...(isGraphql ? { "Content-Type": "application/json" } : {}),
        ...(context.cursor.etag ? { "If-None-Match": context.cursor.etag } : {}),
        ...(context.cursor.lastModified ? { "If-Modified-Since": context.cursor.lastModified } : {}),
      },
      ...(isGraphql && this.options.graphqlQuery ? {
        method: "POST" as const,
        body: JSON.stringify({
          query: this.options.graphqlQuery,
          variables: {
            [this.options.graphqlCursorVariable ?? "cursor"]: cursor,
            limit: this.options.configuration.pageSize,
          },
        }),
      } : {}),
    });
    if (response.status === 304) {
      return {
        body: null,
        etag: response.headers.get("ETag"),
        lastModified: response.headers.get("Last-Modified"),
        notModified: true,
      };
    }
    const body: unknown = await response.json();
    return {
      body: isGraphql && this.options.graphqlItemsPath
        ? { records: dottedValue(body, this.options.graphqlItemsPath), pageInfo: dottedValue(body, "data.pageInfo") }
        : body,
      etag: response.headers.get("ETag"),
      lastModified: response.headers.get("Last-Modified"),
      notModified: false,
    };
  }
}

export type FeedAdapterOptions = {
  source: SourceRegistryRecord;
  configuration: ConnectorConfiguration;
  mapEntry: (entry: Record<string, unknown>) => unknown;
  mapToCanonical: (record: Parameters<OpportunitySourceConnector["mapToCanonical"]>[0]) => CanonicalOpportunityResult;
  dependencies?: AdapterDependencies;
};

export class SyndicationFeedConnector implements OpportunitySourceConnector {
  readonly sourceId: string;
  readonly connectorType: "rss" | "atom";
  private readonly entries = new Map<string, Record<string, unknown>>();

  constructor(private readonly options: FeedAdapterOptions) {
    this.sourceId = options.source.id;
    this.connectorType = options.configuration.connectorType === "atom" ? "atom" : "rss";
  }

  async validateConfiguration() {
    const validation = validateConnectorConfiguration(this.options.source, this.options.configuration);
    if (
      this.options.configuration.connectorType !== "rss" &&
      this.options.configuration.connectorType !== "atom"
    ) {
      return { success: false as const, errors: ["Syndication feeds require an RSS or Atom connector type."] };
    }
    return validation;
  }

  async testConnection(context: DiscoveryContext) {
    const validation = await this.validateConfiguration();
    if (!validation.success) return validation;
    try {
      await this.discoverRecords(context);
      return { success: true as const, warnings: [] };
    } catch (error) {
      return {
        success: false as const,
        errors: [error instanceof Error ? error.message : "Feed connection test failed."],
      };
    }
  }

  async discoverRecords(context: DiscoveryContext) {
    const response = await safeFetchApprovedSource(this.options.configuration.endpoint, this.options.configuration, {
      signal: context.signal,
      fetcher: this.options.dependencies?.fetcher,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        ...(context.cursor.etag ? { "If-None-Match": context.cursor.etag } : {}),
        ...(context.cursor.lastModified ? { "If-Modified-Since": context.cursor.lastModified } : {}),
      },
    });
    if (response.status === 304) {
      return {
        externalIds: [],
        nextCursor: context.cursor.cursor,
        etag: response.headers.get("ETag") ?? context.cursor.etag,
        lastModified: response.headers.get("Last-Modified") ?? context.cursor.lastModified,
        hasMore: false,
      };
    }
    const body = await response.text();
    const entries = parseSyndicationFeed(body);
    const externalIds = entries.map((entry) => {
      this.entries.set(entry.id, entry as unknown as Record<string, unknown>);
      return entry.id;
    });
    return {
      externalIds,
      nextCursor: entries.at(-1)?.id ?? null,
      etag: response.headers.get("ETag"),
      lastModified: response.headers.get("Last-Modified"),
      hasMore: false,
    };
  }

  async fetchRecords(context: FetchContext): Promise<FetchResult> {
    const records: RawSourceRecord[] = [];
    const errors: FetchResult["errors"][number][] = [];
    for (const externalId of context.externalIds) {
      const payload = this.entries.get(externalId);
      if (!payload) {
        errors.push({
          kind: "connector_state",
          message: "Feed entry is not present in this connector instance; discover the feed again before fetching.",
          retryable: false,
        });
        continue;
      }
      records.push({
        externalId,
        retrievedAt: (this.options.dependencies?.now?.() ?? new Date()).toISOString(),
        sourceUrl: this.options.configuration.endpoint,
        connectorVersion: "1",
        contentType: this.connectorType === "atom" ? "application/atom+xml" : "application/rss+xml",
        payload,
      });
    }
    return { records, errors };
  }

  async parseRecord(rawRecord: RawSourceRecord): Promise<ParsedOpportunityResult> {
    try {
      return validateParsedRecord(this.options.mapEntry(rawRecord.payload as Record<string, unknown>));
    } catch (error) {
      return {
        success: false,
        errors: [{
          kind: "record_invalid",
          message: error instanceof Error ? error.message : "Feed entry mapping failed.",
          retryable: false,
        }],
      };
    }
  }

  async mapToCanonical(parsedRecord: Parameters<OpportunitySourceConnector["mapToCanonical"]>[0]) {
    return this.options.mapToCanonical(parsedRecord);
  }
}

export function importCsvManually(
  input: string,
  mapping: CsvColumnMapping,
) {
  const result = parseCsv(input);
  return mapCsvRowsToOpportunities(result, mapping);
}

export function importJsonManually(input: string) {
  return parseJsonFeed(input);
}

export function validateConnectorSourceForManualImport(source: SourceRegistryRecord) {
  const result = validateConnectorConfiguration(source, {
    version: 1,
    sourceId: source.id,
    connectorType: source.accessMethod === "manual" ? "manual_json" : "manual_csv",
    endpoint: source.website,
    allowedHosts: [new URL(source.website).hostname],
    allowedContentTypes: ["application/json", "text/csv"],
  });
  return result;
}

export function parseStructuredXml(input: string) {
  return parseXmlRecordFeed(input);
}
