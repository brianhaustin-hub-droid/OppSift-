-- Depends on the identity and organization objects in 0001. Apply only after
-- validating 0001 on a disposable Neon branch.

CREATE TABLE IF NOT EXISTS public.currencies (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  minor_unit smallint CHECK (minor_unit BETWEEN 0 AND 4)
);

CREATE TABLE IF NOT EXISTS public.languages (
  tag text PRIMARY KEY CHECK (char_length(tag) BETWEEN 2 AND 35),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120)
);

CREATE TABLE IF NOT EXISTS public.global_countries (
  alpha2_code text PRIMARY KEY CHECK (alpha2_code ~ '^[A-Z]{2}$'),
  alpha3_code text NOT NULL UNIQUE CHECK (alpha3_code ~ '^[A-Z]{3}$'),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  calling_code text NOT NULL CHECK (calling_code ~ '^\+[1-9][0-9]{0,2}$'),
  primary_currency_code text NOT NULL REFERENCES public.currencies(code),
  default_language_tag text NOT NULL REFERENCES public.languages(tag),
  time_zones text[] NOT NULL CHECK (cardinality(time_zones) > 0),
  region text NOT NULL CHECK (region IN (
    'africa', 'asia', 'europe', 'north_america', 'south_america',
    'oceania', 'antarctica', 'other'
  )),
  activation_status text NOT NULL DEFAULT 'planned' CHECK (activation_status IN (
    'planned', 'configured', 'sources_identified', 'sources_verified',
    'integration_operational', 'live_coverage_verified'
  )),
  coverage_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    activation_status <> 'live_coverage_verified'
    OR coverage_verified_at IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.country_currencies (
  country_code text NOT NULL REFERENCES public.global_countries(alpha2_code) ON DELETE CASCADE,
  currency_code text NOT NULL REFERENCES public.currencies(code),
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (country_code, currency_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS country_currencies_one_primary
  ON public.country_currencies (country_code)
  WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.country_languages (
  country_code text NOT NULL REFERENCES public.global_countries(alpha2_code) ON DELETE CASCADE,
  language_tag text NOT NULL REFERENCES public.languages(tag),
  is_default boolean NOT NULL DEFAULT false,
  PRIMARY KEY (country_code, language_tag)
);

CREATE UNIQUE INDEX IF NOT EXISTS country_languages_one_default
  ON public.country_languages (country_code)
  WHERE is_default;

CREATE TABLE IF NOT EXISTS public.opportunity_categories (
  code text PRIMARY KEY CHECK (code IN ('government', 'grants', 'commercial')),
  name text NOT NULL UNIQUE,
  description text NOT NULL
);

INSERT INTO public.opportunity_categories (code, name, description)
VALUES
  ('government', 'Government contracts', 'Public procurement and government contract notices.'),
  ('grants', 'Grants and funding', 'Grants, funding, accelerators, and development programmes.'),
  ('commercial', 'Commercial opportunities', 'Private-sector procurement, partnerships, and programmes.')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.opportunity_types (
  code text PRIMARY KEY,
  category_code text NOT NULL REFERENCES public.opportunity_categories(code),
  name text NOT NULL,
  UNIQUE (category_code, name),
  UNIQUE (category_code, code)
);

CREATE TABLE IF NOT EXISTS public.opportunity_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 200),
  publisher text NOT NULL CHECK (char_length(btrim(publisher)) BETWEEN 1 AND 200),
  official_website text NOT NULL CHECK (official_website ~ '^https://'),
  source_category text NOT NULL CHECK (source_category IN (
    'government', 'funding', 'commercial', 'multilateral', 'other'
  )),
  source_type text NOT NULL CHECK (source_type IN (
    'portal', 'api', 'rss', 'dataset', 'document_feed', 'other'
  )),
  access_method text NOT NULL CHECK (access_method IN (
    'api', 'feed', 'download', 'permitted_web', 'manual'
  )),
  api_or_feed_available boolean NOT NULL DEFAULT false,
  supported_categories text[] NOT NULL CHECK (
    cardinality(supported_categories) > 0
    AND supported_categories <@ ARRAY['government', 'grants', 'commercial']::text[]
  ),
  languages text[] NOT NULL CHECK (cardinality(languages) > 0),
  publication_frequency text NOT NULL,
  expected_refresh_hours integer NOT NULL CHECK (expected_refresh_hours > 0),
  reliability_status text NOT NULL DEFAULT 'unknown' CHECK (reliability_status IN (
    'unknown', 'unverified', 'verified', 'reliable', 'degraded'
  )),
  licensing_status text NOT NULL DEFAULT 'unknown' CHECK (licensing_status IN (
    'unknown', 'review_required', 'approved', 'restricted', 'prohibited'
  )),
  terms_status text NOT NULL DEFAULT 'unknown' CHECK (terms_status IN (
    'unknown', 'review_required', 'verified', 'restricted', 'prohibited'
  )),
  permissions_evidence_url text CHECK (
    permissions_evidence_url IS NULL OR permissions_evidence_url ~ '^https://'
  ),
  attribution_requirements text,
  robots_restrictions text,
  integration_status text NOT NULL DEFAULT 'not_started' CHECK (integration_status IN (
    'not_started', 'in_development', 'tested', 'operational', 'paused'
  )),
  last_successful_retrieval timestamptz,
  last_unsuccessful_retrieval timestamptz,
  source_health text NOT NULL DEFAULT 'unknown' CHECK (source_health IN (
    'unknown', 'healthy', 'degraded', 'unavailable'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    integration_status <> 'operational'
    OR (
      licensing_status = 'approved'
      AND terms_status = 'verified'
      AND permissions_evidence_url IS NOT NULL
      AND reliability_status IN ('verified', 'reliable')
    )
  )
);

CREATE TABLE IF NOT EXISTS public.source_country_coverage (
  source_id uuid NOT NULL REFERENCES public.opportunity_sources(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES public.global_countries(alpha2_code) ON DELETE CASCADE,
  category_code text NOT NULL REFERENCES public.opportunity_categories(code),
  coverage_status text NOT NULL DEFAULT 'planned' CHECK (coverage_status IN (
    'planned', 'identified', 'verified', 'operational', 'live_verified', 'paused'
  )),
  verified_at timestamptz,
  verification_evidence_url text CHECK (
    verification_evidence_url IS NULL OR verification_evidence_url ~ '^https://'
  ),
  PRIMARY KEY (source_id, country_code, category_code),
  CHECK (
    coverage_status <> 'live_verified'
    OR (verified_at IS NOT NULL AND verification_evidence_url IS NOT NULL)
  ),
  CHECK (
    coverage_status NOT IN ('verified', 'operational')
    OR (verified_at IS NOT NULL AND verification_evidence_url IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.country_classification_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL,
  country_code text NOT NULL,
  source_term text NOT NULL CHECK (char_length(btrim(source_term)) BETWEEN 1 AND 200),
  category_code text NOT NULL REFERENCES public.opportunity_categories(code),
  opportunity_type_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (source_id, country_code, category_code)
    REFERENCES public.source_country_coverage(source_id, country_code, category_code)
    ON DELETE CASCADE,
  FOREIGN KEY (category_code, opportunity_type_code)
    REFERENCES public.opportunity_types(category_code, code),
  UNIQUE (source_id, country_code, source_term)
);

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 1000),
  description text,
  category_code text NOT NULL REFERENCES public.opportunity_categories(code),
  opportunity_type_code text,
  country_code text NOT NULL REFERENCES public.global_countries(alpha2_code),
  region text,
  city text,
  issuing_institution text,
  procuring_organization text,
  publisher text NOT NULL,
  reference_number text,
  published_at timestamptz,
  closing_at timestamptz,
  time_zone text,
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN (
    'open', 'closed', 'cancelled', 'awarded', 'unknown'
  )),
  canonical_url text NOT NULL CHECK (canonical_url ~ '^https://'),
  original_currency_code text REFERENCES public.currencies(code),
  published_amount numeric(20, 4) CHECK (published_amount IS NULL OR published_amount >= 0),
  amount_basis text CHECK (amount_basis IS NULL OR amount_basis IN ('published', 'estimated')),
  eligibility jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(eligibility) = 'object'),
  industry_codes text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  data_quality_status text NOT NULL DEFAULT 'pending_review' CHECK (data_quality_status IN (
    'valid', 'incomplete', 'pending_review', 'rejected'
  )),
  source_verified_at timestamptz,
  first_discovered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  search_document tsvector NOT NULL DEFAULT ''::tsvector,
  CHECK (published_at IS NULL OR closing_at IS NULL OR closing_at >= published_at),
  CHECK (
    (published_amount IS NULL AND amount_basis IS NULL)
    OR (published_amount IS NOT NULL AND original_currency_code IS NOT NULL AND amount_basis IS NOT NULL)
  ),
  FOREIGN KEY (category_code, opportunity_type_code)
    REFERENCES public.opportunity_types(category_code, code)
);

CREATE TABLE IF NOT EXISTS public.opportunity_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.opportunity_sources(id),
  external_record_id text NOT NULL CHECK (char_length(external_record_id) BETWEEN 1 AND 500),
  original_title text NOT NULL,
  original_deadline_text text,
  original_classification text,
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  canonical_url text NOT NULL CHECK (canonical_url ~ '^https://'),
  original_values jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(original_values) = 'object'),
  content_fingerprint text NOT NULL CHECK (content_fingerprint ~ '^[a-f0-9]{16}$'),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_record_id)
);

CREATE TABLE IF NOT EXISTS public.opportunity_versions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  source_record_id uuid REFERENCES public.opportunity_source_records(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  changed_fields text[] NOT NULL DEFAULT '{}',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.opportunity_duplicate_candidates (
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  candidate_opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  confidence numeric(4, 3) NOT NULL CHECK (confidence > 0 AND confidence <= 1),
  evidence text[] NOT NULL CHECK (cardinality(evidence) > 0),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'confirmed_duplicate', 'not_duplicate', 'merged'
  )),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, candidate_opportunity_id),
  CHECK (opportunity_id < candidate_opportunity_id)
);

CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.opportunity_sources(id),
  status text NOT NULL DEFAULT 'running' CHECK (status IN (
    'running', 'succeeded', 'completed_with_review', 'completed_with_errors', 'failed'
  )),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  discovered_count integer NOT NULL DEFAULT 0 CHECK (discovered_count >= 0),
  created_count integer NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  updated_count integer NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE TABLE IF NOT EXISTS public.ingestion_errors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  external_record_id text,
  error_code text NOT NULL,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ingestion_review_queue (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.opportunity_sources(id),
  external_record_id text NOT NULL,
  parsed_source_record jsonb NOT NULL CHECK (jsonb_typeof(parsed_source_record) = 'object'),
  quality_issues jsonb NOT NULL CHECK (jsonb_typeof(quality_issues) = 'array'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.opportunity_quality_issues (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  source_record_id uuid REFERENCES public.opportunity_source_records(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  issue_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning', 'error')),
  field_name text,
  message text NOT NULL,
  decision jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(decision) = 'object'),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (opportunity_id IS NOT NULL OR source_record_id IS NOT NULL OR run_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.organization_saved_opportunities (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  saved_by uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE RESTRICT,
  private_note text CHECK (private_note IS NULL OR char_length(private_note) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, opportunity_id)
);

CREATE TABLE IF NOT EXISTS public.opportunity_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_type text NOT NULL CHECK (analysis_type IN (
    'summary', 'eligibility', 'relevance', 'risk', 'deadline', 'comparison'
  )),
  model_identifier text NOT NULL,
  analysis_version text NOT NULL,
  confidence numeric(4, 3) CHECK (confidence BETWEEN 0 AND 1),
  result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object'),
  supporting_source_record_ids uuid[] NOT NULL DEFAULT '{}',
  publication_status text NOT NULL DEFAULT 'internal' CHECK (publication_status IN (
    'internal', 'reviewed', 'published', 'rejected'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    publication_status <> 'published'
    OR cardinality(supporting_source_record_ids) > 0
  )
);

CREATE INDEX IF NOT EXISTS global_countries_region_status
  ON public.global_countries (region, activation_status);
CREATE INDEX IF NOT EXISTS source_coverage_country_category
  ON public.source_country_coverage (country_code, category_code, coverage_status);
CREATE INDEX IF NOT EXISTS source_registry_operational
  ON public.opportunity_sources (integration_status, source_health);
CREATE INDEX IF NOT EXISTS classification_mapping_lookup
  ON public.country_classification_mappings (source_id, country_code, lower(source_term));
CREATE INDEX IF NOT EXISTS opportunities_country_category_status
  ON public.opportunities (country_code, category_code, status, closing_at);
CREATE INDEX IF NOT EXISTS opportunities_publication_date
  ON public.opportunities (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS opportunities_currency_amount
  ON public.opportunities (original_currency_code, published_amount)
  WHERE published_amount IS NOT NULL;
CREATE INDEX IF NOT EXISTS opportunities_search_document
  ON public.opportunities USING gin (search_document);
CREATE INDEX IF NOT EXISTS opportunity_source_record_lookup
  ON public.opportunity_source_records (source_id, external_record_id);
CREATE INDEX IF NOT EXISTS opportunity_versions_history
  ON public.opportunity_versions (opportunity_id, version_number DESC);
CREATE INDEX IF NOT EXISTS duplicate_review_queue
  ON public.opportunity_duplicate_candidates (review_status, confidence DESC);
CREATE INDEX IF NOT EXISTS ingestion_runs_source_started
  ON public.ingestion_runs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ingestion_errors_run_time
  ON public.ingestion_errors (run_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS ingestion_review_queue_pending
  ON public.ingestion_review_queue (created_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS organization_saved_opportunities_by_org
  ON public.organization_saved_opportunities (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_analyses_opportunity_time
  ON public.opportunity_analyses (opportunity_id, created_at DESC);

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
      AND s.licensing_status = 'approved'
      AND s.terms_status = 'verified'
      AND s.integration_status = 'operational'
      AND s.reliability_status IN ('verified', 'reliable')
  )
$$;

CREATE OR REPLACE FUNCTION public.refresh_opportunity_search_document()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.search_document :=
    setweight(to_tsvector('simple'::regconfig, coalesce(NEW.title, '')), 'A')
    || setweight(to_tsvector('simple'::regconfig, coalesce(NEW.description, '')), 'B')
    || setweight(to_tsvector('simple'::regconfig, coalesce(NEW.publisher, '')), 'C')
    || setweight(to_tsvector(
      'simple'::regconfig,
      coalesce(array_to_string(NEW.keywords, ' '), '')
    ), 'D');
  RETURN NEW;
END;
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
           AND source.licensing_status = 'approved'
           AND source.terms_status = 'verified'
           AND source.reliability_status IN ('verified', 'reliable')
           AND source.permissions_evidence_url IS NOT NULL
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
         AND source.licensing_status = 'approved'
         AND source.terms_status = 'verified'
         AND source.reliability_status IN ('verified', 'reliable')
         AND source.permissions_evidence_url IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Operational coverage requires an approved operational source and verified permissions.'
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
    OR NEW.licensing_status <> 'approved'
    OR NEW.terms_status <> 'verified'
    OR NEW.reliability_status NOT IN ('verified', 'reliable')
    OR NEW.permissions_evidence_url IS NULL
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
             AND source.licensing_status = 'approved'
             AND source.terms_status = 'verified'
             AND source.reliability_status IN ('verified', 'reliable')
             AND source.permissions_evidence_url IS NOT NULL
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

DROP TRIGGER IF EXISTS global_countries_require_live_sources ON public.global_countries;
CREATE TRIGGER global_countries_require_live_sources
  BEFORE INSERT OR UPDATE ON public.global_countries
  FOR EACH ROW EXECUTE FUNCTION public.guard_live_country_coverage();

DROP TRIGGER IF EXISTS source_coverage_require_live_source ON public.source_country_coverage;
CREATE TRIGGER source_coverage_require_live_source
  BEFORE INSERT OR UPDATE ON public.source_country_coverage
  FOR EACH ROW EXECUTE FUNCTION public.guard_live_source_coverage();

DROP TRIGGER IF EXISTS source_registry_protect_live_coverage ON public.opportunity_sources;
CREATE TRIGGER source_registry_protect_live_coverage
  BEFORE UPDATE OR DELETE ON public.opportunity_sources
  FOR EACH ROW EXECUTE FUNCTION public.prevent_source_retirement_with_live_coverage();

DROP TRIGGER IF EXISTS source_coverage_protect_live_country ON public.source_country_coverage;
CREATE TRIGGER source_coverage_protect_live_country
  BEFORE UPDATE OR DELETE ON public.source_country_coverage
  FOR EACH ROW EXECUTE FUNCTION public.prevent_removing_last_live_coverage();

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_country_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_classification_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_duplicate_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_saved_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY global_reference_data_public_read ON public.currencies
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY global_languages_public_read ON public.languages
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY global_country_registry_public_read ON public.global_countries
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY global_country_currency_public_read ON public.country_currencies
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY global_country_language_public_read ON public.country_languages
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY global_category_public_read ON public.opportunity_categories
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY global_type_public_read ON public.opportunity_types
  FOR SELECT TO PUBLIC USING (true);
CREATE POLICY verified_source_registry_public_read ON public.opportunity_sources
  FOR SELECT TO PUBLIC USING (
    licensing_status = 'approved'
    AND terms_status = 'verified'
    AND reliability_status IN ('verified', 'reliable')
  );
CREATE POLICY verified_source_coverage_public_read ON public.source_country_coverage
  FOR SELECT TO PUBLIC USING (
    coverage_status IN ('verified', 'operational', 'live_verified')
    AND EXISTS (
      SELECT 1 FROM public.opportunity_sources AS s
      WHERE s.id = source_id
        AND s.licensing_status = 'approved'
        AND s.terms_status = 'verified'
        AND s.reliability_status IN ('verified', 'reliable')
        AND (
          coverage_status NOT IN ('operational', 'live_verified')
          OR s.integration_status = 'operational'
        )
    )
  );
CREATE POLICY verified_classification_public_read ON public.country_classification_mappings
  FOR SELECT TO PUBLIC USING (
    EXISTS (
      SELECT 1
      FROM public.source_country_coverage AS c
      JOIN public.opportunity_sources AS s ON s.id = c.source_id
      WHERE c.source_id = public.country_classification_mappings.source_id
        AND c.country_code = public.country_classification_mappings.country_code
        AND c.category_code = public.country_classification_mappings.category_code
        AND c.coverage_status IN ('verified', 'operational', 'live_verified')
        AND s.licensing_status = 'approved'
        AND s.terms_status = 'verified'
        AND s.reliability_status IN ('verified', 'reliable')
    )
  );
CREATE POLICY verified_opportunities_public_read ON public.opportunities
  FOR SELECT TO PUBLIC USING (
    data_quality_status = 'valid'
    AND source_verified_at IS NOT NULL
    AND public.opportunity_has_verified_source(id)
  );
CREATE POLICY verified_source_records_public_read ON public.opportunity_source_records
  FOR SELECT TO PUBLIC USING (
    public.opportunity_has_verified_source(opportunity_id)
    AND EXISTS (
      SELECT 1 FROM public.opportunity_sources AS s
      WHERE s.id = source_id
        AND s.licensing_status = 'approved'
        AND s.terms_status = 'verified'
        AND s.integration_status = 'operational'
    )
  );
CREATE POLICY verified_versions_public_read ON public.opportunity_versions
  FOR SELECT TO PUBLIC USING (
    EXISTS (
      SELECT 1 FROM public.opportunities AS o
      WHERE o.id = opportunity_id
        AND o.data_quality_status = 'valid'
        AND o.source_verified_at IS NOT NULL
        AND public.opportunity_has_verified_source(o.id)
    )
  );
CREATE POLICY organization_saved_opportunities_member_access
  ON public.organization_saved_opportunities
  FOR ALL TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (
    public.is_organization_member(organization_id)
    AND saved_by = auth.user_id()::uuid
  );
CREATE POLICY reviewed_global_analyses_public_read ON public.opportunity_analyses
  FOR SELECT TO PUBLIC USING (
    organization_id IS NULL AND publication_status = 'published'
  );
CREATE POLICY organization_analyses_member_read ON public.opportunity_analyses
  FOR SELECT TO authenticated USING (
    organization_id IS NOT NULL
    AND public.is_organization_member(organization_id)
  );

DROP TRIGGER IF EXISTS global_countries_touch_updated_at ON public.global_countries;
CREATE TRIGGER global_countries_touch_updated_at
  BEFORE UPDATE ON public.global_countries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS opportunity_sources_touch_updated_at ON public.opportunity_sources;
CREATE TRIGGER opportunity_sources_touch_updated_at
  BEFORE UPDATE ON public.opportunity_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS opportunities_touch_updated_at ON public.opportunities;
CREATE TRIGGER opportunities_touch_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS opportunities_refresh_search_document ON public.opportunities;
CREATE TRIGGER opportunities_refresh_search_document
  BEFORE INSERT OR UPDATE OF title, description, publisher, keywords
  ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.refresh_opportunity_search_document();

DROP TRIGGER IF EXISTS organization_saved_opportunities_touch_updated_at
  ON public.organization_saved_opportunities;
CREATE TRIGGER organization_saved_opportunities_touch_updated_at
  BEFORE UPDATE ON public.organization_saved_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.currencies, public.languages, public.global_countries,
  public.country_currencies, public.country_languages, public.opportunity_categories,
  public.opportunity_types, public.opportunity_sources, public.source_country_coverage,
  public.country_classification_mappings, public.opportunities,
  public.opportunity_source_records, public.opportunity_versions,
  public.opportunity_duplicate_candidates, public.ingestion_runs,
  public.ingestion_errors, public.ingestion_review_queue,
  public.opportunity_quality_issues,
  public.organization_saved_opportunities, public.opportunity_analyses
FROM PUBLIC, authenticated;

GRANT SELECT ON public.currencies, public.languages, public.global_countries,
  public.country_currencies, public.country_languages, public.opportunity_categories,
  public.opportunity_types, public.opportunity_sources, public.source_country_coverage,
  public.country_classification_mappings, public.opportunities,
  public.opportunity_source_records, public.opportunity_versions,
  public.opportunity_analyses TO PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.organization_saved_opportunities TO authenticated;

COMMENT ON TABLE public.global_countries IS
  'Extensible country registry. Launch-market selection is intentionally not seeded until the approved 30-country list is confirmed.';
COMMENT ON TABLE public.opportunity_sources IS
  'Source registry. Operational status requires explicit licensing, terms, evidence, and reliability checks.';
COMMENT ON TABLE public.opportunities IS
  'Shared global catalogue; original source records and raw deadline text are retained separately.';
COMMENT ON TABLE public.organization_saved_opportunities IS
  'Tenant-scoped private records; visibility is enforced by organization membership RLS.';
