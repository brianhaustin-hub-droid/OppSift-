import type {
  ApprovalAuthority,
} from "../../../collectors/node/src/approval.js";
import type {
  CollectorRequest,
  CollectorResult,
} from "../../../collectors/node/src/contract.js";
import type { CollectorExecution } from "./collector-source-connector";

const endpointPath = "/v1/collect";
const maximumRequestBytes = 1_000_000;
const maximumResultBytes = 30_000_000;

export type WorkerCollectorTransportOptions = {
  endpoint: string;
  secret: string;
  timeoutMs?: number;
  allowInsecureLocalhost?: boolean;
  fetcher?: typeof fetch;
  now?: () => number;
};

export function createAuthenticatedCollectorExecution(
  options: WorkerCollectorTransportOptions,
): CollectorExecution {
  const endpoint = validateEndpoint(
    options.endpoint,
    options.allowInsecureLocalhost ?? false,
  );
  if (options.secret.trim().length < 32) {
    throw new Error("Collector runner HMAC secret must contain at least 32 characters.");
  }
  const timeoutMs = boundedInteger(options.timeoutMs ?? 5 * 60 * 1000, 1000, 15 * 60 * 1000);
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const secretBytes = new TextEncoder().encode(options.secret);
  const keyPromise = crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return async (
    request: CollectorRequest,
    authority: ApprovalAuthority,
    signal?: AbortSignal,
  ): Promise<CollectorResult> => {
    const approval = await authority.loadApprovedSource(
      request.sourceId,
      request.connectorId,
    );
    if (
      !approval ||
      approval.approvalStatus !== "approved" ||
      approval.reusePermission !== "permitted" ||
      !approval.active
    ) {
      throw new Error("No currently approved source snapshot is available to the collector runner.");
    }

    const body = JSON.stringify({ request, approval });
    const requestBytes = new TextEncoder().encode(body);
    if (requestBytes.byteLength > maximumRequestBytes) {
      throw new Error("Collector runner request exceeds its configured byte limit.");
    }
    const timestamp = String(Math.floor(now() / 1000));
    const nonce = crypto.randomUUID();
    const signedValue = `${timestamp}\n${nonce}\nPOST\n${endpointPath}\n${body}`;
    const signatureBytes = new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await keyPromise,
        new TextEncoder().encode(signedValue),
      ),
    );
    const signature = bytesToHex(signatureBytes);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("Collector runner request timed out.")),
      timeoutMs,
    );
    const requestSignal = signal
      ? AbortSignal.any([controller.signal, signal])
      : controller.signal;
    try {
      const response = await fetcher(endpoint, {
        method: "POST",
        redirect: "error",
        signal: requestSignal,
        headers: {
          "Content-Type": "application/json",
          "X-OppSift-Timestamp": timestamp,
          "X-OppSift-Nonce": nonce,
          "X-OppSift-Signature": signature,
        },
        body,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Private collector runner returned HTTP ${response.status}.`);
      }
      const responseBytes = await readBoundedResponse(response, maximumResultBytes);
      let value: unknown;
      try {
        value = JSON.parse(new TextDecoder().decode(responseBytes)) as unknown;
      } catch {
        throw new Error("Private collector runner returned invalid JSON.");
      }
      return validateWorkerResult(request, value);
    } finally {
      clearTimeout(timeout);
    }
  };
}

function validateEndpoint(value: string, allowInsecureLocalhost: boolean): URL {
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error("Collector runner endpoint URL is invalid.");
  }
  const localHostname = ["localhost", "127.0.0.1", "::1"].includes(
    endpoint.hostname.toLowerCase().replace(/^\[|\]$/gu, ""),
  );
  if (
    endpoint.pathname !== endpointPath ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.username ||
    endpoint.password ||
    (endpoint.protocol !== "https:" &&
      !(allowInsecureLocalhost && localHostname && endpoint.protocol === "http:")) ||
    (endpoint.port && endpoint.port !== "443" &&
      !(allowInsecureLocalhost && localHostname))
  ) {
    throw new Error("Collector runner endpoint must use the authenticated private HTTPS route.");
  }
  return endpoint;
}

async function readBoundedResponse(
  response: Response,
  maximumBytes: number,
): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel();
    throw new Error("Collector runner response exceeds its configured byte limit.");
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error("Collector runner response exceeds its configured byte limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function validateWorkerResult(
  request: CollectorRequest,
  value: unknown,
): Promise<CollectorResult> {
  if (
    value === null ||
    typeof value !== "object" ||
    !("records" in value) ||
    !Array.isArray(value.records) ||
    !("errors" in value) ||
    !Array.isArray(value.errors) ||
    !("warnings" in value) ||
    !Array.isArray(value.warnings)
  ) {
    throw new Error("Collector runner result does not match the execution contract.");
  }
  const result = value as CollectorResult;
  if (
    result.contractVersion !== "1.0" ||
    result.sourceId !== request.sourceId ||
    result.jobId !== request.jobId ||
    result.ingestionRunId !== request.ingestionRunId ||
    result.connectorId !== request.connectorId ||
    result.collectorFramework !== request.collectorFramework ||
    result.recordsDiscovered !== result.records.length ||
    !Number.isInteger(result.requestCount) ||
    result.requestCount < 0 ||
    result.requestCount > request.limits.maxRequests ||
    !Number.isInteger(result.pagesVisited) ||
    result.pagesVisited < 0 ||
    result.pagesVisited > request.limits.maxPages ||
    result.records.length > request.limits.maxRecords
  ) {
    throw new Error("Collector runner result identity or limits did not match the request.");
  }
  const allowedHosts = request.allowedHosts.map(normalizeHostname);
  let totalBytes = 0;
  for (const record of result.records) {
    assertApprovedUrl(record.sourceUrl, allowedHosts);
    if (record.canonicalUrl) assertApprovedUrl(record.canonicalUrl, allowedHosts);
    const payload = typeof record.payload === "string"
      ? record.payload
      : JSON.stringify(record.payload);
    if (typeof payload !== "string") {
      throw new Error("Collector runner result contains an unserializable payload.");
    }
    const bytes = new TextEncoder().encode(payload);
    totalBytes += bytes.byteLength;
    if (bytes.byteLength > request.limits.maxResponseBytes ||
        totalBytes > request.limits.maxTotalBytes) {
      throw new Error("Collector runner result exceeds its configured payload limits.");
    }
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", bytes),
    );
    if (bytesToHex(digest) !== record.payloadChecksum) {
      throw new Error("Collector runner result payload checksum did not match.");
    }
  }
  return result;
}

function assertApprovedUrl(value: string, allowedHosts: readonly string[]): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Collector runner result contains an invalid source URL.");
  }
  const hostname = normalizeHostname(url.hostname);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    !allowedHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))
  ) {
    throw new Error("Collector runner result contains a disallowed source URL.");
  }
}

function normalizeHostname(value: string): string {
  return value.toLowerCase().replace(/\.$/u, "");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function boundedInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Collector transport setting must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}
