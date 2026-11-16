-- Depends on migrations 0001-0007.
-- Approves the sources whose license, terms and reuse evidence was verified on
-- 2026-11-12, and activates the two that are safe to collect from now.
-- World Bank is approved but held paused: its API terms prohibit commercial
-- use without written consent. SAM.gov and CanadaBuys remain unreviewed
-- because their terms pages could not be verified.

INSERT INTO public.currencies (code, name, minor_unit)
VALUES
  ('GBP', 'Pound sterling', 2),
  ('EUR', 'Euro', 2),
  ('SEK', 'Swedish krona', 2),
  ('PLN', 'Polish zloty', 2),
  ('DKK', 'Danish krone', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.languages (tag, name)
VALUES
  ('de', 'German'),
  ('fr', 'French'),
  ('nl', 'Dutch'),
  ('it', 'Italian'),
  ('es', 'Spanish'),
  ('sv', 'Swedish'),
  ('pl', 'Polish'),
  ('da', 'Danish')
ON CONFLICT (tag) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region, activation_status
)
VALUES
  ('GB', 'GBR', 'United Kingdom', '+44', 'GBP', 'en', ARRAY['Europe/London']::text[], 'europe', 'sources_identified'),
  ('DE', 'DEU', 'Germany', '+49', 'EUR', 'de', ARRAY['Europe/Berlin']::text[], 'europe', 'sources_identified'),
  ('FR', 'FRA', 'France', '+33', 'EUR', 'fr', ARRAY['Europe/Paris']::text[], 'europe', 'sources_identified'),
  ('NL', 'NLD', 'Netherlands', '+31', 'EUR', 'nl', ARRAY['Europe/Amsterdam']::text[], 'europe', 'sources_identified'),
  ('IE', 'IRL', 'Ireland', '+353', 'EUR', 'en', ARRAY['Europe/Dublin']::text[], 'europe', 'sources_identified'),
  ('IT', 'ITA', 'Italy', '+39', 'EUR', 'it', ARRAY['Europe/Rome']::text[], 'europe', 'sources_identified'),
  ('ES', 'ESP', 'Spain', '+34', 'EUR', 'es', ARRAY['Europe/Madrid']::text[], 'europe', 'sources_identified'),
  ('SE', 'SWE', 'Sweden', '+46', 'SEK', 'sv', ARRAY['Europe/Stockholm']::text[], 'europe', 'sources_identified'),
  ('PL', 'POL', 'Poland', '+48', 'PLN', 'pl', ARRAY['Europe/Warsaw']::text[], 'europe', 'sources_identified'),
  ('DK', 'DNK', 'Denmark', '+45', 'DKK', 'da', ARRAY['Europe/Copenhagen']::text[], 'europe', 'sources_identified'),
  ('BE', 'BEL', 'Belgium', '+32', 'EUR', 'nl', ARRAY['Europe/Brussels']::text[], 'europe', 'sources_identified')
ON CONFLICT (alpha2_code) DO NOTHING;

INSERT INTO public.country_currencies (country_code, currency_code, is_primary)
VALUES
  ('GB', 'GBP', true), ('DE', 'EUR', true), ('FR', 'EUR', true),
  ('NL', 'EUR', true), ('IE', 'EUR', true), ('IT', 'EUR', true),
  ('ES', 'EUR', true), ('SE', 'SEK', true), ('PL', 'PLN', true),
  ('DK', 'DKK', true), ('BE', 'EUR', true)
ON CONFLICT (country_code, currency_code) DO NOTHING;

INSERT INTO public.country_languages (country_code, language_tag, is_default)
VALUES
  ('GB', 'en', true), ('DE', 'de', true), ('FR', 'fr', true),
  ('NL', 'nl', true), ('IE', 'en', true), ('IT', 'it', true),
  ('ES', 'es', true), ('SE', 'sv', true), ('PL', 'pl', true),
  ('DK', 'da', true), ('BE', 'nl', true)
ON CONFLICT (country_code, language_tag) DO NOTHING;

-- Contracts Finder: OGL v3.0, anonymous OCDS endpoint confirmed reachable.
UPDATE public.opportunity_sources
SET license_url = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
    terms_url = 'https://www.contractsfinder.service.gov.uk/Home/TermsAndConditions',
    permissions_evidence_url = 'https://www.contractsfinder.service.gov.uk/apidocumentation',
    licensing_status = 'approved',
    terms_status = 'verified',
    reuse_permission_status = 'conditional',
    reliability_status = 'verified',
    attribution_requirements = 'Contains public sector information licensed under the Open Government Licence v3.0.',
    retention_restrictions = 'Content exempt from the OGL, including personal and third-party material, must not be collected.',
    approval_status = 'approved_with_constraints',
    approval_constraints = '[
      "Attribute every record as: Contains public sector information licensed under the Open Government Licence v3.0.",
      "Exclude site content that is exempt from the OGL.",
      "On HTTP 403 rate-limit responses, stop collecting and back off for at least five minutes."
    ]'::jsonb,
    approval_constraints_enforced = true,
    integration_status = 'operational',
    activation_status = 'active'
WHERE connector_identifier = 'contracts-finder-ocds';

-- TED: CC BY 4.0, Search API documented as open and intended for bulk reuse.
UPDATE public.opportunity_sources
SET license_url = 'https://creativecommons.org/licenses/by/4.0/legalcode',
    terms_url = 'https://docs.ted.europa.eu/api/latest/api.html',
    permissions_evidence_url = 'https://docs.ted.europa.eu/api/latest/search.html',
    licensing_status = 'approved',
    terms_status = 'verified',
    reuse_permission_status = 'conditional',
    reliability_status = 'verified',
    attribution_requirements = 'Credit the Publications Office of the European Union (TED), link to the CC BY 4.0 licence, and indicate any changes made.',
    retention_restrictions = 'The TED legal notice page rejects automated requests; re-verify reuse terms manually before widening collection scope.',
    approval_status = 'approved_with_constraints',
    approval_constraints = '[
      "Attribute the Publications Office of the European Union and link to CC BY 4.0, indicating any changes.",
      "Collect only through the documented Search API; do not scrape ted.europa.eu HTML pages.",
      "Re-verify the TED legal notice manually, since that page rejects automated requests."
    ]'::jsonb,
    approval_constraints_enforced = true,
    integration_status = 'operational',
    activation_status = 'active'
WHERE connector_identifier = 'ted-published-notices';

-- World Bank: dataset is CC BY 4.0, but the API terms prohibit commercial use
-- without written consent, so approval is recorded without activation.
UPDATE public.opportunity_sources
SET license_url = 'https://www.worldbank.org/ext/en/legal/terms-conditions/datasets',
    terms_url = 'https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets',
    permissions_evidence_url = 'https://www.worldbank.org/ext/en/legal/terms-conditions',
    licensing_status = 'approved',
    terms_status = 'verified',
    reuse_permission_status = 'conditional',
    reliability_status = 'verified',
    attribution_requirements = 'The World Bank: World Bank Procurement Notices: Data source.',
    retention_restrictions = 'No collection until the API commercial-use restriction is resolved in writing by the World Bank.',
    approval_status = 'approved_with_constraints',
    approval_constraints = '[
      "API-facilitated commercial use, including charging for access or redistribution, is prohibited without prior written World Bank consent.",
      "Keep request volume within reasonable limits as determined by the World Bank.",
      "Attribute every record to The World Bank and link to CC BY 4.0."
    ]'::jsonb,
    approval_constraints_enforced = true,
    activation_status = 'paused'
WHERE connector_identifier = 'world-bank-procurement-notices';

-- Coverage rows must follow the source updates: guard_live_source_coverage
-- rejects operational coverage for a source that is not yet approved.
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
  'https://www.contractsfinder.service.gov.uk/apidocumentation'
FROM public.opportunity_sources AS source
CROSS JOIN (VALUES ('GB')) AS coverage(country_code)
WHERE source.connector_identifier = 'contracts-finder-ocds'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;

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
  'https://docs.ted.europa.eu/api/latest/search.html'
FROM public.opportunity_sources AS source
CROSS JOIN (
  VALUES ('DE'), ('FR'), ('NL'), ('IE'), ('IT'),
         ('ES'), ('SE'), ('PL'), ('DK'), ('BE')
) AS coverage(country_code)
WHERE source.connector_identifier = 'ted-published-notices'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;
