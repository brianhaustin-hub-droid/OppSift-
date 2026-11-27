-- Depends on migrations 0001-0054.
-- Two fixes found by actually reading the probe results:
--
-- 1. A source can answer HTTP 200 and still be silent. Several catalogued
--    "feed" URLs return an HTML tender listing, which a browser can read and a
--    connector cannot. The check now stores the response content type, so the
--    UI can say "answered with an HTML page, no machine feed" instead of
--    implying a working data feed.
--
-- 2. Two registered URLs failed only because they pointed at the wrong host:
--      www.ppra.go.ke  → certificate expired, https://ppra.go.ke/ answers 200
--      vra.com/...     → TLS handshake alert, https://www.vra.com/ answers 200
--    Both replacements were requested directly and returned a usable response
--    before this migration was written. No other URL is changed here: a host
--    that does not resolve is not repaired by guessing a new domain, it is
--    listed for publisher outreach instead.

alter table public.source_live_checks
  add column if not exists content_type text;

comment on column public.source_live_checks.content_type is
  'Content-Type the endpoint sent, when one was returned. Used to tell a machine feed from an HTML page.';

update public.opportunity_sources
set official_website = 'https://ppra.go.ke/'
where official_website = 'https://www.ppra.go.ke/';

update public.opportunity_sources
set official_website = 'https://www.vra.com/media/tenders.php'
where official_website = 'https://vra.com/media/tenders.php';

-- Postgres can only append columns to a replaced view, so the existing columns
-- keep their position and the payload columns follow.
create or replace view public.source_live_status as
with latest as (
  select distinct on (source_id, target_kind)
    id, source_id, target_kind, target_url, final_url, outcome, http_status,
    latency_ms, checked_at, error_message, content_type
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
    source_id, target_kind, target_url, http_status, latency_ms, checked_at, content_type
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
  an.checked_at as answered_checked_at,
  n.content_type as last_content_type,
  an.content_type as answered_content_type
from public.opportunity_sources s
join newest n on n.source_id = s.id and n.position = 1
join aggregated a on a.source_id = s.id
left join answered an on an.source_id = s.id;

comment on view public.source_live_status is
  'Newest live check per source, the newest answered endpoint, and the payload each returned.';

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
  st.answered_checked_at,
  st.last_content_type,
  st.answered_content_type
from public.source_country_coverage scc
join public.source_live_status st on st.source_id = scc.source_id;

comment on view public.country_source_live_status is
  'Live check status of every source registered against a country, including endpoint and payload.';
