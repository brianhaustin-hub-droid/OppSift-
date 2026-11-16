import { resolve } from "node:path";
import { createAuthenticatedCollectorServer } from "./authenticated-server.js";
import { createPythonCollectorRunner } from "./python-runner.js";

const secret = process.env.OPPSIFT_COLLECTOR_HMAC_KEY;
if (!secret) {
  throw new Error("OPPSIFT_COLLECTOR_HMAC_KEY must be configured outside source control.");
}

const host = process.env.OPPSIFT_COLLECTOR_RUNNER_HOST ?? "127.0.0.1";
const portText = process.env.OPPSIFT_COLLECTOR_RUNNER_PORT ?? "8787";
const port = Number(portText);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("OPPSIFT_COLLECTOR_RUNNER_PORT must be a valid TCP port.");
}

const server = createAuthenticatedCollectorServer({
  secret,
  host,
  port,
  pythonRunner: createPythonCollectorRunner({
    executable: process.env.OPPSIFT_PYTHON_EXECUTABLE ?? "python",
    packageDirectory: resolve(
      process.env.OPPSIFT_PYTHON_PACKAGE_DIRECTORY ?? resolve(process.cwd(), "../python"),
    ),
    timeoutMs: 15 * 60 * 1000,
  }),
  onEvent(event) {
    process.stdout.write(`${event}\n`);
  },
});

server.listen(port, host, () => {
  process.stdout.write(`Private collector runner listening on ${host}:${port}\n`);
});

const stop = () => {
  server.close((error) => {
    if (error) process.exitCode = 1;
  });
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
