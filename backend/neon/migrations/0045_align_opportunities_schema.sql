-- Aligns the production schema with the columns the development branch acquired
-- outside the migration ledger (opportunity_sources already matched). Idempotent.

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS canonical_key text;

CREATE UNIQUE INDEX IF NOT EXISTS opportunities_canonical_key_uidx
  ON public.opportunities (canonical_key)
  WHERE canonical_key IS NOT NULL;
