import { motion } from "framer-motion";
import {
  ArrowRightCircle,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  MapPin,
  MoreVertical,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  STATUS_ACCENT,
  STATUS_META,
  STATUS_ORDER,
  formatAppliedDate,
} from "../types";
import type { ApplicationStatus, JobApplication } from "../types";

interface JobCardProps {
  application: JobApplication;
  index: number;
  resumeName: string | null;
  hasCoverLetter: boolean;
  onView: (app: JobApplication) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onStatusChange?: (id: string, status: ApplicationStatus) => void;
}

/**
 * Dossier-style card. The left edge band is coloured by status so a Kanban
 * lane reads as a single ribbon of colour; the body stays cream + ink.
 */
export const JobCard = ({
  application,
  index,
  resumeName,
  hasCoverLetter,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: JobCardProps) => {
  const meta = STATUS_META[application.status];
  const accent = STATUS_ACCENT[application.status];
  const folio = `№ ${String(index + 1).padStart(3, "0")}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.35 }}
      layout
      className="cc-surface cc-lift group relative overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent.edge }}
      />

      {/* Folio + glyph + status pill — runs along a quiet sublabel rail */}
      <div className="flex items-center justify-between pl-5 pr-2 pt-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="cc-font-display italic text-base leading-none w-6 h-6 grid place-items-center flex-shrink-0"
            style={{
              color: accent.deep,
              fontVariationSettings: "'SOFT' 100, 'WONK' 1",
            }}
            aria-hidden
          >
            {accent.mark}
          </span>
          <span className="cc-font-sans text-xs text-[color:var(--cc-ash)] cc-tabular">
            {folio}
          </span>
          <span className="cc-font-sans text-xs text-[color:var(--cc-ash)]">·</span>
          <span
            className="cc-font-sans text-xs font-semibold"
            style={{ color: accent.deep }}
          >
            {meta.label}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Application actions"
              className="inline-flex h-8 w-8 items-center justify-center text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="cc-root w-60 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] p-1 shadow-lg"
          >
            <DropdownMenuItem
              onSelect={() => onView(application)}
              className="cc-font-sans text-sm cursor-pointer px-3 py-2 focus:bg-[color:var(--cc-ink)] focus:text-[color:var(--cc-cream)]"
            >
              <Eye className="w-4 h-4 mr-2" />
              Read the entry
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onEdit(application)}
              className="cc-font-sans text-sm cursor-pointer px-3 py-2 focus:bg-[color:var(--cc-ink)] focus:text-[color:var(--cc-cream)]"
            >
              <Edit className="w-4 h-4 mr-2" />
              Amend
            </DropdownMenuItem>
            {application.job_url && (
              <DropdownMenuItem
                onSelect={() =>
                  window.open(application.job_url as string, "_blank")
                }
                className="cc-font-sans text-sm cursor-pointer px-3 py-2 focus:bg-[color:var(--cc-ink)] focus:text-[color:var(--cc-cream)]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open the posting
              </DropdownMenuItem>
            )}

            {onStatusChange && (
              <>
                <DropdownMenuSeparator className="bg-[color:var(--cc-hair-strong)] my-1" />
                <DropdownMenuLabel className="px-3 py-1.5 cc-label-sm text-[color:var(--cc-ash)] uppercase">
                  Move to
                </DropdownMenuLabel>
                {STATUS_ORDER.filter((s) => s !== application.status).map((s) => {
                  const sAccent = STATUS_ACCENT[s];
                  return (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => onStatusChange(application.id, s)}
                      className="cc-font-sans text-sm cursor-pointer px-3 py-2 focus:bg-[color:var(--cc-ink)] focus:text-[color:var(--cc-cream)]"
                    >
                      <ArrowRightCircle
                        className="w-4 h-4 mr-2"
                        style={{ color: sAccent.deep }}
                      />
                      <span style={{ color: "inherit" }}>{STATUS_META[s].label}</span>
                      <span
                        className="ml-auto cc-font-display italic text-sm"
                        style={{
                          color: sAccent.deep,
                          fontVariationSettings: "'SOFT' 100, 'WONK' 1",
                        }}
                        aria-hidden
                      >
                        {sAccent.mark}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
            <DropdownMenuSeparator className="bg-[color:var(--cc-hair-strong)] my-1" />
            <DropdownMenuItem
              onSelect={() => onDelete(application)}
              className="cc-font-sans text-sm cursor-pointer px-3 py-2 text-[color:var(--cc-rust-deep)] focus:bg-[color:var(--cc-rust-deep)] focus:text-[color:var(--cc-cream)]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Strike from ledger
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Body — clickable surface */}
      <button
        onClick={() => onView(application)}
        className="block w-full text-left pl-5 pr-5 pt-2 pb-4"
      >
        <h3
          className="cc-font-sans font-semibold text-xl md:text-2xl leading-tight text-[color:var(--cc-ink)]"
        >
          {application.company}
        </h3>
        <p className="mt-1.5 cc-font-sans text-base leading-snug text-[color:var(--cc-ink-soft)] line-clamp-2">
          {application.job_title}
        </p>

        {/* meta row */}
        {(application.location || application.salary_range || application.job_type) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 cc-font-sans text-xs text-[color:var(--cc-ink-soft)]">
            {application.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                {application.location}
              </span>
            )}
            {application.salary_range && (
              <span className="cc-tabular" style={{ color: accent.deep }}>
                {application.salary_range}
              </span>
            )}
            {application.job_type && (
              <span className="cc-tabular">{application.job_type}</span>
            )}
          </div>
        )}

        {/* notes */}
        {application.notes && (
          <p className="mt-3 cc-font-editorial text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)] line-clamp-2">
            {application.notes}
          </p>
        )}

        {/* attachments */}
        {(application.resume_id || application.cover_letter_id) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {application.resume_id && resumeName && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 border cc-font-sans text-[11px]"
                style={{ borderColor: "var(--cc-hair-strong)", color: "var(--cc-ink-soft)" }}
              >
                <FileText className="w-3 h-3" />
                {resumeName}
              </span>
            )}
            {application.cover_letter_id && hasCoverLetter && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 border cc-font-sans text-[11px]"
                style={{ borderColor: "var(--cc-hair-strong)", color: "var(--cc-ink-soft)" }}
              >
                <Mail className="w-3 h-3" />
                Cover letter
              </span>
            )}
          </div>
        )}

        {/* fit-score hint when available */}
        {typeof application.fit_score_latest === "number" && (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="cc-label-sm text-[color:var(--cc-ash)]">Fit</span>
            <div className="flex-1 max-w-[120px] cc-score">
              <span
                className="cc-score-fill"
                style={{
                  width: `${Math.min(100, Math.max(0, application.fit_score_latest))}%`,
                  background:
                    (application.fit_score_latest ?? 0) >= 75
                      ? "var(--cc-signal)"
                      : (application.fit_score_latest ?? 0) >= 50
                        ? "var(--cc-wheat)"
                        : "var(--cc-rust)",
                }}
              />
            </div>
            <span className="cc-font-display cc-tabular text-sm text-[color:var(--cc-ink)]">
              {application.fit_score_latest}%
            </span>
          </div>
        )}
      </button>

      {/* Foot caption — quiet, mono, only essentials */}
      <div className="pl-5 pr-5 py-2.5 border-t border-[color:var(--cc-hair)] space-y-2">
        <div className="flex items-center justify-between text-[color:var(--cc-ash)]">
          <span className="inline-flex items-center gap-1.5 cc-font-sans text-xs">
          <Calendar className="w-3 h-3" />
          {formatAppliedDate(application.applied_date)}
        </span>
        {application.reminder_date ? (
          <span
            className="inline-flex items-center gap-1.5 cc-font-sans text-xs"
            style={{ color: accent.deep }}
          >
            <Clock className="w-3 h-3" />
            Follow-up {formatAppliedDate(application.reminder_date)}
          </span>
        ) : (
          <span className="cc-font-sans text-xs text-[color:var(--cc-ash)]">
            no follow-up set
          </span>
        )}
        </div>
        <button
          type="button"
          onClick={() => onView(application)}
          className="inline-flex items-center gap-1.5 cc-font-sans text-sm font-medium text-[color:var(--cc-ink)] hover:text-[color:var(--cc-rust-deep)] transition-colors"
        >
          View details
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.article>
  );
};
