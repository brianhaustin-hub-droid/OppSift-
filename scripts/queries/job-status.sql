SELECT s.name, j.status, j.job_type, j.priority, j.attempt_count,
       j.maximum_retries, j.next_execution_at, j.locked_by, j.locked_until,
       j.started_at, j.completed_at, j.created_at, j.updated_at,
       left(coalesce(j.last_error, ''), 500) AS last_error
FROM public.ingestion_jobs j
JOIN public.opportunity_sources s ON s.id = j.source_id
ORDER BY j.created_at
