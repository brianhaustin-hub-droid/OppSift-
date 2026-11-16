-- Depends on migrations 0001-0024.
-- Expands the registry beyond the original 30 launch markets with five African
-- countries that publish OCDS through the Open Contracting Partnership Data
-- Registry, and activates seven OCP-bulk collection sources (the same generic
-- connector already proven for Uganda, publication 130):
--
--   Nigeria BPP NOCOPO      publication  64  2025.jsonl.gz (~3MB)
--   Zambia ZPPA e-GP        publication   3  2023.jsonl.gz (~9MB)
--   Ghana PPA GHANEPS       publication  85  full.jsonl.gz (~4MB)
--   Liberia PPCC e-GP       publication 156  full.jsonl.gz (<1MB)
--   South Africa eTenders   publication 143  2025.jsonl.gz (~2MB)
--   Thailand BMA Open Contract publication 158 full.jsonl.gz (~7MB)
--   Indonesia ICW Open Tender publication 101 2025.jsonl.gz (<1MB)
--
-- Each file is gzip-compressed JSONL, one compiled OCDS release per line,
-- paged newest-first from the file end. Anonymous download, no key.

-- ---------------------------------------------------------------------------
-- 1. Country registry rows for the five new markets.
-- ---------------------------------------------------------------------------

INSERT INTO public.currencies (code, name, minor_unit)
VALUES
  ('NGN', 'Nigerian naira', 2),
  ('GHS', 'Ghanaian cedi', 2),
  ('LRD', 'Liberian dollar', 2),
  ('ZMW', 'Zambian kwacha', 2),
  ('ZAR', 'South African rand', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region, activation_status
)
VALUES
  ('NG', 'NGA', 'Nigeria', '+234', 'NGN', 'en', ARRAY['Africa/Lagos']::text[], 'africa', 'planned'),
  ('GH', 'GHA', 'Ghana', '+233', 'GHS', 'en', ARRAY['Africa/Accra']::text[], 'africa', 'planned'),
  ('LR', 'LBR', 'Liberia', '+231', 'LRD', 'en', ARRAY['Africa/Monrovia']::text[], 'africa', 'planned'),
  ('ZM', 'ZMB', 'Zambia', '+260', 'ZMW', 'en', ARRAY['Africa/Lusaka']::text[], 'africa', 'planned'),
  ('ZA', 'ZAF', 'South Africa', '+27', 'ZAR', 'en', ARRAY['Africa/Johannesburg']::text[], 'africa', 'planned')
ON CONFLICT (alpha2_code) DO NOTHING;

INSERT INTO public.country_currencies (country_code, currency_code, is_primary)
VALUES
  ('NG', 'NGN', true), ('GH', 'GHS', true), ('LR', 'LRD', true),
  ('ZM', 'ZMW', true), ('ZA', 'ZAR', true)
ON CONFLICT (country_code, currency_code) DO NOTHING;

INSERT INTO public.country_languages (country_code, language_tag, is_default)
VALUES
  ('NG', 'en', true), ('GH', 'en', true), ('LR', 'en', true),
  ('ZM', 'en', true), ('ZA', 'en', true)
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
  'e1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'::uuid,
  'Nigeria NOCOPO OCDS (OCP Registry)',
  'Bureau of Public Procurement (BPP) - Nigeria',
  'https://nocopo.bpp.gov.ng/',
  'government', 'api', 'api',
  'https://data.open-contracting.org/en/publication/64/download?name=2025.jsonl.gz',
  'ocp-bulk-nigeria', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'NOCOPO compiled releases republished by BPP; registry mirror re-reads continuously',
  6,
  'verified', 'approved', 'verified',
  'https://data.open-contracting.org/en/publication/64',
  'https://data.open-contracting.org/en/publication/64',
  'https://data.open-contracting.org/en/publication/64',
  'permitted',
  'Attribute the Bureau of Public Procurement (BPP) Nigeria via the Open Contracting Partnership Data Registry.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ocp-bulk-nigeria'
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
  'e2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d'::uuid,
  'Zambia ZPPA e-GP OCDS (OCP Registry)',
  'Zambia Public Procurement Authority (ZPPA)',
  'https://www.zppa.org.zm/',
  'government', 'api', 'api',
  'https://data.open-contracting.org/en/publication/3/download?name=2023.jsonl.gz',
  'ocp-bulk-zambia', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'ZPPA e-GP compiled releases republished monthly; registry mirror re-reads continuously',
  6,
  'verified', 'approved', 'verified',
  'https://data.open-contracting.org/en/publication/3',
  'https://creativecommons.org/licenses/by/4.0/',
  'https://www.zppa.org.zm/ocds-publication-policy',
  'permitted',
  'Attribute the Zambia Public Procurement Authority (ZPPA) via the Open Contracting Partnership Data Registry (CC BY 4.0).',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ocp-bulk-zambia'
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
  'e3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e'::uuid,
  'Ghana GHANEPS OCDS (OCP Registry)',
  'Public Procurement Authority (PPA) - Ghana',
  'https://ghaneps.gov.gh/',
  'government', 'api', 'api',
  'https://data.open-contracting.org/en/publication/85/download?name=full.jsonl.gz',
  'ocp-bulk-ghana', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'GHANEPS compiled releases mirrored continuously; registry re-reads continuously',
  6,
  'verified', 'approved', 'verified',
  'https://data.open-contracting.org/en/publication/85',
  'https://data.open-contracting.org/en/publication/85',
  'https://data.open-contracting.org/en/publication/85',
  'permitted',
  'Attribute the Ghana Public Procurement Authority (PPA) via the Open Contracting Partnership Data Registry.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ocp-bulk-ghana'
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
  'e4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f'::uuid,
  'Liberia PPCC OCDS (OCP Registry)',
  'Public Procurement and Concessions Commission (PPCC) - Liberia',
  'https://eprocurement.ppcc.gov.lr/',
  'government', 'api', 'api',
  'https://data.open-contracting.org/en/publication/156/download?name=full.jsonl.gz',
  'ocp-bulk-liberia', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'PPCC e-GP compiled releases mirrored continuously; registry re-reads continuously',
  6,
  'verified', 'approved', 'verified',
  'https://data.open-contracting.org/en/publication/156',
  'https://data.open-contracting.org/en/publication/156',
  'https://data.open-contracting.org/en/publication/156',
  'permitted',
  'Attribute the Liberia Public Procurement and Concessions Commission (PPCC) via the Open Contracting Partnership Data Registry.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ocp-bulk-liberia'
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
  'e5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a'::uuid,
  'South Africa eTenders OCDS (OCP Registry)',
  'National Treasury OCPO - South Africa',
  'https://www.etenders.gov.za/',
  'government', 'api', 'api',
  'https://data.open-contracting.org/en/publication/143/download?name=2025.jsonl.gz',
  'ocp-bulk-south-africa', true,
  ARRAY['government']::text[], ARRAY['en']::text[],
  'eTender Publications Portal compiled releases mirrored continuously; registry re-reads continuously',
  6,
  'verified', 'approved', 'verified',
  'https://data.open-contracting.org/en/publication/143',
  'https://data.open-contracting.org/en/publication/143',
  'https://data.open-contracting.org/en/publication/143',
  'permitted',
  'Attribute the South African National Treasury OCPO via the Open Contracting Partnership Data Registry.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ocp-bulk-south-africa'
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
  'e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b'::uuid,
  'Bangkok BMA Open Contract OCDS (OCP Registry)',
  'Bangkok Metropolitan Administration (BMA)',
  'https://opencontract.bangkok.go.th/ocds.html',
  'government', 'api', 'api',
  'https://data.open-contracting.org/en/publication/158/download?name=full.jsonl.gz',
  'ocp-bulk-thailand-bma', true,
  ARRAY['government']::text[], ARRAY['th']::text[],
  'BMA Open Contract platform republished weekly; registry re-reads continuously',
  6,
  'verified', 'approved', 'verified',
  'https://data.open-contracting.org/en/publication/158',
  'https://data.open-contracting.org/en/publication/158',
  'https://data.open-contracting.org/en/publication/158',
  'permitted',
  'Attribute the Bangkok Metropolitan Administration via the Open Contracting Partnership Data Registry.',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ocp-bulk-thailand-bma'
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
  'e7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c'::uuid,
  'Indonesia Open Tender OCDS (OCP Registry)',
  'Indonesia Corruption Watch (ICW) - Open Tender',
  'https://opentender.net/',
  'government', 'api', 'api',
  'https://data.open-contracting.org/en/publication/101/download?name=2025.jsonl.gz',
  'ocp-bulk-indonesia', true,
  ARRAY['government']::text[], ARRAY['id']::text[],
  'LKPP SPSE data republished by ICW Open Tender; registry mirror re-reads continuously',
  6,
  'verified', 'approved', 'verified',
  'https://data.open-contracting.org/en/publication/101',
  'https://opendatacommons.org/licenses/odbl/',
  'https://opentender.net/#/tentang-opentender/',
  'permitted',
  'Attribute Indonesia Corruption Watch (ICW) Open Tender via the Open Contracting Partnership Data Registry (ODbL).',
  NULL, 'country', ARRAY[]::text[],
  'approved', 'active', 'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'ocp-bulk-indonesia'
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
  'https://data.open-contracting.org/en/publication/' || coverage.publication_id
FROM public.opportunity_sources AS source
JOIN (
  VALUES
    ('ocp-bulk-nigeria', 'NG', 64),
    ('ocp-bulk-zambia', 'ZM', 3),
    ('ocp-bulk-ghana', 'GH', 85),
    ('ocp-bulk-liberia', 'LR', 156),
    ('ocp-bulk-south-africa', 'ZA', 143),
    ('ocp-bulk-thailand-bma', 'TH', 158),
    ('ocp-bulk-indonesia', 'ID', 101)
) AS coverage(connector_identifier, country_code, publication_id)
  ON coverage.connector_identifier = source.connector_identifier
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;
