import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import type { CollectorRequest } from "./contract.js";

export type HttpPage = {
  url: string;
  status: number;
  contentType: string;
  body: string;
  requestCount: number;
  fetchedAt: string;
  etag: string | null;
  lastModified: string | null;
};

export type SafeHttpDependencies = {
  fetcher?: typeof fetch;
  resolveAddresses?: (hostname: string) => Promise<readonly string[]>;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => Date;
  requestBudget?: { count: number; max: number };
  signal?: AbortSignal;
};

const lastRequestBySource = new Map<string, number>();

export async function fetchApprovedPage(
  request: CollectorRequest,
  inputUrl: string,
  dependencies: SafeHttpDependencies = {},
): Promise<HttpPage> {
  if (!request.constraints.allowedMethods.includes("GET")) {
    throw new Error("The source registry does not permit the required GET request.");
  }
  const now = dependencies.now ?? (() => new Date());
  const sleep = dependencies.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let url = validateRequestUrl(inputUrl, request);
  let requestCount = 0;
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const addresses = await enforceHostPolicy(url.hostname, request, dependencies.resolveAddresses);
    await enforceRateLimit(request, sleep, now);
    if (dependencies.requestBudget) {
      if (dependencies.requestBudget.count >= dependencies.requestBudget.max) {
        throw new Error("Collector request limit was reached.");
      }
      dependencies.requestBudget.count += 1;
    }
    requestCount += 1;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error("Collector request timed out.")),
      request.limits.timeoutMs,
    );
    try {
      const init: RequestInit = {
        method: "GET",
        redirect: "manual",
        signal: dependencies.signal
          ? AbortSignal.any([controller.signal, dependencies.signal])
          : controller.signal,
        headers: { Accept: "text/html, application/xhtml+xml, application/xml, text/xml" },
      };
      const response = dependencies.fetcher
        ? await dependencies.fetcher(url, init)
        : await fetchPinnedHttps(url, init, addresses[0]!, request.limits.maxResponseBytes);
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location || redirectCount === 3) {
          throw new Error("Source redirect is missing a location or exceeds the redirect limit.");
        }
        url = validateRequestUrl(new URL(location, url).toString(), request);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Approved source returned HTTP ${response.status}.`);
      }
      const contentType = response.headers.get("content-type")
        ?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
      if (!["text/html", "application/xhtml+xml", "application/xml", "text/xml"].includes(contentType)) {
        await response.body?.cancel();
        throw new Error(`Unsupported response content type "${contentType || "missing"}".`);
      }
      const body = await readBoundedBody(response, request.limits.maxResponseBytes);
      return {
        url: url.toString(),
        status: response.status,
        contentType,
        body,
        requestCount,
        fetchedAt: now().toISOString(),
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Source redirect limit exceeded.");
}

export function validateRequestUrl(input: string, request: CollectorRequest): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Collector request URL is invalid.");
  }
  const hostname = normalizeHostname(url.hostname);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    isIP(hostname) !== 0 ||
    isLocalHostname(hostname) ||
    !request.allowedHosts.some((approved) => {
      const host = normalizeHostname(approved);
      return hostname === host || hostname.endsWith(`.${host}`);
    })
  ) {
    throw new Error("Collector URL is outside the approved public HTTPS host policy.");
  }
  return url;
}

async function enforceHostPolicy(
  hostname: string,
  request: CollectorRequest,
  resolver: SafeHttpDependencies["resolveAddresses"],
): Promise<readonly string[]> {
  const addresses = await (resolver ?? resolvePublicAddresses)(hostname);
  if (
    addresses.length === 0 ||
    addresses.some((address) => isIP(address) !== 4 || !isPublicIpv4(address))
  ) {
    throw new Error("Collector destination resolves to a private, reserved, or unsupported address.");
  }
  const approvedHosts = request.allowedHosts.map(normalizeHostname);
  if (!approvedHosts.some((approved) => hostname === approved || hostname.endsWith(`.${approved}`))) {
    throw new Error("Collector destination hostname is no longer approved.");
  }
  return addresses;
}

function fetchPinnedHttps(
  url: URL,
  init: RequestInit,
  pinnedAddress: string,
  maxResponseBytes: number,
): Promise<Response> {
  return new Promise((resolveResponse, rejectResponse) => {
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const outgoing = httpsRequest({
      hostname: url.hostname,
      port: 443,
      method: "GET",
      path: `${url.pathname}${url.search}`,
      headers,
      lookup(_hostname, options, callback) {
        if (options.all) {
          callback(null, [{ address: pinnedAddress, family: 4 }]);
        } else {
          callback(null, pinnedAddress, 4);
        }
      },
    }, (incoming) => {
      const declaredLength = Number(incoming.headers["content-length"]);
      if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
        outgoing.destroy(new Error("Source response exceeds the configured byte limit."));
        return;
      }

      const chunks: Buffer[] = [];
      let byteLength = 0;
      incoming.on("data", (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        byteLength += bytes.byteLength;
        if (byteLength > maxResponseBytes) {
          outgoing.destroy(new Error("Source response exceeds the configured byte limit."));
          return;
        }
        chunks.push(bytes);
      });
      incoming.on("end", () => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (Array.isArray(value)) {
            for (const item of value) responseHeaders.append(name, item);
          } else if (value !== undefined) {
            responseHeaders.set(name, value);
          }
        }
        resolveResponse(new Response(Buffer.concat(chunks), {
          status: incoming.statusCode ?? 500,
          headers: responseHeaders,
        }));
      });
      incoming.on("error", rejectResponse);
    });

    const signal = init.signal;
    const abort = () => outgoing.destroy(
      signal?.reason instanceof Error
        ? signal.reason
        : new Error("Collector request was aborted."),
    );
    if (signal?.aborted) {
      abort();
    } else {
      signal?.addEventListener("abort", abort, { once: true });
      outgoing.on("close", () => signal?.removeEventListener("abort", abort));
    }
    outgoing.on("error", rejectResponse);
    outgoing.end();
  });
}

async function resolvePublicAddresses(hostname: string): Promise<readonly string[]> {
  if (isIP(hostname) !== 0) return [hostname];
  try {
    return (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
  } catch {
    throw new Error("Collector hostname could not be resolved.");
  }
}

function isPublicIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [first, second, third] = parts;
  if (first === undefined || second === undefined || third === undefined) return false;
  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 168 || (second === 0 && third === 0) || (second === 0 && third === 2))) ||
    (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
    (first === 203 && second === 0 && third === 113)
  );
}

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") ||
    !hostname.includes(".")
  );
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^\[|\]$/gu, "").replace(/\.$/u, "");
}

async function enforceRateLimit(
  request: CollectorRequest,
  sleep: (milliseconds: number) => Promise<void>,
  now: () => Date,
) {
  const last = lastRequestBySource.get(request.sourceId);
  if (last !== undefined) {
    const wait = request.limits.minimumRequestIntervalMs - (now().getTime() - last);
    if (wait > 0) await sleep(wait);
  }
  lastRequestBySource.set(request.sourceId, now().getTime());
}

async function readBoundedBody(response: Response, maxBytes: number) {
  if (!response.body) return "";
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body.cancel();
    throw new Error("Source response exceeds the configured byte limit.");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        throw new Error("Source response exceeds the configured byte limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}
