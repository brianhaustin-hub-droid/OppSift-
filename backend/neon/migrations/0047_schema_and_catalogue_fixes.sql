-- Depends on migrations 0001-0046.
-- Small corrective migration found while wiring the live frontend and running
-- the backend test suite.

-- 1. The ingestion repository writes opportunities.canonical_key (the
--    normalized notice identity it dedupes on), but no migration created it.
--    Live branches that ingested successfully already carry the column, so it
--    is added idempotently here for reproducible databases and CI.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS canonical_key text;

CREATE INDEX IF NOT EXISTS opportunities_canonical_key_idx
  ON public.opportunities (country_code, canonical_key)
  WHERE canonical_key IS NOT NULL;

-- 2. Three seeded sources carry prose longer than the 100-character
--    publication_frequency contract, which fails source-registry validation.
ALTER TABLE public.opportunity_sources
  DROP CONSTRAINT IF EXISTS opportunity_sources_publication_frequency_length;
ALTER TABLE public.opportunity_sources
  ADD CONSTRAINT opportunity_sources_publication_frequency_length
  CHECK (char_length(publication_frequency) <= 100) NOT VALID;

UPDATE public.opportunity_sources
SET publication_frequency = left(publication_frequency, 100),
    updated_at = now()
WHERE char_length(publication_frequency) > 100;

ALTER TABLE public.opportunity_sources
  VALIDATE CONSTRAINT opportunity_sources_publication_frequency_length;

-- 3. Catalogue entries for markets registered but not yet ingested are
--    public information (publisher name, official URL, access method). Without
--    this policy the public Data API hides every new market until a connector
--    is operational, so the app cannot show the expanded source catalogue.
--    Only rows with no ingestion claim (not_started / inactive) are exposed,
--    and they carry no stored records.
DROP POLICY IF EXISTS catalogue_source_registry_public_read
  ON public.opportunity_sources;
CREATE POLICY catalogue_source_registry_public_read
  ON public.opportunity_sources
  FOR SELECT
  USING (
    reliability_status IN ('verified', 'reliable')
    AND integration_status = 'not_started'
    AND activation_status = 'inactive'
  );

DROP POLICY IF EXISTS catalogue_source_coverage_public_read
  ON public.source_country_coverage;
CREATE POLICY catalogue_source_coverage_public_read
  ON public.source_country_coverage
  FOR SELECT
  USING (
    coverage_status = 'verified'
    AND EXISTS (
      SELECT 1
      FROM public.opportunity_sources source
      WHERE source.id = source_country_coverage.source_id
        AND source.reliability_status IN ('verified', 'reliable')
        AND source.integration_status = 'not_started'
        AND source.activation_status = 'inactive'
    )
  );
