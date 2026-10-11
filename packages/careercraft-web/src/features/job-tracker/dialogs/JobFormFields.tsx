import { FileText } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { letterLabel } from "@/features/cover-letter/lib/letterLabel";
import {
  JOB_TYPE_OPTIONS,
  STATUS_META,
  STATUS_ORDER,
} from "../types";
import type {
  ApplicationStatus,
  CoverLetterRef,
  JobFormValues,
  JobType,
  ResumeRef,
} from "../types";

interface JobFormFieldsProps {
  values: JobFormValues;
  onChange: (patch: Partial<JobFormValues>) => void;
  resumes: ResumeRef[];
  coverLetters: CoverLetterRef[];
}

/** The shared form used by both Add and Edit dialogs. */
export const JobFormFields = ({
  values,
  onChange,
  resumes,
  coverLetters,
}: JobFormFieldsProps) => {
  const triggerCls =
    "cc-root w-full rounded-none border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] px-[0.9rem] cc-font-sans text-[14px] text-[color:var(--cc-ink)] hover:border-[color:var(--cc-ink)] focus:ring-0 focus:border-[color:var(--cc-rust)] h-auto py-[0.75rem]";
  const contentCls =
    "cc-root rounded-none border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] shadow-[4px_4px_0_0_var(--cc-ink)]";

  return (
    <div className="space-y-6">
      {/* Row: title + company */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FieldLabel label="Role *">
          <input
            className="cc-field"
            placeholder="e.g. Software Engineer"
            value={values.jobTitle}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label="Company *">
          <input
            className="cc-field"
            placeholder="e.g. Canva"
            value={values.company}
            onChange={(e) => onChange({ company: e.target.value })}
          />
        </FieldLabel>
      </div>

      {/* Row: status + job type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FieldLabel label="Stage">
          <Select
            value={values.status}
            onValueChange={(v: ApplicationStatus) => onChange({ status: v })}
          >
            <SelectTrigger className={triggerCls}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabel>

        <FieldLabel label="Job type">
          <Select
            value={values.jobType || "none"}
            onValueChange={(v) =>
              onChange({ jobType: v === "none" ? "" : (v as JobType) })
            }
          >
            <SelectTrigger className={triggerCls}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value="none">None</SelectItem>
              {JOB_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabel>
      </div>

      {/* Row: location + salary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FieldLabel label="Location">
          <input
            className="cc-field"
            placeholder="e.g. Sydney, NSW"
            value={values.jobLocation}
            onChange={(e) => onChange({ jobLocation: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label="Salary range">
          <input
            className="cc-field cc-tabular"
            placeholder="e.g. $120k – $160k"
            value={values.salaryRange}
            onChange={(e) => onChange({ salaryRange: e.target.value })}
          />
        </FieldLabel>
      </div>

      {/* Job URL */}
      <FieldLabel label="Link to the ad">
        <input
          className="cc-field"
          placeholder="https://…"
          value={values.jobUrl}
          onChange={(e) => onChange({ jobUrl: e.target.value })}
        />
      </FieldLabel>

      {/* Linked documents */}
      <div className="pt-4 border-t border-[color:var(--cc-hair-strong)]">
        <div className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-rust)] mb-3">
          <FileText className="w-3.5 h-3.5" />
          What you're sending
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldLabel label="Résumé">
            <Select
              value={values.selectedResumeId || "none"}
              onValueChange={(v) =>
                onChange({ selectedResumeId: v === "none" ? "" : v })
              }
            >
              <SelectTrigger className={triggerCls}>
                <SelectValue placeholder="Select résumé" />
              </SelectTrigger>
              <SelectContent className={contentCls}>
                <SelectItem value="none">None</SelectItem>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldLabel>

          <FieldLabel label="Cover letter">
            <Select
              value={values.selectedCoverLetterId || "none"}
              onValueChange={(v) =>
                onChange({ selectedCoverLetterId: v === "none" ? "" : v })
              }
            >
              <SelectTrigger className={triggerCls}>
                <SelectValue placeholder="Select cover letter" />
              </SelectTrigger>
              <SelectContent className={contentCls}>
                <SelectItem value="none">None</SelectItem>
                {coverLetters.map((cl) => (
                  <SelectItem key={cl.id} value={cl.id}>
                    {letterLabel(cl)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldLabel>
        </div>
      </div>

      {/* Reminder */}
      <FieldLabel label="Follow up on">
        <input
          type="date"
          className="cc-field"
          value={values.reminderDate}
          onChange={(e) => onChange({ reminderDate: e.target.value })}
        />
      </FieldLabel>

      {/* Job description */}
      <FieldLabel label="Job ad">
        <textarea
          placeholder="Paste the whole ad. The résumé check and cover letter work from it."
          value={values.jobDescription}
          onChange={(e) => onChange({ jobDescription: e.target.value })}
          className="cc-field cc-field-textarea min-h-[100px] placeholder:italic"
        />
      </FieldLabel>

      {/* Notes */}
      <FieldLabel label="Notes">
        <textarea
          placeholder="Who you spoke to, what they asked, anything worth remembering. Only you see these."
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="cc-field cc-field-textarea min-h-[80px] placeholder:italic"
        />
      </FieldLabel>
    </div>
  );
};

const FieldLabel = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="cc-label text-[color:var(--cc-ash)] block mb-1">
      {label}
    </span>
    {children}
  </label>
);
