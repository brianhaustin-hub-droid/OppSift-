-- Depends on migrations 0001-0042.
-- Replaces the hardcoded 48-country base in coverage_truth with a dynamic
-- union of every country known to the database. New countries/sources added
-- by later migrations now appear automatically in /markets and /discover,
-- with no frontend or migration edits.
--
-- Also adds a single DB-derived market summary so the frontend can stop
-- rendering hardcoded "0 live opportunities / 0 verified sources" metrics.

create or replace view public.coverage_truth as
with base as (
  select alpha2_code as code
  from public.global_countries
  where alpha2_code ~ '^[A-Z]{2}$'
  union
  select distinct country_code as code
  from public.source_country_coverage
  where country_code ~ '^[A-Z]{2}$'
  union
  select distinct country_code as code
  from public.opportunities
  where country_code ~ '^[A-Z]{2}$'
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
  ) as record_count,
  (
    select count(*)
    from public.source_country_coverage scc
    where scc.country_code = b.code
  ) as source_count,
  (
    select count(*)
    from public.source_country_coverage scc
    join public.opportunity_sources s on s.id = scc.source_id
    where scc.country_code = b.code
      and s.activation_status = 'active'
      and s.integration_status = 'operational'
  ) as active_source_count,
  (
    select count(*)
    from public.source_country_coverage scc
    join public.opportunity_sources s on s.id = scc.source_id
    where scc.country_code = b.code
      and s.reliability_status = 'verified'
  ) as verified_source_count
from base b;

grant select on public.coverage_truth to public;

-- One row of database-derived facts for the public site and workspace.
create or replace view public.market_intelligence_summary as
select
  (select count(*) from public.opportunity_sources) as total_sources,
  (select count(*) from public.opportunity_sources where activation_status = 'active' and integration_status = 'operational') as active_sources,
  (select count(*) from public.opportunity_sources where reliability_status = 'verified') as verified_sources,
  (select count(*) from public.opportunity_sources where connector_identifier is not null) as connector_ready_sources,
  (select count(distinct country_code) from public.source_country_coverage) as countries_with_sources,
  (select count(*) from public.opportunities) as stored_opportunities,
  (select count(distinct country_code) from public.opportunities) as countries_with_records,
  (select count(*) from public.coverage_truth where status = 'live') as live_countries,
  (select count(*) from public.coverage_truth where status = 'monitored') as monitored_countries,
  (select max(finished_at) from public.ingestion_runs where status in ('succeeded', 'completed_with_review')) as last_ingestion_at;

grant select on public.market_intelligence_summary to public;
