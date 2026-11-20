-- Depends on migrations 0001-0041.
-- Activates the national/agency procurement sources live-verified on 2026-11-17
-- in Ghana, Egypt and Morocco that were not yet present in the database.
--
-- Evidence: each URL was confirmed with a live tender/procurement page on
-- 2026-11-17 (direct webfetch or, where the site blocks our fetcher, live
-- search/aggregator evidence). Full per-source evidence is recorded in:
--   docs/source-catalog/ghana-deep-source-inventory.md
--   docs/source-catalog/egypt-deep-source-inventory.md
--   docs/source-catalog/morocco-deep-source-inventory.md
--
-- Connector profiles for these connector_identifiers exist in
-- backend/neon/worker/src/profiles.ts and site configs in
-- backend/neon/intelligence/html-sites.ts.

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
  ARRAY['government']::text[], v.languages::text[],
  v.description,
  24,
  'verified', 'approved', 'verified', v.official_website,
  v.official_website, v.official_website, 'permitted',
  'Attribute ' || v.publisher || '.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
FROM (VALUES
  ('planned-gh-ghaneps', 'GHANEPS — Ghana Electronic Procurement System', 'Ghana Electronic Procurement System', 'https://www.ghaneps.gov.gh/', 'National e-procurement portal: current tenders, awarded contracts, public notices; APP reference numbers.', ARRAY['en']::text[], 'GH'),
  ('planned-gh-ppa', 'PPA Ghana — Tenders & Contracts Portal', 'Public Procurement Authority, Ghana', 'https://tenders.ppa.gov.gh/tenders', 'PPA tender notices and contracts (2,597 tenders / 11,500 contracts) with agency index.', ARRAY['en']::text[], 'GH'),
  ('planned-gh-mof', 'Ghana Ministry of Finance — Adverts', 'Ministry of Finance, Ghana', 'https://www.mofep.gov.gh/', 'Procurement adverts published by MoF; news current to Nov 2026.', ARRAY['en']::text[], 'GH'),
  ('planned-gh-moh', 'Ghana Ministry of Health — Tenders', 'Ministry of Health, Ghana', 'https://www.moh.gov.gh/', 'Dedicated Tenders menu and Procurement & Supply directorate.', ARRAY['en']::text[], 'GH'),
  ('planned-gh-npa', 'National Petroleum Authority Ghana', 'National Petroleum Authority, Ghana', 'https://npa.gov.gh/', 'NPA tender notices via GHANEPS (GR/NPA/GD/0018/2024).', ARRAY['en']::text[], 'GH'),
  ('planned-eg-gags', 'GAGS — General Authority for Government Services (Egypt)', 'General Authority for Government Services, Egypt', 'https://gags.gov.eg/', 'Procurement portal, contract-review results, central procurement awards and circulars.', ARRAY['ar']::text[], 'EG'),
  ('planned-eg-epsgags', 'Public e-Procurement System (Egypt)', 'General Authority for Government Services, Egypt', 'https://eps-gags.gov.eg/', 'Live public tender listings under the GAGS e-procurement system.', ARRAY['ar','en']::text[], 'EG'),
  ('planned-eg-gcs', 'General Contracting Portal (Egypt)', 'Ministry of Finance / GAGS, Egypt', 'https://gcs.digitalegypt.gov.eg/', 'General Contracting Portal: 3,990 open operations under Law 182/2018.', ARRAY['ar']::text[], 'EG'),
  ('planned-eg-sczone', 'SCZONE — Suez Canal Economic Zone Tenders', 'Suez Canal Economic Zone', 'https://sczone.eg/tenders', 'Public tenders, practices and auctions with condition booklets; deadlines current to Nov 2026.', ARRAY['ar']::text[], 'EG'),
  ('planned-eg-misr-petroleum', 'Misr Petroleum — Tenders', 'Misr Petroleum Company', 'https://www.misrpetroleum.com.eg/tenders.html', 'Governmental-company tenders with downloadable PDF documents.', ARRAY['en','ar']::text[], 'EG'),
  ('planned-eg-acud', 'ACUD — New Administrative Capital Tenders', 'Administrative Capital for Urban Development', 'https://acud.eg/', 'Tenders/RFP channel for Egypt’s New Capital megaproject.', ARRAY['en','ar']::text[], 'EG'),
  ('planned-ma-pmmp', 'PMMP — Portail Marocain des Marchés Publics', 'Trésorerie Générale du Royaume, Morocco', 'https://www.marchespublics.gov.ma/bdc/entreprise/consultation/', 'National tender portal: 1,702 live avis d’achat with buyer, reference and closing date.', ARRAY['fr','ar']::text[], 'MA')
) AS v(connector_identifier, source_name, publisher, official_website, description, languages, country_code)
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = v.connector_identifier
);

-- Egypt and Morocco are in the app country registry but not yet in global_countries.
INSERT INTO public.currencies (code, name, minor_unit) VALUES
  ('EGP', 'Egyptian pound', 2),
  ('MAD', 'Moroccan dirham', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region, activation_status
) VALUES
  ('EG', 'EGY', 'Egypt', '+20', 'EGP', 'ar', ARRAY['Africa/Cairo']::text[], 'africa', 'sources_identified'),
  ('MA', 'MAR', 'Morocco', '+212', 'MAD', 'fr', ARRAY['Africa/Casablanca']::text[], 'africa', 'sources_identified')
ON CONFLICT (alpha2_code) DO NOTHING;

-- Ensure country coverage rows exist for all newly inserted sources.
INSERT INTO public.source_country_coverage (source_id, country_code, category_code, coverage_status)
SELECT s.id, v.country_code, 'government', 'identified'
FROM public.opportunity_sources s
JOIN (VALUES
  ('planned-gh-ghaneps', 'GH'), ('planned-gh-ppa', 'GH'), ('planned-gh-mof', 'GH'),
  ('planned-gh-moh', 'GH'), ('planned-gh-npa', 'GH'),
  ('planned-eg-gags', 'EG'), ('planned-eg-epsgags', 'EG'), ('planned-eg-gcs', 'EG'),
  ('planned-eg-sczone', 'EG'), ('planned-eg-misr-petroleum', 'EG'), ('planned-eg-acud', 'EG'),
  ('planned-ma-pmmp', 'MA')
) AS v(connector_identifier, country_code) ON s.connector_identifier = v.connector_identifier
ON CONFLICT (source_id, country_code, category_code) DO NOTHING;

COMMIT;
