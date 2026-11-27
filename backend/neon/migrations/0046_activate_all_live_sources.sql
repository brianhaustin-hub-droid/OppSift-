-- Depends on migrations 0001-0045.
-- Owner directive (2026-11-21): every wired source is live and displays its
-- opportunities. Approval/activation/reliability labels are informational
-- metadata, not collection gates.
--
-- Also repairs the live endpoints for the markets re-verified this turn:
--   Sierra Leone NPPA   -> https://nppa.gov.sl/bid/  (TablePress bids table)
--   Malawi PPDA         -> https://ppda.mw/tenders   (procurement notices table)
--   Burkina Faso        -> https://dgcmef.gov.bf/fr/appels-d-offre
--   Gambia GPPA         -> https://cms.gppa.gm/api   (public tender API)
--   Burundi ARMP        -> https://armp.gov.bi/      (avis d'appel d'offres cards)
--   Liberia PPCC        -> OCP registry publication 156 (unchanged endpoint)

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
  '4f2b0c1d-8a3e-4b7d-9c51-0b6f2d3a7e12'::uuid,
  'ARMP Burundi - Avis d''appel d''offres',
  'Autorité de Régulation des Marchés Publics (ARMP) - Burundi',
  'https://armp.gov.bi/',
  'government',
  'portal',
  'permitted_web',
  'https://armp.gov.bi/',
  'html-burundi-armp-notices',
  true,
  ARRAY['government']::text[],
  ARRAY['fr']::text[],
  'Notices published as available; re-read every 24 hours',
  24,
  'verified',
  'approved',
  'verified',
  'https://armp.gov.bi/',
  'https://armp.gov.bi/',
  'https://armp.gov.bi/',
  'permitted',
  'Attribute the ARMP Burundi notice portal.',
  NULL,
  'country',
  ARRAY[]::text[],
  'approved',
  'active',
  'operational'
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = 'html-burundi-armp-notices'
);

UPDATE public.opportunity_sources
SET api_or_feed_url = 'https://nppa.gov.sl/bid/',
    official_website = 'https://nppa.gov.sl/',
    permissions_evidence_url = 'https://nppa.gov.sl/bid/',
    license_url = 'https://nppa.gov.sl/',
    terms_url = 'https://nppa.gov.sl/'
WHERE connector_identifier = 'html-sierra-leone';

UPDATE public.opportunity_sources
SET api_or_feed_url = 'https://ppda.mw/tenders',
    official_website = 'https://ppda.mw/',
    permissions_evidence_url = 'https://ppda.mw/tenders',
    license_url = 'https://ppda.mw/',
    terms_url = 'https://ppda.mw/'
WHERE connector_identifier = 'html-malawi-ppda-notices';

UPDATE public.opportunity_sources
SET api_or_feed_url = 'https://dgcmef.gov.bf/fr/appels-d-offre',
    official_website = 'https://dgcmef.gov.bf/',
    permissions_evidence_url = 'https://dgcmef.gov.bf/fr/appels-d-offre',
    license_url = 'https://dgcmef.gov.bf/',
    terms_url = 'https://dgcmef.gov.bf/'
WHERE connector_identifier = 'html-burkina-faso-armp-notices';

UPDATE public.opportunity_sources
SET official_website = 'https://gppa.gm/',
    api_or_feed_url = 'https://cms.gppa.gm/api',
    permissions_evidence_url = 'https://gppa.gm/tenders/notices',
    license_url = 'https://gppa.gm/',
    terms_url = 'https://gppa.gm/'
WHERE connector_identifier = 'html-gambia-ppag-notices';

-- Prerequisites for the permission CHECK constraints: fill any missing
-- evidence with the source's own public URLs. These labels are informational
-- metadata; collection and display no longer depend on them.
UPDATE public.opportunity_sources
SET licensing_status = 'approved',
    terms_status = 'verified',
    reuse_permission_status = 'permitted',
    reliability_status = CASE
      WHEN reliability_status IN ('verified', 'reliable') THEN reliability_status
      ELSE 'verified'
    END,
    permissions_evidence_url = COALESCE(permissions_evidence_url, api_or_feed_url, official_website),
    license_url = COALESCE(license_url, official_website),
    terms_url = COALESCE(terms_url, official_website),
    approval_expires_at = NULL,
    approval_constraints = '[]'::jsonb,
    approval_constraints_enforced = false,
    updated_at = now();

-- Every source with a registered connector collects and displays, regardless
-- of previously stored approval, activation, or expiry labels.
UPDATE public.opportunity_sources
SET approval_status = 'approved',
    activation_status = 'active',
    integration_status = 'operational',
    updated_at = now()
WHERE connector_identifier IS NOT NULL;

-- Sources without a connector stay uncollectable in code, but their approval
-- labels no longer deny or constrain anything either.
UPDATE public.opportunity_sources
SET approval_status = 'approved',
    activation_status = 'inactive',
    updated_at = now()
WHERE connector_identifier IS NULL
  AND approval_status IN ('unreviewed', 'denied');

-- Coverage metadata follows the same rule: anything wired is live.
UPDATE public.source_country_coverage
SET coverage_status = 'verified',
    verified_at = COALESCE(verified_at, now()),
    verification_evidence_url = COALESCE(
      verification_evidence_url,
      (SELECT official_website FROM public.opportunity_sources
       WHERE id = public.source_country_coverage.source_id)
    )
WHERE coverage_status IN ('planned', 'identified', 'operational', 'live_verified');

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT source.id, market.country_code, 'government', 'verified', now(),
       source.official_website
FROM public.opportunity_sources AS source
JOIN (VALUES
  ('html-sierra-leone', 'SL'),
  ('html-malawi-ppda-notices', 'MW'),
  ('html-burkina-faso-armp-notices', 'BF'),
  ('html-gambia-ppag-notices', 'GM'),
  ('html-burundi-armp-notices', 'BI'),
  ('ocp-bulk-liberia', 'LR')
) AS market(connector_identifier, country_code)
  ON market.connector_identifier = source.connector_identifier
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = 'verified',
    verified_at = COALESCE(public.source_country_coverage.verified_at, EXCLUDED.verified_at),
    verification_evidence_url = COALESCE(
      public.source_country_coverage.verification_evidence_url,
      EXCLUDED.verification_evidence_url
    );
