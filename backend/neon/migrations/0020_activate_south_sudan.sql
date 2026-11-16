-- Depends on migrations 0001-0019.
-- Activates the South Sudan PPDAA Tender Portal "Current Invitation for Bids"
-- listing for production collection. Anonymous public portal (no key):
--
--   GET https://tenderportal.ppdaa.gov.ss/current-bids
--
-- Server-rendered Drupal listing of open bids (title, deadline). Scraped by
-- the generic HTML-list connector.

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
  'cf7a8b9c-0d1e-4f2a-8b3c-4d5e6f7a8b9c'::uuid,
  'PPDAA Tender Portal - Current Bids',
  'Public Procurement and Disposal of Assets Authority (PPDAA) - South Sudan',
  'https://tenderportal.ppdaa.gov.ss/',
  'government',
  'portal',
  'api',
  'https://tenderportal.ppdaa.gov.ss/current-bids',
  'html-south-sudan',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Bid invitations published as available; re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://tenderportal.ppdaa.gov.ss/current-bids',
  'https://tenderportal.ppdaa.gov.ss/',
  'https://tenderportal.ppdaa.gov.ss/',
  'permitted',
  'Attribute the PPDAA South Sudan tender portal.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-south-sudan'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'SS',
  'government',
  'operational',
  now(),
  'https://tenderportal.ppdaa.gov.ss/current-bids'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'html-south-sudan'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;