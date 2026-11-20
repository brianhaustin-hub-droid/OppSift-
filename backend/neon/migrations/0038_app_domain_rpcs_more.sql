-- Depends on migrations 0001-0037.
-- Additional draft RPCs for app domains (updates/deletes, notification reads).
-- Review/apply on Neon development before production.

BEGIN;

CREATE OR REPLACE FUNCTION public.list_alert_notifications(p_organization_id uuid, p_limit integer DEFAULT 50)
RETURNS SETOF public.alert_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.alert_notifications
    WHERE organization_id = p_organization_id
    ORDER BY created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
END;
$$;

CREATE OR REPLACE FUNCTION public.update_alert_subscription_status(
  p_organization_id uuid,
  p_subscription_id uuid,
  p_status text
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
  UPDATE public.alert_subscriptions
  SET status = p_status, updated_at = now()
  WHERE id = p_subscription_id AND organization_id = p_organization_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert subscription not found.' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_saved_search(p_organization_id uuid, p_saved_search_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT public.is_organization_member(p_organization_id) THEN
    RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.saved_searches
  WHERE id = p_saved_search_id AND organization_id = p_organization_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_support_requests(p_organization_id uuid DEFAULT NULL)
RETURNS SETOF public.support_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_organization_id IS NOT NULL THEN
    IF NOT public.is_organization_member(p_organization_id) THEN
      RAISE EXCEPTION 'Organization membership is required.' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
      SELECT * FROM public.support_requests
      WHERE organization_id = p_organization_id
      ORDER BY created_at DESC;
  ELSE
    RETURN QUERY
      SELECT * FROM public.support_requests
      WHERE user_id = auth.user_id()::uuid
      ORDER BY created_at DESC;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.list_alert_notifications(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_alert_subscription_status(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_saved_search(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_support_requests(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.list_alert_notifications(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_alert_subscription_status(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_saved_search(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_support_requests(uuid) TO authenticated;

COMMIT;
