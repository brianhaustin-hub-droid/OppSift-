import { describe, expect, it, vi } from "vitest";
import { connectorConfigurationSchema } from "./connectors";
import {
  safeFetchApprovedSource,
  SafeFetchError,
} from "./safe-fetch";

const configuration = connectorConfigurationSchema.parse({
  version: 1,
  sourceId: "e07ee8ac-3aae-46fd-8ca1-6ba111a1d2cd",
  connectorType: "rest_api",
  endpoint: "https://procurement.example.org/api",
  allowedHosts: ["procurement.example.org"],
  allowedContentTypes: ["application/json"],
  requestTimeoutMs: 500,
  maxResponseBytes: 32,
});

describe("approved-source fetch security", () => {
  it.each([
    "http://procurement.example.org/api",
    "https://localhost/api",
    "https://127.0.0.1/api",
    "https://10.1.2.3/api",
    "https://169.254.169.254/latest/meta-data",
    "https://other.example.org/api",
    "https://user:pass@procurement.example.org/api",
    "https://procurement.example.org:8443/api",
  ])("rejects unsafe or unapproved URL %s before fetching", async (url) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(safeFetchApprovedSource(url, configuration, { fetcher })).rejects.toBeInstanceOf(SafeFetchError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects redirects outside the approved host and limits redirect hops", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "https://other.example.org/escape" },
      }),
    );
    await expect(
      safeFetchApprovedSource(configuration.endpoint, configuration, { fetcher }),
    ).rejects.toMatchObject({ details: { kind: "permission", retryable: false } });
  });

  it("allows only approved content types and rejects oversized bodies", async () => {
    const htmlFetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("<html/>", { headers: { "Content-Type": "text/html" } }),
    );
    await expect(
      safeFetchApprovedSource(configuration.endpoint, configuration, { fetcher: htmlFetcher }),
    ).rejects.toMatchObject({ details: { kind: "invalid_content" } });

    const oversizedFetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("x".repeat(100), { headers: { "Content-Type": "application/json" } }),
    );
    await expect(
      safeFetchApprovedSource(configuration.endpoint, configuration, { fetcher: oversizedFetcher }),
    ).rejects.toMatchObject({ details: { kind: "payload_too_large" } });
  });

  it("classifies rate limits and honors Retry-After", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("{}", { status: 429, headers: { "Retry-After": "30" } }),
    );
    await expect(
      safeFetchApprovedSource(configuration.endpoint, configuration, { fetcher }),
    ).rejects.toMatchObject({
      details: { kind: "rate_limit", retryable: true, retryAfterMs: 30_000 },
    });
  });
});
