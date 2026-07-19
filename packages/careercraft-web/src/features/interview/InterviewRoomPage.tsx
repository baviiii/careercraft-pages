/**
 * The Interview Room — a focused, full-screen surface for one live session.
 * No sidebar, no tabs: you, the interviewer, and the clock. The hub stages a
 * SessionConfig and navigates here; useInterviewSession drives everything.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useInterviewSession, clearStagedSession } from "./hooks/useInterviewSession";
import { AnswerComposer } from "./components/room/AnswerComposer";
import { Debrief } from "./components/room/Debrief";
import { FeedbackCard } from "./components/room/FeedbackCard";
import { HintPanel } from "./components/room/HintPanel";
import { ProgressRail } from "./components/room/ProgressRail";
import { QuestionStage } from "./components/room/QuestionStage";
import { SessionHeader } from "./components/room/SessionHeader";
import { WrapUpDialog } from "./components/room/WrapUpDialog";

function Overlay({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border border-[color:var(--cc-ink)] border-t-[color:var(--cc-rust)]" />
      <div>
        <p className="cc-label text-[color:var(--cc-ink)]">{label}</p>
        {sub && <p className="mt-2 max-w-md text-sm text-[color:var(--cc-ash)]">{sub}</p>}
      </div>
    </div>
  );
}

export default function InterviewRoomPage() {
  const navigate = useNavigate();
  const session = useInterviewSession();
  const [dialog, setDialog] = useState<null | "wrap" | "quit">(null);
  const [hintDismissed, setHintDismissed] = useState(false);

  const {
    phase,
    config,
    records,
    current,
    questionNumber,
    sessionStartedAt,
    questionStartedAt,
    evaluating,
    awaitingContinue,
    hint,
    hintLoading,
    finalEvaluation,
    totalSeconds,
    error,
  } = session;

  // Nothing staged and nothing to restore — this route has no business rendering.
  useEffect(() => {
    if (phase === "error" && !config) navigate("/interview-prep", { replace: true });
  }, [phase, config, navigate]);

  // New hint arrived → make sure it's visible again.
  useEffect(() => {
    if (hint) setHintDismissed(false);
  }, [hint]);

  const exitToHub = (tab?: string) => {
    clearStagedSession();
    navigate(tab ? `/interview-prep?tab=${tab}` : "/interview-prep");
  };

  const answeredCount = records.filter((r) => r.answerText || r.skipped).length;
  const lastRecord = records[records.length - 1] ?? null;
  const isLastQuestion = config ? questionNumber >= config.questionCount : false;

  return (
    <main className="cc-root cc-font-sans min-h-screen bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] antialiased">
      <div className="cc-grain pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10">
        {(phase === "boot" || phase === "starting") && (
          <Overlay
            label="Preparing your interview"
            sub={
              config
                ? `Researching how ${config.field} actually interviews and drafting your questions.`
                : undefined
            }
          />
        )}

        {phase === "finishing" && (
          <Overlay
            label="Compiling your debrief"
            sub="Scoring any outstanding answers and writing up the committee verdict."
          />
        )}

        {phase === "error" && config && (
          <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
            <div>
              <p className="cc-label mb-3 text-[color:var(--cc-rust)]">The coach stepped out</p>
              <p className="max-w-md text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
                {error ?? "Interview coach is not available at the moment."}
              </p>
            </div>
            <div className="flex gap-3">
              {records.some((r) => r.answerText) && (
                <button onClick={session.retryFinish} className="cc-btn cc-btn-primary">
                  <Loader2 className="h-3.5 w-3.5" />
                  Try the debrief again
                </button>
              )}
              <button onClick={() => exitToHub()} className="cc-btn cc-btn-ghost">
                Back to interview prep
              </button>
            </div>
          </div>
        )}

        {phase === "debrief" && config && finalEvaluation && (
          <Debrief
            config={config}
            records={records}
            evaluation={finalEvaluation}
            totalSeconds={totalSeconds}
            onPracticeWeakAreas={(focusAreas) =>
              session.beginNew({
                ...config,
                focusAreas,
                roundName: "Weak-area drill",
              })
            }
            onResources={() => exitToHub("resources")}
            onExit={() => exitToHub()}
          />
        )}

        {(phase === "active" || phase === "advancing") && config && current && (
          <>
            <SessionHeader
              config={config}
              sessionStartedAt={sessionStartedAt}
              questionNumber={questionNumber}
              canWrapUp={answeredCount > 0}
              onWrapUp={() => setDialog("wrap")}
              onQuit={() => setDialog("quit")}
            />
            <ProgressRail
              records={records}
              totalPlanned={config.questionCount}
              mode={config.mode}
            />

            <div className="mx-auto max-w-[780px] space-y-8 px-5 py-10 md:px-8 md:py-14">
              <QuestionStage
                question={(lastRecord ?? current).question}
                questionNumber={questionNumber}
                advancing={phase === "advancing"}
              />

              {hint && !hintDismissed && phase === "active" && (
                <HintPanel hint={hint} onDismiss={() => setHintDismissed(true)} />
              )}

              {awaitingContinue && lastRecord?.evaluation ? (
                <FeedbackCard
                  evaluation={lastRecord.evaluation}
                  isLast={isLastQuestion}
                  onContinue={session.continueAfterFeedback}
                />
              ) : (
                <AnswerComposer
                  key={questionNumber}
                  questionStartedAt={questionStartedAt}
                  allottedMinutes={current.question.timeAllocationMinutes}
                  disabled={phase !== "active"}
                  evaluating={evaluating}
                  hintLoading={hintLoading}
                  onSubmit={(text) => void session.submit(text)}
                  onSkip={session.skip}
                  onHint={(draft) => void session.requestHint(draft)}
                />
              )}

              {config.mode === "realistic" && phase === "active" && !awaitingContinue && (
                <p className="cc-label-sm text-center text-[color:var(--cc-ash)]">
                  Feedback stays sealed until the debrief — like the real thing.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <WrapUpDialog
        open={dialog !== null}
        answeredCount={answeredCount}
        variant={dialog ?? "wrap"}
        onConfirm={() => {
          if (dialog === "wrap") {
            setDialog(null);
            session.wrapUp();
          } else {
            setDialog(null);
            exitToHub();
          }
        }}
        onCancel={() => setDialog(null)}
      />
    </main>
  );
}
