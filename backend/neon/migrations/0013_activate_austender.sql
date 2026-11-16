-- Depends on migrations 0001-0012.
-- Activates the AusTender OCDS Search API (Australia) for production collection.
-- The AusTender OCDS API is anonymous (no API key) and licenced under CC BY 3.0
-- AU (https://creativecommons.org/licenses/by/3.0/au/):
--
--   GET https://api.tenders.gov.au/ocds/findByDates/contractPublished/{start}/{end}
--
-- It returns paginated OCDS release packages (releases + links.next). This
-- migration only adds source registry metadata and Australia "government"
-- coverage; the connector (austender-api.ts + createAusTenderSourceConnector)
-- is bundled into the deployed ingestion worker.

INSERT INTO public.opportunity_sources (
  id, name, publisher, official_website, source_category, source_type,
  access_method, api_or_feed_url, connector_identifier, api_or_feed_available,
  supported_categories, languages, publication_frequency, expected_refresh_hours,
  reliability_status, licensing_status, terms_status, permissions_evidence_url,
  license_url, terms_url, reuse_permission_status, attribution_requirements,
  retention_restrictions, coverage_scope, coverage_region_codes,
  approval_status, activation_status, integration_status
)
SELECT
  '5a4e1c2d-3b4a-4c9e-8d1f-2e6b0a7c9d10'::uuid,
  'AusTender Contract Notices',
  'Australian Government Department of Finance',
  'https://www.tenders.gov.au/',
  'government',
  'api',
  'api',
  'https://api.tenders.gov.au/ocds/findByDates/contractPublished',
  'austender-ocds',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Contract notices publish continuously and are re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://www.tenders.gov.au/',
  'https://creativecommons.org/licenses/by/3.0/au/',
  'https://www.tenders.gov.au/',
  'permitted',
  'Attribute the Australian Government Department of Finance and link back to AusTender.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'austender-ocds'
)
ON CONFLICT (id) DO NOTHING;

-- Coverage must follow the source update: guard_live_source_coverage rejects
-- operational coverage for a source that is not approved and operational.
INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'AU',
  'government',
  'operational',
  now(),
  'https://www.tenders.gov.au/'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'austender-ocds'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;