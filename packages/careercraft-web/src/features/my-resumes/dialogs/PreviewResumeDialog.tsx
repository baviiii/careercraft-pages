import {
  BarChart3,
  Briefcase,
  Download,
  Edit,
  FileText,
  GraduationCap,
  Layout,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatTemplateName, getTemplate, toTemplateData } from "@/lib/templateMap";

import type { Resume } from "../types";
import { formatDate } from "../types";

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

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setMode("template");
      }}
    >
      <DialogContent className="cc-root max-w-[95vw] w-[960px] max-h-[95vh] p-0 gap-0 overflow-hidden rounded-none border-2 border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)]">
        {resume && (
          <>
            {/* Header */}
            <header className="px-6 py-5 border-b border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="cc-label text-[color:var(--cc-rust)]">
                  § Proof sheet
                </div>
                <h2 className="mt-2 cc-font-display text-3xl leading-[1] tracking-tight">
                  {resume.name || "Untitled draft"}
                </h2>
                <p className="mt-1 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                  Last filed {formatDate(resume.updated_at)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {typeof resume.ats_score === "number" && (
                  <div className="text-right">
                    <div className="cc-font-display cc-tabular text-3xl leading-none">
                      {resume.ats_score}
                      <span className="text-lg text-[color:var(--cc-ash)]">
                        /100
                      </span>
                    </div>
                    <div className="cc-label text-[color:var(--cc-ash)]">
                      ATS
                    </div>
                  </div>
                )}
                {resume.template_id && (
                  <span className="cc-pill cc-pill-rust">
                    {formatTemplateName(resume.template_id)}
                  </span>
                )}
              </div>
            </header>

            {/* Mode toggle */}
            <div className="flex items-stretch border-b border-[color:var(--cc-hair-strong)]">
              <ModeTab
                active={mode === "template"}
                onClick={() => setMode("template")}
                icon={Layout}
                label="Template"
              />
              <ModeTab
                active={mode === "text"}
                onClick={() => setMode("text")}
                icon={FileText}
                label="Text"
              />
            </div>

            {/* Preview body */}
            <div className="h-[65vh] overflow-auto bg-[color:var(--cc-cream-2)]">
              {canShowTemplate && Template ? (
                <div className="p-6 flex justify-center" style={{ minWidth: "fit-content" }}>
                  <div
                    className="bg-white shadow-[0_20px_60px_-20px_rgba(14,12,10,0.5)]"
                    style={{ transform: "scale(0.75)", transformOrigin: "top center" }}
                  >
                    <Template data={toTemplateData(resume.content)} isPreview={false} />
                  </div>
                </div>
              ) : (
                <TextView resume={resume} />
              )}
            </div>

            {/* Footer actions */}
            <footer className="px-6 py-4 border-t border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="cc-btn cc-btn-ghost"
                style={{ padding: "0.8rem 1.1rem" }}
              >
                Close
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onAnalyze(resume)}
                  className="cc-btn cc-btn-ghost"
                  style={{ padding: "0.8rem 1.1rem" }}
                >
                  <BarChart3 className="w-4 h-4" />
                  Analyse
                </button>
                <button
                  onClick={() => onEdit(resume)}
                  className="cc-btn cc-btn-ghost"
                  style={{ padding: "0.8rem 1.1rem" }}
                >
                  <Edit className="w-4 h-4" />
                  Edit in builder
                </button>
                {Template && (
                  <button
                    onClick={() => onDownload(resume)}
                    disabled={exporting}
                    className="cc-btn cc-btn-primary"
                    style={{ padding: "0.8rem 1.1rem" }}
                  >
                    {exporting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Exporting…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </button>
                )}
              </div>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ───────────────────────── Text fallback view ───────────────────────── */

const TextView = ({ resume }: { resume: Resume }) => {
  const c = resume.content || {};
  const hasStructured = Boolean(c?.contact?.name || c?.experience?.length);

  return (
    <div className="max-w-[720px] mx-auto p-8 md:p-12 bg-[color:var(--cc-cream)] border border-[color:var(--cc-hair-strong)] my-6">
      {/* Contact */}
      <section className="pb-5 border-b border-[color:var(--cc-ink)]">
        <h1 className="cc-font-display text-4xl leading-none tracking-tight">
          {c?.contact?.name || "Your name"}
        </h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 cc-font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--cc-ink-soft)]">
          {c?.contact?.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              {c.contact.email}
            </span>
          )}
          {c?.contact?.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              {c.contact.phone}
            </span>
          )}
          {c?.contact?.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {c.contact.location}
            </span>
          )}
        </div>
      </section>

      {c?.summary && (
        <SectionBlock icon={Sparkles} label="Summary">
          <p className="cc-font-editorial text-lg leading-relaxed text-[color:var(--cc-ink-soft)]">
            {c.summary}
          </p>
        </SectionBlock>
      )}

      {c?.experience?.length > 0 && (
        <SectionBlock icon={Briefcase} label="Experience">
          <div className="space-y-5">
            {c.experience.map((exp: any, i: number) => (
              <div
                key={i}
                className="border-l-2 border-[color:var(--cc-rust)] pl-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="cc-font-display text-xl leading-tight">
                    {exp.title}
                  </h3>
                  <span className="cc-font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--cc-ash)]">
                    {exp.startDate} — {exp.current ? "Present" : exp.endDate}
                  </span>
                </div>
                <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                  {exp.company}
                  {exp.location ? ` · ${exp.location}` : ""}
                </p>
                {exp.bullets?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.bullets.map((b: string, j: number) => (
                      <li
                        key={j}
                        className="flex gap-2 cc-font-sans text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]"
                      >
                        <span className="text-[color:var(--cc-rust)]">—</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {c?.education?.length > 0 && (
        <SectionBlock icon={GraduationCap} label="Education">
          <div className="space-y-3">
            {c.education.map((edu: any, i: number) => (
              <div
                key={i}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <div>
                  <h3 className="cc-font-display text-lg leading-tight">
                    {edu.degree}
                  </h3>
                  <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                    {edu.school}
                    {edu.location ? ` · ${edu.location}` : ""}
                  </p>
                </div>
                <span className="cc-font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--cc-ash)]">
                  {edu.graduationDate}
                </span>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {c?.skills?.length > 0 && (
        <SectionBlock icon={TrendingUp} label="Skills">
          <div className="flex flex-wrap gap-1.5">
            {c.skills.map((s: string, i: number) => (
              <span key={i} className="cc-pill">
                {s}
              </span>
            ))}
          </div>
        </SectionBlock>
      )}

      {c?.rawText && !hasStructured && (
        <SectionBlock icon={FileText} label="Raw text">
          <pre className="cc-font-mono text-sm leading-relaxed whitespace-pre-wrap text-[color:var(--cc-ink-soft)]">
            {c.rawText}
          </pre>
        </SectionBlock>
      )}

      {!resume.template_id && (
        <div className="mt-8 border-l-4 border-[color:var(--cc-rust)] pl-4 py-2 cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
          This draft has no template assigned. Open it in the builder to choose
          one.
        </div>
      )}
    </div>
  );
};

const SectionBlock = ({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) => (
  <section className="mt-6">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-[color:var(--cc-rust)]" />
      <span className="cc-label text-[color:var(--cc-rust)]">{label}</span>
      <div className="flex-1 h-px bg-[color:var(--cc-hair)]" />
    </div>
    {children}
  </section>
);

const ModeTab = ({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`px-5 py-3 inline-flex items-center gap-2 cc-label border-r border-[color:var(--cc-hair-strong)] transition-colors ${
      active
        ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
        : "text-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)]"
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);
