-- Per-call record of what every model call actually cost.
--
-- horusInfer() already receives token counts back from the gateway and every
-- caller but onboard-analyze throws them away. This is where they land.
--
-- Locked to the service role, matching edge_function_rate_limits
-- (20260719000000_…:14-17): a user must never be able to edit their own
-- spend record, and there is no reason for a browser to read it directly —
-- the aggregate RPC below serves the UI instead.

CREATE TABLE IF NOT EXISTS public.token_usage_ledger (
  id                BIGSERIAL PRIMARY KEY,
  -- NULL for system/cron paths that no user pays for.
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The same server-owned key the quota was consumed under.
  resource          TEXT NOT NULL,
  -- Horus routing/telemetry key, e.g. 'careercraft.ats_full_analysis'.
  task              TEXT,
  provider          TEXT NOT NULL DEFAULT 'horus'
                      CHECK (provider IN ('horus','azure','horus-knowledge')),
  model             TEXT,
  model_tier        TEXT CHECK (model_tier IS NULL OR model_tier IN ('fast','deep')),

  prompt_tokens     INTEGER NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens INTEGER NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  -- Deliberately NOT a generated column: horus-knowledge (rag.query) reports
  -- only a total with no prompt/completion split, so this has to be settable
  -- on its own.
  total_tokens      INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),

  -- Groups every model call made while serving one HTTP request. ats-analyze
  -- fans out to four; without this they look like four separate user actions.
  request_id        UUID,
  -- horusGenerateObject silently retries once on a schema miss. attempt=2 rows
  -- are how that hidden second bill becomes visible.
  attempt           SMALLINT NOT NULL DEFAULT 1 CHECK (attempt >= 1),

  -- Set when the call failed; tokens may still have been spent.
  error_code        TEXT,
  duration_ms       INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serves the daily-ceiling lookup: "tokens spent by this user since midnight".
CREATE INDEX IF NOT EXISTS idx_token_usage_user_day
  ON public.token_usage_ledger (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_resource_day
  ON public.token_usage_ledger (resource, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_usage_request
  ON public.token_usage_ledger (request_id) WHERE request_id IS NOT NULL;

ALTER TABLE public.token_usage_ledger ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.token_usage_ledger FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.token_usage_ledger TO service_role;
REVOKE ALL ON SEQUENCE public.token_usage_ledger_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.token_usage_ledger_id_seq TO service_role;


-- ═══ Daily spend lookup ════════════════════════════════════════════════════
-- Used by the enforcement layer to seed the in-request running total, and by
-- the admin usage view. SECURITY DEFINER because the table itself is
-- service-role only.
--
-- Day boundary is UTC, matching the month boundary used by the quota RPC.
CREATE OR REPLACE FUNCTION public.tokens_used_today(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(total_tokens), 0)::BIGINT
  FROM public.token_usage_ledger
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
$$;

REVOKE ALL ON FUNCTION public.tokens_used_today(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tokens_used_today(UUID) TO service_role;

COMMENT ON FUNCTION public.tokens_used_today(UUID) IS
  'Total tokens billed to a user since UTC midnight. Backs the daily ceiling.';
