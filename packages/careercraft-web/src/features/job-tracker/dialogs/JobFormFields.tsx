import { FileText } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  JOB_TYPE_OPTIONS,
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

/**
 * The shared form used by both Add and Edit dialogs.
 * Editorial: cc-input text fields, shadcn Select with className overrides,
 * ink dividers between logical sections.
 */
export const JobFormFields = ({
  values,
  onChange,
  resumes,
  coverLetters,
}: JobFormFieldsProps) => {
  const triggerCls =
    "cc-root w-full rounded-none border-0 border-b border-[color:var(--cc-ink)] bg-transparent px-0 cc-font-sans text-[15px] text-[color:var(--cc-ink)] focus:ring-0 focus:border-[color:var(--cc-rust)] h-auto py-3";
  const contentCls =
    "cc-root rounded-none border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] shadow-[4px_4px_0_0_var(--cc-ink)]";

  return (
    <div className="space-y-6">
      {/* Row: title + company */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FieldLabel label="Role *">
          <input
            className="cc-input"
            placeholder="e.g. Software Engineer"
            value={values.jobTitle}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label="Company *">
          <input
            className="cc-input"
            placeholder="e.g. Canva"
            value={values.company}
            onChange={(e) => onChange({ company: e.target.value })}
          />
        </FieldLabel>
      </div>

      {/* Row: status + job type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FieldLabel label="Status">
          <Select
            value={values.status}
            onValueChange={(v: ApplicationStatus) => onChange({ status: v })}
          >
            <SelectTrigger className={triggerCls}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
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
            className="cc-input"
            placeholder="e.g. Sydney, NSW"
            value={values.jobLocation}
            onChange={(e) => onChange({ jobLocation: e.target.value })}
          />
        </FieldLabel>
        <FieldLabel label="Salary range">
          <input
            className="cc-input cc-tabular"
            placeholder="e.g. $120k – $160k"
            value={values.salaryRange}
            onChange={(e) => onChange({ salaryRange: e.target.value })}
          />
        </FieldLabel>
      </div>

      {/* Job URL */}
      <FieldLabel label="Job URL">
        <input
          className="cc-input"
          placeholder="https://…"
          value={values.jobUrl}
          onChange={(e) => onChange({ jobUrl: e.target.value })}
        />
      </FieldLabel>

      {/* Linked documents */}
      <div className="pt-4 border-t border-[color:var(--cc-hair-strong)]">
        <div className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-rust)] mb-3">
          <FileText className="w-3.5 h-3.5" />
          § Enclosures
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldLabel label="Résumé used">
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
                    {new Date(cl.created_at).toLocaleDateString()} —{" "}
                    {cl.content.substring(0, 30)}…
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldLabel>
        </div>
      </div>

      {/* Reminder */}
      <FieldLabel label="Follow-up reminder">
        <input
          type="date"
          className="cc-input"
          value={values.reminderDate}
          onChange={(e) => onChange({ reminderDate: e.target.value })}
        />
      </FieldLabel>

      {/* Job description */}
      <FieldLabel label="The brief">
        <Textarea
          placeholder="Paste the job description here…"
          value={values.jobDescription}
          onChange={(e) => onChange({ jobDescription: e.target.value })}
          className="cc-root min-h-[100px] rounded-none border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] cc-font-sans text-[15px] text-[color:var(--cc-ink)] placeholder:italic placeholder:text-[color:var(--cc-ash)] focus-visible:ring-0 focus-visible:border-[color:var(--cc-rust)]"
        />
      </FieldLabel>

      {/* Notes */}
      <FieldLabel label="Marginalia">
        <Textarea
          placeholder="Private notes…"
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="cc-root min-h-[80px] rounded-none border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] cc-font-sans text-[15px] text-[color:var(--cc-ink)] placeholder:italic placeholder:text-[color:var(--cc-ash)] focus-visible:ring-0 focus-visible:border-[color:var(--cc-rust)]"
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
