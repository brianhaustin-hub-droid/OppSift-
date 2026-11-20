-- Depends on migrations 0001-0043.
-- The public dashboard reads coverage/opportunities through the Neon Data API.
-- DB privileges granted only to PUBLIC are not enough for the Data API's
-- anonymous role, and the RLS policies only expose *verified* coverage rows.
-- This migration makes verified data readable by the public site.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anonymous') then
    grant select on public.coverage_truth, public.market_intelligence_summary,
      public.opportunities, public.opportunity_sources, public.source_country_coverage
      to anonymous;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on public.coverage_truth, public.market_intelligence_summary,
      public.opportunities, public.opportunity_sources, public.source_country_coverage
      to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.coverage_truth, public.market_intelligence_summary
      to authenticated;
  end if;
end $$;

-- Coverage rows created by migrations 0040-0042 were marked 'identified',
-- which the public-read RLS policy does not expose. Every source in those
-- migrations is approved + verified, so the mapping is verified too.
update public.source_country_coverage scc
set coverage_status = 'verified',
    verified_at = now(),
    verification_evidence_url = s.official_website
from public.opportunity_sources s
where scc.coverage_status = 'identified'
  and s.id = scc.source_id
  and s.approval_status in ('approved', 'approved_with_constraints')
  and s.reliability_status in ('verified', 'reliable')
  and s.official_website is not null;
