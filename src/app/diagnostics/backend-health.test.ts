import { afterEach, describe, expect, it, vi } from "vitest";

const healthMocks = vi.hoisted(() => ({
  dataApiEndpoint: "https://data.example.test" as string | null,
  categoryRow: null as unknown,
  categoryError: null as unknown,
}));

vi.mock("../auth/neon-client", () => ({
  get neonDataApiEndpoint() {
    return healthMocks.dataApiEndpoint;
  },
  neonClient: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: healthMocks.categoryRow,
            error: healthMocks.categoryError,
          }),
        }),
      }),
    }),
  },
}));

function response(status: number, body: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response;
}

function fetchImpl(...calls: Array<() => Promise<Response>>) {
  return vi.fn<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  >(async () => {
    const next = calls.shift();
    if (!next) throw new Error("The anonymous check made more requests than expected.");
    return next();
  });
}

describe("anonymous authorization boundary check", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    healthMocks.dataApiEndpoint = "https://data.example.test";
    healthMocks.categoryRow = null;
    healthMocks.categoryError = null;
  });

  it("sends no session and never renders the response body", async () => {
    const fetch = fetchImpl(() =>
      Promise.resolve(
        response(401, '{"error":"invalid JWT: token is missing","secret":"Bearer abc"}'),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const { checkAnonymousDataApiDenial } = await import("./backend-health");

    const result = await checkAnonymousDataApiDenial();

    expect(result.status).toBe("denied");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://data.example.test/organization_saved_opportunities?select=id&limit=1",
    );
    expect(init).toMatchObject({ method: "GET", credentials: "omit" });
    expect(JSON.stringify(init)).not.toMatch(/authorization|bearer/i);
    expect(result.message).not.toContain("abc");
    expect(result.message).toContain("HTTP 401");
  });

  it("classifies a permission-denied status code as a denial", async () => {
    vi.stubGlobal(
      "fetch",
      fetchImpl(() =>
        Promise.resolve(
          response(400, '{"error":"permission denied for table organization_saved_opportunities"}'),
        ),
      ),
    );
    const { checkAnonymousDataApiDenial } = await import("./backend-health");

    expect((await checkAnonymousDataApiDenial()).status).toBe("denied");
  });

  it("classifies Neon missing-bearer-token responses as a denial", async () => {
    vi.stubGlobal(
      "fetch",
      fetchImpl(() =>
        Promise.resolve(
          response(
            400,
            '{"message":"missing authentication credentials: required authorization bearer token in JWT format"}',
          ),
        ),
      ),
    );
    const { checkAnonymousDataApiDenial } = await import("./backend-health");

    expect((await checkAnonymousDataApiDenial()).status).toBe("denied");
  });

  it("fails loudly when a tenant table answers an anonymous read", async () => {
    vi.stubGlobal(
      "fetch",
      fetchImpl(() => Promise.resolve(response(200, '[{"id":"row-from-another-tenant"}]'))),
    );
    const { checkAnonymousDataApiDenial } = await import("./backend-health");

    const result = await checkAnonymousDataApiDenial();

    expect(result.status).toBe("exposed");
    expect(result.message.startsWith("FAIL:")).toBe(true);
    expect(result.message).not.toContain("row-from-another-tenant");
  });

  it("stays inconclusive instead of guessing on an unfamiliar answer", async () => {
    vi.stubGlobal("fetch", fetchImpl(() => Promise.resolve(response(500, "gateway error"))));
    const { checkAnonymousDataApiDenial } = await import("./backend-health");

    const result = await checkAnonymousDataApiDenial();

    expect(result.status).toBe("inconclusive");
    expect(result.message).toContain("HTTP 500");
  });

  it("stays inconclusive when the network prevents the check", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const { checkAnonymousDataApiDenial } = await import("./backend-health");

    expect((await checkAnonymousDataApiDenial()).status).toBe("inconclusive");
  });

  it("does not reach the network when the endpoint is unconfigured", async () => {
    healthMocks.dataApiEndpoint = null;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { checkAnonymousDataApiDenial } = await import("./backend-health");

    const result = await checkAnonymousDataApiDenial();

    expect(result.status).toBe("not-configured");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("public category registry read", () => {
  afterEach(() => {
    vi.clearAllMocks();
    healthMocks.categoryRow = null;
    healthMocks.categoryError = null;
  });

  it("confirms only the single public read it performed", async () => {
    healthMocks.categoryRow = { code: "government" };
    const { checkNeonDataApi } = await import("./backend-health");

    const result = await checkNeonDataApi();

    expect(result.status).toBe("connected");
    expect(result.message).toContain("one read");
  });

  it("reports a missing seed as a migration problem", async () => {
    healthMocks.categoryRow = { code: "non-profit" };
    const { checkNeonDataApi } = await import("./backend-health");

    expect((await checkNeonDataApi()).status).toBe("migration-pending");
  });

  it("separates an authentication failure from a missing table", async () => {
    healthMocks.categoryError = { status: 403, message: "permission denied" };
    const { checkNeonDataApi } = await import("./backend-health");
    expect((await checkNeonDataApi()).status).toBe("permission-denied");

    healthMocks.categoryError = { code: "42P01", message: "relation does not exist" };
    expect((await checkNeonDataApi()).status).toBe("migration-pending");
  });
});
