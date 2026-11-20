import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * Saved searches API.
 * Tenant-scoped operations require authenticated org-member DB/session context
 * (RLS + RPCs from migrations 0034/0037/0038). Direct DB execution here is a
 * best-effort integration path; prefer authenticated Data API/RPC calls.
 */

export async function onRequest(context: PagesContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (!["GET", "POST", "DELETE"].includes(method)) return methodNotAllowed(["GET", "POST", "DELETE"]);
  const sql = createSql(context.env);
  if (!sql) return errorResponse(503, "Database is not configured for this environment.");

  try {
    const url = new URL(context.request.url);
    if (method === "GET") {
      const orgId = url.searchParams.get("organizationId");
      if (!orgId) return errorResponse(400, "organizationId query parameter is required.");
      try {
        // Best-effort: RPC requires auth context in RLS-aware setups.
        const rows = await sql`select * from public.list_saved_searches(${orgId}::uuid)`;
        return json({ ok: true, organizationId: orgId, items: rows });
      } catch (error) {
        return errorResponse(501, "Failed to list saved searches via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
      }
    }

    const body = await readJsonBody<any>(context.request);
    if (!body) return errorResponse(400, "Invalid JSON body.");
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : null;
    if (!organizationId) return errorResponse(400, "organizationId is required.");

    if (method === "POST") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const filters = body.filters && typeof body.filters === "object" ? body.filters : {};
      const description = typeof body.description === "string" ? body.description : null;
      const isShared = !!body.isShared;
      if (!name) return errorResponse(400, "name is required.");
      try {
        const rows = await sql`select * from public.create_saved_search(${organizationId}::uuid, ${name}, ${sql.json(filters)}::jsonb, ${description}, ${isShared})`;
        return json({ ok: true, item: rows[0] ?? null }, 201);
      } catch (error) {
        return errorResponse(501, "Failed to create saved search via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
      }
    }

    const savedSearchId = typeof body.savedSearchId === "string" ? body.savedSearchId : null;
    if (!savedSearchId) return errorResponse(400, "savedSearchId is required for DELETE.");
    try {
      const rows = await sql`select public.delete_saved_search(${organizationId}::uuid, ${savedSearchId}::uuid) as deleted`;
      return json({ ok: true, deleted: !!rows[0]?.deleted });
    } catch (error) {
      return errorResponse(501, "Failed to delete saved search via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
    }
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
