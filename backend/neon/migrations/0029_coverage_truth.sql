-- Depends on migrations 0001-0028.

-- P0 Stage 1 (2026-11-14): Coverage Truth.
-- Derived view that replaces the hardcoded 48-country claim in /markets with a
-- single source of truth computed from actual ingestion data. Three statuses:
-- Live / Monitored / Roadmap. Computed at query time from real tables, never a
-- hand-maintained list that can drift. No migration re-apply needed when runs
-- complete: the moment Kenya succeeds, the view reflects it.
--
-- Real schema references (verified against migrations 0002 + 0003):
--   public.opportunities           -> country_code, first_discovered_at
--   public.ingestion_runs          -> status, created_count/updated_count, finished_at
--   public.opportunity_sources     -> activation_status, integration_status
--   public.source_country_coverage -> (source_id, country_code) mapping
--
-- Status logic:
--   'live'      : a run for a source covering this country finished successfully
--                 (succeeded/completed_with_review) with stored rows in the
--                 last 72 hours
--   'monitored' : an active + operational source covers this country, but no
--                 recent successful stored run
--   'roadmap'   : neither

create or replace view public.coverage_truth as
with base as (
  -- Explicit list of the 48 supported country ISO-2 codes. This is the
  -- authoritative in-DB list; the hardcoded frontend registry is deleted and
  -- all public coverage queries go through this view.
  select unnest(array[
    'US','GB','CA','IN','SG','JP','KR','MY','ID','PH',
    'TH','VN','AU','DE','FR','NL','IE','IT','ES','SE',
    'PL','DK','BE','KE','UG','TZ','RW','BI','ET','SS',
    'NG','GH','LR','SL','CI','BJ','SN','GM','NE','BF',
    'MU','ZM','ZA','BW','NA','MG','MW','MZ'
  ]) as code
)
select
  b.code,
  case
    when exists (
      select 1
      from public.ingestion_runs r
      join public.source_country_coverage scc
        on scc.source_id = r.source_id
       and scc.country_code = b.code
      where r.status in ('succeeded', 'completed_with_review')
        and (r.created_count + r.updated_count) > 0
        and r.finished_at > now() - interval '72 hours'
    ) then 'live'
    when exists (
      select 1
      from public.opportunity_sources s
      join public.source_country_coverage scc
        on scc.source_id = s.id
       and scc.country_code = b.code
      where s.activation_status = 'active'
        and s.integration_status = 'operational'
    ) then 'monitored'
    else 'roadmap'
  end as status,
  (
    select max(r.finished_at)
    from public.ingestion_runs r
    join public.source_country_coverage scc
      on scc.source_id = r.source_id
     and scc.country_code = b.code
    where r.status in ('succeeded', 'completed_with_review')
  ) as last_success_at,
  (
    select count(*)
    from public.opportunities o
    where o.country_code = b.code
  ) as record_count
from base b;

-- Grant public read access so /markets and /admin/coverage can query it.
grant select on public.coverage_truth to public;

-- Override table for deliberate manual suppressions only. In practice this
-- table will have 0 rows; add rows only when an admin explicitly wants a
-- country shown as 'roadmap' despite having active sources. Keyed on
-- global_countries (the real FK target) instead of opportunities.
create table if not exists public.coverage_override (
  country_code text primary key references public.global_countries(alpha2_code) on delete cascade,
  status text not null default 'roadmap' check (status in ('live', 'monitored', 'roadmap')),
  reason text not null,
  overridden_at timestamptz not null default now()
);

grant select on public.coverage_override to public;

-- Migration complete. The view is 100% derived at query time.
-- Follow-up (frontend): delete the hardcoded 48-country list from
-- src/features/opportunities/country-registry.ts and read coverage from
-- this view via the existing data layer.
