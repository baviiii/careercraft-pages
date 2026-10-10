/**
 * How other pages open the cover letter desk:
 *
 *   ?application=<id>  from the tracker: that job's ad and résumé, and saving
 *                      attaches the letter to the application
 *   ?resume=<id>       from My Résumés: that résumé picked
 *   ?letter=<id>       a saved letter, open on the sheet
 *   ?from=ats          from the ATS page, which hands over through
 *                      sessionStorage (unchanged from the old page)
 *
 * URL params rather than sessionStorage so a reload lands in the same place.
 * Runs once, after the letters and résumés have loaded.
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";

import type { LetterApplication } from "../types";
import { APPLICATION_COLUMNS } from "./useCoverLetters";

const ATS_KEYS = ["atsResumeText", "atsJobDescription", "atsResumeId", "atsResumeName"];

interface HandoffHandlers {
  onApplication: (app: LetterApplication) => void;
  onLetter: (letterId: string) => void;
  onResume: (resumeId: string) => void;
  onAts: (brief: { resumeText: string; jobDescription: string; resumeId: string | null }) => void;
  /** Nothing chose a résumé, so pick a sensible default. */
  onDefault: () => void;
}

export function useLetterHandoff(ready: boolean, handlers: HandoffHandlers) {
  const [params] = useSearchParams();
  const handled = useRef(false);
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (!ready || handled.current) return;
    handled.current = true;
    const h = latest.current;

    const applicationId = params.get("application");
    const letterId = params.get("letter");
    const resumeId = params.get("resume");
    let resumeChosen = false;

    if (params.get("from") === "ats") {
      try {
        const resumeText = sessionStorage.getItem("atsResumeText") ?? "";
        // The ATS page writes the ad under rewriteJobDescription (the key the
        // rewrite page reads), so the old page never received it. Read both;
        // leave rewriteJobDescription in place for /rewrite.
        const jobDescription =
          sessionStorage.getItem("atsJobDescription") ??
          sessionStorage.getItem("rewriteJobDescription") ??
          "";
        const atsResumeId = sessionStorage.getItem("atsResumeId");
        ATS_KEYS.forEach((k) => sessionStorage.removeItem(k));
        if (resumeText || jobDescription) {
          h.onAts({ resumeText, jobDescription, resumeId: atsResumeId });
          resumeChosen = Boolean(resumeText || atsResumeId);
        }
      } catch {
        /* Private mode: the page still opens, they paste. */
      }
    }

    if (letterId) {
      h.onLetter(letterId);
      resumeChosen = true;
    } else if (resumeId) {
      h.onResume(resumeId);
      resumeChosen = true;
    }

    if (applicationId) {
      resumeChosen = true;
      void supabase
        .from("job_applications")
        .select(APPLICATION_COLUMNS)
        .eq("id", applicationId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) latest.current.onApplication(data as LetterApplication);
          else latest.current.onDefault();
        });
    }

    if (!resumeChosen) h.onDefault();
  }, [ready, params]);
}
