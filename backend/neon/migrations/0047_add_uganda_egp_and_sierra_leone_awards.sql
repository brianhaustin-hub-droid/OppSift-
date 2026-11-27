-- Depends on migrations 0001-0046.
-- Adds a second live source for two markets that already collect:
--   Uganda        -> EGP Uganda bid notices (https://egpuganda.go.ug/)
--   Sierra Leone  -> NPPA contract awards register
--                    (https://nppa.gov.sl/contract-awards/)
-- Both are server-rendered public registers; the connectors follow the live
-- pages, so the sources start active with verified coverage.

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
  '6b7c1d2e-3f40-4a58-9b61-7c2d3e4f5a60'::uuid,
  'EGP Uganda - Bid Notices',
  'Public Procurement and Disposal of Public Assets Authority (PPDA), Uganda',
  'https://egpuganda.go.ug/',
  'government',
  'portal',
  'permitted_web',
  'https://egpuganda.go.ug/',
  'html-uganda-egp-notices',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Live bid notices refreshed on every collection run',
  12,
  'verified',
  'approved',
  'verified',
  'https://egpuganda.go.ug/',
  'https://egpuganda.go.ug/',
  'https://egpuganda.go.ug/',
  'permitted',
  'Attribute EGP Uganda / PPDA Uganda when republishing a notice.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-uganda-egp-notices'
);

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
  '8a9b0c1d-2e3f-4a5b-8c6d-9e0f1a2b3c4d'::uuid,
  'NPPA Sierra Leone - Contract Awards',
  'National Public Procurement Authority (Sierra Leone)',
  'https://nppa.gov.sl/contract-awards/',
  'government',
  'portal',
  'permitted_web',
  'https://nppa.gov.sl/contract-awards/',
  'html-sierra-leone-awards',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Award register updated as contracts are signed',
  24,
  'verified',
  'approved',
  'verified',
  'https://nppa.gov.sl/contract-awards/',
  'https://nppa.gov.sl/',
  'https://nppa.gov.sl/',
  'permitted',
  'Attribute the NPPA Sierra Leone contract awards register.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-sierra-leone-awards'
);

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT source.id, market.country_code, 'government', 'verified', now(),
       source.official_website
FROM public.opportunity_sources AS source
JOIN (VALUES
  ('html-uganda-egp-notices', 'UG'),
  ('html-sierra-leone-awards', 'SL')
) AS market(connector_identifier, country_code)
  ON market.connector_identifier = source.connector_identifier
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = 'verified',
    verified_at = COALESCE(public.source_country_coverage.verified_at, EXCLUDED.verified_at),
    verification_evidence_url = COALESCE(
      public.source_country_coverage.verification_evidence_url,
      EXCLUDED.verification_evidence_url
    );
