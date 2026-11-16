import { createCollectorSourceConnector } from "../../intelligence/collector-source-connector";
import { createHyperdriveDatabaseExecutor } from "../../intelligence/hyperdrive-executor";
import { NeonIngestionRepository } from "../../intelligence/neon-ingestion-repository";
import {
  dispatchDueJobs,
  scheduleDueSources,
} from "../../intelligence/orchestration";
import { createAuthenticatedCollectorExecution } from "../../intelligence/worker-collector-transport";
import { getSourceExecutionProfiles } from "./profiles";

type WorkerEnv = {
  HYPERDRIVE: { connectionString: string };
  INGESTION_QUEUE: QueueProducer<DispatchWakeup>;
  BROWSER?: unknown;
  SAM_GOV_API_KEY?: string;
  PROBE_TOKEN?: string;
  COLLECTOR_RUNNER_URL?: string;
  COLLECTOR_RUNNER_HMAC_KEY?: string;
  ORCHESTRATION_WORKER_ID?: string;
  MAX_SOURCES_PER_TICK?: string;
  MINIMUM_COLLECTION_INTERVAL_SECONDS?: string;
  MAXIMUM_JOB_RETRIES?: string;
  MAX_JOBS_PER_TICK?: string;
  MAX_CONCURRENT_JOBS?: string;
};

// Diagnostic reachability probes are restricted to national procurement
// portals whose reachability we verify during source activation. The token
// keeps the endpoint unenumerable; the allowlist prevents generic SSRF.
const PROBE_ALLOWED_HOSTS = new Set([
  "armp.gov.bi",
  "www.armp.gov.bi",
  "armp.bi",
  "www.armp.bi",
  "egp.gov.et",
  "www.egp.gov.et",
  "myprocurement.treasury.gov.my",
  "lkpp.go.id",
  "www.lkpp.go.id",
  "isb.lkpp.go.id",
  "inaproc.id",
  "muasamcong.mof.gov.vn",
  "www.gebiz.gov.sg",
  "philgeps.gov.ph",
  "www.philgeps.gov.ph",
  // Blocked-country alternates
  "umucyo.gov.rw",
  "ocds.umucyo.gov.rw",
  "eperolehan.gov.my",
  "www.eperolehan.gov.my",
  // OCP registry (bulk OCDS datasets for many countries)
  "data.open-contracting.org",
  "registry.open-contracting.org",
  // African candidates
  "publicprocurement.govmu.org",
  "nocopo.bpp.gov.ng",
  "bpp.gov.ng",
  "www.bpp.gov.ng",
  "ghaneps.org",
  "www.ghaneps.org",
  "ghaneps.gov.gh",
  "zppa.org.zm",
  "www.zppa.org.zm",
  "ppra.co.bw",
  "www.ppra.co.bw",
  "ppdamlawi.org",
  "www.ppdamlawi.org",
  "marchespublics.gov.ma",
  "www.marchespublics.gov.ma",
  "etenders.gov.za",
  "www.etenders.gov.za",
  "gppagal.gov.gm",
  "www.gppagal.gov.gm",
  "nppa.gov.sl",
  "www.nppa.gov.sl",
  "armp.sn",
  "www.armp.sn",
  "marchespublics.sn",
  "armp.ga",
  "www.armp.ga",
  "marchespublics.ci",
  "armp.cm",
  "www.armp.cm",
  "armp.bj",
  "marchespublics.bj",
  "armp.gov.bf",
  "cpbn.gov.na",
  "www.cpbn.gov.na",
  "namprocure.gov.na",
  "dgcp.gov.ml",
  "armp.ne",
  "sisac.mf.gov.mz",
  // Gabon tender journal (Le JMP) and ARMP site mirror
  "lejmp.ga",
  "www.lejmp.ga",
  "armpgabon.com",
  "www.armpgabon.com",
]);

type ScheduledController = {
  scheduledTime: number;
  cron: string;
};

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export type DispatchWakeup = {
  type: "dispatch";
  enqueuedAt: string;
};

type QueueProducer<T> = {
  send(message: T): Promise<void>;
};

export type QueueMessage<T> = {
  body: T;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

export type QueueBatch<T> = {
  messages: readonly QueueMessage<T>[];
};

export default {
  scheduled(
    _controller: ScheduledController,
    env: WorkerEnv,
    context: WorkerExecutionContext,
  ): void {
    context.waitUntil(runScheduledOrchestration(env));
  },
  queue(batch: QueueBatch<DispatchWakeup>, env: WorkerEnv): Promise<void> {
    return runQueuedDispatch(batch, env);
  },
  async fetch(
    request: Request,
    env: WorkerEnv,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/ingestion-probe") {
      return new Response("Not found", { status: 404 });
    }
    if (!env.PROBE_TOKEN || url.searchParams.get("token") !== env.PROBE_TOKEN) {
      return new Response("Forbidden", { status: 403 });
    }
    const target = url.searchParams.get("url");
    if (!target) {
      return new Response("Missing url", { status: 400 });
    }
    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return new Response("Invalid url", { status: 400 });
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return new Response("Unsupported protocol", { status: 400 });
    }
    if (!PROBE_ALLOWED_HOSTS.has(parsed.hostname)) {
      return new Response("Host not allowed", { status: 403 });
    }
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "*/*",
      };
      const range = url.searchParams.get("range");
      if (range) headers.Range = `bytes=${range}`;
      const response = await fetch(target, { redirect: "follow", headers });
      const body = await response.text();
      const grep = url.searchParams.get("grep");
      const extract = url.searchParams.get("extract");
      let snippet = body;
      if (!url.searchParams.get("range")) snippet = body.slice(0, 160_000);
      if (extract) {
        let regex: RegExp;
        try { regex = new RegExp(extract, "g"); } catch { return new Response("Invalid extract", { status: 400 }); }
        const matches = Array.from(new Set(body.match(regex) ?? []));
        snippet = JSON.stringify(matches.slice(0, 500));
      } else if (grep) {
        let regex: RegExp;
        try { regex = new RegExp(grep, "i"); } catch { return new Response("Invalid grep", { status: 400 }); }
        const lines = body.split(/\r?\n/).filter((line) => regex.test(line));
        snippet = lines.slice(0, 300).join("\n").slice(0, 200_000);
      }
      return new Response(
        JSON.stringify({
          status: response.status,
          finalUrl: response.url,
          contentType: response.headers.get("content-type"),
          length: body.length,
          snippet,
        }),
        { headers: { "content-type": "application/json" } },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error).slice(0, 500) }),
        { status: 502, headers: { "content-type": "application/json" } },
      );
    }
  },
};

export async function runScheduledOrchestration(env: WorkerEnv): Promise<void> {
  const profiles = getSourceExecutionProfiles(env.SAM_GOV_API_KEY);
  const executor = createHyperdriveDatabaseExecutor(env.HYPERDRIVE);
  const repository = new NeonIngestionRepository(executor, "oppsift-orchestrator");
  try {
    const minimumCollectionIntervalMs =
      configuredInteger(env.MINIMUM_COLLECTION_INTERVAL_SECONDS, 300, 60, 2_592_000) * 1000;
    const scheduleResult = await scheduleDueSources(repository, profiles, {
      maximumSourcesPerTick: configuredInteger(env.MAX_SOURCES_PER_TICK, 250, 1, 1000),
      minimumCollectionIntervalMs,
      maximumRetries: configuredInteger(env.MAXIMUM_JOB_RETRIES, 5, 0, 20),
    });
    // Every tick must be observable: a scheduler that enqueues nothing or
    // fails silently is how a 36-hour ingestion outage goes unnoticed.
    console.log("Scheduler tick completed.", {
      examined: scheduleResult.examined,
      enqueued: scheduleResult.enqueued,
      skippedNotDue: scheduleResult.skippedNotDue,
      skippedUnsupported: scheduleResult.skippedUnsupported,
      rejectedByRepository: scheduleResult.rejectedByRepository,
      duplicateOrRace: scheduleResult.duplicateOrRace,
      enqueueFailures: scheduleResult.enqueueFailures,
    });
    try {
      const reapedZombies = await repository.reapZombieRuns();
      if (reapedZombies > 0) {
        console.log(`Reaped ${reapedZombies} zombie ingestion run(s).`);
      }
    } catch (error) {
      // Reaping is hygiene, not correctness: never fail the tick for it.
      console.error("Zombie run reaping failed; continuing.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message.slice(0, 300) : String(error),
      });
    }
    await env.INGESTION_QUEUE.send({
      type: "dispatch",
      enqueuedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Scheduled orchestration failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error).slice(0, 500),
    });
    throw error;
  } finally {
    await executor.close();
  }
}

export async function runQueuedDispatch(
  batch: QueueBatch<DispatchWakeup>,
  env: WorkerEnv,
): Promise<void> {
  await processDispatchQueueBatch(batch, () => dispatchQueuedJobs(env));
}

export async function processDispatchQueueBatch(
  batch: QueueBatch<unknown>,
  dispatch: () => Promise<void>,
): Promise<void> {
  const validMessages = batch.messages.filter((message) =>
    isDispatchWakeup(message.body),
  );
  for (const message of batch.messages) {
    if (!isDispatchWakeup(message.body)) message.ack();
  }
  if (validMessages.length === 0) return;

  try {
    await dispatch();
    for (const message of validMessages) message.ack();
  } catch (error) {
    for (const message of validMessages) message.retry({ delaySeconds: 60 });
    console.error("Ingestion Queue dispatch failed; messages will retry.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      messageCount: validMessages.length,
    });
  }
}

async function dispatchQueuedJobs(env: WorkerEnv): Promise<void> {
  const profiles = getSourceExecutionProfiles(env.SAM_GOV_API_KEY);
  if (profiles.size === 0) return;
  const executor = createHyperdriveDatabaseExecutor(env.HYPERDRIVE);
  const repository = new NeonIngestionRepository(executor, "oppsift-queue-consumer");
  try {
    const minimumCollectionIntervalMs =
      configuredInteger(env.MINIMUM_COLLECTION_INTERVAL_SECONDS, 300, 60, 2_592_000) * 1000;
    const needsCollectorRunner = [...profiles.values()].some(
      (profile) => profile.kind !== "native",
    );
    let executeCollector: ReturnType<typeof createAuthenticatedCollectorExecution> | null = null;
    if (needsCollectorRunner) {
      if (!env.COLLECTOR_RUNNER_URL || !env.COLLECTOR_RUNNER_HMAC_KEY) {
        throw new Error("Private collector runner URL and HMAC secret are required for dispatch.");
      }
      executeCollector = createAuthenticatedCollectorExecution({
        endpoint: env.COLLECTOR_RUNNER_URL,
        secret: env.COLLECTOR_RUNNER_HMAC_KEY,
        timeoutMs: 2 * 60 * 1000,
      });
    }
    const workerId = env.ORCHESTRATION_WORKER_ID ?? "oppsift-cloudflare-queue";
    const maximumJobs = configuredInteger(env.MAX_JOBS_PER_TICK, 10, 1, 10);
    await dispatchDueJobs(
      repository,
      profiles,
      {
        workerId,
        maximumJobs,
        maximumConcurrency: Math.min(
          configuredInteger(env.MAX_CONCURRENT_JOBS, 5, 1, 5),
          maximumJobs,
        ),
        maximumExecutionMs: 4 * 60 * 1000,
        leaseSeconds: 600,
        leaseRenewalIntervalMs: 60_000,
        minimumCollectionIntervalMs,
        browser: env.BROWSER,
        connectorFactory(source, options) {
          if (!executeCollector) {
            throw new Error("No private collector runner is configured for this source.");
          }
          return createCollectorSourceConnector(
            source.id,
            repository,
            options,
            executeCollector,
          );
        },
      },
    );
  } finally {
    await executor.close();
  }
}

function isDispatchWakeup(value: unknown): value is DispatchWakeup {
  return value !== null &&
    typeof value === "object" &&
    "type" in value &&
    value.type === "dispatch" &&
    "enqueuedAt" in value &&
    typeof value.enqueuedAt === "string" &&
    Number.isFinite(Date.parse(value.enqueuedAt));
}

function configuredInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Worker configuration must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}
