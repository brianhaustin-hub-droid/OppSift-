-- Depends on migrations 0001-0021.
-- Activates the India CPPP / ePublishing homepage "Latest Tenders" table for
-- production collection. Anonymous public portal (no key):
--
--   GET https://eprocure.gov.in/epublish/app?page=Home&service=page
--
-- Server-rendered Tapestry table of newest active tenders (title, reference
-- number, closing date). Scraped by the generic HTML-list connector.

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
  'df8a9b0c-1e2f-4a3b-9c4d-5e6f7a8b9c0d'::uuid,
  'CPPP Latest Active Tenders',
  'Central Public Procurement Portal (CPPP) - Government of India',
  'https://eprocure.gov.in/',
  'government',
  'portal',
  'api',
  'https://eprocure.gov.in/epublish/app?page=Home&service=page',
  'html-india',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Latest tenders published continuously and re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://eprocure.gov.in/',
  'https://eprocure.gov.in/',
  'https://eprocure.gov.in/',
  'permitted',
  'Attribute the Central Public Procurement Portal (CPPP), Government of India.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-india'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'IN',
  'government',
  'operational',
  now(),
  'https://eprocure.gov.in/'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'html-india'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;