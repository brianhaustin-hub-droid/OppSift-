-- Depends on migrations 0001-0051.
-- Per-country lead inventory.
--
-- Every country in the registry holds 3-6 registered sources. That is the
-- honest ceiling of publishers whose tender pages have actually been read; it
-- is not the number of organisations that buy in the market. This table stores
-- the wider inventory of *named buying functions* so the country page can show
-- the real depth of the market without pretending those leads are sources.
--
-- A lead is not a source. Nothing is ingested from a lead, no notice is
-- attributed to it, and it is never counted in `coverage_truth`, coverage
-- counts or the source catalogue. Promotion requires a confirmed publisher,
-- official tender URL, access method and reuse terms, then a connector and
-- stored records. `official_website` stays null until that URL has actually
-- been read, so the table cannot imply a link that was never checked.

create table if not exists public.source_leads (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.global_countries (alpha2_code) on delete cascade,
  name text not null,
  lead_kind text not null check (
    lead_kind in (
      'national_buyer',
      'central_agency',
      'state_owned_enterprise',
      'subnational',
      'sector_programme',
      'development_partner',
      'grants_funding',
      'commercial'
    )
  ),
  sector text not null,
  status text not null default 'unverified_lead' check (
    status in ('unverified_lead', 'in_review', 'promoted', 'rejected')
  ),
  official_website text,
  discovery_basis text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (country_code, name)
);

comment on table public.source_leads is
  'Named buying functions per country. Unverified leads only: not sources, not ingested, excluded from coverage.';

comment on column public.source_leads.official_website is
  'Null until a publisher URL has actually been read. A lead never implies a checked link.';

create index if not exists source_leads_country_sort_idx
  on public.source_leads (country_code, sort_order);

-- Public projection: the country page reads names, kind and sector only. The
-- discovery basis and review status stay internal.
create or replace view public.source_leads_public as
select
  id,
  country_code,
  name,
  lead_kind,
  sector,
  official_website,
  sort_order,
  status
from public.source_leads
where status in ('unverified_lead', 'in_review');

comment on view public.source_leads_public is
  'Public lead inventory per country: named buying functions that are not yet sources.';

create or replace view public.country_lead_summary as
select
  country_code,
  count(*)::int as lead_count,
  count(*) filter (where official_website is not null)::int as leads_with_url_count
from public.source_leads
where status in ('unverified_lead', 'in_review')
group by country_code;

comment on view public.country_lead_summary is
  'Number of unverified leads per country, read by the coverage table. Never added to source counts.';

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anonymous') then
    grant select on public.source_leads_public to anonymous;
    grant select on public.country_lead_summary to anonymous;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on public.source_leads_public to anon;
    grant select on public.country_lead_summary to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.source_leads_public to authenticated;
    grant select on public.country_lead_summary to authenticated;
  end if;
end $$;
