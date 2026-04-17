import { Edit, ExternalLink, FileText, Mail, MapPin } from "lucide-react";

import {
  CraftButton,
  CraftDialog,
} from "@/components/craft/AppPrimitives";
import { ScrollArea } from "@/components/ui/scroll-area";

import { STATUS_META, formatAppliedDate } from "../types";
import type { JobApplication } from "../types";

interface JobDetailPanelProps {
  application: JobApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeName: string | null;
  hasCoverLetter: boolean;
  onEdit: (app: JobApplication) => void;
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
}: JobDetailPanelProps) => {
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
  const pillClass =
    meta.pill === "filled"
      ? "cc-pill cc-pill-filled"
      : meta.pill === "rust"
      ? "cc-pill cc-pill-rust"
      : "cc-pill";

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
          <span className="cc-italic-wonk">{application.job_title}</span>
          {application.location && (
            <>
              <span className="text-[color:var(--cc-ash)]">·</span>
              <span className="inline-flex items-center gap-1.5 cc-font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--cc-ink-soft)]">
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
            <div className="cc-label text-[color:var(--cc-rust)] mb-2">
              § Enclosures
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
            <div className="cc-label text-[color:var(--cc-rust)] mb-2">
              § The brief
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
            <div className="cc-label text-[color:var(--cc-rust)] mb-2">
              § Marginalia
            </div>
            <p className="cc-font-editorial text-lg leading-relaxed text-[color:var(--cc-ink-soft)] whitespace-pre-wrap">
              {application.notes}
            </p>
          </section>
        )}
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
    <div className="cc-label text-[color:var(--cc-ash)]">{label}</div>
    <div
      className={`mt-1 cc-font-display text-lg text-[color:var(--cc-ink)] ${
        capitalize ? "capitalize" : ""
      } ${tabular ? "cc-tabular" : ""}`}
    >
      {value}
    </div>
  </div>
);
