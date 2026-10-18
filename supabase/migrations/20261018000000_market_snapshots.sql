-- Adzuna's figures for one role across Australia, reused for 12 hours.
--
-- Market News' "Your market" tab asks Adzuna five questions per role (ad
-- count, salary bands, top employers, ads by state, salary by month). Adzuna's
-- allowance is per day and shared with every job search on the site, so the
-- answer is kept here and served to anyone who asks about the same role.
--
-- Only the job-news edge function (service role) reads or writes it; RLS is
-- on with no policies, so the browser can't.

CREATE TABLE IF NOT EXISTS public.market_snapshots (
  -- The role as searched, lower-cased; '*' is every job in Australia.
  query_key  TEXT PRIMARY KEY,
  payload    JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.market_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.market_snapshots IS
  'Adzuna AU market figures per role for Market News, cached by the job-news function.';
