import { z } from "zod";
import {
  connectorConfigurationSchema,
  type ConnectorConfiguration,
} from "./connectors";
import { safeFetchApprovedSource } from "./safe-fetch";

const ckanPackageSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  title: z.string().min(1).max(500),
  notes: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  metadata_created: z.string().optional(),
  metadata_modified: z.string().optional(),
  license_id: z.string().nullable().optional(),
  license_title: z.string().nullable().optional(),
  license_url: z.string().nullable().optional(),
  resources: z.array(z.object({
    id: z.string().min(1).max(200),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    format: z.string().nullable().optional(),
    url: z.string().url(),
    datastore_active: z.boolean().optional(),
    last_modified: z.string().nullable().optional(),
  }).passthrough()).default([]),
}).passthrough();

const ckanSearchResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    count: z.number().int().nonnegative(),
    results: z.array(ckanPackageSchema),
  }).optional(),
});

export type CkanDataset = z.infer<typeof ckanPackageSchema>;

export type CkanSearchResult = {
  total: number;
  start: number;
  rows: number;
  datasets: CkanDataset[];
};

type CkanDiscoveryOptions = {
  baseUrl: string;
  allowedHosts: readonly string[];
  fetcher?: typeof fetch;
  requestTimeoutMs?: number;
  maxResponseBytes?: number;
};

export class CkanDiscoveryClient {
  private readonly baseUrl: URL;
  private readonly configuration: ConnectorConfiguration;

  constructor(private readonly options: CkanDiscoveryOptions) {
    this.baseUrl = new URL(options.baseUrl);
    if (
      this.baseUrl.protocol !== "https:" ||
      this.baseUrl.username ||
      this.baseUrl.password ||
      this.baseUrl.search ||
      this.baseUrl.hash ||
      (this.baseUrl.port && this.baseUrl.port !== "443") ||
      !options.allowedHosts.map((host) => host.toLowerCase()).includes(this.baseUrl.hostname.toLowerCase())
    ) {
      throw new Error("CKAN catalog URL must be HTTPS and match an explicitly approved hostname.");
    }

    this.configuration = connectorConfigurationSchema.parse({
      version: 1,
      sourceId: "00000000-0000-4000-8000-000000000001",
      connectorType: "rest_api",
      endpoint: new URL("api/3/action/package_search", `${this.baseUrl.toString().replace(/\/?$/, "/")}`).toString(),
      allowedHosts: options.allowedHosts,
      pageSize: 100,
      maxPagesPerRun: 1,
      requestTimeoutMs: options.requestTimeoutMs ?? 15_000,
      maxResponseBytes: options.maxResponseBytes ?? 2_000_000,
      maxRetries: 0,
      minimumRetryDelayMs: 1_000,
      maximumRetryDelayMs: 1_000,
      allowedContentTypes: ["application/json"],
    });
  }

  async search(query: string, options: { start?: number; rows?: number; signal?: AbortSignal } = {}): Promise<CkanSearchResult> {
    const normalizedQuery = query.trim();
    const start = options.start ?? 0;
    const rows = options.rows ?? 20;
    if (!normalizedQuery || normalizedQuery.length > 200) {
      throw new Error("CKAN search query must contain 1 to 200 non-whitespace characters.");
    }
    if (!Number.isSafeInteger(start) || start < 0) {
      throw new Error("CKAN start must be a non-negative integer.");
    }
    if (!Number.isSafeInteger(rows) || rows < 1 || rows > 100) {
      throw new Error("CKAN rows must be an integer from 1 to 100.");
    }

    const endpoint = new URL(this.configuration.endpoint);
    endpoint.searchParams.set("q", normalizedQuery);
    endpoint.searchParams.set("start", String(start));
    endpoint.searchParams.set("rows", String(rows));

    const response = await safeFetchApprovedSource(endpoint.toString(), this.configuration, {
      signal: options.signal,
      fetcher: this.options.fetcher,
      headers: { Accept: "application/json" },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error("CKAN catalog returned invalid JSON.");
    }
    const parsed = ckanSearchResponseSchema.safeParse(body);
    if (!parsed.success || !parsed.data.success || !parsed.data.result) {
      throw new Error("CKAN catalog response did not match the Action API package_search format.");
    }
    if (parsed.data.result.results.length > rows) {
      throw new Error("CKAN catalog returned more datasets than requested.");
    }

    return {
      total: parsed.data.result.count,
      start,
      rows,
      datasets: parsed.data.result.results,
    };
  }
}
