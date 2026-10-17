import { Flag, X } from "lucide-react";
import { formatClock, useElapsedSeconds } from "../../lib/format";
import { parseRoundType, roundMeta } from "../../lib/roundTypes";
import type { SessionConfig } from "../../types";
import { RoundTag } from "../RoundMarks";

interface SessionHeaderProps {
  config: SessionConfig;
  sessionStartedAt: number;
  questionNumber: number;
  canWrapUp: boolean;
  onWrapUp: () => void;
  onQuit: () => void;
}

export function SessionHeader({
  config,
  sessionStartedAt,
  questionNumber,
  canWrapUp,
  onWrapUp,
  onQuit,
}: SessionHeaderProps) {
  const elapsed = useElapsedSeconds(sessionStartedAt);
  const type = parseRoundType(config.roundType);
  // The tag already names the type; only say more when the round has its own
  // name (a plan round, a quick drill, a weak-area drill).
  const extra = config.roundName && config.roundName !== roundMeta(type).label ? config.roundName : null;

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between px-5 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <RoundTag type={type} className="shrink-0" />
          <span className="hidden truncate text-sm text-[color:var(--cc-ink-soft)] sm:block">
            {extra ? `${extra} · ` : ""}
            {config.field}
            {config.seniority ? ` · ${config.seniority}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="cc-label-sm hidden text-[color:var(--cc-ash)] sm:block">
            Q {String(questionNumber).padStart(2, "0")} / {String(config.questionCount).padStart(2, "0")}
          </div>
          <div className="cc-font-mono text-sm tabular-nums text-[color:var(--cc-ink)]">
            {formatClock(elapsed)}
          </div>
          {canWrapUp && (
            <button
              onClick={onWrapUp}
              className="cc-label-sm hidden items-center gap-1.5 border border-[color:var(--cc-hair-strong)] px-3 py-2 text-[color:var(--cc-ink-soft)] transition-colors hover:border-[color:var(--cc-ink)] hover:text-[color:var(--cc-ink)] md:inline-flex"
            >
              <Flag className="h-3 w-3" />
              Wrap up
            </button>
          )}
          <button
            onClick={onQuit}
            aria-label="Leave the interview"
            className="border border-transparent p-2 text-[color:var(--cc-ash)] transition-colors hover:border-[color:var(--cc-hair-strong)] hover:text-[color:var(--cc-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
