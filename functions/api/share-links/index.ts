import { neon } from "@neondatabase/serverless";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * POST /api/share-links
 *
 * Authorises one notice to be readable at `/o/<id>`. This exists because the
 * managed Data API still does not expose the new `opportunity_share_links`
 * table (PGRST205), and because share creation must not depend on a client-side
 * table write.
 *
 * Authorisation is verified server-side: the caller's session token is checked
 * against Neon Auth (`GET {auth}/get-session`) and the share row records that
 * verified user id. A caller without a valid session gets 401; a notice that is
 * not valid or not present gets 404. No RLS policy is widened for this: the
 * write runs through the server's database role and is gated by the check above.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function authBaseUrl(env: PagesContext["env"]): string | null {
  for (const key of ["NEON_AUTH_URL", "VITE_NEON_AUTH_URL", "NEON_AUTH_BASE_URL"]) {
    const value = env[key];
    if (typeof value === "string" && /^https?:\/\//.test(value.trim())) {
      return value.trim().replace(/\/$/, "");
    }
  }
  return null;
}

async function verifiedUserId(request: Request, baseUrl: string): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  try {
    const response = await fetch(`${baseUrl}/get-session`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      user?: { id?: string };
      session?: { userId?: string };
    };
    return payload.user?.id ?? payload.session?.userId ?? null;
  } catch {
    return null;
  }
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const baseUrl = authBaseUrl(context.env);
  if (!baseUrl) {
    return errorResponse(503, "Authentication is not configured for this environment.");
  }

  const userId = await verifiedUserId(context.request, baseUrl);
  if (!userId) {
    return errorResponse(401, "A signed-in session is required to share a notice.");
  }

  const body = await readJsonBody<{ opportunityId?: unknown }>(context.request);
  const opportunityId = typeof body?.opportunityId === "string" ? body.opportunityId : "";
  if (!UUID.test(opportunityId)) {
    return errorResponse(400, "A valid opportunity id is required.");
  }

  const databaseUrl =
    typeof context.env.DATABASE_URL === "string" ? context.env.DATABASE_URL.trim().replace(/^["']|["']$/g, "") : "";
  if (!databaseUrl) {
    return errorResponse(503, "Share links are not configured in this deployment.");
  }

  try {
    const sql = neon(databaseUrl);
    const eligible = (await sql`
      select 1 from public.opportunities
      where id = ${opportunityId}::uuid
        and data_quality_status = 'valid'
        and source_verified_at is not null
      limit 1
    `) as unknown[];
    if (eligible.length === 0) {
      return errorResponse(404, "That notice is not available to share.");
    }

    await sql`
      insert into public.opportunity_share_links (opportunity_id, created_by)
      values (${opportunityId}::uuid, ${userId}::uuid)
      on conflict (opportunity_id) where revoked_at is null do nothing
    `;

    return json({ ok: true, shareUrl: `/o/${opportunityId}` }, 201, { "cache-control": "no-store" });
  } catch (error) {
    // Server-side diagnostics only; the client never sees database detail.
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      "[share-links] write failed:",
      message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted connection string]"),
    );
    return errorResponse(500, "The share link could not be created.");
  }
}

export async function onRequest(): Promise<Response> {
  return methodNotAllowed(["POST"]);
}
