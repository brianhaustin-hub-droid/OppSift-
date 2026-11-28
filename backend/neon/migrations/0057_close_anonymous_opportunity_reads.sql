-- Depends on migrations 0001-0056.
--
-- Closes anonymous access to opportunity records and replaces it with two
-- narrow, explicit public surfaces:
--
--   1. `public_platform_stats`, `public_market_coverage` and
--      `public_region_coverage` — aggregate-only views for the marketing site.
--      They return counts, coverage dates and market names, never a notice.
--   2. `public.get_shared_notice(uuid)` — a single notice, and only when an
--      authenticated owner has explicitly created a share link for it.
--
-- Before this migration the `opportunities` table was readable by `PUBLIC` and
-- `anonymous` through `verified_opportunities_public_read`, so a signed-out
-- caller with the Data API endpoint could page through 2,513 verified notices,
-- including buyers, reference numbers, values and deadlines. A client-side route
-- guard does not close that path; this migration does.

begin;

-- 1. Explicit share links ---------------------------------------------------
create table if not exists public.opportunity_share_links (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

comment on table public.opportunity_share_links is
  'Explicit, revocable authorisation for one opportunity to be readable at /o/<opportunity id>. No row means no public access.';

create unique index if not exists opportunity_share_links_active_opportunity_idx
  on public.opportunity_share_links (opportunity_id)
  where revoked_at is null;

alter table public.opportunity_share_links enable row level security;

drop policy if exists opportunity_share_links_owner_all on public.opportunity_share_links;
create policy opportunity_share_links_owner_all on public.opportunity_share_links
  for all to authenticated
  using (created_by = auth.user_id()::uuid)
  with check (created_by = auth.user_id()::uuid);

revoke all on public.opportunity_share_links from public;
revoke all on public.opportunity_share_links from anonymous;
grant select, insert, update, delete on public.opportunity_share_links to authenticated;

-- 2. Single shared notice, by explicit share only ---------------------------
create or replace function public.get_shared_notice(p_opportunity_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  category_code text,
  opportunity_type_code text,
  country_code text,
  region text,
  city text,
  buyer_name text,
  reference_number text,
  published_at timestamptz,
  closing_at timestamptz,
  time_zone text,
  status text,
  currency_code text,
  published_amount numeric,
  source_name text,
  source_url text,
  last_verified_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.title,
    o.description,
    o.category_code,
    o.opportunity_type_code,
    o.country_code,
    o.region,
    o.city,
    coalesce(o.buyer_name, o.issuing_institution, o.procuring_organization),
    o.reference_number,
    o.published_at,
    o.closing_at,
    o.time_zone,
    o.status,
    o.original_currency_code,
    o.published_amount,
    s.name,
    l.source_url,
    o.source_verified_at
  from public.opportunities o
  join public.opportunity_share_links sh
    on sh.opportunity_id = o.id
   and sh.revoked_at is null
  left join public.opportunity_source_links l on l.opportunity_id = o.id
  left join public.opportunity_sources s on s.id = l.source_id
  where o.id = p_opportunity_id
    and o.data_quality_status = 'valid'
  limit 1;
$$;

comment on function public.get_shared_notice(uuid) is
  'Returns exactly one verified notice when an owner has an active share link for it; otherwise no row. Used by /o/<id>.';

revoke all on function public.get_shared_notice(uuid) from public;
grant execute on function public.get_shared_notice(uuid) to anonymous;
grant execute on function public.get_shared_notice(uuid) to authenticated;

-- 3. Remove the anonymous opportunity read ----------------------------------
drop policy if exists verified_opportunities_public_read on public.opportunities;

create policy opportunities_authenticated_read on public.opportunities
  for select to authenticated
  using (
    data_quality_status = 'valid'
    and source_verified_at is not null
    and public.opportunity_has_verified_source(id)
  );

revoke select on public.opportunities from public;
revoke select on public.opportunities from anonymous;
grant select on public.opportunities to authenticated;

-- Source records and provenance links carry the same restrictions: the record
-- payloads and titles are not public content, and a link is not a substitute
-- for an authorised notice.
revoke select on public.opportunity_source_records from public;
revoke select on public.opportunity_source_records from anonymous;

revoke select on public.opportunity_source_links from public;
revoke select on public.opportunity_source_links from anonymous;

-- The acquisition registry is internal: individual provider identities and
-- endpoints are not published. Aggregate counts are exposed by the views below.
revoke select on public.opportunity_sources from public;
revoke select on public.opportunity_sources from anonymous;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.opportunity_source_records to authenticated;
    grant select on public.opportunity_source_links to authenticated;
    grant select on public.opportunity_sources to authenticated;
  end if;
end $$;

-- 4. Safe public aggregates -------------------------------------------------
create or replace view public.public_platform_stats as
select
  (select count(*) from public.global_countries where alpha2_code ~ '^[A-Z]{2}$') as markets_registered,
  (select count(distinct country_code) from public.source_country_coverage) as markets_with_sources,
  (
    select count(distinct o.country_code)
    from public.opportunities o
    where o.data_quality_status = 'valid'
      and o.source_verified_at is not null
      and public.opportunity_has_verified_source(o.id)
  ) as markets_with_notices,
  (select count(*) from public.opportunity_sources) as sources_registered,
  (
    select count(*) from public.opportunity_sources
    where integration_status = 'operational'
  ) as sources_operational,
  (
    select count(*) from public.opportunity_sources
    where last_successful_retrieval > now() - interval '7 days'
  ) as sources_collected_7d,
  (select count(*) from public.opportunities) as notices_stored,
  (
    select count(*)
    from public.opportunities o
    where o.data_quality_status = 'valid'
      and o.source_verified_at is not null
      and public.opportunity_has_verified_source(o.id)
  ) as notices_verified,
  (select max(last_successful_retrieval) from public.opportunity_sources) as newest_collection_at;

comment on view public.public_platform_stats is
  'Aggregate platform figures for the public website. No notice, buyer or provider identity is exposed.';

create or replace view public.public_market_coverage as
select
  c.alpha2_code as code,
  c.name,
  c.region,
  coalesce(v.records, 0)::bigint as notices,
  coalesce(sc.sources, 0)::bigint as sources,
  coalesce(sc.active_sources, 0)::bigint as active_sources,
  ct.last_success_at
from public.global_countries c
left join (
  select o.country_code, count(*) as records
  from public.opportunities o
  where o.data_quality_status = 'valid'
    and o.source_verified_at is not null
    and public.opportunity_has_verified_source(o.id)
  group by o.country_code
) v on v.country_code = c.alpha2_code
left join (
  select
    scc.country_code,
    count(*) as sources,
    count(*) filter (
      where s.activation_status = 'active' and s.integration_status = 'operational'
    ) as active_sources
  from public.source_country_coverage scc
  join public.opportunity_sources s on s.id = scc.source_id
  group by scc.country_code
) sc on sc.country_code = c.alpha2_code
left join public.coverage_truth ct on ct.code = c.alpha2_code;

comment on view public.public_market_coverage is
  'Per-market aggregate coverage for the public markets table: notice counts, linked sources and newest collection date.';

create or replace view public.public_region_coverage as
select
  coalesce(region, 'International') as region,
  count(*) as markets,
  count(*) filter (where notices > 0) as markets_with_notices,
  sum(notices)::bigint as notices
from public.public_market_coverage
group by 1;

comment on view public.public_region_coverage is
  'Regional roll-up of public market coverage counts.';

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anonymous') then
    grant select on public.public_platform_stats to anonymous;
    grant select on public.public_market_coverage to anonymous;
    grant select on public.public_region_coverage to anonymous;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.public_platform_stats to authenticated;
    grant select on public.public_market_coverage to authenticated;
    grant select on public.public_region_coverage to authenticated;
  end if;
end $$;

commit;
