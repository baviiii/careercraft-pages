import { motion } from "framer-motion";
import { BarChart3, Edit, Eye, Star } from "lucide-react";

import { formatTemplateName } from "@/lib/templateMap";

import type { Resume } from "../types";
import { editedLabel, getCategory, scoreBand } from "../types";
import { ResumeActionsMenu } from "./ResumeActionsMenu";

interface ResumeCardProps {
  resume: Resume;
  index: number;
  onPreview: (r: Resume) => void;
  onEdit: (r: Resume) => void;
  onAnalyze: (r: Resume) => void;
  onCoverLetter?: (r: Resume) => void;
  onDownload: (r: Resume) => void;
  onDuplicate: (r: Resume) => void;
  onManageTags: (r: Resume) => void;
  onToggleFavorite: (r: Resume) => void;
  onDelete: (r: Resume) => void;
}

/**
 * One résumé in the grid: a glimpse of the page, then what it is (name, the
 * job it's for), how it scored, and the three things people do next.
 */
export const ResumeCard = ({
  resume,
  index,
  onPreview,
  onEdit,
  onAnalyze,
  onCoverLetter,
  onDownload,
  onDuplicate,
  onManageTags,
  onToggleFavorite,
  onDelete,
}: ResumeCardProps) => {
  const category = getCategory(resume.category);
  const person = resume.content?.contact?.name as string | undefined;
  const firstJob = resume.content?.experience?.[0];
  const roles = resume.content?.experience?.length || 0;
  const band = scoreBand(resume.ats_score);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.3 }}
      className="cc-rcard group"
    >
      <div className="flex items-center justify-between px-3.5 pb-2 pt-3">
        <span className="cc-rchip">{category.label}</span>
        <div className="flex items-center">
          <button
            type="button"
            className="cc-rstar grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-[color:var(--cc-cream-2)]"
            aria-pressed={Boolean(resume.is_favorite)}
            aria-label={resume.is_favorite ? "Remove from favourites" : "Add to favourites"}
            title={resume.is_favorite ? "Favourite" : "Add to favourites"}
            onClick={() => onToggleFavorite(resume)}
          >
            <Star
              className={`h-4 w-4 ${
                resume.is_favorite
                  ? "fill-[color:var(--cc-wheat-deep)] text-[color:var(--cc-wheat-deep)]"
                  : "text-[color:var(--cc-ash)]"
              }`}
            />
          </button>
          <ResumeActionsMenu
            resume={resume}
            onPreview={onPreview}
            onEdit={onEdit}
            onAnalyze={onAnalyze}
            onCoverLetter={onCoverLetter}
            onDownload={onDownload}
            onDuplicate={onDuplicate}
            onManageTags={onManageTags}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* A glimpse of the page; opens the preview. */}
      <button
        type="button"
        onClick={() => onPreview(resume)}
        className="cc-rpaper text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cc-rust)]"
        aria-label={`Preview ${resume.name || "this résumé"}`}
      >
        <span className="cc-rpaper__sheet" aria-hidden>
          <span className="mb-0.5 block truncate text-[9.5px] font-semibold text-[#111]">{person || "Your name"}</span>
          <span className="mb-1.5 block truncate text-[#888]">{resume.content?.contact?.email || ""}</span>
          {resume.content?.summary && (
            <span className="mb-1.5 block text-[#666]">{String(resume.content.summary).slice(0, 140)}</span>
          )}
          {firstJob && (
            <span className="block border-t border-[#eee] pt-1">
              <span className="block truncate text-[7.5px] font-semibold text-[#222]">{firstJob.title}</span>
              <span className="block truncate text-[#777]">{firstJob.company}</span>
            </span>
          )}
        </span>
        <span className="cc-rpaper__hint cc-font-sans">
          <Eye className="h-3.5 w-3.5" /> Preview
        </span>
      </button>

      <div className="flex-1 px-4 pb-3 pt-3.5">
        <h3 className="cc-font-display text-[19px] font-semibold leading-snug text-[color:var(--cc-ink)]">
          {resume.name || "Untitled résumé"}
        </h3>
        <p className="mt-0.5 truncate cc-font-sans text-[14px] text-[color:var(--cc-ink-soft)]">
          {resume.job_title || person || "No job title yet"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 cc-font-sans">
          {band ? (
            <span className="cc-rchip" data-tone={band.tone} title="Score from your last ATS check">
              {band.label}
            </span>
          ) : (
            <span className="cc-rchip">Not checked yet</span>
          )}
          {resume.template_id && (
            <span className="cc-rchip cc-rchip--template">{formatTemplateName(resume.template_id)}</span>
          )}
          {(resume.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="cc-rchip">
              {t}
            </span>
          ))}
          {(resume.tags?.length ?? 0) > 3 && <span className="cc-rchip">+{(resume.tags?.length ?? 0) - 3}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[color:var(--cc-hair)] px-3 py-2.5 cc-font-sans">
        <span className="pl-1 text-[12.5px] text-[color:var(--cc-ash)]">
          {editedLabel(resume.updated_at)}
          {roles > 0 ? ` · ${roles} role${roles === 1 ? "" : "s"}` : ""}
        </span>
        <div className="flex items-center gap-0.5">
          <QuickBtn onClick={() => onEdit(resume)} icon={Edit} label="Edit" />
          <QuickBtn onClick={() => onAnalyze(resume)} icon={BarChart3} label="Check" title="Check against a job" />
        </div>
      </div>
    </motion.article>
  );
};

const QuickBtn = ({
  onClick,
  icon: Icon,
  label,
  title,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title ?? label}
    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-[color:var(--cc-ink)] transition-colors hover:bg-[color:var(--cc-cream-2)]"
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
);
