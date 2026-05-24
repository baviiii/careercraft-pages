import { Settings2 } from "lucide-react";

import type { JobAutomationSettings } from "../types";

interface AutomationStripProps {
  settings: JobAutomationSettings;
  onConfigure: () => void;
}

/**
 * One-line summary of the email automation state. Replaces the full
 * checkbox block on the page — the editor lives in AutomationDialog now.
 */
export const AutomationStrip = ({ settings, onConfigure }: AutomationStripProps) => {
  const syncOn = settings.email_sync_enabled;
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-4 py-4 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Settings2 className="w-4 h-4 text-[color:var(--cc-ash)] flex-shrink-0" />
        <span className="cc-font-sans text-sm font-semibold text-[color:var(--cc-ink)] whitespace-nowrap">
          Automation settings
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 flex-1 cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
        <span className="inline-flex items-center gap-2">
          <span
            className="cc-dot"
            style={{ color: syncOn ? "var(--cc-signal)" : "var(--cc-ash)" }}
            aria-hidden
          />
          Email sync
          <span
            className="cc-font-sans text-xs font-semibold"
            style={{ color: syncOn ? "var(--cc-signal-deep)" : "var(--cc-ash)" }}
          >
            {syncOn ? "On" : "Paused"}
          </span>
        </span>
        <span className="text-[color:var(--cc-hair-strong)]">·</span>
        <span>
          Confidence threshold{" "}
          <span className="cc-font-sans cc-tabular font-semibold text-[color:var(--cc-ink)]">
            {settings.confidence_threshold}
          </span>
          <span className="text-[color:var(--cc-ash)]">%</span>
        </span>
        <span className="text-[color:var(--cc-hair-strong)]">·</span>
        <span>
          Auto-apply{" "}
          <span
            className="cc-font-sans text-xs font-semibold"
            style={{
              color: settings.auto_apply_non_destructive ? "var(--cc-wheat-deep)" : "var(--cc-ash)",
            }}
          >
            {settings.auto_apply_non_destructive ? "On" : "Off"}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={onConfigure}
        className="self-start sm:self-auto cc-btn cc-btn-ghost"
        style={{ padding: "0.55rem 0.9rem" }}
      >
        Configure
      </button>
    </div>
  );
};
