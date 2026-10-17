import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { letterLabel } from "@/features/cover-letter/lib/letterLabel";
import { fieldId } from "../lib/formFocus";
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

const TRIGGER =
  "cc-root h-auto w-full rounded-[0.85rem] border border-[color:var(--cc-hair-strong)] bg-white px-4 py-[0.8rem] cc-font-sans text-[15px] text-[color:var(--cc-ink)] hover:border-[color:var(--cc-ink)] focus:border-[color:var(--cc-rust)] focus:ring-0 focus:ring-offset-0";
const CONTENT =
  "cc-root rounded-xl border border-[color:var(--cc-hair)] bg-white text-[color:var(--cc-ink)] shadow-lg";

/** The form behind "Add a job" and the job pop-up's edit view. */
export const JobFormFields = ({
  values,
  onChange,
  resumes,
  coverLetters,
}: JobFormFieldsProps) => (
  <div className="space-y-7 cc-font-sans">
    <Group title="The job">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Role" required>
          <input
            className="cc-field"
            placeholder="e.g. Graduate Data Analyst"
            value={values.jobTitle}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
          />
        </Field>
        <Field label="Company" required>
          <input
            className="cc-field"
            placeholder="e.g. SA Health"
            value={values.company}
            onChange={(e) => onChange({ company: e.target.value })}
          />
        </Field>
        <Field label="Stage">
          <Select value={values.status} onValueChange={(v: ApplicationStatus) => onChange({ status: v })}>
            <SelectTrigger className={TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={CONTENT}>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Work type">
          <Select
            value={values.jobType || "none"}
            onValueChange={(v) => onChange({ jobType: v === "none" ? "" : (v as JobType) })}
          >
            <SelectTrigger className={TRIGGER}>
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent className={CONTENT}>
              <SelectItem value="none">Not set</SelectItem>
              {JOB_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Location">
          <input
            className="cc-field"
            placeholder="e.g. Adelaide SA"
            value={values.jobLocation}
            onChange={(e) => onChange({ jobLocation: e.target.value })}
          />
        </Field>
        <Field label="Pay">
          <input
            className="cc-field cc-tabular"
            placeholder="e.g. $85k – $95k"
            value={values.salaryRange}
            onChange={(e) => onChange({ salaryRange: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Link to the ad">
        <input
          className="cc-field"
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={values.jobUrl}
          onChange={(e) => onChange({ jobUrl: e.target.value })}
        />
      </Field>
    </Group>

    <Group title="What you're sending">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Résumé">
          <Select
            value={values.selectedResumeId || "none"}
            onValueChange={(v) => onChange({ selectedResumeId: v === "none" ? "" : v })}
          >
            <SelectTrigger id={fieldId("resume")} className={TRIGGER}>
              <SelectValue placeholder="None yet" />
            </SelectTrigger>
            <SelectContent className={CONTENT}>
              <SelectItem value="none">None yet</SelectItem>
              {resumes.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Cover letter">
          <Select
            value={values.selectedCoverLetterId || "none"}
            onValueChange={(v) => onChange({ selectedCoverLetterId: v === "none" ? "" : v })}
          >
            <SelectTrigger className={TRIGGER}>
              <SelectValue placeholder="None yet" />
            </SelectTrigger>
            <SelectContent className={CONTENT}>
              <SelectItem value="none">None yet</SelectItem>
              {coverLetters.map((cl) => (
                <SelectItem key={cl.id} value={cl.id}>
                  {letterLabel(cl)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Group>

    <Group title={showInterviewDate(values) ? "Dates and notes" : "Follow-up and notes"}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {showInterviewDate(values) && (
          <Field label="Interview on" hint="Interview Prep plans your practice to the day.">
            <input
              id={fieldId("interview")}
              type="date"
              className="cc-field md:max-w-[240px]"
              value={values.interviewDate}
              onChange={(e) => onChange({ interviewDate: e.target.value })}
            />
          </Field>
        )}
        <Field label="Follow up on" hint="Shows in Up next on the day.">
          <input
            id={fieldId("reminder")}
            type="date"
            className="cc-field md:max-w-[240px]"
            value={values.reminderDate}
            onChange={(e) => onChange({ reminderDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          id={fieldId("notes")}
          placeholder="Who you spoke to, what they asked, anything worth remembering. Only you see these."
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="cc-field cc-field-textarea min-h-[90px]"
        />
      </Field>
    </Group>

    <Group title="Job ad">
      <Field label="The ad's text" hint="Paste the whole ad. The résumé check and cover letter work from it.">
        <textarea
          id={fieldId("ad")}
          placeholder="Paste the job ad here"
          value={values.jobDescription}
          onChange={(e) => onChange({ jobDescription: e.target.value })}
          className="cc-field cc-field-textarea min-h-[120px]"
        />
      </Field>
    </Group>
  </div>
);

/** The interview date matters once there's an interview (or one is already set). */
const showInterviewDate = (values: JobFormValues) => values.status === "interview" || Boolean(values.interviewDate);

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-4">
    <h3 className="border-b border-[color:var(--cc-hair)] pb-2 text-[14px] font-semibold text-[color:var(--cc-ink)]">
      {title}
    </h3>
    {children}
  </section>
);

const Field = ({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[13px] font-medium text-[color:var(--cc-ink-soft)]">
      {label}
      {required && <span className="ml-1 text-[color:var(--cc-ash)]">(needed)</span>}
    </span>
    {children}
    {hint && <span className="mt-1.5 block text-[12.5px] text-[color:var(--cc-ash)]">{hint}</span>}
  </label>
);
