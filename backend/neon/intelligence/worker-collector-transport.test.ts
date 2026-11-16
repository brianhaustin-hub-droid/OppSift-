// @vitest-environment node

import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAuthenticatedCollectorServer,
} from "../../../collectors/node/src/authenticated-server.js";
import type { ApprovedSource } from "../../../collectors/node/src/approval.js";
import type {
  CollectorRequest,
  CollectorResult,
} from "../../../collectors/node/src/contract.js";
import { createAuthenticatedCollectorExecution } from "./worker-collector-transport";

const secret = "unit-test-hmac-key-with-more-than-thirty-two-characters";
const servers: ReturnType<typeof createAuthenticatedCollectorServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => {
    server.closeAllConnections();
    return new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }));
});

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

function approvedSource(input: CollectorRequest): ApprovedSource {
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

function collectorResult(input: CollectorRequest): CollectorResult {
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

async function startServer(
  executeCollector: NonNullable<Parameters<typeof createAuthenticatedCollectorServer>[0]["executeCollector"]>,
) {
  const server = createAuthenticatedCollectorServer({
    secret,
    executeCollector,
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}/v1/collect`;
}

describe("authenticated collector transport for Workers", () => {
  it("authenticates, bounds, and validates a private Node/Python runner response", async () => {
    const input = request();
    const endpoint = await startServer(async (received) => collectorResult(received));
    const execution = createAuthenticatedCollectorExecution({
      endpoint,
      secret,
      allowInsecureLocalhost: true,
    });
    const result = await execution(input, {
      async loadApprovedSource(sourceId, connectorId) {
        return sourceId === input.sourceId && connectorId === input.connectorId
          ? approvedSource(input)
          : null;
      },
    });
    expect(result).toMatchObject({
      sourceId: input.sourceId,
      jobId: input.jobId,
      ingestionRunId: input.ingestionRunId,
      recordsDiscovered: 0,
    });
  });

  it("rejects a runner result whose request identity was changed", async () => {
    const input = request();
    const endpoint = await startServer(async (received) => ({
      ...collectorResult(received),
      jobId: randomUUID(),
    }));
    const execution = createAuthenticatedCollectorExecution({
      endpoint,
      secret,
      allowInsecureLocalhost: true,
    });
    await expect(execution(input, {
      async loadApprovedSource() {
        return approvedSource(input);
      },
    })).rejects.toThrow("HTTP 502");
  });

  it("requires HTTPS outside explicit loopback development", () => {
    expect(() => createAuthenticatedCollectorExecution({
      endpoint: "http://collector.internal/v1/collect",
      secret,
    })).toThrow("private HTTPS");
  });
});
