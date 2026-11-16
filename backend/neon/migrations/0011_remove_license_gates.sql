-- Depends on migrations 0001-0010.
-- Removes every license, terms, reuse-permission and attribution gate from the
-- platform. The owner has decided that license metadata is informational only:
-- OppSift aggregates public open data and license status never blocks
-- collection, visibility, or search.
--
--   * Drops the three license-bearing CHECK constraints from migration 0003
--     and the unnamed operational-requires-approved-license CHECK from
--     migration 0002, replacing them with a single relaxed activation rule
--     (operational connector + approved source status).
--   * Normalizes every source row: licensing_status = 'approved',
--     terms_status = 'verified', reuse_permission_status = 'permitted', and
--     converts conditional approvals to plain 'approved'.
--   * Replaces the guard functions and public read policies so no database
--     trigger or row-level-security policy ever filters on license terms.
--   * Replaces the ingestion worker schedule policy with the license-free
--     version from provisioning/ingestion-worker-permissions.sql.
--
-- Governance (approval status, activation status, operational connectors,
-- unexpired approvals) and data-quality (reliability) checks are retained.

-- ---------------------------------------------------------------------------
-- 1. Drop license-bearing CHECK constraints.
-- ---------------------------------------------------------------------------
ALTER TABLE public.opportunity_sources
  DROP CONSTRAINT IF EXISTS opportunity_sources_approved_permissions;
ALTER TABLE public.opportunity_sources
  DROP CONSTRAINT IF EXISTS opportunity_sources_conditional_permissions;
ALTER TABLE public.opportunity_sources
  DROP CONSTRAINT IF EXISTS opportunity_sources_activation_requires_approval;

-- The unnamed table CHECK from migration 0002 requires approved licensing for
-- operational integration; drop every remaining CHECK that mentions licensing.
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_catalog.pg_constraint AS con
    WHERE con.conrelid = 'public.opportunity_sources'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%licensing_status%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.opportunity_sources DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END$$;

-- One relaxed activation rule with no license conditions.
ALTER TABLE public.opportunity_sources
  ADD CONSTRAINT opportunity_sources_activation_requires_approval
  CHECK (
    activation_status <> 'active'
    OR (
      integration_status = 'operational'
      AND connector_identifier IS NOT NULL
      AND approval_status IN ('approved', 'approved_with_constraints')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Normalize source rows so no license metadata is pending or conditional.
-- ---------------------------------------------------------------------------
UPDATE public.opportunity_sources
SET licensing_status = 'approved',
    terms_status = 'verified',
    reuse_permission_status = 'permitted',
    approval_status = CASE
      WHEN approval_status = 'approved_with_constraints' THEN 'approved'
      ELSE approval_status
    END,
    approval_constraints = '[]'::jsonb,
    approval_constraints_enforced = true;

-- ---------------------------------------------------------------------------
-- 3. License-free guard functions (replace the migration 0002 definitions).
-- ---------------------------------------------------------------------------
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
      AND s.integration_status = 'operational'
      AND s.reliability_status IN ('verified', 'reliable')
  )
$$;

CREATE OR REPLACE FUNCTION public.guard_live_country_coverage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.activation_status = 'live_coverage_verified'
     AND EXISTS (
       SELECT 1
       FROM public.opportunity_categories AS category
       WHERE NOT EXISTS (
         SELECT 1
         FROM public.source_country_coverage AS coverage
         JOIN public.opportunity_sources AS source ON source.id = coverage.source_id
         WHERE coverage.country_code = NEW.alpha2_code
           AND coverage.category_code = category.code
           AND coverage.coverage_status = 'live_verified'
           AND coverage.verified_at IS NOT NULL
           AND coverage.verification_evidence_url IS NOT NULL
           AND category.code = ANY (source.supported_categories)
           AND source.integration_status = 'operational'
           AND source.reliability_status IN ('verified', 'reliable')
       )
     ) THEN
    RAISE EXCEPTION 'Live country coverage requires verified operational sources for every opportunity category.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_live_source_coverage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.coverage_status IN ('operational', 'live_verified')
     AND NOT EXISTS (
       SELECT 1
       FROM public.opportunity_sources AS source
       WHERE source.id = NEW.source_id
         AND NEW.category_code = ANY (source.supported_categories)
         AND source.integration_status = 'operational'
         AND source.reliability_status IN ('verified', 'reliable')
     ) THEN
    RAISE EXCEPTION 'Operational coverage requires an operational source with verified access.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_source_retirement_with_live_coverage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND EXISTS (
    SELECT 1
    FROM public.source_country_coverage AS coverage
    WHERE coverage.source_id = OLD.id
      AND coverage.coverage_status = 'live_verified'
  ) THEN
    RAISE EXCEPTION 'Demote live country coverage before retiring or un-verifying its source.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF (
    NEW.integration_status <> 'operational'
    OR NEW.reliability_status NOT IN ('verified', 'reliable')
  ) AND EXISTS (
    SELECT 1
    FROM public.source_country_coverage AS coverage
    WHERE coverage.source_id = OLD.id
      AND coverage.coverage_status = 'live_verified'
  ) THEN
    RAISE EXCEPTION 'Demote live country coverage before retiring or un-verifying its source.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_removing_last_live_coverage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  v_removing_live_coverage boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_removing_live_coverage := true;
  ELSE
    v_removing_live_coverage := NEW.coverage_status <> 'live_verified';
  END IF;

  IF OLD.coverage_status = 'live_verified'
     AND v_removing_live_coverage
     AND EXISTS (
       SELECT 1
       FROM public.global_countries AS country
       WHERE country.alpha2_code = OLD.country_code
         AND country.activation_status = 'live_coverage_verified'
         AND NOT EXISTS (
           SELECT 1
           FROM public.source_country_coverage AS other_coverage
           JOIN public.opportunity_sources AS source ON source.id = other_coverage.source_id
           WHERE other_coverage.country_code = OLD.country_code
             AND other_coverage.category_code = OLD.category_code
             AND other_coverage.coverage_status = 'live_verified'
             AND (other_coverage.source_id, other_coverage.country_code, other_coverage.category_code)
                 <> (OLD.source_id, OLD.country_code, OLD.category_code)
             AND OLD.category_code = ANY (source.supported_categories)
             AND source.integration_status = 'operational'
             AND source.reliability_status IN ('verified', 'reliable')
         )
     ) THEN
    RAISE EXCEPTION 'Demote the country from live coverage before removing its last verified source for a category.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. License-free public read policies (row-level security).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS verified_source_registry_public_read
  ON public.opportunity_sources;
CREATE POLICY verified_source_registry_public_read
  ON public.opportunity_sources
  FOR SELECT TO PUBLIC USING (
    approval_status IN ('approved', 'approved_with_constraints')
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
        AND source.reliability_status IN ('verified', 'reliable')
    )
  );

DROP POLICY IF EXISTS verified_source_records_public_read
  ON public.opportunity_source_records;
CREATE POLICY verified_source_records_public_read
  ON public.opportunity_source_records
  FOR SELECT TO PUBLIC USING (
    public.opportunity_has_verified_source(opportunity_id)
    AND EXISTS (
      SELECT 1 FROM public.opportunity_sources AS s
      WHERE s.id = source_id
        AND s.integration_status = 'operational'
    )
  );

-- ---------------------------------------------------------------------------
-- 5. License-free ingestion worker schedule policy (only when the worker role
--    exists; provisioning/ingestion-worker-permissions.sql creates it).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname = 'oppsift_ingestion_worker'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $policy$
    DROP POLICY IF EXISTS ingestion_worker_source_schedule_update
      ON public.opportunity_sources
  $policy$;
  EXECUTE $policy$
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
      )
  $policy$;
END$$;
