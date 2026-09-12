import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { usePersonalization } from "@/hooks/usePersonalization";
import type { JobCatalogJob } from "@/features/job-tracker/types";

import type {
  DispatchItem,
  DispatchRole,
  DispatchStory,
  NewsArticle,
  TuningSignal,
} from "../types";

/** How many items the feed renders in total (1 lead + rail). */
const FEED_SIZE = 6;
/** Roles always reserved in the stream, so the feed stays fresh if news lags. */
const MIN_ROLE_SLOTS = 2;
/** Recency half-life, in days — older items fade rather than vanish. */
const DECAY_DAYS = 21;

/**
 * Floor a story must clear to earn a slot. Rank is `decay × (score + 10)`, so a
 * fresh-but-unmatched story lands near 10 and passes on recency alone, while a
 * months-old one lands near zero and is dropped however well it matches.
 *
 * This is deliberate: a short honest feed beats a full one padded with stale
 * filler. Live roles are exempt — they are already scoped to the user's search
 * and are the most actionable thing here.
 */
const MIN_STORY_RANK = 8;

/**
 * Signal weights, deliberately mirroring `usePersonalization().scoreArticle`
 * (industry 25, role 20, company 18, skills 8 each capped at 24) so the tuned
 * ranking and the profile-wide baseline agree when nothing is muted.
 */
const SIGNAL_WEIGHT: Record<TuningSignal["kind"], number> = {
  role: 22,
  industry: 25,
  company: 18,
  skill: 8,
  location: 12,
};
const SKILL_SCORE_CAP = 24;

/** Placeholder profile values that must never become ranking signals. */
const JUNK_LABELS = new Set([
  "other", "others", "n/a", "na", "none", "nil", "unspecified",
  "not specified", "not sure", "general", "various", "any",
]);

/**
 * Chips shown per signal kind, in render order. Keeps the tuning bar legible
 * and keeps one category (usually role titles) from swamping the rest.
 */
const SIGNAL_CAP: Record<TuningSignal["kind"], number> = {
  role: 3,
  location: 1,
  industry: 2,
  skill: 3,
  company: 2,
};

function ageInDays(iso: string | null): number {
  if (!iso) return 30;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 30;
  return Math.max(0, (Date.now() - t) / 86_400_000);
}

/** Fresh items rise; old ones decay smoothly instead of falling off a cliff. */
function recencyDecay(iso: string | null): number {
  return Math.exp(-ageInDays(iso) / DECAY_DAYS);
}

/**
 * Score an item against the *active* signals only. This is what makes the
 * tuning bar real: muting a chip removes its weight and its reason, so the
 * order visibly changes rather than the chip being decorative.
 */
function scoreAgainstSignals(text: string, signals: TuningSignal[]) {
  const haystack = text.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  let skillHits = 0;

  for (const signal of signals) {
    const needle = signal.label.toLowerCase();
    if (needle.length < 3 || !haystack.includes(needle)) continue;

    if (signal.kind === "skill") {
      skillHits += 1;
      continue;
    }
    score += SIGNAL_WEIGHT[signal.kind];
    if (signal.kind === "role") reasons.push("Your target role");
    else if (signal.kind === "industry") reasons.push("Your industry");
    else if (signal.kind === "company") reasons.push(`${signal.label} — a company you follow`);
    else if (signal.kind === "location") reasons.push(`Near ${signal.label}`);
  }

  if (skillHits > 0) {
    score += Math.min(skillHits * SIGNAL_WEIGHT.skill, SKILL_SCORE_CAP);
    reasons.push(`${skillHits} skill${skillHits > 1 ? "s" : ""} you have`);
  }

  return { score, reasons: Array.from(new Set(reasons)) };
}

/**
 * Adzuna's `what` requires every token to appear, and it does not split on
 * punctuation — so "Full-Stack Developer" hunts for the literal "Full-Stack"
 * and misses "Full Stack Developer" listings. Search with spaces; the chip
 * keeps the user's original wording.
 */
function searchable(term: string): string {
  return term.replace(/[-–—/]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatSalary(job: JobCatalogJob): string | null {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: job.currency || "AUD",
      maximumFractionDigits: 0,
    }).format(n);
  if (job.salary_min && job.salary_max) return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}`;
  if (job.salary_min) return `from ${fmt(job.salary_min)}`;
  return null;
}

export function useDispatchFeed() {
  const perso = usePersonalization();
  const { profile, scoreArticle, hasPersonalizationData } = perso;

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [roles, setRoles] = useState<JobCatalogJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());

  /** Everything in the profile that can steer ranking, as removable chips. */
  const allSignals = useMemo<TuningSignal[]>(() => {
    const buckets: Record<TuningSignal["kind"], TuningSignal[]> = {
      role: [], industry: [], location: [], skill: [], company: [],
    };
    const seen = new Set<string>();

    const push = (kind: TuningSignal["kind"], label?: string | null) => {
      const clean = (label || "").trim();
      if (clean.length < 3) return;
      // Onboarding enums leak placeholder values; ranking on "Other" would
      // match everything and mean nothing.
      if (JUNK_LABELS.has(clean.toLowerCase())) return;
      const id = `${kind}:${clean.toLowerCase()}`;
      if (seen.has(id)) return;
      seen.add(id);
      buckets[kind].push({ id, label: clean, kind });
    };

    profile.targetJobTitles.forEach((t) => push("role", t));
    push("role", profile.currentJobTitle);
    push("industry", profile.industry);
    profile.newsPreferences.followedIndustries.forEach((i) => push("industry", i));
    push("location", (profile.preferredLocations[0] || profile.location || "").split(",")[0]);
    profile.skills.filter((s) => s.isPrimary).forEach((s) => push("skill", s.name));
    profile.targetCompanies.forEach((c) => push("company", c));
    profile.newsPreferences.followedCompanies.forEach((c) => push("company", c));

    // Capped per kind. An uncapped bar turns into a wall of chips — six role
    // titles crowd out the location and skills that actually differentiate.
    return (Object.keys(SIGNAL_CAP) as TuningSignal["kind"][]).flatMap((kind) =>
      buckets[kind].slice(0, SIGNAL_CAP[kind]),
    );
  }, [profile]);

  const activeSignals = useMemo(
    () => allSignals.filter((s) => !mutedIds.has(s.id)),
    [allSignals, mutedIds],
  );

  const toggleSignal = useCallback((id: string) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Fetch ───────────────────────────────────────────────────────────────
  const primaryRole = useMemo(
    () => allSignals.find((s) => s.kind === "role")?.label || "",
    [allSignals],
  );
  const primaryLocation = useMemo(
    () => allSignals.find((s) => s.kind === "location")?.label || "",
    [allSignals],
  );

  /**
   * Articles, widening on empty. The 30-day window is right once the news cache
   * is being refreshed on schedule, but a stale cache would return nothing and
   * blank the feed — so fall back to whatever the cache actually holds.
   */
  const loadArticles = useCallback(async (): Promise<NewsArticle[] | null> => {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

    const attempts: Array<Record<string, unknown>> = [
      { action: "fetch_news", category: "all", startDate: since, pageNumber: 1 },
      { action: "fetch_news", category: "all", pageNumber: 1 },
    ];

    let reachable = false;
    for (const body of attempts) {
      const { data, error: fnError } = await supabase.functions.invoke("job-news", { body });
      if (fnError) continue;
      reachable = true;
      const found = (data?.articles || []) as NewsArticle[];
      if (found.length > 0) return found;
    }
    return reachable ? [] : null;
  }, []);

  /**
   * Roles for the home feed, widening once on empty.
   *
   * This used to be a three-rung ladder — local catalog, broader catalog, then
   * a once-per-session ingest — because the first two rungs read a cache that
   * was usually cold or stale. Searching the board directly makes the first
   * rung the real answer, so only the widening remains: Adzuna resolves small
   * suburbs poorly and answers 200 with nothing rather than erroring, which
   * looks identical to "there is no work here".
   */
  const loadRoles = useCallback(async (): Promise<JobCatalogJob[] | null> => {
    const search = async (query?: string, location?: string) => {
      const { data, error: fnError } = await supabase.functions.invoke("job-search", {
        body: {
          action: "search",
          query: query || undefined,
          location: location || undefined,
          limit: 12,
        },
      });
      if (fnError) return null;
      return (data?.jobs || []) as JobCatalogJob[];
    };

    const query = primaryRole ? searchable(primaryRole) : "";

    const scoped = await search(query, primaryLocation);
    if (scoped === null) return null;
    if (scoped.length > 0) return scoped;

    if (query && primaryLocation) {
      const roleOnly = await search(query, "");
      if (roleOnly?.length) return roleOnly;
    }

    return [];
  }, [primaryRole, primaryLocation]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [newsResult, roleResult] = await Promise.allSettled([loadArticles(), loadRoles()]);

    const news = newsResult.status === "fulfilled" ? newsResult.value : null;
    const found = roleResult.status === "fulfilled" ? roleResult.value : null;

    setArticles(news ?? []);
    setRoles(found ?? []);

    // Only surface an error when both sources were unreachable — one dead source
    // should degrade the feed, not blank it. Reachable-but-empty is not an error.
    if (news === null && found === null) {
      setError("Couldn't reach the wire. Try again in a moment.");
    }
    setIsLoading(false);
  }, [loadArticles, loadRoles]);

  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    if (perso.loading) return;
    didInit.current = true;
    void load();
  }, [perso.loading, load]);

  // ── Rank ────────────────────────────────────────────────────────────────
  const items = useMemo<DispatchItem[]>(() => {
    const stories: DispatchStory[] = articles.map((a) => {
      const text = `${a.title} ${a.description} ${a.category}`;
      const tuned = scoreAgainstSignals(text, activeSignals);
      // Fall back to the profile-wide engine when no chip matched, so an item
      // can still surface on profile nuance the chips don't represent.
      const baseline = tuned.score === 0 ? scoreArticle(a) : null;
      const score = tuned.score || baseline?.score || 0;
      const reasons = tuned.reasons.length ? tuned.reasons : baseline?.reasons || [];
      const decay = recencyDecay(a.publishedAt);

      return {
        kind: "story",
        key: `story:${a.id}`,
        title: a.title,
        standfirst: a.description || "",
        source: a.source || "News",
        category: a.category,
        imageUrl: a.imageUrl || null,
        readTime: a.readTime || null,
        timestamp: a.publishedAt,
        url: a.url,
        relevance: { score, reasons, rank: score * decay + 10 * decay },
      };
    });

    const roleItems: DispatchRole[] = roles.map((j) => {
      const text = `${j.title} ${j.company} ${j.location || ""} ${j.description_snippet || ""}`;
      const tuned = scoreAgainstSignals(text, activeSignals);
      const decay = recencyDecay(j.posted_at);
      // Live roles carry a standing bonus: an open job matching your search is
      // inherently more actionable than an article about the market.
      const score = tuned.score + 15;

      return {
        kind: "role",
        key: `role:${j.id}`,
        title: j.title,
        company: j.company,
        location: j.location,
        isRemote: j.is_remote,
        salary: formatSalary(j),
        snippet: j.description_snippet,
        timestamp: j.posted_at,
        url: j.canonical_url,
        relevance: {
          score,
          reasons: tuned.reasons.length ? tuned.reasons : ["Open role on the wire"],
          rank: score * decay + 10 * decay,
        },
      };
    });

    const byRank = (a: DispatchItem, b: DispatchItem) => b.relevance.rank - a.relevance.rank;
    const rankedStories = stories
      .filter((s) => s.relevance.rank >= MIN_STORY_RANK)
      .sort(byRank);
    const rankedRoles = [...roleItems].sort(byRank);

    // Reserve role slots up front, then fill the rest by pure rank, so the feed
    // never becomes all-articles when the news cache is fresher than the market.
    const reserved = rankedRoles.slice(0, MIN_ROLE_SLOTS);
    const reservedKeys = new Set(reserved.map((r) => r.key));
    const remainder = [...rankedStories, ...rankedRoles.filter((r) => !reservedKeys.has(r.key))]
      .sort(byRank)
      .slice(0, Math.max(0, FEED_SIZE - reserved.length));

    return [...reserved, ...remainder].sort(byRank).slice(0, FEED_SIZE);
  }, [articles, roles, activeSignals, scoreArticle]);

  return {
    lead: items[0] ?? null,
    rail: items.slice(1),
    itemCount: items.length,
    signals: allSignals,
    mutedIds,
    toggleSignal,
    isLoading: isLoading || perso.loading,
    error,
    hasPersonalizationData,
    refresh: load,
  };
}

export default useDispatchFeed;
