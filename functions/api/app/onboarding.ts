import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * Onboarding API (best-effort RPC calls).
 * Requires authenticated user session context for RLS/RPC checks (0033/0037).
 */

function parseOnboarding(body: any) {
  const allowedStatus = new Set(["not_started", "in_progress", "completed", "skipped"]);
  const status = typeof body?.status === "string" && allowedStatus.has(body.status) ? body.status : undefined;
  const asStringArray = (v: any) => Array.isArray(v) ? v.filter((x: any) => typeof x === "string") : null;
  return {
    persona: typeof body?.persona === "string" ? body.persona : null,
    organizationIntent: typeof body?.organizationIntent === "string" ? body.organizationIntent : null,
    countriesOfInterest: asStringArray(body?.countriesOfInterest),
    categoriesOfInterest: asStringArray(body?.categoriesOfInterest),
    keywords: asStringArray(body?.keywords),
    preferredLanguages: asStringArray(body?.preferredLanguages),
    alertPreferences: body?.alertPreferences && typeof body.alertPreferences === "object" ? body.alertPreferences : null,
    completedSteps: asStringArray(body?.completedSteps),
    status,
  };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") return methodNotAllowed(["GET", "POST"]);
  const sql = createSql(context.env);
  if (!sql) return errorResponse(503, "Database is not configured for this environment.");

  try {
    if (method === "GET") {
      try {
        const rows = await sql`select * from public.get_my_onboarding()`;
        return json({ ok: true, item: rows[0] ?? null });
      } catch (error) {
        return errorResponse(501, "Failed to read onboarding via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call (get_my_onboarding)." });
      }
    }

    const body = await readJsonBody<any>(context.request);
    if (!body) return errorResponse(400, "Invalid JSON body.");
    const p = parseOnboarding(body);
    try {
      const rows = await sql`select * from public.upsert_my_onboarding(${p.persona}, ${p.organizationIntent}, ${p.countriesOfInterest}::text[], ${p.categoriesOfInterest}::text[], ${p.keywords}::text[], ${p.preferredLanguages}::text[], ${p.alertPreferences ? sql.json(p.alertPreferences) : null}::jsonb, ${p.completedSteps}::text[], ${p.status})`;
      return json({ ok: true, item: rows[0] ?? null });
    } catch (error) {
      return errorResponse(501, "Failed to upsert onboarding via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call (upsert_my_onboarding)." });
    }
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
