import { SOURCES_COVERAGE_SQL, summarizeCoverage, type SourceCoverageRow } from "../../../backend/neon/app/coverage";
import { createSql } from "../_lib/db";
import { errorResponse, json, methodNotAllowed, type PagesContext } from "../_lib/http";

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== "GET") return methodNotAllowed(["GET"]);

  const sql = createSql(context.env);
  if (!sql) {
    return errorResponse(503, "Database is not configured for this environment.");
  }

  try {
    const rows = await sql.unsafe<SourceCoverageRow[]>(SOURCES_COVERAGE_SQL);
    const normalized = rows.map((r) => ({
      ...r,
      recordsCount: Number((r as any).recordsCount ?? 0),
    }));
    const summary = summarizeCoverage(normalized as SourceCoverageRow[]);
    return json({
      ok: true,
      evidenceBased: true,
      note: "Coverage reflects DB evidence (records/runs/health/errors); sources without stored records or verification must not be treated as operational.",
      summary,
      sources: normalized,
    });
  } catch (error) {
    return errorResponse(500, "Failed to load sources coverage.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    try { await sql.end({ timeout: 1 }); } catch { /* ignore */ }
  }
}
