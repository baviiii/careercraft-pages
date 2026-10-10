import { Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { CraftAppSection, CraftEmpty } from "@/components/craft/AppPrimitives";

import { applicationLabel, letterDate, letterLabel } from "../lib/letterLabel";
import { TONES, toTone, type LetterApplication, type SavedLetter } from "../types";
import { PostageStamp } from "./PostageStamp";

interface LetterLibraryProps {
  letters: SavedLetter[];
  applicationsFor: (letterId: string) => LetterApplication[];
  /** The letter currently on the sheet, if it's a saved one. */
  activeId: string | null;
  onOpen: (letter: SavedLetter) => void;
  onDetails: (letter: SavedLetter) => void;
  onDelete: (letter: SavedLetter) => void;
}

const toneLabel = (tone: string | null) => TONES.find((t) => t.value === toTone(tone))?.label;

export const LetterLibrary = ({
  letters,
  applicationsFor,
  activeId,
  onOpen,
  onDetails,
  onDelete,
}: LetterLibraryProps) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => Array.from(new Set(letters.map((l) => l.category).filter(Boolean) as string[])).sort(),
    [letters],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return letters.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (!q) return true;
      const apps = applicationsFor(l.id).map(applicationLabel).join(" ");
      return [l.title, l.content, l.notes, l.job_description, apps, ...(l.tags ?? [])]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q));
    });
  }, [letters, query, category, applicationsFor]);

  return (
    <CraftAppSection
      kicker="Library"
      title="Your letters"
      right={
        letters.length > 0 ? (
          <span className="cc-label-sm cc-tabular text-[color:var(--cc-ash)]">
            {letters.length} saved
          </span>
        ) : undefined
      }
    >
      {letters.length === 0 ? (
        <CraftEmpty kicker="Library" title="No letters yet." body="Letters you save land here." />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <label className="relative flex-1">
              <span className="sr-only">Search letters</span>
              <Search className="w-4 h-4 absolute left-0 top-1/2 -translate-y-1/2 text-[color:var(--cc-ash)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by role, company, words in the letter"
                className="cc-input !pl-7 !py-3"
              />
            </label>
            {categories.length > 0 && (
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="cc-select sm:max-w-[16rem]"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="cc-font-editorial text-lg text-[color:var(--cc-ink-soft)]">
              Nothing matches that.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {shown.map((l) => (
                <Envelope
                  key={l.id}
                  letter={l}
                  apps={applicationsFor(l.id)}
                  active={l.id === activeId}
                  onOpen={() => onOpen(l)}
                  onDetails={() => onDetails(l)}
                  onDelete={() => onDelete(l)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </CraftAppSection>
  );
};

interface EnvelopeProps {
  letter: SavedLetter;
  apps: LetterApplication[];
  active: boolean;
  onOpen: () => void;
  onDetails: () => void;
  onDelete: () => void;
}

const Envelope = ({ letter, apps, active, onOpen, onDetails, onDelete }: EnvelopeProps) => {
  const tone = toTone(letter.tone);
  const label = letterLabel(letter, apps[0]);
  const meta = [letterDate(letter.updated_at), toneLabel(letter.tone), letter.category]
    .filter(Boolean)
    .join(" · ");

  return (
    <article data-tone={tone} className={`cc-desk-envelope ${active ? "is-active" : ""}`}>
      <PostageStamp
        tone={tone}
        size="sm"
        primary={toneLabel(letter.tone) ?? ""}
        className="cc-desk-envelope-stamp"
      />

      <h3 className="cc-font-display text-xl leading-tight tracking-tight text-[color:var(--cc-ink)] pr-16">
        <button
          type="button"
          onClick={onOpen}
          className="text-left hover:underline decoration-1 underline-offset-4"
        >
          {label}
        </button>
      </h3>
      <div className="mt-2 cc-label-sm text-[color:var(--cc-ash)]">{meta}</div>
      <p className="mt-4 cc-desk-excerpt">{letter.content}</p>

      {(apps.length > 0 || (letter.tags?.length ?? 0) > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {apps.map((a) => (
            <span key={a.id} className="cc-desk-sent">
              Sent with {applicationLabel(a)}
            </span>
          ))}
          {letter.tags?.map((t) => (
            <span key={t} className="cc-tag">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-[color:var(--cc-hair)] flex items-center justify-between">
        <button type="button" onClick={onOpen} className="cc-label-sm cc-link text-[color:var(--cc-rust)]">
          {active ? "On the desk" : "Open"}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDetails}
            className="cc-desk-icon-btn"
            aria-label={`Edit details of ${label}`}
            title="Details"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="cc-desk-icon-btn cc-desk-icon-btn--danger"
            aria-label={`Delete ${label}`}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
