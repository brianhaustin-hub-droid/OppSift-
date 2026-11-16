-- Depends on migrations 0001-0006.
-- Adds Canada and an inactive source candidate. Collection remains disabled
-- until an official JSON feed, its terms, and reuse permission are reviewed.

INSERT INTO public.currencies (code, name, minor_unit)
VALUES ('CAD', 'Canadian dollar', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.languages (tag, name)
VALUES ('en', 'English'), ('fr', 'French')
ON CONFLICT (tag) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region
)
VALUES (
  'CA', 'CAN', 'Canada', '+1', 'CAD', 'en',
  ARRAY[
    'America/St_Johns', 'America/Halifax', 'America/Toronto',
    'America/Winnipeg', 'America/Regina', 'America/Edmonton',
    'America/Vancouver', 'America/Whitehorse', 'America/Yellowknife',
    'America/Iqaluit'
  ]::text[],
  'north_america'
)
ON CONFLICT (alpha2_code) DO NOTHING;

INSERT INTO public.country_currencies (country_code, currency_code, is_primary)
VALUES ('CA', 'CAD', true)
ON CONFLICT (country_code, currency_code) DO NOTHING;

INSERT INTO public.country_languages (country_code, language_tag, is_default)
VALUES ('CA', 'en', true), ('CA', 'fr', false)
ON CONFLICT (country_code, language_tag) DO NOTHING;

INSERT INTO public.opportunity_types (code, category_code, name)
VALUES ('tender', 'government', 'Tender')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.opportunity_sources (
  id, name, publisher, official_website, source_category, source_type,
  access_method, api_or_feed_available, supported_categories, languages,
  publication_frequency, expected_refresh_hours, reliability_status,
  licensing_status, terms_status, reuse_permission_status,
  attribution_requirements, retention_restrictions, coverage_scope,
  approval_status, activation_status, integration_status,
  connector_identifier, api_or_feed_url
)
VALUES (
  'c31471dc-4413-46d8-9d69-b0fc3e358d7d'::uuid,
  'CanadaBuys Tender Opportunities',
  'Government of Canada; procurement portal operator requires confirmation',
  'https://canadabuys.canada.ca',
  'government',
  'api',
  'api',
  false,
  ARRAY['government']::text[],
  ARRAY['en', 'fr']::text[],
  'Unknown',
  24,
  'unknown',
  'review_required',
  'review_required',
  'unknown',
  'Review source-specific attribution requirements before activation.',
  'No collection until source terms and retention requirements are reviewed.',
  'country',
  'unreviewed',
  'inactive',
  'in_development',
  'canadabuys-json-feed',
  NULL
)
ON CONFLICT (id) DO NOTHING;
