-- Atomic, server-side quotas for cost-bearing edge functions.
-- Only the service role may consume counters; callers cannot choose another
-- user's id or bypass limits through the public REST API.

CREATE TABLE IF NOT EXISTS public.edge_function_rate_limits (
  user_id UUID NOT NULL,
  resource TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource, window_start)
);

ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.edge_function_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.edge_function_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_edge_function_quota(
  p_user_id UUID,
  p_resource TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_seconds INTEGER;
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required';
  END IF;
  IF p_resource !~ '^[a-z0-9][a-z0-9_-]{1,63}$' THEN
    RAISE EXCEPTION 'invalid resource';
  END IF;
  IF p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'invalid limit';
  END IF;
  IF p_window_minutes < 1 OR p_window_minutes > 10080 THEN
    RAISE EXCEPTION 'invalid window';
  END IF;

  v_window_seconds := p_window_minutes * 60;
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / v_window_seconds) * v_window_seconds
  );

  INSERT INTO public.edge_function_rate_limits (
    user_id,
    resource,
    window_start,
    request_count,
    updated_at
  )
  VALUES (p_user_id, p_resource, v_window_start, 1, now())
  ON CONFLICT (user_id, resource, window_start)
  DO UPDATE
    SET request_count = public.edge_function_rate_limits.request_count + 1,
        updated_at = now()
    WHERE public.edge_function_rate_limits.request_count < p_limit
  RETURNING request_count INTO v_count;

  -- Zero means the existing counter was already at the limit.
  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_edge_function_quota(UUID, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_function_quota(UUID, TEXT, INTEGER, INTEGER)
  TO service_role;

CREATE INDEX IF NOT EXISTS idx_edge_function_rate_limits_updated_at
  ON public.edge_function_rate_limits (updated_at);

-- Anonymous/pre-auth endpoints cannot key quotas by user id. Store only a
-- one-way hash of the network principal (currently the request IP).
CREATE TABLE IF NOT EXISTS public.edge_anonymous_rate_limits (
  principal_hash TEXT NOT NULL,
  resource TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (principal_hash, resource, window_start)
);

ALTER TABLE public.edge_anonymous_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.edge_anonymous_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.edge_anonymous_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_anonymous_edge_quota(
  p_principal_hash TEXT,
  p_resource TEXT,
  p_limit INTEGER,
  p_window_minutes INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_seconds INTEGER;
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  IF p_principal_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid principal hash';
  END IF;
  IF p_resource !~ '^[a-z0-9][a-z0-9_-]{1,63}$' THEN
    RAISE EXCEPTION 'invalid resource';
  END IF;
  IF p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'invalid limit';
  END IF;
  IF p_window_minutes < 1 OR p_window_minutes > 10080 THEN
    RAISE EXCEPTION 'invalid window';
  END IF;

  v_window_seconds := p_window_minutes * 60;
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / v_window_seconds) * v_window_seconds
  );

  INSERT INTO public.edge_anonymous_rate_limits (
    principal_hash,
    resource,
    window_start,
    request_count,
    updated_at
  )
  VALUES (p_principal_hash, p_resource, v_window_start, 1, now())
  ON CONFLICT (principal_hash, resource, window_start)
  DO UPDATE
    SET request_count = public.edge_anonymous_rate_limits.request_count + 1,
        updated_at = now()
    WHERE public.edge_anonymous_rate_limits.request_count < p_limit
  RETURNING request_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_anonymous_edge_quota(TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_anonymous_edge_quota(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;

CREATE INDEX IF NOT EXISTS idx_edge_anonymous_rate_limits_updated_at
  ON public.edge_anonymous_rate_limits (updated_at);
