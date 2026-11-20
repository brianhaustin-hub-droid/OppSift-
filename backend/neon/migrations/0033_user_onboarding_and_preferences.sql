-- Depends on migrations 0001-0032.
-- Adds user onboarding state and per-user product preferences so UI can be
-- connected later without schema changes. Apply/review on Neon development
-- before production.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  persona text CHECK (persona IN ('supplier_sme', 'consultant_bid_writer', 'business_development_team', 'admin_analyst', 'other')),
  organization_intent text CHECK (organization_intent IN ('create', 'join', 'individual', 'undecided')),
  countries_of_interest text[] NOT NULL DEFAULT '{}'::text[],
  categories_of_interest text[] NOT NULL DEFAULT '{}'::text[]
    CHECK (categories_of_interest <@ ARRAY['government', 'grants', 'commercial']::text[]),
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  preferred_languages text[] NOT NULL DEFAULT '{}'::text[],
  alert_preferences jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(alert_preferences) = 'object'),
  completed_steps text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'completed' OR completed_at IS NOT NULL),
  CHECK (status <> 'skipped' OR skipped_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS user_onboarding_status
  ON public.user_onboarding (status, updated_at DESC);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_onboarding_self_access
  ON public.user_onboarding
  FOR ALL TO authenticated
  USING (user_id = auth.user_id()::uuid AND public.current_verified_user_email() IS NOT NULL)
  WITH CHECK (user_id = auth.user_id()::uuid AND public.current_verified_user_email() IS NOT NULL);

DROP TRIGGER IF EXISTS user_onboarding_touch_updated_at ON public.user_onboarding;
CREATE TRIGGER user_onboarding_touch_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

REVOKE ALL ON public.user_onboarding FROM PUBLIC, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding TO authenticated;

COMMENT ON TABLE public.user_onboarding IS
  'Per-user onboarding and discovery preferences; self-scoped by RLS for future UI connection.';

COMMIT;
