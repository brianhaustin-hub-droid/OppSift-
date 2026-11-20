import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * Opportunity applications/pipeline API.
 * Best-effort RPC calls; requires authenticated org-member context (0035/0037).
 */

export async function onRequest(context: PagesContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
  const sql = createSql(context.env);
  if (!sql) return errorResponse(503, "Database is not configured for this environment.");

  try {
    if (method === "GET") {
      const orgId = new URL(context.request.url).searchParams.get("organizationId");
      if (!orgId) return errorResponse(400, "organizationId query parameter is required.");
      try {
        const rows = await sql`select * from public.list_opportunity_applications(${orgId}::uuid)`;
        return json({ ok: true, organizationId: orgId, items: rows });
      } catch (error) {
        return errorResponse(501, "Failed to list applications via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
      }
    }
    const body = await readJsonBody<any>(context.request);
    if (!body) return errorResponse(400, "Invalid JSON body.");
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : null;
    const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId : null;
    if (!organizationId || !opportunityId) return errorResponse(400, "organizationId and opportunityId are required.");
    const stage = typeof body.stage === "string" ? body.stage : "interested";
    const priority = typeof body.priority === "string" ? body.priority : "medium";
    const ownerUserId = typeof body.ownerUserId === "string" ? body.ownerUserId : null;
    const notes = typeof body.notes === "string" ? body.notes : null;
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : null;
    try {
      const rows = await sql`select * from public.upsert_opportunity_application(${organizationId}::uuid, ${opportunityId}::uuid, ${stage}, ${priority}, ${ownerUserId}::uuid, ${notes}, ${metadata ? sql.json(metadata) : null}::jsonb)`;
      return json({ ok: true, item: rows[0] ?? null }, 200);
    } catch (error) {
      return errorResponse(501, "Failed to upsert application via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
    }
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
