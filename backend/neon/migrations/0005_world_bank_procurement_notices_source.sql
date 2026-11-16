-- Depends on migration 0004. This adds an inactive, unapproved registry
-- candidate only; it does not permit collection or customer display.

INSERT INTO public.opportunity_sources (
  id,
  name,
  publisher,
  official_website,
  source_category,
  source_type,
  access_method,
  api_or_feed_url,
  connector_identifier,
  api_or_feed_available,
  supported_categories,
  languages,
  publication_frequency,
  expected_refresh_hours,
  reliability_status,
  licensing_status,
  terms_status,
  permissions_evidence_url,
  license_url,
  terms_url,
  reuse_permission_status,
  attribution_requirements,
  retention_restrictions,
  coverage_scope,
  approval_status,
  activation_status,
  integration_status
)
SELECT
  '87c9b57a-2de4-447c-9b0f-255b0d484400'::uuid,
  'World Bank Procurement Notices',
  'World Bank Group',
  'https://www.worldbank.org',
  'multilateral',
  'api',
  'api',
  'https://search.worldbank.org/api/procnotices',
  'world-bank-procurement-notices',
  true,
  ARRAY['government']::text[],
  ARRAY['en']::text[],
  'Daily dataset metadata; global API cadence not independently verified',
  24,
  'verified',
  'review_required',
  'review_required',
  'https://datacatalog.worldbank.org/search/dataset/0037795/world-bank-procurement-notices',
  'https://creativecommons.org/licenses/by/4.0/',
  'https://www.worldbank.org/ext/en/legal/terms-conditions',
  'unknown',
  'Candidate attribution if CC BY 4.0 is confirmed to cover these API records: credit World Bank Group, link the dataset and license, indicate changes, and do not imply endorsement.',
  'Inactive pending review of API-specific terms, borrower-provided notice content, contact information in responses, and retention/privacy requirements.',
  'global',
  'unreviewed',
  'inactive',
  'in_development'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.opportunity_sources
  WHERE id = '87c9b57a-2de4-447c-9b0f-255b0d484400'::uuid
     OR name = 'World Bank Procurement Notices'
)
ON CONFLICT (id) DO NOTHING;
