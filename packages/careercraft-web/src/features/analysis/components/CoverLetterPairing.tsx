import type { SavedCoverLetter } from "../types";

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
  <section className="border-2 border-dashed border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-7 md:p-8 mt-6">
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <div className="cc-label text-[color:var(--cc-ash)]">
          § 03 · Marginalia (optional)
        </div>
        <h3 className="mt-3 cc-font-display text-2xl leading-tight">
          Pair a <span className="cc-italic-wonk">cover letter</span>.
        </h3>
        <p className="mt-3 cc-font-editorial italic text-[color:var(--cc-ink-soft)] max-w-xl">
          For a complete reading — we'll check whether the letter complements
          the draft for this posting.
        </p>
      </div>
      {coverLetterText && (
        <span className="cc-pill cc-pill-filled">Paired</span>
      )}
    </div>

    {savedCoverLetters.length > 0 && (
      <div className="mb-5">
        <label className="cc-label text-[color:var(--cc-ash)] block mb-2">
          From the letter book
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
      placeholder="…or paste a letter here."
      value={coverLetterText}
      onChange={(e) => {
        onChangeText(e.target.value);
        onClearSelection();
      }}
      className="cc-textarea w-full min-h-[150px]"
    />
  </section>
);
