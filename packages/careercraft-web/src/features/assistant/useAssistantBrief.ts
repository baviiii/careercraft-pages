/* Loads what the assistant needs to greet someone: their first name, their
   tracked jobs and their résumés. Three small reads of the person's own rows
   (row-level security keeps them to their own); no AI call, so the greeting
   is instant and free. A failed read just means a less specific greeting. */

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

import { buildBrief, firstNameOf, type AssistantBrief } from "./brief";

export interface AssistantBriefState {
  userId: string | null;
  brief: AssistantBrief | null;
  /** Read again, e.g. on opening, so a follow-up just done isn't still nagged. */
  reload: () => void;
}

export function useAssistantBrief(): AssistantBriefState {
  const [state, setState] = useState<Omit<AssistantBriefState, "reload">>({
    userId: null,
    brief: null,
  });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user || cancelled) return;

      const [profile, applications, resumes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase
          .from("job_applications")
          .select("company, status, reminder_date, interview_date")
          .eq("user_id", user.id),
        supabase
          .from("resumes")
          .select("name, ats_score")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);
      if (cancelled) return;

      const brief = buildBrief(
        {
          firstName: firstNameOf(
            profile.data?.full_name,
            user.user_metadata?.full_name,
            user.user_metadata?.name,
            user.user_metadata?.given_name,
          ),
          applications: applications.data ?? [],
          resumes: resumes.data ?? [],
          now: new Date(),
        },
        user.id,
      );
      setState({ userId: user.id, brief });
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  return { ...state, reload };
}
