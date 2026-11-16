import { spawn } from "node:child_process";
import { delimiter, join, resolve } from "node:path";
import {
  assertResultMatchesRequest,
  type PythonCollectorRunner,
} from "./collector.js";
import { validateCollectorResult } from "./contract.js";

export type PythonProcessOptions = {
  executable: string;
  packageDirectory: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
};

export function createPythonCollectorRunner(
  options: PythonProcessOptions,
): PythonCollectorRunner {
  const packageDirectory = resolve(options.packageDirectory);
  const timeoutMs = options.timeoutMs ?? 30 * 60 * 1000;
  const maxOutputBytes = options.maxOutputBytes ?? 25_000_000;
  if (
    !options.executable.trim() ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1000 ||
    timeoutMs > 30 * 60 * 1000 ||
    !Number.isSafeInteger(maxOutputBytes) ||
    maxOutputBytes < 1024 ||
    maxOutputBytes > 30_000_000
  ) {
    throw new Error("Python collector process limits or executable are invalid.");
  }

  return async (request, approvedSource, signal) => {
    if (signal?.aborted) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new Error("Python collector execution was cancelled.");
    }
    const environment = safePythonEnvironment(packageDirectory);
    const input = JSON.stringify({
      mode: "approved_network",
      request,
      approval: approvedSource,
    });

    return await new Promise<unknown>((resolveResult, rejectResult) => {
      const child = spawn(
        options.executable,
        ["-m", "oppsift_collectors.network_runner"],
        {
          cwd: packageDirectory,
          env: environment,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        },
      );
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let outputBytes = 0;
      let timedOut = false;
      let outputExceeded = false;
      let settled = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);
      const onAbort = () => child.kill();
      signal?.addEventListener("abort", onAbort, { once: true });

      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
        rejectResult(error);
      };

      const collect = (target: Buffer[], chunk: Buffer) => {
        outputBytes += chunk.byteLength;
        if (outputBytes > maxOutputBytes) {
          outputExceeded = true;
          child.kill();
          return;
        }
        target.push(chunk);
      };

      child.stdout.on("data", (chunk: Buffer) => collect(stdout, chunk));
      child.stderr.on("data", (chunk: Buffer) => collect(stderr, chunk));
      child.on("error", (error) => rejectOnce(new Error(`Python collector could not start: ${error.message}`)));
      child.on("close", (code) => {
        if (settled) return;
        clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
        if (timedOut) {
          rejectOnce(new Error("Python collector exceeded its process timeout."));
          return;
        }
        if (outputExceeded) {
          rejectOnce(new Error("Python collector output exceeded its configured byte limit."));
          return;
        }
        if (signal?.aborted) {
          rejectOnce(new Error("Python collector execution was cancelled."));
          return;
        }
        const errorOutput = Buffer.concat(stderr).toString("utf8").slice(0, 4000);
        if (code !== 0) {
          rejectOnce(new Error(
            errorOutput || `Python collector exited with status ${code ?? "unknown"}.`,
          ));
          return;
        }
        try {
          const output = Buffer.concat(stdout).toString("utf8");
          const result = validateCollectorResult(JSON.parse(output) as unknown);
          resolveResult(assertResultMatchesRequest(request, result));
        } catch (error) {
          rejectOnce(error instanceof Error
            ? error
            : new Error("Python collector returned invalid JSON output."));
        }
      });
      child.stdin.on("error", (error) => {
        if ((error as NodeJS.ErrnoException).code !== "EPIPE") {
          rejectOnce(new Error(`Python collector input failed: ${error.message}`));
        }
      });
      child.stdin.end(input);
    });
  };
}

function safePythonEnvironment(packageDirectory: string): NodeJS.ProcessEnv {
  const inherited = process.env;
  const pythonPath = join(packageDirectory, "src");
  return {
    ...(inherited.PATH ? { PATH: inherited.PATH } : {}),
    ...(inherited.SYSTEMROOT ? { SYSTEMROOT: inherited.SYSTEMROOT } : {}),
    ...(inherited.WINDIR ? { WINDIR: inherited.WINDIR } : {}),
    ...(inherited.TEMP ? { TEMP: inherited.TEMP } : {}),
    ...(inherited.TMP ? { TMP: inherited.TMP } : {}),
    PYTHONPATH: [pythonPath, inherited.PYTHONPATH].filter(Boolean).join(delimiter),
    PYTHONIOENCODING: "utf-8",
    PYTHONNOUSERSITE: "1",
  };
}
