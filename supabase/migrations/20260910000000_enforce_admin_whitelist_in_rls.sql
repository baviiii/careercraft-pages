-- Enforce the admin whitelist at the database layer.
--
-- THE HOLE: the admin UI (useAdminAuth) requires role AND whitelist, and edge
-- functions' requireAdmin() calls is_admin() which also requires both. But
-- every RLS policy on the admin tables checked only has_role(auth.uid(),
-- 'admin'). So a user holding the admin role WITHOUT a whitelist row — exactly
-- the state the whitelist exists to catch — was blocked by the UI yet could
-- still read and write every admin table straight through PostgREST from
-- DevTools. Worst case: INSERT their own email into admin_whitelist and unlock
-- the full UI. The whitelist was a curtain, not a wall.
--
-- THE FIX: every admin-gated policy now uses is_admin(auth.uid())
-- (20260821000000_…:22-37 — role AND whitelist, SECURITY DEFINER so it reads
-- user_roles/admin_whitelist without recursing through these same policies).
-- One notion of "admin" across UI, edge functions, and RLS.
--
-- RECOVERY: if every whitelist row is ever lost, no session can pass is_admin
-- and the admin surface locks. That is recoverable only via the service role
-- (SQL editor / migration), which is already the documented bootstrap path in
-- DEMO_ADMIN_SETUP.md. The previous user_roles policies kept has_role() for
-- exactly this repair scenario; that convenience is what made the escalation
-- possible, so it goes. Service role bypasses RLS and remains the repair tool.

-- ═══ admin_whitelist — the table that must be hardest to touch ═════════════
DROP POLICY IF EXISTS "Admins can view whitelist" ON public.admin_whitelist;
CREATE POLICY "Admins can view whitelist"
ON public.admin_whitelist FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage whitelist" ON public.admin_whitelist;
CREATE POLICY "Admins can manage whitelist"
ON public.admin_whitelist FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ═══ user_roles — role writes need the full gate too ═══════════════════════
-- A role-only "admin" must not be able to delete real admins' role rows or
-- hand the role to others. The self-delete guard stays: even a whitelisted
-- admin cannot remove their own admin row by accident.
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    AND NOT (user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
-- "Users can view their own roles" (20251127102622_…:40-43) is untouched:
-- self-reads never leaked anything and useAdminAuth depends on them.

-- ═══ activity_logs / login_attempts — the PII feeds ════════════════════════
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- ═══ user_sessions ═════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can manage sessions" ON public.user_sessions;
CREATE POLICY "System can manage sessions"
ON public.user_sessions FOR ALL
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ═══ suspicious_activities ═════════════════════════════════════════════════
DROP POLICY IF EXISTS "Admins can view suspicious activities" ON public.suspicious_activities;
CREATE POLICY "Admins can view suspicious activities"
ON public.suspicious_activities FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage suspicious activities" ON public.suspicious_activities;
CREATE POLICY "Admins can manage suspicious activities"
ON public.suspicious_activities FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ═══ chat_prompts ══════════════════════════════════════════════════════════
-- "Everyone can read active prompts" stays; only management tightens.
DROP POLICY IF EXISTS "Admins can manage prompts" ON public.chat_prompts;
CREATE POLICY "Admins can manage prompts"
ON public.chat_prompts FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ═══ plans / limits / subscriptions / overrides / upgrade requests ═════════
-- Public pricing reads ("Everyone can read active plans", users reading their
-- own rows) are untouched; only the admin write/read-all surfaces tighten.
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans"
ON public.plans FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage plan limits" ON public.plan_limits;
CREATE POLICY "Admins can manage plan limits"
ON public.plan_limits FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can manage subscriptions"
ON public.user_subscriptions FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all subscription events" ON public.user_subscription_events;
CREATE POLICY "Admins can read all subscription events"
ON public.user_subscription_events FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage overrides" ON public.user_limit_overrides;
CREATE POLICY "Admins can manage overrides"
ON public.user_limit_overrides FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all requests" ON public.plan_upgrade_requests;
CREATE POLICY "Admins can read all requests"
  ON public.plan_upgrade_requests FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ═══ get_plan_usage — same boundary, RPC form ══════════════════════════════
-- The cross-user guard checked has_role only, so a role-only "admin" could
-- read anyone's usage numbers. Body unchanged from 20260821000300_…:325-392
-- except the guard now calls is_admin.
CREATE OR REPLACE FUNCTION public.get_plan_usage(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_key    TEXT;
  v_month_start TIMESTAMPTZ;
  v_hour_start  TIMESTAMPTZ;
  v_rows        JSONB;
BEGIN
  -- SECURITY DEFINER + a caller-supplied user id: without this guard any
  -- signed-in user could read anyone else's usage. auth.uid() is NULL when
  -- the service role calls this from an edge function, which is allowed.
  IF auth.uid() IS NOT NULL
     AND p_user_id <> auth.uid()
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized to read usage for another user';
  END IF;

  SELECT COALESCE(
    (SELECT us.plan_key FROM public.user_subscriptions us
      WHERE us.user_id = p_user_id AND us.status IN ('active','trialing')),
    (SELECT p.key FROM public.plans p WHERE p.is_default AND p.is_active LIMIT 1)
  ) INTO v_plan_key;

  v_month_start := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_hour_start  := date_trunc('hour',  now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  SELECT jsonb_agg(jsonb_build_object(
    'resource',      r.resource,
    'label',         r.label,
    'is_enabled',    r.is_enabled,
    'monthly_limit', r.monthly_limit,
    'monthly_used',  COALESCE(m.request_count, 0),
    'hourly_limit',  r.hourly_limit,
    'hourly_used',   COALESCE(h.request_count, 0)
  ) ORDER BY r.label)
  INTO v_rows
  FROM (
    SELECT
      l.resource,
      l.label,
      COALESCE(o.is_enabled,    l.is_enabled)    AS is_enabled,
      COALESCE(o.monthly_limit, l.monthly_limit) AS monthly_limit,
      COALESCE(o.hourly_limit,  l.hourly_limit)  AS hourly_limit
    FROM public.plan_limits l
    LEFT JOIN public.user_limit_overrides o
      ON o.user_id = p_user_id
     AND o.resource = l.resource
     AND (o.expires_at IS NULL OR o.expires_at > now())
    WHERE l.plan_key = v_plan_key
  ) r
  LEFT JOIN public.edge_function_rate_limits m
    ON m.user_id = p_user_id AND m.resource = '_m_' || r.resource AND m.window_start = v_month_start
  LEFT JOIN public.edge_function_rate_limits h
    ON h.user_id = p_user_id AND h.resource = r.resource AND h.window_start = v_hour_start;

  RETURN jsonb_build_object(
    'plan_key',  v_plan_key,
    'resets_at', (date_trunc('month', now() AT TIME ZONE 'UTC') + INTERVAL '1 month') AT TIME ZONE 'UTC',
    'daily_tokens_used', public.tokens_used_today(p_user_id),
    'resources', COALESCE(v_rows, '[]'::jsonb)
  );
END;
$$;
