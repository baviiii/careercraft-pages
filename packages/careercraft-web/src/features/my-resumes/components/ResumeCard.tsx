import { motion } from "framer-motion";
import { BarChart3, Edit, Eye, Star } from "lucide-react";

import { formatTemplateName } from "@/lib/templateMap";

import type { Resume } from "../types";
import { formatDate, getCategory } from "../types";
import { ResumeActionsMenu } from "./ResumeActionsMenu";

interface ResumeCardProps {
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

/** Editorial "index card" for a single resume in grid view. */
export const ResumeCard = ({
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
}: ResumeCardProps) => {
  const category = getCategory(resume.category);
  const displayName = resume.content?.contact?.name || "— name pending —";
  const score = resume.ats_score;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.35 }}
      className="cc-card cc-card-hover group flex flex-col"
    >
      {/* Folio line */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="cc-label text-[color:var(--cc-ash)]">
          Nº&nbsp;{String(index + 1).padStart(3, "0")}
        </div>
        <div className="flex items-center gap-2">
          {resume.is_favorite && (
            <Star className="w-4 h-4 text-[color:var(--cc-rust)] fill-[color:var(--cc-rust)]" />
          )}
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
            triggerClassName="opacity-70 group-hover:opacity-100"
          />
        </div>
      </div>

      {/* Mini preview (click → open) */}
      <button
        onClick={() => onPreview(resume)}
        className="mx-5 mt-3 text-left border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] h-36 relative overflow-hidden group/preview"
      >
        <div className="absolute inset-2 bg-white p-2 text-[6px] leading-tight overflow-hidden text-[color:#333]">
          <div className="font-semibold text-[9px] truncate mb-1">
            {displayName}
          </div>
          <div className="text-[#888] truncate mb-1">
            {resume.content?.contact?.email || "email@example.com"}
          </div>
          {resume.content?.summary && (
            <div className="text-[#777] line-clamp-2 mb-1">
              {resume.content.summary.substring(0, 120)}…
            </div>
          )}
          {resume.content?.experience?.[0] && (
            <div className="border-t border-[#eee] pt-1 mt-1">
              <div className="font-semibold text-[7px] truncate">
                {resume.content.experience[0].title}
              </div>
              <div className="text-[#777] truncate">
                {resume.content.experience[0].company}
              </div>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-[color:var(--cc-ink)]/80 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
          <span className="cc-label text-[color:var(--cc-cream)] inline-flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Read the draft
          </span>
        </div>
      </button>

      {/* Body */}
      <div className="px-5 py-4 flex-1">
        <div className="cc-label text-[color:var(--cc-rust)]">
          {category.label}
        </div>
        <h3 className="mt-2 cc-font-display text-2xl leading-[1.04] tracking-tight text-[color:var(--cc-ink)]">
          {resume.name || "Untitled draft"}
        </h3>
        <p className="mt-1 cc-font-editorial italic text-lg text-[color:var(--cc-ink-soft)] line-clamp-1">
          {resume.job_title || displayName}
        </p>

        {/* Meta row: ATS + template + tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {typeof score === "number" ? (
            <span
              className={`cc-pill ${
                score >= 80
                  ? "cc-pill-filled"
                  : score >= 60
                  ? "cc-pill-rust"
                  : ""
              }`}
              title="ATS score"
            >
              <span className="cc-tabular">{score}</span>
              <span>/100 ATS</span>
            </span>
          ) : (
            <span className="cc-pill">Un-measured</span>
          )}
          {resume.template_id && (
            <span className="cc-pill cc-pill-rust">
              {formatTemplateName(resume.template_id)}
            </span>
          )}
        </div>

        {resume.tags && resume.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {resume.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="cc-font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--cc-ink-soft)]"
              >
                ·&nbsp;{t}
              </span>
            ))}
            {resume.tags.length > 3 && (
              <span className="cc-font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--cc-ash)]">
                +{resume.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: quick actions */}
      <div className="mt-auto border-t border-[color:var(--cc-hair-strong)] grid grid-cols-3">
        <QuickBtn onClick={() => onPreview(resume)} icon={Eye} label="Preview" />
        <QuickBtn
          onClick={() => onEdit(resume)}
          icon={Edit}
          label="Edit"
          divider
        />
        <QuickBtn
          onClick={() => onAnalyze(resume)}
          icon={BarChart3}
          label="Analyse"
          divider
        />
      </div>

      {/* Foot caption */}
      <div className="px-5 py-2 border-t border-[color:var(--cc-hair-strong)] flex items-center justify-between cc-font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--cc-ash)]">
        <span>Filed {formatDate(resume.updated_at)}</span>
        <span className="cc-tabular">
          {resume.content?.experience?.length || 0}&nbsp;roles
        </span>
      </div>
    </motion.article>
  );
};

const QuickBtn = ({
  onClick,
  icon: Icon,
  label,
  divider,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  divider?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`h-11 inline-flex items-center justify-center gap-1.5 cc-label hover:bg-[color:var(--cc-ink)] hover:text-[color:var(--cc-cream)] transition-colors ${
      divider ? "border-l border-[color:var(--cc-hair-strong)]" : ""
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);
