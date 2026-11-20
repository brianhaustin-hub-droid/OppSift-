import { useAuth } from "../../app/auth/AuthProvider";

/**
 * Data API requests must wait for the auth provider to finish loading the
 * session. When a hook fires while the session is still pending, Neon rejects
 * the first request with AuthRequiredError and the caller sees an empty feed
 * forever because nothing retries it.
 *
 * Isolated components rendered without an AuthProvider are treated as ready
 * so public reads still work.
 */
export function useAuthReady(): boolean {
  try {
    return !useAuth().loading;
  } catch {
    return true;
  }
}
