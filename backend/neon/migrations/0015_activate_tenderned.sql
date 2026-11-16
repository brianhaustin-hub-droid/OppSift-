-- Depends on migrations 0001-0014.
-- Activates the TenderNed public announcements web service (Netherlands) for
-- production collection. The public TNS service is anonymous (no key):
--
--   GET https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties?page=0&size=100
--
-- It returns a Spring-style page of publications (publicatieId, name, buyer,
-- deadline, procedure, status and notice URL) with ~147k total records. This
-- migration only adds source metadata and Netherlands "government" coverage.

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
  '8d3c4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f'::uuid,
  'TenderNed Publicaties',
  'TenderNed (Ministerie van Economische Zaken)',
  'https://www.tenderned.nl/',
  'government',
  'api',
  'api',
  'https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties',
  'tenderned-api',
  true,
  ARRAY['government']::text[],
  ARRAY['nl']::text[],
  'Aankondigingen published continuously and re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://www.tenderned.nl/aankondigingen/overzicht',
  'https://www.tenderned.nl/papi/tenderned-rs-tns/v2/publicaties',
  'https://www.tenderned.nl/',
  'permitted',
  'Attribute TenderNed and link back to the official notice.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'tenderned-api'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'NL',
  'government',
  'operational',
  now(),
  'https://www.tenderned.nl/aankondigingen/overzicht'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'tenderned-api'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;