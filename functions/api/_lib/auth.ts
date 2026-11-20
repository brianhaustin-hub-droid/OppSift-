/**
 * Authentication/session helpers for Pages Functions (scaffold).
 *
 * Tenant-scoped and user-scoped operations must run with an authenticated
 * identity so RLS policies (auth.user_id(), org membership checks) apply.
 * Neon Managed Auth / Data API normally handle this; server-side propagation
 * of the end-user session into direct Postgres connections requires explicit,
 * secure session/GUC wiring and is not fully implemented here.
 *
 * TODO: integrate Neon Auth session/JWT verification and, if using direct DB,
 * set request-scoped identity safely (or prefer authenticated RPC/Data API calls).
 */

export type AuthContext = {
  authenticated: boolean;
  userId?: string;
  email?: string;
  tokenPresent: boolean;
};

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export function readAuthContext(request: Request): AuthContext {
  const token = getBearerToken(request);
  return {
    authenticated: false, // verification not implemented
    tokenPresent: !!token,
  };
}

export type AuthRequirement =
  | { ok: true; ctx: AuthContext }
  | { ok: false; status: number; message: string; ctx: AuthContext };

/**
 * Best-effort gate for tenant/user-scoped endpoints.
 * - No token: 401 (auth required).
 * - Token present but server-side verification/DB session propagation not wired: 501 with guidance.
 * Replace with verified session resolution (Neon Auth/JWT) and secure RLS/session binding for direct DB use.
 */
export function requireAuthenticatedRequest(request: Request): AuthRequirement {
  const ctx = readAuthContext(request);
  if (!ctx.tokenPresent) {
    return { ok: false, status: 401, message: "Authentication required. Provide a valid bearer token/session.", ctx };
  }
  if (!ctx.authenticated) {
    return {
      ok: false,
      status: 501,
      message: "Server-side auth verification/session propagation is not fully wired. Use authenticated Neon Data API/RPC calls from the client, or complete session verification wiring.",
      ctx,
    };
  }
  return { ok: true, ctx };
}

// Back-compat alias used by earlier scaffolds.
export function requireAuthPlaceholder(request: Request): { ok: true } | { ok: false; status: number; message: string } {
  const res = requireAuthenticatedRequest(request);
  return res.ok ? { ok: true } : { ok: false, status: res.status, message: res.message };
}
