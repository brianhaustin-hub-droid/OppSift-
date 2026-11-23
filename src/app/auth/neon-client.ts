import { createClient } from "@neon/neon-js";
import { BetterAuthReactAdapter } from "@neon/neon-js/auth/react/adapters";

type PublicUrlResult =
  | { value: string; error: null }
  | { value: null; error: string };

const isTestMode = import.meta.env.MODE === "test";

export function getDeploymentConfigurationError(
  mode: string,
  target: string | undefined,
  branch: string | undefined,
) {
  if (mode === "test") return null;
  if (!target) return null;
  if (target !== "preview" && target !== "production") {
    return "VITE_NEON_DEPLOYMENT_ENV must be set to preview or production.";
  }
  if (branch && branch !== target) {
    return `VITE_NEON_BRANCH must match ${target} configuration.`;
  }
  return null;
}

const deploymentTarget = import.meta.env.VITE_NEON_DEPLOYMENT_ENV;
const deploymentError = getDeploymentConfigurationError(
  import.meta.env.MODE,
  deploymentTarget,
  import.meta.env.VITE_NEON_BRANCH,
);

const authEndpoint =
  deploymentTarget === "preview"
    ? import.meta.env.VITE_NEON_AUTH_URL_PREVIEW || import.meta.env.VITE_NEON_AUTH_URL
    : deploymentTarget === "production"
      ? import.meta.env.VITE_NEON_AUTH_URL_PRODUCTION || import.meta.env.VITE_NEON_AUTH_URL
      : import.meta.env.VITE_NEON_AUTH_URL ||
        import.meta.env.VITE_NEON_AUTH_URL_PRODUCTION ||
        import.meta.env.VITE_NEON_AUTH_URL_PREVIEW;
const dataApiEndpoint =
  deploymentTarget === "preview"
    ? import.meta.env.VITE_NEON_DATA_API_URL_PREVIEW || import.meta.env.VITE_NEON_DATA_API_URL
    : deploymentTarget === "production"
      ? import.meta.env.VITE_NEON_DATA_API_URL_PRODUCTION || import.meta.env.VITE_NEON_DATA_API_URL
      : import.meta.env.VITE_NEON_DATA_API_URL ||
        import.meta.env.VITE_NEON_DATA_API_URL_PRODUCTION ||
        import.meta.env.VITE_NEON_DATA_API_URL_PREVIEW;

function readPublicUrl(value: string | undefined, label: string): PublicUrlResult {
  if (!value || value.includes("YOUR_")) {
    return { value: null, error: `${label} is not configured.` };
  }

  try {
    const url = new URL(value);
    const localHost = ["localhost", "127.0.0.1"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(localHost && url.protocol === "http:")) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return {
        value: null,
        error: `${label} must be a public HTTPS endpoint without credentials or query parameters.`,
      };
    }

    return { value: url.toString().replace(/\/$/, ""), error: null };
  } catch {
    return { value: null, error: `${label} is not a valid URL.` };
  }
}

const authUrl = readPublicUrl(
  isTestMode ? undefined : authEndpoint,
  "Neon Managed Auth URL",
);
const dataApiUrl = readPublicUrl(
  isTestMode ? undefined : dataApiEndpoint,
  "Neon Data API URL",
);

export const neonConfigurationError = [authUrl.error, dataApiUrl.error]
  .concat(deploymentError)
  .filter(Boolean)
  .join(" ");

export const neonEndpointConfiguration = {
  auth: !deploymentError && authUrl.value !== null,
  dataApi: !deploymentError && dataApiUrl.value !== null,
};

export const neonSignUpEnabled =
  import.meta.env.VITE_NEON_SIGN_UP_ENABLED !== "false";

// The Data API endpoint is a public URL that the browser already holds. It is
// exported for the read-only authorization boundary check, which must call the
// provider directly with no session attached.
export const neonDataApiEndpoint = deploymentError ? null : dataApiUrl.value;

export const neonClient =
  !deploymentError && authUrl.value && dataApiUrl.value
    ? createClient({
        auth: {
          url: authUrl.value,
          adapter: BetterAuthReactAdapter(),
          // Public opportunity, source and country tables are readable through
          // the Data API's anonymous role. Without this the SDK sends no token
          // and every public read fails with 401 PGRST302.
          allowAnonymous: true,
        },
        dataApi: { url: dataApiUrl.value },
      })
    : null;
