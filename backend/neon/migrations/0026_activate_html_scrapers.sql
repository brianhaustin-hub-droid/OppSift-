-- Depends on migrations 0001-0025.
-- Adds three more African countries reachable directly from the worker and
-- activates four generic HTML-list collection sources:
--
--   Sierra Leone NPPA Bids/Tenders   https://www.nppa.gov.sl/bid/
--   Mauritius PPO Procurement Notices https://publicprocurement.govmu.org/publicprocurement/?page_id=720
--   Côte d'Ivoire DGMP tender notices https://marchespublics.ci/appel_offre
--   Côte d'Ivoire DGMP award results  https://marchespublics.ci/avis_attribution
--
-- All four are anonymous, server-rendered national procurement listings
-- scraped by the generic HTML-list connector.

-- ---------------------------------------------------------------------------
-- 1. Country registry rows for the three new markets.
-- ---------------------------------------------------------------------------

INSERT INTO public.currencies (code, name, minor_unit)
VALUES
  ('SLE', 'Sierra Leonean leone', 2),
  ('XOF', 'West African CFA franc', 0),
  ('MUR', 'Mauritian rupee', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region, activation_status
)
VALUES
  ('SL', 'SLE', 'Sierra Leone', '+232', 'SLE', 'en', ARRAY['Africa/Freetown']::text[], 'africa', 'planned'),
  ('CI', 'CIV', 'Côte d''Ivoire', '+225', 'XOF', 'fr', ARRAY['Africa/Abidjan']::text[], 'africa', 'planned'),
  ('MU', 'MUS', 'Mauritius', '+230', 'MUR', 'en', ARRAY['Indian/Mauritius']::text[], 'africa', 'planned')
ON CONFLICT (alpha2_code) DO NOTHING;

INSERT INTO public.country_currencies (country_code, currency_code, is_primary)
VALUES
  ('SL', 'SLE', true), ('CI', 'XOF', true), ('MU', 'MUR', true)
ON CONFLICT (country_code, currency_code) DO NOTHING;

INSERT INTO public.country_languages (country_code, language_tag, is_default)
VALUES
  ('SL', 'en', true), ('CI', 'fr', true), ('MU', 'en', true)
ON CONFLICT (country_code, language_tag) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Opportunity sources (one guarded insert each, mirroring 0018/0024).
-- ---------------------------------------------------------------------------

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
  'e8b9c0d1-e2f3-4a4b-5c6d-7e8f9a0b1c2d'::uuid,
  'Sierra Leone NPPA Bids (Tender Portal)',
  'National Public Procurement Authority (NPPA) - Sierra Leone',
  'https://www.nppa.gov.sl/bid/',
  'government', 'portal', 'api',
  'https://www.nppa.gov.sl/bid/',
  'html-sierra-leone', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'New bids posted continuously; listing re-read every 6 hours',
  6,
  'verified', 'approved', 'verified',
  'https://www.nppa.gov.sl/bid/',
  'https://www.nppa.gov.sl/bid/',
  'https://www.nppa.gov.sl/',
  'permitted',
  'Attribute the National Public Procurement Authority (NPPA) of Sierra Leone.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-sierra-leone'
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
  'e9c0d1e2-f3a4-4b5c-6d7e-8f9a0b1c2d3e'::uuid,
  'Mauritius PPO Procurement Notices',
  'Procurement Policy Office (PPO) - Mauritius',
  'https://publicprocurement.govmu.org/publicprocurement/?page_id=720',
  'government', 'portal', 'api',
  'https://publicprocurement.govmu.org/publicprocurement/?page_id=720',
  'html-mauritius', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'Notices posted continuously by public bodies; listing re-read every 6 hours',
  6,
  'verified', 'approved', 'verified',
  'https://publicprocurement.govmu.org/publicprocurement/?page_id=720',
  'https://publicprocurement.govmu.org/publicprocurement/?page_id=720',
  'https://publicprocurement.govmu.org/publicprocurement/',
  'permitted',
  'Attribute the Mauritius Procurement Policy Office (PPO).',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-mauritius'
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
  'ead1e2f3-a4b5-4c6d-7e8f-9a0b1c2d3e4f'::uuid,
  'Côte d''Ivoire DGMP Tender Notices',
  'Direction Générale des Marchés Publics (DGMP) - Côte d''Ivoire',
  'https://marchespublics.ci/appel_offre',
  'government', 'portal', 'api',
  'https://marchespublics.ci/appel_offre',
  'html-ci-appel', true,
  ARRAY['government']::text[], ARRAY['fr']::text[],
  'Avis d''appels d''offres published continuously; listing re-read every 6 hours',
  6,
  'verified', 'approved', 'verified',
  'https://marchespublics.ci/appel_offre',
  'https://marchespublics.ci/appel_offre',
  'https://marchespublics.ci/',
  'permitted',
  'Attribute the Direction Générale des Marchés Publics (DGMP) of Côte d''Ivoire.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-ci-appel'
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
  'ebe2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a'::uuid,
  'Côte d''Ivoire DGMP Award Results',
  'Direction Générale des Marchés Publics (DGMP) - Côte d''Ivoire',
  'https://marchespublics.ci/avis_attribution',
  'government', 'portal', 'api',
  'https://marchespublics.ci/avis_attribution',
  'html-ci-attribution', true,
  ARRAY['government']::text[], ARRAY['fr']::text[],
  'Award results published continuously; large listing re-read every 12 hours',
  12,
  'verified', 'approved', 'verified',
  'https://marchespublics.ci/avis_attribution',
  'https://marchespublics.ci/avis_attribution',
  'https://marchespublics.ci/',
  'permitted',
  'Attribute the Direction Générale des Marchés Publics (DGMP) of Côte d''Ivoire.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-ci-attribution'
);

-- ---------------------------------------------------------------------------
-- 3. Country coverage rows.
-- ---------------------------------------------------------------------------

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  coverage.country_code,
  'government',
  'operational',
  now(),
  coverage.evidence_url
FROM public.opportunity_sources AS source
JOIN (
  VALUES
    ('html-sierra-leone', 'SL', 'https://www.nppa.gov.sl/bid/'),
    ('html-mauritius', 'MU', 'https://publicprocurement.govmu.org/publicprocurement/?page_id=720'),
    ('html-ci-appel', 'CI', 'https://marchespublics.ci/appel_offre'),
    ('html-ci-attribution', 'CI', 'https://marchespublics.ci/avis_attribution')
) AS coverage(connector_identifier, country_code, evidence_url)
  ON coverage.connector_identifier = source.connector_identifier
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;
