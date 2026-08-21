-- Plans, per-resource limits, subscriptions and per-user overrides.
--
-- Limits live in the table, never in code, so an admin can retune a plan
-- without a deploy. Nothing reads these tables yet — the enforcement layer
-- lands in a later migration, deliberately, so this one can be applied and
-- inspected on its own.
--
-- Sentinel convention, used by every *_limit column below:
--   NULL  = inherit from the layer above (or "no opinion")
--   -1    = explicitly unlimited
--   >= 0  = a real cap
-- The -1 matters: without it a per-user override could never UNCAP a plan
-- that sets a limit, because NULL already means "inherit".

-- ═══ plans ═════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.plans (
  key                 TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{1,31}$'),
  name                TEXT NOT NULL,
  description         TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 100,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_default          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Plan-wide model policy, clamped onto every LLM call server-side.
  max_model_tier      TEXT NOT NULL DEFAULT 'fast'
                        CHECK (max_model_tier IN ('fast','deep')),
  max_tokens_per_call INTEGER NOT NULL DEFAULT 4000
                        CHECK (max_tokens_per_call BETWEEN 256 AND 32000),
  -- The true-cost backstop. NULL = no ceiling.
  daily_token_ceiling BIGINT CHECK (daily_token_ceiling IS NULL OR daily_token_ceiling > 0),

  -- Billing forward-compat. Unused until a provider is wired; a webhook fills
  -- external_price_id and nothing else here has to change.
  price_cents_monthly INTEGER NOT NULL DEFAULT 0,
  price_cents_yearly  INTEGER NOT NULL DEFAULT 0,
  currency            TEXT    NOT NULL DEFAULT 'AUD',
  external_price_id   TEXT,

  -- Drives the marketing page so pricing copy stops being hardcoded in TSX.
  marketing_features    JSONB NOT NULL DEFAULT '[]'::jsonb,
  marketing_limitations JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most one default plan; new signups resolve their plan through it.
CREATE UNIQUE INDEX IF NOT EXISTS plans_one_default
  ON public.plans (is_default) WHERE is_default;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Policy shape follows chat_prompts (20260103000001_…:29-39).
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans"
ON public.plans FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- anon included so the pricing page renders for logged-out visitors.
DROP POLICY IF EXISTS "Everyone can read active plans" ON public.plans;
CREATE POLICY "Everyone can read active plans"
ON public.plans FOR SELECT TO anon, authenticated
USING (is_active = TRUE);


-- ═══ plan_limits ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan_key            TEXT NOT NULL REFERENCES public.plans(key) ON DELETE CASCADE,
  -- Matches the resource regex enforced by consume_edge_function_quota.
  resource            TEXT NOT NULL CHECK (resource ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  label               TEXT NOT NULL,

  is_enabled          BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = hard paywall
  monthly_limit       INTEGER CHECK (monthly_limit IS NULL OR monthly_limit BETWEEN -1 AND 1000000),
  hourly_limit        INTEGER CHECK (hourly_limit  IS NULL OR hourly_limit  BETWEEN -1 AND 10000),

  -- Per-resource model policy; NULL inherits the plan's value. This exists so
  -- the internal analysis functions can keep their "deep" tier on the free
  -- plan while `infer` — the one caller-controlled surface — gets clamped.
  -- Clamping the analysis paths is actively counterproductive: truncated
  -- rewrites trip the completeness retry in ats-analyze and cost two calls
  -- instead of one.
  max_model_tier      TEXT CHECK (max_model_tier IN ('fast','deep')),
  max_tokens_per_call INTEGER CHECK (max_tokens_per_call BETWEEN 256 AND 32000),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_key, resource)
);

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage plan limits" ON public.plan_limits;
CREATE POLICY "Admins can manage plan limits"
ON public.plan_limits FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Everyone can read limits of active plans" ON public.plan_limits;
CREATE POLICY "Everyone can read limits of active plans"
ON public.plan_limits FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.plans p WHERE p.key = plan_key AND p.is_active));


-- ═══ user_subscriptions ════════════════════════════════════════════════════
-- Users read their own row and nothing else. Writes go through an admin or,
-- later, a payment webhook — never straight from a browser session.
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key                   TEXT NOT NULL REFERENCES public.plans(key) ON DELETE RESTRICT,
  status                     TEXT NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','trialing','past_due','canceled','paused')),
  source                     TEXT NOT NULL DEFAULT 'default'
                               CHECK (source IN ('default','admin_grant','stripe','paddle','promo')),

  current_period_start       TIMESTAMPTZ,
  current_period_end         TIMESTAMPTZ,          -- NULL = no expiry (admin grant)
  cancel_at_period_end       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Per-user backstop override; NULL inherits the plan's ceiling.
  daily_token_ceiling_override BIGINT CHECK (daily_token_ceiling_override IS NULL
                                             OR daily_token_ceiling_override > 0),

  -- Provider columns, empty today. A Stripe/Paddle webhook fills these with no
  -- schema change; this is what keeps "payment later" from meaning "rewrite later".
  provider                   TEXT CHECK (provider IN ('stripe','paddle')),
  provider_customer_id       TEXT,
  provider_subscription_id   TEXT,
  provider_price_id          TEXT,
  provider_status            TEXT,                 -- raw upstream string, unmapped
  last_provider_event_id     TEXT,                 -- idempotency cursor

  granted_by                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  grant_note                 TEXT,
  metadata                   JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_provider_sub
  ON public.user_subscriptions (provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan
  ON public.user_subscriptions (plan_key, status);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.user_subscriptions FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can read own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can read own subscription"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can manage subscriptions"
ON public.user_subscriptions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ═══ user_subscription_events ══════════════════════════════════════════════
-- Append-only history of every plan change, so "why is this user premium?"
-- always has an answer.
CREATE TABLE IF NOT EXISTS public.user_subscription_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_plan_key      TEXT,
  to_plan_key        TEXT NOT NULL,
  from_status        TEXT,
  to_status          TEXT NOT NULL,
  source             TEXT NOT NULL,
  actor_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL for webhooks
  provider_event_id  TEXT,
  note               TEXT,
  payload            JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Replaying a provider event becomes a no-op rather than a double-grant.
CREATE UNIQUE INDEX IF NOT EXISTS user_subscription_events_provider_event
  ON public.user_subscription_events (provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscription_events_user
  ON public.user_subscription_events (user_id, created_at DESC);

ALTER TABLE public.user_subscription_events ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.user_subscription_events FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can read own subscription events" ON public.user_subscription_events;
CREATE POLICY "Users can read own subscription events"
ON public.user_subscription_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all subscription events" ON public.user_subscription_events;
CREATE POLICY "Admins can read all subscription events"
ON public.user_subscription_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));


-- ═══ user_limit_overrides ══════════════════════════════════════════════════
-- Per-user escape hatch: comp a frustrated customer, or throttle an abuser,
-- without inventing a new plan for one person.
CREATE TABLE IF NOT EXISTS public.user_limit_overrides (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource      TEXT NOT NULL CHECK (resource ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  is_enabled    BOOLEAN,   -- NULL = inherit plan
  monthly_limit INTEGER CHECK (monthly_limit IS NULL OR monthly_limit BETWEEN -1 AND 1000000),
  hourly_limit  INTEGER CHECK (hourly_limit  IS NULL OR hourly_limit  BETWEEN -1 AND 10000),
  expires_at    TIMESTAMPTZ,
  reason        TEXT,
  granted_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource)
);

ALTER TABLE public.user_limit_overrides ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.user_limit_overrides FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can read own overrides" ON public.user_limit_overrides;
CREATE POLICY "Users can read own overrides"
ON public.user_limit_overrides FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage overrides" ON public.user_limit_overrides;
CREATE POLICY "Admins can manage overrides"
ON public.user_limit_overrides FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));


-- ═══ updated_at triggers ═══════════════════════════════════════════════════
DROP TRIGGER IF EXISTS handle_plans_updated_at ON public.plans;
CREATE TRIGGER handle_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_plan_limits_updated_at ON public.plan_limits;
CREATE TRIGGER handle_plan_limits_updated_at
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER handle_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_limit_overrides_updated_at ON public.user_limit_overrides;
CREATE TRIGGER handle_user_limit_overrides_updated_at
  BEFORE UPDATE ON public.user_limit_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ═══ Seed ══════════════════════════════════════════════════════════════════
INSERT INTO public.plans
  (key, name, description, sort_order, is_default,
   max_model_tier, max_tokens_per_call, daily_token_ceiling,
   price_cents_monthly, price_cents_yearly,
   marketing_features, marketing_limitations)
VALUES
  ('free', 'Free', 'Try the ATS checker and the AI writer.', 10, TRUE,
   'deep', 8000, 80000, 0, 0,
   '["5 ATS analyses / month","20 AI rewrites / month","Resume builder + PDF export","3 resume parses / month"]'::jsonb,
   '["No unlimited rewrites","Lower daily AI budget","No priority support"]'::jsonb),
  ('premium', 'Premium', 'Everything, at job-hunt volume.', 20, FALSE,
   'deep', 16000, 2000000, 1900, 15000,
   '["300 ATS analyses / month","Unlimited AI rewrites","Unlimited cover letters","Career intelligence search","Priority support"]'::jsonb,
   '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Resource keys are the DEPLOYED FUNCTION NAMES, so the four hourly counters
-- that already work (ats-analyze, rewrite-resume, job-news, generate-prompt)
-- carry straight over with no reset when enforcement moves to these tables.
INSERT INTO public.plan_limits
  (plan_key, resource, label, is_enabled, monthly_limit, hourly_limit,
   max_model_tier, max_tokens_per_call)
VALUES
  ('free',    'ats-analyze',      'AI resume analysis',         TRUE,    5,   5,  NULL,   NULL),
  ('free',    'onboard-analyze',  'Onboarding analysis',        TRUE,    3,   2,  NULL,   NULL),
  ('free',    'rewrite-resume',   'AI rewriting',               TRUE,   20,  10,  NULL,   NULL),
  ('free',    'parse-resume',     'Resume parsing',             TRUE,    3,   3,  NULL,   NULL),
  ('free',    'job-news',         'Job & market data',          TRUE,  300,  60,  NULL,   NULL),
  ('free',    'job-news-trends',  'Market trend analysis',      TRUE,   10,   4,  NULL,   NULL),
  ('free',    'horus-rag-search', 'Career intelligence search', TRUE,   20,  10,  NULL,   NULL),
  ('free',    'horus-rag',        'Career graph lookups',       TRUE,  200,  60,  NULL,   NULL),
  -- The only seeded clamp: `infer` is the one surface where the caller picks
  -- the model and the token budget, so the plan takes that choice back.
  ('free',    'infer',            'Interview coach AI',         TRUE,   80,  25, 'fast',  4000),
  ('free',    'generate-prompt',  'Admin prompt generation',    TRUE,   -1,  30,  NULL,   NULL),

  ('premium', 'ats-analyze',      'AI resume analysis',         TRUE,  300,  20,  NULL,   NULL),
  ('premium', 'onboard-analyze',  'Onboarding analysis',        TRUE,   30,   6,  NULL,   NULL),
  ('premium', 'rewrite-resume',   'AI rewriting',               TRUE,   -1,  60,  NULL,   NULL),
  ('premium', 'parse-resume',     'Resume parsing',             TRUE,  200,  10,  NULL,   NULL),
  ('premium', 'job-news',         'Job & market data',          TRUE,   -1, 120,  NULL,   NULL),
  ('premium', 'job-news-trends',  'Market trend analysis',      TRUE,  200,  20,  NULL,   NULL),
  ('premium', 'horus-rag-search', 'Career intelligence search', TRUE,  500,  60,  NULL,   NULL),
  ('premium', 'horus-rag',        'Career graph lookups',       TRUE,   -1, 120,  NULL,   NULL),
  ('premium', 'infer',            'Interview coach AI',         TRUE, 3000, 120, 'deep', 12000),
  ('premium', 'generate-prompt',  'Admin prompt generation',    TRUE,   -1,  30,  NULL,   NULL)
ON CONFLICT (plan_key, resource) DO NOTHING;

-- Existing users land on the default plan.
INSERT INTO public.user_subscriptions (user_id, plan_key, source, status)
SELECT id, 'free', 'default', 'active' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;


-- ═══ Signup hook ═══════════════════════════════════════════════════════════
-- Extends the live definition from 20260103080758_… — the admin_whitelist
-- branch below is carried over verbatim. Dropping it would silently disable
-- admin auto-promotion on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_default_plan TEXT;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Check if email is in admin whitelist
  IF EXISTS (SELECT 1 FROM public.admin_whitelist WHERE email = NEW.email) THEN
    -- Assign admin role for whitelisted users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Assign default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;

  -- Put every new user on the default plan so quota resolution always finds
  -- a subscription row.
  SELECT key INTO v_default_plan
  FROM public.plans
  WHERE is_default AND is_active
  LIMIT 1;

  IF v_default_plan IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_key, source, status)
    VALUES (NEW.id, v_default_plan, 'default', 'active')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
