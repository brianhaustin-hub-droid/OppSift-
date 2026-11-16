# Africa-first MVP execution plan

**Goal:** Launch OppSift with African markets as the highest-quality, most trusted coverage (best data, verified/permitted sources, clear provenance and freshness), while other global markets remain available in scope but may be less complete at launch.

**Principle:** Do not claim a market/source as live, verified, or operational without evidence (publisher/terms/permissions), a working tested connector, and stored records with provenance. Coverage status must be data-derived (`coverage_truth`), not marketing copy.

## Current African target scope (in-repo)

The frontend/research registry currently includes these African markets:

- **East Africa:** Kenya (KE), Uganda (UG), Tanzania (TZ), Rwanda (RW), Burundi (BI), Ethiopia (ET), South Sudan (SS)
- **West Africa:** Nigeria (NG), Ghana (GH), Liberia (LR), Sierra Leone (SL), Côte d'Ivoire (CI), Benin (BJ), Senegal (SN), Gambia (GM), Niger (NE), Burkina Faso (BF)
- **Southern Africa:** Mauritius (MU), Zambia (ZM), South Africa (ZA), Botswana (BW), Namibia (NA), Madagascar (MG), Malawi (MW), Mozambique (MZ)

**Priority additions (owner-directed, to strengthen "best in Africa"):** Egypt (EG), Morocco (MA) — added to target/research scope in this step; source research, permissions, and integration remain pending.

## Phase 1 — Baseline and truth (now)
1. **Connect and verify dev runtime:** configure local (gitignored) `VITE_NEON_*` to the **development** Neon branch only; use `/backend-status` to confirm Auth/Data API reachability and anonymous tenant denial. No credentials in repo/frontend.
2. **Confirm what is actually live in dev:** inspect `coverage_truth`, active `opportunity_sources`, and `opportunities` for African markets; compare with Markets/Dashboard/Discover. Treat empty/unavailable states as truthful.
3. **Operationalize ingestion end-to-end (dev) for a beachhead slice:** pick 2–3 African markets with the strongest permitted/public-access candidates (Cat A/B) and bring each through: permission/terms evidence → approved+active source config → working connector/run → stored records with provenance → visible in Discover with correct freshness.

## Phase 2 — Africa beachhead excellence (MVP bar)
- Achieve **best-available verified coverage** per beachhead market across government procurement, grants/funding, and commercial (where permissible/public): named official sources, documented access/attribution, reliable refresh, and change/freshness visibility.
- Normalize and map local terminology to global categories while preserving original source terms/values.
- Harden trust UX: source links/provenance, "as of"/freshness, and honest empty/monitored states (no fabricated data).
- Complete auth/tenancy basics needed for launch: verified account flows and two-account RLS checks on dev; server-backed persistence for core user actions when ready.

## Phase 3 — Expand African depth, keep global available
- Replicate the verified-source playbook across remaining African target markets (add further high-value African markets as directed, e.g. Tunisia, Algeria, Cameroon, etc., only with evidence).
- Keep non-African/global markets in discovery/scope as available; prioritize completeness/freshness SLAs for Africa first per launch positioning.

## Source onboarding checklist (every source, no shortcuts)
- [ ] Identify official publisher and exact dataset/feed/page (evidence URL recorded).
- [ ] Classify access (Cat A/B preferred): public file/API/feed vs registration/credentials/permission required.
- [ ] Review and record terms, license/reuse, attribution, robots/access constraints, and retention/privacy considerations.
- [ ] Assess technical feasibility (format, pagination, stability, rate limits) with bounded, permitted checks only.
- [ ] Implement/test connector and mapping; run in dev; verify parsing, dedupe, provenance, and quality.
- [ ] Mark active/operational only after approval gates pass; monitor freshness and errors.

## Execution log
- **2026-11-16 (step 1):** Created Africa-first MVP plan. Added Egypt (EG) and Morocco (MA) to target/research scope (country registry, launch-countries doc, and source-catalog candidate leads) per owner direction; research/permission/integration pending. Next: verify dev runtime and identify first beachhead sources with stored live records.
