import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, type PagesContext } from "../_lib/http";

/**
 * GET /api/shared-notice/:id
 *
 * The only public path to a notice record. It returns one verified notice when
 * an authenticated owner has created an active row in opportunity_share_links
 * for it (migration 0057), and 404 otherwise — including for a valid id that
 * was never shared. No listing, no search, no enumeration.
 *
 * The query runs through `get_shared_notice`, a narrow SECURITY DEFINER function
 * owned by the database owner, so the anonymous role itself keeps no read access
 * to the table. It uses Neon's HTTP driver rather than a TCP `postgres`
 * connection because Cloudflare Workers do not provide raw sockets.
 */

type SharedNoticeRow = {
  id: string;
  title: string | null;
  description: string | null;
  category_code: string | null;
  opportunity_type_code: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  buyer_name: string | null;
  reference_number: string | null;
  published_at: string | null;
  closing_at: string | null;
  time_zone: string | null;
  status: string | null;
  currency_code: string | null;
  published_amount: string | number | null;
  source_name: string | null;
  source_url: string | null;
  last_verified_at: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const id = url.pathname.split("/").filter(Boolean).pop() ?? "";

  if (!UUID.test(id)) {
    return errorResponse(404, "No shared notice with that identifier.");
  }

  const databaseUrl = getDatabaseUrl(context.env);
  if (!databaseUrl) {
    return errorResponse(503, "Share links are not configured in this deployment.");
  }

  try {
    const sql = neon(databaseUrl);
    const rows = (await sql`select * from public.get_shared_notice(${id}::uuid)`) as SharedNoticeRow[];
    if (rows.length === 0) {
      return errorResponse(404, "This notice is not publicly shared.");
    }
    return json({ ok: true, notice: rows[0] }, 200, {
      // A withdrawn share must stop serving quickly, so this is deliberately short.
      "cache-control": "public, max-age=30, s-maxage=30",
    });
  } catch (error) {
    // Server-side diagnostics only; the client never sees database detail.
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      "[shared-notice] query failed:",
      message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted connection string]"),
    );
    return errorResponse(500, "The shared notice could not be read.");
  }
}

export async function onRequest(): Promise<Response> {
  return methodNotAllowed(["GET"]);
}
