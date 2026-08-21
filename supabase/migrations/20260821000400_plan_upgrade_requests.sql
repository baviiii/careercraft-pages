-- "I'd pay for this" — captured before there is anything to pay with.
--
-- There is no checkout yet, so the upgrade path in the UI has nowhere to send
-- anyone. Rather than ship a button that does nothing, it records interest.
-- Which features people hit limits on, and how often, is the most useful thing
-- this whole exercise can produce before a provider is chosen: it says what to
-- price, and whether to bother.

CREATE TABLE IF NOT EXISTS public.plan_upgrade_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The plan they were on when they asked.
  from_plan_key TEXT,
  -- What they were trying to do when they ran out, when known. This is the
  -- column that turns a vague signal into a decision.
  resource      TEXT,
  reason        TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_upgrade_requests_user
  ON public.plan_upgrade_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plan_upgrade_requests_resource
  ON public.plan_upgrade_requests (resource, created_at DESC);

ALTER TABLE public.plan_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Users may register their own interest and see that it registered; they may
-- not edit or withdraw it, and they may not see anyone else's.
DROP POLICY IF EXISTS "Users can register their own interest" ON public.plan_upgrade_requests;
CREATE POLICY "Users can register their own interest"
  ON public.plan_upgrade_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own requests" ON public.plan_upgrade_requests;
CREATE POLICY "Users can read own requests"
  ON public.plan_upgrade_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all requests" ON public.plan_upgrade_requests;
CREATE POLICY "Admins can read all requests"
  ON public.plan_upgrade_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE UPDATE, DELETE ON public.plan_upgrade_requests FROM anon, authenticated;
