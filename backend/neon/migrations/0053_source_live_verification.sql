-- Depends on migrations 0001-0052.
-- Live verification of every registered source.
--
-- Why: the catalogue holds 180 publishers across 101 countries, but the app
-- could only say "registered" or "verified at registration time". That is a
-- claim about a moment in the past, not evidence about now. This table stores
-- the result of an actual HTTP request to each source's registered endpoint
-- (its API/feed URL first, then its official website) so a country and a
-- source can show what really happened at a known time.
--
-- What a check proves: the publisher's registered URL answered and in what
-- state. What it does NOT prove: that notices are being ingested. Ingestion
-- still requires a connector and stored records, which `coverage_truth` and
-- `ingestion_runs` report separately. Nothing here changes a source's
-- reliability, licensing or terms status, and nothing is written for a URL
-- that was not requested.
--
-- Checks are append-only: the newest row per target is the current status and
-- the older rows remain as the verification history.

create table if not exists public.source_live_checks (
  id bigserial primary key,
  source_id uuid not null references public.opportunity_sources (id) on delete cascade,
  target_kind text not null check (target_kind in ('feed', 'website')),
  target_url text not null check (target_url ~ '^https://'),
  checked_at timestamptz not null default now(),
  outcome text not null check (outcome in ('answered', 'blocked', 'unreachable', 'error')),
  http_status integer,
  latency_ms integer,
  final_url text,
  error_message text,
  checked_by text not null default 'liveness-probe',
  check (outcome <> 'answered' or http_status is not null)
);

comment on table public.source_live_checks is
  'Append-only HTTP checks of each source''s registered endpoint. Reachability evidence only, not ingestion proof.';

comment on column public.source_live_checks.outcome is
  'answered = server replied; blocked = automated access refused (401/403/407/429); unreachable = no response; error = replied with a failure status.';

create index if not exists source_live_checks_source_idx
  on public.source_live_checks (source_id, checked_at desc);

create index if not exists source_live_checks_checked_at_idx
  on public.source_live_checks (checked_at desc);

-- One row per source: the newest check for each target kind plus a count of how
-- many of those targets answered. `age_seconds` lets the UI say how old the
-- evidence is instead of implying it is current.
create or replace view public.source_live_status as
with latest as (
  select distinct on (source_id, target_kind)
    id, source_id, target_kind, target_url, final_url, outcome, http_status,
    latency_ms, checked_at
  from public.source_live_checks
  order by source_id, target_kind, checked_at desc, id desc
),
newest as (
  select
    latest.*,
    row_number() over (partition by source_id order by checked_at desc, id desc) as position
  from latest
),
aggregated as (
  select
    source_id,
    count(*)::int as probed_targets,
    count(*) filter (where outcome = 'answered')::int as answered_targets,
    max(checked_at) filter (where outcome = 'answered') as last_answered_at
  from latest
  group by source_id
)
select
  s.id as source_id,
  s.name as source_name,
  s.publisher,
  s.official_website,
  n.checked_at as last_checked_at,
  n.outcome as last_outcome,
  n.http_status as last_http_status,
  n.latency_ms as last_latency_ms,
  n.target_url as last_target_url,
  n.target_kind as last_target_kind,
  n.final_url as last_final_url,
  a.probed_targets,
  a.answered_targets,
  a.last_answered_at,
  greatest(0, extract(epoch from (now() - n.checked_at)))::int as age_seconds
from public.opportunity_sources s
join newest n on n.source_id = s.id and n.position = 1
join aggregated a on a.source_id = s.id;

comment on view public.source_live_status is
  'Newest live check per source with target coverage and evidence age.';

-- The country page needs the same rows keyed by country, in one read.
create or replace view public.country_source_live_status as
select
  scc.country_code,
  st.source_id,
  st.source_name,
  st.publisher,
  st.official_website,
  st.last_checked_at,
  st.last_outcome,
  st.last_http_status,
  st.last_latency_ms,
  st.last_target_url,
  st.last_target_kind,
  st.last_final_url,
  st.probed_targets,
  st.answered_targets,
  st.last_answered_at,
  st.age_seconds
from public.source_country_coverage scc
join public.source_live_status st on st.source_id = scc.source_id;

comment on view public.country_source_live_status is
  'Live check status of every source registered against a country.';

create or replace view public.country_live_summary as
with pairs as (
  select distinct country_code, source_id
  from public.source_country_coverage
),
joined as (
  select
    pairs.country_code,
    pairs.source_id,
    st.last_checked_at,
    st.answered_targets
  from pairs
  left join public.source_live_status st on st.source_id = pairs.source_id
)
select
  country_code,
  count(*)::int as source_count,
  count(*) filter (where last_checked_at is not null)::int as checked_count,
  count(*) filter (where coalesce(answered_targets, 0) > 0)::int as answered_count,
  count(*) filter (where last_checked_at is not null and coalesce(answered_targets, 0) = 0)::int as failed_count,
  max(last_checked_at) as last_checked_at,
  greatest(0, extract(epoch from (now() - max(last_checked_at))))::int as age_seconds
from joined
group by country_code;

comment on view public.country_live_summary is
  'Per-country roll-up of live source checks: how many registered sources were probed and answered.';

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anonymous') then
    grant select on public.source_live_status to anonymous;
    grant select on public.country_source_live_status to anonymous;
    grant select on public.country_live_summary to anonymous;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on public.source_live_status to anon;
    grant select on public.country_source_live_status to anon;
    grant select on public.country_live_summary to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.source_live_status to authenticated;
    grant select on public.country_source_live_status to authenticated;
    grant select on public.country_live_summary to authenticated;
  end if;
end $$;
