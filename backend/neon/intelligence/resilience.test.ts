import { describe, expect, it } from "vitest";
import {
  SourceCircuitBreaker,
  SourceRateLimiter,
  isSourceDue,
  processBatch,
  withRetry,
  type SourceSchedule,
} from "./resilience";
import { ClassifiedRequestError } from "./resilience";

const schedule: SourceSchedule = {
  sourceId: "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd",
  enabled: true,
  minimumIntervalMinutes: 60,
  preferredUtcHour: null,
  jitterMinutes: 10,
  timeZone: "Pacific/Auckland",
  lastRunAt: "2026-11-04T10:00:00Z",
};

describe("ingestion resilience primitives", () => {
  it("uses UTC instants to evaluate source intervals across local DST settings", () => {
    expect(isSourceDue(schedule, new Date("2026-11-04T10:59:59Z"))).toBe(false);
    expect(isSourceDue(schedule, new Date("2026-11-04T11:00:00Z"))).toBe(true);
    expect(isSourceDue({ ...schedule, enabled: false }, new Date("2026-11-05T00:00:00Z"))).toBe(false);
    expect(isSourceDue({ ...schedule, timeZone: "Not/A_Timezone" }, new Date())).toBe(false);
  });

  it("retries retryable failures with bounded exponential delay and stops permanent failures", async () => {
    const delays: number[] = [];
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new ClassifiedRequestError({
            kind: "http_server",
            message: "Temporary source issue",
            retryable: true,
          });
        }
        return "ok";
      },
      { maxRetries: 3, minimumDelayMs: 100, maximumDelayMs: 1000 },
      { sleep: async (delay) => { delays.push(delay); }, random: () => 0 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(delays).toEqual([100, 200]);

    await expect(withRetry(
      async () => {
        throw new ClassifiedRequestError({
          kind: "permission",
          message: "No access",
          retryable: false,
        });
      },
      { maxRetries: 5, minimumDelayMs: 100, maximumDelayMs: 1000 },
      { sleep: async () => undefined, random: () => 0 },
    )).rejects.toMatchObject({ details: { retryable: false } });
  });

  it("isolates source circuits and allows recovery after cooldown", () => {
    let now = 100;
    const breaker = new SourceCircuitBreaker(2, 500, () => now);
    breaker.recordFailure("source-a");
    expect(breaker.isOpen("source-a")).toBe(false);
    breaker.recordFailure("source-a");
    expect(breaker.isOpen("source-a")).toBe(true);
    expect(breaker.isOpen("source-b")).toBe(false);
    now += 500;
    expect(breaker.isOpen("source-a")).toBe(false);
  });

  it("processes bounded batches without letting individual errors stop neighbors", async () => {
    const results = await processBatch([1, 2, 3, 4], 2, async (value) => {
      if (value === 2) throw new Error("record invalid");
      return value * 2;
    });
    expect(results).toEqual([
      { status: "fulfilled", value: 2 },
      { status: "rejected", reason: expect.any(Error) },
      { status: "fulfilled", value: 6 },
      { status: "fulfilled", value: 8 },
    ]);
    await expect(processBatch([1], 0, async (value) => value)).rejects.toThrow(/concurrency/);
  });

  it("applies independent per-source rate limits", async () => {
    let now = 0;
    const delays: number[] = [];
    const limiter = new SourceRateLimiter(() => now);
    await limiter.wait("source-a", 100, async (delay) => { delays.push(delay); now += delay; });
    await limiter.wait("source-a", 100, async (delay) => { delays.push(delay); now += delay; });
    await limiter.wait("source-b", 100, async (delay) => { delays.push(delay); now += delay; });
    expect(delays).toEqual([100]);
  });

  it("serializes concurrent requests so a source interval cannot be bypassed", async () => {
    let now = 0;
    const delays: number[] = [];
    const limiter = new SourceRateLimiter(() => now);
    await Promise.all(Array.from({ length: 3 }, async () => {
      await limiter.wait("source-a", 100, async (delay) => {
        delays.push(delay);
        now += delay;
      });
    }));

    expect(delays).toEqual([100, 100]);
  });
});
