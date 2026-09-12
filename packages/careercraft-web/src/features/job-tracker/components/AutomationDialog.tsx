import { useEffect, useState } from "react";

import { CraftButton, CraftDialog } from "@/components/craft/AppPrimitives";

import type { JobAutomationSettings } from "../types";

interface AutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: JobAutomationSettings;
  isBusy: boolean;
  onSave: (next: JobAutomationSettings) => Promise<void> | void;
}

/**
 * Editor for the email automation pipeline — opens from AutomationStrip.
 * Keeps form-state local until "Save" so toggling doesn't trigger writes.
 */
export const AutomationDialog = ({
  open,
  onOpenChange,
  settings,
  isBusy,
  onSave,
}: AutomationDialogProps) => {
  const [draft, setDraft] = useState<JobAutomationSettings>(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  const update = <K extends keyof JobAutomationSettings>(
    key: K,
    value: JobAutomationSettings[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = async () => {
    await onSave(draft);
    onOpenChange(false);
  };

  return (
    <CraftDialog
      open={open}
      onOpenChange={onOpenChange}
      kicker="§ Wire automation"
      title={
        <>
          Tune the <span className="cc-italic-wonk">inbox</span> watcher.
        </>
      }
      description="Decide how aggressively Faircopy should read incoming mail and move applications between stages."
      maxWidth="max-w-xl"
      footer={
        <>
          <CraftButton
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </CraftButton>
          <CraftButton onClick={handleSave} disabled={isBusy}>
            {isBusy ? "Saving…" : "Save settings"}
          </CraftButton>
        </>
      }
    >
      <div className="space-y-6">
        <ToggleRow
          label="Email sync"
          hint="Read job-related mail from your connected inbox and surface them in the tracker timeline."
          checked={draft.email_sync_enabled}
          onChange={(v) => update("email_sync_enabled", v)}
        />

        <div className="border-t border-[color:var(--cc-hair-strong)]" />

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="confidence" className="cc-field-label">
              Confidence threshold
            </label>
            <span className="cc-font-display cc-tabular text-2xl text-[color:var(--cc-ink)]">
              {draft.confidence_threshold}%
            </span>
          </div>
          <input
            id="confidence"
            type="range"
            min={40}
            max={95}
            step={1}
            value={draft.confidence_threshold}
            onChange={(e) =>
              update("confidence_threshold", Number(e.target.value || 72))
            }
            className="w-full mt-3 accent-[color:var(--cc-rust)]"
            disabled={!draft.email_sync_enabled}
          />
          <p className="cc-field-hint mt-2">
            Updates above this score are trusted to auto-apply if the toggle below is on. Lower it
            for an opinionated watcher; raise it for human-in-the-loop confirmation.
          </p>
        </div>

        <div className="border-t border-[color:var(--cc-hair-strong)]" />

        <ToggleRow
          label="Auto-apply non-destructive updates"
          hint="Status moves the watcher is confident about (e.g. interview scheduled) advance the entry without asking. Destructive moves (rejection) always require confirmation."
          checked={draft.auto_apply_non_destructive}
          onChange={(v) => update("auto_apply_non_destructive", v)}
          disabled={!draft.email_sync_enabled}
        />
      </div>
    </CraftDialog>
  );
};

const ToggleRow = ({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <div
    className={`flex items-start justify-between gap-5 ${
      disabled ? "opacity-50 pointer-events-none" : ""
    }`}
  >
    <div className="flex-1">
      <div className="cc-field-label">{label}</div>
      <p className="cc-field-hint mt-1">{hint}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 mt-1 h-7 w-12 border transition-colors"
      style={{
        borderColor: checked ? "var(--cc-signal-deep)" : "var(--cc-hair-strong)",
        background: checked ? "var(--cc-signal)" : "transparent",
      }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 transition-transform"
        style={{
          background: checked ? "var(--cc-cream)" : "var(--cc-ink)",
          transform: checked ? "translateX(24px)" : "translateX(2px)",
        }}
        aria-hidden
      />
    </button>
  </div>
);
