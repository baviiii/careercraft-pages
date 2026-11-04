-- AI usage auditing: who spent what, on which feature, at roughly what cost,
-- and who changed which limits.
--
-- token_usage_ledger (20260821000200) has recorded every model call since it
-- was applied, but nothing read it except SQL typed by hand. This migration
-- adds the reads behind /admin/usage and the user's daily budget:
--
--   1. token_usage_ledger.plan_key — the plan in force WHEN the call was made.
--      Joining to user_subscriptions instead would re-label a user's whole
--      history every time their plan changed.
--   2. model_prices — editable list prices, so spend reads in dollars.
--   3. admin_audit_log — written by triggers, so a change made from the SQL
--      editor is caught as surely as one made from the admin screen.
--   4. Admin RPCs. The ledger stays service-role only; these are the one way
--      in, and every one of them checks is_admin() first.
--   5. Admin writes for plans and per-user limits, which the browser could
--      never actually perform (see section 5).
--   6. get_plan_usage gains the daily budget it was already enforcing, and
--      get_my_token_activity lets a user see what used it.

-- ═══ 1. Plan at the time of the call ══════════════════════════════════════
ALTER TABLE public.token_usage_ledger ADD COLUMN IF NOT EXISTS plan_key TEXT;

-- Backfill from the current plan. Accurate for every existing row: as of
-- 2026-11-04 no account has ever left the default free plan, so the current
-- plan IS the historical one. New rows are stamped by recordTokenSpend.
UPDATE public.token_usage_ledger l
SET plan_key = us.plan_key
FROM public.user_subscriptions us
WHERE us.user_id = l.user_id
  AND l.plan_key IS NULL;

-- The admin views scan a date range across every user; the existing indexes
-- all lead with user_id or resource.
CREATE INDEX IF NOT EXISTS idx_token_usage_created
  ON public.token_usage_ledger (created_at DESC);


-- ═══ 2. Model prices ══════════════════════════════════════════════════════
-- `pattern` is matched with ILIKE against the ledger's model column, and the
-- longest matching pattern wins — so 'gpt-4o-mini%' beats 'gpt-4o%', and the
-- bare '%' row prices anything nothing else claims (including rows with no
-- model recorded at all).
--
-- These are ESTIMATES. Seeded from list prices; the real bill depends on the
-- provider (Bedrock and Azure price separately from the first-party APIs),
-- region, and caching. Edit them at /admin/usage to match an invoice.
CREATE TABLE IF NOT EXISTS public.model_prices (
  pattern              TEXT PRIMARY KEY CHECK (length(pattern) BETWEEN 1 AND 120),
  label                TEXT NOT NULL,
  input_usd_per_mtok   NUMERIC(10,4) NOT NULL CHECK (input_usd_per_mtok  >= 0),
  output_usd_per_mtok  NUMERIC(10,4) NOT NULL CHECK (output_usd_per_mtok >= 0),
  notes                TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.model_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage model prices" ON public.model_prices;
CREATE POLICY "Admins can manage model prices"
ON public.model_prices FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS handle_model_prices_updated_at ON public.model_prices;
CREATE TRIGGER handle_model_prices_updated_at
  BEFORE UPDATE ON public.model_prices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seeded before the audit trigger exists, so the seed is not logged as a
-- change. Models are the ones the ledger has actually seen.
INSERT INTO public.model_prices (pattern, label, input_usd_per_mtok, output_usd_per_mtok, notes) VALUES
  ('%claude-sonnet-4-6%', 'Claude Sonnet 4.6', 3.00, 15.00, 'Anthropic list price. Bedrock (au.*) bills separately.'),
  ('%claude-haiku-4-5%',  'Claude Haiku 4.5',  1.00,  5.00, 'Anthropic list price. Bedrock (au.*) bills separately.'),
  ('gpt-4o-mini%',        'GPT-4o mini',       0.15,  0.60, 'OpenAI list price. Azure bills separately.'),
  ('gpt-4o%',             'GPT-4o',            2.50, 10.00, 'OpenAI list price. Azure bills separately.'),
  ('%',                   'Anything else',     3.00, 15.00, 'Fallback, priced high on purpose so unknown models are not undercounted.')
ON CONFLICT (pattern) DO NOTHING;

-- Cost of one call. When the provider reported only a total (horus-knowledge
-- has no prompt/completion split) the total is priced at the midpoint of the
-- input and output rates — neither the cheapest nor the dearest reading.
CREATE OR REPLACE FUNCTION public.estimate_token_cost_usd(
  p_model      TEXT,
  p_prompt     BIGINT,
  p_completion BIGINT,
  p_total      BIGINT
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(p_prompt, 0) + COALESCE(p_completion, 0) > 0 THEN
      (COALESCE(p_prompt, 0) * mp.input_usd_per_mtok
       + COALESCE(p_completion, 0) * mp.output_usd_per_mtok) / 1000000.0
    ELSE
      COALESCE(p_total, 0) * (mp.input_usd_per_mtok + mp.output_usd_per_mtok) / 2 / 1000000.0
  END
  FROM (
    SELECT input_usd_per_mtok, output_usd_per_mtok
    FROM public.model_prices
    WHERE COALESCE(p_model, '') ILIKE pattern
    ORDER BY length(pattern) DESC
    LIMIT 1
  ) mp
$$;

REVOKE ALL ON FUNCTION public.estimate_token_cost_usd(TEXT, BIGINT, BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.estimate_token_cost_usd(TEXT, BIGINT, BIGINT, BIGINT) TO service_role;


-- ═══ Internal helpers ═════════════════════════════════════════════════════
-- Every admin RPC below is SECURITY DEFINER and reads auth.users, so each
-- starts here. auth.uid() is NULL for the service role, which is refused too:
-- these exist for the dashboard, and a script has the tables already.
CREATE OR REPLACE FUNCTION public._require_admin()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin access required' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._require_admin() FROM PUBLIC, anon, authenticated;

-- The ledger over a window, with each row priced. One definition so every
-- view prices a call the same way.
--
-- Deliberately NOT security definer and with no SET clause: either one stops
-- Postgres inlining a SQL function, and inlining is what lets a caller's
-- WHERE user_id = … and ORDER BY id LIMIT 200 reach the ledger's indexes
-- instead of pricing every row in the window first. It is only ever called
-- from the admin RPCs below, which are security definer themselves, and every
-- name in the body is schema-qualified, so it does not need either.
CREATE OR REPLACE FUNCTION public._ledger_priced(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ)
RETURNS TABLE (
  id                BIGINT,
  created_at        TIMESTAMPTZ,
  user_id           UUID,
  plan_key          TEXT,
  resource          TEXT,
  task              TEXT,
  provider          TEXT,
  model             TEXT,
  model_tier        TEXT,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  total_tokens      INTEGER,
  request_id        UUID,
  attempt           SMALLINT,
  error_code        TEXT,
  duration_ms       INTEGER,
  metadata          JSONB,
  cost_usd          NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    l.id, l.created_at, l.user_id, l.plan_key, l.resource, l.task, l.provider,
    l.model, l.model_tier, l.prompt_tokens, l.completion_tokens, l.total_tokens,
    l.request_id, l.attempt, l.error_code, l.duration_ms, l.metadata,
    COALESCE(public.estimate_token_cost_usd(
      l.model, l.prompt_tokens, l.completion_tokens, l.total_tokens), 0)
  FROM public.token_usage_ledger l
  WHERE l.created_at >= p_from
    AND l.created_at <  p_to
$$;

REVOKE ALL ON FUNCTION public._ledger_priced(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

-- The daily ceiling that actually applies to a user: their override, else
-- their plan's, with a lapsed subscription falling back to the default plan.
--
-- Read from resolve_plan_limits, the same function consume_plan_quota
-- enforces with, so the number a user is shown can never drift from the one
-- that refuses them. The ceiling doesn't depend on the resource, so any
-- resource key will do; resolve_plan_limits doesn't validate it.
CREATE OR REPLACE FUNCTION public.effective_daily_token_ceiling(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.daily_token_ceiling FROM public.resolve_plan_limits(p_user_id, '') r
$$;

REVOKE ALL ON FUNCTION public.effective_daily_token_ceiling(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.effective_daily_token_ceiling(UUID) TO service_role;

-- Closes a gap from 20260821000200: tokens_used_today takes any user id and
-- was revoked only from PUBLIC and anon, so Supabase's default grant left it
-- callable by every signed-in user — anyone could read anyone's daily spend.
-- Nothing outside the database calls it; get_plan_usage and
-- consume_plan_quota (both security definer) still can.
REVOKE ALL ON FUNCTION public.tokens_used_today(UUID) FROM authenticated;


-- ═══ 3. Admin audit log ═══════════════════════════════════════════════════
-- actor_id has no foreign key on purpose: the record of what an admin did has
-- to outlive the admin's account, so actor_email is a snapshot too.
--
-- user_id — the account a change was ABOUT — does cascade. Account deletion
-- promises to remove a person's data, and these rows hold their plan history
-- and whatever an admin wrote in a grant note. The column is also named
-- user_id so delete_user_data (20261012010000), which sweeps every public
-- table with a user_id column, clears it before the auth user goes.
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID,
  actor_email TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name  TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  -- The primary key of the changed row, e.g. {"plan_key":"free","resource":"infer"}.
  row_key     JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- For UPDATE, only the columns that changed (updated_at ignored).
  old_values  JSONB,
  new_values  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
  ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user
  ON public.admin_audit_log (user_id, id DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM anon, authenticated;

DROP POLICY IF EXISTS "Admins can read the audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read the audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- TG_ARGV carries the table's primary-key columns.
--
-- Every change is logged, whoever makes it — a change from the SQL editor
-- (auth.uid() is NULL there) is exactly the one worth catching, above all an
-- INSERT INTO user_roles … 'admin'. Two system writes are skipped, because
-- logging them buries the changes this exists to show:
--
--   * signup defaults: handle_new_user putting every new account on the
--     default plan with the 'user' role. (A whitelisted admin's 'admin' role
--     on signup IS logged.)
--   * account deletion: rows removed because their user is already gone.
--     Logging them would write a fresh trace of the person being deleted.
CREATE OR REPLACE FUNCTION public.log_admin_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID  := auth.uid();
  v_old   JSONB := CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END;
  v_new   JSONB := CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END;
  v_row   JSONB;
  v_key   JSONB := '{}'::jsonb;
  k       TEXT;
BEGIN
  v_row := COALESCE(v_new, v_old);

  IF v_actor IS NULL AND v_row ? 'user_id' THEN
    IF TG_OP = 'INSERT' AND (
         (TG_TABLE_NAME = 'user_subscriptions' AND v_row->>'source' = 'default')
      OR (TG_TABLE_NAME = 'user_roles' AND v_row->>'role' = 'user')
    ) THEN
      RETURN NULL;
    END IF;

    IF TG_OP = 'DELETE' AND NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = (v_row->>'user_id')::uuid
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(n.key, n.value) INTO v_new
    FROM jsonb_each(to_jsonb(NEW)) n
    WHERE n.key <> 'updated_at'
      AND n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);

    -- Nothing but a touch of updated_at.
    IF v_new IS NULL THEN
      RETURN NULL;
    END IF;

    SELECT jsonb_object_agg(o.key, o.value) INTO v_old
    FROM jsonb_each(to_jsonb(OLD)) o
    WHERE v_new ? o.key;
  END IF;

  FOREACH k IN ARRAY TG_ARGV LOOP
    v_key := v_key || jsonb_build_object(k, v_row -> k);
  END LOOP;

  INSERT INTO public.admin_audit_log
    (actor_id, actor_email, user_id, table_name, action, row_key, old_values, new_values)
  VALUES
    (v_actor,
     (SELECT u.email FROM auth.users u WHERE u.id = v_actor),
     (v_row->>'user_id')::uuid,
     TG_TABLE_NAME, TG_OP, v_key, v_old, v_new);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_plans ON public.plans;
CREATE TRIGGER audit_plans
  AFTER INSERT OR UPDATE OR DELETE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change('key');

DROP TRIGGER IF EXISTS audit_plan_limits ON public.plan_limits;
CREATE TRIGGER audit_plan_limits
  AFTER INSERT OR UPDATE OR DELETE ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change('plan_key', 'resource');

DROP TRIGGER IF EXISTS audit_model_prices ON public.model_prices;
CREATE TRIGGER audit_model_prices
  AFTER INSERT OR UPDATE OR DELETE ON public.model_prices
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change('pattern');

DROP TRIGGER IF EXISTS audit_user_subscriptions ON public.user_subscriptions;
CREATE TRIGGER audit_user_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change('user_id');

DROP TRIGGER IF EXISTS audit_user_limit_overrides ON public.user_limit_overrides;
CREATE TRIGGER audit_user_limit_overrides
  AFTER INSERT OR UPDATE OR DELETE ON public.user_limit_overrides
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change('user_id', 'resource');

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change('user_id', 'role');

DROP TRIGGER IF EXISTS audit_admin_whitelist ON public.admin_whitelist;
CREATE TRIGGER audit_admin_whitelist
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_whitelist
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change('email');


-- ═══ 4. Admin reads ═══════════════════════════════════════════════════════

-- Whole-platform summary for a window. p_tz only decides which calendar day a
-- call falls on in the chart; budgets themselves still reset at UTC midnight.
CREATE OR REPLACE FUNCTION public.admin_usage_overview(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ,
  p_tz   TEXT DEFAULT 'UTC'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz  TEXT;
  v_out JSONB;
BEGIN
  PERFORM public._require_admin();

  v_tz := CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_tz)
               THEN p_tz ELSE 'UTC' END;

  WITH r AS (SELECT * FROM public._ledger_priced(p_from, p_to))
  SELECT jsonb_build_object(
    'timezone', v_tz,
    'totals', (
      SELECT jsonb_build_object(
        'tokens',                COALESCE(sum(r.total_tokens), 0),
        'prompt_tokens',         COALESCE(sum(r.prompt_tokens), 0),
        'completion_tokens',     COALESCE(sum(r.completion_tokens), 0),
        'cost_usd',              COALESCE(sum(r.cost_usd), 0),
        'calls',                 count(*),
        'requests',              count(DISTINCT COALESCE(r.request_id::text, r.id::text)),
        'users',                 count(DISTINCT r.user_id),
        'retries',               count(*) FILTER (WHERE r.attempt > 1),
        'retry_tokens',          COALESCE(sum(r.total_tokens) FILTER (WHERE r.attempt > 1), 0),
        'errors',                count(*) FILTER (WHERE r.error_code IS NOT NULL),
        'unattributed_tokens',   COALESCE(sum(r.total_tokens) FILTER (WHERE r.user_id IS NULL), 0),
        'unattributed_cost_usd', COALESCE(sum(r.cost_usd) FILTER (WHERE r.user_id IS NULL), 0),
        'unattributed_calls',    count(*) FILTER (WHERE r.user_id IS NULL)
      )
      FROM r
    ),
    'by_day', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.day, d.resource), '[]'::jsonb)
      FROM (
        SELECT (r.created_at AT TIME ZONE v_tz)::date AS day,
               r.resource,
               sum(r.total_tokens)::bigint AS tokens,
               sum(r.cost_usd)             AS cost_usd,
               count(*)                    AS calls
        FROM r
        GROUP BY 1, 2
      ) d
    ),
    'by_resource', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.tokens DESC), '[]'::jsonb)
      FROM (
        SELECT r.resource,
               (SELECT pl.label FROM public.plan_limits pl
                 WHERE pl.resource = r.resource ORDER BY pl.plan_key LIMIT 1) AS label,
               sum(r.total_tokens)::bigint AS tokens,
               sum(r.cost_usd)             AS cost_usd,
               count(*)                    AS calls,
               count(DISTINCT COALESCE(r.request_id::text, r.id::text)) AS requests,
               count(DISTINCT r.user_id)   AS users,
               count(*) FILTER (WHERE r.attempt > 1)            AS retries,
               count(*) FILTER (WHERE r.error_code IS NOT NULL) AS errors,
               round(avg(r.duration_ms))   AS avg_duration_ms
        FROM r
        GROUP BY r.resource
      ) d
    ),
    'by_task', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.tokens DESC), '[]'::jsonb)
      FROM (
        SELECT r.resource,
               r.task,
               sum(r.total_tokens)::bigint AS tokens,
               sum(r.cost_usd)             AS cost_usd,
               count(*)                    AS calls,
               round(avg(r.total_tokens))  AS avg_tokens,
               count(*) FILTER (WHERE r.attempt > 1)            AS retries,
               count(*) FILTER (WHERE r.error_code IS NOT NULL) AS errors
        FROM r
        GROUP BY r.resource, r.task
      ) d
    ),
    'by_model', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.tokens DESC), '[]'::jsonb)
      FROM (
        SELECT r.provider,
               r.model,
               (SELECT mp.label FROM public.model_prices mp
                 WHERE COALESCE(r.model, '') ILIKE mp.pattern
                 ORDER BY length(mp.pattern) DESC LIMIT 1) AS price_label,
               sum(r.prompt_tokens)::bigint     AS prompt_tokens,
               sum(r.completion_tokens)::bigint AS completion_tokens,
               sum(r.total_tokens)::bigint      AS tokens,
               sum(r.cost_usd)                  AS cost_usd,
               count(*)                         AS calls
        FROM r
        GROUP BY r.provider, r.model
      ) d
    ),
    'by_plan', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.tokens DESC), '[]'::jsonb)
      FROM (
        SELECT CASE WHEN r.user_id IS NULL THEN NULL ELSE COALESCE(r.plan_key, 'unknown') END AS plan_key,
               sum(r.total_tokens)::bigint AS tokens,
               sum(r.cost_usd)             AS cost_usd,
               count(*)                    AS calls,
               count(DISTINCT r.user_id)   AS users
        FROM r
        GROUP BY 1
      ) d
    )
  )
  INTO v_out;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_usage_overview(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_usage_overview(TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;


-- One row per account, including accounts that spent nothing in the window —
-- "who is on a plan and not using it" is half of what this view is for.
CREATE OR REPLACE FUNCTION public.admin_usage_by_user(
  p_from TIMESTAMPTZ,
  p_to   TIMESTAMPTZ
)
RETURNS TABLE (
  user_id           UUID,
  email             TEXT,
  full_name         TEXT,
  role              TEXT,
  signed_up_at      TIMESTAMPTZ,
  last_sign_in_at   TIMESTAMPTZ,
  plan_key          TEXT,
  plan_source       TEXT,
  plan_status       TEXT,
  tokens            BIGINT,
  prompt_tokens     BIGINT,
  completion_tokens BIGINT,
  cost_usd          NUMERIC,
  calls             BIGINT,
  requests          BIGINT,
  errors            BIGINT,
  retries           BIGINT,
  last_call_at      TIMESTAMPTZ,
  top_resource      TEXT,
  tokens_today      BIGINT,
  daily_limit       BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public._require_admin();

  RETURN QUERY
  WITH r AS (
    SELECT * FROM public._ledger_priced(p_from, p_to) x WHERE x.user_id IS NOT NULL
  ),
  agg AS (
    SELECT r.user_id,
           sum(r.total_tokens)::bigint      AS tokens,
           sum(r.prompt_tokens)::bigint     AS prompt_tokens,
           sum(r.completion_tokens)::bigint AS completion_tokens,
           sum(r.cost_usd)                  AS cost_usd,
           count(*)                         AS calls,
           count(DISTINCT COALESCE(r.request_id::text, r.id::text)) AS requests,
           count(*) FILTER (WHERE r.error_code IS NOT NULL) AS errors,
           count(*) FILTER (WHERE r.attempt > 1)            AS retries,
           max(r.created_at)                AS last_call_at
    FROM r
    GROUP BY r.user_id
  ),
  top AS (
    SELECT DISTINCT ON (t.user_id) t.user_id, t.resource
    FROM (
      SELECT r.user_id, r.resource, sum(r.total_tokens) AS tokens
      FROM r GROUP BY r.user_id, r.resource
    ) t
    ORDER BY t.user_id, t.tokens DESC
  ),
  today AS (
    SELECT l.user_id, sum(l.total_tokens)::bigint AS tokens
    FROM public.token_usage_ledger l
    WHERE l.user_id IS NOT NULL
      AND l.created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    GROUP BY l.user_id
  )
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = u.id
      ORDER BY (ur.role::text = 'admin') DESC LIMIT 1),
    u.created_at,
    u.last_sign_in_at,
    us.plan_key,
    us.source,
    us.status,
    COALESCE(a.tokens, 0),
    COALESCE(a.prompt_tokens, 0),
    COALESCE(a.completion_tokens, 0),
    COALESCE(a.cost_usd, 0),
    COALESCE(a.calls, 0),
    COALESCE(a.requests, 0),
    COALESCE(a.errors, 0),
    COALESCE(a.retries, 0),
    a.last_call_at,
    t.resource,
    COALESCE(td.tokens, 0),
    public.effective_daily_token_ceiling(u.id)
  FROM auth.users u
  LEFT JOIN public.profiles p            ON p.id = u.id
  LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
  LEFT JOIN agg a                        ON a.user_id = u.id
  LEFT JOIN top t                        ON t.user_id = u.id
  LEFT JOIN today td                     ON td.user_id = u.id
  ORDER BY COALESCE(a.tokens, 0) DESC, u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_usage_by_user(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_usage_by_user(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- The raw call log — the audit trail itself. Keyset-paged on id so an export
-- can walk the whole window without OFFSET drift.
--
--   p_scope   'all' | 'users' (has a user) | 'unattributed' (no user)
CREATE OR REPLACE FUNCTION public.admin_usage_calls(
  p_from      TIMESTAMPTZ,
  p_to        TIMESTAMPTZ,
  p_user_id   UUID    DEFAULT NULL,
  p_scope     TEXT    DEFAULT 'all',
  p_resource  TEXT    DEFAULT NULL,
  p_limit     INTEGER DEFAULT 200,
  p_before_id BIGINT  DEFAULT NULL
)
RETURNS TABLE (
  id                BIGINT,
  created_at        TIMESTAMPTZ,
  user_id           UUID,
  email             TEXT,
  plan_key          TEXT,
  resource          TEXT,
  task              TEXT,
  provider          TEXT,
  model             TEXT,
  model_tier        TEXT,
  prompt_tokens     INTEGER,
  completion_tokens INTEGER,
  total_tokens      INTEGER,
  cost_usd          NUMERIC,
  request_id        UUID,
  attempt           SMALLINT,
  error_code        TEXT,
  duration_ms       INTEGER,
  metadata          JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public._require_admin();

  RETURN QUERY
  SELECT
    r.id, r.created_at, r.user_id, u.email::text, r.plan_key, r.resource, r.task,
    r.provider, r.model, r.model_tier, r.prompt_tokens, r.completion_tokens,
    r.total_tokens, r.cost_usd, r.request_id, r.attempt, r.error_code,
    r.duration_ms, r.metadata
  FROM public._ledger_priced(p_from, p_to) r
  LEFT JOIN auth.users u ON u.id = r.user_id
  WHERE (p_user_id IS NULL OR r.user_id = p_user_id)
    AND (p_resource IS NULL OR r.resource = p_resource)
    AND (p_before_id IS NULL OR r.id < p_before_id)
    AND CASE COALESCE(p_scope, 'all')
          WHEN 'users'        THEN r.user_id IS NOT NULL
          WHEN 'unattributed' THEN r.user_id IS NULL
          ELSE TRUE
        END
  ORDER BY r.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_usage_calls(TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, TEXT, INTEGER, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_usage_calls(TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT, TEXT, INTEGER, BIGINT) TO authenticated;


-- Everything about one account's spend and plan history on one page.
CREATE OR REPLACE FUNCTION public.admin_user_usage(
  p_user_id UUID,
  p_from    TIMESTAMPTZ,
  p_to      TIMESTAMPTZ,
  p_tz      TEXT DEFAULT 'UTC'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz  TEXT;
  v_out JSONB;
BEGIN
  PERFORM public._require_admin();

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN NULL;
  END IF;

  v_tz := CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_tz)
               THEN p_tz ELSE 'UTC' END;

  WITH r AS (
    SELECT * FROM public._ledger_priced(p_from, p_to) x WHERE x.user_id = p_user_id
  )
  SELECT jsonb_build_object(
    'timezone', v_tz,
    'user', (
      SELECT jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'full_name', p.full_name,
        'signed_up_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'roles', (SELECT COALESCE(jsonb_agg(ur.role), '[]'::jsonb)
                  FROM public.user_roles ur WHERE ur.user_id = u.id)
      )
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.id = p_user_id
    ),
    'subscription', (
      SELECT to_jsonb(us) || jsonb_build_object(
        'granted_by_email', (SELECT g.email FROM auth.users g WHERE g.id = us.granted_by))
      FROM public.user_subscriptions us
      WHERE us.user_id = p_user_id
    ),
    'daily', jsonb_build_object(
      'used',      public.tokens_used_today(p_user_id),
      'limit',     public.effective_daily_token_ceiling(p_user_id),
      'resets_at', (date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day') AT TIME ZONE 'UTC'
    ),
    'plan_usage', public.get_plan_usage(p_user_id),
    'totals', (
      SELECT jsonb_build_object(
        'tokens',            COALESCE(sum(r.total_tokens), 0),
        'prompt_tokens',     COALESCE(sum(r.prompt_tokens), 0),
        'completion_tokens', COALESCE(sum(r.completion_tokens), 0),
        'cost_usd',          COALESCE(sum(r.cost_usd), 0),
        'calls',             count(*),
        'requests',          count(DISTINCT COALESCE(r.request_id::text, r.id::text)),
        'retries',           count(*) FILTER (WHERE r.attempt > 1),
        'errors',            count(*) FILTER (WHERE r.error_code IS NOT NULL)
      )
      FROM r
    ),
    'lifetime', (
      SELECT jsonb_build_object(
        'tokens',        COALESCE(sum(l.total_tokens), 0),
        'cost_usd',      COALESCE(sum(public.estimate_token_cost_usd(
                           l.model, l.prompt_tokens, l.completion_tokens, l.total_tokens)), 0),
        'calls',         count(*),
        'first_call_at', min(l.created_at),
        'last_call_at',  max(l.created_at)
      )
      FROM public.token_usage_ledger l
      WHERE l.user_id = p_user_id
    ),
    'by_day', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.day, d.resource), '[]'::jsonb)
      FROM (
        SELECT (r.created_at AT TIME ZONE v_tz)::date AS day,
               r.resource,
               sum(r.total_tokens)::bigint AS tokens,
               sum(r.cost_usd)             AS cost_usd,
               count(*)                    AS calls
        FROM r GROUP BY 1, 2
      ) d
    ),
    'by_task', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.tokens DESC), '[]'::jsonb)
      FROM (
        SELECT r.resource, r.task,
               sum(r.total_tokens)::bigint AS tokens,
               sum(r.cost_usd)             AS cost_usd,
               count(*)                    AS calls,
               count(*) FILTER (WHERE r.attempt > 1)            AS retries,
               count(*) FILTER (WHERE r.error_code IS NOT NULL) AS errors
        FROM r GROUP BY r.resource, r.task
      ) d
    ),
    'events', (
      SELECT COALESCE(jsonb_agg(
        to_jsonb(e) || jsonb_build_object(
          'actor_email', (SELECT a.email FROM auth.users a WHERE a.id = e.actor_id))
        ORDER BY e.created_at DESC), '[]'::jsonb)
      FROM public.user_subscription_events e
      WHERE e.user_id = p_user_id
    ),
    'overrides', (
      SELECT COALESCE(jsonb_agg(
        to_jsonb(o) || jsonb_build_object(
          'granted_by_email', (SELECT g.email FROM auth.users g WHERE g.id = o.granted_by))
        ORDER BY o.resource), '[]'::jsonb)
      FROM public.user_limit_overrides o
      WHERE o.user_id = p_user_id
    ),
    'upgrade_requests', (
      SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC), '[]'::jsonb)
      FROM public.plan_upgrade_requests q
      WHERE q.user_id = p_user_id
    )
  )
  INTO v_out;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_usage(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_usage(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;


-- The change log, with the affected account's email resolved for display.
CREATE OR REPLACE FUNCTION public.admin_list_audit_log(
  p_limit     INTEGER DEFAULT 200,
  p_before_id BIGINT  DEFAULT NULL,
  p_user_id   UUID    DEFAULT NULL
)
RETURNS TABLE (
  id             BIGINT,
  created_at     TIMESTAMPTZ,
  actor_id       UUID,
  actor_email    TEXT,
  table_name     TEXT,
  action         TEXT,
  row_key        JSONB,
  old_values     JSONB,
  new_values     JSONB,
  target_user_id UUID,
  target_email   TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  PERFORM public._require_admin();

  RETURN QUERY
  SELECT
    a.id, a.created_at, a.actor_id, a.actor_email, a.table_name, a.action,
    a.row_key, a.old_values, a.new_values,
    a.user_id,
    u.email::text
  FROM public.admin_audit_log a
  LEFT JOIN auth.users u ON u.id = a.user_id
  WHERE (p_before_id IS NULL OR a.id < p_before_id)
    AND (p_user_id IS NULL OR a.user_id = p_user_id)
  ORDER BY a.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_audit_log(INTEGER, BIGINT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_log(INTEGER, BIGINT, UUID) TO authenticated;


-- ═══ 5. Admin writes ══════════════════════════════════════════════════════
-- 20260821000100 revoked INSERT/UPDATE/DELETE on user_subscriptions,
-- user_subscription_events and user_limit_overrides from `authenticated` —
-- deliberately, so no browser session can grant itself a plan. But the admin
-- screen wrote those tables straight from the browser, so the table privilege
-- refused it before RLS was ever consulted: "set plan" and "remove override"
-- have failed with 42501 for every admin since. (Every production account is
-- still on free/default, which is what that failure looks like.)
--
-- Re-granting the tables would reopen what the revoke closed. These functions
-- do the writes instead: admin-checked, and the plan change and its history
-- row land together or not at all.

CREATE OR REPLACE FUNCTION public.admin_set_user_plan(
  p_user_id  UUID,
  p_plan_key TEXT,
  p_note     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_plan   TEXT;
  v_prev_status TEXT;
BEGIN
  PERFORM public._require_admin();

  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE key = p_plan_key) THEN
    RAISE EXCEPTION 'unknown plan: %', p_plan_key USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'unknown user' USING ERRCODE = '22023';
  END IF;

  SELECT us.plan_key, us.status INTO v_prev_plan, v_prev_status
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id;

  -- source 'admin_grant' keeps a comped account from ever being mistaken for
  -- a paying one when a payment webhook starts writing this same row.
  INSERT INTO public.user_subscriptions
    (user_id, plan_key, status, source, granted_by, grant_note)
  VALUES
    (p_user_id, p_plan_key, 'active', 'admin_grant', auth.uid(), NULLIF(trim(p_note), ''))
  ON CONFLICT (user_id) DO UPDATE SET
    plan_key   = EXCLUDED.plan_key,
    status     = 'active',
    source     = 'admin_grant',
    granted_by = EXCLUDED.granted_by,
    grant_note = EXCLUDED.grant_note;

  INSERT INTO public.user_subscription_events
    (user_id, from_plan_key, from_status, to_plan_key, to_status, source, actor_id, note)
  VALUES
    (p_user_id, v_prev_plan, v_prev_status, p_plan_key, 'active', 'admin_grant',
     auth.uid(), NULLIF(trim(p_note), ''));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(UUID, TEXT, TEXT) TO authenticated;


-- A user's own daily token budget. NULL goes back to the plan's.
CREATE OR REPLACE FUNCTION public.admin_set_daily_token_override(
  p_user_id UUID,
  p_ceiling BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_plan TEXT;
BEGIN
  PERFORM public._require_admin();

  IF p_ceiling IS NOT NULL AND p_ceiling <= 0 THEN
    RAISE EXCEPTION 'daily budget must be positive, or NULL to inherit the plan''s'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.user_subscriptions
  SET daily_token_ceiling_override = p_ceiling
  WHERE user_id = p_user_id;

  -- An account from before 20260821000100 can lack a row; give it the
  -- default plan rather than failing.
  IF NOT FOUND THEN
    SELECT key INTO v_default_plan FROM public.plans WHERE is_default AND is_active LIMIT 1;
    INSERT INTO public.user_subscriptions (user_id, plan_key, source, status, daily_token_ceiling_override)
    VALUES (p_user_id, v_default_plan, 'default', 'active', p_ceiling);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_daily_token_override(UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_daily_token_override(UUID, BIGINT) TO authenticated;


-- Per-user, per-feature limit. NULL fields inherit the plan; -1 is unlimited.
CREATE OR REPLACE FUNCTION public.admin_set_limit_override(
  p_user_id       UUID,
  p_resource      TEXT,
  p_is_enabled    BOOLEAN     DEFAULT NULL,
  p_monthly_limit INTEGER     DEFAULT NULL,
  p_hourly_limit  INTEGER     DEFAULT NULL,
  p_expires_at    TIMESTAMPTZ DEFAULT NULL,
  p_reason        TEXT        DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_admin();

  INSERT INTO public.user_limit_overrides
    (user_id, resource, is_enabled, monthly_limit, hourly_limit, expires_at, reason, granted_by)
  VALUES
    (p_user_id, p_resource, p_is_enabled, p_monthly_limit, p_hourly_limit, p_expires_at,
     NULLIF(trim(p_reason), ''), auth.uid())
  ON CONFLICT (user_id, resource) DO UPDATE SET
    is_enabled    = EXCLUDED.is_enabled,
    monthly_limit = EXCLUDED.monthly_limit,
    hourly_limit  = EXCLUDED.hourly_limit,
    expires_at    = EXCLUDED.expires_at,
    reason        = EXCLUDED.reason,
    granted_by    = EXCLUDED.granted_by;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_limit_override(UUID, TEXT, BOOLEAN, INTEGER, INTEGER, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_limit_override(UUID, TEXT, BOOLEAN, INTEGER, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_remove_limit_override(
  p_user_id  UUID,
  p_resource TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_admin();
  DELETE FROM public.user_limit_overrides
  WHERE user_id = p_user_id AND resource = p_resource;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_limit_override(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_limit_override(UUID, TEXT) TO authenticated;


-- ═══ 6. The user's side ═══════════════════════════════════════════════════

-- get_plan_usage, now carrying the daily budget. The ceiling was always being
-- enforced from consume_plan_quota; the user just had no way to see it.
-- Reproduced in full because CREATE OR REPLACE needs the whole body. Copied
-- from the LATEST definition, 20260910000000_enforce_admin_whitelist_in_rls
-- (whose guard calls is_admin, not has_role); only the two daily_* keys are
-- new. Copy from an older migration and that whitelist fix silently reverts.
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
    'plan_key',           v_plan_key,
    'resets_at',          (date_trunc('month', now() AT TIME ZONE 'UTC') + INTERVAL '1 month') AT TIME ZONE 'UTC',
    'daily_tokens_used',  public.tokens_used_today(p_user_id),
    'daily_tokens_limit', public.effective_daily_token_ceiling(p_user_id),
    'daily_resets_at',    (date_trunc('day', now() AT TIME ZONE 'UTC') + INTERVAL '1 day') AT TIME ZONE 'UTC',
    'resources',          COALESCE(v_rows, '[]'::jsonb)
  );
END;
$$;


-- What used the signed-in user's tokens: one row per action (a request that
-- fanned out to several model calls is one row), newest first, last 30 days.
-- Only ever the caller's own rows — there is no user id parameter to abuse.
CREATE OR REPLACE FUNCTION public.get_my_token_activity(p_limit INTEGER DEFAULT 30)
RETURNS TABLE (
  activity_id TEXT,
  started_at  TIMESTAMPTZ,
  resource    TEXT,
  label       TEXT,
  tasks       TEXT[],
  tokens      BIGINT,
  calls       INTEGER,
  failed      BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mine AS (
    SELECT l.*, COALESCE(l.request_id::text, 'row-' || l.id::text) AS grp
    FROM public.token_usage_ledger l
    WHERE l.user_id = auth.uid()
      AND l.created_at >= now() - INTERVAL '30 days'
  ),
  grouped AS (
    SELECT m.grp,
           min(m.created_at)                                     AS started_at,
           min(m.resource)                                       AS resource,
           array_agg(DISTINCT m.task) FILTER (WHERE m.task IS NOT NULL) AS tasks,
           sum(m.total_tokens)::bigint                           AS tokens,
           count(*)::int                                         AS calls,
           bool_and(m.error_code IS NOT NULL)                    AS failed
    FROM mine m
    GROUP BY m.grp
  )
  SELECT g.grp,
         g.started_at,
         g.resource,
         (SELECT pl.label FROM public.plan_limits pl
           WHERE pl.resource = g.resource ORDER BY pl.plan_key LIMIT 1),
         COALESCE(g.tasks, ARRAY[]::text[]),
         g.tokens,
         g.calls,
         g.failed
  FROM grouped g
  ORDER BY g.started_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
$$;

REVOKE ALL ON FUNCTION public.get_my_token_activity(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_token_activity(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_my_token_activity(INTEGER) IS
  'The caller''s own AI actions for the last 30 days, one row per request.';
