-- Depends on migrations 0001-0017.
-- Activates the Uganda PPDA OCDS bulk dataset (mirrored on the Open
-- Contracting Partnership Data Registry) for production collection. No key:
--
--   GET https://data.open-contracting.org/en/publication/130/download?name=2025.jsonl.gz
--
-- Each line is a compiled OCDS release (18,811 records for 2025). The
-- connector pages through the file newest-first. The same connector pattern
-- is reused for other OCP-published countries (Kenya #147, Rwanda #145, etc.).

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
  'bf6a7b8c-9d0e-4f1a-8b2c-3d4e5f6a7b8c'::uuid,
  'Uganda PPDA OCDS (OCP Registry)',
  'Public Procurement and Disposal of Public Assets Authority (PPDA) - Uganda',
  'https://gpp.ppda.go.ug/',
  'government',
  'api',
  'download',
  'https://data.open-contracting.org/en/publication/130/download?name=2025.jsonl.gz',
  'ocp-bulk-uganda',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Compiled releases republished monthly; backfilled continuously',
  1,
  'verified',
  'approved',
  'verified',
  'https://data.open-contracting.org/en/publication/130',
  'https://opendatacommons.org/licenses/by/1-0/',
  'https://data.open-contracting.org/en/publication/130',
  'permitted',
  'Attribute the Uganda PPDA via the Open Contracting Partnership Data Registry.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ocp-bulk-uganda'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'UG',
  'government',
  'operational',
  now(),
  'https://data.open-contracting.org/en/publication/130'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'ocp-bulk-uganda'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;