-- The interview coach: same quality on every plan; only the amount differs.
--
-- Free was clamped to the fast model (Claude Haiku 4.5) with a 4,000-token
-- answer cap, while Premium could use the deep model (Claude Sonnet 4.6) with
-- 12,000. The coach asks for the deep model for the work that decides how good
-- an interview feels — writing the questions, scoring answers, the debrief —
-- so Free users got a lesser interview, and on 2026-11-01 a broken one: Haiku
-- returned the questions' analysis and no questions ("No questions were
-- returned"), and roadmaps ran past 4,000 tokens and failed.
--
-- Free now gets what Premium gets per call. What still separates the plans is
-- how much: 80 coach calls a month and 25 an hour on Free, against 3,000 and
-- 120 on Premium, plus each plan's daily token ceiling. The token cap only
-- bounds one answer; nothing is billed for room an answer doesn't use.
--
-- The plan_limits row decides (resolve_plan_limits takes it ahead of the
-- plan's own default), so this one row is the whole change. Per-user
-- overrides only touch the call limits, never the model or token cap.

UPDATE public.plan_limits
SET max_model_tier = 'deep',
    max_tokens_per_call = 12000
WHERE plan_key = 'free'
  AND resource = 'infer';
