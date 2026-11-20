-- Depends on migrations 0001-0040.
-- Inserts the Kenyan procurement sources live-verified on 2026-11-17 that were not
-- yet present in the database: three sector agencies (REREC, Ministry of Health,
-- ICT Authority) and eight county governments (Uasin Gishu, Machakos, Kilifi,
-- Kwale, Meru, Embu, Narok, Nyeri).
--
-- Evidence: each URL was fetched live (webfetch) on 2026-11-17 and shows an official
-- Kenyan government website with a tenders/procurement section. Nyeri homepage direct
-- fetch fails from this environment; the tenders page content was retrieved via search
-- (https://www.nyeri.go.ke/cgntenders/) and is used as verification evidence.
--
-- KPA (kpa.co.ke) is intentionally NOT inserted: the site blocks direct fetches in this
-- environment (transport error on every attempt). Live status is supported only by
-- third-party evidence (PPIP tender documents on tenders.go.ke referencing
-- www.kpa.co.ke tender downloads). Re-verify from another egress before adding.
--
-- Connector profiles for these connector_identifiers exist in
-- backend/neon/worker/src/profiles.ts (site configs in
-- backend/neon/intelligence/html-sites.ts).

BEGIN;

-- County sources: same shape as migration 0040.
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
  ('planned-ke-uasingishu-county-procurement', 'Uasin Gishu County Government — Tenders', 'Uasin Gishu County Government', 'https://uasingishu.go.ke/',            'Uasin Gishu'),
  ('planned-ke-machakos-county-procurement',   'Machakos County Government — Tenders',   'Machakos County Government',    'https://machakos.go.ke/',              'Machakos'),
  ('planned-ke-kilifi-county-procurement',     'Kilifi County Government — Tenders',     'Kilifi County Government',      'https://kilifi.go.ke/',                'Kilifi'),
  ('planned-ke-kwale-county-procurement',      'Kwale County Government — Tenders',      'Kwale County Government',       'https://kwale.go.ke/',                 'Kwale'),
  ('planned-ke-meru-county-procurement',       'Meru County Government — Tenders',       'Meru County Government',        'https://meru.go.ke/',                  'Meru'),
  ('planned-ke-embu-county-procurement',       'Embu County Government — Tenders',       'Embu County Government',        'https://embu.go.ke/',                  'Embu'),
  ('planned-ke-narok-county-procurement',      'Narok County Government — Tenders',      'Narok County Government',       'https://narok.go.ke/',                 'Narok'),
  ('planned-ke-nyeri-county-procurement',      'Nyeri County Government — Tenders',      'Nyeri County Government',       'https://www.nyeri.go.ke/cgntenders/',  'Nyeri')
) AS v(connector_identifier, source_name, publisher, official_website, county)
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = v.connector_identifier
);

-- Sector agency sources.
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
  v.description,
  24,
  'verified', 'approved', 'verified', v.official_website,
  v.official_website, v.official_website, 'permitted',
  v.attribution,
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
FROM (VALUES
  ('planned-ke-rerec-tenders', 'REREC — Tenders', 'Rural Electrification and Renewable Energy Corporation', 'https://rerec.co.ke/tenders', 'Sector agency tender notices, documents and awards published on the official REREC tenders page (836 tender notices live 2026-11-17).', 'Attribute Rural Electrification and Renewable Energy Corporation (REREC).'),
  ('planned-ke-moh-tenders', 'Ministry of Health — Tenders', 'Ministry of Health, Kenya', 'https://www.health.go.ke/', 'Ministry of Health tender/procurement notices published under Adverts on the official MoH website.', 'Attribute the Ministry of Health, Kenya.'),
  ('planned-ke-icta-tenders', 'ICT Authority — Tenders', 'ICT Authority, Kenya', 'https://icta.go.ke/', 'ICT Authority tender and procurement notices published on the official ICT Authority website (Tenders menu).', 'Attribute the ICT Authority, Kenya.')
) AS v(connector_identifier, source_name, publisher, official_website, description, attribution)
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = v.connector_identifier
);

-- Ensure Kenya country coverage rows exist for all newly inserted sources.
INSERT INTO public.source_country_coverage (source_id, country_code, category_code, coverage_status)
SELECT s.id, 'KE', 'government', 'identified'
FROM public.opportunity_sources s
WHERE s.connector_identifier IN (
  'planned-ke-uasingishu-county-procurement','planned-ke-machakos-county-procurement','planned-ke-kilifi-county-procurement',
  'planned-ke-kwale-county-procurement','planned-ke-meru-county-procurement','planned-ke-embu-county-procurement',
  'planned-ke-narok-county-procurement','planned-ke-nyeri-county-procurement',
  'planned-ke-rerec-tenders','planned-ke-moh-tenders','planned-ke-icta-tenders'
)
ON CONFLICT (source_id, country_code, category_code) DO NOTHING;

COMMIT;
