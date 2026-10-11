-- Delete everything Faircopy holds about one user, for "Delete account".
--
-- Deleting the auth user is not enough on its own. Some tables cascade from
-- auth.users (profiles and its children, subscriptions, the token ledger, chat
-- sessions…), but the ones holding the most personal material were never
-- linked to it: resumes, cover_letters, job_applications, user_preferences,
-- interview sessions and answers, saved news. They would be left behind with
-- a user_id pointing at nobody. And the security and telemetry tables only
-- SET NULL on delete, which keeps the email, IP address and queries they hold.
--
-- So this runs before the auth user is removed (by the delete-account edge
-- function), as one transaction: everything goes, or nothing does.
--
--   1. Known tables, in foreign-key order (applications point at letters and
--      résumés; letters point at résumés; answers point at sessions).
--   2. A sweep of every other public table with a user_id column, so a table
--      added later is covered without editing this. A foreign-key clash is
--      retried after the rest; if one still fails, the whole delete aborts
--      with that table's name rather than leaving it half done.
--   3. Admin-only references (who added a whitelist entry, who resolved an
--      alert) are cleared so they don't block deleting the auth user.
--
-- Tables that may not exist in every environment are checked first, so a
-- dropped table never makes deletion fail.

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ordered   text[] := ARRAY[
    'job_applications', 'cover_letters', 'resumes',
    'interview_answers', 'interview_sessions',
    'user_preferences', 'user_patterns', 'saved_news', 'score_history',
    'user_resources', 'ai_recommendations', 'user_milestones', 'weekly_insights',
    'edge_function_rate_limits',
    -- These only SET NULL on delete but keep personal data (email, IP,
    -- queries), so they are deleted outright.
    'login_attempts', 'activity_logs', 'suspicious_activities', 'rag_feedback',
    'job_search_runs', 'job_tracker_telemetry'
  ];
  handled   text[] := ARRAY[]::text[];
  pending   text[];
  failed    text[];
  t         text;
  n         bigint;
  removed   jsonb := '{}'::jsonb;
  user_email text;
  pass      int;
BEGIN
  IF p_user IS NULL THEN
    RAISE EXCEPTION 'delete_user_data: p_user is required';
  END IF;

  SELECT email INTO user_email FROM auth.users WHERE id = p_user;

  -- 1. Known tables, in order.
  FOREACH t IN ARRAY ordered LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', t) USING p_user;
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n > 0 THEN removed := removed || jsonb_build_object(t, n); END IF;
    END IF;
    handled := handled || t;
  END LOOP;

  -- Failed sign-ins are recorded by email, often with no user_id at all.
  IF user_email IS NOT NULL AND to_regclass('public.login_attempts') IS NOT NULL THEN
    DELETE FROM public.login_attempts WHERE lower(email) = lower(user_email);
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      removed := removed || jsonb_build_object('login_attempts_by_email', n);
    END IF;
  END IF;

  -- 2. Everything else with a user_id column. Up to three passes, so a table
  --    whose rows are referenced by another gets another go once the
  --    referencing rows are gone.
  SELECT coalesce(array_agg(c.table_name::text ORDER BY c.table_name), ARRAY[]::text[])
    INTO pending
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
   WHERE c.table_schema = 'public'
     AND c.column_name = 'user_id'
     AND tb.table_type = 'BASE TABLE'
     AND NOT (c.table_name::text = ANY (handled));

  FOR pass IN 1..3 LOOP
    failed := ARRAY[]::text[];
    FOREACH t IN ARRAY pending LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE user_id = $1', t) USING p_user;
        GET DIAGNOSTICS n = ROW_COUNT;
        IF n > 0 THEN removed := removed || jsonb_build_object(t, n); END IF;
      EXCEPTION WHEN foreign_key_violation THEN
        failed := failed || t;
      END;
    END LOOP;
    EXIT WHEN cardinality(failed) = 0;
    pending := failed;
  END LOOP;

  IF cardinality(failed) > 0 THEN
    RAISE EXCEPTION 'delete_user_data: could not delete from % (foreign keys)', failed;
  END IF;

  -- 3. Admin-only references that would otherwise block deleting the auth user.
  IF to_regclass('public.admin_whitelist') IS NOT NULL THEN
    UPDATE public.admin_whitelist SET added_by = NULL WHERE added_by = p_user;
  END IF;
  IF to_regclass('public.suspicious_activities') IS NOT NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'suspicious_activities'
      AND column_name = 'resolved_by'
  ) THEN
    UPDATE public.suspicious_activities SET resolved_by = NULL WHERE resolved_by = p_user;
  END IF;

  RETURN removed;
END;
$$;

-- Only the delete-account edge function (service role) may call this.
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_data(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(uuid) TO service_role;
