-- Plan-aware quota resolution and consumption.
--
-- One round trip resolves the user's plan, applies any per-user override,
-- and atomically consumes from both the monthly and the hourly counter.
--
-- ── Why the counters live in the existing table ───────────────────────────
-- edge_function_rate_limits already has the right shape and the right
-- atomicity. Two windows are stored as two rows with different keys:
--
--   hourly:  resource = '<resource>'        window_start = UTC hour boundary
--   monthly: resource = '_m_<resource>'     window_start = UTC month boundary
--
-- The hourly key is deliberately the BARE resource name. For a 60-minute
-- window the legacy epoch floor, floor(epoch/3600)*3600, is bit-identical to
-- date_trunc('hour', …), so the counters that consume_edge_function_quota is
-- already maintaining carry over untouched — nobody's hourly allowance resets
-- on deploy.
--
-- The '_m_' prefix cannot collide with a real resource: the legacy RPC
-- validates its argument against '^[a-z0-9][a-z0-9_-]{1,63}$', which rejects a
-- leading underscore, so no month row can ever have been written by it.
--
-- ── Why the month layer could not reuse the epoch floor ───────────────────
-- floor(epoch / (30*86400)) produces rolling 30-day buckets that drift out of
-- phase with the calendar. "5 analyses per month" has to mean the calendar
-- month the user sees on their invoice, so the month layer sets window_start
-- to date_trunc('month', …) explicitly.

-- ═══ Effective limits for one user + resource ══════════════════════════════
-- Resolution order: user override (if not expired) → plan limit → plan default.
CREATE OR REPLACE FUNCTION public.resolve_plan_limits(
  p_user_id UUID,
  p_resource TEXT
)
RETURNS TABLE (
  plan_key            TEXT,
  is_enabled          BOOLEAN,
  monthly_limit       INTEGER,
  hourly_limit        INTEGER,
  max_model_tier      TEXT,
  max_tokens_per_call INTEGER,
  daily_token_ceiling BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sub AS (
    SELECT us.plan_key, us.status, us.daily_token_ceiling_override
    FROM public.user_subscriptions us
    WHERE us.user_id = p_user_id
  ),
  -- A lapsed subscription falls back to the default plan rather than locking
  -- the user out entirely.
  eff AS (
    SELECT COALESCE(
      (SELECT s.plan_key FROM sub s WHERE s.status IN ('active','trialing')),
      (SELECT p.key FROM public.plans p WHERE p.is_default AND p.is_active LIMIT 1)
    ) AS plan_key
  ),
  pl AS (
    SELECT * FROM public.plan_limits l
    WHERE l.plan_key = (SELECT plan_key FROM eff)
      AND l.resource = p_resource
  ),
  ov AS (
    SELECT * FROM public.user_limit_overrides o
    WHERE o.user_id = p_user_id
      AND o.resource = p_resource
      AND (o.expires_at IS NULL OR o.expires_at > now())
  ),
  pn AS (
    SELECT * FROM public.plans p WHERE p.key = (SELECT plan_key FROM eff)
  )
  SELECT
    (SELECT plan_key FROM eff),
    COALESCE((SELECT o.is_enabled FROM ov o), (SELECT l.is_enabled FROM pl l), TRUE),
    COALESCE((SELECT o.monthly_limit FROM ov o), (SELECT l.monthly_limit FROM pl l)),
    COALESCE((SELECT o.hourly_limit  FROM ov o), (SELECT l.hourly_limit  FROM pl l)),
    COALESCE((SELECT l.max_model_tier FROM pl l), (SELECT p.max_model_tier FROM pn p), 'fast'),
    COALESCE((SELECT l.max_tokens_per_call FROM pl l), (SELECT p.max_tokens_per_call FROM pn p), 4000),
    COALESCE((SELECT s.daily_token_ceiling_override FROM sub s), (SELECT p.daily_token_ceiling FROM pn p))
$$;

-- Service role only. It takes an arbitrary user id and is SECURITY DEFINER,
-- so granting it to `authenticated` would let any signed-in user read anyone
-- else's plan. The UI gets what it needs from get_plan_usage instead.
REVOKE ALL ON FUNCTION public.resolve_plan_limits(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_plan_limits(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.resolve_plan_limits(UUID, TEXT) IS
  'Effective limits for a user+resource: override beats plan, plan beats default.';


-- ═══ Consume ═══════════════════════════════════════════════════════════════
-- Returns JSONB so one call carries everything the edge function needs to
-- build a useful 429 and to seed the in-request token meter.
--
-- p_dry_run consumes nothing and reports what would happen — the observe-only
-- mode used while limits are being tuned against real traffic.
CREATE OR REPLACE FUNCTION public.consume_plan_quota(
  p_user_id  UUID,
  p_resource TEXT,
  p_dry_run  BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lim            RECORD;
  v_month_key      TEXT;
  v_month_start    TIMESTAMPTZ;
  v_hour_start     TIMESTAMPTZ;
  v_month_used     INTEGER := 0;
  v_hour_used      INTEGER := 0;
  v_tokens_used    BIGINT  := 0;
  v_allowed        BOOLEAN := TRUE;
  v_reason         TEXT    := NULL;
  v_limit          INTEGER := NULL;
  v_resets_at      TIMESTAMPTZ := NULL;
BEGIN
  IF p_resource !~ '^[a-z0-9][a-z0-9_-]{1,63}$' THEN
    RAISE EXCEPTION 'invalid resource';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id required';
  END IF;

  SELECT * INTO v_lim FROM public.resolve_plan_limits(p_user_id, p_resource);

  v_month_key   := '_m_' || p_resource;
  v_month_start := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_hour_start  := date_trunc('hour',  now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  v_tokens_used := public.tokens_used_today(p_user_id);

  -- ── Feature switched off for this plan: a hard paywall, not a rate limit.
  IF v_lim.is_enabled IS FALSE THEN
    RETURN jsonb_build_object(
      'allowed', FALSE, 'reason', 'not_in_plan',
      'plan_key', v_lim.plan_key, 'resource', p_resource,
      'limit', 0, 'used', 0, 'remaining', 0,
      'resets_at', NULL,
      'max_model_tier', v_lim.max_model_tier,
      'max_tokens_per_call', v_lim.max_tokens_per_call,
      'daily_tokens', jsonb_build_object(
        'limit', v_lim.daily_token_ceiling, 'used', v_tokens_used)
    );
  END IF;

  -- ── Daily token backstop. Checked before the call; the spend is recorded
  --    after it, so a single request can overshoot by at most one call's
  --    worth. That is deliberate: pre-reserving would mean a refund path on
  --    every failure, which is a lot of machinery for a runaway-loop catcher.
  IF v_lim.daily_token_ceiling IS NOT NULL
     AND v_tokens_used >= v_lim.daily_token_ceiling THEN
    RETURN jsonb_build_object(
      'allowed', FALSE, 'reason', 'daily_tokens',
      'plan_key', v_lim.plan_key, 'resource', p_resource,
      'limit', v_lim.daily_token_ceiling, 'used', v_tokens_used, 'remaining', 0,
      'resets_at', (date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day') AT TIME ZONE 'UTC',
      'max_model_tier', v_lim.max_model_tier,
      'max_tokens_per_call', v_lim.max_tokens_per_call,
      'daily_tokens', jsonb_build_object(
        'limit', v_lim.daily_token_ceiling, 'used', v_tokens_used)
    );
  END IF;

  -- ── Monthly allowance (the paywall layer). NULL or -1 means uncapped.
  IF v_lim.monthly_limit IS NOT NULL AND v_lim.monthly_limit >= 0 THEN
    IF p_dry_run THEN
      SELECT COALESCE(request_count, 0) INTO v_month_used
      FROM public.edge_function_rate_limits
      WHERE user_id = p_user_id AND resource = v_month_key AND window_start = v_month_start;
      v_month_used := COALESCE(v_month_used, 0);
      IF v_month_used >= v_lim.monthly_limit THEN
        v_allowed := FALSE; v_reason := 'monthly';
      END IF;
    ELSE
      INSERT INTO public.edge_function_rate_limits AS t
        (user_id, resource, window_start, request_count)
      VALUES (p_user_id, v_month_key, v_month_start, 1)
      ON CONFLICT (user_id, resource, window_start)
      DO UPDATE SET request_count = t.request_count + 1, updated_at = now()
        WHERE t.request_count < v_lim.monthly_limit
      RETURNING t.request_count INTO v_month_used;

      -- No row returned means the guard held: the user is at the ceiling.
      IF v_month_used IS NULL THEN
        v_allowed := FALSE; v_reason := 'monthly';
        SELECT request_count INTO v_month_used
        FROM public.edge_function_rate_limits
        WHERE user_id = p_user_id AND resource = v_month_key AND window_start = v_month_start;
      END IF;
    END IF;

    IF NOT v_allowed THEN
      v_limit     := v_lim.monthly_limit;
      v_resets_at := (date_trunc('month', now() AT TIME ZONE 'UTC') + INTERVAL '1 month') AT TIME ZONE 'UTC';
    END IF;
  END IF;

  -- ── Hourly burst window. Only consumed if the month layer let us through,
  --    otherwise a blocked request would still burn hourly budget.
  IF v_allowed AND v_lim.hourly_limit IS NOT NULL AND v_lim.hourly_limit >= 0 THEN
    IF p_dry_run THEN
      SELECT COALESCE(request_count, 0) INTO v_hour_used
      FROM public.edge_function_rate_limits
      WHERE user_id = p_user_id AND resource = p_resource AND window_start = v_hour_start;
      v_hour_used := COALESCE(v_hour_used, 0);
      IF v_hour_used >= v_lim.hourly_limit THEN
        v_allowed := FALSE; v_reason := 'hourly';
      END IF;
    ELSE
      INSERT INTO public.edge_function_rate_limits AS t
        (user_id, resource, window_start, request_count)
      VALUES (p_user_id, p_resource, v_hour_start, 1)
      ON CONFLICT (user_id, resource, window_start)
      DO UPDATE SET request_count = t.request_count + 1, updated_at = now()
        WHERE t.request_count < v_lim.hourly_limit
      RETURNING t.request_count INTO v_hour_used;

      IF v_hour_used IS NULL THEN
        v_allowed := FALSE; v_reason := 'hourly';
        SELECT request_count INTO v_hour_used
        FROM public.edge_function_rate_limits
        WHERE user_id = p_user_id AND resource = p_resource AND window_start = v_hour_start;

        -- The month unit was already consumed above; hand it back so a burst
        -- rejection does not silently eat a monthly allowance. The local
        -- counter has to come back down too, or the response reports a month
        -- usage one higher than what is actually stored.
        IF v_lim.monthly_limit IS NOT NULL AND v_lim.monthly_limit >= 0 THEN
          UPDATE public.edge_function_rate_limits
          SET request_count = GREATEST(request_count - 1, 0), updated_at = now()
          WHERE user_id = p_user_id AND resource = v_month_key AND window_start = v_month_start
          RETURNING request_count INTO v_month_used;
        END IF;
      END IF;
    END IF;

    IF NOT v_allowed AND v_reason = 'hourly' THEN
      v_limit     := v_lim.hourly_limit;
      v_resets_at := v_hour_start + INTERVAL '1 hour';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed',  v_allowed,
    'reason',   v_reason,
    'plan_key', v_lim.plan_key,
    'resource', p_resource,
    'limit',    v_limit,
    'used',     CASE WHEN v_reason = 'hourly' THEN v_hour_used ELSE v_month_used END,
    'remaining', CASE
                   WHEN v_limit IS NULL THEN NULL
                   ELSE GREATEST(v_limit - CASE WHEN v_reason = 'hourly' THEN v_hour_used ELSE v_month_used END, 0)
                 END,
    'resets_at', v_resets_at,
    'monthly',  jsonb_build_object('limit', v_lim.monthly_limit, 'used', v_month_used),
    'hourly',   jsonb_build_object('limit', v_lim.hourly_limit,  'used', v_hour_used),
    'max_model_tier',      v_lim.max_model_tier,
    'max_tokens_per_call', v_lim.max_tokens_per_call,
    'daily_tokens', jsonb_build_object(
      'limit', v_lim.daily_token_ceiling, 'used', v_tokens_used)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_plan_quota(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_plan_quota(UUID, TEXT, BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.consume_plan_quota(UUID, TEXT, BOOLEAN) IS
  'Atomically consume one unit of a user''s monthly + hourly allowance for a '
  'resource. Service role only; the user id must come from a verified JWT.';


-- ═══ Refund ════════════════════════════════════════════════════════════════
-- Not optional. onboard-analyze previously counted only completed runs
-- (enforceOnboardingLimit), so a provider outage cost the user nothing.
-- Consuming up front regresses that unless the caller hands the unit back on
-- an upstream failure.
CREATE OR REPLACE FUNCTION public.refund_plan_quota(
  p_user_id  UUID,
  p_resource TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start TIMESTAMPTZ;
  v_hour_start  TIMESTAMPTZ;
BEGIN
  IF p_resource !~ '^[a-z0-9][a-z0-9_-]{1,63}$' THEN
    RAISE EXCEPTION 'invalid resource';
  END IF;

  v_month_start := date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_hour_start  := date_trunc('hour',  now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  UPDATE public.edge_function_rate_limits
  SET request_count = GREATEST(request_count - 1, 0), updated_at = now()
  WHERE user_id = p_user_id
    AND resource = '_m_' || p_resource
    AND window_start = v_month_start;

  UPDATE public.edge_function_rate_limits
  SET request_count = GREATEST(request_count - 1, 0), updated_at = now()
  WHERE user_id = p_user_id
    AND resource = p_resource
    AND window_start = v_hour_start;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_plan_quota(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_plan_quota(UUID, TEXT) TO service_role;


-- ═══ Usage summary (for the Settings screen and the admin view) ════════════
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
     AND NOT public.has_role(auth.uid(), 'admin') THEN
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

REVOKE ALL ON FUNCTION public.get_plan_usage(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plan_usage(UUID) TO service_role, authenticated;

COMMENT ON FUNCTION public.get_plan_usage(UUID) IS
  'Per-resource usage for the current month/hour window. Safe for a user to '
  'call for themselves; the tables behind it stay service-role only.';
