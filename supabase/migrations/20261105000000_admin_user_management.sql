-- Admin user management: see every account, ban and unban, block IP
-- addresses and ranges, sign people out, delete accounts, and grant or remove
-- admin — with every action recorded.
--
-- What lives where:
--
--   * Bans are Supabase Auth's own (auth.users.banned_until), set by the
--     admin-users edge function through the Auth admin API. A banned user
--     cannot sign in or refresh a session. The reason sits in their
--     app_metadata.
--   * IP blocks are ours: blocked_ips, single addresses or ranges (CIDR).
--   * access_check() is the one place that decides whether a request may go
--     ahead. It is asked by every edge function (_shared/http/access.ts), by
--     the data API before every request (check_request, a PostgREST
--     pre-request function), and by the access-gate function the site calls
--     on load — which is also where each signed-in user's IP is recorded, in
--     user_ip_log.
--   * The client IP is the one the platform vouches for: cf-connecting-ip,
--     else the LAST X-Forwarded-For entry. The first entry is whatever the
--     client sent, so it is never used.
--   * Admins are exempt from bans and blocks, and none of these functions will
--     act on an admin or on the caller themselves. To ban or delete an admin,
--     another admin has to remove their admin access first — an action that
--     is logged, serialised, and refused if it would leave no admin at all.
--
-- Everything here is SECURITY DEFINER, so every function says exactly who may
-- call it: the admin_* functions check is_admin() (role AND whitelist) first;
-- the rest are service-role only.

-- ═══ 1. Blocked IPs ════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id               BIGSERIAL PRIMARY KEY,
  -- One address is a /32 (IPv4) or /128 (IPv6); a range is anything wider.
  network          CIDR NOT NULL UNIQUE,
  reason           TEXT,
  expires_at       TIMESTAMPTZ,
  -- No foreign key: the record of who blocked what outlives their account.
  created_by       UUID,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Serves "which block contains this address?" (network >>= ip).
CREATE INDEX IF NOT EXISTS idx_blocked_ips_network
  ON public.blocked_ips USING gist (network inet_ops);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.blocked_ips FROM anon, authenticated;

DROP POLICY IF EXISTS "Admins can read blocked IPs" ON public.blocked_ips;
CREATE POLICY "Admins can read blocked IPs"
ON public.blocked_ips FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Logged like the other config tables (log_admin_change, 20261104000000).
DROP TRIGGER IF EXISTS audit_blocked_ips ON public.blocked_ips;
CREATE TRIGGER audit_blocked_ips
  AFTER INSERT OR UPDATE OR DELETE ON public.blocked_ips
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_change('network');


-- ═══ 2. Where each user has been seen from ═════════════════════════════════
-- Written by the access-gate edge function whenever a signed-in user loads
-- the site. user_sessions and login_attempts hold IPs too, but nothing has
-- written them since 2026-05-23: the heartbeat only ran in a layout the site
-- no longer uses, and OAuth sign-ins were never recorded. This one is
-- recorded server-side on every visit, whatever the sign-in method. What the
-- old tables knew is copied in once, below, so this is the only place read.
CREATE TABLE IF NOT EXISTS public.user_ip_log (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip         INET NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits       INTEGER NOT NULL DEFAULT 1,
  user_agent TEXT,
  country    TEXT,
  -- 'site' = seen by access-gate; 'earlier sign-in' = copied from the old
  -- login and session records.
  source     TEXT NOT NULL DEFAULT 'site',
  PRIMARY KEY (user_id, ip)
);

-- Serves "who has been seen inside this range?" (network >>= ip).
CREATE INDEX IF NOT EXISTS idx_user_ip_log_ip
  ON public.user_ip_log USING gist (ip inet_ops);

-- Service role only. Admins read it through the admin_* functions below;
-- delete_user_data clears it because it has a user_id column.
ALTER TABLE public.user_ip_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_ip_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_ip_log TO service_role;


-- ═══ 3. Internal helpers ═══════════════════════════════════════════════════

-- The legacy tables store IPs as text; one bad value must not break a list.
CREATE OR REPLACE FUNCTION public._safe_inet(p TEXT)
RETURNS INET
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p::inet;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._safe_inet(TEXT) FROM PUBLIC, anon, authenticated;

-- What the old login and session records knew, copied in once. Successful
-- sign-ins only: a failed attempt against an account is where an attacker
-- was, not where the account holder was, and counting it would block (or
-- mark as shared) the wrong addresses.
INSERT INTO public.user_ip_log AS l (user_id, ip, first_seen, last_seen, hits, country, source)
SELECT x.user_id, x.ip, min(x.seen), max(x.seen), count(*),
       (array_agg(x.country ORDER BY x.seen DESC) FILTER (WHERE x.country IS NOT NULL))[1],
       'earlier sign-in'
FROM (
  SELECT a.user_id, public._safe_inet(a.ip_address) AS ip, a.created_at AS seen, a.country
  FROM public.login_attempts a
  WHERE a.user_id IS NOT NULL AND a.success IS TRUE
  UNION ALL
  SELECT s.user_id, public._safe_inet(s.ip_address), COALESCE(s.last_activity, s.created_at), s.country
  FROM public.user_sessions s
  WHERE s.user_id IS NOT NULL
) x
WHERE x.ip IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = x.user_id)
GROUP BY x.user_id, x.ip
ON CONFLICT (user_id, ip) DO NOTHING;

-- Every account seen from inside a network.
CREATE OR REPLACE FUNCTION public._network_accounts(p_network CIDR)
RETURNS TABLE (user_id UUID, last_seen TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.user_id, max(l.last_seen)
  FROM public.user_ip_log l
  WHERE p_network >>= l.ip
  GROUP BY l.user_id
$$;

REVOKE ALL ON FUNCTION public._network_accounts(CIDR) FROM PUBLIC, anon, authenticated;

-- The live block covering an address, if any.
CREATE OR REPLACE FUNCTION public._covering_block(p_ip INET)
RETURNS TABLE (id BIGINT, network CIDR, expires_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.network, b.expires_at
  FROM public.blocked_ips b
  WHERE b.network >>= p_ip
    AND (b.expires_at IS NULL OR b.expires_at > now())
  ORDER BY masklen(b.network) DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public._covering_block(INET) FROM PUBLIC, anon, authenticated;

-- How many accounts other than this one have used this exact address.
CREATE OR REPLACE FUNCTION public._others_on_ip(p_ip INET, p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.user_ip_log l
  WHERE l.ip = p_ip AND l.user_id <> p_user_id
$$;

REVOKE ALL ON FUNCTION public._others_on_ip(INET, UUID) FROM PUBLIC, anon, authenticated;

-- Admins, and the caller themselves, are off limits to every action below.
CREATE OR REPLACE FUNCTION public._assert_actionable_target(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That account no longer exists.' USING ERRCODE = 'P0002';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t do this to your own account.' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin(p_user_id) OR public.has_role(p_user_id, 'admin') THEN
    RAISE EXCEPTION 'That account is an admin. Remove their admin access first.' USING ERRCODE = '42501';
  END IF;
  RETURN v_email;
END;
$$;

REVOKE ALL ON FUNCTION public._assert_actionable_target(UUID) FROM PUBLIC, anon, authenticated;

-- "1.2.3.4" → 1.2.3.4/32, "1.2.3.4/24" → 1.2.3.0/24. Refuses anything so wide
-- it would block a whole provider or the internet: IPv4 ranges stop at /16
-- (65,536 addresses), IPv6 at /48 (one site).
CREATE OR REPLACE FUNCTION public._parse_block_network(p_network TEXT)
RETURNS CIDR
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_inet INET;
  v_net  CIDR;
BEGIN
  BEGIN
    v_inet := trim(p_network)::inet;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION '"%" isn''t an IP address or range (e.g. 203.0.113.7 or 203.0.113.0/24).', p_network
      USING ERRCODE = '22023';
  END;
  v_net := network(v_inet);
  IF family(v_net) = 4 AND masklen(v_net) < 16 THEN
    RAISE EXCEPTION 'That range is too wide to block (IPv4 ranges stop at /16).' USING ERRCODE = '22023';
  END IF;
  IF family(v_net) = 6 AND masklen(v_net) < 48 THEN
    RAISE EXCEPTION 'That range is too wide to block (IPv6 ranges stop at /48).' USING ERRCODE = '22023';
  END IF;
  RETURN v_net;
END;
$$;

REVOKE ALL ON FUNCTION public._parse_block_network(TEXT) FROM PUBLIC, anon, authenticated;


-- ═══ 4. The access decision (service role only) ════════════════════════════
-- Asked by every edge function and, through check_request, before every
-- data API request — so it has to be cheap. Blocked = a current ban on the
-- account, or the request's IP inside a live block. Admins are never blocked;
-- whether the caller is an admin is only worked out when something would
-- otherwise block them, which is rare.
CREATE OR REPLACE FUNCTION public.access_check(p_ip TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banned  TIMESTAMPTZ;
  v_reason  TEXT;
  v_ip      INET := public._safe_inet(p_ip);
  v_block   RECORD;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT u.banned_until, u.raw_app_meta_data->>'ban_reason'
      INTO v_banned, v_reason
    FROM auth.users u WHERE u.id = p_user_id;

    IF v_banned IS NOT NULL AND v_banned > now() AND NOT public.is_admin(p_user_id) THEN
      RETURN jsonb_build_object(
        'blocked', TRUE, 'reason', 'banned', 'until', v_banned, 'note', v_reason);
    END IF;
  END IF;

  IF v_ip IS NOT NULL THEN
    SELECT c.network, c.expires_at INTO v_block FROM public._covering_block(v_ip) c;
    IF FOUND AND (p_user_id IS NULL OR NOT public.is_admin(p_user_id)) THEN
      RETURN jsonb_build_object('blocked', TRUE, 'reason', 'ip', 'until', v_block.expires_at);
    END IF;
  END IF;

  RETURN jsonb_build_object('blocked', FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.access_check(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.access_check(TEXT, UUID) TO service_role;

-- Upserted by access-gate. Bad or private-looking input is simply skipped.
CREATE OR REPLACE FUNCTION public.record_user_ip(
  p_user_id    UUID,
  p_ip         TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_country    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip INET := public._safe_inet(p_ip);
BEGIN
  IF p_user_id IS NULL OR v_ip IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.user_ip_log AS l (user_id, ip, user_agent, country)
  VALUES (p_user_id, v_ip, left(p_user_agent, 500), left(p_country, 8))
  ON CONFLICT (user_id, ip) DO UPDATE SET
    last_seen  = now(),
    hits       = l.hits + 1,
    user_agent = COALESCE(EXCLUDED.user_agent, l.user_agent),
    country    = COALESCE(EXCLUDED.country, l.country),
    source     = 'site';
EXCEPTION WHEN foreign_key_violation THEN
  -- The account was deleted mid-request; nothing to record.
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_ip(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_user_ip(UUID, TEXT, TEXT, TEXT) TO service_role;

-- Ends every session the account has, so a ban or a forced sign-out takes
-- effect at once rather than when the access token next expires. Returns how
-- many were ended, or -1 if this database won't let us touch auth.sessions
-- (the ban itself still holds; it just waits out the token).
CREATE OR REPLACE FUNCTION public.admin_revoke_sessions(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
  RETURN -1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_sessions(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_sessions(UUID) TO service_role;


-- ═══ 5. Admin reads ════════════════════════════════════════════════════════

-- Every account, or just one (p_user_id) for an account's own page.
CREATE OR REPLACE FUNCTION public.admin_list_users(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id         UUID,
  email           TEXT,
  full_name       TEXT,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed BOOLEAN,
  providers       TEXT[],
  is_admin        BOOLEAN,
  roles           TEXT[],
  banned_until    TIMESTAMPTZ,
  ban_reason      TEXT,
  plan_key        TEXT,
  plan_source     TEXT,
  last_seen_at    TIMESTAMPTZ,
  last_ip         TEXT,
  ip_count        BIGINT,
  ip_blocked      BOOLEAN
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
    u.id,
    u.email::text,
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at IS NOT NULL,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(u.raw_app_meta_data->'providers')), ARRAY[]::text[]),
    public.is_admin(u.id),
    COALESCE((SELECT array_agg(r.role::text ORDER BY r.role::text) FROM public.user_roles r WHERE r.user_id = u.id), ARRAY[]::text[]),
    CASE WHEN u.banned_until > now() THEN u.banned_until END,
    CASE WHEN u.banned_until > now() THEN u.raw_app_meta_data->>'ban_reason' END,
    us.plan_key,
    us.source,
    ips.last_seen,
    host(ips.last_ip),
    COALESCE(ips.ip_count, 0),
    COALESCE(ips.ip_blocked, FALSE)
  FROM auth.users u
  LEFT JOIN public.profiles p            ON p.id = u.id
  LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT
      max(i.last_seen) AS last_seen,
      (array_agg(i.ip ORDER BY i.last_seen DESC))[1] AS last_ip,
      count(*) AS ip_count,
      bool_or(EXISTS (SELECT 1 FROM public._covering_block(i.ip))) AS ip_blocked
    FROM public.user_ip_log i
    WHERE i.user_id = u.id
  ) ips ON TRUE
  WHERE p_user_id IS NULL OR u.id = p_user_id
  ORDER BY COALESCE(ips.last_seen, u.last_sign_in_at, u.created_at) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(UUID) TO authenticated;


-- One account's IPs, each with whether it is blocked and how many OTHER
-- accounts have used it (the tell for shared networks and multi-accounting).
CREATE OR REPLACE FUNCTION public.admin_user_ips(p_user_id UUID)
RETURNS TABLE (
  ip             TEXT,
  first_seen     TIMESTAMPTZ,
  last_seen      TIMESTAMPTZ,
  hits           BIGINT,
  country        TEXT,
  source         TEXT,
  block_id       BIGINT,
  blocked_by     TEXT,
  other_accounts BIGINT
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
    host(i.ip),
    i.first_seen,
    i.last_seen,
    i.hits::bigint,
    i.country,
    i.source,
    blk.id,
    blk.network::text,
    public._others_on_ip(i.ip, p_user_id)
  FROM public.user_ip_log i
  LEFT JOIN LATERAL public._covering_block(i.ip) blk ON TRUE
  WHERE i.user_id = p_user_id
  ORDER BY i.last_seen DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_ips(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_ips(UUID) TO authenticated;


-- Who would a block catch? Shown before an admin confirms one.
CREATE OR REPLACE FUNCTION public.admin_network_accounts(p_network TEXT)
RETURNS TABLE (user_id UUID, email TEXT, is_admin BOOLEAN, last_seen TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_net CIDR;
BEGIN
  PERFORM public._require_admin();
  v_net := public._parse_block_network(p_network);

  RETURN QUERY
  SELECT n.user_id, u.email::text, public.is_admin(n.user_id), n.last_seen
  FROM public._network_accounts(v_net) n
  JOIN auth.users u ON u.id = n.user_id
  ORDER BY n.last_seen DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_network_accounts(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_network_accounts(TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_list_blocked_ips()
RETURNS TABLE (
  id               BIGINT,
  network          TEXT,
  reason           TEXT,
  expires_at       TIMESTAMPTZ,
  active           BOOLEAN,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ,
  accounts         BIGINT
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
    b.id,
    b.network::text,
    b.reason,
    b.expires_at,
    (b.expires_at IS NULL OR b.expires_at > now()),
    b.created_by_email,
    b.created_at,
    (SELECT count(*) FROM public._network_accounts(b.network))
  FROM public.blocked_ips b
  ORDER BY b.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_blocked_ips() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_blocked_ips() TO authenticated;


-- ═══ 6. Admin writes (database side) ═══════════════════════════════════════
-- Bans, sign-outs and deletion need the Auth admin API and go through the
-- admin-users edge function, which calls admin_check_target first.

-- The edge function's gate: is this account one an admin may act on?
CREATE OR REPLACE FUNCTION public.admin_check_target(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  PERFORM public._require_admin();
  v_email := public._assert_actionable_target(p_user_id);
  RETURN jsonb_build_object('ok', TRUE, 'email', v_email);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_check_target(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_check_target(UUID) TO authenticated;


-- Blocking a range that's already blocked replaces its reason and expiry —
-- and says so, with what it was, so the admin is told when (say) a permanent
-- block has just become a one-day one rather than finding out later.
CREATE OR REPLACE FUNCTION public.admin_block_ip(
  p_network    TEXT,
  p_reason     TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_net  CIDR;
  v_id   BIGINT;
  v_prev RECORD;
BEGIN
  PERFORM public._require_admin();
  v_net := public._parse_block_network(p_network);

  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN
    RAISE EXCEPTION 'The expiry has to be in the future.' USING ERRCODE = '22023';
  END IF;

  SELECT b.id, b.reason, b.expires_at INTO v_prev
  FROM public.blocked_ips b
  WHERE b.network = v_net
  FOR UPDATE;

  INSERT INTO public.blocked_ips AS b (network, reason, expires_at, created_by, created_by_email)
  VALUES (v_net, NULLIF(trim(p_reason), ''), p_expires_at, auth.uid(),
          (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()))
  ON CONFLICT (network) DO UPDATE SET
    reason     = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at
  RETURNING b.id INTO v_id;

  -- Only a block still in force counts as replaced; reviving an expired one
  -- changes nothing anyone was relying on.
  IF v_prev.id IS NOT NULL AND (v_prev.expires_at IS NULL OR v_prev.expires_at > now()) THEN
    RETURN jsonb_build_object(
      'id', v_id,
      'replaced', TRUE,
      'previous_reason', v_prev.reason,
      'previous_expires_at', v_prev.expires_at);
  END IF;
  RETURN jsonb_build_object('id', v_id, 'replaced', FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_block_ip(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_block_ip(TEXT, TEXT, TIMESTAMPTZ) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_unblock_ip(p_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_admin();
  DELETE FROM public.blocked_ips WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unblock_ip(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unblock_ip(BIGINT) TO authenticated;


-- Block every address one account has used. Skipped:
--   * addresses other accounts have also used, unless asked for — blocking a
--     café, office or mobile carrier address locks out everyone behind it;
--   * addresses already inside a live block — re-blocking would overwrite
--     that block's own expiry and reason (a 1-day block quietly becoming
--     permanent);
--   * addresses copied from the old sign-in records ('earlier sign-in').
--     Those were taken from the first X-Forwarded-For entry, which the
--     client writes, so any of them may be a forgery — possibly a stranger's
--     address, planted on purpose. An admin can still block one by hand.
CREATE OR REPLACE FUNCTION public.admin_block_user_ips(
  p_user_id        UUID,
  p_reason         TEXT DEFAULT NULL,
  p_include_shared BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email   TEXT;
  v_ip      RECORD;
  v_blocked INTEGER := 0;
  v_shared  INTEGER := 0;
  v_already INTEGER := 0;
  v_old     INTEGER := 0;
BEGIN
  PERFORM public._require_admin();
  v_email := public._assert_actionable_target(p_user_id);

  FOR v_ip IN SELECT i.ip, i.source FROM public.user_ip_log i WHERE i.user_id = p_user_id LOOP
    IF EXISTS (SELECT 1 FROM public._covering_block(v_ip.ip)) THEN
      v_already := v_already + 1;
      CONTINUE;
    END IF;

    IF v_ip.source <> 'site' THEN
      v_old := v_old + 1;
      CONTINUE;
    END IF;

    IF NOT p_include_shared AND public._others_on_ip(v_ip.ip, p_user_id) > 0 THEN
      v_shared := v_shared + 1;
      CONTINUE;
    END IF;

    PERFORM public.admin_block_ip(
      host(v_ip.ip),
      COALESCE(NULLIF(trim(p_reason), ''), 'Used by ' || v_email),
      NULL);
    v_blocked := v_blocked + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'blocked', v_blocked,
    'skipped_shared', v_shared,
    'already_blocked', v_already,
    'skipped_old', v_old);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_block_user_ips(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_block_user_ips(UUID, TEXT, BOOLEAN) TO authenticated;


-- Admin = the admin role AND a whitelist entry (is_admin). The old screen
-- only changed the role, so "Make admin" never actually made anyone an admin.
-- This sets both, together.
--
-- No admin can change their own access. Changes are serialised with an
-- advisory lock and the caller's own admin status is checked again once the
-- lock is held: otherwise two admins removing each other at the same moment
-- would both pass the check and leave no admin at all.
CREATE OR REPLACE FUNCTION public.admin_set_admin(p_user_id UUID, p_make_admin BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('public.admin_set_admin'));
  -- Checked after the lock, so a concurrent removal of the caller is seen.
  PERFORM public._require_admin();

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t change your own admin access. Ask another admin.' USING ERRCODE = '42501';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That account no longer exists.' USING ERRCODE = 'P0002';
  END IF;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'That account has no email address, so it can''t be whitelisted.' USING ERRCODE = '22023';
  END IF;

  IF p_make_admin THEN
    IF (SELECT u.banned_until FROM auth.users u WHERE u.id = p_user_id) > now() THEN
      RAISE EXCEPTION 'That account is banned. Unban it first.' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'admin')
    ON CONFLICT DO NOTHING;
    INSERT INTO public.admin_whitelist (email, added_by) VALUES (v_email, auth.uid())
    ON CONFLICT (email) DO NOTHING;
  ELSE
    -- The caller stays an admin (they can't remove themselves), so this can
    -- only fail if the data is already inconsistent — but never leave zero.
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles r
      JOIN auth.users u ON u.id = r.user_id
      JOIN public.admin_whitelist w ON lower(w.email) = lower(u.email)
      WHERE r.role = 'admin' AND r.user_id <> p_user_id
    ) THEN
      RAISE EXCEPTION 'That would leave no admin.' USING ERRCODE = '42501';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'user')
    ON CONFLICT DO NOTHING;
    DELETE FROM public.admin_whitelist WHERE lower(email) = lower(v_email);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_admin(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_admin(UUID, BOOLEAN) TO authenticated;


-- ═══ 7. The data API gate ══════════════════════════════════════════════════
-- Edge functions check bans and blocks themselves, but the site reads and
-- writes most data — résumés, the tracker, letters — straight through the
-- data API (PostgREST). Without this, a blocked network or a banned account
-- could keep doing all of that, and a ban's access token stays valid until it
-- expires (up to an hour). check_request runs before every data API request
-- and refuses those callers with HTTP 403.
--
-- It must never take the API down: anything that goes wrong inside the check
-- lets the request through. Only a definite "blocked" answer refuses one.
-- Storage and Realtime don't run it; edge functions don't need it.
--
-- To switch it off in an emergency:
--   ALTER ROLE authenticator RESET pgrst.db_pre_request;
--   NOTIFY pgrst, 'reload config';

-- The client's address as the platform vouches for it — the same rule as
-- clientIp() in _shared/http/access.ts: cf-connecting-ip (set by Cloudflare,
-- can't be forged), else the LAST X-Forwarded-For entry (the hop the proxy
-- added). The first entry is whatever the client chose to send.
CREATE OR REPLACE FUNCTION public._request_ip()
RETURNS INET
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_headers JSONB;
  v_chain   TEXT[];
BEGIN
  v_headers := NULLIF(current_setting('request.headers', TRUE), '')::jsonb;
  IF v_headers IS NULL THEN
    RETURN NULL;
  END IF;
  IF v_headers ? 'cf-connecting-ip' THEN
    RETURN public._safe_inet(trim(v_headers->>'cf-connecting-ip'));
  END IF;
  IF v_headers ? 'x-forwarded-for' THEN
    v_chain := string_to_array(v_headers->>'x-forwarded-for', ',');
    RETURN public._safe_inet(trim(v_chain[array_length(v_chain, 1)]));
  END IF;
  RETURN public._safe_inet(trim(v_headers->>'x-real-ip'));
  -- No exception handler of its own: check_request catches anything here, and
  -- one savepoint per data API request is enough.
END;
$$;

REVOKE ALL ON FUNCTION public._request_ip() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_request()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims JSONB;
  v_result JSONB;
BEGIN
  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb;
    -- The service role is our own server code; never gate it.
    IF v_claims->>'role' = 'service_role' THEN
      RETURN;
    END IF;
    v_result := public.access_check(
      host(public._request_ip()),
      NULLIF(v_claims->>'sub', '')::uuid);
  EXCEPTION WHEN others THEN
    RETURN;
  END;

  IF (v_result->>'blocked')::boolean IS TRUE THEN
    -- PostgREST turns SQLSTATE PTxyz into HTTP status xyz.
    RAISE SQLSTATE 'PT403' USING
      MESSAGE = CASE WHEN v_result->>'reason' = 'banned'
                     THEN 'This account has been suspended.'
                     ELSE 'Access from your network has been blocked.' END,
      DETAIL  = 'ACCESS_BLOCKED',
      HINT    = v_result::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_request() TO anon, authenticated, service_role;

-- The caller's own id, as the data API verified it from their token. Used by
-- edge functions to recognise a banned account whose sessions have already
-- been ended (Auth then refuses the token, but its signature is still good).
CREATE OR REPLACE FUNCTION public.whoami()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid()
$$;

REVOKE ALL ON FUNCTION public.whoami() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whoami() TO authenticated;

-- Switch the gate on. Wrapped so that a project where this isn't permitted
-- still gets everything else; admin_enforcement_status() reports which.
DO $$
BEGIN
  ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.check_request';
  NOTIFY pgrst, 'reload config';
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Data API gate not enabled (%): edge functions still enforce bans and blocks.', SQLERRM;
END;
$$;

-- For the Blocked IPs page: is the data API gate actually on?
CREATE OR REPLACE FUNCTION public.admin_enforcement_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_admin();
  RETURN jsonb_build_object(
    'data_api_gate', EXISTS (
      SELECT 1
      FROM pg_db_role_setting s
      JOIN pg_roles r ON r.oid = s.setrole
      WHERE r.rolname = 'authenticator'
        AND 'pgrst.db_pre_request=public.check_request' = ANY (s.setconfig)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_enforcement_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_enforcement_status() TO authenticated;
