interface WrapUpDialogProps {
  open: boolean;
  answeredCount: number;
  variant: "wrap" | "quit";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirm leaving the table — either to the debrief or out of the room. */
export function WrapUpDialog({ open, answeredCount, variant, onConfirm, onCancel }: WrapUpDialogProps) {
  if (!open) return null;

  const copy =
    variant === "wrap"
      ? {
          title: "Wrap up now?",
          body:
            answeredCount > 0
              ? `You've answered ${answeredCount} question${answeredCount === 1 ? "" : "s"}. The debrief will cover what's on the record.`
              : "You haven't answered anything yet — there won't be much to debrief.",
          confirm: "Wrap up & debrief",
        }
      : {
          title: "Leave the interview?",
          body: "This session will be abandoned. Answers already submitted stay in your history, but there'll be no debrief.",
          confirm: "Leave the room",
        };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--cc-ink)]/40 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)] p-6"
      >
        <p className="cc-label mb-3 text-[color:var(--cc-rust)]">{copy.title}</p>
        <p className="mb-6 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">{copy.body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="cc-btn cc-btn-ghost flex-1 !py-3">
            Stay
          </button>
          <button onClick={onConfirm} className="cc-btn cc-btn-primary flex-1 !py-3">
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
