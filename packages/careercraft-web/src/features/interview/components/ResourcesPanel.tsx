/**
 * Learning resources — field-aware MCP recommendations + proven tips.
 */
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, RotateCcw, Star } from "lucide-react";
import {
  COACH_AVAILABLE,
  interviewCoach,
  type CoachResource,
  type ProvenTip,
} from "@/lib/interviewCoach";
import { ProofChip } from "./ProofChip";
import { CoachOfflineBanner } from "./CoachOfflineBanner";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "behavioral", label: "Behavioral" },
  { id: "communication", label: "Communication" },
  { id: "technical", label: "Technical" },
  { id: "system design", label: "System design" },
];

export function ResourcesPanel({ field }: { field?: string }) {
  const [resources, setResources] = useState<CoachResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState("all");
  const [tips, setTips] = useState<ProvenTip[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(
    async (skillFocus?: string) => {
      if (!COACH_AVAILABLE) {
        setResources([]);
        setUnavailable(true);
        return;
      }
      setLoading(true);
      setUnavailable(false);
      try {
        const skills =
          skillFocus && skillFocus !== "all"
            ? [skillFocus]
            : field
              ? [field]
              : undefined;
        const result = await interviewCoach.getResources({
          skills,
          goal: field ? `interview prep for ${field}` : "interview prep",
          maxResults: 9,
        });
        setResources(result);
        setUnavailable(result.length === 0);
      } catch {
        setResources([]);
        setUnavailable(true);
      } finally {
        setLoading(false);
      }
    },
    [field],
  );

  const loadTips = useCallback(async () => {
    if (!COACH_AVAILABLE) {
      setTips([]);
      return;
    }
    setTipsLoading(true);
    try {
      setTips(await interviewCoach.getProvenTips({ skill: field, count: 3 }));
    } catch {
      setTips([]);
    } finally {
      setTipsLoading(false);
    }
  }, [field]);

  useEffect(() => {
    if (loadedOnce) return;
    setLoadedOnce(true);
    void load();
    void loadTips();
  }, [loadedOnce, load, loadTips]);

  // Reload when field personalization arrives after first paint
  useEffect(() => {
    if (!loadedOnce || !field) return;
    void load(filter === "all" ? undefined : filter);
    void loadTips();
  }, [field]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {!COACH_AVAILABLE && <CoachOfflineBanner />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--cc-ink-soft)]">
            Community-vetted material
            {field ? (
              <>
                {" "}
                for <span className="font-semibold text-[color:var(--cc-ink)]">{field}</span>
              </>
            ) : (
              ""
            )}
            , each with its source on the chip.
          </p>
        </div>
        <div className="inline-flex overflow-hidden rounded-[0.85rem] border border-[color:var(--cc-hair-strong)]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(f.id);
                void load(f.id === "all" ? undefined : f.id);
              }}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                filter === f.id
                  ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                  : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-[1.25rem] border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]"
            />
          ))}
        </div>
      ) : resources.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <a
              key={resource.id}
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="cc-surface cc-lift group flex flex-col p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="cc-label-sm text-[color:var(--cc-rust)]">{resource.type}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[color:var(--cc-ash)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="cc-font-display text-lg leading-snug text-[color:var(--cc-ink)] group-hover:text-[color:var(--cc-rust)]">
                {resource.title}
              </p>
              {resource.description && (
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
                  {resource.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className="cc-label-sm truncate text-[color:var(--cc-ash)]">
                  {resource.provider}
                  {resource.duration ? ` · ${resource.duration}` : ""}
                </span>
                {typeof resource.rating === "number" && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-[color:var(--cc-wheat-deep)]">
                    <Star className="h-3 w-3 fill-current" />
                    {resource.rating}
                  </span>
                )}
              </div>
              {resource.proof && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <ProofChip proof={resource.proof} />
                </div>
              )}
            </a>
          ))}
        </div>
      ) : (
        <div className="cc-tint cc-tone-wheat px-6 py-10 text-center">
          <p className="cc-kicker mb-2">
            {COACH_AVAILABLE ? "Nothing here yet" : "Coach offline"}
          </p>
          <p className="text-sm text-[color:var(--cc-ink-soft)]">
            {unavailable
              ? COACH_AVAILABLE
                ? "Live recommendations couldn't be loaded right now."
                : "Resources need the interview coach. History still works from Home."
              : "Nothing matches this filter."}
          </p>
          {COACH_AVAILABLE && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                void load();
              }}
              className="cc-action cc-action--ghost mt-5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Try again
            </button>
          )}
        </div>
      )}

      {(tipsLoading || tips.length > 0) && (
        <section className="cc-surface overflow-hidden">
          <div className="border-b border-[color:var(--cc-hair)] bg-[color:var(--cc-rust-soft)]/30 px-5 py-4">
            <p className="cc-kicker">Proven tips</p>
            <p className="mt-1 text-xs text-[color:var(--cc-ash)]">
              Coaching advice backed by real, vetted sources.
            </p>
          </div>
          <div className="divide-y divide-[color:var(--cc-hair)]">
            {tipsLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse bg-[color:var(--cc-cream-2)]" />
                ))
              : tips.map((tip, i) => (
                  <div key={i} className="space-y-2 px-5 py-4">
                    <p className="text-sm leading-relaxed text-[color:var(--cc-ink-soft)]">
                      {tip.tip}
                    </p>
                    {tip.proof && <ProofChip proof={tip.proof} />}
                  </div>
                ))}
          </div>
        </section>
      )}
    </div>
  );
}
