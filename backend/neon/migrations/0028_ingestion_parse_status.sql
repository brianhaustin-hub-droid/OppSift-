-- Depends on migrations 0003-0027.

-- P0 follow-up (2026-11-14, per AI strategic critique): explicit parse-status
-- persistence so unclassified / partial parses are first-class outcomes and
-- never silently discarded.

-- 1) Parse-level outcome on canonical opportunities. Additive only; existing rows
--    default to 'parsed' (they were either accepted normalized records or legacy rows).
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS parse_status text NOT NULL DEFAULT 'parsed'
    CHECK (parse_status IN (
      'parsed', 'partial', 'unclassified', 'duplicate', 'accepted', 'rejected'
    ));

-- 2) Unclassified tracking: keep the existing quality_issues pathway authoritative for
--    unclassified source terms, and record parse status on the linked source records so
--    the QA queue can select unclassified items deterministically.

-- 3) Raw layer immutability guard: content-addressed raw retention is enforced through
--    raw_source_records.payload_checksum (sha-256) with first_seen_at/last_seen_at; no
--    destructive change here.

-- 4) No schema changes required for canonical notice aggregation yet; that lands with the
--    Kenya golden path (Stage 0 gate: 500 Kenya records stored and rendering on /discover).

-- Migration complete; ledger update handled by the apply-pending-migrations runner.
