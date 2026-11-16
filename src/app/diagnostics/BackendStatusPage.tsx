import { useState } from "react";
import { Badge, Button, Card } from "../../shared/ui/components";
import { useAuth } from "../auth/AuthProvider";
import {
  neonClient,
  neonEndpointConfiguration,
} from "../auth/neon-client";
import {
  checkAnonymousDataApiDenial,
  checkNeonDataApi,
  type AnonymousAccessStatus,
  type DataApiStatus,
} from "./backend-health";
import migrationStatus from "../../../backend/neon/migrations/migration-status.json";

const statusLabels: Readonly<Record<DataApiStatus, string>> = {
  "not-configured": "Not configured",
  "incomplete-config": "Client configuration incomplete",
  "not-tested": "Not tested",
  connecting: "Connecting",
  connected: "Connected",
  "service-unavailable": "Service unavailable",
  "permission-denied": "Permission denied",
  "migration-pending": "Migration pending",
  "request-failed": "Request failed",
};

const anonymousAccessLabels: Readonly<Record<AnonymousAccessStatus, string>> = {
  "not-configured": "Endpoint not configured",
  "not-tested": "Not tested",
  checking: "Checking",
  denied: "Denied as expected",
  exposed: "FAIL: anonymously readable",
  inconclusive: "Inconclusive response",
};

function anonymousAccessTone(status: AnonymousAccessStatus) {
  if (status === "denied") return "success" as const;
  if (status === "exposed") return "error" as const;
  if (status === "inconclusive") return "warning" as const;
  return "neutral" as const;
}

function badgeTone(status: DataApiStatus) {
  if (status === "connected") return "success" as const;
  if (status === "permission-denied" || status === "request-failed" || status === "service-unavailable") return "error" as const;
  if (status === "migration-pending") return "warning" as const;
  if (status === "incomplete-config") return "warning" as const;
  return "neutral" as const;
}

export function BackendStatusPage() {
  const { authError, configured, loading, user } = useAuth();
  const isDevelopment = import.meta.env.DEV;
  const [dataApiStatus, setDataApiStatus] = useState<DataApiStatus>(
    !isDevelopment
      ? "not-tested"
      : !neonEndpointConfiguration.dataApi
        ? "not-configured"
        : !neonClient
          ? "incomplete-config"
          : "not-tested",
  );
  const [dataApiMessage, setDataApiMessage] = useState(
    !isDevelopment
      ? "Connection tests are disabled outside local development."
      : !neonEndpointConfiguration.dataApi
        ? "The Data API endpoint is not set in .env.local."
        : !neonClient
          ? "The Data API endpoint exists, but the SDK client also requires the Auth endpoint."
          : "Run a read-only check against the global opportunity category registry.",
  );

  const [anonymousAccess, setAnonymousAccess] = useState<AnonymousAccessStatus>(
    isDevelopment ? "not-tested" : "not-configured",
  );
  const [anonymousAccessMessage, setAnonymousAccessMessage] = useState(
    isDevelopment
      ? "Run a signed-out read against a tenant-scoped table to confirm the Data API denies it."
      : "Connection tests are disabled outside local development.",
  );

  if (!isDevelopment) {
    return (
      <main className="backend-status-page">
        <header className="page-heading">
          <div className="page-heading__copy">
            <p className="page-heading__eyebrow">Development diagnostics</p>
            <h1>Backend status</h1>
          </div>
          <Badge tone="neutral">{import.meta.env.MODE.toUpperCase()}</Badge>
        </header>
        <Card className="backend-status-card">
          <h2>Diagnostics unavailable</h2>
          <p>Backend connection details and test actions are available only in a local development build.</p>
        </Card>
      </main>
    );
  }

  async function testDataApi() {
    if (!isDevelopment || !neonClient || !neonEndpointConfiguration.dataApi) return;
    setDataApiStatus("connecting");
    setDataApiMessage("Sending a read-only request to the configured Neon Data API…");
    const result = await checkNeonDataApi();
    setDataApiStatus(result.status);
    setDataApiMessage(result.message);
  }

  async function testAnonymousDenial() {
    if (!isDevelopment) return;
    setAnonymousAccess("checking");
    setAnonymousAccessMessage(
      "Sending one signed-out read to a tenant-scoped table…",
    );
    const result = await checkAnonymousDataApiDenial();
    setAnonymousAccess(result.status);
    setAnonymousAccessMessage(result.message);
  }

  const authStatus = !neonEndpointConfiguration.auth
    ? "not-configured"
    : !configured
      ? "incomplete-config"
    : loading
      ? "connecting"
      : authError
      ? "unavailable"
        : user
          ? "connected"
          : "signed-out";
  const googleOAuthEnabled = import.meta.env.VITE_NEON_GOOGLE_OAUTH_ENABLED === "true";
  const authLabel: Readonly<Record<typeof authStatus, string>> = {
    "not-configured": "Not configured",
    "incomplete-config": "Client configuration incomplete",
    connecting: "Checking session",
    connected: "Session active",
    "signed-out": "Ready · signed out",
    unavailable: "Authentication unavailable",
  };
  const connectionLabel: Readonly<Record<DataApiStatus, string>> = {
    "not-configured": "Endpoints not configured",
    "incomplete-config": "Client configuration incomplete",
    "not-tested": "Configured; not yet tested",
    connecting: "Testing connection",
    connected: "Reachable; category read succeeded",
    "service-unavailable": "Service unavailable",
    "permission-denied": "Reachable; authentication or grants required",
    "migration-pending": "Reachable; application schema or seed missing",
    "request-failed": "Request failed",
  };
  const migrationLabel = migrationStatus.migrations
    .map((migration) => `${migration.version}: ${migration.status}`)
    .join(" · ");

  return (
    <main className="backend-status-page">
      <header className="page-heading">
        <div className="page-heading__copy">
          <p className="page-heading__eyebrow">Development diagnostics</p>
          <h1>Backend status</h1>
          <p className="page-heading__description">
            Safe connection checks for this app. Endpoint values, tokens and credentials are never displayed.
          </p>
        </div>
        <Badge tone={neonEndpointConfiguration.auth && neonEndpointConfiguration.dataApi ? "information" : "warning"}>
          {isDevelopment
            ? `LOCAL · ${import.meta.env.VITE_NEON_BRANCH || "BRANCH UNKNOWN"}`
            : import.meta.env.MODE.toUpperCase()}
        </Badge>
      </header>

      <Card className="backend-status-card">
        <h2>Backend environment</h2>
        <ul>
          <li>Neon connection: {connectionLabel[dataApiStatus]}</li>
          <li>Auth: {authLabel[authStatus]}</li>
          <li>Object Storage: private bucket provisioned; upload/download not tested.</li>
          <li>
            Application migrations: {migrationLabel}. This is the local ledger;
            remote schema state is not inferred from it.
          </li>
        </ul>
      </Card>

      <Card className="backend-status-card">
        <div className="backend-status-card__heading">
          <div>
            <h2>Neon Auth</h2>
            <p>
              {authStatus === "unavailable"
                ? "The session request failed. Review the Auth endpoint and trusted origins in Neon."
                : authStatus === "connected"
                  ? "An authenticated session is active."
                  : authStatus === "signed-out"
                    ? "The Auth client is configured and no account is signed in."
                    : authStatus === "connecting"
                      ? "Checking the session with Neon Auth…"
                      : authStatus === "incomplete-config"
                        ? "The Auth endpoint is configured, but the SDK client also requires the Data API endpoint."
                        : "The Auth endpoint is not configured. See the backend setup guide."}
            </p>
            {authError && <p className="backend-status-page__hint">{authError}</p>}
            <ul>
              <li>Email verification: OTP flow enabled; email delivery and verification have not been tested.</li>
              <li>
                Google OAuth UI: {googleOAuthEnabled
                  ? "enabled; confirm the provider credentials are configured in Neon."
                  : "disabled; enable only after configuring OAuth credentials in Neon."}
              </li>
              {user && (
                <li>
                  Current account: {user.email} · email {user.emailVerified ? "verified" : "not verified"}.
                </li>
              )}
            </ul>
          </div>
          <Badge tone={
            authStatus === "connected" || authStatus === "signed-out"
              ? "success"
              : authStatus === "unavailable"
                ? "error"
                : authStatus === "incomplete-config"
                  ? "warning"
                : "neutral"
          }>
            {authLabel[authStatus]}
          </Badge>
        </div>
      </Card>

      <Card className="backend-status-card">
        <div className="backend-status-card__heading">
          <div>
            <h2>Neon Data API</h2>
            <p>{dataApiMessage}</p>
          </div>
          <Badge tone={badgeTone(dataApiStatus)}>{statusLabels[dataApiStatus]}</Badge>
        </div>
        <Button
          disabled={!isDevelopment || !neonClient || !neonEndpointConfiguration.dataApi || dataApiStatus === "connecting"}
          onClick={() => void testDataApi()}
          variant="secondary"
        >
          {dataApiStatus === "connecting" ? "Testing…" : "Test Data API"}
        </Button>
      </Card>

      <Card className="backend-status-card">
        <div className="backend-status-card__heading">
          <div>
            <h2>Authorization boundary</h2>
            <p>{anonymousAccessMessage}</p>
            <ul>
              <li>
                Checks one signed-out read of
                <code> organization_saved_opportunities </code>
                directly against the Data API, with no token attached.
              </li>
              <li>
                A denial here proves the anonymous role cannot read tenant data.
                It does not prove that two verified accounts stay isolated from
                each other.
              </li>
            </ul>
          </div>
          <Badge tone={anonymousAccessTone(anonymousAccess)}>
            {anonymousAccessLabels[anonymousAccess]}
          </Badge>
        </div>
        <Button
          disabled={!isDevelopment || anonymousAccess === "checking"}
          onClick={() => void testAnonymousDenial()}
          variant="secondary"
        >
          {anonymousAccess === "checking" ? "Checking…" : "Check anonymous denial"}
        </Button>
      </Card>

      <Card className="backend-status-card">
        <h2>What this check proves</h2>
        <ul>
          <li>A successful Data API test confirms one public category-registry read only.</li>
          <li>It does not prove that migrations are complete, user authentication works, or tenant RLS is correct.</li>
          <li>The local migration ledger is bookkeeping only and does not verify remote database state.</li>
          <li>No live search, opportunity detail repository, or secure workspace persistence is connected yet.</li>
        </ul>
      </Card>
    </main>
  );
}
