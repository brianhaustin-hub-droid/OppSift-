-- Depends on migrations 0001-0036.
-- Draft RPCs/helpers for app domains (onboarding, saved searches, alerts,
-- applications, support, coverage summary) to enable future UI connection
-- via Neon Data API. Review/apply on Neon development before production.

BEGIN;

-- Onboarding: get/upsert current user's onboarding state.
CREATE OR REPLACE FUNCTION public.get_my_onboarding()
RETURNS public.user_onboarding
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT o.*
  FROM public.user_onboarding o
  WHERE o.user_id = auth.user_id()::uuid
    AND public.current_verified_user_email() IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.upsert_my_onboarding(
  p_persona text DEFAULT NULL,
  p_organization_intent text DEFAULT NULL,
  p_countries_of_interest text[] DEFAULT NULL,
  p_categories_of_interest text[] DEFAULT NULL,
  p_keywords text[] DEFAULT NULL,
  p_preferred_languages text[] DEFAULT NULL,
  p_alert_preferences jsonb DEFAULT NULL,
  p_completed_steps text[] DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS public.user_onboarding
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.user_id()::uuid;
  v_row public.user_onboarding;
  v_status text := COALESCE(p_status, 'in_progress');
BEGIN
  IF v_user_id IS NULL OR public.current_verified_user_email() IS NULL THEN
    RAISE EXCEPTION 'A verified account is required.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_onboarding (
    user_id, persona, organization_intent, countries_of_interest,
    categories_of_interest, keywords, preferred_languages, alert_preferences,
    completed_steps, status, started_at, completed_at, skipped_at
  )
  VALUES (
    v_user_id,
    p_persona,
    p_organization_intent,
    COALESCE(p_countries_of_interest, '{}'::text[]),
    COALESCE(p_categories_of_interest, '{}'::text[]),
    COALESCE(p_keywords, '{}'::text[]),
    COALESCE(p_preferred_languages, '{}'::text[]),
    COALESCE(p_alert_preferences, '{}'::jsonb),
    COALESCE(p_completed_steps, '{}'::text[]),
    v_status,
    CASE WHEN v_status = 'not_started' THEN NULL ELSE now() END,
    CASE WHEN v_status = 'completed' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'skipped' THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    persona = COALESCE(EXCLUDED.persona, public.user_onboarding.persona),
    organization_intent = COALESCE(EXCLUDED.organization_intent, public.user_onboarding.organization_intent),
    countries_of_interest = CASE WHEN p_countries_of_interest IS NULL THEN public.user_onboarding.countries_of_interest ELSE EXCLUDED.countries_of_interest END,
    categories_of_interest = CASE WHEN p_categories_of_interest IS NULL THEN public.user_onboarding.categories_of_interest ELSE EXCLUDED.categories_of_interest END,
    keywords = CASE WHEN p_keywords IS NULL THEN public.user_onboarding.keywords ELSE EXCLUDED.keywords END,
    preferred_languages = CASE WHEN p_preferred_languages IS NULL THEN public.user_onboarding.preferred_languages ELSE EXCLUDED.preferred_languages END,
    alert_preferences = CASE WHEN p_alert_preferences IS NULL THEN public.user_onboarding.alert_preferences ELSE EXCLUDED.alert_preferences END,
    completed_steps = CASE WHEN p_completed_steps IS NULL THEN public.user_onboarding.completed_steps ELSE EXCLUDED.completed_steps END,
    status = COALESCE(p_status, public.user_onboarding.status),
    started_at = COALESCE(public.user_onboarding.started_at, CASE WHEN COALESCE(p_status, public.user_onboarding.status) <> 'not_started' THEN now() ELSE NULL END),
    completed_at = CASE WHEN COALESCE(p_status, public.user_onboarding.status) = 'completed' THEN COALESCE(public.user_onboarding.completed_at, now()) ELSE NULL END,
    skipped_at = CASE WHEN COALESCE(p_status, public.user_onboarding.status) = 'skipped' THEN COALESCE(public.user_onboarding.skipped_at, now()) ELSE NULL END,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- Saved searches
CREATE OR REPLACE FUNCTION public.list_saved_searches(p_organization_id uuid)
RETURNS SETOF public.saved_searches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.saved_searches
    WHERE organization_id = p_organization_id
    ORDER BY updated_at DESC, created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_saved_search(
  p_organization_id uuid,
  p_name text,
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_description text DEFAULT NULL,
  p_is_shared boolean DEFAULT false
)
RETURNS public.saved_searches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.saved_searches;
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.saved_searches (organization_id, created_by, name, description, filters, is_shared)
  VALUES (p_organization_id, auth.user_id()::uuid, btrim(p_name), p_description, COALESCE(p_filters,'{}'::jsonb), COALESCE(p_is_shared,false))
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Alert subscriptions
CREATE OR REPLACE FUNCTION public.list_alert_subscriptions(p_organization_id uuid)
RETURNS SETOF public.alert_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.alert_subscriptions
    WHERE organization_id = p_organization_id
    ORDER BY updated_at DESC, created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_alert_subscription(
  p_organization_id uuid,
  p_name text,
  p_saved_search_id uuid DEFAULT NULL,
  p_opportunity_id uuid DEFAULT NULL,
  p_channel text DEFAULT 'email',
  p_frequency text DEFAULT 'daily',
  p_criteria jsonb DEFAULT '{}'::jsonb
)
RETURNS public.alert_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.alert_subscriptions;
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.alert_subscriptions (
    organization_id, created_by, saved_search_id, opportunity_id, name, channel, frequency, criteria
  ) VALUES (
    p_organization_id, auth.user_id()::uuid, p_saved_search_id, p_opportunity_id, btrim(p_name),
    COALESCE(p_channel,'email'), COALESCE(p_frequency,'daily'), COALESCE(p_criteria,'{}'::jsonb)
  ) RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Applications / pipeline
CREATE OR REPLACE FUNCTION public.list_opportunity_applications(p_organization_id uuid)
RETURNS SETOF public.opportunity_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.opportunity_applications
    WHERE organization_id = p_organization_id
    ORDER BY updated_at DESC, created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_opportunity_application(
  p_organization_id uuid,
  p_opportunity_id uuid,
  p_stage text DEFAULT 'interested',
  p_priority text DEFAULT 'medium',
  p_owner_user_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS public.opportunity_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.opportunity_applications;
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.opportunity_applications (
    organization_id, opportunity_id, created_by, owner_user_id, stage, priority, notes, metadata
  ) VALUES (
    p_organization_id, p_opportunity_id, auth.user_id()::uuid, p_owner_user_id,
    COALESCE(p_stage,'interested'), COALESCE(p_priority,'medium'), p_notes, COALESCE(p_metadata,'{}'::jsonb)
  )
  ON CONFLICT (organization_id, opportunity_id) DO UPDATE SET
    stage = EXCLUDED.stage,
    priority = EXCLUDED.priority,
    owner_user_id = EXCLUDED.owner_user_id,
    notes = COALESCE(EXCLUDED.notes, public.opportunity_applications.notes),
    metadata = CASE WHEN p_metadata IS NULL THEN public.opportunity_applications.metadata ELSE EXCLUDED.metadata END,
    updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Support
CREATE OR REPLACE FUNCTION public.create_support_request(
  p_contact_email text,
  p_subject text,
  p_message text,
  p_category text DEFAULT 'general',
  p_organization_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.support_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.support_requests;
BEGIN
  IF p_organization_id IS NOT NULL AND NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.support_requests (organization_id, user_id, contact_email, category, subject, message, metadata)
  VALUES (p_organization_id, auth.user_id()::uuid, p_contact_email, COALESCE(p_category,'general'), btrim(p_subject), btrim(p_message), COALESCE(p_metadata,'{}'::jsonb))
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Sources & coverage summary (truthful/evidence-backed read model)
CREATE OR REPLACE FUNCTION public.get_sources_coverage_summary()
RETURNS TABLE (
  connector_identifier text,
  source_name text,
  country_code text,
  integration_status text,
  source_health text,
  records_count bigint,
  last_successful_retrieval timestamptz,
  last_error text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    s.connector_identifier,
    s.name AS source_name,
    c.country_code,
    s.integration_status,
    s.source_health,
    COUNT(r.id)::bigint AS records_count,
    s.last_successful_retrieval,
    (
      SELECT e.message
      FROM public.ingestion_errors e
      JOIN public.ingestion_runs ir ON ir.id = e.run_id
      WHERE ir.source_id = s.id
      ORDER BY e.recorded_at DESC
      LIMIT 1
    ) AS last_error
  FROM public.opportunity_sources s
  LEFT JOIN public.source_country_coverage c
    ON c.source_id = s.id
  LEFT JOIN public.opportunity_source_records r
    ON r.source_id = s.id
  GROUP BY s.id, s.connector_identifier, s.name, c.country_code, s.integration_status, s.source_health, s.last_successful_retrieval
  ORDER BY c.country_code NULLS LAST, s.connector_identifier;
$$;

REVOKE ALL ON FUNCTION public.get_my_onboarding() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_my_onboarding(text,text,text[],text[],text[],text[],jsonb,text[],text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_saved_searches(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_saved_search(uuid,text,jsonb,text,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_alert_subscriptions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_alert_subscription(uuid,text,uuid,uuid,text,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_opportunity_applications(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_opportunity_application(uuid,uuid,text,text,uuid,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_support_request(text,text,text,text,uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sources_coverage_summary() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_onboarding() TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_my_onboarding(text,text,text[],text[],text[],text[],jsonb,text[],text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_saved_searches(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_saved_search(uuid,text,jsonb,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_alert_subscriptions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_alert_subscription(uuid,text,uuid,uuid,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_opportunity_applications(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_opportunity_application(uuid,uuid,text,text,uuid,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_support_request(text,text,text,text,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sources_coverage_summary() TO authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_sources_coverage_summary() TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_sources_coverage_summary() TO anonymous';
  END IF;
END;
$$;

COMMIT;
