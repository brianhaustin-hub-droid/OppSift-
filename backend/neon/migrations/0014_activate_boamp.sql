-- Depends on migrations 0001-0013.
-- Activates the BOAMP open data API (France) for production collection. The
-- BOAMP dataset is published by the Direction de l'information légale et
-- administrative (DILA) via an anonymous Opendatasoft API (no key):
--
--   GET https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records
--
-- It exposes ~1.7M public procurement notices ("avis de marchés publics") with
-- date-parution / deadline / buyer / department / notice-URL fields. This
-- migration only adds source metadata and France "government" coverage.

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
  '7c2b3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e'::uuid,
  'BOAMP Avis de marchés publics',
  'Direction de l''information légale et administrative (DILA)',
  'https://www.boamp.fr/',
  'government',
  'api',
  'api',
  'https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records',
  'boamp-opendata',
  true,
  ARRAY['government']::text[],
  ARRAY['fr']::text[],
  'Avis de marchés publics published continuously and re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://www.boamp.fr/',
  'https://www.etalab.gouv.fr/licence-ouverte-open-licence',
  'https://www.boamp.fr/',
  'permitted',
  'Attribute BOAMP (Direction de l''information légale et administrative).',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'boamp-opendata'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  'FR',
  'government',
  'operational',
  now(),
  'https://www.boamp.fr/'
FROM public.opportunity_sources AS source
WHERE source.connector_identifier = 'boamp-opendata'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;