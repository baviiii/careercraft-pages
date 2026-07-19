/**
 * Learning resources — live, source-backed recommendations from the MCP
 * (community-vetted, with proof chips). Real data only: unavailable states
 * say so, nothing is fabricated.
 */
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, RotateCcw, Star } from "lucide-react";
import {
  interviewCoach,
  type CoachResource,
  type ProvenTip,
} from "@/lib/interviewCoach";
import { ProofChip } from "./ProofChip";

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
      setLoading(true);
      setUnavailable(false);
      try {
        const skills =
          skillFocus && skillFocus !== "all" ? [skillFocus] : field ? [field] : undefined;
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

  return (
    <div className="space-y-6">
      {/* Filter strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[color:var(--cc-ink-soft)]">
          Community-vetted material, each with its source on the chip.
        </p>
        <div className="inline-flex border border-[color:var(--cc-hair-strong)]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                void load(f.id === "all" ? undefined : f.id);
              }}
              className={[
                "cc-label-sm px-3 py-2 transition-colors",
                filter === f.id
                  ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                  : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 animate-pulse border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)]" />
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
              className="group flex flex-col border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-5 transition-colors hover:border-[color:var(--cc-ink)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="cc-label-sm text-[color:var(--cc-rust)]">{resource.type}</span>
                <ArrowUpRight className="cc-arrow-up h-3.5 w-3.5 text-[color:var(--cc-ash)] transition-transform" />
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
        <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)] p-10 text-center">
          <p className="cc-label mb-2 text-[color:var(--cc-ink)]">
            Resources not available at the moment
          </p>
          <p className="text-sm text-[color:var(--cc-ash)]">
            {unavailable
              ? "Live recommendations couldn't be loaded right now."
              : "Nothing matches this filter."}
          </p>
          <button
            onClick={() => {
              setFilter("all");
              void load();
            }}
            className="cc-btn cc-btn-ghost mt-5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}

      {/* Proven tips */}
      {(tipsLoading || tips.length > 0) && (
        <section className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream)]">
          <div className="border-b border-[color:var(--cc-hair)] px-5 py-4">
            <p className="cc-label text-[color:var(--cc-ink)]">Proven tips</p>
            <p className="mt-0.5 text-xs text-[color:var(--cc-ash)]">
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
