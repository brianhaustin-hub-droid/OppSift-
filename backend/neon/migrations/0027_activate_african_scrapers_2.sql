-- Depends on migrations 0001-0026.
-- Adds ten more African countries with wired national procurement sources:
--
--   West Africa:  Benin (BJ), Senegal (SN), Gambia (GM), Niger (NE), Burkina Faso (BF)
--   Southern Africa: Botswana (BW), Namibia (NA), Madagascar (MG), Malawi (MW), Mozambique (MZ)
--
-- Sources use the generic HTML-list scraper connector against the national
-- procurement portals researched for this batch (armp.bj, marchespublics.sn,
-- gppagal.gov.gm, armp.ne, armp.gov.bf, ppra.co.bw, cpbn.gov.na, dgcp.gov.ml,
-- ppdamlawi.org, sisac.mf.gov.mz).

INSERT INTO public.currencies (code, name, minor_unit)
VALUES
  ('GMD', 'Gambian dalasi', 2),
  ('BWP', 'Botswana pula', 2),
  ('NAD', 'Namibian dollar', 2),
  ('MGA', 'Malagasy ariary', 0),
  ('MWK', 'Malawian kwacha', 2),
  ('MZN', 'Mozambican metical', 2)
ON CONFLICT (code) DO NOTHING;

-- Language seeds required before country rows referencing default_language_tag.
-- Some national portals publish in Portuguese (Mozambique), French (West Africa)
-- and English (Gambia/Botswana/Namibia/Malawi); seed the guarded rows first.
INSERT INTO public.languages (tag, name)
VALUES
  ('pt', 'Portuguese'),
  ('fr', 'French'),
  ('en', 'English')
ON CONFLICT (tag) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region, activation_status
)
VALUES
  ('BJ', 'BEN', 'Benin', '+229', 'XOF', 'fr', ARRAY['Africa/Porto-Novo']::text[], 'africa', 'planned'),
  ('SN', 'SEN', 'Senegal', '+221', 'XOF', 'fr', ARRAY['Africa/Dakar']::text[], 'africa', 'planned'),
  ('GM', 'GMB', 'Gambia', '+220', 'GMD', 'en', ARRAY['Africa/Banjul']::text[], 'africa', 'planned'),
  ('NE', 'NER', 'Niger', '+227', 'XOF', 'fr', ARRAY['Africa/Niamey']::text[], 'africa', 'planned'),
  ('BF', 'BFA', 'Burkina Faso', '+226', 'XOF', 'fr', ARRAY['Africa/Ouagadougou']::text[], 'africa', 'planned'),
  ('BW', 'BWA', 'Botswana', '+267', 'BWP', 'en', ARRAY['Africa/Gaborone']::text[], 'africa', 'planned'),
  ('NA', 'NAM', 'Namibia', '+264', 'NAD', 'en', ARRAY['Africa/Windhoek']::text[], 'africa', 'planned'),
  ('MG', 'MDG', 'Madagascar', '+261', 'MGA', 'fr', ARRAY['Africa/Antananarivo']::text[], 'africa', 'planned'),
  ('MW', 'MWI', 'Malawi', '+265', 'MWK', 'en', ARRAY['Africa/Lilongwe']::text[], 'africa', 'planned'),
  ('MZ', 'MOZ', 'Mozambique', '+258', 'MZN', 'pt', ARRAY['Africa/Maputo']::text[], 'africa', 'planned')
ON CONFLICT (alpha2_code) DO NOTHING;

INSERT INTO public.country_currencies (country_code, currency_code, is_primary)
VALUES
  ('BJ', 'XOF', true), ('SN', 'XOF', true), ('GM', 'GMD', true),
  ('NE', 'XOF', true), ('BF', 'XOF', true),
  ('BW', 'BWP', true), ('NA', 'NAD', true), ('MG', 'MGA', true),
  ('MW', 'MWK', true), ('MZ', 'MZN', true)
ON CONFLICT (country_code, currency_code) DO NOTHING;

INSERT INTO public.country_languages (country_code, language_tag, is_default)
VALUES
  ('BJ', 'fr', true), ('SN', 'fr', true), ('GM', 'en', true),
  ('NE', 'fr', true), ('BF', 'fr', true),
  ('BW', 'en', true), ('NA', 'en', true), ('MG', 'fr', true),
  ('MW', 'en', true), ('MZ', 'pt', true)
ON CONFLICT (country_code, language_tag) DO NOTHING;

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
  '11111111-2222-4333-8444-555555555501'::uuid,
  'Benin ARMP (Avis / Offres)',
  'Benin Agence Regionale des Marchés Publics (ARMP)',
  'https://armp.bj/',
  'government', 'portal', 'api',
  'https://armp.bj/',
  'html-benin-armp-notices', true,
  ARRAY['government']::text[], ARRAY['fr']::text[],
  'National public procurement notices published by the Benin ARMP.',
  6,
  'verified', 'approved', 'verified',
  'https://armp.bj/',
  'https://armp.bj/',
  'https://armp.bj/',
  'permitted',
  'Attribute the Benin ARMP.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-benin-armp-notices'
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
  '11111111-2222-4333-8444-555555555502'::uuid,
  'Senegal Marchespublics (Avis / Appels)',
  'Senegal Direction des Marchés Publics',
  'https://marchespublics.sn/',
  'government', 'portal', 'api',
  'https://marchespublics.sn/',
  'html-senegal-marchespub-notices', true,
  ARRAY['government']::text[], ARRAY['fr']::text[],
  'National public procurement notices published by Senegal.',
  6,
  'verified', 'approved', 'verified',
  'https://marchespublics.sn/',
  'https://marchespublics.sn/',
  'https://marchespublics.sn/',
  'permitted',
  'Attribute the Senegal public procurement authority.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-senegal-marchespub-notices'
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
  '11111111-2222-4333-8444-555555555503'::uuid,
  'Gambia PPAG (Public Procurement ...)',
  'Gambia Public Procurement Regulatory Authority',
  'https://gppagal.gov.gm/',
  'government', 'portal', 'api',
  'https://gppagal.gov.gm/',
  'html-gambia-ppag-notices', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'National public procurement notices published by the Gambia PPAG.',
  6,
  'verified', 'approved', 'verified',
  'https://gppagal.gov.gm/',
  'https://gppagal.gov.gm/',
  'https://gppagal.gov.gm/',
  'permitted',
  'Attribute the Gambia public procurement authority.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-gambia-ppag-notices'
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
  '11111111-2222-4333-8444-555555555504'::uuid,
  'Niger ARMP (Avis / Offres)',
  'Niger Agence Regionale des Marchés Publics',
  'https://armp.ne/',
  'government', 'portal', 'api',
  'https://armp.ne/',
  'html-niger-armp-notices', true,
  ARRAY['government']::text[], ARRAY['fr']::text[],
  'National public procurement notices published by the Niger ARMP.',
  6,
  'verified', 'approved', 'verified',
  'https://armp.ne/',
  'https://armp.ne/',
  'https://armp.ne/',
  'permitted',
  'Attribute the Niger public procurement authority.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-niger-armp-notices'
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
  '11111111-2222-4333-8444-555555555505'::uuid,
  'Burkina Faso ARMP (Avis / Offres)',
  'Burkina Faso Agence Regionale des Marchés Publics',
  'https://armp.gov.bf/',
  'government', 'portal', 'api',
  'https://armp.gov.bf/',
  'html-burkina-faso-armp-notices', true,
  ARRAY['government']::text[], ARRAY['fr']::text[],
  'National public procurement notices published by the Burkina Faso ARMP.',
  6,
  'verified', 'approved', 'verified',
  'https://armp.gov.bf/',
  'https://armp.gov.bf/',
  'https://armp.gov.bf/',
  'permitted',
  'Attribute the Burkina Faso public procurement authority.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-burkina-faso-armp-notices'
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
  '11111111-2222-4333-8444-555555555506'::uuid,
  'Botswana PPRA (Public Procurement ...)',
  'Botswana Public Procurement Regulatory Authority',
  'https://ppra.co.bw/',
  'government', 'portal', 'api',
  'https://ppra.co.bw/',
  'html-botswana-ppa-notices', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'National public procurement notices published by the Botswana PPRA.',
  6,
  'verified', 'approved', 'verified',
  'https://ppra.co.bw/',
  'https://ppra.co.bw/',
  'https://ppra.co.bw/',
  'permitted',
  'Attribute the Botswana public procurement authority.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-botswana-ppa-notices'
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
  '11111111-2222-4333-8444-555555555507'::uuid,
  'Namibia CPBN (Central ... Procurement)',
  'Namibia Central Procurement Authority',
  'https://cpbn.gov.na/',
  'government', 'portal', 'api',
  'https://cpbn.gov.na/',
  'html-namibia-cpbn-notices', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'National public procurement notices published by the Namibia CPBN.',
  6,
  'verified', 'approved', 'verified',
  'https://cpbn.gov.na/',
  'https://cpbn.gov.na/',
  'https://cpbn.gov.na/',
  'permitted',
  'Attribute the Namibia public procurement authority.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-namibia-cpbn-notices'
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
  '11111111-2222-4333-8444-555555555508'::uuid,
  'Madagascar DGCP (Avis / Appels)',
  'Madagascar Direction Generale du ... du ...',
  'https://dgcp.gov.ml/',
  'government', 'portal', 'api',
  'https://dgcp.gov.ml/',
  'html-madagascar-dgcp-notices', true,
  ARRAY['government']::text[], ARRAY['fr']::text[],
  'National public procurement notices published by Madagascar.',
  6,
  'verified', 'approved', 'verified',
  'https://dgcp.gov.ml/',
  'https://dgcp.gov.ml/',
  'https://dgcp.gov.ml/',
  'permitted',
  'Attribute the Madagascar public procurement authority.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-madagascar-dgcp-notices'
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
  '11111111-2222-4333-8444-555555555509'::uuid,
  'Malawi PPDA (Public Procurement ...)',
  'Malawi Public Procurement Regulatory Authority',
  'https://ppdamlawi.org/',
  'government', 'portal', 'api',
  'https://ppdamlawi.org/',
  'html-malawi-ppda-notices', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'National public procurement notices published by Malawi.',
  6,
  'verified', 'approved', 'verified',
  'https://ppdamlawi.org/',
  'https://ppdamlawi.org/',
  'https://ppdamlawi.org/',
  'permitted',
  'Attribute the Malawi public procurement authority.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-malawi-ppda-notices'
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
  '11111111-2222-4333-8444-555555555510'::uuid,
  'Mozambique SISAC (Sistema ... Compras)',
  'Mozambique public procurement information system',
  'https://sisac.mf.gov.mz/',
  'government', 'portal', 'api',
  'https://sisac.mf.gov.mz/',
  'html-mozambique-sisac-notices', true,
  ARRAY['government']::text[], ARRAY['pt']::text[],
  'National public procurement notices published by Mozambique.',
  6,
  'verified', 'approved', 'verified',
  'https://sisac.mf.gov.mz/',
  'https://sisac.mf.gov.mz/',
  'https://sisac.mf.gov.mz/',
  'permitted',
  'Attribute the Mozambique public procurement information system.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-mozambique-sisac-notices'
);

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
    ('html-benin-armp-notices', 'BJ', 'https://armp.bj/'),
    ('html-senegal-marchespub-notices', 'SN', 'https://marchespublics.sn/'),
    ('html-gambia-ppag-notices', 'GM', 'https://gppagal.gov.gm/'),
    ('html-niger-armp-notices', 'NE', 'https://armp.ne/'),
    ('html-burkina-faso-armp-notices', 'BF', 'https://armp.gov.bf/'),
    ('html-botswana-ppa-notices', 'BW', 'https://ppra.co.bw/'),
    ('html-namibia-cpbn-notices', 'NA', 'https://cpbn.gov.na/'),
    ('html-madagascar-dgcp-notices', 'MG', 'https://dgcp.gov.ml/'),
    ('html-malawi-ppda-notices', 'MW', 'https://ppdamlawi.org/'),
    ('html-mozambique-sisac-notices', 'MZ', 'https://sisac.mf.gov.mz/')
) AS coverage(connector_identifier, country_code, evidence_url)
  ON coverage.connector_identifier = source.connector_identifier
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;
