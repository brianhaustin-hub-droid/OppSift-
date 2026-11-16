-- Depends on migrations 0001-0015.
-- Activates the NeST OCDS Data Portal (Tanzania) for production collection.
-- The NeST OCDS releases API is anonymous (no key):
--
--   GET https://nest.go.tz/gateway/nest-data-portal-api/api/releases
--
-- It returns paginated OCDS release packages (releases + links.next cursor).
-- Note: the portal currently exposes historical procurement data; the
-- connector pages through whatever the API returns.

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
  '9e4d5f6a-7b8c-4d9e-8f1a-2b3c4d5e6f7a'::uuid,
  'NeST OCDS Procurement Data',
  'Public Procurement Regulatory Authority (PPRA) - Tanzania',
  'https://nest.go.tz/',
  'government',
  'api',
  'api',
  'https://nest.go.tz/gateway/nest-data-portal-api/api/releases',
  'nest-ocds',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Published tenders; re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://data.nest.go.tz/',
  'https://data.nest.go.tz/license',
  'https://data.nest.go.tz/publication-policy',
  'permitted',
  'Attribute the NeST data portal (PPRA Tanzania).',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'nest-ocds'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'TZ',
  'government',
  'operational',
  now(),
  'https://data.nest.go.tz/'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'nest-ocds'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;