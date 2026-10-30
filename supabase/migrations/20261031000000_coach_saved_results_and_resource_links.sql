-- Interview Prep: let the coach's results come back, and track any resource.
--
-- 1. ai_recommendations.payload / subject / level
--    The interview coach saves every career read, roadmap, certification plan
--    and learning pathway here, but only as ai_reasoning: the result as JSON,
--    cut off at 8,000 characters, with nothing saying which job it was for.
--    So the Guidance, Certifications and Study tabs could never show a saved
--    result again; every visit was a fresh model call and another row.
--    payload holds the whole result as the coach returned it, subject the job
--    (or field) it was for, trimmed and lower-cased, and level the seniority
--    when the result depends on it. The site reads the newest active row for
--    a type and subject; the coach expires the older ones when it saves.
--
-- 2. user_resources.url / title / provider / skill
--    Progress could only be tracked against learning_resources rows, and that
--    catalogue is empty: every resource the coach shows is a link it found
--    (Reddit, Hacker News, Wikipedia) or suggested, with no catalogue id. A
--    row can now be a link instead: url and title say what it is, skill which
--    skill finishing it should count towards. The unique index makes "save
--    this link" an upsert; a full index, not a partial one, so PostgREST's
--    on_conflict can use it (rows without a url don't collide: nulls are
--    distinct).
--
-- Both tables already have "own rows" policies for SELECT and ALL, which
-- cover new columns, and delete_user_data() already clears both.
--
-- Deploy order: this migration first, then interview-coach-mcp (its CI checks
-- these columns exist), then the site. All columns are nullable: the coach
-- writes them in best-effort saves, and the site treats a missing saved
-- result as "nothing saved yet".

-- 1 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.ai_recommendations
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS level text;

-- Every read is "this user's newest <type> for <subject>".
CREATE INDEX IF NOT EXISTS ai_recommendations_user_type_subject_idx
  ON public.ai_recommendations (user_id, recommendation_type, subject, created_at DESC);

-- 2 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_resources
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS skill text;

CREATE UNIQUE INDEX IF NOT EXISTS user_resources_user_url_key
  ON public.user_resources (user_id, url);

-- A row must say which resource it is: a catalogue row or a link. NOT VALID
-- so a stray older row can't block the deploy; every new or changed row is
-- checked.
ALTER TABLE public.user_resources
  DROP CONSTRAINT IF EXISTS user_resources_resource_or_url_check;

ALTER TABLE public.user_resources
  ADD CONSTRAINT user_resources_resource_or_url_check
  CHECK (resource_id IS NOT NULL OR url IS NOT NULL) NOT VALID;
