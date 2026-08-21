-- Fix: month usage reported one too high when the hourly window refuses.
--
-- consume_plan_quota consumes a month unit, then a burst unit. When the burst
-- layer refuses it hands the month unit back — verified working: the stored
-- counter does go 11 -> 10. But v_month_used still held the pre-refund value,
-- so the 429 told the user they had spent one more than they had.
--
-- Caught by running the real thing against the real database rather than
-- reading it: the stored value and the reported value disagreed.
--
-- Only the refund branch changes; the rest of the function is reproduced
-- verbatim because CREATE OR REPLACE needs the whole body.

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
