import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";
import {
  createAuthenticatedCollectorServer,
} from "../src/authenticated-server.js";
import type { ApprovedSource } from "../src/approval.js";
import type { CollectorRequest, CollectorResult } from "../src/contract.js";

const secret = "local-test-secret-that-is-at-least-thirty-two-characters";

function request(): CollectorRequest {
  const sourceId = randomUUID();
  return {
    contractVersion: "1.0",
    jobId: randomUUID(),
    ingestionRunId: randomUUID(),
    sourceId,
    connectorId: "fixture-connector",
    collectorFramework: "cheerio",
    sourceBaseUrl: "https://procurement.example.test/notices",
    allowedHosts: ["procurement.example.test"],
    currentCursor: null,
    limits: {
      maxPages: 2,
      maxRecords: 10,
      maxRequests: 4,
      timeoutMs: 1000,
      maxResponseBytes: 100_000,
      maxTotalBytes: 200_000,
      minimumRequestIntervalMs: 250,
    },
    constraints: {
      approvalStatus: "approved",
      reusePermission: "permitted",
      conditionalConstraintsEnforced: false,
      allowedMethods: ["GET"],
      attribution: "Fixture source",
    },
    adapter: {
      adapterId: "fixture",
      format: "html",
      recordSelector: ".notice",
      fields: {
        externalId: { selector: ".id", required: true },
        title: { selector: ".title" },
      },
    },
  };
}

function approval(input: CollectorRequest): ApprovedSource {
  return {
    sourceId: input.sourceId,
    connectorId: input.connectorId,
    approvalStatus: "approved",
    reusePermission: "permitted",
    active: true,
    allowedHosts: input.allowedHosts,
    methods: ["GET"],
    conditionalConstraintsEnforced: false,
    minimumRequestIntervalMs: 250,
    maxRequests: input.limits.maxRequests,
  };
}

function result(input: CollectorRequest): CollectorResult {
  const now = new Date().toISOString();
  return {
    contractVersion: "1.0",
    sourceId: input.sourceId,
    jobId: input.jobId,
    ingestionRunId: input.ingestionRunId,
    connectorId: input.connectorId,
    collectorFramework: input.collectorFramework,
    collectorVersion: "test",
    startedAt: now,
    completedAt: now,
    requestCount: 0,
    pagesVisited: 0,
    recordsDiscovered: 0,
    recordsRejected: 0,
    warnings: [],
    errors: [],
    nextCursor: null,
    records: [],
  };
}

async function withServer(
  executeCollector: NonNullable<Parameters<typeof createAuthenticatedCollectorServer>[0]["executeCollector"]>,
  action: (endpoint: string) => Promise<void>,
  additionalOptions: Partial<Parameters<typeof createAuthenticatedCollectorServer>[0]> = {},
) {
  const server = createAuthenticatedCollectorServer({
    secret,
    executeCollector,
    ...additionalOptions,
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  try {
    await action(`http://127.0.0.1:${address.port}/v1/collect`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

function signedHeaders(body: string, nonce = randomUUID()) {
  const timestamp = String(Date.now());
  const signedValue = `${timestamp}\n${nonce}\nPOST\n/v1/collect\n${body}`;
  const signature = createHmac("sha256", secret).update(signedValue, "utf8").digest("hex");
  return {
    "Content-Type": "application/json",
    "X-OppSift-Timestamp": timestamp,
    "X-OppSift-Nonce": nonce,
    "X-OppSift-Signature": signature,
  };
}

test("authenticated private runner accepts a signed request once and returns the contract result", async () => {
  const input = request();
  const envelope = { request: input, approval: approval(input) };
  const body = JSON.stringify(envelope);
  let executions = 0;
  await withServer(async (received, approved) => {
    executions += 1;
    assert.equal(received.sourceId, approved.sourceId);
    return result(received);
  }, async (endpoint) => {
    const headers = signedHeaders(body);
    const response = await fetch(endpoint, { method: "POST", headers, body });
    assert.equal(response.status, 200);
    const responseResult = await response.json() as CollectorResult;
    assert.equal(responseResult.sourceId, input.sourceId);
    assert.equal(responseResult.recordsDiscovered, 0);
    const replay = await fetch(endpoint, { method: "POST", headers, body });
    assert.equal(replay.status, 401);
  });
  assert.equal(executions, 1);
});

test("private runner rejects unsigned and conditionally approved sources", async () => {
  const input = request();
  const body = JSON.stringify({ request: input, approval: approval(input) });
  let executions = 0;
  await withServer(async (received) => {
    executions += 1;
    return result(received);
  }, async (endpoint) => {
    const unsigned = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    assert.equal(unsigned.status, 401);

    const conditionalApproval = {
      ...approval(input),
      approvalStatus: "approved_with_constraints",
      reusePermission: "conditional",
      conditionalConstraintsEnforced: true,
    };
    const conditionalBody = JSON.stringify({ request: input, approval: conditionalApproval });
    const conditional = await fetch(endpoint, {
      method: "POST",
      headers: signedHeaders(conditionalBody),
      body: conditionalBody,
    });
    assert.equal(conditional.status, 400);
  });
  assert.equal(executions, 0);
});

test("private runner bounds execution time and does not expose collector errors", async () => {
  const input = request();
  const body = JSON.stringify({ request: input, approval: approval(input) });
  await withServer(async (_received, _approved, signal) => new Promise<CollectorResult>((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("api_token=must-not-be-returned")), { once: true });
  }), async (endpoint) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: signedHeaders(body),
      body,
    });
    assert.equal(response.status, 504);
    const responseText = await response.text();
    assert.ok(!responseText.includes("must-not-be-returned"));
  }, { maximumExecutionMs: 1000 });
});
