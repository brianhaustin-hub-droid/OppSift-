-- Depends on migrations 0001-0016.
-- Activates the Kenya PPIP active-tenders JSON feed for production collection.
-- The PPIP public feed is anonymous (no key):
--
--   GET https://tenders.go.ke/api/active-tenders?page=1
--
-- It returns a paginated list of open tenders (title, tender reference,
-- procuring entity, publication/deadline timestamps, category and method).
-- The connector deliberately drops officer personal data leaked in the portal
-- payload (national IDs, phone numbers, emails).

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
  'af5e6f7a-8b9c-4d0e-8f2a-3b4c5d6e7f8a'::uuid,
  'Kenya PPIP Active Tenders',
  'Public Procurement Regulatory Authority (PPRA) - Kenya',
  'https://tenders.go.ke/',
  'government',
  'api',
  'api',
  'https://tenders.go.ke/api/active-tenders',
  'kenya-ppip-api',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Active tenders published continuously and re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://tenders.go.ke/ocds',
  'https://tenders.go.ke/ocds',
  'https://tenders.go.ke/',
  'permitted',
  'Attribute the Kenya Public Procurement Information Portal (PPIP).',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'kenya-ppip-api'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'KE',
  'government',
  'operational',
  now(),
  'https://tenders.go.ke/'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'kenya-ppip-api'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;