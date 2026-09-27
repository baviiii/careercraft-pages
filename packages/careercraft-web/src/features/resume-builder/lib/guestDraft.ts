/* ───────────────────────────────────────────────────────────
   guestDraft — the bridge between "not signed in" and "signed in".

   A guest builds a résumé with nothing behind them but localStorage.
   The moment they authenticate, that draft has to survive the trip and
   land in their account — if it doesn't, we've wasted their work and
   the signup felt like a toll gate for nothing.

   Scope note: this module stores a draft and a return path. It does NOT
   meter AI. Every AI endpoint requires a Supabase session (verify_jwt +
   requireUser + a per-user plan quota), so guests have no AI access to
   meter — the builder sends them to signup instead. Do not reintroduce a
   client-side allowance here: a localStorage counter is not a spend
   control, and pretending otherwise is how the last one shipped broken.
   ─────────────────────────────────────────────────────────── */

import {
  GUEST_RETURN_ALLOWLIST,
  type AccountGateReason,
  type ResumeData,
  type TemplateId,
} from "../types";

function isAllowedReturnPath(path: string): boolean {
  // Allow `/builder?id=…&step=3` — the allowlist is path-prefix by route
  // segment, not a blind startsWith (that would accept `/builder-evil`).
  const pathname = path.split(/[?#]/)[0] ?? "";
  return (GUEST_RETURN_ALLOWLIST as readonly string[]).includes(pathname);
}

const DRAFT_KEY = "cc-guest-resume-draft";
const RETURN_KEY = "cc-guest-return-to";
const NOTE_KEY = "cc-guest-handoff-note";

/** Bump when the shape changes so stale drafts are dropped, not crashed on. */
const DRAFT_VERSION = 1;

/** A return path is only meaningful for one signup attempt. An hour covers
 *  the slowest realistic path (confirmation email, coffee, click). */
const RETURN_TTL_MS = 60 * 60 * 1000;

/** A handoff note describes what just happened, so it is only interesting for
 *  the redirect it was written for. Minutes, not hours. */
const NOTE_TTL_MS = 5 * 60 * 1000;

export interface GuestDraft {
  version: number;
  resumeData: ResumeData;
  selectedTemplate: TemplateId;
  currentStep: number;
  savedAt: string;
}

/* ── Draft ────────────────────────────────────────────────── */

/**
 * Persist the draft.
 *
 * Returns false when storage refused the write (private browsing, quota
 * full, storage disabled). Callers MUST surface that rather than assume it
 * worked — the builder tells the guest their work is safe, and that promise
 * has to be true.
 */
export function saveGuestDraft(
  resumeData: ResumeData,
  selectedTemplate: TemplateId,
  currentStep: number
): boolean {
  try {
    const payload: GuestDraft = {
      version: DRAFT_VERSION,
      resumeData,
      selectedTemplate,
      currentStep,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadGuestDraft(): GuestDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GuestDraft;
    if (parsed?.version !== DRAFT_VERSION) {
      clearGuestDraft();
      return null;
    }
    if (!parsed.resumeData?.contact) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to do */
  }
}

/** True when there is a draft worth offering to restore — i.e. the visitor
 *  actually typed something, not just opened the builder and left. */
export function hasMeaningfulGuestDraft(draft = loadGuestDraft()): boolean {
  if (!draft) return false;

  const { contact, summary, experience, education, skills } = draft.resumeData;
  return Boolean(
    contact?.name?.trim() ||
      contact?.email?.trim() ||
      summary?.trim() ||
      experience?.length ||
      education?.length ||
      skills?.length
  );
}

/* ── Where to send them back to after signup ──────────────── */

/*
 * localStorage, not sessionStorage: email confirmation opens a NEW tab, and
 * sessionStorage does not cross that boundary — the guest would land on the
 * dashboard wondering where their résumé went. The TTL keeps a forgotten
 * path from hijacking an unrelated sign-in weeks later.
 */

interface StoredReturn {
  path: string;
  /** Which gate sent them. Decides how much of the journey we can resume. */
  intent?: AccountGateReason;
  savedAt: number;
}

export interface GuestReturn {
  path: string;
  intent: AccountGateReason | null;
}

export function setGuestReturnTo(path: string, intent?: AccountGateReason): void {
  if (!path.startsWith("/") || path.startsWith("//") || !isAllowedReturnPath(path)) {
    return;
  }
  try {
    const payload: StoredReturn = { path, intent, savedAt: Date.now() };
    window.localStorage.setItem(RETURN_KEY, JSON.stringify(payload));
  } catch {
    /* fall back to the default redirect */
  }
}

/** Shared validation for both the peek and the consuming read. */
function readReturn(): GuestReturn | null {
  try {
    const raw = window.localStorage.getItem(RETURN_KEY);
    if (!raw) return null;

    const { path, intent, savedAt } = JSON.parse(raw) as StoredReturn;
    if (!path || typeof savedAt !== "number") return null;
    if (Date.now() - savedAt > RETURN_TTL_MS) return null;

    // Only ever return same-origin app paths on the allowlist — never an
    // absolute URL, never a protocol-relative one, never an arbitrary route.
    if (!path.startsWith("/") || path.startsWith("//") || !isAllowedReturnPath(path)) {
      return null;
    }

    return { path, intent: intent ?? null };
  } catch {
    return null;
  }
}

/**
 * Look at the pending return WITHOUT consuming it.
 *
 * /auth uses this to explain why the visitor is there. It must not consume:
 * the resolver that actually performs the redirect is the only consumer, and
 * if the banner ate the record the redirect would silently stop working.
 */
export function peekGuestReturn(): GuestReturn | null {
  return readReturn();
}

/** Read and consume the stored return. Returns null if absent, expired, or
 *  not a same-origin app path. */
export function takeGuestReturnTo(): GuestReturn | null {
  const result = readReturn();
  try {
    window.localStorage.removeItem(RETURN_KEY);
  } catch {
    /* nothing to do */
  }
  return result;
}

/* ── What just happened, told at the other end ────────────── */

/*
 * A toast lives in memory, and two of the three signup flows (OAuth, email
 * confirmation) reload the page — so a message shown at the /auth end is
 * guaranteed to be gone by the time the person arrives. The note is written
 * where the outcome is known and read where the person actually lands.
 *
 * Read-and-delete, plus a short TTL: it can fire exactly once, so a refresh
 * never replays it and a redirect that never completed can't leave a stale
 * message waiting weeks later.
 */

export type HandoffOutcome =
  /** Draft was filed under the new account and is open in front of them. */
  | "claimed"
  /** Insert failed; the local draft was kept and has been reopened. */
  | "claim-failed"
  /** Found stranded in localStorage on a later visit and rescued. */
  | "recovered";

export interface HandoffNote {
  outcome: HandoffOutcome;
  intent: AccountGateReason | null;
  savedAt: number;
}

export function setHandoffNote(
  outcome: HandoffOutcome,
  intent: AccountGateReason | null,
): void {
  try {
    const payload: HandoffNote = { outcome, intent, savedAt: Date.now() };
    window.localStorage.setItem(NOTE_KEY, JSON.stringify(payload));
  } catch {
    /* the redirect still works; they just won't get the message */
  }
}

export function takeHandoffNote(): HandoffNote | null {
  try {
    const raw = window.localStorage.getItem(NOTE_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(NOTE_KEY);

    const note = JSON.parse(raw) as HandoffNote;
    if (!note?.outcome || typeof note.savedAt !== "number") return null;
    if (Date.now() - note.savedAt > NOTE_TTL_MS) return null;

    return note;
  } catch {
    return null;
  }
}
