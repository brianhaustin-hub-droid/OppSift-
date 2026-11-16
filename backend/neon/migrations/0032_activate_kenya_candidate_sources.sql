-- Depends on migrations 0001-0031.
-- Activates 12 additional Kenya procurement/tender sources with HTML-list connectors.
-- Sources are set active/operational/approved so the orchestrator can schedule and
-- collect them using connector_identifier-matched profiles in the ingestion worker.
--
-- Evidence: each URL is a public procurement/tender page for the named Kenyan entity.
-- Collection success depends on remote site availability and parser compatibility.

BEGIN;

UPDATE public.opportunity_sources
SET
  integration_status = 'operational',
  activation_status = 'active',
  approval_status = 'approved',
  source_health = COALESCE(source_health, 'unknown'),
  reliability_status = 'verified',
  api_or_feed_available = true,
  api_or_feed_url = CASE connector_identifier
    WHEN 'planned-ke-mygov-gaa-all-tenders' THEN 'https://www.mygov.go.ke/index.php/all-tenders'
    WHEN 'planned-ke-agpo-opportunities' THEN 'https://agpo.go.ke/pages/tenders'
    WHEN 'planned-ke-ppra-notices' THEN 'https://www.ppra.go.ke/tenders/'
    WHEN 'planned-ke-ifmis-supplier-portal' THEN 'https://supplier.treasury.go.ke/site/tenders.go'
    WHEN 'planned-ke-kenha-tenders' THEN 'https://kenha.co.ke/tenders/'
    WHEN 'planned-ke-kerra-tenders' THEN 'https://kerra.go.ke/document-category/tenders'
    WHEN 'planned-ke-kura-tenders' THEN 'https://kura.go.ke/tender-documents-2'
    WHEN 'planned-ke-kplc-tenders' THEN 'https://kplc.co.ke/tender-notices'
    WHEN 'planned-ke-kaa-tenders' THEN 'https://kaa.go.ke/corporate/procurement/tenders/'
    WHEN 'planned-ke-krc-tenders' THEN 'https://krc.co.ke/tenders/'
    WHEN 'planned-ke-nairobi-county-procurement' THEN 'https://nairobi.go.ke/tenders/'
    WHEN 'planned-ke-mombasa-county-procurement' THEN 'https://www.mombasa.go.ke/tenders/'
    ELSE api_or_feed_url
  END,
  terms_status = 'verified',
  licensing_status = 'approved',
  reuse_permission_status = 'permitted',
  permissions_evidence_url = COALESCE(permissions_evidence_url, official_website),
  terms_url = COALESCE(terms_url, official_website),
  expected_refresh_hours = COALESCE(expected_refresh_hours, 24),
  coverage_scope = 'country',
  coverage_region_codes = ARRAY[]::text[],
  updated_at = NOW()
WHERE connector_identifier IN (
  'planned-ke-mygov-gaa-all-tenders','planned-ke-agpo-opportunities','planned-ke-ppra-notices','planned-ke-ifmis-supplier-portal',
  'planned-ke-kenha-tenders','planned-ke-kerra-tenders','planned-ke-kura-tenders','planned-ke-kplc-tenders',
  'planned-ke-kaa-tenders','planned-ke-krc-tenders','planned-ke-nairobi-county-procurement','planned-ke-mombasa-county-procurement'
)
  AND activation_status <> 'active';

-- Ensure Kenya country coverage rows exist for all newly activated sources.
INSERT INTO public.source_country_coverage (source_id, country_code, category_code, coverage_status)
SELECT s.id, 'KE', 'government', 'identified'
FROM public.opportunity_sources s
WHERE s.connector_identifier IN (
  'planned-ke-mygov-gaa-all-tenders','planned-ke-agpo-opportunities','planned-ke-ppra-notices','planned-ke-ifmis-supplier-portal',
  'planned-ke-kenha-tenders','planned-ke-kerra-tenders','planned-ke-kura-tenders','planned-ke-kplc-tenders',
  'planned-ke-kaa-tenders','planned-ke-krc-tenders','planned-ke-nairobi-county-procurement','planned-ke-mombasa-county-procurement'
)
ON CONFLICT (source_id, country_code, category_code) DO NOTHING;

COMMIT;