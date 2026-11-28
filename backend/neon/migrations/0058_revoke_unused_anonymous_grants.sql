-- Depends on migrations 0001-0057.
--
-- The public marketing site no longer queries the database at all: figures come
-- from the build-time snapshot (public/platform-stats.json), share reads go
-- through the Pages Function, and share creation is a server route that verifies
-- the session. Every remaining grant to `anonymous` (and every base `PUBLIC`
-- grant) is therefore unused by unauthenticated visitors and is removed here.
--
-- `authenticated` keeps exactly the access it had: each object that was readable
-- through PUBLIC is granted to `authenticated` explicitly, so the workspace sees
-- the same rows as before (RLS still decides which rows).
--
-- `source_leads_public` deserves a specific note: it exposed 7,373 acquisition
-- leads — i.e. the provider identities the public site is no longer allowed to
-- publish — to any unauthenticated caller. It is internal data and is closed
-- here like the rest.

begin;

do $$
declare
  obj text;
  objects text[] := array[
    'global_countries',
    'currencies',
    'country_currencies',
    'country_languages',
    'languages',
    'opportunity_categories',
    'opportunity_types',
    'opportunity_analyses',
    'opportunity_versions',
    'coverage_override',
    'country_classification_mappings',
    'ingestion_funnel',
    'market_intelligence_summary',
    'opportunity_dedupe_suspects',
    'coverage_truth',
    'source_country_coverage',
    'country_lead_summary',
    'country_live_summary',
    'country_source_live_status',
    'source_leads_public',
    'source_live_status',
    'public_platform_stats',
    'public_market_coverage',
    'public_region_coverage',
    'opportunity_source_links'
  ];
  has_anon boolean := exists (select 1 from pg_roles where rolname = 'anon');
  has_authenticated boolean := exists (select 1 from pg_roles where rolname = 'authenticated');
begin
  foreach obj in array objects loop
    if to_regclass('public.' || obj) is null then
      continue;
    end if;

    execute format('revoke select on public.%I from public', obj);
    execute format('revoke select on public.%I from anonymous', obj);
    if has_anon then
      execute format('revoke select on public.%I from anon', obj);
    end if;
    if has_authenticated then
      execute format('grant select on public.%I to authenticated', obj);
    end if;
  end loop;
end $$;

-- The share function is executed by the server role that owns the Pages
-- Function, not by anonymous visitors, so its public execute grant is removed.
do $$
begin
  if to_regprocedure('public.get_shared_notice(uuid)') is not null then
    revoke execute on function public.get_shared_notice(uuid) from public;
    revoke execute on function public.get_shared_notice(uuid) from anonymous;
    if exists (select 1 from pg_roles where rolname = 'anon') then
      revoke execute on function public.get_shared_notice(uuid) from anon;
    end if;
  end if;

  if to_regprocedure('public.get_sources_coverage_summary()') is not null then
    revoke execute on function public.get_sources_coverage_summary() from public;
    revoke execute on function public.get_sources_coverage_summary() from anonymous;
    if exists (select 1 from pg_roles where rolname = 'anon') then
      revoke execute on function public.get_sources_coverage_summary() from anon;
    end if;
  end if;
end $$;

commit;
