-- Depends on migrations 0001-0055.
-- Group A: re-point the 8 sources whose registered host no longer resolves, after
-- the replacement portal answered over HTTPS with a real 2xx response.
--
-- Verification (all 8 probed 27 Nov 2026, HTTPS, no TLS weakening, 200 OK):
--   Burkina Faso ARMP  https://armp.gov.bf/        -> https://arcop.bf/            (agency renamed ARCOP)
--   Gambia PPAG        https://gppagal.gov.gm/     -> https://gppa.gm/
--   Malawi PPDA        https://ppdamlawi.org/      -> https://www.ppda.mw/
--   Namibia CPBN       https://cpbn.gov.na/        -> https://www.cpbn.com.na/
--   Xarid (Uzbekistan) https://xarid.mf.uz/        -> https://xarid.uzex.uz/
--   Niger ARMP         https://armp.ne/            -> https://www.marchespublics.ne/
--   Mozambique SISAC   https://sisac.mf.gov.mz/     -> https://ufsa.gov.mz/          (UFSA regulator site; original SISAC portal is gone)
--   Egypt GAGS         https://gags.gov.eg/        -> https://www.eps-gags.gov.eg/
--
-- Not re-pointed (no verified HTTPS replacement): Botswana PPRA, Egypt General
-- Contracting Portal, Helwan University, Madagascar DGCP. They remain outreach
-- items in docs/source-catalog/SOURCE_ACCESS_OUTREACH.md (Group A, unconfirmed).
--
-- official_website and api_or_feed_url are moved together only where they were
-- the same registered portal, so a re-pointed source keeps one consistent
-- target instead of a live website plus a dead feed URL.

update public.opportunity_sources
set official_website = 'https://arcop.bf/',
    api_or_feed_url = case when api_or_feed_url = 'https://armp.gov.bf/' then 'https://arcop.bf/' else api_or_feed_url end
where official_website = 'https://armp.gov.bf/';

update public.opportunity_sources
set official_website = 'https://gppa.gm/',
    api_or_feed_url = case when api_or_feed_url = 'https://gppagal.gov.gm/' then 'https://gppa.gm/' else api_or_feed_url end
where official_website = 'https://gppagal.gov.gm/';

update public.opportunity_sources
set official_website = 'https://www.ppda.mw/',
    api_or_feed_url = case when api_or_feed_url = 'https://ppdamlawi.org/' then 'https://www.ppda.mw/' else api_or_feed_url end
where official_website = 'https://ppdamlawi.org/';

update public.opportunity_sources
set official_website = 'https://www.cpbn.com.na/',
    api_or_feed_url = case when api_or_feed_url = 'https://cpbn.gov.na/' then 'https://www.cpbn.com.na/' else api_or_feed_url end
where official_website = 'https://cpbn.gov.na/';

update public.opportunity_sources
set official_website = 'https://xarid.uzex.uz/',
    api_or_feed_url = case when api_or_feed_url = 'https://xarid.mf.uz/' then 'https://xarid.uzex.uz/' else api_or_feed_url end
where official_website = 'https://xarid.mf.uz/';

update public.opportunity_sources
set official_website = 'https://www.marchespublics.ne/',
    api_or_feed_url = case when api_or_feed_url = 'https://armp.ne/' then 'https://www.marchespublics.ne/' else api_or_feed_url end
where official_website = 'https://armp.ne/';

update public.opportunity_sources
set official_website = 'https://ufsa.gov.mz/',
    api_or_feed_url = case when api_or_feed_url = 'https://sisac.mf.gov.mz/' then 'https://ufsa.gov.mz/' else api_or_feed_url end
where official_website = 'https://sisac.mf.gov.mz/';

update public.opportunity_sources
set official_website = 'https://www.eps-gags.gov.eg/',
    api_or_feed_url = case when api_or_feed_url = 'https://gags.gov.eg/' then 'https://www.eps-gags.gov.eg/' else api_or_feed_url end
where official_website = 'https://gags.gov.eg/';
