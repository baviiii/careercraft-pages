import { motion } from "framer-motion";
import { BarChart3, Edit, Eye, Star } from "lucide-react";

import { formatTemplateName } from "@/lib/templateMap";

import type { Resume } from "../types";
import { formatDate, getCategory } from "../types";
import { ResumeActionsMenu } from "./ResumeActionsMenu";

interface ResumeRowProps {
  resume: Resume;
  index: number;
  onPreview: (r: Resume) => void;
  onEdit: (r: Resume) => void;
  onAnalyze: (r: Resume) => void;
  onDownload: (r: Resume) => void;
  onDuplicate: (r: Resume) => void;
  onManageTags: (r: Resume) => void;
  onToggleFavorite: (r: Resume) => void;
  onDelete: (r: Resume) => void;
}

/** A single horizontal line in the list view — like an index entry. */
export const ResumeRow = ({
  resume,
  index,
  onPreview,
  onEdit,
  onAnalyze,
  onDownload,
  onDuplicate,
  onManageTags,
  onToggleFavorite,
  onDelete,
}: ResumeRowProps) => {
  const category = getCategory(resume.category);
  const score = resume.ats_score;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: Math.min(index * 0.02, 0.15), duration: 0.3 }}
      className="cc-row flex items-center gap-4 px-5 py-4"
    >
      {/* Folio */}
      <div className="cc-label text-[color:var(--cc-ash)] w-14 shrink-0 cc-tabular">
        {String(index + 1).padStart(3, "0")}
      </div>

      {/* Title + subtitle */}
      <button
        onClick={() => onPreview(resume)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="cc-font-display text-xl leading-tight tracking-tight text-[color:var(--cc-ink)] truncate">
            {resume.name || "Untitled draft"}
          </h3>
          {resume.is_favorite && (
            <Star className="w-3.5 h-3.5 text-[color:var(--cc-rust)] fill-[color:var(--cc-rust)]" />
          )}
        </div>
        <p className="cc-font-editorial italic text-base text-[color:var(--cc-ink-soft)] truncate">
          {resume.job_title} · {category.label}
        </p>
      </button>

      {/* Meta pills */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        {resume.template_id && (
          <span className="cc-pill cc-pill-rust">
            {formatTemplateName(resume.template_id)}
          </span>
        )}
        {typeof score === "number" && (
          <span
            className={`cc-pill ${
              score >= 80
                ? "cc-pill-filled"
                : score >= 60
                ? "cc-pill-rust"
                : ""
            }`}
          >
            <span className="cc-tabular">{score}</span>/100
          </span>
        )}
      </div>

      {/* Date */}
      <div className="hidden sm:block cc-font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--cc-ash)] w-24 text-right shrink-0">
        {formatDate(resume.updated_at)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <IconBtn onClick={() => onPreview(resume)} label="Preview">
          <Eye className="w-4 h-4" />
        </IconBtn>
        <IconBtn onClick={() => onEdit(resume)} label="Edit">
          <Edit className="w-4 h-4" />
        </IconBtn>
        <IconBtn onClick={() => onAnalyze(resume)} label="Analyse">
          <BarChart3 className="w-4 h-4" />
        </IconBtn>
        <ResumeActionsMenu
          resume={resume}
          onPreview={onPreview}
          onEdit={onEdit}
          onAnalyze={onAnalyze}
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
    onClick={onClick}
    aria-label={label}
    title={label}
    className="inline-flex h-8 w-8 items-center justify-center border border-transparent text-[color:var(--cc-ink)] hover:border-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)] transition-colors"
  >
    {children}
  </button>
);
