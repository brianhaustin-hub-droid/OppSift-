-- Depends on migrations 0001-0020.
-- Activates the CanadaBuys tender-notice feed through its Drupal JSON:API.
-- The existing CanadaBuys row (migration 0007) is upgraded: connector, API URL,
-- approval, activation and Canada coverage are set here.
--
--   GET https://canadabuys.canada.ca/en/jsonapi/node/tender_notice
--
-- Anonymous, no key. Paged via page[offset]/page[limit]; the connector
-- backfills from the newest page first.

UPDATE public.opportunity_sources
SET name = 'CanadaBuys Tender Notices',
    api_or_feed_url = 'https://canadabuys.canada.ca/en/jsonapi/node/tender_notice',
    connector_identifier = 'canadabuys-api',
    access_method = 'api',
    languages = ARRAY['en', 'fr']::text[],
    publication_frequency = 'Tender notices published continuously and re-read every hour',
    expected_refresh_hours = 1,
    reliability_status = 'verified',
    licensing_status = 'approved',
    terms_status = 'verified',
    permissions_evidence_url = 'https://canadabuys.canada.ca/en/tender-opportunities',
    license_url = 'https://canadabuys.canada.ca/en/terms-use',
    terms_url = 'https://canadabuys.canada.ca/en/terms-use',
    reuse_permission_status = 'permitted',
    attribution_requirements = 'Attribute CanadaBuys (Public Services and Procurement Canada).',
    retention_restrictions = NULL,
    approval_status = 'approved',
    integration_status = 'operational',
    activation_status = 'active'
WHERE name ILIKE '%CanadaBuys%';

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'CA',
  'government',
  'operational',
  now(),
  'https://canadabuys.canada.ca/en/tender-opportunities'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'canadabuys-api'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;