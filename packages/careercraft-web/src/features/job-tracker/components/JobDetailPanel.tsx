import { Brain, Edit, ExternalLink, FileText, Mail, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  CraftButton,
  CraftDialog,
} from "@/components/craft/AppPrimitives";
import { ScrollArea } from "@/components/ui/scroll-area";

import { STATUS_META, formatAppliedDate, statusPillClass } from "../types";
import type { ApplicationEvent, JobApplication } from "../types";

interface JobDetailPanelProps {
  application: JobApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeName: string | null;
  hasCoverLetter: boolean;
  onEdit: (app: JobApplication) => void;
  events?: ApplicationEvent[];
  /** Hand this application to /analysis with its résumé and ad prefilled. */
  onAnalyse?: (app: JobApplication) => void;
  onLoadTimeline?: (applicationId: string) => void;
  onClassifyEmail?: (
    applicationId: string,
    subject: string,
    body: string,
    requireConfirm?: boolean,
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

/**
 * Read-only editorial panel surfaced when a user clicks "Read the entry"
 * on a card. Rendered inside a `CraftDialog` for consistency.
 */
export const JobDetailPanel = ({
  application,
  open,
  onOpenChange,
  resumeName,
  hasCoverLetter,
  onEdit,
  events = [],
  onAnalyse,
  onLoadTimeline,
  onClassifyEmail,
  onConfirmStatusUpdate,
}: JobDetailPanelProps) => {
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [pendingSuggestedStatus, setPendingSuggestedStatus] = useState<
    "applied" | "interview" | "offer" | "rejected" | null
  >(null);

  if (!application) {
    return (
      <CraftDialog
        open={open}
        onOpenChange={onOpenChange}
        kicker="§ Entry"
        title="Loading entry"
        maxWidth="max-w-2xl"
      />
    );
  }

  const meta = STATUS_META[application.status];
  const pillClass = statusPillClass(application.status);

  /* Adzuna gives ~200 characters, so length is the only signal available for
     "is this the real ad or an extract". 400 is deliberately generous: a
     genuine ad is thousands of characters, and anything near the threshold is
     not worth scoring either way. */
  const hasFullDescription = (application.job_description?.trim().length ?? 0) >= 400;

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker={meta.kicker}
      maxWidth="max-w-2xl"
      title={
        <span className="flex flex-wrap items-baseline gap-3">
          <span>{application.company}</span>
          <span className={`${pillClass} capitalize text-xs`}>
            {meta.label}
          </span>
        </span>
      }
      description={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="cc-font-sans font-medium">{application.job_title}</span>
          {application.location && (
            <>
              <span className="text-[color:var(--cc-ash)]">·</span>
              <span className="inline-flex items-center gap-1.5 cc-font-sans text-xs text-[color:var(--cc-ink-soft)]">
                <MapPin className="w-3 h-3" />
                {application.location}
              </span>
            </>
          )}
        </span>
      }
      footer={
        <>
          <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </CraftButton>
          {application.job_url && (
            <CraftButton
              variant="ghost"
              onClick={() =>
                window.open(application.job_url as string, "_blank")
              }
            >
              <ExternalLink className="w-4 h-4" />
              View posting
            </CraftButton>
          )}
          <CraftButton
            onClick={() => {
              onOpenChange(false);
              onEdit(application);
            }}
          >
            <Edit className="w-4 h-4" />
            Amend
          </CraftButton>
        </>
      }
    >
      <div className="space-y-6">
        {/* Quick info grid */}
        <div className="grid grid-cols-2 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
          <InfoCell
            label="Job type"
            value={application.job_type || "—"}
            capitalize
          />
          <InfoCell
            label="Salary"
            value={application.salary_range || "—"}
            tabular
          />
          <InfoCell
            label="Applied"
            value={formatAppliedDate(application.applied_date)}
          />
          <InfoCell
            label="Follow-up"
            value={
              application.reminder_date
                ? formatAppliedDate(application.reminder_date)
                : "—"
            }
          />
        </div>

        {/* Linked docs */}
        {(application.resume_id || application.cover_letter_id) && (
          <section>
            <div className="cc-font-sans text-sm font-semibold text-[color:var(--cc-rust)] mb-2">
              Enclosures
            </div>
            <div className="flex flex-wrap gap-1.5">
              {application.resume_id && resumeName && (
                <span className="cc-pill cc-pill-rust">
                  <FileText className="w-3 h-3" />
                  {resumeName}
                </span>
              )}
              {application.cover_letter_id && hasCoverLetter && (
                <span className="cc-pill cc-pill-rust">
                  <Mail className="w-3 h-3" />
                  Cover letter attached
                </span>
              )}
            </div>
          </section>
        )}

        {/* Job description */}
        {application.job_description && (
          <section>
            <div className="cc-font-sans text-sm font-semibold text-[color:var(--cc-rust)] mb-2">
              Job description
            </div>
            <ScrollArea className="h-[200px] border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4">
              <p className="cc-font-sans text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)] whitespace-pre-wrap">
                {application.job_description}
              </p>
            </ScrollArea>
          </section>
        )}

        {/* Notes */}
        {application.notes && (
          <section>
            <div className="cc-font-sans text-sm font-semibold text-[color:var(--cc-rust)] mb-2">
              Notes
            </div>
            <p className="cc-font-sans text-base leading-relaxed text-[color:var(--cc-ink-soft)] whitespace-pre-wrap">
              {application.notes}
            </p>
          </section>
        )}

        {/* ───── ATS check ─────────────────────────────────────────────
            This was "Fit scoring": a button calling the job-fit-score
            function, which counted how many words the résumé and the ad had
            in common. It reported "Strong alignment on team" and "Missing
            mention of dynamic", with three next-actions identical for every
            job. It read as an AI analysis and was a word-overlap ratio.

            It now hands off to /analysis, the real analyser, which already
            accepts a preselected résumé and a prefilled job description.
            One analyser for the whole product instead of two.

            The snippet warning is the important part. Adzuna's search API
            returns a truncated description — their docs say so twice — so an
            application saved from a job search carries roughly 200
            characters. Analysing that would produce a confident verdict from
            almost no input. So we say so, and point at the posting, because
            the real workflow is: open the ad, copy it, paste it. */}
        <section>
          <div className="cc-font-sans text-sm font-semibold text-[color:var(--cc-rust)] mb-2">
            ATS check
          </div>
          <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4 space-y-3">
            <p className="cc-font-sans text-[14px] leading-relaxed text-[color:var(--cc-ink-soft)]">
              {hasFullDescription
                ? "Score this résumé against the job description below, and see the keywords an applicant tracking system would miss."
                : "The job board only gave us a short extract of this ad, which is not enough to score against. Open the posting, copy the full description, and paste it on the next screen."}
            </p>
            <div className="flex flex-wrap gap-2">
              {onAnalyse && (
                <CraftButton onClick={() => onAnalyse(application)}>
                  <Brain className="w-4 h-4" />
                  {hasFullDescription ? "Run ATS check" : "Paste the ad and check"}
                </CraftButton>
              )}
              {application.job_url && (
                <CraftButton
                  variant="ghost"
                  onClick={() =>
                    window.open(application.job_url as string, "_blank")
                  }
                >
                  <ExternalLink className="w-4 h-4" />
                  Open posting to copy
                </CraftButton>
              )}
            </div>
          </div>
        </section>

        {/* Email automation */}
        {(onClassifyEmail || onConfirmStatusUpdate) && (
          <section>
            <div className="cc-font-sans text-sm font-semibold text-[color:var(--cc-rust)] mb-2">
              Email status automation
            </div>
            <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-4 space-y-3">
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                className="cc-field"
              />
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Paste recruiter email content to classify..."
                className="cc-field cc-field-textarea min-h-[120px]"
              />
              <div className="flex flex-wrap gap-2">
                <CraftButton
                  variant="ghost"
                  onClick={async () => {
                    if (!onClassifyEmail || !emailBody.trim()) return;
                    const result = await onClassifyEmail(
                      application.id,
                      emailSubject,
                      emailBody,
                      true,
                    );
                    const s = result?.recommendation?.targetStatus;
                    if (s === "applied" || s === "interview" || s === "offer" || s === "rejected") {
                      setPendingSuggestedStatus(s);
                    } else {
                      setPendingSuggestedStatus(null);
                    }
                    onLoadTimeline?.(application.id);
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                  Classify email
                </CraftButton>
                {pendingSuggestedStatus && onConfirmStatusUpdate && (
                  <CraftButton
                    onClick={async () => {
                      await onConfirmStatusUpdate(application.id, pendingSuggestedStatus);
                      setPendingSuggestedStatus(null);
                      onLoadTimeline?.(application.id);
                    }}
                  >
                    Apply suggested status: {pendingSuggestedStatus}
                  </CraftButton>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Timeline */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="cc-font-sans text-sm font-semibold text-[color:var(--cc-rust)]">
              Timeline
            </div>
            {onLoadTimeline && (
              <CraftButton variant="ghost" onClick={() => onLoadTimeline(application.id)}>
                Refresh timeline
              </CraftButton>
            )}
          </div>
          {events.length > 0 ? (
            <div className="space-y-2">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="cc-font-sans text-xs font-medium text-[color:var(--cc-ash)]">
                      {e.event_type.split("_").join(" ")}
                    </span>
                    <span className="cc-font-sans text-xs text-[color:var(--cc-ash)]">
                      {formatAppliedDate(e.occurred_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--cc-ink-soft)]">{e.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[color:var(--cc-ash)]">
              No events yet. Actions and email classifications will appear here.
            </p>
          )}
        </section>
      </div>
    </CraftDialog>
  );
};

const InfoCell = ({
  label,
  value,
  capitalize,
  tabular,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  tabular?: boolean;
}) => (
  <div className="bg-[color:var(--cc-cream)] px-4 py-3">
    <div className="cc-font-sans text-xs font-medium text-[color:var(--cc-ash)]">{label}</div>
    <div
      className={`mt-1 cc-font-sans text-base font-semibold text-[color:var(--cc-ink)] ${
        capitalize ? "capitalize" : ""
      } ${tabular ? "cc-tabular" : ""}`}
    >
      {value}
    </div>
  </div>
);
