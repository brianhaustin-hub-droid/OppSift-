import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

function parseSupport(body: any) {
  const email = typeof body?.contactEmail === "string" ? body.contactEmail.trim() : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const category = typeof body?.category === "string" ? body.category : "general";
  const organizationId = typeof body?.organizationId === "string" ? body.organizationId : null;
  const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "Valid contactEmail is required." };
  if (subject.length < 3) return { ok: false as const, error: "subject must be at least 3 characters." };
  if (!message) return { ok: false as const, error: "message is required." };
  return { ok: true as const, value: { email, subject, message, category, organizationId, metadata } };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== "POST") return methodNotAllowed(["POST"]);

  const body = await readJsonBody<any>(context.request);
  if (!body) return errorResponse(400, "Invalid JSON body.");
  const parsed = parseSupport(body);
  if (!parsed.ok) return errorResponse(400, parsed.error);

  const sql = createSql(context.env);
  if (!sql) return errorResponse(503, "Database is not configured for this environment.");

  try {
    // User-scoped insert; auth/RLS enforcement depends on DB session context.
    // When called without authenticated DB session, this may fail under RLS (expected until wired with auth).
    const rows = await sql`
      INSERT INTO public.support_requests (organization_id, contact_email, category, subject, message, metadata)
      VALUES (${parsed.value.organizationId}::uuid, ${parsed.value.email}, ${parsed.value.category}, ${parsed.value.subject}, ${parsed.value.message}, ${sql.json(parsed.value.metadata)})
      RETURNING id, status, created_at
    `;
    return json({ ok: true, request: rows[0] ?? null }, 201);
  } catch (error) {
    return errorResponse(500, "Failed to create support request.", {
      message: error instanceof Error ? error.message : "Unknown error",
      hint: "Ensure migrations 0036+ are applied and request is executed with proper auth/org context where required.",
    });
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
