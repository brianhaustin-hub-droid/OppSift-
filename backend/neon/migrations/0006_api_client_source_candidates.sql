-- Depends on migrations 0001-0005. These candidates are routed by the
-- scheduled Worker but remain inactive and unapproved until reviewed.

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
  '8c36940d-7811-4abd-95a0-4174835d1b01'::uuid,
  'TED published procurement notices',
  'Publications Office of the European Union',
  'https://ted.europa.eu',
  'government',
  'api',
  'api',
  'https://api.ted.europa.eu/v3/notices/search',
  'ted-published-notices',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Continuous publication; refresh cadence requires verification',
  24,
  'unverified',
  'review_required',
  'review_required',
  'https://docs.ted.europa.eu/api/latest/',
  'https://ted.europa.eu/en/legal-notice',
  'https://docs.ted.europa.eu/api/latest/',
  'unknown',
  'Attribution requirements require review before collection.',
  'Inactive pending source-license scope, retention, and personal-data review.',
  'regional',
  ARRAY['europe']::text[],
  'unreviewed',
  'inactive',
  'in_development'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ted-published-notices'
     OR name = 'TED published procurement notices'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.opportunity_sources (
  id, name, publisher, official_website, source_category, source_type,
  access_method, api_or_feed_url, connector_identifier, api_or_feed_available,
  supported_categories, languages, publication_frequency, expected_refresh_hours,
  reliability_status, licensing_status, terms_status, permissions_evidence_url,
  license_url, terms_url, reuse_permission_status, attribution_requirements,
  retention_restrictions, coverage_scope, approval_status, activation_status,
  integration_status
)
SELECT
  'e6f4a8a2-1574-4b2e-a930-efdd308ec771'::uuid,
  'Contracts Finder',
  'UK Government',
  'https://www.contractsfinder.service.gov.uk',
  'government',
  'api',
  'api',
  'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search',
  'contracts-finder-ocds',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Continuous publication; refresh cadence requires verification',
  24,
  'unverified',
  'review_required',
  'review_required',
  'https://www.contractsfinder.service.gov.uk/apidocumentation',
  'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  'https://www.contractsfinder.service.gov.uk/apidocumentation',
  'unknown',
  'Attribution requirements require review before collection.',
  'Inactive pending source-license scope, retention, and personal-data review.',
  'country',
  'unreviewed',
  'inactive',
  'in_development'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'contracts-finder-ocds'
     OR name = 'Contracts Finder'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.opportunity_sources (
  id, name, publisher, official_website, source_category, source_type,
  access_method, api_or_feed_url, connector_identifier, api_or_feed_available,
  supported_categories, languages, publication_frequency, expected_refresh_hours,
  reliability_status, licensing_status, terms_status, permissions_evidence_url,
  license_url, terms_url, reuse_permission_status, attribution_requirements,
  retention_restrictions, coverage_scope, approval_status, activation_status,
  integration_status
)
SELECT
  '99a95e28-4d93-4a63-a5d4-c705b51e8daa'::uuid,
  'SAM.gov Contract Opportunities',
  'U.S. General Services Administration',
  'https://sam.gov',
  'government',
  'api',
  'api',
  'https://api.sam.gov/opportunities/v2/search',
  'sam-gov-opportunities',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Daily updates per GSA API documentation',
  24,
  'unverified',
  'review_required',
  'review_required',
  'https://open.gsa.gov/api/get-opportunities-public-api/',
  'https://www.gsa.gov/website-information/website-policies',
  'https://open.gsa.gov/api/get-opportunities-public-api/',
  'unknown',
  'Attribution requirements require review before collection.',
  'Inactive pending source-license scope, retention, and personal-data review.',
  'country',
  'unreviewed',
  'inactive',
  'in_development'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'sam-gov-opportunities'
     OR name = 'SAM.gov Contract Opportunities'
)
ON CONFLICT (id) DO NOTHING;
