-- Depends on migrations 0001-0008.
-- Completes the 30-market country registry in the database and activates the
-- World Bank source. OppSift is not a commercial product, so the World Bank
-- API restriction on commercial use does not apply; the constraint is kept on
-- the record so the reasoning stays auditable.
--
-- CanadaBuys is deliberately NOT approved here: its worker requires a JSON
-- feed and rejects any non-JSON content type, while the only verified
-- open-data endpoint publishes CSV. SAM.gov is not approved either, because
-- collection requires an API key that has not been issued yet.

INSERT INTO public.currencies (code, name, minor_unit)
VALUES
  ('USD', 'United States dollar', 2),
  ('INR', 'Indian rupee', 2),
  ('SGD', 'Singapore dollar', 2),
  ('JPY', 'Japanese yen', 0),
  ('KRW', 'South Korean won', 0),
  ('MYR', 'Malaysian ringgit', 2),
  ('IDR', 'Indonesian rupiah', 2),
  ('PHP', 'Philippine peso', 2),
  ('THB', 'Thai baht', 2),
  ('VND', 'Vietnamese dong', 0),
  ('AUD', 'Australian dollar', 2),
  ('KES', 'Kenyan shilling', 2),
  ('UGX', 'Ugandan shilling', 0),
  ('TZS', 'Tanzanian shilling', 2),
  ('RWF', 'Rwandan franc', 0),
  ('BIF', 'Burundian franc', 0),
  ('ETB', 'Ethiopian birr', 2),
  ('SSP', 'South Sudanese pound', 2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.languages (tag, name)
VALUES
  ('hi', 'Hindi'), ('ja', 'Japanese'), ('ko', 'Korean'), ('ms', 'Malay'),
  ('id', 'Indonesian'), ('fil', 'Filipino'), ('th', 'Thai'), ('vi', 'Vietnamese'),
  ('sw', 'Swahili'), ('rw', 'Kinyarwanda'), ('rn', 'Rundi'), ('am', 'Amharic'),
  ('ar', 'Arabic')
ON CONFLICT (tag) DO NOTHING;

INSERT INTO public.global_countries (
  alpha2_code, alpha3_code, name, calling_code, primary_currency_code,
  default_language_tag, time_zones, region, activation_status
)
VALUES
  ('US', 'USA', 'United States', '+1', 'USD', 'en',
   ARRAY['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu']::text[],
   'north_america', 'planned'),
  ('IN', 'IND', 'India', '+91', 'INR', 'hi', ARRAY['Asia/Kolkata']::text[], 'asia', 'planned'),
  ('SG', 'SGP', 'Singapore', '+65', 'SGD', 'en', ARRAY['Asia/Singapore']::text[], 'asia', 'planned'),
  ('JP', 'JPN', 'Japan', '+81', 'JPY', 'ja', ARRAY['Asia/Tokyo']::text[], 'asia', 'planned'),
  ('KR', 'KOR', 'South Korea', '+82', 'KRW', 'ko', ARRAY['Asia/Seoul']::text[], 'asia', 'planned'),
  ('MY', 'MYS', 'Malaysia', '+60', 'MYR', 'ms', ARRAY['Asia/Kuala_Lumpur', 'Asia/Kuching']::text[], 'asia', 'planned'),
  ('ID', 'IDN', 'Indonesia', '+62', 'IDR', 'id', ARRAY['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']::text[], 'asia', 'planned'),
  ('PH', 'PHL', 'Philippines', '+63', 'PHP', 'fil', ARRAY['Asia/Manila']::text[], 'asia', 'planned'),
  ('TH', 'THA', 'Thailand', '+66', 'THB', 'th', ARRAY['Asia/Bangkok']::text[], 'asia', 'planned'),
  ('VN', 'VNM', 'Vietnam', '+84', 'VND', 'vi', ARRAY['Asia/Ho_Chi_Minh']::text[], 'asia', 'planned'),
  ('AU', 'AUS', 'Australia', '+61', 'AUD', 'en',
   ARRAY['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Australia/Darwin', 'Australia/Hobart']::text[],
   'oceania', 'planned'),
  ('KE', 'KEN', 'Kenya', '+254', 'KES', 'sw', ARRAY['Africa/Nairobi']::text[], 'africa', 'planned'),
  ('UG', 'UGA', 'Uganda', '+256', 'UGX', 'en', ARRAY['Africa/Kampala']::text[], 'africa', 'planned'),
  ('TZ', 'TZA', 'Tanzania', '+255', 'TZS', 'sw', ARRAY['Africa/Dar_es_Salaam']::text[], 'africa', 'planned'),
  ('RW', 'RWA', 'Rwanda', '+250', 'RWF', 'rw', ARRAY['Africa/Kigali']::text[], 'africa', 'planned'),
  ('BI', 'BDI', 'Burundi', '+257', 'BIF', 'rn', ARRAY['Africa/Bujumbura']::text[], 'africa', 'planned'),
  ('ET', 'ETH', 'Ethiopia', '+251', 'ETB', 'am', ARRAY['Africa/Addis_Ababa']::text[], 'africa', 'planned'),
  ('SS', 'SSD', 'South Sudan', '+211', 'SSP', 'en', ARRAY['Africa/Juba']::text[], 'africa', 'planned')
ON CONFLICT (alpha2_code) DO NOTHING;

INSERT INTO public.country_currencies (country_code, currency_code, is_primary)
VALUES
  ('US', 'USD', true), ('IN', 'INR', true), ('SG', 'SGD', true),
  ('JP', 'JPY', true), ('KR', 'KRW', true), ('MY', 'MYR', true),
  ('ID', 'IDR', true), ('PH', 'PHP', true), ('TH', 'THB', true),
  ('VN', 'VND', true), ('AU', 'AUD', true), ('KE', 'KES', true),
  ('UG', 'UGX', true), ('TZ', 'TZS', true), ('RW', 'RWF', true),
  ('BI', 'BIF', true), ('ET', 'ETB', true), ('SS', 'SSP', true)
ON CONFLICT (country_code, currency_code) DO NOTHING;

INSERT INTO public.country_languages (country_code, language_tag, is_default)
VALUES
  ('US', 'en', true), ('IN', 'hi', true), ('SG', 'en', true),
  ('JP', 'ja', true), ('KR', 'ko', true), ('MY', 'ms', true),
  ('ID', 'id', true), ('PH', 'fil', true), ('TH', 'th', true),
  ('VN', 'vi', true), ('AU', 'en', true), ('KE', 'sw', true),
  ('UG', 'en', true), ('TZ', 'sw', true), ('RW', 'rw', true),
  ('BI', 'rn', true), ('ET', 'am', true), ('SS', 'en', true)
ON CONFLICT (country_code, language_tag) DO NOTHING;

-- World Bank: activate. Approval evidence was recorded in 0008.
UPDATE public.opportunity_sources
SET retention_restrictions = 'Collection is limited to non-commercial use. API-facilitated commercial use, including charging for access or redistribution, remains prohibited without prior written World Bank consent.',
    integration_status = 'operational',
    activation_status = 'active'
WHERE connector_identifier = 'world-bank-procurement-notices';

-- Coverage must follow the source update: guard_live_source_coverage rejects
-- operational coverage for a source that is not approved and operational.
INSERT INTO public.source_country_coverage (
  source_id, country_code, category_code, coverage_status, verified_at,
  verification_evidence_url
)
SELECT
  source.id,
  country.alpha2_code,
  'government',
  'operational',
  now(),
  'https://www.worldbank.org/ext/en/legal/terms-conditions/datasets'
FROM public.opportunity_sources AS source
CROSS JOIN public.global_countries AS country
WHERE source.connector_identifier = 'world-bank-procurement-notices'
ON CONFLICT (source_id, country_code, category_code) DO UPDATE
SET coverage_status = EXCLUDED.coverage_status,
    verified_at = EXCLUDED.verified_at,
    verification_evidence_url = EXCLUDED.verification_evidence_url;
