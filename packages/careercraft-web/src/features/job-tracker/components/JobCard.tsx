import { motion } from "framer-motion";
import {
  Calendar,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { STATUS_META, formatAppliedDate } from "../types";
import type { JobApplication } from "../types";

interface JobCardProps {
  application: JobApplication;
  index: number;
  resumeName: string | null;
  hasCoverLetter: boolean;
  onView: (app: JobApplication) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
}

/** Single editorial "index card" for one job application in the list view. */
export const JobCard = ({
  application,
  index,
  resumeName,
  hasCoverLetter,
  onView,
  onEdit,
  onDelete,
}: JobCardProps) => {
  const meta = STATUS_META[application.status];
  const pillClass =
    meta.pill === "filled"
      ? "cc-pill cc-pill-filled"
      : meta.pill === "rust"
      ? "cc-pill cc-pill-rust"
      : "cc-pill";

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.35 }}
      layout
      className="cc-card cc-card-hover group"
    >
      {/* Folio line */}
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="cc-label text-[color:var(--cc-ash)]">
          Nº&nbsp;{String(index + 1).padStart(3, "0")}
        </div>
        <div className="flex items-center gap-2">
          <span className={`${pillClass} capitalize`}>{meta.label}</span>
          {application.job_type && (
            <span className="cc-pill capitalize">{application.job_type}</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Application actions"
                className="inline-flex h-8 w-8 items-center justify-center border border-transparent text-[color:var(--cc-ink)] hover:border-[color:var(--cc-ink)] transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="cc-root rounded-none border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] p-1 shadow-[4px_4px_0_0_var(--cc-ink)]"
            >
              <DropdownMenuItem
                onSelect={() => onView(application)}
                className="rounded-none cc-font-sans text-sm cursor-pointer px-3 py-2 focus:bg-[color:var(--cc-ink)] focus:text-[color:var(--cc-cream)]"
              >
                <Eye className="w-4 h-4 mr-2" />
                Read the entry
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onEdit(application)}
                className="rounded-none cc-font-sans text-sm cursor-pointer px-3 py-2 focus:bg-[color:var(--cc-ink)] focus:text-[color:var(--cc-cream)]"
              >
                <Edit className="w-4 h-4 mr-2" />
                Amend
              </DropdownMenuItem>
              {application.job_url && (
                <DropdownMenuItem
                  onSelect={() =>
                    window.open(application.job_url as string, "_blank")
                  }
                  className="rounded-none cc-font-sans text-sm cursor-pointer px-3 py-2 focus:bg-[color:var(--cc-ink)] focus:text-[color:var(--cc-cream)]"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open the posting
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-[color:var(--cc-hair-strong)] my-1" />
              <DropdownMenuItem
                onSelect={() => onDelete(application)}
                className="rounded-none cc-font-sans text-sm cursor-pointer px-3 py-2 text-[color:var(--cc-rust-deep)] focus:bg-[color:var(--cc-rust-deep)] focus:text-[color:var(--cc-cream)]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Strike from ledger
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      <button
        onClick={() => onView(application)}
        className="block w-full text-left px-5 py-4"
      >
        <div className="cc-label text-[color:var(--cc-rust)]">
          {meta.kicker}
        </div>
        <h3 className="mt-2 cc-font-display text-2xl md:text-3xl leading-[1.04] tracking-tight text-[color:var(--cc-ink)]">
          {application.company}
        </h3>
        <p className="mt-1 cc-font-editorial italic text-xl text-[color:var(--cc-ink-soft)] line-clamp-1">
          {application.job_title}
        </p>

        {/* Location + salary row */}
        {(application.location || application.salary_range) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
            {application.location && (
              <span className="inline-flex items-center gap-1.5 cc-font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--cc-ink-soft)]">
                <MapPin className="w-3 h-3" />
                {application.location}
              </span>
            )}
            {application.salary_range && (
              <span className="inline-flex items-center gap-1.5 cc-font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--cc-rust)]">
                <span className="cc-tabular">{application.salary_range}</span>
              </span>
            )}
          </div>
        )}

        {/* Linked docs */}
        {(application.resume_id || application.cover_letter_id) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {application.resume_id && resumeName && (
              <span className="cc-pill">
                <FileText className="w-3 h-3" />
                {resumeName}
              </span>
            )}
            {application.cover_letter_id && hasCoverLetter && (
              <span className="cc-pill">
                <Mail className="w-3 h-3" />
                Cover letter attached
              </span>
            )}
          </div>
        )}

        {/* Notes preview */}
        {application.notes && (
          <p className="mt-3 cc-font-editorial text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)] line-clamp-2">
            {application.notes}
          </p>
        )}
      </button>

      {/* Foot caption */}
      <div className="border-t border-[color:var(--cc-hair-strong)] px-5 py-2 flex flex-wrap items-center justify-between gap-3 cc-font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--cc-ash)]">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Filed {formatAppliedDate(application.applied_date)}
        </span>
        {application.reminder_date && (
          <span className="inline-flex items-center gap-1.5 text-[color:var(--cc-rust)]">
            <Clock className="w-3 h-3" />
            Follow-up {formatAppliedDate(application.reminder_date)}
          </span>
        )}
        {application.job_url && (
          <a
            href={application.job_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 hover:text-[color:var(--cc-rust)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View posting
          </a>
        )}
      </div>
    </motion.article>
  );
};
