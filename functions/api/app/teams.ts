import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, type PagesContext } from "../_lib/http";

/**
 * Teams/organization membership API scaffold.
 * Core org/membership/invitation tables and RPCs exist (0001); this endpoint
 * is an integration point for UI. Member listing/management must run in an
 * authenticated org-manager context (e.g. list_organization_members RPC).
 */

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method.toUpperCase() !== "GET") return methodNotAllowed(["GET"]);
  const sql = createSql(context.env);
  if (!sql) return errorResponse(503, "Database is not configured for this environment.");
  try {
    const orgId = new URL(context.request.url).searchParams.get("organizationId");
    if (!orgId) return errorResponse(400, "organizationId query parameter is required.");
    return json({
      ok: false,
      implemented: "scaffold",
      organizationId: orgId,
      message: "Connect authenticated RPC/Data API calls for members/invitations/roles (e.g. list_organization_members, issue/accept/revoke invitation, role changes) from migration 0001.",
    }, 501);
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
