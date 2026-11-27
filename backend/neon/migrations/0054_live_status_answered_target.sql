-- Depends on migrations 0001-0053.
-- Shows which endpoint actually answered, not only the newest request.
--
-- A source is counted as answered when either its feed endpoint or its website
-- replied, so a source can be reachable while its newest check is a refusal
-- (for example a PNCP feed that needs query parameters while the website
-- answers 200). Reporting only the newest row made such a source read as
-- "No response" next to a country summary that counted it as answered.
--
-- These columns expose the newest *answered* check per source and the message
-- of the newest failed one, so the UI can describe both without guessing.
-- Postgres can only add columns at the end of a replaced view, so the original
-- columns keep their position and the new ones follow.

create or replace view public.source_live_status as
with latest as (
  select distinct on (source_id, target_kind)
    id, source_id, target_kind, target_url, final_url, outcome, http_status,
    latency_ms, checked_at, error_message
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
),
answered as (
  select distinct on (source_id)
    source_id, target_kind, target_url, http_status, latency_ms, checked_at
  from latest
  where outcome = 'answered'
  order by source_id, checked_at desc, id desc
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
  greatest(0, extract(epoch from (now() - n.checked_at)))::int as age_seconds,
  n.error_message as last_error_message,
  an.http_status as answered_http_status,
  an.latency_ms as answered_latency_ms,
  an.target_kind as answered_target_kind,
  an.target_url as answered_target_url,
  an.checked_at as answered_checked_at
from public.opportunity_sources s
join newest n on n.source_id = s.id and n.position = 1
join aggregated a on a.source_id = s.id
left join answered an on an.source_id = s.id;

comment on view public.source_live_status is
  'Newest live check per source plus the newest answered endpoint, target coverage and evidence age.';

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
  st.age_seconds,
  st.last_error_message,
  st.answered_http_status,
  st.answered_latency_ms,
  st.answered_target_kind,
  st.answered_target_url,
  st.answered_checked_at
from public.source_country_coverage scc
join public.source_live_status st on st.source_id = scc.source_id;

comment on view public.country_source_live_status is
  'Live check status of every source registered against a country, including the endpoint that answered.';
