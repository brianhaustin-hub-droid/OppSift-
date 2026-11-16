// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  processDispatchQueueBatch,
  type QueueMessage,
} from "./index";

function message(body: unknown) {
  const ack = vi.fn();
  const retry = vi.fn();
  return {
    body,
    ack,
    retry,
  } satisfies QueueMessage<unknown> & {
    ack: ReturnType<typeof vi.fn>;
    retry: ReturnType<typeof vi.fn>;
  };
}

describe("ingestion Queue dispatch", () => {
  it("acknowledges a valid wakeup only after dispatch succeeds", async () => {
    const wakeup = message({
      type: "dispatch",
      enqueuedAt: "2026-11-11T12:00:00.000Z",
    });
    const dispatch = vi.fn(async () => {});

    await processDispatchQueueBatch({ messages: [wakeup] }, dispatch);

    expect(dispatch).toHaveBeenCalledOnce();
    expect(wakeup.ack).toHaveBeenCalledOnce();
    expect(wakeup.retry).not.toHaveBeenCalled();
  });

  it("retries valid messages when dispatch fails", async () => {
    const wakeup = message({
      type: "dispatch",
      enqueuedAt: "2026-11-11T12:00:00.000Z",
    });

    await processDispatchQueueBatch(
      { messages: [wakeup] },
      async () => {
        throw new Error("database unavailable");
      },
    );

    expect(wakeup.retry).toHaveBeenCalledWith({ delaySeconds: 60 });
    expect(wakeup.ack).not.toHaveBeenCalled();
  });

  it("acknowledges malformed messages without dispatching them", async () => {
    const malformed = message({ type: "unknown" });
    const dispatch = vi.fn(async () => {});

    await processDispatchQueueBatch({ messages: [malformed] }, dispatch);

    expect(malformed.ack).toHaveBeenCalledOnce();
    expect(malformed.retry).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
