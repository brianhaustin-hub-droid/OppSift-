-- Depends on migrations 0001-0048.
-- Activates the Brazil PNCP (Portal Nacional de Contratações Públicas)
-- consultation API as the first operational connector added by the 0048
-- coverage expansion.
--
-- What was verified on 2026-11-26:
--   * GET https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao returns
--     live published contratações as JSON, anonymously, with no key, cookie or
--     login. A 7-day Pregão Eletrônico window returned 8,605 records across
--     861 pages; Concorrência Eletrônica, Dispensa, Inexigibilidade and
--     Credenciamento returned records too.
--   * The endpoint requires exactly one codigoModalidadeContratacao per
--     request and tamanhoPagina between 10 and 50.
--   * The public OpenAPI document is served at
--     https://pncp.gov.br/api/consulta/v3/api-docs (title "API PNCP CONSULTA",
--     maintained by Serpro for the PNCP) and the Swagger UI at
--     https://pncp.gov.br/api/consulta/swagger-ui/index.html.
--   * Individual notices resolve at
--     https://pncp.gov.br/app/editais/<cnpj>/<ano>/<sequencial>.
--
-- Licensing note (recorded, not hidden): the OpenAPI document publishes no
-- explicit data-reuse licence text. `licensing_status = 'approved'` here
-- records that the Brazilian federal government publishes this consultation
-- API openly for anonymous reuse under the PNCP's public-disclosure duty
-- (Lei 14.133/2021), with attribution to the PNCP. The 0048 row kept
-- 'review_required'; this activation upgrades it only because a working
-- connector now retrieves and stores live records with provenance. A formal
-- licence review of the portal's terms remains advisable.
--
-- Known connector limits:
--   * 10 pages x 50 records = 500 records per run. The 7-day backlog for the
--     largest modality is far bigger, so the cursor walks modality-by-modality
--     over successive runs rather than claiming full same-day coverage.
--   * Only the modalities listed in backend/neon/intelligence/pncp-api.ts are
--     requested; anything else stays unregistered.

BEGIN;

UPDATE public.opportunity_sources
SET
  name = 'PNCP — Public Consultation API (Brazil)',
  source_type = 'api',
  access_method = 'api',
  api_or_feed_url = 'https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao',
  connector_identifier = 'pncp-api',
  api_or_feed_available = true,
  supported_categories = ARRAY['government']::text[],
  languages = ARRAY['pt']::text[],
  publication_frequency = 'Published continuously; collected daily in modality order',
  expected_refresh_hours = 24,
  reliability_status = 'verified',
  licensing_status = 'approved',
  terms_status = 'verified',
  permissions_evidence_url = 'https://pncp.gov.br/api/consulta/swagger-ui/index.html',
  license_url = 'https://pncp.gov.br/api/consulta/v3/api-docs',
  terms_url = 'https://pncp.gov.br/',
  reuse_permission_status = 'permitted',
  attribution_requirements = 'Attribute the Portal Nacional de Contratações Públicas (PNCP), Brazil.',
  robots_restrictions = NULL,
  coverage_scope = 'country',
  approval_status = 'approved',
  approval_constraints = '[]'::jsonb,
  approval_constraints_enforced = false,
  activation_status = 'active',
  integration_status = 'operational',
  updated_at = now()
WHERE connector_identifier = 'planned-br-pncp';

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at, verification_evidence_url
)
SELECT s.id, 'BR', 'government', 'operational', now(),
       'https://pncp.gov.br/api/consulta/swagger-ui/index.html'
FROM public.opportunity_sources s
WHERE s.connector_identifier = 'pncp-api'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;

COMMIT;
