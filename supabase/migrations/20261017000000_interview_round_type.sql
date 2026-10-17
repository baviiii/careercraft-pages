-- Record which kind of interview each practice session was.
--
-- Interview Prep offers four kinds of round: a recruiter phone screen, a
-- behavioural round, a technical round and a full interview. Until now the
-- choice only nudged the questions and was never stored, so a session's
-- history couldn't say what was practised, and progress couldn't be shown by
-- type. The interview-coach-mcp server writes this column when it opens a
-- session; the web app reads it for the progress panel and history.
--
-- Nullable on purpose. Sessions from before this have no type and are shown
-- as full interviews, which is what they structurally were. RLS on
-- interview_sessions already scopes every row to its owner; a new column needs
-- no new policy.
--
-- Deploy order: this migration first, then interview-coach-mcp (its CI checks
-- the live database has this column before it deploys). The server tags the
-- type in a separate best-effort write, so a session never fails because the
-- column is missing; it just goes untagged.

ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS round_type text;

ALTER TABLE public.interview_sessions
  DROP CONSTRAINT IF EXISTS interview_sessions_round_type_check;

ALTER TABLE public.interview_sessions
  ADD CONSTRAINT interview_sessions_round_type_check
  CHECK (round_type IS NULL OR round_type IN ('full', 'behavioral', 'technical', 'screen'));

-- Every progress and history read is "this user's sessions, newest first",
-- and the table had no index on user_id at all.
CREATE INDEX IF NOT EXISTS interview_sessions_user_created_idx
  ON public.interview_sessions (user_id, created_at DESC);
