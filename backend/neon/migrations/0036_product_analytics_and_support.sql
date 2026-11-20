-- Depends on migrations 0001-0035.
-- Adds lightweight product analytics events and support/contact requests.
-- Apply/review on Neon development before production.

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  event_name text NOT NULL CHECK (char_length(btrim(event_name)) BETWEEN 1 AND 120),
  event_category text CHECK (event_category IS NULL OR char_length(event_category) <= 80),
  subject_type text CHECK (subject_type IS NULL OR char_length(subject_type) <= 80),
  subject_id text CHECK (subject_id IS NULL OR char_length(subject_id) <= 200),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(properties) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_org_time
  ON public.product_events (organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS product_events_name_time
  ON public.product_events (event_name, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  contact_email text NOT NULL CHECK (char_length(contact_email) BETWEEN 3 AND 320),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'bug', 'billing', 'data_quality', 'source_request', 'access', 'other')),
  subject text NOT NULL CHECK (char_length(btrim(subject)) BETWEEN 3 AND 200),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 10000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_requests_org_status
  ON public.support_requests (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS support_requests_user
  ON public.support_requests (user_id, created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Events: members can read org events; users can read their own user-scoped events; inserts allowed for authenticated actors for their own/org context.
CREATE POLICY product_events_member_read
  ON public.product_events
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.is_organization_member(organization_id))
    OR (user_id = auth.user_id()::uuid)
  );

CREATE POLICY product_events_insert
  ON public.product_events
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.user_id()::uuid)
    AND (organization_id IS NULL OR public.is_organization_member(organization_id))
  );

CREATE POLICY support_requests_member_read
  ON public.support_requests
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.is_organization_member(organization_id))
    OR (user_id = auth.user_id()::uuid)
  );

CREATE POLICY support_requests_insert
  ON public.support_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.user_id()::uuid)
    AND (organization_id IS NULL OR public.is_organization_member(organization_id))
  );

CREATE POLICY support_requests_member_update
  ON public.support_requests
  FOR UPDATE TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.is_organization_member(organization_id))
    OR (user_id = auth.user_id()::uuid)
  )
  WITH CHECK (
    (organization_id IS NULL OR public.is_organization_member(organization_id))
    OR (user_id = auth.user_id()::uuid)
  );

DROP TRIGGER IF EXISTS support_requests_touch_updated_at ON public.support_requests;
CREATE TRIGGER support_requests_touch_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.product_events, public.support_requests FROM PUBLIC, authenticated;
GRANT SELECT, INSERT ON public.product_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.product_events_id_seq TO authenticated;

COMMENT ON TABLE public.product_events IS 'Lightweight analytics/audit-style product events for future UI and reporting.';
COMMENT ON TABLE public.support_requests IS 'User/org support and feedback requests for future Support UI connection.';

COMMIT;
