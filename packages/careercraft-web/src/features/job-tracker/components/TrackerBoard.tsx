import { LayoutGroup, MotionConfig } from "framer-motion";
import { useState } from "react";

import { STAGE_EMPTY } from "../lib/cardBits";
import { STATUS_META } from "../types";
import type { ApplicationStatus, JobApplication } from "../types";
import { JobCard } from "./JobCard";

interface TrackerBoardProps {
  lanes: { status: ApplicationStatus; items: JobApplication[] }[];
  getResumeName: (resumeId: string | null) => string | null;
  onView: (app: JobApplication) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onMove: (id: string, status: ApplicationStatus) => void;
}

/**
 * The five lanes. Each is a drop target that glows in its stage's colour
 * while a card hovers over it. Cards share one LayoutGroup so a card that
 * changes stage glides to its new lane (still under reduce motion).
 */
export const TrackerBoard = ({ lanes, getResumeName, onView, onEdit, onDelete, onMove }: TrackerBoardProps) => {
  const [dropLane, setDropLane] = useState<ApplicationStatus | null>(null);

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        {/* Five lanes fit side by side on a wide screen and scroll sideways
            on a narrow one; the page itself never does. */}
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="grid min-w-full grid-flow-col auto-cols-[minmax(232px,1fr)] gap-3.5 p-1">
            {lanes.map((lane) => (
              <section
                key={lane.status}
                data-stage={lane.status}
                aria-label={STATUS_META[lane.status].label}
                className={`cc-lane ${dropLane === lane.status ? "is-target" : ""}`}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes("text/plain")) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dropLane !== lane.status) setDropLane(lane.status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropLane(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDropLane(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) onMove(id, lane.status);
                }}
              >
                <header className="flex items-center gap-2 px-3.5 pb-2 pt-3.5">
                  <span className="cc-lane__dot" aria-hidden />
                  <h3 className="cc-font-display text-[15px] font-semibold text-[color:var(--cc-ink)]">
                    {STATUS_META[lane.status].label}
                  </h3>
                  <span className="ml-auto cc-tabular cc-font-sans text-xs text-[color:var(--cc-ash)]">
                    {lane.items.length}
                  </span>
                </header>
                <div className="flex-1 space-y-3 px-2.5 pb-3.5 pt-1.5">
                  {lane.items.length === 0 ? (
                    <p className="px-1.5 cc-font-sans text-[13px] leading-snug text-[color:var(--cc-ash)]">
                      {STAGE_EMPTY[lane.status]}
                    </p>
                  ) : (
                    lane.items.map((app) => (
                      <JobCard
                        key={app.id}
                        application={app}
                        resumeName={getResumeName(app.resume_id)}
                        hasCoverLetter={Boolean(app.cover_letter_id)}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onStatusChange={onMove}
                      />
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
};
