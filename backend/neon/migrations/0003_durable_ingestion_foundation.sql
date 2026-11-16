-- Depends on 0001_identity_organizations.sql and
-- 0002_global_opportunity_intelligence.sql. Validate on a disposable branch
-- before applying to any shared database.

ALTER TABLE public.opportunity_sources
  ADD COLUMN api_or_feed_url text
    CHECK (api_or_feed_url IS NULL OR api_or_feed_url ~ '^https://'),
  ADD COLUMN connector_identifier text
    CHECK (
      connector_identifier IS NULL
      OR connector_identifier ~ '^[a-z0-9][a-z0-9._-]{0,119}$'
    ),
  ADD COLUMN license_url text
    CHECK (license_url IS NULL OR license_url ~ '^https://'),
  ADD COLUMN terms_url text
    CHECK (terms_url IS NULL OR terms_url ~ '^https://'),
  ADD COLUMN reuse_permission_status text NOT NULL DEFAULT 'unknown'
    CHECK (reuse_permission_status IN (
      'unknown', 'permitted', 'conditional', 'prohibited'
    )),
  ADD COLUMN retention_restrictions text,
  ADD COLUMN rate_limit_requests integer
    CHECK (rate_limit_requests IS NULL OR rate_limit_requests > 0),
  ADD COLUMN rate_limit_window_seconds integer
    CHECK (rate_limit_window_seconds IS NULL OR rate_limit_window_seconds > 0),
  ADD COLUMN next_scheduled_collection_at timestamptz,
  ADD COLUMN coverage_scope text NOT NULL DEFAULT 'country'
    CHECK (coverage_scope IN ('global', 'regional', 'country', 'multi_country')),
  ADD COLUMN coverage_region_codes text[] NOT NULL DEFAULT '{}'
    CHECK (
      coverage_region_codes <@
      ARRAY[
        'africa', 'asia', 'europe', 'north_america', 'south_america',
        'oceania', 'antarctica', 'other'
      ]::text[]
      AND array_position(coverage_region_codes, NULL::text) IS NULL
    ),
  ADD COLUMN approval_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (approval_status IN (
      'unreviewed', 'approved', 'approved_with_constraints', 'denied'
    )),
  ADD COLUMN approval_constraints jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(approval_constraints) = 'array'),
  ADD COLUMN approval_constraints_enforced boolean NOT NULL DEFAULT false,
  ADD COLUMN activation_status text NOT NULL DEFAULT 'inactive'
    CHECK (activation_status IN ('inactive', 'active', 'paused')),
  ADD CONSTRAINT opportunity_sources_rate_limit_pair
    CHECK ((rate_limit_requests IS NULL) = (rate_limit_window_seconds IS NULL)),
  ADD CONSTRAINT opportunity_sources_regional_scope
    CHECK (coverage_scope <> 'regional' OR cardinality(coverage_region_codes) > 0),
  ADD CONSTRAINT opportunity_sources_approved_permissions
    CHECK (
      approval_status <> 'approved'
      OR (
        licensing_status = 'approved'
        AND terms_status = 'verified'
        AND permissions_evidence_url IS NOT NULL
        AND license_url IS NOT NULL
        AND terms_url IS NOT NULL
        AND reuse_permission_status = 'permitted'
        AND reliability_status IN ('verified', 'reliable')
      )
    ),
  ADD CONSTRAINT opportunity_sources_conditional_permissions
    CHECK (
      approval_status <> 'approved_with_constraints'
      OR (
        licensing_status = 'approved'
        AND terms_status = 'verified'
        AND permissions_evidence_url IS NOT NULL
        AND license_url IS NOT NULL
        AND terms_url IS NOT NULL
        AND reuse_permission_status = 'conditional'
        AND jsonb_array_length(approval_constraints) > 0
        AND reliability_status IN ('verified', 'reliable')
      )
    ),
  ADD CONSTRAINT opportunity_sources_activation_requires_approval
    CHECK (
      activation_status <> 'active'
      OR (
        integration_status = 'operational'
        AND connector_identifier IS NOT NULL
        AND approval_status IN ('approved', 'approved_with_constraints')
        AND licensing_status = 'approved'
        AND terms_status = 'verified'
        AND permissions_evidence_url IS NOT NULL
        AND reuse_permission_status IN ('permitted', 'conditional')
        AND (
          (
            approval_status = 'approved'
            AND reuse_permission_status = 'permitted'
          )
          OR (
            approval_status = 'approved_with_constraints'
            AND reuse_permission_status = 'conditional'
            AND approval_constraints_enforced
            AND jsonb_array_length(approval_constraints) > 0
          )
        )
      )
    ),
  ADD CONSTRAINT opportunity_sources_operational_requires_activation
    CHECK (
      integration_status <> 'operational'
      OR activation_status = 'active'
    ),
  ADD CONSTRAINT opportunity_sources_denied_inactive
    CHECK (
      approval_status <> 'denied'
      OR (activation_status <> 'active' AND integration_status <> 'operational')
    );

ALTER TABLE public.opportunity_source_records
  ALTER COLUMN opportunity_id DROP NOT NULL,
  DROP CONSTRAINT opportunity_source_records_opportunity_id_fkey,
  ADD CONSTRAINT opportunity_source_records_opportunity_id_fkey
    FOREIGN KEY (opportunity_id)
    REFERENCES public.opportunities(id)
    ON DELETE SET NULL;

ALTER TABLE public.ingestion_runs
  ADD COLUMN parsed_count integer NOT NULL DEFAULT 0 CHECK (parsed_count >= 0),
  ADD COLUMN accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
  ADD COLUMN failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  ADD COLUMN duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  ADD COLUMN execution_duration_ms bigint
    CHECK (execution_duration_ms IS NULL OR execution_duration_ms >= 0),
  ADD COLUMN collector_identifier text
    CHECK (collector_identifier IS NULL OR char_length(collector_identifier) <= 120),
  ADD COLUMN job_id uuid;

CREATE TABLE public.source_cursors (
  source_id uuid NOT NULL
    REFERENCES public.opportunity_sources(id) ON DELETE RESTRICT,
  cursor_name text NOT NULL DEFAULT 'default'
    CHECK (char_length(btrim(cursor_name)) BETWEEN 1 AND 120),
  cursor_value text,
  pagination_token text,
  last_seen_external_id text
    CHECK (
      last_seen_external_id IS NULL
      OR char_length(last_seen_external_id) <= 500
    ),
  etag text,
  last_modified text,
  state jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(state) = 'object'),
  synchronized_at timestamptz,
  cursor_version bigint NOT NULL DEFAULT 0 CHECK (cursor_version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_id, cursor_name)
);

CREATE TABLE public.ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL
    REFERENCES public.opportunity_sources(id) ON DELETE RESTRICT,
  job_type text NOT NULL CHECK (job_type IN (
    'full_sync', 'incremental_sync', 'backfill', 'health_check'
  )),
  priority smallint NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'succeeded', 'failed', 'dead_lettered'
  )),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  maximum_retries smallint NOT NULL DEFAULT 5
    CHECK (maximum_retries BETWEEN 0 AND 20),
  next_execution_at timestamptz NOT NULL DEFAULT now(),
  locked_by text CHECK (locked_by IS NULL OR char_length(locked_by) <= 200),
  locked_until timestamptz,
  lease_token uuid,
  last_error text CHECK (last_error IS NULL OR char_length(last_error) <= 10000),
  idempotency_key text NOT NULL
    CHECK (char_length(btrim(idempotency_key)) BETWEEN 1 AND 256),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT ingestion_jobs_idempotency
    UNIQUE (source_id, job_type, idempotency_key),
  CONSTRAINT ingestion_jobs_attempt_limit
    CHECK (attempt_count <= maximum_retries + 1),
  CONSTRAINT ingestion_jobs_lease_state
    CHECK (
      (
        status = 'running'
        AND locked_by IS NOT NULL
        AND locked_until IS NOT NULL
        AND lease_token IS NOT NULL
        AND completed_at IS NULL
      )
      OR (
        status <> 'running'
        AND locked_by IS NULL
        AND locked_until IS NULL
        AND lease_token IS NULL
      )
    ),
  CONSTRAINT ingestion_jobs_completion_state
    CHECK (
      (status IN ('pending', 'running') AND completed_at IS NULL)
      OR (
        status IN ('succeeded', 'failed', 'dead_lettered')
        AND completed_at IS NOT NULL
      )
    ),
  CONSTRAINT ingestion_jobs_started_state
    CHECK (status = 'pending' OR started_at IS NOT NULL)
);

ALTER TABLE public.ingestion_jobs
  ADD CONSTRAINT ingestion_jobs_id_source_unique UNIQUE (id, source_id);

ALTER TABLE public.ingestion_runs
  ADD CONSTRAINT ingestion_runs_id_source_unique UNIQUE (id, source_id),
  ADD CONSTRAINT ingestion_runs_job_source_fkey
    FOREIGN KEY (job_id, source_id)
    REFERENCES public.ingestion_jobs(id, source_id)
    ON DELETE RESTRICT;

ALTER TABLE public.opportunity_source_records
  ADD CONSTRAINT opportunity_source_records_id_source_unique
    UNIQUE (id, source_id);

CREATE TABLE public.raw_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL
    REFERENCES public.opportunity_sources(id) ON DELETE RESTRICT,
  external_record_id text NOT NULL
    CHECK (char_length(btrim(external_record_id)) BETWEEN 1 AND 500),
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  content_type text NOT NULL
    CHECK (char_length(btrim(content_type)) BETWEEN 1 AND 200),
  payload_json jsonb,
  payload_text text,
  r2_bucket text CHECK (r2_bucket IS NULL OR char_length(r2_bucket) <= 128),
  r2_object_key text
    CHECK (r2_object_key IS NULL OR char_length(r2_object_key) <= 1024),
  payload_checksum text NOT NULL CHECK (payload_checksum ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  processing_state text NOT NULL DEFAULT 'pending' CHECK (processing_state IN (
    'pending', 'processing', 'accepted', 'rejected', 'duplicate', 'review', 'failed'
  )),
  processing_attempt_count integer NOT NULL DEFAULT 0
    CHECK (processing_attempt_count >= 0),
  next_processing_attempt_at timestamptz,
  collection_run_id uuid,
  source_record_id uuid,
  canonical_opportunity_id uuid
    REFERENCES public.opportunities(id) ON DELETE SET NULL,
  processing_error text
    CHECK (processing_error IS NULL OR char_length(processing_error) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT raw_source_records_payload_location
    CHECK (
      payload_json IS NOT NULL
      OR payload_text IS NOT NULL
      OR r2_object_key IS NOT NULL
    ),
  CONSTRAINT raw_source_records_r2_reference
    CHECK ((r2_bucket IS NULL) = (r2_object_key IS NULL)),
  CONSTRAINT raw_source_records_payload_size
    CHECK (
      (payload_json IS NULL OR pg_column_size(payload_json) <= 2000000)
      AND (payload_text IS NULL OR octet_length(payload_text) <= 2000000)
    ),
  CONSTRAINT raw_source_records_seen_order
    CHECK (last_seen_at >= first_seen_at),
  CONSTRAINT raw_source_records_source_external_checksum
    UNIQUE (source_id, external_record_id, payload_checksum),
  CONSTRAINT raw_source_records_run_source_fkey
    FOREIGN KEY (collection_run_id, source_id)
    REFERENCES public.ingestion_runs(id, source_id)
    ON DELETE RESTRICT,
  CONSTRAINT raw_source_records_source_record_source_fkey
    FOREIGN KEY (source_record_id, source_id)
    REFERENCES public.opportunity_source_records(id, source_id)
    ON DELETE RESTRICT
);

CREATE INDEX ingestion_jobs_pending_schedule
  ON public.ingestion_jobs (priority ASC, next_execution_at ASC, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX ingestion_jobs_expired_lease
  ON public.ingestion_jobs (locked_until ASC)
  WHERE status = 'running';
CREATE INDEX ingestion_jobs_source_history
  ON public.ingestion_jobs (source_id, created_at DESC);
CREATE INDEX ingestion_runs_job_history
  ON public.ingestion_runs (job_id, started_at DESC)
  WHERE job_id IS NOT NULL;
CREATE INDEX ingestion_runs_job_source
  ON public.ingestion_runs (job_id, source_id)
  WHERE job_id IS NOT NULL;
CREATE INDEX raw_source_records_source_external_seen
  ON public.raw_source_records (source_id, external_record_id, last_seen_at DESC);
CREATE INDEX raw_source_records_run
  ON public.raw_source_records (collection_run_id, created_at DESC)
  WHERE collection_run_id IS NOT NULL;
CREATE INDEX raw_source_records_run_source
  ON public.raw_source_records (collection_run_id, source_id)
  WHERE collection_run_id IS NOT NULL;
CREATE INDEX raw_source_records_source_record
  ON public.raw_source_records (source_record_id, source_id)
  WHERE source_record_id IS NOT NULL;
CREATE INDEX raw_source_records_processing
  ON public.raw_source_records (processing_state, created_at ASC);

ALTER TABLE public.source_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_source_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.source_cursors,
  public.ingestion_jobs,
  public.raw_source_records
FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.opportunity_sources,
  public.source_country_coverage,
  public.country_classification_mappings
FROM PUBLIC;
REVOKE ALL ON TABLE
  public.ingestion_runs,
  public.ingestion_errors,
  public.ingestion_review_queue,
  public.opportunity_quality_issues
FROM PUBLIC;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = v_role) THEN
      EXECUTE format(
        'REVOKE ALL ON TABLE public.source_cursors, public.ingestion_jobs, public.raw_source_records FROM %I',
        v_role
      );
      EXECUTE format(
        'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.opportunity_sources, public.source_country_coverage, public.country_classification_mappings FROM %I',
        v_role
      );
      EXECUTE format(
        'REVOKE ALL ON TABLE public.ingestion_runs, public.ingestion_errors, public.ingestion_review_queue, public.opportunity_quality_issues FROM %I',
        v_role
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_ingestion_history_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION '% records are retained; archive or apply an approved retention process instead',
    TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER ingestion_runs_prevent_delete
  BEFORE DELETE ON public.ingestion_runs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ingestion_history_delete();
CREATE TRIGGER ingestion_jobs_prevent_delete
  BEFORE DELETE ON public.ingestion_jobs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ingestion_history_delete();
CREATE TRIGGER raw_source_records_prevent_delete
  BEFORE DELETE ON public.raw_source_records
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ingestion_history_delete();

CREATE TRIGGER source_cursors_touch_updated_at
  BEFORE UPDATE ON public.source_cursors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER ingestion_jobs_touch_updated_at
  BEFORE UPDATE ON public.ingestion_jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER raw_source_records_touch_updated_at
  BEFORE UPDATE ON public.raw_source_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.opportunity_has_verified_source(p_opportunity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.opportunity_source_records AS r
    JOIN public.opportunity_sources AS s ON s.id = r.source_id
    WHERE r.opportunity_id = p_opportunity_id
      AND s.approval_status IN ('approved', 'approved_with_constraints')
      AND s.activation_status = 'active'
      AND s.licensing_status = 'approved'
      AND s.terms_status = 'verified'
      AND s.integration_status = 'operational'
      AND s.reliability_status IN ('verified', 'reliable')
  )
$$;

DROP POLICY IF EXISTS verified_source_registry_public_read
  ON public.opportunity_sources;
CREATE POLICY verified_source_registry_public_read
  ON public.opportunity_sources
  FOR SELECT TO PUBLIC USING (
    approval_status IN ('approved', 'approved_with_constraints')
    AND licensing_status = 'approved'
    AND terms_status = 'verified'
    AND reliability_status IN ('verified', 'reliable')
  );

DROP POLICY IF EXISTS verified_source_coverage_public_read
  ON public.source_country_coverage;
CREATE POLICY verified_source_coverage_public_read
  ON public.source_country_coverage
  FOR SELECT TO PUBLIC USING (
    coverage_status IN ('verified', 'operational', 'live_verified')
    AND EXISTS (
      SELECT 1
      FROM public.opportunity_sources AS source
      WHERE source.id = source_id
        AND source.approval_status IN ('approved', 'approved_with_constraints')
        AND source.licensing_status = 'approved'
        AND source.terms_status = 'verified'
        AND source.reliability_status IN ('verified', 'reliable')
        AND (
          coverage_status NOT IN ('operational', 'live_verified')
          OR (
            source.activation_status = 'active'
            AND source.integration_status = 'operational'
          )
        )
    )
  );

DROP POLICY IF EXISTS verified_classification_public_read
  ON public.country_classification_mappings;
CREATE POLICY verified_classification_public_read
  ON public.country_classification_mappings
  FOR SELECT TO PUBLIC USING (
    EXISTS (
      SELECT 1
      FROM public.source_country_coverage AS coverage
      JOIN public.opportunity_sources AS source
        ON source.id = coverage.source_id
      WHERE coverage.source_id =
          public.country_classification_mappings.source_id
        AND coverage.country_code =
          public.country_classification_mappings.country_code
        AND coverage.category_code =
          public.country_classification_mappings.category_code
        AND coverage.coverage_status IN (
          'verified', 'operational', 'live_verified'
        )
        AND source.approval_status IN ('approved', 'approved_with_constraints')
        AND source.licensing_status = 'approved'
        AND source.terms_status = 'verified'
        AND source.reliability_status IN ('verified', 'reliable')
    )
  );
