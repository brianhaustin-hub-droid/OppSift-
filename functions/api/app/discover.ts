import { buildOpportunitySearchQuery } from "../../../backend/neon/search/query-builder";
import { searchRequestSchema } from "../../../backend/neon/search/contracts";
import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, readJsonBody, type PagesContext } from "../_lib/http";

/**
 * Discover/search API (DB-backed, evidence-based).
 * - Validates request using backend/neon/search/contracts.
 * - Attempts parameterized query via search/query-builder when schema supports it.
 * - Falls back to a schema-compatible query over public.opportunities + source records.
 * Returns only stored DB records; no operational/coverage claims beyond evidence.
 */

function fallbackQuery(params: {
  q?: string;
  country?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  const values: unknown[] = [];
  const where: string[] = [];
  const add = (v: unknown) => { values.push(v); return `$${values.length}`; };
  if (params.q && params.q.trim()) {
    const q = add(`%${params.q.trim()}%`);
    where.push(`(o.title ILIKE ${q} OR coalesce(o.description,'') ILIKE ${q} OR coalesce(o.reference_number,'') ILIKE ${q} OR coalesce(o.buyer_name,'') ILIKE ${q} OR coalesce(o.procuring_organization,'') ILIKE ${q})`);
  }
  if (params.country) where.push(`o.country_code = ${add(params.country)}`);
  if (params.status) where.push(`o.status = ${add(params.status)}`);
  const limit = add(params.limit);
  const offset = add(params.offset);
  const text = `
    SELECT
      o.id, o.title, o.description, o.country_code, o.status, o.category_code,
      o.opportunity_type_code, o.reference_number, o.buyer_name, o.procuring_organization,
      o.issuing_institution, o.publisher, o.published_at, o.closing_at, o.canonical_url,
      o.currency, o.amount, o.value_status, o.canonical_key, o.updated_at,
      min(r.source_url) AS source_url,
      array_agg(DISTINCT s.connector_identifier) FILTER (WHERE s.connector_identifier IS NOT NULL) AS source_connectors,
      COUNT(*) OVER() AS total_count
    FROM public.opportunities o
    LEFT JOIN public.opportunity_source_records r ON r.opportunity_id = o.id
    LEFT JOIN public.opportunity_sources s ON s.id = r.source_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY o.id
    ORDER BY coalesce(o.published_at, o.updated_at) DESC NULLS LAST, o.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return { text, values };
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const method = context.request.method.toUpperCase();
  if (method !== "POST" && method !== "GET") return methodNotAllowed(["GET", "POST"]);

  let raw: any = {};
  if (method === "POST") {
    raw = (await readJsonBody<unknown>(context.request)) ?? {};
  } else {
    const url = new URL(context.request.url);
    raw = {
      q: url.searchParams.get("q") || undefined,
      query: url.searchParams.get("query") || undefined,
      country: url.searchParams.get("country") || undefined,
      countries: url.searchParams.get("country") ? [url.searchParams.get("country")] : undefined,
      status: url.searchParams.get("status") || undefined,
      statuses: url.searchParams.get("status") ? [url.searchParams.get("status")] : undefined,
      page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined,
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
    };
  }

  const parsed = searchRequestSchema.safeParse(raw);
  const sql = createSql(context.env);
  if (!sql) {
    return json({ ok: true, implemented: "scaffold", validated: parsed.success, note: "Database not configured.", request: parsed.success ? parsed.data : raw }, 200);
  }

  try {
    if (parsed.success) {
      try {
        const query = buildOpportunitySearchQuery(parsed.data);
        const rows = await sql.unsafe(query.text, query.values as any[]);
        return json({ ok: true, mode: "query-builder", evidenceBacked: true, request: parsed.data, results: rows, count: rows.length });
      } catch {
        // fall through to schema-compatible fallback
      }
    }

    const q = (raw.q ?? raw.query ?? (parsed.success ? (parsed.data as any).q : undefined) ?? "") as string;
    const country = (raw.country ?? (parsed.success && (parsed.data as any).countries?.[0]) ?? undefined) as string | undefined;
    const status = (raw.status ?? (parsed.success && (parsed.data as any).statuses?.[0]) ?? undefined) as string | undefined;
    const limit = Math.min(Math.max(Number(raw.limit ?? (parsed.success ? (parsed.data as any).limit : 20)) || 20, 1), 100);
    const page = Math.max(Number(raw.page ?? (parsed.success ? (parsed.data as any).page : 1)) || 1, 1);
    const offset = (page - 1) * limit;
    const fq = fallbackQuery({ q, country, status, limit, offset });
    const rows = await sql.unsafe(fq.text, fq.values as any[]);
    return json({ ok: true, mode: "fallback", evidenceBacked: true, request: { q: q || null, country: country || null, status: status || null, page, limit }, results: rows, count: rows.length, total: rows[0]?.total_count ?? 0 });
  } catch (error) {
    return errorResponse(500, "Search execution failed.", { message: error instanceof Error ? error.message : "Unknown error" });
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
