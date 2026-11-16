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

  if (mode === "development") {
    return (target && target !== "development") ||
      (branch && branch !== "development")
      ? "Development builds must target the development Neon branch."
      : null;
  }

  if (target !== "preview" && target !== "production") {
    return "Preview and production builds must explicitly set VITE_NEON_DEPLOYMENT_ENV.";
  }
  if (branch !== target) {
    return `The ${target} build must use its matching Neon branch configuration.`;
  }
  return null;
}

const deploymentError = getDeploymentConfigurationError(
  import.meta.env.MODE,
  import.meta.env.VITE_NEON_DEPLOYMENT_ENV,
  import.meta.env.VITE_NEON_BRANCH,
);

const deploymentTarget = import.meta.env.VITE_NEON_DEPLOYMENT_ENV;
const authEndpoint =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_NEON_AUTH_URL
    : deploymentTarget === "preview"
      ? import.meta.env.VITE_NEON_AUTH_URL_PREVIEW
      : deploymentTarget === "production"
        ? import.meta.env.VITE_NEON_AUTH_URL_PRODUCTION
        : undefined;
const dataApiEndpoint =
  import.meta.env.MODE === "development"
    ? import.meta.env.VITE_NEON_DATA_API_URL
    : deploymentTarget === "preview"
      ? import.meta.env.VITE_NEON_DATA_API_URL_PREVIEW
      : deploymentTarget === "production"
        ? import.meta.env.VITE_NEON_DATA_API_URL_PRODUCTION
        : undefined;

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
  import.meta.env.VITE_NEON_SIGN_UP_ENABLED === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_NEON_SIGN_UP_ENABLED !== "false");

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
        },
        dataApi: { url: dataApiUrl.value },
      })
    : null;
