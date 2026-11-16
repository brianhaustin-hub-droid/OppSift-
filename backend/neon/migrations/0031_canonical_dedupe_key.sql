-- Depends on migrations 0001-0030.

-- P0 Stage 0 (2026-11-15): Canonical notice key (dedupe at insert time).
-- Cross-source dedupe already exists at insert time for the SAME url
-- (repository matches canonical_url + country + category + type under an
-- advisory lock and attaches the second source's record to the first
-- opportunity). The residual gap: the same notice published at a DIFFERENT
-- url by a different source (e.g. the OCP mirror vs the national portal)
-- still creates a duplicate opportunity.
--
-- Fix: a versioned, nullable dedupe_key derived from notice identity
-- (country + normalized title + normalized buyer + closing date bucket),
-- matched in the same advisory-locked section as canonical_url.
--
-- Deliberately conservative: false merges are worse than false duplicates
-- for this product, so the key is computed only when title + buyer +
-- country are all present, and it is never unique-enforced at the index
-- level — dedupe is attach-via-match under the existing advisory lock
-- pattern, consistent with how canonical_url dedupe already works.
-- Backfill happens later in code; no backfill in this migration.

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS dedupe_key text
  CHECK (dedupe_key IS NULL OR dedupe_key ~ '^dk1_[a-f0-9]{16}$');

CREATE INDEX IF NOT EXISTS opportunities_dedupe_key_idx
  ON public.opportunities (country_code, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Diagnostic: notices that look like duplicates across urls, for QA review.
-- Reuses the existing duplicate-candidates review flow's spirit, but is a
-- cheap read-only view rather than a maintained table.
CREATE OR REPLACE VIEW public.opportunity_dedupe_suspects AS
SELECT
  a.id AS opportunity_id_a,
  b.id AS opportunity_id_b,
  a.country_code,
  a.dedupe_key,
  a.canonical_url AS url_a,
  b.canonical_url AS url_b,
  a.title AS title_a,
  b.title AS title_b,
  a.closing_at AS closing_a,
  b.closing_at AS closing_b
FROM public.opportunities a
JOIN public.opportunities b
  ON b.country_code = a.country_code
 AND b.dedupe_key = a.dedupe_key
 AND b.id > a.id;

GRANT SELECT ON public.opportunity_dedupe_suspects TO PUBLIC;

-- Migration complete. Ledger updated by apply-pending-migrations runner.
