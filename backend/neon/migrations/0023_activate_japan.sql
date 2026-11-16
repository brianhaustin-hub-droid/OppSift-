-- Depends on migrations 0001-0022.
-- Activates Japan's cross-government tender search (Kankouju Information
-- Portal, kkj.go.jp, run by the SME Agency). Public XML search API, no key:
--
--   GET https://www.kkj.go.jp/api/?LG_Code=<prefecture 1-47>&CFT_Issue_Date=<day>/<day>&Count=100
--
-- The API pages by narrowing the query, so the connector iterates one
-- prefecture per request over a rolling date window. Portal terms require
-- attribution plus a link back to the portal, encoded below.

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
  'c1a2d3e4-5f60-4a1b-8c2d-9e0f1a2b3c4d'::uuid,
  'Japan Official Public Demand Portal (KKJ)',
  'Japan Small and Medium Enterprise Agency (Kankouju Information Portal, kkj.go.jp)',
  'https://www.kkj.go.jp/',
  'government',
  'api',
  'api',
  'https://www.kkj.go.jp/api/',
  'kkj-api',
  true,
  ARRAY['government']::text[],
  ARRAY['ja']::text[],
  'Tender notices published continuously and re-read every hour (prefecture sweep)',
  1,
  'verified',
  'approved',
  'verified',
  'https://www.kkj.go.jp/s/?tc=1',
  'https://www.kkj.go.jp/s/?tc=1',
  'https://www.kkj.go.jp/s/?tc=1',
  'permitted',
  'State that the data uses the Official Public Demand Information Portal (kkj.go.jp) search API and link back to https://www.kkj.go.jp/s/.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'kkj-api'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'JP',
  'government',
  'operational',
  now(),
  'https://www.kkj.go.jp/s/'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'kkj-api'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;
