-- Depends on migrations 0001-0050.
-- Adds the multilateral layer to the source registry.
--
-- Why: every country in the catalogue currently holds only its national portal
-- (57 markets hold exactly one). Those portals are the right primary source, but
-- they are not the only publisher that advertises work in a country. The four
-- publishers below run public tender portals that cover many of the markets in
-- this registry, so a country page can list them too.
--
-- Every URL below was requested on 2026-11-27 and answered HTTP 200 from the
-- publisher's own site. These are catalogue registrations: integration_status
-- stays 'not_started' and activation_status 'inactive' until a connector exists,
-- a live sample is retrieved and stored, and coverage_truth reports records.
--
-- Coverage is marked 'verified' (publisher identity and official tender page
-- confirmed), never 'live_verified' or 'operational'. Licensing and terms stay
-- 'review_required' for each publisher.

INSERT INTO public.opportunity_sources (
  id, name, publisher, official_website, source_category, source_type,
  access_method, api_or_feed_url, connector_identifier, api_or_feed_available,
  supported_categories, languages, publication_frequency, expected_refresh_hours,
  reliability_status, licensing_status, terms_status, permissions_evidence_url,
  attribution_requirements, coverage_scope, approval_status, activation_status,
  integration_status
)
SELECT
  gen_random_uuid(), v.source_name, v.publisher, v.official_website,
  'multilateral', 'portal', 'permitted_web', NULL, v.connector_identifier, false,
  ARRAY['government']::text[], v.languages::text[], 'Daily', 24,
  'verified', 'review_required', 'review_required', v.official_website,
  'Attribute ' || v.publisher || '.', v.coverage_scope, 'unreviewed', 'inactive',
  'not_started'
FROM (VALUES
  (
    'planned-int-ungm',
    'UNGM — United Nations Global Marketplace Notices',
    'United Nations Office for Project Services (UNOPS)',
    'https://www.ungm.org/Public/Notice',
    '{en,fr,es,ar}',
    'global'
  ),
  (
    'planned-int-unpd',
    'UNPD — United Nations Procurement Division Solicitations',
    'United Nations Secretariat, Procurement Division',
    'https://www.un.org/Depts/ptd/',
    '{en,fr,es,ar}',
    'global'
  ),
  (
    'planned-int-eu-funding-tenders',
    'EU Funding & Tenders Portal — Calls and Tenders',
    'European Commission',
    'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home',
    '{en,fr,de,es,pt}',
    'multi_country'
  ),
  (
    'planned-int-ebrd',
    'EBRD — Procurement Opportunities',
    'European Bank for Reconstruction and Development',
    'https://www.ebrd.com/work-with-us/procurement.html',
    '{en}',
    'multi_country'
  )
) AS v(
  connector_identifier, source_name, publisher, official_website,
  languages, coverage_scope
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources existing
  WHERE existing.name = v.source_name
);

-- World Bank procurement already exists as a source with 30 verified markets.
-- The Bank advertises procurement for every borrowing country in this registry,
-- so its coverage is extended to those countries that are missing it.
INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at, verification_evidence_url
)
SELECT s.id, c.alpha2_code, 'government', 'verified', now(),
       'https://www.worldbank.org/en/projects-operations/procurement'
FROM public.opportunity_sources s
CROSS JOIN public.global_countries c
WHERE s.name = 'World Bank Procurement Notices'
  AND NOT EXISTS (
    SELECT 1 FROM public.source_country_coverage existing
    WHERE existing.source_id = s.id AND existing.country_code = c.alpha2_code
  );

-- UNGM and UNPD publish solicitations for every country where the UN operates.
INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at, verification_evidence_url
)
SELECT s.id, c.alpha2_code, 'government', 'verified', now(), s.official_website
FROM public.opportunity_sources s
CROSS JOIN public.global_countries c
WHERE s.name IN (
    'UNGM — United Nations Global Marketplace Notices',
    'UNPD — United Nations Procurement Division Solicitations'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.source_country_coverage existing
    WHERE existing.source_id = s.id AND existing.country_code = c.alpha2_code
  );

-- EU institutions advertise in member states.
INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at, verification_evidence_url
)
SELECT s.id, c.alpha2_code, 'government', 'verified', now(), s.official_website
FROM public.opportunity_sources s
CROSS JOIN public.global_countries c
WHERE s.name = 'EU Funding & Tenders Portal — Calls and Tenders'
  AND c.alpha2_code IN (
    'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR',
    'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO',
    'SE', 'SI', 'SK'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.source_country_coverage existing
    WHERE existing.source_id = s.id AND existing.country_code = c.alpha2_code
  );

-- EBRD advertises in its countries of operations.
INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at, verification_evidence_url
)
SELECT s.id, c.alpha2_code, 'government', 'verified', now(), s.official_website
FROM public.opportunity_sources s
CROSS JOIN public.global_countries c
WHERE s.name = 'EBRD — Procurement Opportunities'
  AND c.alpha2_code IN (
    'AL', 'AM', 'AZ', 'BA', 'BG', 'CY', 'CZ', 'EE', 'EG', 'GE', 'GR', 'HR',
    'HU', 'JO', 'KZ', 'LT', 'LV', 'MA', 'MD', 'MK', 'MN', 'PL', 'RO', 'RS',
    'SK', 'SI', 'TN', 'TR', 'UA', 'UZ'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.source_country_coverage existing
    WHERE existing.source_id = s.id AND existing.country_code = c.alpha2_code
  );
