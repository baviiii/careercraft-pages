import { motion } from "framer-motion";
import { BarChart3, Edit, Eye, Star } from "lucide-react";

import { formatTemplateName } from "@/lib/templateMap";

import type { Resume } from "../types";
import { editedLabel, getCategory, scoreBand } from "../types";
import { ResumeActionsMenu } from "./ResumeActionsMenu";

interface ResumeRowProps {
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

/** One résumé as a line in the list view. */
export const ResumeRow = ({
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
}: ResumeRowProps) => {
  const category = getCategory(resume.category);
  const band = scoreBand(resume.ats_score);
  const subtitle = [resume.job_title, category.label].filter(Boolean).join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.15), duration: 0.25 }}
      className="flex items-center gap-3 border-b border-[color:var(--cc-hair)] px-4 py-3 last:border-b-0 cc-font-sans"
    >
      <button
        type="button"
        className="cc-rstar grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-[color:var(--cc-cream-2)]"
        aria-pressed={Boolean(resume.is_favorite)}
        aria-label={resume.is_favorite ? "Remove from favourites" : "Add to favourites"}
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

      <button type="button" onClick={() => onPreview(resume)} className="min-w-0 flex-1 text-left">
        <span className="block truncate cc-font-display text-[16px] font-semibold text-[color:var(--cc-ink)]">
          {resume.name || "Untitled résumé"}
        </span>
        <span className="block truncate text-[13px] text-[color:var(--cc-ink-soft)]">{subtitle}</span>
      </button>

      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        {band && (
          <span className="cc-rchip" data-tone={band.tone}>
            {band.label}
          </span>
        )}
        {resume.template_id && (
          <span className="cc-rchip cc-rchip--template">{formatTemplateName(resume.template_id)}</span>
        )}
      </div>

      <span className="hidden w-32 shrink-0 text-right text-[12.5px] text-[color:var(--cc-ash)] sm:block">
        {editedLabel(resume.updated_at)}
      </span>

      <div className="flex shrink-0 items-center">
        <IconBtn onClick={() => onPreview(resume)} label="Preview">
          <Eye className="h-4 w-4" />
        </IconBtn>
        <IconBtn onClick={() => onEdit(resume)} label="Edit">
          <Edit className="h-4 w-4" />
        </IconBtn>
        <IconBtn onClick={() => onAnalyze(resume)} label="Check against a job">
          <BarChart3 className="h-4 w-4" />
        </IconBtn>
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
    </motion.div>
  );
};

const IconBtn = ({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="grid h-8 w-8 place-items-center rounded-lg text-[color:var(--cc-ink-soft)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)]"
  >
    {children}
  </button>
);
