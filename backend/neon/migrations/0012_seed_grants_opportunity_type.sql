-- Depends on migrations 0001-0011.
-- Grants.gov collection normalizes every mapped record to
-- category_code = 'grants' and opportunity_type_code = 'grant'. The
-- opportunities table enforces a composite foreign key
-- (category_code, opportunity_type_code) -> opportunity_types, but no
-- ('grants', 'grant') row was ever seeded, so every Grants.gov insert
-- failed with a foreign-key violation (SQLSTATE 23503) in production.
--
-- Seed the missing taxonomy row so the Grants connector can persist
-- opportunities. The ('government', 'tender') row used by the World Bank
-- and TED mappings already exists from migration 0002/0007.

INSERT INTO public.opportunity_types (code, category_code, name)
VALUES ('grant', 'grants', 'Grant')
ON CONFLICT (code) DO NOTHING;
