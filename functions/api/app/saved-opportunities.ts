import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * Saved opportunities API (organization_saved_opportunities, 0002; RPCs 0039).
 * Best-effort RPC calls; requires authenticated org-member context.
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
        const rows = await sql`select * from public.list_saved_opportunities(${orgId}::uuid)`;
        return json({ ok: true, organizationId: orgId, items: rows });
      } catch (error) {
        return errorResponse(501, "Failed to list saved opportunities via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
      }
    }

    const body = await readJsonBody<any>(context.request);
    if (!body) return errorResponse(400, "Invalid JSON body.");
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : null;
    const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId : null;
    if (!organizationId || !opportunityId) return errorResponse(400, "organizationId and opportunityId are required.");

    if (method === "POST") {
      const privateNote = typeof body.privateNote === "string" ? body.privateNote : null;
      try {
        const rows = await sql`select * from public.upsert_saved_opportunity(${organizationId}::uuid, ${opportunityId}::uuid, ${privateNote})`;
        return json({ ok: true, item: rows[0] ?? null });
      } catch (error) {
        return errorResponse(501, "Failed to save opportunity via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
      }
    }
    try {
      const rows = await sql`select public.delete_saved_opportunity(${organizationId}::uuid, ${opportunityId}::uuid) as deleted`;
      return json({ ok: true, deleted: !!rows[0]?.deleted });
    } catch (error) {
      return errorResponse(501, "Failed to remove saved opportunity via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
    }
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
