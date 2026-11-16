-- Depends on migrations 0001-0029.

-- P0 Stage 0 hygiene (2026-11-15): Zombie run reaper.
-- ingestion_runs rows stuck in 'running' forever pollute the run funnel that
-- /admin/ingestion and the Stage 0 field-completeness gate depend on. Zombies
-- happen when a worker execution crashes (lease expiry, network failure,
-- isolate eviction) between beginRun and finishRun, because the scheduled
-- orchestration path historically had no catch/error logging.
--
-- Two zombie classes:
--   1. The job the run belongs to has already completed (succeeded/failed/
--      dead_lettered) but the run was never finalized.
--   2. No conclusive job state, but the run has been 'running' far longer than
--      the 4-minute maximumExecutionMs plus lease/renewal headroom.
--
-- This migration is a one-time cleanup. Recurrence is prevented upstream:
-- the worker now logs every tick (catch + scheduler result counters) and the
-- dispatcher already lease-expires jobs, so a repeated flood here is a signal
-- of a new execution-crash class, not an expected steady state.

-- 1) One-time reaper: finalize zombies as 'failed'.
UPDATE public.ingestion_runs AS run
SET
  status = 'failed',
  finished_at = GREATEST(
    COALESCE(run.finished_at, job.completed_at),
    run.started_at
  ),
  failed_count = 1,
  rejected_count = GREATEST(run.rejected_count, 1)
FROM public.ingestion_jobs AS job
WHERE run.status = 'running'
  AND (
    -- Class 1: owning job already reached a terminal state.
    (
      run.job_id IS NOT NULL
      AND job.id = run.job_id
      AND job.status IN ('succeeded', 'failed', 'dead_lettered')
      AND job.completed_at IS NOT NULL
    )
    -- Class 2: no job linkage, or job still nominally open, but the run is
    -- far beyond the 4-minute execution window plus lease headroom.
    OR (
      (run.job_id IS NULL OR job.id IS NULL)
      AND run.started_at < now() - interval '30 minutes'
    )
  );

-- 2) Guardrail so the same cleanup is runnable from the orchestrator or an
--    admin job without re-applying a migration: expose it as a function.
CREATE OR REPLACE FUNCTION public.reap_zombie_ingestion_runs(
  maximum_running_age interval DEFAULT interval '30 minutes'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reaped integer;
BEGIN
  UPDATE public.ingestion_runs AS run
  SET
    status = 'failed',
    finished_at = GREATEST(COALESCE(run.finished_at, job.completed_at), run.started_at),
    failed_count = 1,
    rejected_count = GREATEST(run.rejected_count, 1)
  FROM public.ingestion_jobs AS job
  WHERE run.status = 'running'
    AND (
      (
        run.job_id IS NOT NULL
        AND job.id = run.job_id
        AND job.status IN ('succeeded', 'failed', 'dead_lettered')
        AND job.completed_at IS NOT NULL
      )
      OR (
        (run.job_id IS NULL OR job.id IS NULL)
        AND run.started_at < now() - maximum_running_age
      )
    );
  GET DIAGNOSTICS reaped = ROW_COUNT;
  RETURN reaped;
END;
$$;

REVOKE ALL ON FUNCTION public.reap_zombie_ingestion_runs(interval) FROM PUBLIC;

-- 3) Diagnostic view: one query that answers "is ingestion healthy?" —
--    the funnel the Stage 0 gate and /admin/ingestion read from.
CREATE OR REPLACE VIEW public.ingestion_funnel AS
SELECT
  source.id,
  source.name AS source_name,
  source.connector_identifier,
  source.activation_status,
  source.integration_status,
  source.source_health,
  source.last_successful_retrieval,
  source.last_unsuccessful_retrieval,
  runs.last_run_started_at,
  runs.last_run_status,
  runs.runs_last_24h,
  runs.discovered_last_24h,
  runs.created_last_24h,
  runs.updated_last_24h,
  runs.review_last_24h,
  runs.rejected_last_24h,
  runs.duplicate_last_24h,
  runs.running_zombies
FROM public.opportunity_sources AS source
LEFT JOIN LATERAL (
  SELECT
    max(r.started_at) AS last_run_started_at,
    (SELECT r2.status FROM public.ingestion_runs r2
      WHERE r2.source_id = source.id ORDER BY r2.started_at DESC NULLS LAST LIMIT 1)
      AS last_run_status,
    count(*) FILTER (
      WHERE r.started_at > now() - interval '24 hours') AS runs_last_24h,
    COALESCE(sum(r.discovered_count) FILTER (
      WHERE r.started_at > now() - interval '24 hours'), 0) AS discovered_last_24h,
    COALESCE(sum(r.created_count) FILTER (
      WHERE r.started_at > now() - interval '24 hours'), 0) AS created_last_24h,
    COALESCE(sum(r.updated_count) FILTER (
      WHERE r.started_at > now() - interval '24 hours'), 0) AS updated_last_24h,
    COALESCE(sum(r.review_count) FILTER (
      WHERE r.started_at > now() - interval '24 hours'), 0) AS review_last_24h,
    COALESCE(sum(r.rejected_count) FILTER (
      WHERE r.started_at > now() - interval '24 hours'), 0) AS rejected_last_24h,
    COALESCE(sum(r.duplicate_count) FILTER (
      WHERE r.started_at > now() - interval '24 hours'), 0) AS duplicate_last_24h,
    count(*) FILTER (WHERE r.status = 'running') AS running_zombies
  FROM public.ingestion_runs r
  WHERE r.source_id = source.id
) AS runs ON true;

GRANT SELECT ON public.ingestion_funnel TO PUBLIC;

-- Migration complete. Ledger updated by apply-pending-migrations runner.
