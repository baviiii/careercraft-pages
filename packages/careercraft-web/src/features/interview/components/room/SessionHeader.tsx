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
          {/* With one question, the answer sheet's own clock says it all. */}
          {config.questionCount > 1 && (
            <>
              <div className="hidden text-[13px] text-[color:var(--cc-ink-soft)] sm:block">
                Question {questionNumber} of {config.questionCount}
              </div>
              <div
                className="text-[13px] font-semibold tabular-nums text-[color:var(--cc-ink)]"
                title="Time in this interview"
              >
                {formatClock(elapsed).replace(/^0(?=\d:)/, "")}
              </div>
            </>
          )}
          {canWrapUp && (
            <button
              type="button"
              onClick={onWrapUp}
              className="cc-action cc-action--ghost cc-action--sm hidden md:inline-flex"
            >
              <Flag className="h-3.5 w-3.5" />
              Wrap up
            </button>
          )}
          <button
            type="button"
            onClick={onQuit}
            aria-label="Leave the interview"
            title="Leave the interview"
            className="rounded-full p-2 text-[color:var(--cc-ash)] transition-colors hover:bg-[color:var(--cc-cream-2)] hover:text-[color:var(--cc-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
