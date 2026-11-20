-- Depends on migrations 0001-0033.
-- Adds saved searches, watchlists/alerts, and notification records for
-- opportunity monitoring. Apply/review on Neon development before production.

BEGIN;

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filters) = 'object'),
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_searches_org_updated
  ON public.saved_searches (organization_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE RESTRICT,
  saved_search_id uuid REFERENCES public.saved_searches(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app')),
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(criteria) = 'object'),
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (saved_search_id IS NOT NULL OR opportunity_id IS NOT NULL OR criteria <> '{}'::jsonb)
);

CREATE INDEX IF NOT EXISTS alert_subscriptions_org_status
  ON public.alert_subscriptions (organization_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS alert_subscriptions_saved_search
  ON public.alert_subscriptions (saved_search_id) WHERE saved_search_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.alert_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.alert_subscriptions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('new_match', 'deadline_warning', 'amendment', 'status_change', 'digest')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'suppressed')),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alert_notifications_org_created
  ON public.alert_notifications (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alert_notifications_delivery
  ON public.alert_notifications (delivery_status, scheduled_for);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_searches_member_access
  ON public.saved_searches
  FOR ALL TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (
    public.is_organization_member(organization_id)
    AND created_by = auth.user_id()::uuid
  );

CREATE POLICY alert_subscriptions_member_access
  ON public.alert_subscriptions
  FOR ALL TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (
    public.is_organization_member(organization_id)
    AND created_by = auth.user_id()::uuid
  );

CREATE POLICY alert_notifications_member_read
  ON public.alert_notifications
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

DROP TRIGGER IF EXISTS saved_searches_touch_updated_at ON public.saved_searches;
CREATE TRIGGER saved_searches_touch_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS alert_subscriptions_touch_updated_at ON public.alert_subscriptions;
CREATE TRIGGER alert_subscriptions_touch_updated_at
  BEFORE UPDATE ON public.alert_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.saved_searches, public.alert_subscriptions, public.alert_notifications
FROM PUBLIC, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches, public.alert_subscriptions TO authenticated;
GRANT SELECT ON public.alert_notifications TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.alert_notifications_id_seq TO authenticated;

COMMENT ON TABLE public.saved_searches IS 'Tenant-scoped saved discovery criteria for future UI and alert generation.';
COMMENT ON TABLE public.alert_subscriptions IS 'Tenant-scoped monitoring subscriptions (search/opportunity/criteria based).';
COMMENT ON TABLE public.alert_notifications IS 'Notification/delivery log; member-readable, written by backend jobs/functions.';

COMMIT;
