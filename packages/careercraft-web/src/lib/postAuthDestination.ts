/* ───────────────────────────────────────────────────────────
   postAuthDestination — the one answer to "a session just appeared,
   where does this person go?"

   It exists because that question used to be answered in two places that
   knew different things. Auth.tsx claimed the guest draft and honoured the
   return path; Index.tsx sent everyone to /dashboard. Which one ran was
   decided by something neither of them controlled — whether the browser
   reloaded:

     Google / Microsoft   full reload → lands on "/"    → Index  → dashboard
     email confirmation   new tab     → lands on "/"    → Index  → dashboard
     email + password     no reload   → stays on /auth  → Auth   → works

   So the two flows that reload lost the résumé the visitor had just been
   asked to create an account for, and the only flow that worked was the one
   that never left the page. Centralising the decision means the redirect no
   longer depends on which door the session came through.

   Every caller that navigates on a new session MUST route through here.
   Adding another `navigate("/dashboard")` on a session is how this breaks
   again.
   ─────────────────────────────────────────────────────────── */

import { claimGuestDraft } from "@/features/resume-builder/lib/claimGuestDraft";
import {
  setHandoffNote,
  takeGuestReturnTo,
} from "@/features/resume-builder/lib/guestDraft";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_DESTINATION = "/dashboard";

async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return Boolean(data);
  } catch (error) {
    console.error("[postAuth] Could not check admin status:", error);
    return false;
  }
}

/*
 * Callers ask twice. Index subscribes to onAuthStateChange AND calls
 * getSession(), and supabase-js answers both — so two resolutions start
 * microseconds apart for one sign-in.
 *
 * That is not merely wasteful, it is the original bug in miniature:
 * takeGuestReturnTo() consumes, so the first call would get
 * "/builder?id=…" and the second would find nothing, fall through to the
 * admin check, and navigate to /dashboard — potentially last, overwriting
 * the correct destination. Sharing the in-flight promise makes concurrent
 * callers observe one decision instead of racing to different answers.
 */
let inFlight: Promise<string> | null = null;

/*
 * inFlight only covers callers that overlap. Auth does not: getSession()
 * awaits the claim, and the SIGNED_IN listener calls again on a setTimeout,
 * after the first promise has already settled and cleared the latch.
 *
 * That second call is fatal. takeGuestReturnTo() already consumed the
 * path, and a successful claim already deleted the local draft — so the
 * late caller finds nothing, returns /dashboard, and navigates last.
 * The résumé was either filed and then abandoned, or left behind under an
 * error toast on a page they never see.
 *
 * Remember the answer for a few seconds so every caller in one sign-in
 * observes the same destination.
 */
const RESOLVE_REUSE_MS = 10_000;
let resolved: { userId: string; destination: string; at: number } | null = null;

/**
 * Claim any guest draft, then decide where to send the newly-signed-in user.
 *
 * Never throws: a failure anywhere still yields a destination, because
 * leaving someone on a spinner is worse than landing them on the dashboard.
 */
export function resolvePostAuthDestination(userId: string): Promise<string> {
  if (
    resolved &&
    resolved.userId === userId &&
    Date.now() - resolved.at < RESOLVE_REUSE_MS
  ) {
    return Promise.resolve(resolved.destination);
  }

  if (!inFlight) {
    inFlight = runResolve(userId)
      /* "Never throws" has to be true by construction, not by inspection.
         Every caller awaits this to decide where to navigate, so a rejection
         here means no navigate call happens at all — the person finishes
         signing in and then just sits on the auth page, which reads as a
         broken login. A wrong-but-sane destination beats no destination. */
      .then((destination) => {
        resolved = { userId, destination, at: Date.now() };
        return destination;
      })
      .catch((error) => {
        console.error("[postAuth] Destination resolution failed:", error);
        const destination = DEFAULT_DESTINATION;
        resolved = { userId, destination, at: Date.now() };
        return destination;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

async function runResolve(userId: string): Promise<string> {
  let claimed = false;
  let resumeId: string | undefined;

  try {
    ({ claimed, resumeId } = await claimGuestDraft(userId));
  } catch (error) {
    // The draft stays in localStorage, and the builder's recovery pass picks
    // it up on arrival. Nothing here should block the redirect.
    console.error("[postAuth] Could not claim guest draft:", error);
  }

  const pending = takeGuestReturnTo();

  if (!pending) {
    /* No interrupted journey to resume, so the usual landing rules apply. */
    return (await isAdmin(userId)) ? "/admin" : DEFAULT_DESTINATION;
  }

  /* An explicit return beats the admin landing. Someone who clicked
     "create an account to download" wants their résumé, not the admin panel,
     and the draft has already been consumed by the claim above — sending
     them elsewhere would strand it.

     continue-* tools land off /builder. The handoff toast is only read in the
     builder, so writing a note here would leave a stale message for a later
     visit. The draft is already claimed (or kept locally on failure). */
  if (pending.path !== "/builder") {
    return pending.path;
  }

  const params = new URLSearchParams();

  /* Claiming DELETES the local draft, and the builder only restores drafts
     for guests — so a bare /builder would hand them a blank page under a
     message saying their work came with them. Carry the new row's id; the
     builder's ?id= loader reopens it. When the claim failed there is no id,
     but the local draft survived, and the builder's recovery pass will find
     it and file it then. */
  if (claimed && resumeId) params.set("id", resumeId);

  /* Only export can be finished on arrival — everything it needs is in the
     résumé itself. The AI gates needed a File or a job description that
     could not survive the redirect, so they land on the step where the
     visitor can supply it again rather than pretending to resume. */
  if (pending.intent === "export") params.set("step", "3");

  setHandoffNote(claimed ? "claimed" : "claim-failed", pending.intent);

  const query = params.toString();
  return query ? `/builder?${query}` : "/builder";
}
