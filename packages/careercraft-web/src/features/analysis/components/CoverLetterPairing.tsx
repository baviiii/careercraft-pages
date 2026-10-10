import type { SavedCoverLetter } from "../types";
import { Ready } from "./proof";

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
}: CoverLetterPairingProps) => (
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
              {new Date(cl.created_at).toLocaleDateString()} ·{" "}
              {cl.content.substring(0, 40)}…
            </option>
          ))}
        </select>
      </div>
    )}

    <textarea
      placeholder={savedCoverLetters.length > 0 ? "…or paste one here." : "Paste a cover letter to check it too."}
      aria-label="Cover letter"
      value={coverLetterText}
      onChange={(e) => {
        onChangeText(e.target.value);
        onClearSelection();
      }}
      className="cc-textarea w-full min-h-[150px]"
    />
  </section>
);
