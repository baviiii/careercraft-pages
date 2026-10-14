import { Loader2, Search } from "lucide-react";
import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from "react";

import { POPULAR_ROLES } from "@/lib/careerFields";
import { occupationsAttribution, preloadOccupations, suggestTitles } from "@/lib/occupations";

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
  /** One-tap starting points for someone with no profile yet. */
  starters: string[];
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
 *
 * Under it, one row of one-tap searches that changes with what's useful:
 * Australian job titles while you type a role, your profile's roles when you
 * have them, and a few starting points when you don't.
 */
export const SearchSentence = ({
  role,
  place,
  onRole,
  onPlace,
  onSearch,
  searching,
  suggestions,
  starters,
}: SearchSentenceProps) => {
  /* Typed suggestions only once the person starts typing, not for the role
     the page filled in for them. */
  const [typing, setTyping] = useState(false);
  const [titles, setTitles] = useState<string[]>([]);

  useEffect(preloadOccupations, []);
  useEffect(() => {
    if (!typing || role.trim().length < 2) {
      setTitles([]);
      return;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      const q = role.trim().toLowerCase();
      // Common jobs first, so "nur" offers Registered Nurse before Nurseryperson;
      // then the ABS list, which ranks by spelling, not by how often people mean it.
      const common = POPULAR_ROLES.filter((r) => r.toLowerCase().split(/[\s/(),-]+/).some((w) => w.startsWith(q)));
      suggestTitles(role, 8).then((t) => {
        if (!live) return;
        const merged = [...common, ...t].filter(
          (x, i, a) => x.toLowerCase() !== q && a.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i,
        );
        setTitles(merged.slice(0, 6));
      });
    }, 120);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [role, typing]);

  const go = (next?: { role?: string; place?: string }) => {
    setTyping(false);
    onSearch(next);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go();
  };

  const row =
    titles.length > 0
      ? { label: "Job titles:", items: titles }
      : suggestions.length > 0
        ? { label: "From your profile:", items: suggestions }
        : starters.length > 0
          ? { label: "Try:", items: starters }
          : null;
  // The ABS titles are CC BY 4.0, so they carry a credit wherever they show.
  const credit = titles.length > 0 ? occupationsAttribution() : null;

  return (
    <form onSubmit={submit} className="cc-sentence p-5 md:p-7" role="search" aria-label="Search jobs">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <p className="cc-sentence__line font-medium">
          Show me{" "}
          <Blank
            value={role}
            onChange={(e) => {
              setTyping(true);
              onRole(e.target.value);
            }}
            placeholder="any"
            aria-label="Role or keyword"
          />{" "}
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

      {row && (
        <div className="mt-4 border-t border-[color:var(--cc-hair)] pt-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <span className="cc-font-sans text-[13px] text-[color:var(--cc-ash)]">{row.label}</span>
            {row.items.map((s) => (
              <button
                key={s}
                type="button"
                className="cc-try cc-font-sans"
                onClick={() => {
                  onRole(s);
                  go({ role: s });
                }}
              >
                {s}
              </button>
            ))}
          </div>
          {credit && <p className="mt-2 cc-font-sans text-[11px] text-[color:var(--cc-ash)]">Job titles: {credit}</p>}
        </div>
      )}
    </form>
  );
};
