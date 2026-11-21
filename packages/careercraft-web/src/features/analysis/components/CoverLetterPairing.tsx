import { useLayoutEffect, useRef } from "react";

import { coverLetterChoiceLabel, letterDate } from "@/features/cover-letter/lib/letterLabel";

import type { SavedCoverLetter } from "../types";
import { Ready } from "./proof";

/** Name, then the date; just the date when nothing names it. */
function choiceText(cl: SavedCoverLetter): string {
  const name = coverLetterChoiceLabel(cl, cl.sentWith);
  return name ? `${name} · ${letterDate(cl.created_at)}` : `Letter · ${letterDate(cl.created_at)}`;
}

interface CoverLetterPairingProps {
  savedCoverLetters: SavedCoverLetter[];
  selectedCoverLetterId: string;
  onPick: (id: string) => void;
  coverLetterText: string;
  onChangeText: (value: string) => void;
  onClearSelection: () => void;
}

export const CoverLetterPairing = ({
  savedCoverLetters,
  selectedCoverLetterId,
  onPick,
  coverLetterText,
  onChangeText,
  onClearSelection,
}: CoverLetterPairingProps) => {
  const letterRef = useRef<HTMLTextAreaElement>(null);
  const selected = savedCoverLetters.find((cl) => cl.id === selectedCoverLetterId) ?? null;

  /* Setting the value puts the caret at the end, and the box scrolls there,
     so a picked letter opened on "Sincerely" instead of on itself. The
     browser does that again after paint, so pin it twice. */
  useLayoutEffect(() => {
    const el = letterRef.current;
    if (!el || !selectedCoverLetterId) return;
    const pin = () => {
      el.scrollTop = 0;
      el.setSelectionRange(0, 0);
    };
    pin();
    const frame = requestAnimationFrame(pin);
    return () => cancelAnimationFrame(frame);
  }, [selectedCoverLetterId]);

  return (
    <section className="rounded-[1.25rem] border-2 border-dashed border-[color:var(--cc-hair-strong)] p-6 md:p-8 mt-6">
    <div className="flex items-center justify-between gap-4 mb-5">
      <h3 className="cc-font-display text-[22px] leading-tight text-[color:var(--cc-ink)]">
        Cover letter{" "}
        <span className="text-[15px] font-normal text-[color:var(--cc-ash)]">optional</span>
      </h3>
      {coverLetterText && <Ready>Added</Ready>}
    </div>

    {savedCoverLetters.length > 0 && (
      <div className="mb-5">
        <label className="cc-label-sm text-[color:var(--cc-ash)] block mb-2">
          Saved cover letters
        </label>
        <select
          value={selectedCoverLetterId}
          onChange={(e) => onPick(e.target.value)}
          className="cc-select"
        >
          <option value="">Pick a cover letter…</option>
          {savedCoverLetters.map((cl) => (
            <option key={cl.id} value={cl.id}>
              {choiceText(cl)}
            </option>
          ))}
        </select>
        {selected && (
          <p className="mt-3 cc-font-sans text-[15px] leading-snug text-[color:var(--cc-ink)]">
            {choiceText(selected)}
          </p>
        )}
      </div>
    )}

    <textarea
      ref={letterRef}
      placeholder={savedCoverLetters.length > 0 ? "…or paste one here." : "Paste a cover letter to check it too."}
      aria-label="Cover letter"
      value={coverLetterText}
      onChange={(e) => {
        onChangeText(e.target.value);
        onClearSelection();
      }}
      className="cc-textarea w-full min-h-[150px] max-h-[280px]"
    />
    </section>
  );
};
