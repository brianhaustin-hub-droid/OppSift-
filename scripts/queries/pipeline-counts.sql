SELECT 'runs' AS t, count(*)::int AS n FROM public.ingestion_runs
UNION ALL SELECT 'jobs', count(*)::int FROM public.ingestion_jobs
UNION ALL SELECT 'raw', count(*)::int FROM public.raw_source_records
UNION ALL SELECT 'opportunities', count(*)::int FROM public.opportunities
UNION ALL SELECT 'errors', count(*)::int FROM public.ingestion_errors
