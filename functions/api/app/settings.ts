import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * Profile/settings API (best-effort RPC calls).
 * Requires authenticated user session context (0033/0037/0039, 0001 org settings).
 */

export async function onRequest(context: PagesContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
  const sql = createSql(context.env);
  if (!sql) return errorResponse(503, "Database is not configured for this environment.");

  try {
    if (method === "GET") {
      try {
        const [profile, onboarding] = await Promise.all([
          sql`select * from public.get_my_profile()`,
          sql`select * from public.get_my_onboarding()`,
        ]);
        return json({ ok: true, profile: profile[0] ?? null, onboarding: onboarding[0] ?? null, note: "Org settings/team management require org-scoped reads/writes via existing 0001 RPCs/Data API." });
      } catch (error) {
        return errorResponse(501, "Failed to read settings/profile via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC calls (get_my_profile/get_my_onboarding)." });
      }
    }

    const body = await readJsonBody<any>(context.request);
    if (!body) return errorResponse(400, "Invalid JSON body.");
    const displayName = typeof body.displayName === "string" ? body.displayName : null;
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null;
    const locale = typeof body.locale === "string" ? body.locale : null;
    const timeZone = typeof body.timeZone === "string" ? body.timeZone : null;
    try {
      const rows = await sql`select * from public.upsert_my_profile(${displayName}, ${imageUrl}, ${locale}, ${timeZone})`;
      return json({ ok: true, profile: rows[0] ?? null, note: "For onboarding/preferences and org settings use respective RPC/Data API operations." });
    } catch (error) {
      return errorResponse(501, "Failed to update profile via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call (upsert_my_profile)." });
    }
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
