import { Check, Copy, FileOutput, Loader2, Save, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { CraftButton } from "@/components/craft/AppPrimitives";

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
  overallScore: number;
}

const TONES: Array<{ id: CoverLetterTone; label: string; desc: string }> = [
  { id: "professional", label: "Professional", desc: "Formal & traditional" },
  { id: "confident", label: "Confident", desc: "Bold & assertive" },
  { id: "casual", label: "Casual", desc: "Friendly & warm" },
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
  overallScore,
}: CoverLetterPanelProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <section className="cc-card p-7">
        <div className="flex items-baseline justify-between gap-6 mb-2 flex-wrap">
          <div>
            <div className="cc-label text-[color:var(--cc-rust)]">§ The letter</div>
            <h2 className="mt-2 cc-font-display text-2xl md:text-3xl leading-tight">
              Draft a <span className="cc-italic-wonk">cover letter</span>.
            </h2>
          </div>
          <FileOutput className="w-5 h-5 text-[color:var(--cc-rust)]" />
        </div>

        <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)] max-w-2xl">
          A tailored letter, set from this résumé and this posting — then
          handed to you for the final human touch.
        </p>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[260px]">
            <div className="cc-label text-[color:var(--cc-ash)] mb-2">§ Tone</div>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onToneChange(t.id)}
                  className={`cc-pill ${
                    tone === t.id ? "cc-pill-filled" : ""
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <CraftButton onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Drafting…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Draft the letter
              </>
            )}
          </CraftButton>
        </div>

        <div className="mt-6">
          {generated ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="cc-label text-[color:var(--cc-rust)]">
                  § The draft
                </div>
                <div className="flex flex-wrap gap-2">
                  <CraftButton
                    size="sm"
                    variant="ghost"
                    onClick={() => onCopy(generated, "coverletter")}
                  >
                    {copiedText === "coverletter" ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy
                  </CraftButton>
                  <CraftButton size="sm" onClick={onSave}>
                    <Save className="w-3.5 h-3.5" />
                    File it
                  </CraftButton>
                  <CraftButton
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate("/cover-letter")}
                  >
                    Open editor
                  </CraftButton>
                </div>
              </div>
              <textarea
                value={generated}
                onChange={(e) => onGeneratedChange(e.target.value)}
                className="cc-textarea w-full min-h-[400px] cc-font-mono text-[13px]"
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] p-12 text-center">
              <FileOutput className="w-10 h-10 mx-auto text-[color:var(--cc-ash)] mb-4" />
              <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)] max-w-md mx-auto">
                Press <span className="text-[color:var(--cc-rust)]">Draft the letter</span>{" "}
                to set a tailored cover note from your résumé and the posting.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="border-l-2 border-[color:var(--cc-rust)] pl-5">
        <div className="cc-label text-[color:var(--cc-rust)]">§ Marginalia</div>
        <ul className="mt-2 space-y-1.5 cc-font-editorial italic text-[color:var(--cc-ink-soft)] text-[15px]">
          <li>
            The letter borrows from the audit — your reading of{" "}
            <span className="text-[color:var(--cc-ink)] cc-tabular">
              {overallScore}/100
            </span>{" "}
            guides which skills to highlight.
          </li>
          <li>Edit freely before sending — add the personal note a machine cannot.</li>
          <li>File it to the library to track applications.</li>
        </ul>
      </section>
    </div>
  );
};
