-- Depends on migrations 0001-0034.
-- Adds organization-scoped opportunity pipeline/application tracking.
-- Apply/review on Neon development before production.

BEGIN;

CREATE TABLE IF NOT EXISTS public.opportunity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE RESTRICT,
  owner_user_id uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'interested' CHECK (stage IN (
    'interested', 'qualified', 'preparing', 'submitted', 'awarded', 'lost', 'no_bid', 'archived'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_at timestamptz,
  submitted_at timestamptz,
  outcome text CHECK (outcome IN ('pending', 'won', 'lost', 'cancelled', 'unknown')),
  value_estimate numeric(20,4) CHECK (value_estimate IS NULL OR value_estimate >= 0),
  currency_code text CHECK (currency_code IS NULL OR currency_code ~ '^[A-Z]{3}$'),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 20000),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS opportunity_applications_org_stage
  ON public.opportunity_applications (organization_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_applications_owner
  ON public.opportunity_applications (organization_id, owner_user_id);

CREATE TABLE IF NOT EXISTS public.opportunity_application_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.opportunity_applications(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'stage_changed', 'note', 'assignment', 'status_update')),
  from_stage text,
  to_stage text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunity_application_events_app_time
  ON public.opportunity_application_events (application_id, occurred_at DESC);

ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY opportunity_applications_member_access
  ON public.opportunity_applications
  FOR ALL TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (
    public.is_organization_member(organization_id)
    AND created_by = auth.user_id()::uuid
  );

CREATE POLICY opportunity_application_events_member_access
  ON public.opportunity_application_events
  FOR ALL TO authenticated
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

DROP TRIGGER IF EXISTS opportunity_applications_touch_updated_at ON public.opportunity_applications;
CREATE TRIGGER opportunity_applications_touch_updated_at
  BEFORE UPDATE ON public.opportunity_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.opportunity_applications, public.opportunity_application_events
FROM PUBLIC, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_applications, public.opportunity_application_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.opportunity_application_events_id_seq TO authenticated;

COMMENT ON TABLE public.opportunity_applications IS 'Tenant-scoped bid/opportunity pipeline tracking for future UI connection.';
COMMENT ON TABLE public.opportunity_application_events IS 'Append-oriented activity/history for opportunity applications.';

COMMIT;
