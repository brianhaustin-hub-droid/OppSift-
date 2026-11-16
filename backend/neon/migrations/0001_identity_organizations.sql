CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  display_name text CHECK (display_name IS NULL OR char_length(display_name) <= 120),
  image_url text CHECK (image_url IS NULL OR char_length(image_url) <= 2048),
  locale text NOT NULL DEFAULT 'en' CHECK (char_length(locale) BETWEEN 2 AND 35),
  time_zone text CHECK (time_zone IS NULL OR char_length(time_zone) <= 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  organization_type text NOT NULL DEFAULT 'company'
    CHECK (organization_type IN ('company', 'nonprofit', 'government', 'education', 'individual', 'other')),
  country_code text CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  website text CHECK (website IS NULL OR char_length(website) <= 2048),
  description text CHECK (description IS NULL OR char_length(description) <= 5000),
  contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 320),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_by uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_memberships_one_active_owner
  ON public.organization_memberships (organization_id)
  WHERE role = 'owner' AND status = 'active';
CREATE INDEX IF NOT EXISTS organization_memberships_user_lookup
  ON public.organization_memberships (user_id, organization_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.organization_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL CHECK (char_length(invited_email) BETWEEN 3 AND 320),
  role text NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  invited_by uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE RESTRICT,
  accepted_by uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_invitations_org_status
  ON public.organization_invitations (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS organization_invitations_recipient_status
  ON public.organization_invitations (invited_email, status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_one_pending_email
  ON public.organization_invitations (organization_id, invited_email)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.organization_invitation_tokens (
  invitation_id uuid PRIMARY KEY REFERENCES public.organization_invitations(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES neon_auth."user"(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_org_time
  ON public.audit_logs (organization_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_verified_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT lower(u.email)
  FROM neon_auth."user" AS u
  WHERE u.id = auth.user_id()::uuid
    AND u."emailVerified" = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.user_id()::uuid
      AND m.status = 'active'
      AND public.current_verified_user_email() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organizations AS o
        WHERE o.id = m.organization_id
          AND o.status = 'active'
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_organization_role(
  p_organization_id uuid,
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships AS m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.user_id()::uuid
      AND m.status = 'active'
      AND m.role = ANY (p_roles)
      AND public.current_verified_user_email() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organizations AS o
        WHERE o.id = m.organization_id
          AND o.status = 'active'
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.list_organization_members(p_organization_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  role text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.has_organization_role(
    p_organization_id,
    ARRAY['owner', 'admin']
  ) THEN
    RAISE EXCEPTION 'Organization manager permission is required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.user_id, u.email, p.display_name, m.role, m.status, m.created_at
  FROM public.organization_memberships AS m
  JOIN neon_auth."user" AS u ON u.id = m.user_id
  LEFT JOIN public.user_profiles AS p ON p.user_id = m.user_id
  WHERE m.organization_id = p_organization_id
  ORDER BY m.created_at, m.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_organization_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_row jsonb;
  v_organization_id uuid;
  v_entity_id text;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_organization_id := CASE
    WHEN TG_TABLE_NAME = 'organizations' THEN (v_row ->> 'id')::uuid
    ELSE (v_row ->> 'organization_id')::uuid
  END;
  v_entity_id := coalesce(v_row ->> 'id', v_row ->> 'organization_id');

  INSERT INTO public.audit_logs (
    organization_id, actor_user_id, entity_type, entity_id, action
  )
  VALUES (
    v_organization_id,
    auth.user_id()::uuid,
    TG_TABLE_NAME,
    v_entity_id,
    lower(TG_OP)
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_organization(
  p_name text,
  p_slug text,
  p_organization_type text DEFAULT 'company',
  p_country_code text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.user_id()::uuid;
  v_organization_id uuid;
BEGIN
  IF v_user_id IS NULL OR public.current_verified_user_email() IS NULL THEN
    RAISE EXCEPTION 'A verified account is required to create an organization.'
      USING ERRCODE = '42501';
  END IF;

  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 2 AND 160
     OR p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     OR char_length(p_slug) > 80
     OR p_organization_type IS NULL
     OR p_organization_type NOT IN ('company', 'nonprofit', 'government', 'education', 'individual', 'other')
     OR (p_country_code IS NOT NULL AND p_country_code !~ '^[A-Z]{2}$')
     OR (p_website IS NOT NULL AND char_length(p_website) > 2048)
     OR (p_description IS NOT NULL AND char_length(p_description) > 5000) THEN
    RAISE EXCEPTION 'Organization details are invalid.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.organizations (
    name, slug, organization_type, country_code, website, description, created_by
  )
  VALUES (
    btrim(p_name), p_slug, p_organization_type, p_country_code,
    nullif(btrim(p_website), ''), nullif(btrim(p_description), ''), v_user_id
  )
  RETURNING id INTO v_organization_id;

  INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES (v_organization_id, v_user_id, 'owner');

  INSERT INTO public.organization_settings (organization_id)
  VALUES (v_organization_id);

  RETURN v_organization_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_organization_invitation(
  p_organization_id uuid,
  p_email text,
  p_role text
)
RETURNS TABLE (invitation_id uuid, invitation_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.user_id()::uuid;
  v_email text := lower(btrim(p_email));
  v_token text;
  v_expiry timestamptz := now() + interval '7 days';
  v_invitation_id uuid;
  v_actor_role text;
BEGIN
  IF v_user_id IS NULL OR public.current_verified_user_email() IS NULL THEN
    RAISE EXCEPTION 'A verified account is required to invite members.'
      USING ERRCODE = '42501';
  END IF;

  SELECT m.role INTO v_actor_role
  FROM public.organization_memberships AS m
  WHERE m.organization_id = p_organization_id
    AND m.user_id = v_user_id
    AND m.status = 'active';

  IF v_actor_role IS NULL
     OR v_actor_role NOT IN ('owner', 'admin')
     OR p_email IS NULL
     OR p_role IS NULL
     OR p_role NOT IN ('admin', 'member', 'viewer')
     OR (v_actor_role = 'admin' AND p_role = 'admin')
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     OR char_length(v_email) > 320
     OR v_email = public.current_verified_user_email()
     OR NOT EXISTS (
       SELECT 1 FROM public.organizations AS o
       WHERE o.id = p_organization_id AND o.status = 'active'
     ) THEN
    RAISE EXCEPTION 'Invitation cannot be created.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.organization_invitations AS i
  SET status = 'expired', updated_at = now()
  WHERE i.organization_id = p_organization_id
    AND i.invited_email = v_email
    AND i.status = 'pending'
    AND i.expires_at <= now();

  IF EXISTS (
    SELECT 1
    FROM public.organization_invitations AS i
    WHERE i.organization_id = p_organization_id
      AND i.invited_email = v_email
      AND i.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending invitation already exists for this address.'
      USING ERRCODE = '23505';
  END IF;

  v_token := encode(public.gen_random_bytes(32), 'hex');

  INSERT INTO public.organization_invitations (
    organization_id, invited_email, role, invited_by, expires_at
  )
  VALUES (p_organization_id, v_email, p_role, v_user_id, v_expiry)
  RETURNING id INTO v_invitation_id;

  INSERT INTO public.organization_invitation_tokens (invitation_id, token_hash)
  VALUES (
    v_invitation_id,
    encode(public.digest(convert_to(v_token, 'UTF8'), 'sha256'), 'hex')
  );

  RETURN QUERY SELECT v_invitation_id, v_token, v_expiry;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_invitation public.organization_invitations%ROWTYPE;
  v_email text := public.current_verified_user_email();
  v_hash text;
BEGIN
  IF auth.user_id() IS NULL OR v_email IS NULL
     OR p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;

  v_hash := encode(public.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  SELECT i.* INTO v_invitation
  FROM public.organization_invitations AS i
  JOIN public.organization_invitation_tokens AS t ON t.invitation_id = i.id
  WHERE t.token_hash = v_hash
  FOR UPDATE OF i;

  IF NOT FOUND OR v_invitation.status <> 'pending'
     OR v_invitation.expires_at <= now()
     OR v_invitation.invited_email <> v_email THEN
    RETURN false;
  END IF;

  INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES (v_invitation.organization_id, auth.user_id()::uuid, v_invitation.role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_by = auth.user_id()::uuid, updated_at = now()
  WHERE id = v_invitation.id;

  DELETE FROM public.organization_invitation_tokens
  WHERE invitation_id = v_invitation.id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_organization_invitation(p_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_invitation public.organization_invitations%ROWTYPE;
  v_email text := public.current_verified_user_email();
  v_hash text;
BEGIN
  IF auth.user_id() IS NULL OR v_email IS NULL
     OR p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;

  v_hash := encode(public.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  SELECT i.* INTO v_invitation
  FROM public.organization_invitations AS i
  JOIN public.organization_invitation_tokens AS t ON t.invitation_id = i.id
  WHERE t.token_hash = v_hash
  FOR UPDATE OF i;

  IF NOT FOUND OR v_invitation.status <> 'pending'
     OR v_invitation.expires_at <= now()
     OR v_invitation.invited_email <> v_email THEN
    RETURN false;
  END IF;

  UPDATE public.organization_invitations
  SET status = 'declined', updated_at = now()
  WHERE id = v_invitation.id;

  DELETE FROM public.organization_invitation_tokens
  WHERE invitation_id = v_invitation.id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_organization_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_organization_id uuid;
BEGIN
  SELECT i.organization_id INTO v_organization_id
  FROM public.organization_invitations AS i
  WHERE i.id = p_invitation_id AND i.status = 'pending'
  FOR UPDATE;

  IF v_organization_id IS NULL
     OR NOT public.has_organization_role(v_organization_id, ARRAY['owner', 'admin']) THEN
    RETURN false;
  END IF;

  UPDATE public.organization_invitations
  SET status = 'revoked', updated_at = now()
  WHERE id = p_invitation_id;

  DELETE FROM public.organization_invitation_tokens
  WHERE invitation_id = p_invitation_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_organization_member_role(
  p_organization_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor_role text;
BEGIN
  SELECT m.role INTO v_actor_role
  FROM public.organization_memberships AS m
  WHERE m.organization_id = p_organization_id
    AND m.user_id = auth.user_id()::uuid
    AND m.status = 'active';

  IF v_actor_role IS NULL
     OR public.current_verified_user_email() IS NULL
     OR p_role IS NULL
     OR p_role NOT IN ('admin', 'member', 'viewer')
     OR (v_actor_role = 'admin' AND p_role NOT IN ('member', 'viewer'))
     OR NOT EXISTS (
       SELECT 1 FROM public.organization_memberships AS target
       WHERE target.organization_id = p_organization_id
         AND target.user_id = p_user_id
         AND target.status = 'active'
         AND target.role <> 'owner'
     )
     OR (
       v_actor_role = 'admin'
       AND EXISTS (
         SELECT 1
         FROM public.organization_memberships AS target
         WHERE target.organization_id = p_organization_id
           AND target.user_id = p_user_id
           AND target.status = 'active'
           AND target.role = 'admin'
       )
     )
     OR v_actor_role NOT IN ('owner', 'admin') THEN
    RETURN false;
  END IF;

  UPDATE public.organization_memberships
  SET role = p_role, updated_at = now()
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND role <> 'owner';

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_organization_member(
  p_organization_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_target_role text;
  v_actor_role text;
BEGIN
  SELECT m.role INTO v_target_role
  FROM public.organization_memberships AS m
  WHERE m.organization_id = p_organization_id
    AND m.user_id = p_user_id
    AND m.status = 'active'
  FOR UPDATE;

  SELECT m.role INTO v_actor_role
  FROM public.organization_memberships AS m
  WHERE m.organization_id = p_organization_id
    AND m.user_id = auth.user_id()::uuid
    AND m.status = 'active';

  IF public.current_verified_user_email() IS NULL
     OR v_target_role IS NULL
     OR v_target_role = 'owner'
     OR (p_user_id <> auth.user_id()::uuid AND v_actor_role NOT IN ('owner', 'admin'))
     OR (v_actor_role = 'admin' AND v_target_role = 'admin') THEN
    RETURN false;
  END IF;

  DELETE FROM public.organization_memberships
  WHERE organization_id = p_organization_id AND user_id = p_user_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_organization_ownership(
  p_organization_id uuid,
  p_new_owner_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.user_id() IS NULL
     OR NOT public.has_organization_role(p_organization_id, ARRAY['owner'])
     OR p_new_owner_user_id = auth.user_id()::uuid
     OR NOT EXISTS (
       SELECT 1 FROM public.organization_memberships AS target
       WHERE target.organization_id = p_organization_id
         AND target.user_id = p_new_owner_user_id
         AND target.status = 'active'
         AND target.role <> 'owner'
     ) THEN
    RETURN false;
  END IF;

  UPDATE public.organization_memberships
  SET role = 'admin', updated_at = now()
  WHERE organization_id = p_organization_id
    AND user_id = auth.user_id()::uuid
    AND role = 'owner';

  UPDATE public.organization_memberships
  SET role = 'owner', updated_at = now()
  WHERE organization_id = p_organization_id
    AND user_id = p_new_owner_user_id
    AND status = 'active';

  RETURN FOUND;
END;
$$;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'user_profiles',
    'organizations',
    'organization_memberships',
    'organization_settings',
    'organization_invitations',
    'organization_invitation_tokens',
    'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS user_profiles_self ON public.user_profiles;
CREATE POLICY user_profiles_self ON public.user_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.user_id()::uuid)
  WITH CHECK (user_id = auth.user_id()::uuid);

DROP POLICY IF EXISTS organizations_member_read ON public.organizations;
CREATE POLICY organizations_member_read ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_organization_member(id));

DROP POLICY IF EXISTS organizations_admin_update ON public.organizations;
CREATE POLICY organizations_admin_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.has_organization_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_organization_role(id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS memberships_visible_to_member_or_manager ON public.organization_memberships;
CREATE POLICY memberships_visible_to_member_or_manager ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (
    (
      user_id = auth.user_id()::uuid
      AND public.current_verified_user_email() IS NOT NULL
    )
    OR public.has_organization_role(organization_id, ARRAY['owner', 'admin'])
  );

DROP POLICY IF EXISTS organization_settings_member_read ON public.organization_settings;
CREATE POLICY organization_settings_member_read ON public.organization_settings
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS organization_settings_admin_update ON public.organization_settings;
CREATE POLICY organization_settings_admin_update ON public.organization_settings
  FOR UPDATE TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_organization_role(organization_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS invitations_visible_to_managers_or_recipient ON public.organization_invitations;
CREATE POLICY invitations_visible_to_managers_or_recipient ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['owner', 'admin'])
    OR (
      invited_email = public.current_verified_user_email()
      AND status = 'pending'
    )
  );

DROP POLICY IF EXISTS audit_logs_visible_to_managers ON public.audit_logs;
CREATE POLICY audit_logs_visible_to_managers ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['owner', 'admin']));

DROP TRIGGER IF EXISTS user_profiles_touch_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_touch_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS organizations_touch_updated_at ON public.organizations;
CREATE TRIGGER organizations_touch_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS organization_memberships_touch_updated_at ON public.organization_memberships;
CREATE TRIGGER organization_memberships_touch_updated_at
  BEFORE UPDATE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS organization_settings_touch_updated_at ON public.organization_settings;
CREATE TRIGGER organization_settings_touch_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS organization_invitations_touch_updated_at ON public.organization_invitations;
CREATE TRIGGER organization_invitations_touch_updated_at
  BEFORE UPDATE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS organizations_audit ON public.organizations;
CREATE TRIGGER organizations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.record_organization_audit();

DROP TRIGGER IF EXISTS memberships_audit ON public.organization_memberships;
CREATE TRIGGER memberships_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_memberships
  FOR EACH ROW EXECUTE FUNCTION public.record_organization_audit();

DROP TRIGGER IF EXISTS invitations_audit ON public.organization_invitations;
CREATE TRIGGER invitations_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_invitations
  FOR EACH ROW EXECUTE FUNCTION public.record_organization_audit();

DROP TRIGGER IF EXISTS organization_settings_audit ON public.organization_settings;
CREATE TRIGGER organization_settings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_settings
  FOR EACH ROW EXECUTE FUNCTION public.record_organization_audit();

REVOKE ALL ON public.user_profiles,
  public.organizations,
  public.organization_memberships,
  public.organization_settings,
  public.organization_invitations,
  public.organization_invitation_tokens,
  public.audit_logs
FROM PUBLIC, authenticated;

DO $$
DECLARE
  v_role text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'anonymous'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
      EXECUTE format(
        'REVOKE ALL ON public.user_profiles, public.organizations, public.organization_memberships, public.organization_settings, public.organization_invitations, public.organization_invitation_tokens, public.audit_logs FROM %I',
        v_role
      );
    END IF;
  END LOOP;
END;
$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.organizations TO authenticated;
GRANT UPDATE (
  name,
  slug,
  organization_type,
  country_code,
  website,
  description,
  contact_email
) ON public.organizations TO authenticated;
GRANT SELECT ON public.organization_memberships,
  public.organization_invitations,
  public.audit_logs TO authenticated;
GRANT SELECT ON public.organization_settings TO authenticated;
GRANT UPDATE (settings) ON public.organization_settings TO authenticated;

REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.record_organization_audit() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.current_verified_user_email() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.is_organization_member(uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.has_organization_role(uuid, text[]) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.list_organization_members(uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.create_organization(text, text, text, text, text, text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.issue_organization_invitation(uuid, text, text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.accept_organization_invitation(text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.decline_organization_invitation(text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.revoke_organization_invitation(uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.change_organization_member_role(uuid, uuid, text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.remove_organization_member(uuid, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.transfer_organization_ownership(uuid, uuid) FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.current_verified_user_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_organization_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_organization_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_organization_invitation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_organization_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_organization_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_organization_member_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_organization_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_organization_ownership(uuid, uuid) TO authenticated;
