import { BarChart3, Download, Edit, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";

import { CraftButton } from "@/components/craft/AppPrimitives";
import { CraftSpinner } from "@/components/craft/CraftSpinner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatTemplateName, getTemplate, toTemplateData } from "@/lib/templateMap";

import type { Resume } from "../types";
import { editedLabel, scoreBand } from "../types";

interface PreviewResumeDialogProps {
  resume: Resume | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exporting?: boolean;
  onEdit: (r: Resume) => void;
  onAnalyze: (r: Resume) => void;
  onDownload: (r: Resume) => void;
}

type PreviewMode = "template" | "text";

/** The résumé as it will look, or as plain text, with what to do next. */
export const PreviewResumeDialog = ({
  resume,
  open,
  onOpenChange,
  exporting,
  onEdit,
  onAnalyze,
  onDownload,
}: PreviewResumeDialogProps) => {
  const [mode, setMode] = useState<PreviewMode>("template");
  const Template = resume ? getTemplate(resume.template_id) : null;
  const canShowTemplate = Boolean(Template) && mode === "template";
  const band = scoreBand(resume?.ats_score);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setMode("template");
      }}
    >
      <DialogContent className="cc-root flex max-h-[95vh] w-[960px] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl border border-[color:var(--cc-hair)] bg-white p-0 text-[color:var(--cc-ink)] shadow-[0_20px_60px_-20px_rgba(14,12,10,0.35)]">
        {resume && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--cc-hair)] px-6 py-5 pr-14">
              <div className="min-w-0">
                <DialogTitle className="cc-font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                  {resume.name || "Untitled résumé"}
                </DialogTitle>
                <DialogDescription className="mt-1 cc-font-sans text-[14px] text-[color:var(--cc-ink-soft)]">
                  {[resume.job_title, editedLabel(resume.updated_at)].filter(Boolean).join(" · ")}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 cc-font-sans text-[12.5px]">
                {band && (
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold ${
                      band.tone === "good"
                        ? "bg-[rgba(63,122,92,0.13)] text-[color:var(--cc-signal-deep)]"
                        : band.tone === "fair"
                          ? "bg-[color:var(--cc-wheat-soft)] text-[color:var(--cc-wheat-deep)]"
                          : "bg-[rgba(194,65,45,0.1)] text-[#9C3424]"
                    }`}
                  >
                    {band.label}
                  </span>
                )}
                {resume.template_id && (
                  <span className="rounded-full bg-[rgba(42,82,204,0.09)] px-2.5 py-1 text-[color:var(--cc-rust-deep)]">
                    {formatTemplateName(resume.template_id)}
                  </span>
                )}
              </div>
            </header>

            <div className="flex items-center gap-1 border-b border-[color:var(--cc-hair)] px-6 py-2.5 cc-font-sans" role="group" aria-label="Show as">
              {(["template", "text"] as PreviewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1 text-[13px] transition-colors ${
                    mode === m
                      ? "bg-[color:var(--cc-cream-2)] font-semibold text-[color:var(--cc-ink)]"
                      : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                  }`}
                >
                  {m === "template" ? "As designed" : "Plain text"}
                </button>
              ))}
            </div>

            <div className="h-[62vh] overflow-auto bg-[color:var(--cc-cream-2)]">
              {canShowTemplate && Template ? (
                <div className="flex justify-center p-6" style={{ minWidth: "fit-content" }}>
                  <div
                    className="resume-paper bg-white shadow-[0_20px_60px_-20px_rgba(14,12,10,0.4)]"
                    style={{ width: 794, transform: "scale(0.75)", transformOrigin: "top center" }}
                  >
                    <Template data={toTemplateData(resume.content)} />
                  </div>
                </div>
              ) : (
                <TextView resume={resume} />
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <CraftButton variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </CraftButton>
              <div className="flex flex-wrap items-center gap-2">
                <CraftButton variant="ghost" onClick={() => onAnalyze(resume)}>
                  <BarChart3 className="h-4 w-4" />
                  Check against a job
                </CraftButton>
                <CraftButton variant="ghost" onClick={() => onEdit(resume)}>
                  <Edit className="h-4 w-4" />
                  Edit
                </CraftButton>
                {Template && (
                  <CraftButton onClick={() => onDownload(resume)} disabled={exporting}>
                    {exporting ? (
                      <>
                        <CraftSpinner size="sm" label="Making your PDF" />
                        Making PDF…
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </CraftButton>
                )}
              </div>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ───────────────────────── Plain-text view ───────────────────────── */

const TextView = ({ resume }: { resume: Resume }) => {
  const c = resume.content || {};
  const hasStructured = Boolean(c?.contact?.name || c?.experience?.length);

  return (
    <div className="mx-auto my-6 max-w-[720px] rounded-xl bg-white p-8 cc-font-sans shadow-[0_10px_30px_-20px_rgba(14,12,10,0.35)] md:p-10">
      <section className="border-b border-[color:var(--cc-hair)] pb-5">
        <h1 className="cc-font-display text-3xl font-semibold leading-tight tracking-tight">
          {c?.contact?.name || "Your name"}
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[color:var(--cc-ink-soft)]">
          {c?.contact?.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {c.contact.email}
            </span>
          )}
          {c?.contact?.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {c.contact.phone}
            </span>
          )}
          {c?.contact?.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {c.contact.location}
            </span>
          )}
        </div>
      </section>

      {c?.summary && (
        <SectionBlock label="Summary">
          <p className="text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">{c.summary}</p>
        </SectionBlock>
      )}

      {c?.experience?.length > 0 && (
        <SectionBlock label="Experience">
          <div className="space-y-5">
            {c.experience.map((exp: any, i: number) => (
              <div key={i}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="cc-font-display text-[17px] font-semibold leading-tight">{exp.title}</h3>
                  <span className="text-[12.5px] text-[color:var(--cc-ash)]">
                    {exp.startDate} – {exp.current ? "now" : exp.endDate}
                  </span>
                </div>
                <p className="text-[14px] text-[color:var(--cc-ink-soft)]">
                  {exp.company}
                  {exp.location ? ` · ${exp.location}` : ""}
                </p>
                {exp.bullets?.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[14.5px] leading-relaxed text-[color:var(--cc-ink-soft)] marker:text-[color:var(--cc-ash)]">
                    {exp.bullets.map((b: string, j: number) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {c?.education?.length > 0 && (
        <SectionBlock label="Education">
          <div className="space-y-3">
            {c.education.map((edu: any, i: number) => (
              <div key={i} className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h3 className="cc-font-display text-[16px] font-semibold leading-tight">{edu.degree}</h3>
                  <p className="text-[14px] text-[color:var(--cc-ink-soft)]">
                    {edu.school}
                    {edu.location ? ` · ${edu.location}` : ""}
                  </p>
                </div>
                <span className="text-[12.5px] text-[color:var(--cc-ash)]">{edu.graduationDate}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {c?.skills?.length > 0 && (
        <SectionBlock label="Skills">
          <div className="flex flex-wrap gap-1.5">
            {c.skills.map((s: string, i: number) => (
              <span key={i} className="rounded-full bg-[color:var(--cc-cream-2)] px-2.5 py-1 text-[13px] text-[color:var(--cc-ink-soft)]">
                {s}
              </span>
            ))}
          </div>
        </SectionBlock>
      )}

      {c?.rawText && !hasStructured && (
        <SectionBlock label="Text">
          <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-[color:var(--cc-ink-soft)]">{c.rawText}</pre>
        </SectionBlock>
      )}

      {!resume.template_id && (
        <p className="mt-8 rounded-xl bg-[color:var(--cc-cream-2)] px-4 py-3 text-[14px] text-[color:var(--cc-ink-soft)]">
          This one has no design picked yet. Open it in the builder to choose one.
        </p>
      )}
    </div>
  );
};

const SectionBlock = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="mt-6">
    <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[color:var(--cc-rust)]">{label}</h2>
    {children}
  </section>
);
