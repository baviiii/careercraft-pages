import { Loader2, Newspaper } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { relativeTime } from "@/features/dispatch/lib/time";
import { supabase } from "@/integrations/supabase/client";

import { RANGES, TOPICS, fitStory, type NewsArticle, type RangeDays, type StoryFit, type Topic } from "../lib/news";
import { StoryCard } from "./StoryCard";

/* Every request has each story embedded again for "closeness to you", so
   batches stay small. "For you" ranks within each batch and "Show more" adds
   the next one underneath, so nothing already read jumps around. */
const PAGE_SIZE = 30;

type Status = "loading" | "ready" | "error";
type Sort = "fit" | "newest";
type Loaded = NewsArticle & { batch: number };

interface NewsDeskProps {
  /** Null without a profile: there's nothing to rank against. */
  scoreArticle: Parameters<typeof fitStory>[1];
  profileText: string | undefined;
  /** The role "For you" is measured against, for the words. */
  role: string;
  trackedCompanies: string[];
  onAddRole: () => void;
}

export const NewsDesk = ({ scoreArticle, profileText, role, trackedCompanies, onAddRole }: NewsDeskProps) => {
  const canFit = scoreArticle !== null;
  const [topic, setTopic] = useState<Topic>("all");
  const [range, setRange] = useState<RangeDays>(30);
  const [sort, setSort] = useState<Sort>("fit");
  const effectiveSort: Sort = canFit || trackedCompanies.length > 0 ? sort : "newest";

  const [articles, setArticles] = useState<Loaded[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Only the latest request may land: switching topics quickly must not let
  // a slower, earlier answer replace the current one.
  const latest = useRef(0);

  const load = useCallback(
    async (pageNo: number) => {
      const run = ++latest.current;
      const append = pageNo > 1;
      if (append) setLoadingMore(true);
      else setStatus("loading");
      try {
        const { data, error } = await supabase.functions.invoke("job-news", {
          body: {
            action: "fetch_news",
            category: topic,
            startDate: new Date(Date.now() - range * 86_400_000).toISOString(),
            pageNumber: pageNo,
            limit: PAGE_SIZE,
            profileText,
          },
        });
        if (run !== latest.current) return;
        if (error) throw error;
        const got = ((data?.articles ?? []) as NewsArticle[]).map((a) => ({ ...a, batch: pageNo }));
        setArticles((prev) => {
          if (!append) return got;
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...got.filter((a) => !seen.has(a.id))];
        });
        setTotal(data?.totalResults ?? got.length);
        setHasMore(Boolean(data?.hasMore));
        setUpdatedAt(data?.updatedAt ?? null);
        setPage(pageNo);
        setStatus("ready");
      } catch (e) {
        if (run !== latest.current) return;
        console.error("[market-news] news failed:", e);
        if (!append) setStatus("error");
      } finally {
        if (run === latest.current) setLoadingMore(false);
      }
    },
    [topic, range, profileText],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const fits = useMemo(() => {
    const map = new Map<string, StoryFit>();
    for (const a of articles) map.set(a.id, fitStory(a, scoreArticle, trackedCompanies));
    return map;
  }, [articles, scoreArticle, trackedCompanies]);

  const visible = useMemo(() => {
    const list = [...articles];
    const when = (a: NewsArticle) => new Date(a.publishedAt).getTime();
    if (effectiveSort === "fit") {
      list.sort(
        (a, b) => a.batch - b.batch || (fits.get(b.id)?.rank ?? 0) - (fits.get(a.id)?.rank ?? 0) || when(b) - when(a),
      );
    } else list.sort((a, b) => when(b) - when(a));
    return list;
  }, [articles, fits, effectiveSort]);

  const rangeWord = RANGES.find((r) => r.value === range)?.short ?? "month";
  /** "visa" in "6 visa stories"; empty for All. */
  const topicNoun = TOPICS.find((t) => t.value === topic)?.noun ?? "";
  const stories = (n: number) => `${topicNoun ? `${topicNoun} ` : ""}stor${n === 1 ? "y" : "ies"}`;
  const tracked = useMemo(() => [...fits.values()].filter((f) => f.trackedCompany).length, [fits]);

  const line =
    status === "ready"
      ? [
          `${total === 0 ? "No" : total} ${stories(total)} from the past ${rangeWord}`,
          tracked > 0 && `${tracked} name${tracked === 1 ? "s" : ""} a company in your tracker`,
        ]
          .filter(Boolean)
          .join(" · ")
      : status === "loading"
        ? "Loading the news…"
        : null;

  return (
    <section aria-label="News" className="space-y-5">
      {/* Topic, window, order: one row above the list they scope. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Topic">
          {TOPICS.map((t) => (
            <button
              key={t.value}
              type="button"
              className="cc-topic cc-font-sans"
              aria-pressed={topic === t.value}
              onClick={() => setTopic(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 cc-font-sans text-[13px]">
          <label className="inline-flex items-center gap-2 text-[color:var(--cc-ash)]">
            <span className="sr-only">Time window</span>
            <select
              value={range}
              onChange={(e) => setRange(Number(e.target.value) as RangeDays)}
              className="cc-window cc-font-sans"
            >
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {(canFit || trackedCompanies.length > 0) && (
            <div className="flex items-center gap-1" role="group" aria-label="Sort">
              {(["fit", "newest"] as Sort[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={effectiveSort === s}
                  onClick={() => setSort(s)}
                  className={`rounded-full px-2.5 py-1 transition-colors ${
                    effectiveSort === s
                      ? "bg-[color:var(--cc-cream-2)] font-semibold text-[color:var(--cc-ink)]"
                      : "text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]"
                  }`}
                >
                  {s === "fit" ? "For you" : "Newest"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 cc-font-sans">
        {line && <p className="text-[15px] text-[color:var(--cc-ink-soft)]">{line}</p>}
        {updatedAt && status === "ready" && (
          <p className="text-[12.5px] text-[color:var(--cc-ash)]">Checked {relativeTime(updatedAt)}</p>
        )}
      </div>

      {canFit && effectiveSort === "fit" && status === "ready" && articles.length > 0 && (
        <p className="cc-font-sans text-[13px] text-[color:var(--cc-ash)]">
          Stories closest to {role ? <strong className="font-semibold text-[color:var(--cc-ink-soft)]">{role}</strong> : "your profile"} come first, newer ones ahead of older.
        </p>
      )}

      {!canFit && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--cc-hair)] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)]">
            Add the role you're after and the stories closest to it come first.
          </p>
          <button type="button" onClick={onAddRole} className="cc-action cc-action--ghost cc-action--sm shrink-0">
            Add your target role
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="space-y-4" aria-hidden>
          <div className="cc-story cc-story--lead" style={{ animation: "none" }}>
            <div className="w-full space-y-3">
              <div className="cc-skel h-3 w-40" />
              <div className="cc-skel h-7 w-4/5" />
              <div className="cc-skel h-3 w-full" />
              <div className="cc-skel h-3 w-2/3" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cc-story" style={{ animation: "none" }}>
                <div className="w-full space-y-2.5">
                  <div className="cc-skel h-3 w-32" />
                  <div className="cc-skel h-5 w-11/12" />
                  <div className="cc-skel h-3 w-full" />
                  <div className="cc-skel h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-6 py-10 text-center">
          <div className="cc-font-display text-xl tracking-tight">The news didn't load</div>
          <p className="mx-auto mt-2 max-w-sm cc-font-sans text-[14px] text-[color:var(--cc-ink-soft)]">
            Something went wrong on our side. Give it another go.
          </p>
          <button type="button" onClick={() => void load(1)} className="cc-action cc-action--sm mt-5">
            Try again
          </button>
        </div>
      )}

      {status === "ready" && articles.length === 0 && (
        <div className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-6 py-10 text-center">
          <Newspaper className="mx-auto h-6 w-6 text-[color:var(--cc-ash)]" />
          <div className="mt-3 cc-font-display text-xl tracking-tight">
            No {stories(0)} from the past {rangeWord}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {range < 90 && (
              <button type="button" onClick={() => setRange(90)} className="cc-action cc-action--sm">
                Look back 3 months
              </button>
            )}
            {topic !== "all" && (
              <button type="button" onClick={() => setTopic("all")} className="cc-action cc-action--ghost cc-action--sm">
                All topics
              </button>
            )}
          </div>
        </div>
      )}

      {status === "ready" && visible.length > 0 && (
        <>
          <StoryCard article={visible[0]} fit={fits.get(visible[0].id) ?? null} lead index={0} />
          {visible.length > 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.slice(1).map((a, i) => (
                <StoryCard key={a.id} article={a} fit={fits.get(a.id) ?? null} index={i + 1} />
              ))}
            </div>
          )}
        </>
      )}

      {status === "ready" && hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void load(page + 1)}
            className="cc-action cc-action--ghost"
          >
            {loadingMore && <Loader2 className="h-4 w-4 animate-spin motion-reduce:[animation-duration:1.8s]" />}
            {loadingMore ? "Loading…" : "Show more stories"}
          </button>
        </div>
      )}

      {status === "ready" && articles.length > 0 && (
        <p className="pt-1 cc-font-sans text-xs leading-relaxed text-[color:var(--cc-ash)]">
          From Jobs and Skills Australia, HCAMag, ABC News, The Conversation, SmartCompany, iTnews, Startup Daily and
          The Guardian. Every headline opens the original story.
        </p>
      )}
    </section>
  );
};
