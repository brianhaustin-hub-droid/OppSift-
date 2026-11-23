-- Depends on migrations 0001-0045.
-- Expands the Africa-first coverage scope by 20 markets and registers 60
-- additional official procurement sources.
--
-- Every URL below was checked on 2026-11-22 against the publisher's own site
-- (or a national government page that links to it). These are catalogue
-- registrations, not ingestion claims: integration_status stays
-- 'not_started' and activation_status 'inactive' until a connector exists,
-- a live sample is retrieved and stored, and coverage_truth reports records.
--
-- Country coverage rows are marked 'verified' because the publisher identity
-- and official page were confirmed; they are not 'live_verified' or
-- 'operational'.

-- Currencies needed by the new markets.
INSERT INTO public.languages (tag, name) VALUES
  ('so', 'Somali')
ON CONFLICT (tag) DO NOTHING;

INSERT INTO public.currencies (code, name, minor_unit) VALUES
  ('DZD', 'Algerian dinar', 2),
  ('AOA', 'Angolan kwanza', 2),
  ('XAF', 'Central African CFA franc', 0),
  ('CDF', 'Congolese franc', 2),
  ('DJF', 'Djiboutian franc', 0),
  ('SZL', 'Swazi lilangeni', 2),
  ('GNF', 'Guinean franc', 0),
  ('LSL', 'Lesotho loti', 2),
  ('LYD', 'Libyan dinar', 3),
  ('MRU', 'Mauritanian ouguiya', 2),
  ('SCR', 'Seychellois rupee', 2),
  ('SOS', 'Somali shilling', 2),
  ('SDG', 'Sudanese pound', 2),
  ('TND', 'Tunisian dinar', 3),
  ('ZWL', 'Zimbabwe dollar', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region, activation_status
) VALUES
  ('DZ', 'DZA', 'Algeria', '+213', 'DZD', 'ar', ARRAY['Africa/Algiers']::text[], 'africa', 'sources_identified'),
  ('AO', 'AGO', 'Angola', '+244', 'AOA', 'pt', ARRAY['Africa/Luanda']::text[], 'africa', 'sources_identified'),
  ('CM', 'CMR', 'Cameroon', '+237', 'XAF', 'fr', ARRAY['Africa/Douala']::text[], 'africa', 'sources_identified'),
  ('TD', 'TCD', 'Chad', '+235', 'XAF', 'fr', ARRAY['Africa/Ndjamena']::text[], 'africa', 'sources_identified'),
  ('CG', 'COG', 'Congo', '+242', 'XAF', 'fr', ARRAY['Africa/Brazzaville']::text[], 'africa', 'sources_identified'),
  ('CD', 'COD', 'DR Congo', '+243', 'CDF', 'fr', ARRAY['Africa/Kinshasa']::text[], 'africa', 'sources_identified'),
  ('DJ', 'DJI', 'Djibouti', '+253', 'DJF', 'fr', ARRAY['Africa/Djibouti']::text[], 'africa', 'sources_identified'),
  ('SZ', 'SWZ', 'Eswatini', '+268', 'SZL', 'en', ARRAY['Africa/Mbabane']::text[], 'africa', 'sources_identified'),
  ('GA', 'GAB', 'Gabon', '+241', 'XAF', 'fr', ARRAY['Africa/Libreville']::text[], 'africa', 'sources_identified'),
  ('GN', 'GIN', 'Guinea', '+224', 'GNF', 'fr', ARRAY['Africa/Conakry']::text[], 'africa', 'sources_identified'),
  ('LS', 'LSO', 'Lesotho', '+266', 'LSL', 'en', ARRAY['Africa/Maseru']::text[], 'africa', 'sources_identified'),
  ('LY', 'LBY', 'Libya', '+218', 'LYD', 'ar', ARRAY['Africa/Tripoli']::text[], 'africa', 'sources_identified'),
  ('ML', 'MLI', 'Mali', '+223', 'XOF', 'fr', ARRAY['Africa/Bamako']::text[], 'africa', 'sources_identified'),
  ('MR', 'MRT', 'Mauritania', '+222', 'MRU', 'ar', ARRAY['Africa/Nouakchott']::text[], 'africa', 'sources_identified'),
  ('SC', 'SYC', 'Seychelles', '+248', 'SCR', 'en', ARRAY['Indian/Mahe']::text[], 'africa', 'sources_identified'),
  ('SO', 'SOM', 'Somalia', '+252', 'SOS', 'so', ARRAY['Africa/Mogadishu']::text[], 'africa', 'sources_identified'),
  ('SD', 'SDN', 'Sudan', '+249', 'SDG', 'ar', ARRAY['Africa/Khartoum']::text[], 'africa', 'sources_identified'),
  ('TG', 'TGO', 'Togo', '+228', 'XOF', 'fr', ARRAY['Africa/Lome']::text[], 'africa', 'sources_identified'),
  ('TN', 'TUN', 'Tunisia', '+216', 'TND', 'ar', ARRAY['Africa/Tunis']::text[], 'africa', 'sources_identified'),
  ('ZW', 'ZWE', 'Zimbabwe', '+263', 'ZWL', 'en', ARRAY['Africa/Harare']::text[], 'africa', 'sources_identified')
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
  -- New markets (20)
  ('planned-dz-marches-publics', 'Portail Électronique des Marchés Publics (Algeria)', 'Ministère des Finances, Algérie', 'https://marches-publics.gov.dz/'),
  ('planned-dz-mf-gov', 'Ministère des Finances — Marchés publics', 'Ministère des Finances, Algérie', 'https://www.mf.gov.dz/'),
  ('planned-ao-compras-publicas', 'Portal Compras Públicas (Angola)', 'Ministério das Finanças, Angola', 'https://compraspublicas.minfin.gov.ao/'),
  ('planned-ao-sncp', 'Serviço Nacional da Contratação Pública (SNCP)', 'Ministério das Finanças, Angola', 'https://www.sncp.minfin.gov.ao/'),
  ('planned-cm-coleps', 'COLEPS — Marchés Publics (Cameroon)', 'Ministère des Marchés Publics, Cameroun', 'https://marchespublics.cm/'),
  ('planned-cm-armp', 'ARMP Cameroun', 'Agence de Régulation des Marchés Publics, Cameroun', 'https://www.armp.cm/'),
  ('planned-td-journal-officiel', 'Journal Officiel — Appels d''offres (Chad)', 'Secrétariat Général du Gouvernement, Tchad', 'https://journalofficiel.td/fr/marches-publics/appels-offres'),
  ('planned-td-armp', 'Autorité de Régulation des Marchés Publics (Chad)', 'ARMP Tchad', 'https://armp-tchad.com/'),
  ('planned-cg-armp-portal', 'Bulletin Officiel des Marchés Publics (Congo)', 'ARMP Congo', 'https://armp.cg/services-portal.php'),
  ('planned-cg-armp', 'ARMP Congo', 'ARMP Congo', 'https://armp.cg/'),
  ('planned-cd-armp-marches', 'ARMP RDC — Marchés publics', 'ARMP RDC', 'https://marche.armp-rdc.cd/'),
  ('planned-cd-armp', 'ARMP RDC', 'ARMP RDC', 'https://armp-rdc.cd/'),
  ('planned-dj-marches-publics', 'Portail des Marchés Publics (Djibouti)', 'Gouvernement de Djibouti', 'https://marchespublics.gouv.dj/'),
  ('planned-dj-cnmp', 'Commission Nationale des Marchés Publics (Djibouti)', 'CNMP Djibouti', 'https://cnmp.gouv.dj/'),
  ('planned-sz-esppra-tenders', 'ESPPRA Tender Opportunities (Eswatini)', 'Eswatini Public Procurement Regulatory Agency', 'https://esppra.co.sz/tender.php'),
  ('planned-sz-esppra', 'ESPPRA (Eswatini)', 'Eswatini Public Procurement Regulatory Agency', 'https://esppra.co.sz/'),
  ('planned-ga-efournisseur', 'eFournisseur (Gabon)', 'Direction Générale des Marchés Publics, Gabon', 'https://efournisseur.gouv.ga/'),
  ('planned-ga-dgmp', 'DGMP — Budget Gabon', 'Direction Générale des Marchés Publics, Gabon', 'https://budget.gouv.ga/dgmp'),
  ('planned-gn-telemo', 'TELEMO — Marchés publics (Guinea)', 'Gouvernement de Guinée', 'https://telemo.gov.gn/'),
  ('planned-gn-armp', 'ARMP Guinée', 'Autorité de Régulation des Marchés Publics, Guinée', 'https://armpguinee.org/'),
  ('planned-ls-gov-tenders', 'Government of Lesotho Tenders', 'Government of Lesotho', 'https://www.gov.ls/documents/tenders/'),
  ('planned-ls-finance-tenders', 'Ministry of Finance Tenders (Lesotho)', 'Ministry of Finance, Lesotho', 'https://www.finance.gov.ls/tenders'),
  ('planned-ly-ataat', 'Attaat — Government Tenders Platform (Libya)', 'Government of National Unity, Libya', 'https://www.attaat.pm.gov.ly/'),
  ('planned-ly-noc-tenders', 'National Oil Corporation Tenders (Libya)', 'National Oil Corporation, Libya', 'https://noc.ly/en/tenders'),
  ('planned-ml-dgmp', 'DGMP-DSP Portail des Marchés Publics (Mali)', 'Direction Générale des Marchés Publics, Mali', 'https://dgmp.gouv.ml/?q=node/10'),
  ('planned-mr-marches-publics', 'Portail National des Marchés Publics (Mauritania)', 'Gouvernement de Mauritanie', 'https://marchespublics.gov.mr/'),
  ('planned-mr-armp', 'ARMP Mauritanie', 'Autorité de Régulation des Marchés Publics, Mauritanie', 'https://armp.mr/'),
  ('planned-sc-ntb', 'National Tender Board (Seychelles)', 'National Tender Board, Seychelles', 'https://www.ntb.sc/'),
  ('planned-sc-pou', 'Procurement Oversight Unit (Seychelles)', 'Procurement Oversight Unit, Seychelles', 'https://www.pou.gov.sc/'),
  ('planned-so-mof-procurement', 'Ministry of Finance Procurement Portal (Somalia)', 'Ministry of Finance, Somalia', 'https://mof.gov.so/procurement'),
  ('planned-so-ppd', 'Public Procurement Department (Somalia)', 'Ministry of Finance, Somalia', 'https://mof.gov.so/departments/procurement'),
  ('planned-sd-mof', 'Ministry of Finance and Economic Planning (Sudan)', 'Ministry of Finance, Sudan', 'https://mof.gov.sd/en/'),
  ('planned-tg-dnccp', 'DNCCP — Marchés publics (Togo)', 'Direction Nationale de Contrôle des Marchés Publics, Togo', 'https://dnccp.gouv.tg/'),
  ('planned-tg-arcop', 'ARCOP Togo', 'Autorité de Régulation de la Commande Publique, Togo', 'https://arcop.tg/'),
  ('planned-tn-tuneps', 'TUNEPS — Tunisia', 'HAICOP, Tunisie', 'https://www.tuneps.tn/'),
  ('planned-tn-marches-publics', 'Portail des Marchés Publics (Tunisia)', 'HAICOP, Tunisie', 'https://www.marchespublics.gov.tn/fr'),
  ('planned-zw-egp', 'Electronic Government Procurement System (Zimbabwe)', 'Procurement Regulatory Authority of Zimbabwe', 'https://egp.praz.org.zw/'),
  ('planned-zw-praz', 'PRAZ (Zimbabwe)', 'Procurement Regulatory Authority of Zimbabwe', 'https://www.praz.org.zw/'),
  -- Additional verified Ghana institutional buyers (docs/source-catalog/ghana-deep-source-inventory.md)
  ('planned-gh-mrh-bids', 'Ministry of Roads and Highways — Bids', 'Ministry of Roads and Highways, Ghana', 'https://bids.mrh.gov.gh/'),
  ('planned-gh-ghanaports', 'Ghana Ports and Harbours Authority', 'Ghana Ports and Harbours Authority', 'https://ghanaports.gov.gh/'),
  ('planned-gh-gridco', 'GRIDCo — Adverts', 'Ghana Grid Company', 'https://gridcogh.com/adverts/'),
  ('planned-gh-gwcl', 'Ghana Water Company Limited', 'Ghana Water Company Limited', 'https://gwcl.com.gh/'),
  ('planned-gh-vra', 'Volta River Authority — Tenders', 'Volta River Authority, Ghana', 'https://vra.com/media/tenders.php'),
  ('planned-gh-ecg', 'Electricity Company of Ghana', 'Electricity Company of Ghana', 'https://www.ecg.com.gh/'),
  ('planned-gh-kma', 'Kumasi Metropolitan Assembly', 'Kumasi Metropolitan Assembly, Ghana', 'https://kma.gov.gh/'),
  ('planned-gh-nca', 'National Communications Authority', 'National Communications Authority, Ghana', 'https://nca.org.gh/'),
  ('planned-gh-gacl', 'Ghana Airports Company Limited', 'Ghana Airports Company Limited', 'https://www.gacl.com.gh/'),
  ('planned-gh-gfza', 'Ghana Free Zones Authority', 'Ghana Free Zones Authority', 'https://gfza.gov.gh/'),
  ('planned-gh-bost', 'BOST — Bulk Oil Storage and Transportation', 'Bulk Oil Storage and Transportation Co., Ghana', 'https://bostenergies.com.gh/'),
  ('planned-gh-adma', 'Ada East District Assembly', 'Ada East District Assembly, Ghana', 'https://adma.gov.gh/'),
  -- Additional verified Egypt buyers (docs/source-catalog/egypt-deep-source-inventory.md)
  ('planned-eg-apa', 'Alexandria Port Authority', 'Alexandria Port Authority, Egypt', 'https://apa.gov.eg/'),
  ('planned-eg-alexcont', 'Alexandria Container Handling Company — Tenders', 'Alexandria Container Handling Company, Egypt', 'https://alexcont.com/tenders'),
  ('planned-eg-hcww', 'Holding Company for Water and Wastewater', 'HCWW, Egypt', 'https://hcww.com.eg/'),
  ('planned-eg-mof', 'Ministry of Finance (Egypt)', 'Ministry of Finance, Egypt', 'https://mof.gov.eg/'),
  ('planned-eg-capmas', 'CAPMAS — Central Agency for Public Mobilization and Statistics', 'CAPMAS, Egypt', 'https://www.capmas.gov.eg/'),
  ('planned-eg-alexwater', 'Alexandria Water Company', 'Alexandria Water Company, Egypt', 'https://www.alexwater.com.eg/'),
  ('planned-eg-dpa', 'Damietta Port Authority', 'Damietta Port Authority, Egypt', 'https://dpa.gov.eg/'),
  ('planned-eg-alexu', 'Alexandria University', 'Alexandria University, Egypt', 'https://alexu.edu.eg/'),
  ('planned-eg-cu', 'Cairo University', 'Cairo University, Egypt', 'https://cu.edu.eg/'),
  ('planned-eg-helwan', 'Helwan University', 'Helwan University, Egypt', 'https://helwan.edu.eg/')
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
  ('planned-dz-marches-publics', 'DZ', 'https://marches-publics.gov.dz/'),
  ('planned-dz-mf-gov', 'DZ', 'https://www.mf.gov.dz/'),
  ('planned-ao-compras-publicas', 'AO', 'https://compraspublicas.minfin.gov.ao/'),
  ('planned-ao-sncp', 'AO', 'https://www.sncp.minfin.gov.ao/'),
  ('planned-cm-coleps', 'CM', 'https://marchespublics.cm/'),
  ('planned-cm-armp', 'CM', 'https://www.armp.cm/'),
  ('planned-td-journal-officiel', 'TD', 'https://journalofficiel.td/fr/marches-publics/appels-offres'),
  ('planned-td-armp', 'TD', 'https://armp-tchad.com/'),
  ('planned-cg-armp-portal', 'CG', 'https://armp.cg/services-portal.php'),
  ('planned-cg-armp', 'CG', 'https://armp.cg/'),
  ('planned-cd-armp-marches', 'CD', 'https://marche.armp-rdc.cd/'),
  ('planned-cd-armp', 'CD', 'https://armp-rdc.cd/'),
  ('planned-dj-marches-publics', 'DJ', 'https://marchespublics.gouv.dj/'),
  ('planned-dj-cnmp', 'DJ', 'https://cnmp.gouv.dj/'),
  ('planned-sz-esppra-tenders', 'SZ', 'https://esppra.co.sz/tender.php'),
  ('planned-sz-esppra', 'SZ', 'https://esppra.co.sz/'),
  ('planned-ga-efournisseur', 'GA', 'https://efournisseur.gouv.ga/'),
  ('planned-ga-dgmp', 'GA', 'https://budget.gouv.ga/dgmp'),
  ('planned-gn-telemo', 'GN', 'https://telemo.gov.gn/'),
  ('planned-gn-armp', 'GN', 'https://armpguinee.org/'),
  ('planned-ls-gov-tenders', 'LS', 'https://www.gov.ls/documents/tenders/'),
  ('planned-ls-finance-tenders', 'LS', 'https://www.finance.gov.ls/tenders'),
  ('planned-ly-ataat', 'LY', 'https://www.attaat.pm.gov.ly/'),
  ('planned-ly-noc-tenders', 'LY', 'https://noc.ly/en/tenders'),
  ('planned-ml-dgmp', 'ML', 'https://dgmp.gouv.ml/?q=node/10'),
  ('planned-mr-marches-publics', 'MR', 'https://marchespublics.gov.mr/'),
  ('planned-mr-armp', 'MR', 'https://armp.mr/'),
  ('planned-sc-ntb', 'SC', 'https://www.ntb.sc/'),
  ('planned-sc-pou', 'SC', 'https://www.pou.gov.sc/'),
  ('planned-so-mof-procurement', 'SO', 'https://mof.gov.so/procurement'),
  ('planned-so-ppd', 'SO', 'https://mof.gov.so/departments/procurement'),
  ('planned-sd-mof', 'SD', 'https://mof.gov.sd/en/'),
  ('planned-tg-dnccp', 'TG', 'https://dnccp.gouv.tg/'),
  ('planned-tg-arcop', 'TG', 'https://arcop.tg/'),
  ('planned-tn-tuneps', 'TN', 'https://www.tuneps.tn/'),
  ('planned-tn-marches-publics', 'TN', 'https://www.marchespublics.gov.tn/fr'),
  ('planned-zw-egp', 'ZW', 'https://egp.praz.org.zw/'),
  ('planned-zw-praz', 'ZW', 'https://www.praz.org.zw/'),
  ('planned-gh-mrh-bids', 'GH', 'https://bids.mrh.gov.gh/'),
  ('planned-gh-ghanaports', 'GH', 'https://ghanaports.gov.gh/'),
  ('planned-gh-gridco', 'GH', 'https://gridcogh.com/adverts/'),
  ('planned-gh-gwcl', 'GH', 'https://gwcl.com.gh/'),
  ('planned-gh-vra', 'GH', 'https://vra.com/media/tenders.php'),
  ('planned-gh-ecg', 'GH', 'https://www.ecg.com.gh/'),
  ('planned-gh-kma', 'GH', 'https://kma.gov.gh/'),
  ('planned-gh-nca', 'GH', 'https://nca.org.gh/'),
  ('planned-gh-gacl', 'GH', 'https://www.gacl.com.gh/'),
  ('planned-gh-gfza', 'GH', 'https://gfza.gov.gh/'),
  ('planned-gh-bost', 'GH', 'https://bostenergies.com.gh/'),
  ('planned-gh-adma', 'GH', 'https://adma.gov.gh/'),
  ('planned-eg-apa', 'EG', 'https://apa.gov.eg/'),
  ('planned-eg-alexcont', 'EG', 'https://alexcont.com/tenders'),
  ('planned-eg-hcww', 'EG', 'https://hcww.com.eg/'),
  ('planned-eg-mof', 'EG', 'https://mof.gov.eg/'),
  ('planned-eg-capmas', 'EG', 'https://www.capmas.gov.eg/'),
  ('planned-eg-alexwater', 'EG', 'https://www.alexwater.com.eg/'),
  ('planned-eg-dpa', 'EG', 'https://dpa.gov.eg/'),
  ('planned-eg-alexu', 'EG', 'https://alexu.edu.eg/'),
  ('planned-eg-cu', 'EG', 'https://cu.edu.eg/'),
  ('planned-eg-helwan', 'EG', 'https://helwan.edu.eg/')
) AS v(connector_identifier, country_code, verification_url)
  ON s.connector_identifier = v.connector_identifier
ON CONFLICT (source_id, country_code, category_code) DO NOTHING;

