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

import type { ResumeData, TemplateId } from "../types";

const DRAFT_KEY = "cc-guest-resume-draft";
const RETURN_KEY = "cc-guest-return-to";

/** Bump when the shape changes so stale drafts are dropped, not crashed on. */
const DRAFT_VERSION = 1;

/** A return path is only meaningful for one signup attempt. An hour covers
 *  the slowest realistic path (confirmation email, coffee, click). */
const RETURN_TTL_MS = 60 * 60 * 1000;

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
  savedAt: number;
}

export function setGuestReturnTo(path: string): void {
  try {
    const payload: StoredReturn = { path, savedAt: Date.now() };
    window.localStorage.setItem(RETURN_KEY, JSON.stringify(payload));
  } catch {
    /* fall back to the default redirect */
  }
}

/** Read and consume the stored path. Returns null if absent, expired, or not
 *  a same-origin app path. */
export function takeGuestReturnTo(): string | null {
  try {
    const raw = window.localStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(RETURN_KEY);

    const { path, savedAt } = JSON.parse(raw) as StoredReturn;
    if (!path || typeof savedAt !== "number") return null;
    if (Date.now() - savedAt > RETURN_TTL_MS) return null;

    // Only ever return same-origin app paths — never an absolute URL, and
    // never a protocol-relative one, which navigates off-site.
    return path.startsWith("/") && !path.startsWith("//") ? path : null;
  } catch {
    return null;
  }
}
