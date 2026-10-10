import { Check, Copy, FileText, Loader2, PenLine, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

import type { CoverLetterTone } from "../types";

interface CoverLetterPanelProps {
  tone: CoverLetterTone;
  onToneChange: (tone: CoverLetterTone) => void;
  isGenerating: boolean;
  generated: string;
  onGenerate: () => void;
  onGeneratedChange: (value: string) => void;
  onSave: () => void;
  onCopy: (text: string, id: string) => void;
  copiedText: string | null;
}

const TONES: Array<{ id: CoverLetterTone; label: string }> = [
  { id: "professional", label: "Professional" },
  { id: "confident", label: "Confident" },
  { id: "casual", label: "Casual" },
];

export const CoverLetterPanel = ({
  tone,
  onToneChange,
  isGenerating,
  generated,
  onGenerate,
  onGeneratedChange,
  onSave,
  onCopy,
  copiedText,
}: CoverLetterPanelProps) => {
  const navigate = useNavigate();

  return (
    <section className="cc-surface p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h2 className="cc-font-display text-[24px] leading-tight text-[color:var(--cc-ink)]">
            Cover letter
          </h2>
          <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Tone">
            {TONES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={tone === t.id}
                onClick={() => onToneChange(t.id)}
                className={`cc-proof-chip ${tone === t.id ? "is-active" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button className="cc-action" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PenLine className="h-4 w-4" />
          )}
          {isGenerating ? "Writing…" : generated ? "Write again" : "Write letter"}
        </button>
      </div>

      <div className="mt-7">
        {generated ? (
          <>
            <div className="mb-3 flex flex-wrap justify-end gap-2">
              <button
                className="cc-action cc-action--ghost cc-action--sm"
                onClick={() => onCopy(generated, "coverletter")}
              >
                {copiedText === "coverletter" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copy
              </button>
              <button
                className="cc-action cc-action--ghost cc-action--sm"
                onClick={() => navigate("/cover-letter")}
              >
                Open editor
              </button>
              <button className="cc-action cc-action--ink cc-action--sm" onClick={onSave}>
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </div>
            <textarea
              value={generated}
              onChange={(e) => onGeneratedChange(e.target.value)}
              aria-label="Cover letter"
              className="cc-proof-sheet block min-h-[460px] w-full resize-y p-6 focus:outline-none focus:ring-2 focus:ring-[color:var(--cc-rust-soft)] md:p-10"
            />
          </>
        ) : (
          <div className="grid place-items-center rounded-[1.25rem] border border-dashed border-[color:var(--cc-hair-strong)] px-6 py-14 text-center">
            <FileText className="mb-3 h-8 w-8 text-[color:var(--cc-ash)]" />
            <p className="text-[14px] text-[color:var(--cc-ash)]">Pick a tone, then write the letter.</p>
          </div>
        )}
      </div>
    </section>
  );
};
