import { Loader2, Search } from "lucide-react";
import type { FormEvent, InputHTMLAttributes } from "react";

/* Places people actually type, offered as you type in the "where" blank.
   Anything else works too; the board matches suburbs, cities and states. */
const PLACES = [
  "Adelaide",
  "Brisbane",
  "Canberra",
  "Darwin",
  "Gold Coast",
  "Hobart",
  "Melbourne",
  "Newcastle",
  "Perth",
  "Sydney",
];

interface SearchSentenceProps {
  role: string;
  place: string;
  onRole: (v: string) => void;
  onPlace: (v: string) => void;
  onSearch: (next?: { role?: string; place?: string }) => void;
  searching: boolean;
  /** One-tap searches from the person's profile. */
  suggestions: string[];
}

/** A blank exactly as wide as its words: a hidden copy of the text sets the
    size and the input sits over it, so the sentence stays a sentence. */
const Blank = (props: InputHTMLAttributes<HTMLInputElement> & { value: string; placeholder: string }) => (
  <span className="cc-blank-wrap">
    <span className="cc-blank-size" aria-hidden>
      {(props.value || props.placeholder).slice(0, 28)}
    </span>
    <input {...props} className="cc-blank" enterKeyHint="search" />
  </span>
);

/**
 * The search, as a sentence: "Show me ___ jobs in ___". Two blanks are all the
 * board can actually search on (words and place); everything else is a
 * filter on the results, further down.
 */
export const SearchSentence = ({
  role,
  place,
  onRole,
  onPlace,
  onSearch,
  searching,
  suggestions,
}: SearchSentenceProps) => {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <form onSubmit={submit} className="cc-sentence p-5 md:p-7" role="search" aria-label="Search jobs">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <p className="cc-sentence__line font-medium">
          Show me{" "}
          <Blank value={role} onChange={(e) => onRole(e.target.value)} placeholder="any" aria-label="Role or keyword" />{" "}
          jobs in{" "}
          <Blank
            value={place}
            onChange={(e) => onPlace(e.target.value)}
            placeholder="all of Australia"
            aria-label="Where"
            list="cc-browse-places"
          />
          <datalist id="cc-browse-places">
            {PLACES.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </p>
        <button type="submit" disabled={searching} className="cc-action shrink-0 self-start xl:self-auto">
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:[animation-duration:1.8s]" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color:var(--cc-hair)] pt-4">
          <span className="cc-font-sans text-[13px] text-[color:var(--cc-ash)]">From your profile:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="cc-try cc-font-sans"
              onClick={() => {
                onRole(s);
                onSearch({ role: s });
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </form>
  );
};
