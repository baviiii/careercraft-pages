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

/*
 * The latch above is module-scoped, which means it is per TAB. Email
 * confirmation opens a NEW tab, and supabase-js persists the session to
 * localStorage — so the original tab receives a storage event, fires its own
 * SIGNED_IN, and starts a second claim. Two tabs, two contexts, two inserts
 * of the same résumé.
 *
 * This lock is the cross-tab half. It is deliberately crude: a timestamp in
 * localStorage, checked immediately before the insert. Two tabs can still
 * interleave inside the few milliseconds between read and write, but that
 * window is far smaller than the seconds-long one it closes, and the cost of
 * losing the race is a duplicate row rather than lost work. A heavier
 * mechanism (BroadcastChannel, a deterministic insert key) would buy
 * certainty this path does not need.
 */
const CLAIM_LOCK_KEY = "cc-guest-claim-lock";
const CLAIM_LOCK_TTL_MS = 30_000;

function acquireClaimLock(): boolean {
  try {
    const raw = window.localStorage.getItem(CLAIM_LOCK_KEY);
    if (raw) {
      const heldAt = Number(raw);
      // A stale lock must never wedge the claim permanently — a tab that
      // crashed mid-insert would otherwise strand every future draft.
      if (Number.isFinite(heldAt) && Date.now() - heldAt < CLAIM_LOCK_TTL_MS) {
        return false;
      }
    }
    window.localStorage.setItem(CLAIM_LOCK_KEY, String(Date.now()));
    return true;
  } catch {
    // Storage refused. There is no draft to claim in that case either, so
    // proceeding is harmless.
    return true;
  }
}

function releaseClaimLock(): void {
  try {
    window.localStorage.removeItem(CLAIM_LOCK_KEY);
  } catch {
    /* the TTL will clear it */
  }
}

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

  /* Another tab is already filing this draft. Report "not claimed" rather
     than inserting a second copy — the caller keeps the local draft, and the
     builder's recovery pass will reconcile on arrival. */
  if (!acquireClaimLock()) {
    console.warn("[claimGuestDraft] Another tab holds the claim lock; skipping insert.");
    return { claimed: false };
  }

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

    /* Keep `.insert` on the query builder. Pulling the method off and
       calling it — `(supabase.from("resumes").insert as any)(...)` — drops
       `this`, and Postgrest throws "Cannot read properties of undefined
       (reading 'url')" before any request is sent. Every guest claim then
       landed in the catch below: the draft was reported unclaimed, and the
       signup toast said the résumé was lost. */
    const { data, error } = await supabase
      .from("resumes")
      .insert({
        user_id: userId,
        name,
        content: JSON.stringify(contentWithMetadata),
        file_type: "builder",
        template_id: draft.selectedTemplate,
      })
      .select("id")
      .single();

    if (error) throw error;

    // Only destroy the local copy once it is safely on the server.
    clearGuestDraft();

    return { claimed: true, resumeId: data.id };
  } catch (error) {
    console.error("[claimGuestDraft] Could not file the guest draft:", error);
    // Draft intentionally left in localStorage so the work survives.
    return { claimed: false };
  } finally {
    releaseClaimLock();
  }
}
