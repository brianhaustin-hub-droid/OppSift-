import { createInterface } from "node:readline";
import { validateCollectorRequest, validateCollectorResult } from "./contract.js";
import type { ApprovedSource } from "./approval.js";
import { runCollector } from "./collector.js";

type FixtureInput = {
  mode: "fixture";
  request: unknown;
  approval: ApprovedSource;
  pages: Record<string, { status?: number; contentType?: string; body: string }>;
};

async function main() {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let inputText = "";
  for await (const line of lines) inputText += `${line}\n`;
  const input = JSON.parse(inputText) as FixtureInput;
  if (input.mode !== "fixture") {
    throw new Error("The local CLI only supports fixture mode; network runs require a central registry verifier.");
  }
  const request = validateCollectorRequest(input.request);
  const pages = new Map(Object.entries(input.pages));
  const result = await runCollector(request, {
    approvalAuthority: {
      async loadApprovedSource(sourceId, connectorId) {
        return input.approval.sourceId === sourceId &&
          input.approval.connectorId === connectorId
          ? input.approval
          : null;
      },
      async enforceConditionalConstraints() {
        return false;
      },
    },
    resolveAddresses: async () => ["93.184.216.34"],
    sleep: async () => undefined,
    fetcher: async (url) => {
      const page = pages.get(url.toString());
      if (!page) throw new Error("Fixture URL has no configured response.");
      return new Response(page.body, {
        status: page.status ?? 200,
        headers: {
          "content-type": page.contentType ?? "text/html; charset=utf-8",
        },
      });
    },
  });
  process.stdout.write(`${JSON.stringify(validateCollectorResult(result))}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Collector runner failed."}\n`);
  process.exitCode = 1;
});
