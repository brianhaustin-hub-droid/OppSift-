-- Depends on migrations 0001-0049.
-- Every opportunity needs an outbound link to the notice it was read from.
-- `opportunity_source_records.source_url` holds that link, but the table also
-- holds stored payloads, external identifiers and original titles, so it is not
-- granted to the public Data API at all.
--
-- This view exposes three columns only, and only for opportunities whose source
-- is approved, active and operational (the same gate the public opportunities
-- policy already applies). The client renders the link as "Open original
-- notice"; without it an opportunity is readable but not verifiable.

create or replace view public.opportunity_source_links as
select distinct on (r.opportunity_id)
  r.opportunity_id,
  r.source_id,
  r.source_url
from public.opportunity_source_records r
where r.source_url is not null
  and public.opportunity_has_verified_source(r.opportunity_id)
order by r.opportunity_id, r.last_seen_at desc nulls last;

comment on view public.opportunity_source_links is
  'Public provenance link for each verified opportunity: opportunity id, source id and the issuing notice URL.';

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anonymous') then
    grant select on public.opportunity_source_links to anonymous;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on public.opportunity_source_links to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.opportunity_source_links to authenticated;
  end if;
end $$;
