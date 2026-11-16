import { createHmac, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  assertResultMatchesRequest,
  runCollector,
  type CollectorDependencies,
} from "./collector.js";
import {
  validateCollectorRequest,
  validateCollectorResult,
  type CollectorRequest,
} from "./contract.js";
import type { ApprovedSource } from "./approval.js";

const endpointPath = "/v1/collect";
const maximumRequestBytes = 1_000_000;
const maximumResultBytes = 30_000_000;
const allowedClockSkewMs = 60_000;
const replayRetentionMs = 2 * allowedClockSkewMs;

export type AuthenticatedCollectorServerOptions = {
  secret: string;
  host?: string;
  port?: number;
  maximumExecutionMs?: number;
  maximumConcurrentRequests?: number;
  maximumRequestBytes?: number;
  maximumResultBytes?: number;
  pythonRunner?: CollectorDependencies["pythonRunner"];
  executeCollector?: (
    request: CollectorRequest,
    approvedSource: ApprovedSource,
    signal: AbortSignal,
  ) => Promise<unknown>;
  onEvent?: (event: "request_rejected" | "collection_failed" | "collection_succeeded") => void;
};

export function createAuthenticatedCollectorServer(
  options: AuthenticatedCollectorServerOptions,
): Server {
  if (options.secret.trim().length < 32) {
    throw new Error("Collector runner HMAC secret must contain at least 32 characters.");
  }
  const maximumExecutionMs = boundedInteger(
    options.maximumExecutionMs ?? 15 * 60 * 1000,
    1000,
    30 * 60 * 1000,
  );
  const maximumConcurrentRequests = boundedInteger(
    options.maximumConcurrentRequests ?? 4,
    1,
    32,
  );
  const maximumInputBytes = boundedInteger(
    options.maximumRequestBytes ?? maximumRequestBytes,
    1024,
    maximumRequestBytes,
  );
  const maximumOutputBytes = boundedInteger(
    options.maximumResultBytes ?? maximumResultBytes,
    1024,
    maximumResultBytes,
  );
  const replayedNonces = new Map<string, number>();
  let activeRequests = 0;

  const server = createServer((request, response) => {
    void handleRequest(request, response).catch(() => {
      writeJson(response, 500, { error: "Collector runner failed." });
      options.onEvent?.("collection_failed");
    });
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    response.setHeader("Cache-Control", "no-store");
    if (request.method !== "POST" || request.url !== endpointPath) {
      reject(response, 404, options);
      return;
    }
    if (activeRequests >= maximumConcurrentRequests) {
      reject(response, 429, options);
      return;
    }
    if (request.headers["content-type"]?.split(";", 1)[0]?.trim() !== "application/json") {
      reject(response, 415, options);
      return;
    }

    let body: string;
    try {
      body = await readRequestBody(request, maximumInputBytes);
    } catch (error) {
      const status = error instanceof RequestSizeError ? 413 : 400;
      reject(response, status, options);
      return;
    }
    if (!verifyRequestSignature(request, body, options.secret, replayedNonces)) {
      reject(response, 401, options);
      return;
    }

    let envelope: unknown;
    try {
      envelope = JSON.parse(body) as unknown;
    } catch {
      reject(response, 400, options);
      return;
    }
    if (!isRunnerEnvelope(envelope)) {
      reject(response, 400, options);
      return;
    }

    let collectorRequest: CollectorRequest;
    let approvedSource: ApprovedSource;
    try {
      collectorRequest = validateCollectorRequest(envelope.request);
      approvedSource = validateApprovedSource(envelope.approval);
      if (
        approvedSource.sourceId !== collectorRequest.sourceId ||
        approvedSource.connectorId !== collectorRequest.connectorId
      ) {
        reject(response, 403, options);
        return;
      }
    } catch {
      reject(response, 400, options);
      return;
    }

    activeRequests += 1;
    const controller = new AbortController();
    const executionTimeout = setTimeout(
      () => controller.abort(new Error("Collector execution timed out.")),
      maximumExecutionMs,
    );
    const abortOnDisconnect = () => {
      if (!response.writableEnded) {
        controller.abort(new Error("Collector client disconnected."));
      }
    };
    response.once("close", abortOnDisconnect);
    try {
      const execution = options.executeCollector
        ? options.executeCollector(collectorRequest, approvedSource, controller.signal)
        : runCollector(collectorRequest, {
          approvalAuthority: {
            async loadApprovedSource(sourceId, connectorId) {
              return approvedSource.sourceId === sourceId &&
                approvedSource.connectorId === connectorId
                ? approvedSource
                : null;
            },
            async enforceConditionalConstraints() {
              return false;
            },
          },
          pythonRunner: options.pythonRunner,
          signal: controller.signal,
        });
      const rawResult = await awaitWithAbort(execution, controller.signal);
      const result = assertResultMatchesRequest(
        collectorRequest,
        validateCollectorResult(rawResult),
      );
      const output = JSON.stringify(result);
      if (Buffer.byteLength(output, "utf8") > maximumOutputBytes) {
        throw new Error("Collector result exceeds the runner response limit.");
      }
      writeJson(response, 200, result);
      options.onEvent?.("collection_succeeded");
    } catch {
      const status = controller.signal.aborted ? 504 : 502;
      writeJson(response, status, {
        error: controller.signal.aborted
          ? "Collector execution exceeded its time limit."
          : "Collector execution failed.",
      });
      options.onEvent?.("collection_failed");
    } finally {
      clearTimeout(executionTimeout);
      response.removeListener("close", abortOnDisconnect);
      activeRequests -= 1;
    }
  }

  return server;
}

function isRunnerEnvelope(
  value: unknown,
): value is { request: unknown; approval: unknown } {
  return value !== null &&
    typeof value === "object" &&
    "request" in value &&
    "approval" in value;
}

function validateApprovedSource(value: unknown): ApprovedSource {
  if (
    value === null ||
    typeof value !== "object" ||
    !("sourceId" in value) ||
    !("connectorId" in value) ||
    !("approvalStatus" in value) ||
    !("reusePermission" in value) ||
    !("active" in value) ||
    !("allowedHosts" in value) ||
    !("methods" in value) ||
    !("conditionalConstraintsEnforced" in value) ||
    !("minimumRequestIntervalMs" in value) ||
    !("maxRequests" in value)
  ) {
    throw new Error("Collector approval envelope is invalid.");
  }
  const approval = value as ApprovedSource;
  if (
    typeof approval.sourceId !== "string" ||
    typeof approval.connectorId !== "string" ||
    approval.approvalStatus !== "approved" ||
    approval.reusePermission !== "permitted" ||
    approval.active !== true ||
    !Array.isArray(approval.allowedHosts) ||
    approval.allowedHosts.length === 0 ||
    approval.allowedHosts.some((host) => typeof host !== "string") ||
    !Array.isArray(approval.methods) ||
    approval.methods.length !== 1 ||
    approval.methods[0] !== "GET" ||
    approval.conditionalConstraintsEnforced !== false ||
    !Number.isInteger(approval.minimumRequestIntervalMs) ||
    approval.minimumRequestIntervalMs < 250 ||
    !Number.isInteger(approval.maxRequests) ||
    approval.maxRequests < 1 ||
    approval.maxRequests > 500
  ) {
    throw new Error("Collector approval envelope is not eligible for execution.");
  }
  return approval;
}

function verifyRequestSignature(
  request: IncomingMessage,
  body: string,
  secret: string,
  replayedNonces: Map<string, number>,
): boolean {
  const timestampHeader = request.headers["x-oppsift-timestamp"];
  const nonceHeader = request.headers["x-oppsift-nonce"];
  const signatureHeader = request.headers["x-oppsift-signature"];
  if (
    typeof timestampHeader !== "string" ||
    typeof nonceHeader !== "string" ||
    typeof signatureHeader !== "string" ||
    !/^\d{10,13}$/u.test(timestampHeader) ||
    !/^[a-zA-Z0-9-]{16,96}$/u.test(nonceHeader) ||
    !/^[a-f0-9]{64}$/u.test(signatureHeader)
  ) {
    return false;
  }
  const timestamp = Number(timestampHeader.length === 10
    ? Number(timestampHeader) * 1000
    : timestampHeader);
  const now = Date.now();
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > allowedClockSkewMs) {
    return false;
  }
  for (const [nonce, seenAt] of replayedNonces) {
    if (now - seenAt > replayRetentionMs) replayedNonces.delete(nonce);
  }
  if (replayedNonces.has(nonceHeader) || replayedNonces.size >= 10_000) return false;

  const signedValue = `${timestampHeader}\n${nonceHeader}\nPOST\n${endpointPath}\n${body}`;
  const expected = createHmac("sha256", secret).update(signedValue, "utf8").digest();
  const supplied = Buffer.from(signatureHeader, "hex");
  if (supplied.byteLength !== expected.byteLength || !timingSafeEqual(supplied, expected)) {
    return false;
  }
  replayedNonces.set(nonceHeader, now);
  return true;
}

async function readRequestBody(
  request: IncomingMessage,
  maximumBytes: number,
): Promise<string> {
  const declaredLength = Number(request.headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestSizeError();
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > maximumBytes) throw new RequestSizeError();
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function reject(
  response: ServerResponse,
  status: number,
  options: AuthenticatedCollectorServerOptions,
): void {
  writeJson(response, status, { error: "Collector runner request was rejected." });
  options.onEvent?.("request_rejected");
}

function writeJson(
  response: ServerResponse,
  status: number,
  value: unknown,
): void {
  if (response.headersSent || response.destroyed) return;
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body, "utf8"),
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

class RequestSizeError extends Error {}

function awaitWithAbort<Result>(
  execution: Promise<Result>,
  signal: AbortSignal,
): Promise<Result> {
  if (signal.aborted) {
    return Promise.reject(
      signal.reason instanceof Error ? signal.reason : new Error("Collector execution was cancelled."),
    );
  }
  return new Promise<Result>((resolveResult, rejectResult) => {
    const onAbort = () => {
      rejectResult(
        signal.reason instanceof Error ? signal.reason : new Error("Collector execution was cancelled."),
      );
    };
    signal.addEventListener("abort", onAbort, { once: true });
    execution.then(resolveResult, rejectResult).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function boundedInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Collector runner setting must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}
