import type { ConnectorConfiguration, ConnectorError } from "./connectors";

export type SafeFetchOptions = {
  signal?: AbortSignal;
  headers?: RequestInit["headers"];
  method?: "GET" | "HEAD" | "POST";
  body?: string;
  fetcher?: typeof fetch;
  /**
   * Replaces the real timer used between retry attempts. Callers that already
   * own retry dependencies (see resilience.ts) pass theirs through so retries
   * are deterministic in tests instead of blocking on wall-clock backoff.
   * A custom sleep is responsible for its own cancellation semantics.
   */
  sleep?: (milliseconds: number) => Promise<void>;
  /** Replaces Math.random for retry jitter (deterministic tests). */
  random?: () => number;
};

export class SafeFetchError extends Error {
  constructor(readonly details: ConnectorError) {
    super(details.message);
    this.name = "SafeFetchError";
  }
}

function isPrivateOrNonPublicHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".test") ||
    host.endsWith(".invalid")
  ) return true;

  if (host.includes(":")) return true;

  if (/^\d+(?:\.\d+){3}$/.test(host)) {
    const octets = host.split(".").map(Number);
    if (octets.some((octet) => octet < 0 || octet > 255)) return true;
    const [first, second] = octets;
    return first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second !== undefined && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second !== undefined && second >= 16 && second <= 31) ||
      (first === 192 && second === 168);
  }

  return !host.includes(".");
}

function validateApprovedUrl(input: string, configuration: ConnectorConfiguration) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SafeFetchError({
      kind: "configuration",
      message: "Source URL is invalid.",
      retryable: false,
    });
  }

  const approvedHosts = new Set(configuration.allowedHosts.map((host) => host.toLowerCase()));
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isPrivateOrNonPublicHost(url.hostname) ||
    !approvedHosts.has(url.hostname.toLowerCase())
  ) {
    throw new SafeFetchError({
      kind: "permission",
      message: "Request URL is not permitted by the approved source host policy.",
      retryable: false,
    });
  }
  return url;
}

function classifyStatus(status: number, headers: Headers): ConnectorError {
  if (status === 401) return { kind: "authentication", message: "Source authentication failed.", retryable: false, status };
  if (status === 403) return { kind: "permission", message: "Source denied access; review permission and terms.", retryable: false, status };
  if (status === 404) return { kind: "http_client", message: "Approved source endpoint was not found.", retryable: false, status };
  if (status === 408) return { kind: "timeout", message: "Source request timed out.", retryable: true, status };
  if (status === 429) {
    const retryAfter = headers.get("Retry-After");
    const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null;
    const dateDelay = retryAfter && seconds === null ? Date.parse(retryAfter) - Date.now() : null;
    return {
      kind: "rate_limit",
      message: "Source rate limit exceeded.",
      retryable: true,
      status,
      ...(seconds !== null && { retryAfterMs: seconds * 1000 }),
      ...(dateDelay !== null && dateDelay >= 0 && { retryAfterMs: dateDelay }),
    };
  }
  if (status >= 500) return { kind: "http_server", message: `Source server returned HTTP ${status}.`, retryable: true, status };
  return { kind: "http_client", message: `Source returned HTTP ${status}.`, retryable: false, status };
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timeout);
      reject(signal?.reason instanceof Error ? signal.reason : new Error("Request was cancelled."));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function retryDelayMs(
  attempt: number,
  configuration: ConnectorConfiguration,
  error: SafeFetchError,
  random: () => number,
): number {
  const base = Math.min(
    configuration.maximumRetryDelayMs,
    configuration.minimumRetryDelayMs * Math.max(1, 2 ** attempt),
  );
  const jitter = Math.floor(random() * 250);
  const suggested = typeof error.details.retryAfterMs === "number" ? error.details.retryAfterMs : 0;
  return Math.min(configuration.maximumRetryDelayMs, Math.max(base + jitter, suggested));
}

export async function safeFetchApprovedSource(
  input: string,
  configuration: ConnectorConfiguration,
  options: SafeFetchOptions = {},
): Promise<Response> {
  const fetcher = options.fetcher ?? fetch;
  const initialUrl = validateApprovedUrl(input, configuration);
  const maxRetries = Math.max(0, configuration.maxRetries ?? 0);
  const sleep = options.sleep ?? ((milliseconds: number) => delay(milliseconds, options.signal));
  const random = options.random ?? Math.random;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error
        ? options.signal.reason
        : new Error("Request was cancelled.");
    }
    let currentUrl = initialUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), configuration.requestTimeoutMs);
    const onAbort = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) controller.abort(options.signal.reason);
    options.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
        let response: Response;
        try {
          response = await fetcher(currentUrl, {
            method: options.method ?? "GET",
            headers: options.headers,
            body: options.body,
            redirect: "manual",
            signal: controller.signal,
          });
        } catch (error) {
          const timedOut = controller.signal.aborted && !options.signal?.aborted;
          throw new SafeFetchError({
            kind: timedOut ? "timeout" : "network",
            message: timedOut
              ? "Source request timed out or was cancelled."
              : error instanceof Error ? error.message : "Source network request failed.",
            retryable: true,
          });
        }

        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("Location");
          await response.body?.cancel();
          if (!location || redirectCount === 3) {
            throw new SafeFetchError({
              kind: "permission",
              message: "Source redirect is missing a location or exceeds the redirect limit.",
              retryable: false,
              status: response.status,
            });
          }
          currentUrl = validateApprovedUrl(new URL(location, currentUrl).toString(), configuration);
          continue;
        }

        if (response.status === 304) return response;
        if (!response.ok) throw new SafeFetchError(classifyStatus(response.status, response.headers));

        const contentType = response.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
        const allowedTypes = configuration.allowedContentTypes.map((type) => type.toLowerCase());
        if (!allowedTypes.includes(contentType)) {
          throw new SafeFetchError({
            kind: "invalid_content",
            message: `Source returned unsupported content type "${contentType || "missing"}".`,
            retryable: false,
          });
        }

        const lengthHeader = response.headers.get("Content-Length");
        if (lengthHeader && Number(lengthHeader) > configuration.maxResponseBytes) {
          throw new SafeFetchError({
            kind: "payload_too_large",
            message: "Source response exceeds the configured size limit.",
            retryable: false,
          });
        }
        if (!response.body) return response;

        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            if (totalBytes > configuration.maxResponseBytes) {
              await reader.cancel();
              throw new SafeFetchError({
                kind: "payload_too_large",
                message: "Source response exceeds the configured size limit.",
                retryable: false,
              });
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        const bytes = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return new Response(bytes, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      throw new SafeFetchError({
        kind: "permission",
        message: "Source redirect limit exceeded.",
        retryable: false,
      });
    } catch (error) {
      const safeError = error instanceof SafeFetchError
        ? error
        : new SafeFetchError({
            kind: "network",
            message: error instanceof Error ? error.message : "Source request failed.",
            retryable: true,
          });
      if (!safeError.details.retryable || attempt >= maxRetries || options.signal?.aborted) {
        throw safeError;
      }
      await sleep(retryDelayMs(attempt, configuration, safeError, random));
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
    }
  }

  throw new SafeFetchError({
    kind: "network",
    message: "Source request failed after retries.",
    retryable: false,
  });
}
