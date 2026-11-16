-- Depends on migrations 0001-0023.
-- Activates the Philippines PS-PhilGEPS Bulletin Board "Open Opportunities"
-- listing. Anonymous public portal (no key):
--
--   GET https://philgeps.gov.ph/Indexes/index
--
-- Server-rendered table of the newest bid notices (reference number, title,
-- mode, classification, agency, publish date, closing date). Scraped by the
-- generic HTML-list connector.

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
  'a7b8c9d0-1e2f-4b3c-8d5e-6f7a8b9c0d1e'::uuid,
  'PS-PhilGEPS Open Opportunities',
  'Philippine Government Electronic Procurement System (PS-PhilGEPS)',
  'https://philgeps.gov.ph/',
  'government',
  'portal',
  'api',
  'https://philgeps.gov.ph/Indexes/index',
  'html-philippines',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Bid notices published continuously and re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://philgeps.gov.ph/',
  'https://philgeps.gov.ph/CmsHomePages/show_disclaimer',
  'https://philgeps.gov.ph/CmsHomePages/show_disclaimer',
  'permitted',
  'Attribute PS-PhilGEPS (Philippine Government Electronic Procurement System).',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-philippines'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'PH',
  'government',
  'operational',
  now(),
  'https://philgeps.gov.ph/Indexes/index'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'html-philippines'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;
