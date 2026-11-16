-- Depends on 0003_durable_ingestion_foundation.sql.
-- Adds an explicit expiry for source permission approvals. Null means no
-- expiry was supplied by the source reviewer; it does not bypass approval.

ALTER TABLE public.opportunity_sources
  ADD COLUMN approval_expires_at timestamptz;

CREATE INDEX opportunity_sources_approval_expiry
  ON public.opportunity_sources (approval_expires_at)
  WHERE approval_expires_at IS NOT NULL;
