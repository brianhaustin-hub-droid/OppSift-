-- Depends on migrations 0001-0039.
-- Inserts the 13 Kenyan county procurement sources live-verified on 2026-11-17.
--
-- Evidence: each URL was fetched live (webfetch) on 2026-11-17 and shows an official
-- county government website with a tenders/procurement section. Verified URLs and
-- observed tender-page features are recorded in
-- docs/source-catalog/kenya-deep-source-inventory.md (section 2 county table).
--
-- Connector profiles for these connector_identifiers exist in
-- backend/neon/worker/src/profiles.ts (createHtmlListSourceConnector sites defined in
-- backend/neon/intelligence/html-sites.ts).

BEGIN;

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
  gen_random_uuid()::uuid,
  v.source_name,
  v.publisher,
  v.official_website,
  'government', 'portal', 'api',
  v.official_website,
  v.connector_identifier, true,
  ARRAY['government']::text[], ARRAY['en', 'sw']::text[],
  'County procurement/tender notices published on the official county government website.',
  24,
  'verified', 'approved', 'verified', v.official_website,
  v.official_website, v.official_website, 'permitted',
  'Attribute ' || v.county || ' County Government.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
FROM (VALUES
  ('planned-ke-kajiado-county-procurement',  'Kajiado County Government — Tenders',        'Kajiado County Government',  'https://kajiado.go.ke/',           'Kajiado'),
  ('planned-ke-kericho-county-procurement',  'Kericho County Government — Tenders',        'Kericho County Government',  'https://kericho.go.ke/',           'Kericho'),
  ('planned-ke-bomet-county-procurement',    'Bomet County Government — Tenders',          'Bomet County Government',    'https://bomet.go.ke/',             'Bomet'),
  ('planned-ke-kakamega-county-procurement', 'Kakamega County Government — Tenders',       'Kakamega County Government', 'https://kakamega.go.ke/',          'Kakamega'),
  ('planned-ke-vihiga-county-procurement',   'Vihiga County Government — Tenders',         'Vihiga County Government',   'https://vihiga.go.ke/',            'Vihiga'),
  ('planned-ke-bungoma-county-procurement',  'Bungoma County Government — Tenders',        'Bungoma County Government',  'https://bungoma.go.ke/',           'Bungoma'),
  ('planned-ke-busia-county-procurement',    'Busia County Government — Tenders',          'Busia County Government',    'https://www.busiacounty.go.ke/',   'Busia'),
  ('planned-ke-siaya-county-procurement',    'Siaya County Government — Tenders',          'Siaya County Government',    'https://siaya.go.ke/',             'Siaya'),
  ('planned-ke-kisumu-county-procurement',   'Kisumu County Government — Tenders',         'Kisumu County Government',   'https://kisumu.go.ke/',            'Kisumu'),
  ('planned-ke-homabay-county-procurement',  'Homa Bay County Government — Tenders',       'Homa Bay County Government', 'https://homabay.go.ke/',           'Homa Bay'),
  ('planned-ke-migori-county-procurement',   'Migori County Government — Tenders',         'Migori County Government',   'https://migori.go.ke/',            'Migori'),
  ('planned-ke-kisii-county-procurement',    'Kisii County Government — Tenders',          'Kisii County Government',    'https://kisii.go.ke/',             'Kisii'),
  ('planned-ke-nyamira-county-procurement',  'Nyamira County Government — Tenders',        'Nyamira County Government',  'https://nyamira.go.ke/',           'Nyamira')
) AS v(connector_identifier, source_name, publisher, official_website, county)
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = v.connector_identifier
);

-- Ensure Kenya country coverage rows exist for all newly inserted county sources.
INSERT INTO public.source_country_coverage (source_id, country_code, category_code, coverage_status)
SELECT s.id, 'KE', 'government', 'identified'
FROM public.opportunity_sources s
WHERE s.connector_identifier IN (
  'planned-ke-kajiado-county-procurement','planned-ke-kericho-county-procurement','planned-ke-bomet-county-procurement',
  'planned-ke-kakamega-county-procurement','planned-ke-vihiga-county-procurement','planned-ke-bungoma-county-procurement',
  'planned-ke-busia-county-procurement','planned-ke-siaya-county-procurement','planned-ke-kisumu-county-procurement',
  'planned-ke-homabay-county-procurement','planned-ke-migori-county-procurement','planned-ke-kisii-county-procurement',
  'planned-ke-nyamira-county-procurement'
)
ON CONFLICT (source_id, country_code, category_code) DO NOTHING;

COMMIT;
