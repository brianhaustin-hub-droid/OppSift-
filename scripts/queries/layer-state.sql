SELECT
  (SELECT count(*) FROM opportunities)::int AS opportunity_rows,
  (SELECT count(*) FROM opportunity_sources)::int AS source_rows,
  (SELECT count(*) FROM opportunity_sources WHERE activation_status = 'active')::int AS active_sources,
  (SELECT count(*) FROM opportunity_sources WHERE approval_status = 'approved')::int AS approved_sources,
  (SELECT count(*) FROM opportunity_source_records)::int AS source_record_rows,
  (SELECT count(*) FROM source_country_coverage)::int AS coverage_rows,
  (SELECT count(*) FROM ingestion_runs)::int AS ingestion_runs;
