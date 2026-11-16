-- Depends on migrations 0001-0018.
-- The OCP bulk connector fetches its HTTPS dataset endpoint programmatically
-- like any REST API, so its access method must be 'api': the scheduler's
-- eligibility check only accepts ('api', 'feed', 'permitted_web').

UPDATE public.opportunity_sources
SET access_method = 'api'
WHERE connector_identifier = 'ocp-bulk-uganda'
  AND access_method = 'download';