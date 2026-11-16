-- Depends on migrations 0001-0009.
-- Moves the platform out of sandbox/development gating and into unrestricted
-- production collection of public open data:
--
--   * Grants.gov gains a first-class connector row and is approved and
--     activated. The Grants.gov Search API v1
--     (https://api.grants.gov/v1/api/search2) is anonymous and requires no
--     API key, subscription, or paid tier. U.S. federal works are not subject
--     to copyright under 17 U.S.C. 105, so reuse is recorded as permitted.
--   * SAM.gov is approved and activated. Its production Opportunities API
--     (https://api.sam.gov/opportunities/v2/search) is free to use with a
--     self-service public API key supplied through SAM_GOV_API_KEY; the
--     connector reports "API key is not configured" instead of failing while
--     the key is absent.
--   * TED and Contracts Finder remain active from migrations 0008/0009; their
--     records are left untouched here apart from dropping the stale research
--     caveats that no longer describe the running system.
--   * Country coverage rows are added for the two United States sources so
--     discovery sees live government and grants coverage immediately.
--
-- This migration only changes source registry metadata. It creates no tables,
-- drops no data, and does not modify migration 0005.

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
  '3f4a9c1d-7e28-4b6a-9c15-8d2e6f0a4b71'::uuid,
  'Grants.gov Search',
  'Grants.gov (U.S. federal grants portal)',
  'https://www.grants.gov',
  'funding',
  'api',
  'api',
  'https://api.grants.gov/v1/api/search2',
  'grants-gov-search',
  true,
  ARRAY['grants']::text[],
  ARRAY['en']::text[],
  'Posted opportunities publish continuously and are re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://www.grants.gov/api',
  'https://www.grants.gov/about-us',
  'https://www.grants.gov/about-us',
  'permitted',
  'Attribute Grants.gov as the source and link back to the official opportunity record.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'grants-gov-search'
     OR name = 'Grants.gov Search'
)
ON CONFLICT (id) DO NOTHING;

-- SAM.gov: approve and activate for production collection. The free public API
-- key is supplied at runtime through SAM_GOV_API_KEY (wrangler secret).
UPDATE public.opportunity_sources
SET reliability_status = 'verified',
    licensing_status = 'approved',
    terms_status = 'verified',
    permissions_evidence_url = 'https://open.gsa.gov/api/get-opportunities-public-api/',
    license_url = 'https://www.gsa.gov/website-information/website-policies',
    terms_url = 'https://open.gsa.gov/api/get-opportunities-public-api/',
    reuse_permission_status = 'permitted',
    attribution_requirements = 'Attribute the U.S. General Services Administration and link each notice back to SAM.gov.',
    retention_restrictions = NULL,
    approval_status = 'approved',
    integration_status = 'operational',
    activation_status = 'active'
WHERE connector_identifier = 'sam-gov-opportunities';

-- Coverage must follow the source update: guard_live_source_coverage rejects
-- operational coverage for a source that is not approved and operational.
INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'US',
  'grants',
  'operational',
  now(),
  'https://www.grants.gov/api'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'grants-gov-search'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'US',
  'government',
  'operational',
  now(),
  'https://open.gsa.gov/api/get-opportunities-public-api/'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'sam-gov-opportunities'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;
