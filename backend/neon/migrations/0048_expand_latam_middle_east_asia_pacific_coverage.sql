-- Depends on migrations 0001-0047.
-- Expands coverage beyond Africa, the EU core, North America and the
-- Asia-Pacific markets registered earlier.
--
-- Every portal URL below was verified on 2026-11-25 against the publisher's own
-- site (or a national government page that links to it). These are catalogue
-- registrations, not ingestion claims: integration_status stays 'not_started'
-- and activation_status stays 'inactive' until a connector exists, a live
-- sample is retrieved and stored, and coverage_truth reports records.
--
-- Coverage rows are marked 'verified' because the publisher identity and the
-- official tender page were confirmed; they are not 'live_verified' or
-- 'operational'. Licensing and terms remain 'review_required'.
--
-- Known limits recorded here rather than hidden:
--   * United Arab Emirates — the registered page is the federal Ministry of
--     Finance listing; emirate-level entities publish through separate systems.
--   * Uzbekistan — xarid.mf.uz is the government-designated portal; a distinct
--     public tender-search URL was not confirmed.
--   * Portugal — BASE centralises contract information; Diário da República
--     remains the official announcement gazette.

INSERT INTO public.languages (tag, name) VALUES
  ('en', 'English'),
  ('pt', 'Portuguese'),
  ('es', 'Spanish'),
  ('ar', 'Arabic'),
  ('de', 'German'),
  ('no', 'Norwegian'),
  ('fi', 'Finnish'),
  ('cs', 'Czech'),
  ('ro', 'Romanian'),
  ('el', 'Greek'),
  ('hu', 'Hungarian'),
  ('bn', 'Bengali'),
  ('ur', 'Urdu'),
  ('si', 'Sinhala'),
  ('kk', 'Kazakh'),
  ('uz', 'Uzbek'),
  ('zh', 'Chinese'),
  ('mn', 'Mongolian')
ON CONFLICT (tag) DO NOTHING;

INSERT INTO public.currencies (code, name, minor_unit) VALUES
  ('EUR', 'Euro', 2),
  ('BRL', 'Brazilian real', 2),
  ('CLP', 'Chilean peso', 0),
  ('COP', 'Colombian peso', 2),
  ('PEN', 'Peruvian sol', 2),
  ('ARS', 'Argentine peso', 2),
  ('MXN', 'Mexican peso', 2),
  ('SAR', 'Saudi riyal', 2),
  ('AED', 'United Arab Emirates dirham', 2),
  ('QAR', 'Qatari riyal', 2),
  ('OMR', 'Omani rial', 3),
  ('BHD', 'Bahraini dinar', 3),
  ('KWD', 'Kuwaiti dinar', 3),
  ('JOD', 'Jordanian dinar', 3),
  ('CHF', 'Swiss franc', 2),
  ('NOK', 'Norwegian krone', 2),
  ('CZK', 'Czech koruna', 2),
  ('RON', 'Romanian leu', 2),
  ('HUF', 'Hungarian forint', 2),
  ('NZD', 'New Zealand dollar', 2),
  ('BDT', 'Bangladeshi taka', 2),
  ('PKR', 'Pakistani rupee', 2),
  ('LKR', 'Sri Lankan rupee', 2),
  ('KZT', 'Kazakhstani tenge', 2),
  ('UZS', 'Uzbekistani som', 2),
  ('TWD', 'New Taiwan dollar', 2),
  ('HKD', 'Hong Kong dollar', 2),
  ('MNT', 'Mongolian togroeg', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region, activation_status
) VALUES
  ('BR', 'BRA', 'Brazil', '+55', 'BRL', 'pt', ARRAY['America/Sao_Paulo', 'America/Manaus', 'America/Recife']::text[], 'south_america', 'sources_identified'),
  ('CL', 'CHL', 'Chile', '+56', 'CLP', 'es', ARRAY['America/Santiago']::text[], 'south_america', 'sources_identified'),
  ('CO', 'COL', 'Colombia', '+57', 'COP', 'es', ARRAY['America/Bogota']::text[], 'south_america', 'sources_identified'),
  ('PE', 'PER', 'Peru', '+51', 'PEN', 'es', ARRAY['America/Lima']::text[], 'south_america', 'sources_identified'),
  ('AR', 'ARG', 'Argentina', '+54', 'ARS', 'es', ARRAY['America/Argentina/Buenos_Aires']::text[], 'south_america', 'sources_identified'),
  ('MX', 'MEX', 'Mexico', '+52', 'MXN', 'es', ARRAY['America/Mexico_City', 'America/Tijuana', 'America/Monterrey']::text[], 'north_america', 'sources_identified'),
  ('SA', 'SAU', 'Saudi Arabia', '+966', 'SAR', 'ar', ARRAY['Asia/Riyadh']::text[], 'asia', 'sources_identified'),
  ('AE', 'ARE', 'United Arab Emirates', '+971', 'AED', 'ar', ARRAY['Asia/Dubai']::text[], 'asia', 'sources_identified'),
  ('QA', 'QAT', 'Qatar', '+974', 'QAR', 'ar', ARRAY['Asia/Qatar']::text[], 'asia', 'sources_identified'),
  ('OM', 'OMN', 'Oman', '+968', 'OMR', 'ar', ARRAY['Asia/Muscat']::text[], 'asia', 'sources_identified'),
  ('BH', 'BHR', 'Bahrain', '+973', 'BHD', 'ar', ARRAY['Asia/Bahrain']::text[], 'asia', 'sources_identified'),
  ('KW', 'KWT', 'Kuwait', '+965', 'KWD', 'ar', ARRAY['Asia/Kuwait']::text[], 'asia', 'sources_identified'),
  ('JO', 'JOR', 'Jordan', '+962', 'JOD', 'ar', ARRAY['Asia/Amman']::text[], 'asia', 'sources_identified'),
  ('CH', 'CHE', 'Switzerland', '+41', 'CHF', 'de', ARRAY['Europe/Zurich']::text[], 'europe', 'sources_identified'),
  ('NO', 'NOR', 'Norway', '+47', 'NOK', 'no', ARRAY['Europe/Oslo']::text[], 'europe', 'sources_identified'),
  ('FI', 'FIN', 'Finland', '+358', 'EUR', 'fi', ARRAY['Europe/Helsinki']::text[], 'europe', 'sources_identified'),
  ('PT', 'PRT', 'Portugal', '+351', 'EUR', 'pt', ARRAY['Europe/Lisbon', 'Atlantic/Azores']::text[], 'europe', 'sources_identified'),
  ('CZ', 'CZE', 'Czechia', '+420', 'CZK', 'cs', ARRAY['Europe/Prague']::text[], 'europe', 'sources_identified'),
  ('RO', 'ROU', 'Romania', '+40', 'RON', 'ro', ARRAY['Europe/Bucharest']::text[], 'europe', 'sources_identified'),
  ('GR', 'GRC', 'Greece', '+30', 'EUR', 'el', ARRAY['Europe/Athens']::text[], 'europe', 'sources_identified'),
  ('HU', 'HUN', 'Hungary', '+36', 'HUF', 'hu', ARRAY['Europe/Budapest']::text[], 'europe', 'sources_identified'),
  ('AT', 'AUT', 'Austria', '+43', 'EUR', 'de', ARRAY['Europe/Vienna']::text[], 'europe', 'sources_identified'),
  ('NZ', 'NZL', 'New Zealand', '+64', 'NZD', 'en', ARRAY['Pacific/Auckland']::text[], 'oceania', 'sources_identified'),
  ('BD', 'BGD', 'Bangladesh', '+880', 'BDT', 'bn', ARRAY['Asia/Dhaka']::text[], 'asia', 'sources_identified'),
  ('PK', 'PAK', 'Pakistan', '+92', 'PKR', 'ur', ARRAY['Asia/Karachi']::text[], 'asia', 'sources_identified'),
  ('LK', 'LKA', 'Sri Lanka', '+94', 'LKR', 'si', ARRAY['Asia/Colombo']::text[], 'asia', 'sources_identified'),
  ('KZ', 'KAZ', 'Kazakhstan', '+7', 'KZT', 'kk', ARRAY['Asia/Almaty']::text[], 'asia', 'sources_identified'),
  ('UZ', 'UZB', 'Uzbekistan', '+998', 'UZS', 'uz', ARRAY['Asia/Tashkent']::text[], 'asia', 'sources_identified'),
  ('TW', 'TWN', 'Taiwan', '+886', 'TWD', 'zh', ARRAY['Asia/Taipei']::text[], 'asia', 'sources_identified'),
  ('HK', 'HKG', 'Hong Kong', '+852', 'HKD', 'en', ARRAY['Asia/Hong_Kong']::text[], 'asia', 'sources_identified'),
  ('MN', 'MNG', 'Mongolia', '+976', 'MNT', 'mn', ARRAY['Asia/Ulaanbaatar']::text[], 'asia', 'sources_identified')
ON CONFLICT (alpha2_code) DO NOTHING;

INSERT INTO public.opportunity_sources (
  id, name, publisher, official_website, source_category, source_type,
  access_method, api_or_feed_url, connector_identifier, api_or_feed_available,
  supported_categories, languages, publication_frequency, expected_refresh_hours,
  reliability_status, licensing_status, terms_status, permissions_evidence_url,
  attribution_requirements, coverage_scope, approval_status, activation_status,
  integration_status
)
SELECT
  gen_random_uuid(), v.source_name, v.publisher, v.official_website,
  'government', 'portal', 'permitted_web', NULL, v.connector_identifier, false,
  ARRAY['government']::text[], ARRAY['en']::text[], 'Daily', 24,
  'verified', 'review_required', 'review_required', v.official_website,
  'Attribute ' || v.publisher || '.', 'country', 'unreviewed', 'inactive',
  'not_started'
FROM (VALUES
  ('planned-br-pncp', 'Portal Nacional de Contratações Públicas (PNCP)', 'Comitê Gestor da Rede Nacional de Contratações Públicas, Brazil', 'https://pncp.gov.br/app/editais'),
  ('planned-cl-mercado-publico', 'Mercado Público — Tender Search', 'Dirección ChileCompra, Chile', 'https://www.mercadopublico.cl/'),
  ('planned-co-secop-ii', 'SECOP II — Public Contract Notices', 'Colombia Compra Eficiente (ANCP-CCE)', 'https://community.secop.gov.co/Public/Tendering/ContractNoticeManagement/Index?currentLanguage=es-CO&Page=login&Country=CO&SkinName=CCE'),
  ('planned-pe-seace', 'SEACE — Public Tender Search', 'Organismo Especializado para las Contrataciones Públicas Eficientes (OECE), Peru', 'https://prod2.seace.gob.pe/seacebus-uiwd-pub/buscadorPublico/buscadorPublico.xhtml'),
  ('planned-ar-comprar', 'COMPR.AR — Advanced Tender Search', 'Oficina Nacional de Contrataciones, Argentina', 'https://comprar.gob.ar/BuscarAvanzado.aspx'),
  ('planned-mx-compras-mx', 'Compras MX — Public Procedure Publication', 'Secretaría Anticorrupción y Buen Gobierno, Mexico', 'https://comprasmx.buengobierno.gob.mx/sitiopublico'),
  ('planned-sa-etimad', 'Etimad — All Tenders (Visitor)', 'Ministry of Finance, Saudi Arabia', 'https://tenders.etimad.sa/Tender/AllTendersForVisitor'),
  ('planned-ae-mof-opportunities', 'Ministry of Finance — Current Business Opportunities (Federal)', 'Ministry of Finance, United Arab Emirates', 'https://mof.gov.ae/en/public-finance/government-procurement/current-business-opportunities'),
  ('planned-qa-monaqasat', 'Monaqasat — Available Ministries Tenders', 'Ministry of Finance, Qatar', 'https://monaqasat.mof.gov.qa/TendersOnlineServices/AvailableMinistriesTenders/1'),
  ('planned-om-etendering', 'Oman eTendering — New Tenders', 'Projects, Tenders and Local Content Authority, Oman', 'https://etendering.tenderboard.gov.om/product/publicDash?viewFlag=NewTenders&CTRL_STRDIRECTION=LTR'),
  ('planned-bh-tender-board', 'Bahrain Tender Board — Published Tenders', 'Bahrain Tender Board', 'https://www.tenderboard.gov.bh/Tenders/PublicTenders/'),
  ('planned-kw-capt', 'CAPT — Opening Tenders', 'Central Agency for Public Tenders, Kuwait', 'https://capt.gov.kw/en/tenders/opening-tenders/'),
  ('planned-jo-joneps', 'JONEPS — Tender Invitations', 'Government Tenders Department, Jordan', 'https://www.joneps.gov.jo/ep/invt/selectListTendInvitAL.do'),
  ('planned-ch-simap', 'SIMAP — Public Procurement Publications', 'Association simap.ch, Switzerland', 'https://www.simap.ch/en'),
  ('planned-no-doffin', 'Doffin — National Notice Database', 'Agency for Public and Financial Management (DFØ), Norway', 'https://www.doffin.no/search?searchString=&sortBy=PUBLICATION_DATE_DESC'),
  ('planned-fi-hilma', 'Hilma — Procurement Notice Search', 'State Treasury of Finland', 'https://www.hankintailmoitukset.fi/en/search'),
  ('planned-pt-base', 'Portal BASE — Announcement Search', 'Instituto dos Mercados Públicos, do Imobiliário e da Construção (IMPIC), Portugal', 'https://www.base.gov.pt/Base4/pt/pesquisa?type=anuncios'),
  ('planned-cz-zakazky-gov', 'Zakázky GOV — Public Procurement Bulletin', 'Ministry for Regional Development, Czechia', 'https://zakazky.gov.cz/vvz'),
  ('planned-ro-seap', 'SEAP — Public Procurement Portal', 'Authority for the Digitalisation of Romania', 'https://www.e-licitatie.ro/pub'),
  ('planned-gr-promitheus', 'Promitheus / NEPPS — National e-Procurement', 'Ministry of Digital Governance, Greece', 'https://portal.eprocurement.gov.gr/esidisportal/en'),
  ('planned-hu-kozbeszerzes', 'Közbeszerzési Értesítő — Procurement Bulletin', 'Public Procurement Authority of Hungary', 'https://www.kozbeszerzes.hu/ertesito'),
  ('planned-at-usp-ausschreibungen', 'USP — Call-for-Tenders Search', 'Federal Chancellery, Austria (Business Service Portal)', 'https://ausschreibungen.usp.gv.at/at.gv.bmdw.eproc-p/public/tenderlist'),
  ('planned-nz-gets', 'GETS — Government Electronic Tenders Service', 'New Zealand Government Procurement, MBIE', 'https://www.gets.govt.nz/ExternalIndex.htm'),
  ('planned-bd-egp', 'e-GP — National Tender Search', 'Bangladesh Public Procurement Authority', 'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t'),
  ('planned-pk-ppra', 'PPRA — Active Federal Tenders', 'Public Procurement Regulatory Authority, Pakistan', 'https://epms.ppra.gov.pk/public/tenders/active-tenders'),
  ('planned-lk-promise', 'PROMISe — All Procurements', 'e-GP Secretariat, Ministry of Finance, Sri Lanka', 'https://promise.lk/?a=all_procurements&p=vendor_cont&type=e'),
  ('planned-kz-goszakup', 'Goszakup — Lot Search', 'Ministry of Finance, Kazakhstan', 'https://www.goszakup.gov.kz/ru/search/lots'),
  ('planned-uz-xarid', 'Xarid — Specialised Public Procurement Portal', 'Government of Uzbekistan', 'https://xarid.mf.uz/'),
  ('planned-tw-pcc', 'Government e-Procurement — Tender Search', 'Public Construction Commission, Executive Yuan, Taiwan', 'https://web.pcc.gov.tw/prkms/tender/common/basic/indexTenderBasic'),
  ('planned-hk-fstb-tender-notices', 'Government Tender Notices', 'Financial Services and the Treasury Bureau, Hong Kong', 'https://www.fstb.gov.hk/tb/en/business/gov_procurement/tender-notices.htm'),
  ('planned-mn-tender-gov', 'State Procurement System — Invitations', 'State Procurement Agency, Mongolia', 'https://user.tender.gov.mn/en/invitation')
) AS v(connector_identifier, source_name, publisher, official_website)
WHERE NOT EXISTS (
  SELECT 1 FROM public.opportunity_sources
  WHERE connector_identifier = v.connector_identifier
);

INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at, verification_evidence_url
)
SELECT s.id, v.country_code, 'government', 'verified', now(), v.verification_url
FROM public.opportunity_sources s
JOIN (VALUES
  ('planned-br-pncp', 'BR', 'https://pncp.gov.br/app/editais'),
  ('planned-cl-mercado-publico', 'CL', 'https://www.mercadopublico.cl/'),
  ('planned-co-secop-ii', 'CO', 'https://www.colombiacompra.gov.co/secop/secop-ii'),
  ('planned-pe-seace', 'PE', 'https://www.gob.pe/institucion/oece/pages/7505-consultar-los-buscadores-publicos-del-sistema-electronico-de-contrataciones-del-estado-seace'),
  ('planned-ar-comprar', 'AR', 'https://www.argentina.gob.ar/jefatura/ejecutiva/oficina-nacional-de-contrataciones/comprar'),
  ('planned-mx-compras-mx', 'MX', 'https://comprasmx.buengobierno.gob.mx/sitiopublico'),
  ('planned-sa-etimad', 'SA', 'https://mof.gov.sa/en/tenders-and-procurement'),
  ('planned-ae-mof-opportunities', 'AE', 'https://mof.gov.ae/en/public-finance/government-procurement/current-business-opportunities'),
  ('planned-qa-monaqasat', 'QA', 'https://monaqasat.mof.gov.qa/'),
  ('planned-om-etendering', 'OM', 'https://gov.om/en/general-secretariat-of-the-tender-board'),
  ('planned-bh-tender-board', 'BH', 'https://tenderboard.gov.bh/aboutus/overview'),
  ('planned-kw-capt', 'KW', 'https://capt.gov.kw/en'),
  ('planned-jo-joneps', 'JO', 'https://www.gtd.gov.jo/EN/List/Electronic_purchasing_system_JONEPS'),
  ('planned-ch-simap', 'CH', 'https://www.simap.ch/'),
  ('planned-no-doffin', 'NO', 'https://www.doffin.no/about'),
  ('planned-fi-hilma', 'FI', 'https://www.hankintailmoitukset.fi/en'),
  ('planned-pt-base', 'PT', 'https://www.base.gov.pt/Base4/pt/o-portal/quem-e-quem'),
  ('planned-cz-zakazky-gov', 'CZ', 'https://zakazky.gov.cz/faq'),
  ('planned-ro-seap', 'RO', 'https://adr.gov.ro/en/platforme-operate'),
  ('planned-gr-promitheus', 'GR', 'https://www.gov.gr/en/sdg/public-contracts/participating-in-public-tenders/national-sources-of-help-with-procurement-procedures/national-electronic-public-procurement-system-online-platform-promitheus-gov-gr'),
  ('planned-hu-kozbeszerzes', 'HU', 'https://www.kozbeszerzes.hu/ertesito'),
  ('planned-at-usp-ausschreibungen', 'AT', 'https://www.usp.gv.at/en/services/ausschreibungssuche.html'),
  ('planned-nz-gets', 'NZ', 'https://www.mbie.govt.nz/cross-government-functions/new-zealand-government-procurement-and-property'),
  ('planned-bd-egp', 'BD', 'https://www.eprocure.gov.bd/aboutUs.jsp'),
  ('planned-pk-ppra', 'PK', 'https://ppra.gov.pk/'),
  ('planned-lk-promise', 'LK', 'https://www.treasury.gov.lk/api/file/eff53474-6bd1-42b7-bc38-091b9fa12ea5'),
  ('planned-kz-goszakup', 'KZ', 'https://egov.kz/cms/en/articles/economics/procurement_portal'),
  ('planned-uz-xarid', 'UZ', 'https://gov.uz/en/pages/davlat_xaridlari'),
  ('planned-tw-pcc', 'TW', 'https://web.pcc.gov.tw/'),
  ('planned-hk-fstb-tender-notices', 'HK', 'https://www.fstb.gov.hk/tb/en/business/gov_procurement/tender-notices.htm'),
  ('planned-mn-tender-gov', 'MN', 'https://www.tender.gov.mn/en')
) AS v(connector_identifier, country_code, verification_url) ON s.connector_identifier = v.connector_identifier
ON CONFLICT (source_id, country_code, category_code) DO NOTHING;

COMMIT;
