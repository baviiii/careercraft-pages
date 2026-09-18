/* ───────────────────────────────────────────────────────────
   claimGuestDraft — run once, immediately after a guest signs in.

   Takes whatever they built while logged out and files it under their
   new account. Mirrors the insert in useResumePersistence.saveResume so
   a claimed draft is indistinguishable from one saved normally.

   If the insert fails we deliberately KEEP the local draft. Losing
   someone's résumé because a network call blipped is far worse than
   asking them to hit save once.
   ─────────────────────────────────────────────────────────── */

import { supabase } from "@/integrations/supabase/client";

import { clearGuestDraft, hasMeaningfulGuestDraft, loadGuestDraft } from "./guestDraft";

export interface ClaimResult {
  claimed: boolean;
  resumeId?: string;
}

/*
 * This function INSERTS, so it must never run twice for one sign-in.
 *
 * Auth.tsx reaches it from two independent paths that can both fire on a
 * single OAuth return — the resolved getSession() and the SIGNED_IN event.
 * Without this latch each would read the same draft before the other cleared
 * it and file two identical résumés. Sharing the in-flight promise makes
 * concurrent callers observe one insert and one result, and keeps that true
 * for any call site added later.
 */
let inFlight: Promise<ClaimResult> | null = null;

export function claimGuestDraft(userId: string): Promise<ClaimResult> {
  if (!inFlight) {
    inFlight = runClaim(userId).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runClaim(userId: string): Promise<ClaimResult> {
  const draft = loadGuestDraft();

  // Nothing typed means nothing worth keeping — bin it quietly.
  if (!hasMeaningfulGuestDraft(draft)) {
    clearGuestDraft();
    return { claimed: false };
  }
  if (!draft) return { claimed: false };

  try {
    const contentWithMetadata = {
      ...draft.resumeData,
      metadata: {
        category: "general",
        tags: [] as string[],
        is_favorite: false,
        template: draft.selectedTemplate,
        created_at: draft.savedAt,
      },
    };

    const name = draft.resumeData.contact?.name?.trim()
      ? `${draft.resumeData.contact.name.trim()} — Résumé`
      : "Untitled Résumé";

    // Supabase's generated types don't cover the resumes table, so the insert
    // needs a cast — same approach as useResumePersistence.saveResume.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertInto = supabase.from("resumes").insert as any;

    const { data, error } = await insertInto({
      user_id: userId,
      name,
      content: JSON.stringify(contentWithMetadata),
      file_type: "builder",
      template_id: draft.selectedTemplate,
    })
      .select()
      .single();

    if (error) throw error;

    // Only destroy the local copy once it is safely on the server.
    clearGuestDraft();

    const inserted = data as { id?: string } | null;
    return { claimed: true, resumeId: inserted?.id };
  } catch (error) {
    console.error("[claimGuestDraft] Could not file the guest draft:", error);
    // Draft intentionally left in localStorage so the work survives.
    return { claimed: false };
  }
}
