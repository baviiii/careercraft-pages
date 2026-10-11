import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightCircle,
  Bell,
  Edit,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { NEXT_STEP, avatarTone, followUpDue, followUpLabel, initials, whenLine } from "../lib/cardBits";
import { STATUS_META, STATUS_ORDER } from "../types";
import type { ApplicationStatus, JobApplication } from "../types";

interface JobCardProps {
  application: JobApplication;
  resumeName: string | null;
  hasCoverLetter: boolean;
  onView: (app: JobApplication) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onStatusChange?: (id: string, status: ApplicationStatus) => void;
}

/* The stub is only a card tall, so the long stage name gets a short one. */
const STUB_LABEL: Partial<Record<ApplicationStatus, string>> = { rejected: "Closed" };

const MENU_ITEM =
  "cc-font-sans text-sm cursor-pointer px-3 py-2 rounded-md focus:bg-[color:var(--cc-cream-2)] focus:text-[color:var(--cc-ink)]";

/**
 * A job as a ticket: a stub in its stage's colour, then who and what, then
 * the one obvious next step. Pressing it stamps the ticket (SENT, INTERVIEW,
 * OFFER) and the card glides to its new lane; layoutId does the travelling.
 */
export const JobCard = ({
  application,
  resumeName,
  hasCoverLetter,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: JobCardProps) => {
  const reduce = useReducedMotion();
  const [stamp, setStamp] = useState<string | null>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const status = application.status;
  const next = NEXT_STEP[status];
  const tone = avatarTone(application.company);
  const followUp = followUpLabel(application);
  const due = followUpDue(application);
  const closed = status === "rejected";

  const advance = () => {
    if (!next || !onStatusChange || stamp) return;
    if (!next.stamp) {
      onStatusChange(application.id, next.to);
      return;
    }
    // Show the stamp, then move. Under reduce motion it's a short still flash.
    setStamp(next.stamp);
    timer.current = window.setTimeout(
      () => onStatusChange(application.id, next.to),
      reduce ? 300 : 500,
    );
  };

  /* Native drag and drop lives on a plain inner element: framer-motion claims
     onDragStart/onDragEnd on motion components for its own gesture. */
  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", application.id);
    e.dataTransfer.effectAllowed = "move";
    const card = (e.currentTarget.closest(".cc-ticket") as HTMLElement) ?? e.currentTarget;
    // A slightly tilted copy as the drag image, like picking up a ticket.
    if (!reduce) {
      const ghost = card.cloneNode(true) as HTMLElement;
      ghost.style.cssText = `position:fixed;top:-1000px;left:-1000px;width:${card.offsetWidth}px;rotate:3deg;`;
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 30, 24);
      window.setTimeout(() => ghost.remove(), 0);
    }
    window.setTimeout(() => card.classList.add("is-dragging"), 0);
  };

  return (
    <motion.article
      layoutId={application.id}
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      data-stage={status}
      data-card-id={application.id}
      className={`cc-ticket ${closed ? "is-closed" : ""}`}
    >
      <div
        className="flex min-w-0 flex-1"
        draggable={Boolean(onStatusChange)}
        onDragStart={onDragStart}
        onDragEnd={(e) => e.currentTarget.closest(".cc-ticket")?.classList.remove("is-dragging")}
      >
      <div className="cc-ticket__stub" aria-hidden>
        <span>{STUB_LABEL[status] ?? STATUS_META[status].label}</span>
      </div>

      <div className="min-w-0 flex-1 px-3.5 pb-3 pt-3.5 space-y-2.5">
        {/* The title gets the card's full width; the company's initials sit
            beside its name, like a logo. */}
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            onClick={() => onView(application)}
            title={application.job_title}
            className="min-w-0 flex-1 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cc-rust)]"
          >
            <span className="line-clamp-3 cc-font-display text-[15.5px] font-semibold leading-tight text-[color:var(--cc-ink)]">
              {application.job_title}
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 cc-font-sans text-[13px] text-[color:var(--cc-ink-soft)]">
              <span
                aria-hidden
                className="grid h-5 w-5 flex-none place-items-center rounded-md cc-font-display text-[9.5px] font-bold"
                style={{ background: tone.bg, color: tone.fg }}
              >
                {initials(application.company)}
              </span>
              <span className="min-w-0 truncate">
                {application.company}
                {application.location ? ` · ${application.location}` : ""}
              </span>
            </span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`More for ${application.job_title}`}
                className="-mr-1.5 -mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg text-[color:var(--cc-ash)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="cc-root w-56 rounded-xl border border-[color:var(--cc-hair)] bg-white p-1.5 text-[color:var(--cc-ink)] shadow-lg"
            >
              <DropdownMenuItem onSelect={() => onView(application)} className={MENU_ITEM}>
                <Eye className="mr-2 h-4 w-4" /> Open
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(application)} className={MENU_ITEM}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {application.job_url && (
                <DropdownMenuItem
                  onSelect={() => window.open(application.job_url as string, "_blank", "noopener")}
                  className={MENU_ITEM}
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> Open job ad
                </DropdownMenuItem>
              )}
              {onStatusChange && (
                <>
                  <DropdownMenuSeparator className="my-1 bg-[color:var(--cc-hair)]" />
                  <DropdownMenuLabel className="px-3 py-1 cc-label-sm text-[color:var(--cc-ash)]">
                    Move to
                  </DropdownMenuLabel>
                  {STATUS_ORDER.filter((s) => s !== status && s !== "rejected").map((s) => (
                    <DropdownMenuItem key={s} onSelect={() => onStatusChange(application.id, s)} className={MENU_ITEM}>
                      <ArrowRightCircle className="mr-2 h-4 w-4 text-[color:var(--cc-ash)]" />
                      {STATUS_META[s].label}
                    </DropdownMenuItem>
                  ))}
                  {!closed && (
                    <DropdownMenuItem onSelect={() => onStatusChange(application.id, "rejected")} className={MENU_ITEM}>
                      <XCircle className="mr-2 h-4 w-4 text-[color:var(--cc-ash)]" />
                      Didn't work out
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator className="my-1 bg-[color:var(--cc-hair)]" />
              <DropdownMenuItem
                onSelect={() => onDelete(application)}
                className={`${MENU_ITEM} text-[#9C3424] focus:text-[#9C3424]`}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(resumeName || hasCoverLetter || followUp) && (
          <div className="flex flex-wrap gap-1.5">
            {resumeName && <span className="cc-ticket__chip">✓ Résumé</span>}
            {hasCoverLetter && <span className="cc-ticket__chip">✓ Letter</span>}
            {followUp && !closed && (
              <span className={`cc-ticket__chip ${due ? "cc-ticket__chip--due" : ""}`}>
                {due && <Bell className="h-3 w-3" />}
                {followUp}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <span className="whitespace-nowrap cc-font-sans text-[12.5px] text-[color:var(--cc-ash)]">{whenLine(application)}</span>
          {next && onStatusChange && (
            <button type="button" className="cc-ticket__next" onClick={advance} disabled={Boolean(stamp)}>
              {next.label}
              {next.stamp ? " →" : ""}
            </button>
          )}
        </div>
      </div>
      </div>

      {status === "offer" && <span className="cc-ticket__offer" aria-hidden>OFFER!</span>}
      {stamp && (
        <span className="cc-stamp" role="status">
          {stamp}
        </span>
      )}
    </motion.article>
  );
};
