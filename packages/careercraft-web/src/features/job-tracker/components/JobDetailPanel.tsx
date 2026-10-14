import { ArrowLeft, Bell, Brain, CalendarDays, Edit, ExternalLink, Loader2, Mail, PenLine, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";
import { ScrollArea } from "@/components/ui/scroll-area";

import { NEXT_STEP, STAGE_HINT, avatarTone, followUpDue, followUpLabel, initials } from "../lib/cardBits";
import { JobFormFields } from "../dialogs/JobFormFields";
import { fieldId, type JobFormFocus } from "../lib/formFocus";
import { JOB_TYPE_OPTIONS, STATUS_META, appToForm, formatAppliedDate } from "../types";
import type {
  ApplicationEvent,
  ApplicationStatus,
  CoverLetterRef,
  JobApplication,
  JobFormValues,
  ResumeRef,
} from "../types";

interface JobDetailPanelProps {
  application: JobApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeName: string | null;
  hasCoverLetter: boolean;
  /** The attached letter, when it's one we could load. */
  coverLetter?: { id: string; label: string; excerpt: string } | null;
  /** Open straight into the edit view (the card menu's "Edit"). */
  initialMode?: "view" | "edit";
  resumes: ResumeRef[];
  coverLetters: CoverLetterRef[];
  /** Save the edit form. True when it saved; the panel then shows the job again. */
  onSaveEdit: (id: string, form: JobFormValues) => Promise<boolean>;
  /** Move the job to another stage. The panel stays open on the live row. */
  onStatusChange?: (id: string, status: ApplicationStatus) => void;
  events?: ApplicationEvent[];
  /** Hand this application to /analysis with its résumé and ad prefilled. */
  onAnalyse?: (app: JobApplication) => void;
  /** Open the cover letter desk for this application; saving there attaches. */
  onWriteCoverLetter?: (app: JobApplication) => void;
  onOpenCoverLetter?: (letterId: string) => void;
  onLoadTimeline?: (applicationId: string) => void;
  onClassifyEmail?: (
    applicationId: string,
    subject: string,
    body: string,
  ) => Promise<
    | {
        recommendation?: {
          targetStatus?: string | null;
          requiresUserConfirmation?: boolean;
        };
      }
    | undefined
  >;
  onConfirmStatusUpdate?: (
    applicationId: string,
    status: "applied" | "interview" | "offer" | "rejected",
  ) => Promise<void>;
}

type Suggested = "applied" | "interview" | "offer" | "rejected";

/**
 * Everything about one job, opened from its card. The top answers "what do I
 * do next?"; the rest folds away until it's wanted. Editing happens in the
 * same pop-up: the body swaps to the form and back, so you never lose your
 * place, and unsaved changes are never dropped without asking.
 */
export const JobDetailPanel = ({
  application,
  open,
  onOpenChange,
  resumeName,
  hasCoverLetter,
  coverLetter,
  initialMode = "view",
  resumes,
  coverLetters,
  onSaveEdit,
  onStatusChange,
  events = [],
  onAnalyse,
  onWriteCoverLetter,
  onOpenCoverLetter,
  onLoadTimeline,
  onClassifyEmail,
  onConfirmStatusUpdate,
}: JobDetailPanelProps) => {
  const navigate = useNavigate();
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [suggested, setSuggested] = useState<Suggested | null>(null);
  const [classifying, setClassifying] = useState(false);
  /** What the last email check came to, when it wasn't a stage to suggest. */
  const [checkNote, setCheckNote] = useState<string | null>(null);

  // A pasted email belongs to one job; don't carry it over to the next.
  const appId = application?.id;
  useEffect(() => {
    setEmailSubject("");
    setEmailBody("");
    setSuggested(null);
    setCheckNote(null);
  }, [appId]);

  /* ── View / edit ── */
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [focus, setFocus] = useState<JobFormFocus | undefined>();
  const [form, setForm] = useState<JobFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  /** Set when leaving the form would drop changes: where they were headed. */
  const [leaving, setLeaving] = useState<"back" | "close" | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Start where asked each time the pop-up opens, moves to another job, or is
  // asked for the other mode on the job already showing (view, then Edit on
  // that same card). A save refreshes the row without changing any of these,
  // so the form must not depend on `application` or it would throw the person
  // back to where they started.
  useEffect(() => {
    if (!open || !application) return;
    setMode(initialMode);
    setFocus(undefined);
    setForm(appToForm(application));
    setLeaving(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appId, initialMode]);

  // Land at the top of the new view, or on the field that was asked for.
  useEffect(() => {
    if (!open) return;
    // After the swap has rendered; a timeout rather than an animation frame,
    // which never fires in a background tab.
    const timer = window.setTimeout(() => {
      const target = mode === "edit" && focus ? document.getElementById(fieldId(focus)) : null;
      if (target) {
        target.scrollIntoView({ block: "center" });
        target.focus();
      } else {
        bodyRef.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0 });
      }
    }, 30);
    return () => window.clearTimeout(timer);
  }, [mode, focus, open]);

  if (!application) {
    return <CraftDialog open={open} onOpenChange={onOpenChange} title="Loading…" maxWidth="max-w-2xl" />;
  }

  const status = application.status;
  const next = NEXT_STEP[status];
  const tone = avatarTone(application.company);
  const followUp = followUpLabel(application);
  const due = followUpDue(application);
  const openAd = () => window.open(application.job_url as string, "_blank", "noopener");
  const editIt = (at?: JobFormFocus) => {
    setForm(appToForm(application));
    setFocus(at);
    setLeaving(null);
    setMode("edit");
  };
  const dirty =
    mode === "edit" && form !== null && JSON.stringify(form) !== JSON.stringify(appToForm(application));
  const backToJob = () => {
    setLeaving(null);
    setFocus(undefined);
    setMode("view");
  };
  /* Closing with unsaved edits asks first: the X, Escape and a click outside
     all come through here. */
  const requestOpenChange = (next: boolean) => {
    // Mid-save there's nothing to discard: the save is already going through.
    if (!next && saving) return;
    if (!next && dirty) {
      setLeaving("close");
      return;
    }
    onOpenChange(next);
  };
  const discard = () => {
    if (leaving === "close") onOpenChange(false);
    else backToJob();
  };
  const saveEdit = async () => {
    if (!form) return;
    setSaving(true);
    const ok = await onSaveEdit(application.id, form);
    setSaving(false);
    if (ok) backToJob();
  };

  /* Adzuna gives ~200 characters, so length is the only signal available for
     "is this the real ad or an extract". 400 is deliberately generous: a
     genuine ad is thousands of characters, and anything near the threshold is
     not worth scoring either way. */
  const hasFullDescription = (application.job_description?.trim().length ?? 0) >= 400;

  return (
    <CraftDialog
      open={open}
      onOpenChange={requestOpenChange}
      maxWidth="max-w-2xl"
      kicker={mode === "edit" ? "Editing" : undefined}
      title={
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-11 w-11 flex-none place-items-center rounded-xl cc-font-display text-base font-bold"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {initials(application.company)}
          </span>
          <span>{application.job_title}</span>
        </span>
      }
      description={
        <span className="cc-board flex flex-wrap items-center gap-x-3 gap-y-1.5 cc-font-sans text-[15px] sm:pl-14">
          <span>
            {application.company}
            {application.location ? ` · ${application.location}` : ""}
          </span>
          <span data-stage={status} className="cc-board-pill">
            {STATUS_META[status].label}
          </span>
        </span>
      }
      footer={
        mode === "edit" ? (
          leaving ? (
            <>
              <span className="self-center cc-font-sans text-[14px] text-[color:var(--cc-ink)] sm:mr-auto">
                Discard your changes?
              </span>
              <CraftButton variant="ghost" onClick={() => setLeaving(null)}>
                Keep editing
              </CraftButton>
              <CraftButton variant="danger" onClick={discard}>
                Discard
              </CraftButton>
            </>
          ) : (
            <>
              <CraftButton variant="ghost" className="sm:mr-auto" disabled={saving} onClick={() => (dirty ? setLeaving("back") : backToJob())}>
                <ArrowLeft className="h-4 w-4" />
                Back to the job
              </CraftButton>
              <CraftButton onClick={saveEdit} disabled={saving || !dirty}>
                {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:[animation-duration:1.8s]" />}
                {saving ? "Saving…" : "Save changes"}
              </CraftButton>
            </>
          )
        ) : (
          <>
            <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </CraftButton>
            {application.job_url && (
              <CraftButton variant="ghost" onClick={openAd}>
                <ExternalLink className="h-4 w-4" />
                Open job ad
              </CraftButton>
            )}
            <CraftButton onClick={() => editIt()}>
              <Edit className="h-4 w-4" />
              Edit
            </CraftButton>
          </>
        )
      }
    >
      {mode === "edit" && form ? (
        <div ref={bodyRef} key="edit" className="cc-swap">
          <JobFormFields
            values={form}
            onChange={(patch) => setForm((f) => (f ? { ...f, ...patch } : f))}
            resumes={resumes}
            coverLetters={coverLetters}
          />
        </div>
      ) : (
        <div ref={bodyRef} key="view" className="cc-board cc-swap space-y-4">
          {/* ── Next step ─────────────────────────────────────────── */}
          <section data-stage={status} className="cc-next-box" aria-labelledby="next-step-title">
            <h3 id="next-step-title" className="cc-next-box__label">
              {status === "offer" ? "Nice one" : "Next step"}
            </h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[color:var(--cc-ink)]">{STAGE_HINT[status]}</p>
            {(next || status === "applied" || status === "interview") && (
              <div className="mt-3 flex flex-wrap gap-2">
                {next && onStatusChange && (
                  <button type="button" className="cc-next-btn" onClick={() => onStatusChange(application.id, next.to)}>
                    {next.label}
                  </button>
                )}
                {status === "applied" && (
                  <button type="button" className="cc-next-btn cc-next-btn--quiet" onClick={() => editIt("reminder")}>
                    <Bell className="h-3.5 w-3.5" />
                    {application.reminder_date ? "Change follow-up" : "Set a follow-up"}
                  </button>
                )}
                {status === "interview" && (
                  <button type="button" className="cc-next-btn cc-next-btn--quiet" onClick={() => navigate("/interview-prep")}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    Prep for it
                  </button>
                )}
              </div>
            )}
          </section>

          {/* ── Facts ─────────────────────────────────────────────── */}
          <dl className="flex flex-wrap gap-x-8 gap-y-3 px-1 py-1">
            <Fact label={status === "saved" ? "Saved" : "Applied"}>{formatAppliedDate(application.applied_date)}</Fact>
            {application.job_type && (
              <Fact label="Work type">
                {JOB_TYPE_OPTIONS.find((o) => o.value === application.job_type)?.label ?? application.job_type}
              </Fact>
            )}
            {application.salary_range && <Fact label="Salary"><span className="cc-tabular">{application.salary_range}</span></Fact>}
            {followUp && status !== "rejected" && (
              <Fact label="Follow-up">
                <span className={due ? "text-[color:var(--cc-wheat-deep)]" : undefined}>
                  {application.reminder_date ? formatAppliedDate(application.reminder_date) : ""}
                  {due ? " · due now" : ""}
                </span>
              </Fact>
            )}
          </dl>

          {/* ── The job ad ────────────────────────────────────────── */}
          {application.job_description && (
            <details className="cc-fold">
              <summary>The job ad</summary>
              <div className="space-y-3 pb-4">
                {!hasFullDescription && (
                  <p className="text-[14px] text-[color:var(--cc-ink-soft)]">
                    The job board only sent a short extract of this ad.
                    {application.job_url ? " The full ad is a click away." : ""}
                  </p>
                )}
                <ScrollArea className="h-[220px] rounded-xl bg-[color:var(--cc-cream-2)] p-4">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                    {application.job_description}
                  </p>
                </ScrollArea>
              </div>
            </details>
          )}

          {/* ── Résumé and letter ─────────────────────────────────────
              The ATS check hands off to /analysis (the one real analyser), and
              the letter to /cover-letter?application=<id>, which attaches the
              letter here when saved. Both need the full ad: Adzuna's search API
              returns a truncated description, and scoring or writing to two
              lines would give a confident answer from almost nothing. So we say
              so, and point at the ad: open it, copy it, paste it. */}
          <details className="cc-fold" open>
            <summary>Your résumé and letter</summary>
            <div className="space-y-5 pb-4">
              <div className="space-y-2.5">
                <p className="text-[15px] text-[color:var(--cc-ink)]">
                  {resumeName ? (
                    <>
                      Sending <strong className="font-semibold">{resumeName}</strong>
                    </>
                  ) : (
                    <span className="text-[color:var(--cc-ink-soft)]">
                      No résumé picked for this job yet.{" "}
                      <button type="button" className="cc-link text-[color:var(--cc-ink)]" onClick={() => editIt("resume")}>
                        Pick one
                      </button>
                    </span>
                  )}
                </p>
                <p className="text-[14px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                  {hasFullDescription
                    ? "See how your résumé scores against this ad, and which keywords an applicant tracking system would miss."
                    : "To check your résumé against this job, paste the full ad on the next screen."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {onAnalyse && (
                    <CraftButton size="sm" onClick={() => onAnalyse(application)}>
                      <Brain className="h-4 w-4" />
                      {hasFullDescription ? "Check my résumé" : "Paste the ad and check"}
                    </CraftButton>
                  )}
                  {!hasFullDescription && application.job_url && (
                    <CraftButton size="sm" variant="ghost" onClick={openAd}>
                      <ExternalLink className="h-4 w-4" />
                      Open the ad to copy
                    </CraftButton>
                  )}
                </div>
              </div>

              {onWriteCoverLetter && (
                <div className="space-y-2.5 border-t border-[color:var(--cc-hair)] pt-4">
                  {coverLetter ? (
                    <>
                      <p className="text-[15px] text-[color:var(--cc-ink)]">
                        Letter: <strong className="font-semibold">{coverLetter.label}</strong>
                      </p>
                      <p className="line-clamp-2 text-[14px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                        {coverLetter.excerpt}
                      </p>
                    </>
                  ) : (
                    <p className="text-[14px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                      {hasCoverLetter
                        ? "A cover letter is attached."
                        : hasFullDescription
                          ? "No cover letter yet. Write one from this ad and your résumé; it's attached here when you save it."
                          : "No cover letter yet. Paste the full ad on the next screen so the letter can answer it."}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {coverLetter && onOpenCoverLetter && (
                      <CraftButton size="sm" onClick={() => onOpenCoverLetter(coverLetter.id)}>
                        <Mail className="h-4 w-4" />
                        Open letter
                      </CraftButton>
                    )}
                    <CraftButton
                      size="sm"
                      variant={coverLetter ? "ghost" : "primary"}
                      onClick={() => onWriteCoverLetter(application)}
                    >
                      <PenLine className="h-4 w-4" />
                      {coverLetter ? "Write a new one" : "Write a cover letter"}
                    </CraftButton>
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* ── Notes ─────────────────────────────────────────────── */}
          <details className="cc-fold" open={Boolean(application.notes)}>
            <summary>Notes</summary>
            <div className="pb-4">
              {application.notes ? (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                  {application.notes}
                </p>
              ) : (
                <p className="text-[14px] text-[color:var(--cc-ash)]">
                  Nothing yet.{" "}
                  <button type="button" className="cc-link text-[color:var(--cc-ink)]" onClick={() => editIt("notes")}>
                    Add a note
                  </button>
                </p>
              )}
            </div>
          </details>

          {/* ── Activity ──────────────────────────────────────────── */}
          <details className="cc-fold">
            <summary>
              Activity
              {events.length > 0 && (
                <span className="cc-tabular text-[13px] font-normal text-[color:var(--cc-ash)]">{events.length}</span>
              )}
            </summary>
            <div className="space-y-2 pb-4">
              {events.length > 0 ? (
                <ol className="space-y-2">
                  {events.map((e) => (
                    <li key={e.id} className="rounded-xl bg-[color:var(--cc-cream-2)] px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs text-[color:var(--cc-ash)]">
                        <span className="first-letter:uppercase">{e.event_type.split("_").join(" ")}</span>
                        <span>{formatAppliedDate(e.occurred_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">{e.summary}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[14px] text-[color:var(--cc-ash)]">
                  Nothing here yet. Emails you check below are logged here.
                </p>
              )}
              {onLoadTimeline && (
                <button
                  type="button"
                  className="cc-link text-[13px] text-[color:var(--cc-ink-soft)]"
                  onClick={() => onLoadTimeline(application.id)}
                >
                  Refresh
                </button>
              )}
            </div>
          </details>

          {/* ── Email ─────────────────────────────────────────────── */}
          {(onClassifyEmail || onConfirmStatusUpdate) && (
            <details className="cc-fold">
              <summary>Got an email about this job?</summary>
              <div className="space-y-3 pb-4">
                <p className="text-[14px] text-[color:var(--cc-ink-soft)]">
                  Paste it in and we'll suggest which stage this job belongs in. Nothing moves until you say so.
                </p>
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                  aria-label="Email subject"
                  className="cc-field"
                />
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="The email itself"
                  aria-label="Email body"
                  className="cc-field cc-field-textarea min-h-[120px]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <CraftButton
                    size="sm"
                    variant="ghost"
                    disabled={!emailBody.trim() || classifying}
                    onClick={async () => {
                      if (!onClassifyEmail || !emailBody.trim()) return;
                      setClassifying(true);
                      setCheckNote(null);
                      try {
                        // The hook reloads Activity itself once the check is logged.
                        const result = await onClassifyEmail(application.id, emailSubject, emailBody);
                        const s = result?.recommendation?.targetStatus;
                        const stage =
                          s === "applied" || s === "interview" || s === "offer" || s === "rejected" ? s : null;
                        setSuggested(stage);
                        if (!stage) {
                          setCheckNote("That email doesn't clearly say interview, offer or rejection, so there's nothing to suggest.");
                        }
                      } catch {
                        setCheckNote("Couldn't check that email just now. Try again in a moment.");
                      } finally {
                        setClassifying(false);
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    {classifying ? "Reading…" : "Suggest a stage"}
                  </CraftButton>
                  {suggested && suggested !== status && onConfirmStatusUpdate && (
                    <CraftButton
                      size="sm"
                      onClick={async () => {
                        await onConfirmStatusUpdate(application.id, suggested);
                        setSuggested(null);
                      }}
                    >
                      Move to {STATUS_META[suggested].label}
                    </CraftButton>
                  )}
                  {suggested && suggested === status && (
                    <span className="text-[14px] text-[color:var(--cc-ink-soft)]">
                      Looks like it's already in the right place.
                    </span>
                  )}
                </div>
                {checkNote && (
                  <p role="status" className="text-[13.5px] text-[color:var(--cc-ink-soft)]">
                    {checkNote}
                  </p>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </CraftDialog>
  );
};

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="cc-label-sm text-[color:var(--cc-ash)]">{label}</dt>
    <dd className="mt-0.5 text-[15px] font-semibold text-[color:var(--cc-ink)]">{children}</dd>
  </div>
);
