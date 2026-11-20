import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * Product analytics/event ingestion scaffold.
 * Requires authenticated context and migration 0036 for persistence.
 */

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method.toUpperCase() !== "POST") return methodNotAllowed(["POST"]);
  const body = await readJsonBody<any>(context.request);
  if (!body) return errorResponse(400, "Invalid JSON body.");
  const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
  if (!eventName) return errorResponse(400, "eventName is required.");

  const sql = createSql(context.env);
  if (!sql) return errorResponse(503, "Database is not configured for this environment.");
  try {
    // Minimal best-effort insert shape; real implementation must enforce auth/org scoping.
    const orgId = typeof body.organizationId === "string" ? body.organizationId : null;
    const userId = typeof body.userId === "string" ? body.userId : null;
    const properties = body.properties && typeof body.properties === "object" ? body.properties : {};
    await sql`
      INSERT INTO public.product_events (organization_id, user_id, event_name, event_category, subject_type, subject_id, properties)
      VALUES (${orgId}::uuid, ${userId}::uuid, ${eventName}, ${typeof body.eventCategory === "string" ? body.eventCategory : null}, ${typeof body.subjectType === "string" ? body.subjectType : null}, ${typeof body.subjectId === "string" ? body.subjectId : null}, ${sql.json(properties)})
    `;
    return json({ ok: true, accepted: true }, 202);
  } catch (error) {
    return errorResponse(500, "Failed to record product event.", {
      message: error instanceof Error ? error.message : "Unknown error",
      hint: "Ensure migration 0036 is applied and caller has permitted auth/org context.",
    });
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
