import { neonClient, neonDataApiEndpoint } from "../auth/neon-client";

export type DataApiStatus =
  | "not-configured"
  | "incomplete-config"
  | "not-tested"
  | "connecting"
  | "connected"
  | "service-unavailable"
  | "permission-denied"
  | "migration-pending"
  | "request-failed";

export type DataApiCheckResult = {
  status: Exclude<DataApiStatus, "not-tested" | "connecting">;
  message: string;
};

function readErrorProperty(error: unknown, key: string): string | undefined {
  if (typeof error !== "object" || error === null || !(key in error)) {
    return undefined;
  }
  const value: unknown = Reflect.get(error, key);
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
}

function classifyDataApiError(error: unknown): DataApiCheckResult {
  const code = readErrorProperty(error, "code");
  const status = readErrorProperty(error, "status");
  const message = readErrorProperty(error, "message")?.toLowerCase() ?? "";

  if (
    status === "401" ||
    status === "403" ||
    code === "42501" ||
    /permission denied|not authorized|unauthorized|forbidden|authentication required|missing authentication credentials|required authorization bearer token|valid token|token is needed/.test(message)
  ) {
    return {
      status: "permission-denied",
      message: "The Data API responded but requires an authenticated token or denied this read. Sign in and review grants, RLS policies and the authenticated role.",
    };
  }

  if (
    (status !== undefined && Number(status) >= 500) ||
    /failed to fetch|fetch failed|network error|connection refused|timed? out|service unavailable/.test(message)
  ) {
    return {
      status: "service-unavailable",
      message: "The Data API or network service is unavailable. Check Neon branch health and local network access.",
    };
  }

  if (
    code === "42P01" ||
    code === "PGRST205" ||
    /schema cache|relation .* does not exist|could not find the table/.test(message)
  ) {
    return {
      status: "migration-pending",
      message: "The endpoint responded, but the expected opportunity category table is unavailable. Review and validate migrations 0001 and 0002 on a disposable development branch; do not apply unvalidated migrations to production.",
    };
  }

  return {
    status: "request-failed",
    message: "The Data API request failed. Check the branch endpoint, network access, service state and migration setup. Error details are not shown here.",
  };
}

export async function checkNeonDataApi(): Promise<DataApiCheckResult> {
  if (!neonClient) {
    return {
      status: "not-configured",
      message: "Add the public Neon Auth and Data API URLs to .env.local, then restart Vite.",
    };
  }

  try {
    const result = await neonClient
      .from("opportunity_categories")
      .select("code")
      .eq("code", "government")
      .maybeSingle();

    if (result.error) return classifyDataApiError(result.error);
    if (
      typeof result.data !== "object" ||
      result.data === null ||
      !("code" in result.data) ||
      result.data.code !== "government"
    ) {
      return {
        status: "migration-pending",
        message: "The Data API responded, but the expected government category seed is missing. Review migration 0002 and public read access.",
      };
    }

    return {
      status: "connected",
      message: "The public category registry responded. This checks one read only; it does not verify every migration, authentication flow, or RLS boundary.",
    };
  } catch {
    return {
      status: "service-unavailable",
      message: "The Data API or network service is unavailable. Check Neon branch health and local network access.",
    };
  }
}

export type AnonymousAccessStatus =
  | "not-configured"
  | "not-tested"
  | "checking"
  | "denied"
  | "exposed"
  | "inconclusive";

export type AnonymousAccessResult = {
  status: Exclude<AnonymousAccessStatus, "not-tested" | "checking">;
  message: string;
};

// Requirement: prove a protected table cannot be read without a session.
// This bypasses the SDK so no token can be attached implicitly, and it never
// renders the response body.
export async function checkAnonymousDataApiDenial(): Promise<AnonymousAccessResult> {
  if (!neonDataApiEndpoint) {
    return {
      status: "not-configured",
      message: "The Data API endpoint is not configured, so the anonymous access check cannot run.",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `${neonDataApiEndpoint}/organization_saved_opportunities?select=id&limit=1`,
      {
        method: "GET",
        credentials: "omit",
        headers: { Accept: "application/json" },
      },
    );
  } catch {
    return {
      status: "inconclusive",
      message: "The anonymous request could not reach the Data API. Network or service state prevented the check.",
    };
  }

  if (response.ok) {
    return {
      status: "exposed",
      message:
        "FAIL: the tenant-scoped saved-opportunities table answered an anonymous request. Review the RLS policy and the grants for the anonymous role before any deployment.",
    };
  }

  const detail = (await response.text().catch(() => "")).slice(0, 400);
  const deniedByPolicy =
    response.status === 401 ||
    response.status === 403 ||
    response.status === 404 ||
    /permission denied|insufficient_privilege|not authorized|unauthorized|forbidden|row-level security|missing authentication credentials|required authorization bearer token/i.test(
      detail,
    );

  if (deniedByPolicy) {
    return {
      status: "denied",
      message: `The anonymous request was rejected (HTTP ${response.status}). This confirms the anonymous role cannot read this table; authenticated cross-tenant isolation still needs the two-account test.`,
    };
  }

  return {
    status: "inconclusive",
    message: `The Data API returned HTTP ${response.status}, which is not a recognizable authorization denial. Review grants, RLS and the schema cache manually.`,
  };
}
