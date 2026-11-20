import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * Alert subscriptions/notifications API.
 * Best-effort RPC calls; tenant-scoped operations require authenticated
 * org-member session context (RLS + migrations 0034/0037/0038).
 */

export async function onRequest(context: PagesContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (!["GET", "POST", "PATCH"].includes(method)) return methodNotAllowed(["GET", "POST", "PATCH"]);
  const sql = createSql(context.env);
  if (!sql) return errorResponse(503, "Database is not configured for this environment.");

  try {
    const url = new URL(context.request.url);
    if (method === "GET") {
      const orgId = url.searchParams.get("organizationId");
      const resource = url.searchParams.get("resource") || "subscriptions";
      if (!orgId) return errorResponse(400, "organizationId query parameter is required.");
      try {
        if (resource === "notifications") {
          const limit = Number(url.searchParams.get("limit") || "50");
          const rows = await sql`select * from public.list_alert_notifications(${orgId}::uuid, ${Number.isFinite(limit) ? limit : 50})`;
          return json({ ok: true, organizationId: orgId, resource, items: rows });
        }
        const rows = await sql`select * from public.list_alert_subscriptions(${orgId}::uuid)`;
        return json({ ok: true, organizationId: orgId, resource: "subscriptions", items: rows });
      } catch (error) {
        return errorResponse(501, "Failed to list alerts via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
      }
    }

    const body = await readJsonBody<any>(context.request);
    if (!body) return errorResponse(400, "Invalid JSON body.");
    const organizationId = typeof body.organizationId === "string" ? body.organizationId : null;
    if (!organizationId) return errorResponse(400, "organizationId is required.");

    if (method === "POST") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) return errorResponse(400, "name is required.");
      const savedSearchId = typeof body.savedSearchId === "string" ? body.savedSearchId : null;
      const opportunityId = typeof body.opportunityId === "string" ? body.opportunityId : null;
      const channel = typeof body.channel === "string" ? body.channel : "email";
      const frequency = typeof body.frequency === "string" ? body.frequency : "daily";
      const criteria = body.criteria && typeof body.criteria === "object" ? body.criteria : {};
      try {
        const rows = await sql`select * from public.create_alert_subscription(${organizationId}::uuid, ${name}, ${savedSearchId}::uuid, ${opportunityId}::uuid, ${channel}, ${frequency}, ${sql.json(criteria)}::jsonb)`;
        return json({ ok: true, item: rows[0] ?? null }, 201);
      } catch (error) {
        return errorResponse(501, "Failed to create alert subscription via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
      }
    }

    const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : null;
    const status = typeof body.status === "string" ? body.status : null;
    if (!subscriptionId || !status) return errorResponse(400, "subscriptionId and status are required for PATCH.");
    try {
      const rows = await sql`select * from public.update_alert_subscription_status(${organizationId}::uuid, ${subscriptionId}::uuid, ${status})`;
      return json({ ok: true, item: rows[0] ?? null });
    } catch (error) {
      return errorResponse(501, "Failed to update alert subscription via RPC.", { message: error instanceof Error ? error.message : "Unknown error", hint: "Use authenticated Data API/RPC call with org-member session." });
    }
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
