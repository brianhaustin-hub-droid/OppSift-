import { createHash } from "node:crypto";
import { BasicCrawler, Configuration } from "crawlee";
import {
  assertCollectionApproved,
  type ApprovalAuthority,
} from "./approval.js";
import {
  CollectorContractError,
  validateCollectorRequest,
  validateCollectorResult,
  type CollectorRequest,
  type CollectorResult,
} from "./contract.js";
import { extractPage } from "./extract.js";
import {
  fetchApprovedPage,
  type SafeHttpDependencies,
} from "./safe-http.js";
import { createDefaultCollectorRegistry } from "./registry.js";

export type PythonCollectorRunner = (
  request: CollectorRequest,
  approvedSource: Awaited<ReturnType<typeof assertCollectionApproved>>,
  signal?: AbortSignal,
) => Promise<unknown>;

export type RemoteCollectorRunner = (
  request: CollectorRequest,
  approvedSource: Awaited<ReturnType<typeof assertCollectionApproved>>,
  signal?: AbortSignal,
) => Promise<unknown>;

export type CollectorDependencies = SafeHttpDependencies & {
  approvalAuthority: ApprovalAuthority;
  pythonRunner?: PythonCollectorRunner;
  remoteRunner?: RemoteCollectorRunner;
  signal?: AbortSignal;
  crawlerFactory?: (requestHandler: (url: string) => Promise<void>) => {
    run(url: string): Promise<void>;
  };
};

export async function runCollector(
  input: unknown,
  dependencies: CollectorDependencies,
): Promise<CollectorResult> {
  const request = validateCollectorRequest(input);
  const approvedSource = await assertCollectionApproved(request, dependencies.approvalAuthority);
  const registration = createDefaultCollectorRegistry().resolve(request);
  if (dependencies.signal?.aborted) {
    throw dependencies.signal.reason instanceof Error
      ? dependencies.signal.reason
      : new Error("Collector execution was cancelled.");
  }
  if (dependencies.remoteRunner) {
    return assertResultMatchesRequest(
      request,
      validateCollectorResult(await dependencies.remoteRunner(
        request,
        approvedSource,
        dependencies.signal,
      )),
    );
  }
  if (registration.runtime === "python") {
    if (!dependencies.pythonRunner) {
      throw new Error(`Python collector "${registration.framework}" is not available in this runtime.`);
    }
    return assertResultMatchesRequest(
      request,
      validateCollectorResult(await dependencies.pythonRunner(
        request,
        approvedSource,
        dependencies.signal,
      )),
    );
  }
  if (request.collectorFramework === "crawlee") {
    return runCrawleeCollector(request, dependencies);
  }
  if (request.collectorFramework === "cheerio") {
    return runCheerioCollector(request, dependencies);
  }
  throw new Error("Collector registry selected an unsupported runtime.");
}

async function runCheerioCollector(
  request: CollectorRequest,
  dependencies: SafeHttpDependencies = {},
): Promise<CollectorResult> {
  return runCollectionLoop(request, dependencies, "cheerio");
}

async function runCrawleeCollector(
  request: CollectorRequest,
  dependencies: SafeHttpDependencies & {
    crawlerFactory?: CollectorDependencies["crawlerFactory"];
  } = {},
): Promise<CollectorResult> {
  return runCollectionLoop(request, dependencies, "crawlee");
}

async function runCollectionLoop(
  request: CollectorRequest,
  dependencies: SafeHttpDependencies & {
    crawlerFactory?: CollectorDependencies["crawlerFactory"];
  },
  framework: "crawlee" | "cheerio",
): Promise<CollectorResult> {
  const startedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const pages: string[] = [cursorUrl(request)];
  const visited = new Set<string>();
  const recordIds = new Set<string>();
  const records: CollectorResult["records"] = [];
  const warnings: string[] = [];
  const errors: CollectorResult["errors"] = [];
  let pagesVisited = 0;
  let recordsRejected = 0;
  let totalPayloadBytes = 0;
  let nextCursor: string | null = null;
  const requestBudget = { count: 0, max: request.limits.maxRequests };

  const visit = async (pageUrl: string) => {
    if (visited.has(pageUrl) || pagesVisited >= request.limits.maxPages) return;
    visited.add(pageUrl);
    const page = await fetchApprovedPage(request, pageUrl, {
      ...dependencies,
      requestBudget,
    });
    pagesVisited += 1;
    const extracted = extractPage(request, page.body, page.url, page);
    recordsRejected += extracted.rejectedCount;
    warnings.push(...extracted.warnings);
    for (const record of extracted.records) {
      const payloadBytes = Buffer.byteLength(
        typeof record.payload === "string" ? record.payload : JSON.stringify(record.payload),
        "utf8",
      );
      if (totalPayloadBytes + payloadBytes > request.limits.maxTotalBytes) {
        recordsRejected += 1;
        warnings.push("Maximum aggregate payload size was reached; additional records were skipped.");
        continue;
      }
      if (records.length >= request.limits.maxRecords) {
        recordsRejected += 1;
        continue;
      }
      if (recordIds.has(record.externalRecordId)) {
        recordsRejected += 1;
        warnings.push(`Duplicate external record identifier "${record.externalRecordId}" was skipped.`);
        continue;
      }
      recordIds.add(record.externalRecordId);
      totalPayloadBytes += payloadBytes;
      records.push(record);
    }
    const candidates = [
      ...(extracted.nextPage ? [extracted.nextPage] : []),
      ...extracted.discoveredLinks,
    ];
    for (const candidate of candidates) {
      if (!visited.has(candidate) && !pages.includes(candidate)) pages.push(candidate);
    }
  };

  while (
    pages.length > 0 &&
    pagesVisited < request.limits.maxPages &&
    requestBudget.count < request.limits.maxRequests
  ) {
    const pageUrl = pages.shift();
    if (!pageUrl) break;
    try {
      if (framework === "crawlee") {
        if (dependencies.crawlerFactory) {
          await dependencies.crawlerFactory((url) => visit(url)).run(pageUrl);
        } else {
          const crawler = new BasicCrawler({
            maxConcurrency: 1,
            maxRequestRetries: 0,
            maxRequestsPerCrawl: 1,
            requestHandler: async ({ request: crawleeRequest }) => visit(crawleeRequest.url),
            failedRequestHandler: async ({ request: crawleeRequest, error }) => {
              const message = error instanceof Error ? error.message : "Crawlee request failed.";
              errors.push({
                code: classifyCollectionError(message),
                message: message.slice(0, 1000),
                url: crawleeRequest.url,
                retryable: false,
              });
            },
          }, new Configuration({ persistStorage: false }));
          await crawler.run([pageUrl]);
        }
      } else {
        await visit(pageUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Collector request failed.";
      errors.push({
        code: classifyCollectionError(message),
        message: message.slice(0, 1000),
        url: pageUrl,
        retryable: /timed out|HTTP 429|HTTP 5\d\d|could not be resolved/iu.test(message),
      });
      if (errors.at(-1)?.code === "destination_policy_rejected") break;
    }
  }
  if (pages.length > 0) {
    nextCursor = pages[0] ?? null;
    warnings.push(
      pagesVisited >= request.limits.maxPages
        ? "Maximum page limit reached."
        : "Maximum HTTP request limit reached.",
    );
  }

  const result = {
    contractVersion: "1.0" as const,
    sourceId: request.sourceId,
    jobId: request.jobId,
    ingestionRunId: request.ingestionRunId,
    connectorId: request.connectorId,
    collectorFramework: framework,
    collectorVersion: framework === "crawlee" ? "crawlee@3.18.2" : "cheerio@1.2.0",
    startedAt,
    completedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    requestCount: requestBudget.count,
    pagesVisited,
    recordsDiscovered: records.length,
    recordsRejected,
    warnings: warnings.slice(0, 200),
    errors: errors.slice(0, 200),
    nextCursor,
    records,
  };
  try {
    return assertResultMatchesRequest(request, validateCollectorResult(result));
  } catch (error) {
    if (error instanceof CollectorContractError) throw error;
    throw new CollectorContractError("Collector returned a result outside the shared contract.");
  }
}

export function assertResultMatchesRequest(
  request: CollectorRequest,
  result: CollectorResult,
): CollectorResult {
  if (
    result.sourceId !== request.sourceId ||
    result.jobId !== request.jobId ||
    result.ingestionRunId !== request.ingestionRunId ||
    result.connectorId !== request.connectorId ||
    result.collectorFramework !== request.collectorFramework ||
    result.records.length !== result.recordsDiscovered ||
    result.requestCount > request.limits.maxRequests ||
    result.pagesVisited > request.limits.maxPages ||
    result.records.length > request.limits.maxRecords
  ) {
    throw new CollectorContractError("Collector result does not match the request identity or limits.");
  }
  const allowedHosts = request.allowedHosts.map((host) => host.toLowerCase());
  let totalPayloadBytes = 0;
  for (const record of result.records) {
    const sourceUrl = new URL(record.sourceUrl);
    const sourceHost = sourceUrl.hostname.toLowerCase();
    if (
      sourceUrl.protocol !== "https:" ||
      sourceUrl.username ||
      sourceUrl.password ||
      (sourceUrl.port && sourceUrl.port !== "443") ||
      !allowedHosts.some((host) => sourceHost === host || sourceHost.endsWith(`.${host}`))
    ) {
      throw new CollectorContractError("Collector result contains a record from a disallowed hostname.");
    }
    if (record.canonicalUrl) {
      const canonicalUrl = new URL(record.canonicalUrl);
      const canonicalHost = canonicalUrl.hostname.toLowerCase();
      if (
        canonicalUrl.protocol !== "https:" ||
        canonicalUrl.username ||
        canonicalUrl.password ||
        (canonicalUrl.port && canonicalUrl.port !== "443") ||
        !allowedHosts.some((host) => canonicalHost === host || canonicalHost.endsWith(`.${host}`))
      ) {
        throw new CollectorContractError("Collector result contains a disallowed canonical URL.");
      }
    }
    const payload = typeof record.payload === "string"
      ? record.payload
      : JSON.stringify(record.payload);
    const bytes = Buffer.byteLength(payload, "utf8");
    if (bytes > request.limits.maxResponseBytes) {
      throw new CollectorContractError("Collector result contains a record larger than the response limit.");
    }
    if (createHash("sha256").update(payload).digest("hex") !== record.payloadChecksum) {
      throw new CollectorContractError("Collector result payload checksum does not match the payload.");
    }
    totalPayloadBytes += bytes;
    if (totalPayloadBytes > request.limits.maxTotalBytes) {
      throw new CollectorContractError("Collector result exceeds the aggregate payload limit.");
    }
  }
  return result;
}

function cursorUrl(request: CollectorRequest) {
  if (!request.currentCursor) return request.sourceBaseUrl;
  try {
    return new URL(request.currentCursor, request.sourceBaseUrl).toString();
  } catch {
    throw new Error("Source cursor is not a valid URL.");
  }
}

function classifyCollectionError(message: string) {
  if (/outside the approved|private, reserved|no longer approved/iu.test(message)) {
    return "destination_policy_rejected";
  }
  if (/response exceeds|byte limit/iu.test(message)) return "response_too_large";
  if (/Unsupported response content type/iu.test(message)) return "unsupported_content_type";
  if (/timed out/iu.test(message)) return "request_timeout";
  return "collection_request_failed";
}
