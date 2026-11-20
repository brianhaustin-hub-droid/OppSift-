-- Depends on migrations 0001-0038.
-- Draft RPCs for saved opportunities (existing table) and profile/preferences
-- helpers to support future UI connection. Review/apply on Neon development
-- before production.

BEGIN;

-- Saved opportunities (organization_saved_opportunities exists since 0002)
CREATE OR REPLACE FUNCTION public.list_saved_opportunities(p_organization_id uuid)
RETURNS TABLE (
  organization_id uuid,
  opportunity_id uuid,
  saved_by uuid,
  private_note text,
  created_at timestamptz,
  updated_at timestamptz,
  title text,
  category_code text,
  country_code text,
  status text,
  closing_at timestamptz,
  canonical_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT
      s.organization_id, s.opportunity_id, s.saved_by, s.private_note, s.created_at, s.updated_at,
      o.title, o.category_code, o.country_code, o.status, o.closing_at, o.canonical_url
    FROM public.organization_saved_opportunities s
    JOIN public.opportunities o ON o.id = s.opportunity_id
    WHERE s.organization_id = p_organization_id
    ORDER BY s.updated_at DESC, s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_saved_opportunity(
  p_organization_id uuid,
  p_opportunity_id uuid,
  p_private_note text DEFAULT NULL
)
RETURNS public.organization_saved_opportunities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.organization_saved_opportunities;
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organization_saved_opportunities (organization_id, opportunity_id, saved_by, private_note)
  VALUES (p_organization_id, p_opportunity_id, auth.user_id()::uuid, p_private_note)
  ON CONFLICT (organization_id, opportunity_id) DO UPDATE SET
    private_note = COALESCE(EXCLUDED.private_note, public.organization_saved_opportunities.private_note),
    updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_saved_opportunity(p_organization_id uuid, p_opportunity_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.organization_saved_opportunities
  WHERE organization_id = p_organization_id AND opportunity_id = p_opportunity_id;
  RETURN FOUND;
END;
$$;

-- Profile/preferences helper (user_profiles exists since 0001)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.user_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.*
  FROM public.user_profiles p
  WHERE p.user_id = auth.user_id()::uuid
    AND public.current_verified_user_email() IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_display_name text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_locale text DEFAULT NULL,
  p_time_zone text DEFAULT NULL
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_user uuid := auth.user_id()::uuid; v_row public.user_profiles;
BEGIN
  IF v_user IS NULL OR public.current_verified_user_email() IS NULL THEN
    RAISE EXCEPTION 'A verified account is required.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_profiles (user_id, display_name, image_url, locale, time_zone)
  VALUES (v_user, p_display_name, p_image_url, COALESCE(p_locale, 'en'), p_time_zone)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.user_profiles.display_name),
    image_url = COALESCE(EXCLUDED.image_url, public.user_profiles.image_url),
    locale = COALESCE(EXCLUDED.locale, public.user_profiles.locale),
    time_zone = COALESCE(EXCLUDED.time_zone, public.user_profiles.time_zone),
    updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.list_saved_opportunities(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_saved_opportunity(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_saved_opportunity(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_my_profile(text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_saved_opportunities(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_saved_opportunity(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_saved_opportunity(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_profile(text, text, text, text) TO authenticated;

COMMIT;
