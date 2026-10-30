/**
 * Learning resources — recommendations for the job in the "Going for" card,
 * proven tips, and the learner's own list.
 *
 * Every resource can be saved, started and marked done (by link). Finishing
 * one counts towards the skill it was recommended for and stops it being
 * recommended again. The filter chips are this job's key skills, not a fixed
 * tech list, and research and proof links follow the job.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, RotateCcw, Star } from "lucide-react";
import { careerCoach } from "@/lib/careerCoach";
import {
  COACH_AVAILABLE,
  interviewCoach,
  type CoachResource,
  type ProvenTip,
} from "@/lib/interviewCoach";
import { useMyResources, type MyResource } from "../lib/practiceData";
import { ProofChip } from "./ProofChip";
import { CoachOfflineBanner } from "./CoachOfflineBanner";
import { ResourceProgress } from "./ResourceProgress";

const ALL = "all";
const BEHAVIOURAL = "Behavioural";

/** The same link with or without a trailing slash or #anchor (as the coach compares them). */
function linkKey(url: string): string {
  return url.trim().replace(/#.*$/, "").replace(/\/+$/, "");
}

/** "All", then this job's key skills, then Behavioural, which every job is asked. */
function filtersFor(keySkills: string[] | undefined): string[] {
  const seen = new Set<string>();
  return [ALL, ...(keySkills ?? []).slice(0, 4), BEHAVIOURAL].filter((f) => {
    const k = f.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function ResourcesPanel({ field }: { field?: string }) {
  const [resources, setResources] = useState<CoachResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [filter, setFilter] = useState(ALL);
  const [tips, setTips] = useState<ProvenTip[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // The job's key skills make the filter chips: a nurse filters by nursing skills.
  const { data: preview } = useQuery({
    queryKey: ["field-preview", field?.trim().toLowerCase() ?? ""],
    queryFn: () => careerCoach.previewField(field!),
    enabled: COACH_AVAILABLE && Boolean(field?.trim()),
    staleTime: 60 * 60_000,
  });
  const filters = useMemo(() => filtersFor(preview?.known ? preview.keySkills : undefined), [preview]);

  const { data: mine } = useMyResources();
  const myByLink = useMemo(() => new Map((mine ?? []).map((r) => [linkKey(r.url), r])), [mine]);
  const underway = (mine ?? []).filter((r) => r.status !== "completed");
  const finished = (mine ?? []).filter((r) => r.status === "completed");

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
        const skills = skillFocus && skillFocus !== ALL ? [skillFocus] : field ? [field] : undefined;
        const result = await interviewCoach.getResources({
          skills,
          field,
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
      setTips(await interviewCoach.getProvenTips({ skill: field, field, count: 3 }));
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
    void load(filter === ALL ? undefined : filter);
    void loadTips();
  }, [field]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {!COACH_AVAILABLE && <CoachOfflineBanner />}

      {underway.length > 0 && (
        <section className="cc-surface overflow-hidden" aria-labelledby="iv-my-resources">
          <div className="border-b border-[color:var(--cc-hair)] px-5 py-4">
            <p id="iv-my-resources" className="cc-kicker">Your list</p>
            <p className="mt-1 text-xs text-[color:var(--cc-ash)]">
              Saved and started. Mark one done and it counts towards its skill.
            </p>
          </div>
          <ul className="divide-y divide-[color:var(--cc-hair)]">
            {underway.map((r) => (
              <MyResourceRow key={r.url} resource={r} />
            ))}
          </ul>
        </section>
      )}

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
        <div className="inline-flex max-w-full overflow-x-auto rounded-[0.85rem] border border-[color:var(--cc-hair-strong)] [scrollbar-width:none]">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
                void load(f === ALL ? undefined : f);
              }}
              className={`shrink-0 px-3 py-2 text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)]"
                  : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
              }`}
            >
              {f === ALL ? "All" : f}
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
          {resources.map((resource) => {
            const own = resource.url ? myByLink.get(linkKey(resource.url)) : undefined;
            return (
              <article key={resource.id} className="cc-surface cc-lift group flex flex-col p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="cc-label-sm text-[color:var(--cc-rust)]">{resource.type}</span>
                  <ArrowUpRight
                    aria-hidden
                    className="h-3.5 w-3.5 text-[color:var(--cc-ash)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="cc-font-display text-lg leading-snug text-[color:var(--cc-ink)] hover:text-[color:var(--cc-rust)]"
                >
                  {resource.title}
                </a>
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
                      <Star className="h-3 w-3 fill-current" aria-hidden />
                      {resource.rating}
                    </span>
                  )}
                </div>
                {resource.proof && (
                  <div className="mt-3">
                    <ProofChip proof={resource.proof} />
                  </div>
                )}
                {resource.url && (
                  <div className="mt-3">
                    <ResourceProgress
                      resource={{
                        url: resource.url,
                        title: resource.title,
                        provider: resource.provider,
                        skill: filter !== ALL && filter !== BEHAVIOURAL ? filter : resource.skill || field,
                      }}
                      status={own?.status ?? resource.myStatus}
                      rating={own?.rating ?? null}
                    />
                  </div>
                )}
              </article>
            );
          })}
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
                setFilter(ALL);
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

      {finished.length > 0 && (
        <details className="cc-surface overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-[color:var(--cc-ink)]">
            Finished ({finished.length})
          </summary>
          <ul className="divide-y divide-[color:var(--cc-hair)] border-t border-[color:var(--cc-hair)]">
            {finished.map((r) => (
              <MyResourceRow key={r.url} resource={r} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function MyResourceRow({ resource }: { resource: MyResource }) {
  return (
    <li className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-sm font-semibold text-[color:var(--cc-ink)] hover:text-[color:var(--cc-rust)]"
        >
          {resource.title}
        </a>
        <p className="cc-label-sm truncate text-[color:var(--cc-ash)]">
          {[resource.provider, resource.skill].filter(Boolean).join(" · ")}
        </p>
      </div>
      <ResourceProgress
        resource={{
          url: resource.url,
          title: resource.title,
          provider: resource.provider ?? undefined,
          skill: resource.skill ?? undefined,
        }}
        status={resource.status}
        rating={resource.rating}
      />
    </li>
  );
}
