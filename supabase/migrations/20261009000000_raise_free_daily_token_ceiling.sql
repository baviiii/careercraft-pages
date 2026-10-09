-- Raise the free plan's daily AI budget from 80k tokens to 700k (~US$3/day).
--
-- 80k was hit in a single afternoon of ordinary use: onboarding twice, a
-- résumé import, two career-coach questions and a handful of interview tools
-- came to 87k. A new user doing the obvious first-day things could be locked
-- out of every AI feature, including ones they had not touched yet.
--
-- 700k is ~US$3 at the observed gpt-4o mix (~US$4.26 per million tokens,
-- 2026-10-09). The monthly per-feature limits in plan_limits still bound what a
-- free user can spend over a month; this ceiling is only the daily backstop.
--
-- The seed in 20260821000100 uses ON CONFLICT DO NOTHING, so an existing row
-- must be updated explicitly. Applied to production by hand on 2026-10-09;
-- re-running is harmless.

UPDATE public.plans
SET daily_token_ceiling = 700000
WHERE key = 'free';
