import { Bell, CalendarDays, Clock, Send } from "lucide-react";
import type { ReactNode } from "react";

import { daysSince, followUpDue } from "../lib/cardBits";
import type { JobApplication } from "../types";

interface UpNextProps {
  applications: JobApplication[];
  onOpen: (app: JobApplication) => void;
  /** Show only the Saved lane's jobs. */
  onShowSaved: () => void;
}

interface Nudge {
  key: string;
  icon: ReactNode;
  text: ReactNode;
  onClick: () => void;
}

/* No reply after this many days is worth a follow-up. */
const QUIET_DAYS = 14;

/**
 * What needs doing, worked out from the board itself: follow-ups that are
 * due, interviews to prepare for, applications that have gone quiet, and
 * saved jobs not sent yet. Every item opens the job it's about.
 */
export const UpNext = ({ applications, onOpen, onShowSaved }: UpNextProps) => {
  const nudges: Nudge[] = [];

  for (const app of applications) {
    if (followUpDue(app)) {
      nudges.push({
        key: `due-${app.id}`,
        icon: <Bell className="cc-nudge__bell h-[18px] w-[18px] text-[color:var(--cc-wheat-deep)]" />,
        text: (
          <>
            Follow up with <strong>{app.company}</strong>
            {daysSince(app.reminder_date as string) > 0 ? " (overdue)" : " today"}
          </>
        ),
        onClick: () => onOpen(app),
      });
    }
  }
  for (const app of applications) {
    if (app.status === "interview") {
      nudges.push({
        key: `prep-${app.id}`,
        icon: <CalendarDays className="h-[18px] w-[18px] text-[color:var(--cc-signal)]" />,
        text: (
          <>
            Prep for your <strong>{app.company}</strong> interview
          </>
        ),
        onClick: () => onOpen(app),
      });
    }
  }
  for (const app of applications) {
    const quiet = daysSince(app.applied_date);
    if (app.status === "applied" && quiet >= QUIET_DAYS && !followUpDue(app)) {
      nudges.push({
        key: `quiet-${app.id}`,
        icon: <Clock className="h-[18px] w-[18px] text-[color:var(--cc-ash)]" />,
        text: (
          <>
            No word from <strong>{app.company}</strong> in {quiet} days. Nudge them?
          </>
        ),
        onClick: () => onOpen(app),
      });
    }
  }
  const saved = applications.filter((a) => a.status === "saved").length;
  if (saved > 0) {
    nudges.push({
      key: "saved",
      icon: <Send className="h-[18px] w-[18px] text-[color:var(--cc-rust)]" />,
      text: (
        <>
          <strong>
            {saved} saved job{saved === 1 ? "" : "s"}
          </strong>{" "}
          not sent yet
        </>
      ),
      onClick: onShowSaved,
    });
  }

  return (
    <section aria-labelledby="upnext-title" className="space-y-2.5">
      <h2 id="upnext-title" className="cc-label-sm text-[color:var(--cc-ash)]">
        Up next
      </h2>
      {nudges.length === 0 ? (
        <p className="cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">All caught up.</p>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          {nudges.slice(0, 6).map((n) => (
            <button key={n.key} type="button" className="cc-nudge" onClick={n.onClick}>
              {n.icon}
              <span>{n.text}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
