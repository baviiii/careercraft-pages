/**
 * One numbered part of Study that folds shut. The header always shows a
 * one-line summary, so a closed section still says where things stand. What's
 * open is remembered in this browser. Closing only hides the body: a drill
 * half-written inside stays exactly as it was.
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

const KEY = "faircopy.study.sections";

function remembered(id: string, fallback: boolean): boolean {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    return typeof all[id] === "boolean" ? (all[id] as boolean) : fallback;
  } catch {
    return fallback;
  }
}

function remember(id: string, open: boolean): void {
  try {
    const all = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    window.localStorage.setItem(KEY, JSON.stringify({ ...all, [id]: open }));
  } catch {
    /* storage blocked: it opens as the default next time */
  }
}

export function NotebookSection({
  id,
  n,
  title,
  summary,
  defaultOpen = true,
  openSignal,
  tone = "cobalt",
  children,
}: {
  id: string;
  n: string;
  title: string;
  /** The section's colour: its number chip and the strip along an open section. */
  tone?: "wheat" | "cobalt" | "sage" | "slate" | "clay";
  summary?: ReactNode;
  defaultOpen?: boolean;
  /** Changes when something elsewhere needs this section open (e.g. "Practise it"). */
  openSignal?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => remembered(id, defaultOpen));
  const bodyId = useId();

  useEffect(() => {
    if (openSignal) setOpen(true);
  }, [openSignal]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    remember(id, next);
  };

  return (
    <section id={`study-${id}`} className={`st-section st-tone-${tone} scroll-mt-24`} data-open={open}>
      <h3>
        <button type="button" className="st-section__head" aria-expanded={open} aria-controls={bodyId} onClick={toggle}>
          <span className="st-section__n" aria-hidden>
            {n}
          </span>
          <span className="block min-w-0">
            <span className="st-section__title block">{title}</span>
            {summary && <span className="st-section__sum block">{summary}</span>}
          </span>
          <span className="st-section__chev" aria-hidden>
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </h3>
      <div id={bodyId} className="st-section__body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
