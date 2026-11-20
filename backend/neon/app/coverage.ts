/**
 * Sources & coverage read-model helpers (backend-side, evidence-backed).
 * Intended for server/functions/worker use; does not claim "working/active"
 * without underlying DB evidence (records, runs, integration/health status).
 */

export type SourceCoverageRow = {
  connectorIdentifier: string | null;
  sourceName: string;
  countryCode: string | null;
  integrationStatus: string;
  sourceHealth: string;
  recordsCount: number;
  lastSuccessfulRetrieval: string | null;
  lastError: string | null;
};

export type CoverageSummary = {
  totalSources: number;
  sourcesWithRecords: number;
  operationalSources: number;
  totalRecords: number;
  byCountry: Record<string, { sources: number; sourcesWithRecords: number; records: number }>;
};

export function summarizeCoverage(rows: SourceCoverageRow[]): CoverageSummary {
  const byCountry: CoverageSummary["byCountry"] = {};
  let sourcesWithRecords = 0;
  let operationalSources = 0;
  let totalRecords = 0;

  for (const row of rows) {
    const records = Number(row.recordsCount || 0);
    totalRecords += records;
    if (records > 0) sourcesWithRecords += 1;
    if (row.integrationStatus === "operational") operationalSources += 1;

    const country = row.countryCode ?? "UNASSIGNED";
    if (!byCountry[country]) byCountry[country] = { sources: 0, sourcesWithRecords: 0, records: 0 };
    byCountry[country].sources += 1;
    byCountry[country].records += records;
    if (records > 0) byCountry[country].sourcesWithRecords += 1;
  }

  return {
    totalSources: rows.length,
    sourcesWithRecords,
    operationalSources,
    totalRecords,
    byCountry,
  };
}

export const SOURCES_COVERAGE_SQL = `
  SELECT
    s.connector_identifier AS "connectorIdentifier",
    s.name AS "sourceName",
    c.country_code AS "countryCode",
    s.integration_status AS "integrationStatus",
    s.source_health AS "sourceHealth",
    COUNT(r.id)::bigint AS "recordsCount",
    s.last_successful_retrieval AS "lastSuccessfulRetrieval",
    (
      SELECT e.message
      FROM public.ingestion_errors e
      JOIN public.ingestion_runs ir ON ir.id = e.run_id
      WHERE ir.source_id = s.id
      ORDER BY e.recorded_at DESC
      LIMIT 1
    ) AS "lastError"
  FROM public.opportunity_sources s
  LEFT JOIN public.source_country_coverage c ON c.source_id = s.id
  LEFT JOIN public.opportunity_source_records r ON r.source_id = s.id
  GROUP BY s.id, s.connector_identifier, s.name, c.country_code, s.integration_status, s.source_health, s.last_successful_retrieval
  ORDER BY c.country_code NULLS LAST, s.connector_identifier;
`;
