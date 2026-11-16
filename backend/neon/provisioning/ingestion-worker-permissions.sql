-- Apply only after migrations 0001-0003 on a reviewed non-production branch.
-- This creates a NOLOGIN privilege role; provision a separate LOGIN role and
-- its password through Neon/admin tooling, never in this file.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'oppsift_ingestion_worker'
  ) THEN
    EXECUTE 'CREATE ROLE oppsift_ingestion_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS';
  ELSIF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'oppsift_ingestion_worker'
      AND (rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
  ) THEN
    RAISE EXCEPTION
      'Existing oppsift_ingestion_worker role has privileges incompatible with the restricted worker role.';
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO oppsift_ingestion_worker;

GRANT SELECT ON
  public.currencies,
  public.languages,
  public.global_countries,
  public.country_currencies,
  public.country_languages,
  public.opportunity_categories,
  public.opportunity_types,
  public.opportunity_sources,
  public.source_country_coverage,
  public.country_classification_mappings
TO oppsift_ingestion_worker;

-- The scheduler may move only this one column; it cannot edit approvals or
-- other source metadata.
GRANT UPDATE (next_scheduled_collection_at)
  ON public.opportunity_sources TO oppsift_ingestion_worker;

GRANT SELECT, INSERT, UPDATE ON
  public.opportunities,
  public.opportunity_source_records,
  public.opportunity_duplicate_candidates,
  public.ingestion_runs,
  public.ingestion_errors,
  public.ingestion_review_queue,
  public.opportunity_quality_issues,
  public.source_cursors,
  public.ingestion_jobs,
  public.raw_source_records
TO oppsift_ingestion_worker;

GRANT SELECT, INSERT ON public.opportunity_versions TO oppsift_ingestion_worker;

GRANT USAGE, SELECT ON SEQUENCE
  public.ingestion_errors_id_seq,
  public.ingestion_review_queue_id_seq,
  public.opportunity_quality_issues_id_seq,
  public.opportunity_versions_id_seq
TO oppsift_ingestion_worker;

DROP POLICY IF EXISTS ingestion_worker_source_registry_read
  ON public.opportunity_sources;
CREATE POLICY ingestion_worker_source_registry_read
  ON public.opportunity_sources
  FOR SELECT TO oppsift_ingestion_worker USING (true);

DROP POLICY IF EXISTS ingestion_worker_source_schedule_update
  ON public.opportunity_sources;
CREATE POLICY ingestion_worker_source_schedule_update
  ON public.opportunity_sources
  FOR UPDATE TO oppsift_ingestion_worker
  USING (
    activation_status = 'active'
    AND integration_status = 'operational'
    AND approval_status IN ('approved', 'approved_with_constraints')
    AND reliability_status IN ('verified', 'reliable')
    AND connector_identifier IS NOT NULL
    AND access_method IN ('api', 'feed', 'permitted_web')
    AND (approval_expires_at IS NULL OR approval_expires_at > now())
  )
  WITH CHECK (
    activation_status = 'active'
    AND integration_status = 'operational'
    AND approval_status IN ('approved', 'approved_with_constraints')
    AND reliability_status IN ('verified', 'reliable')
    AND connector_identifier IS NOT NULL
    AND access_method IN ('api', 'feed', 'permitted_web')
    AND (approval_expires_at IS NULL OR approval_expires_at > now())
    AND next_scheduled_collection_at > now()
  );

DROP POLICY IF EXISTS ingestion_worker_source_coverage_read
  ON public.source_country_coverage;
CREATE POLICY ingestion_worker_source_coverage_read
  ON public.source_country_coverage
  FOR SELECT TO oppsift_ingestion_worker USING (true);

DROP POLICY IF EXISTS ingestion_worker_classification_read
  ON public.country_classification_mappings;
CREATE POLICY ingestion_worker_classification_read
  ON public.country_classification_mappings
  FOR SELECT TO oppsift_ingestion_worker USING (true);

DROP POLICY IF EXISTS ingestion_worker_opportunities_write
  ON public.opportunities;
CREATE POLICY ingestion_worker_opportunities_write
  ON public.opportunities
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_source_records_write
  ON public.opportunity_source_records;
CREATE POLICY ingestion_worker_source_records_write
  ON public.opportunity_source_records
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_versions_write
  ON public.opportunity_versions;
CREATE POLICY ingestion_worker_versions_write
  ON public.opportunity_versions
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_duplicate_candidates_write
  ON public.opportunity_duplicate_candidates;
CREATE POLICY ingestion_worker_duplicate_candidates_write
  ON public.opportunity_duplicate_candidates
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_runs_write
  ON public.ingestion_runs;
CREATE POLICY ingestion_worker_runs_write
  ON public.ingestion_runs
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_errors_write
  ON public.ingestion_errors;
CREATE POLICY ingestion_worker_errors_write
  ON public.ingestion_errors
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_review_queue_write
  ON public.ingestion_review_queue;
CREATE POLICY ingestion_worker_review_queue_write
  ON public.ingestion_review_queue
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_quality_issues_write
  ON public.opportunity_quality_issues;
CREATE POLICY ingestion_worker_quality_issues_write
  ON public.opportunity_quality_issues
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_source_cursors_write
  ON public.source_cursors;
CREATE POLICY ingestion_worker_source_cursors_write
  ON public.source_cursors
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_jobs_write
  ON public.ingestion_jobs;
CREATE POLICY ingestion_worker_jobs_write
  ON public.ingestion_jobs
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS ingestion_worker_raw_records_write
  ON public.raw_source_records;
CREATE POLICY ingestion_worker_raw_records_write
  ON public.raw_source_records
  FOR ALL TO oppsift_ingestion_worker USING (true) WITH CHECK (true);
