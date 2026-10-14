/* Browse jobs (/au-jobs).

   Australian listings from Adzuna through the job-search function, the same
   search the tracker's "Find more jobs" uses: it pages properly, ranks by
   meaning when there's a profile, and saves straight into the tracker.

   This page used to call job-news' fetch_au_jobs, which mixed in European
   (Arbeitnow) and worldwide (Remotive) listings on every search, ignored the
   type, level and industry filters it was sent, and fell back to an invented
   "$120k" average salary. Its Alerts tab saved switches nobody read, and its
   Analysis tab asked a model for "predictions" about fifteen job titles. */

import { AlertCircle, Briefcase, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { CraftAppLayout } from "@/components/craft/CraftAppLayout";
import type { JobCatalogJob } from "@/features/job-tracker/types";
import { useToast } from "@/hooks/use-toast";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useRateLimit } from "@/hooks/useSecurity";
import { supabase } from "@/integrations/supabase/client";
import { auditLog } from "@/lib/security/auditLog";
import { RATE_LIMITS } from "@/lib/security/rateLimiter";
import { sanitize } from "@/lib/security/sanitizers";

import { JobAdCard, type Fit } from "./components/JobAdCard";
import { SearchSentence } from "./components/SearchSentence";
import { SearchSummary } from "./components/SearchSummary";
import { flyToTracker } from "./lib/flyToTracker";
import { REFINE_CHIPS, applyRefine, chipCounts, type RefineKey } from "./lib/refine";
import { summarise } from "./lib/summary";
import "./browse-jobs.css";

const PAGE_SIZE = 50;
const PLACE_KEY = "cc-browse-place";

type Status = "idle" | "loading" | "ready" | "error";
type Sort = "fit" | "newest" | "board";

/* A job is "in the tracker" if its link, or its title and company, match a
   row there. Saving from here doesn't dedupe server-side, so this is what
   stops the same ad being saved twice. */
const titleKey = (title: string, company: string) => `${title}|${company}`.trim().toLowerCase();

function readLastPlace(): string {
  try {
    return localStorage.getItem(PLACE_KEY) ?? "";
  } catch {
    return "";
  }
}

const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function BrowseJobsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const perso = usePersonalization();
  const { checkLimit } = useRateLimit({
    key: "au-jobs-search",
    config: RATE_LIMITS.SEARCH,
    onLimitExceeded: (result) =>
      toast({
        title: "Slow down a little",
        description: `Try again in ${result.retryAfter} seconds.`,
        variant: "destructive",
      }),
  });

  const [role, setRole] = useState("");
  const [place, setPlace] = useState(readLastPlace);
  /** What the results on screen were searched for. */
  const [searched, setSearched] = useState<{ role: string; place: string } | null>(null);
  const [jobs, setJobs] = useState<JobCatalogJob[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [partial, setPartial] = useState(false);
  const [active, setActive] = useState<Set<RefineKey>>(new Set());
  const [sort, setSort] = useState<Sort>("fit");

  const [trackedUrls, setTrackedUrls] = useState<Set<string>>(new Set());
  const [trackedTitles, setTrackedTitles] = useState<Set<string>>(new Set());
  const [savedCount, setSavedCount] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);

  /* The profile's own role and the board phrasings of it from onboarding. */
  const profileRole = perso.hasPersonalizationData ? perso.getPersonalizedJobQuery() || "" : "";
  const profileTerms = useMemo(
    () => (perso.profile.searchTerms ?? []).filter(Boolean).slice(0, 5),
    [perso.profile.searchTerms],
  );
  const profileCity = (perso.profile.preferredLocations[0] || perso.profile.location || "").split(",")[0].trim();
  const profileText = perso.hasPersonalizationData ? perso.getProfileEmbeddingText() ?? undefined : undefined;

  /* ───── What's already in the tracker ───── */
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.from("job_applications").select("job_url, job_title, company, status");
      if (!alive || !data) return;
      setTrackedUrls(new Set(data.map((r) => r.job_url).filter(Boolean) as string[]));
      setTrackedTitles(new Set(data.map((r) => titleKey(r.job_title, r.company))));
      setSavedCount(data.filter((r) => r.status === "saved").length);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const isTracked = useCallback(
    (j: JobCatalogJob) =>
      (j.canonical_url ? trackedUrls.has(j.canonical_url) : false) || trackedTitles.has(titleKey(j.title, j.company)),
    [trackedUrls, trackedTitles],
  );

  /* ───── Search ───── */
  // Only the latest search may land; an earlier, slower one must not
  // replace it.
  const latest = useRef(0);

  const runSearch = useCallback(
    async (opts: { role: string; place: string; page?: number; append?: boolean }) => {
      if (!checkLimit().allowed) return;
      const pageNo = opts.page ?? 1;
      const append = Boolean(opts.append);
      const run = ++latest.current;
      if (append) setLoadingMore(true);
      else setStatus("loading");

      const q = sanitize(opts.role.trim(), { maxLength: 200 });
      const where = sanitize(opts.place.trim(), { maxLength: 120 });
      // The profile's phrasings only apply to the profile's own role.
      const terms =
        profileTerms.length > 0 && q && q.toLowerCase() === profileRole.toLowerCase() ? profileTerms : undefined;

      try {
        const { data, error } = await supabase.functions.invoke("job-search", {
          body: { action: "search", query: q, location: where, terms, limit: PAGE_SIZE, page: pageNo, profileText },
        });
        if (run !== latest.current) return;
        if (error) throw error;

        const got = (data?.jobs ?? []) as JobCatalogJob[];
        setJobs((prev) => {
          if (!append) return got;
          const seen = new Set(prev.map((j) => j.id));
          return [...prev, ...got.filter((j) => !seen.has(j.id))];
        });
        setHasMore(got.length >= PAGE_SIZE);
        setPartial(Boolean(data?.partial));
        setPage(pageNo);
        setSearched({ role: q, place: where });
        setStatus("ready");
        if (!append) setActive(new Set());
        if (import.meta.env.DEV && data?.similarityStatus) {
          console.log(`[similarity] ${data.similarityStatus}`);
        }
        try {
          localStorage.setItem(PLACE_KEY, where);
        } catch {
          /* private mode: the place just isn't remembered */
        }
        auditLog({
          type: "API_CALL",
          action: `Job search: ${q}`,
          resource: "au-jobs",
          details: { query: q, place: where, page: pageNo },
          success: true,
        });
      } catch (e) {
        if (run !== latest.current) return;
        console.error("[browse-jobs] search failed:", e);
        if (append) {
          toast({ title: "Couldn't load more jobs", description: "Try again in a moment.", variant: "destructive" });
        } else {
          setStatus("error");
        }
      } finally {
        if (run === latest.current) setLoadingMore(false);
      }
    },
    [checkLimit, profileTerms, profileRole, profileText, toast],
  );

  /* First search: what a link asked for (Career Insights sends ?query= and
     ?location=), otherwise the person's own role where they want to work.
     No profile is a broad search, not a guess. */
  const started = useRef(false);
  useEffect(() => {
    if (started.current || perso.loading) return;
    started.current = true;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return; // CraftAppLayout sends them to sign in
      const startRole = params.get("query") ?? profileRole;
      const startPlace = params.get("location") ?? (place || profileCity);
      setRole(startRole);
      setPlace(startPlace);
      void runSearch({ role: startRole, place: startPlace });
    })();
  }, [perso.loading, profileRole, profileCity, place, runSearch, params]);

  const search = (next?: { role?: string; place?: string }) =>
    runSearch({ role: next?.role ?? role, place: next?.place ?? place });

  /* ───── Fit, sort, refine ───── */
  const { isJobRecommended } = perso;
  const fits = useMemo(() => {
    const map = new Map<string, Fit>();
    if (!perso.hasPersonalizationData) return map;
    for (const j of jobs) {
      const r = isJobRecommended({
        title: j.title,
        company: j.company,
        salaryMin: j.salary_min ?? undefined,
        salaryMax: j.salary_max ?? undefined,
        salaryIsPredicted: j.salary_is_predicted,
        location: j.location ?? undefined,
        type: j.job_type ?? undefined,
        category: j.category ?? undefined,
        description: `${j.title}. ${j.description_snippet ?? ""}`,
        isRemote: j.is_remote,
        similarity: j.similarity,
      });
      map.set(j.id, { match: r.match, band: r.band, reasons: r.reasons });
    }
    return map;
  }, [jobs, perso.hasPersonalizationData, isJobRecommended]);

  const canFit = perso.hasPersonalizationData;
  const effectiveSort: Sort = sort === "fit" && !canFit ? "board" : sort;

  const visible = useMemo(() => {
    const posted = (j: JobCatalogJob) => (j.posted_at ? new Date(j.posted_at).getTime() : 0);
    let list = [...jobs];
    if (effectiveSort === "fit") {
      list.sort((a, b) => (fits.get(b.id)?.match ?? 0) - (fits.get(a.id)?.match ?? 0) || posted(b) - posted(a));
    } else if (effectiveSort === "newest") {
      list.sort((a, b) => posted(b) - posted(a));
    }
    list = applyRefine(list, active);
    return list;
  }, [jobs, fits, effectiveSort, active]);

  const counts = useMemo(() => chipCounts(jobs), [jobs]);
  const summary = useMemo(() => summarise(jobs), [jobs]);
  const strongFits = useMemo(() => [...fits.values()].filter((f) => f.band === "strong").length, [fits]);

  const toggleChip = (key: RefineKey) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const turnOn = (key: RefineKey) => setActive((prev) => new Set(prev).add(key));

  /* ───── Save to tracker ───── */
  const save = async (job: JobCatalogJob, from: HTMLElement | null) => {
    setSavingId(job.id);
    try {
      const { error } = await supabase.functions.invoke("job-search", {
        body: { action: "save_to_tracker", job },
      });
      if (error) throw error;
      flyToTracker(from);
      if (job.canonical_url) setTrackedUrls((s) => new Set(s).add(job.canonical_url as string));
      setTrackedTitles((s) => new Set(s).add(titleKey(job.title, job.company)));
      setSavedCount((n) => n + 1);
      toast({ title: "Saved to your tracker", description: `${job.title} is in the Saved lane.` });
    } catch (e) {
      toast({
        title: "Couldn't save that job",
        description: e instanceof Error ? e.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  /* ───── Words ───── */
  const where = searched?.place ? `in ${searched.place}` : "across Australia";
  const heading = searched?.role
    ? `${sentenceCase(searched.role)} jobs`
    : searched?.place
      ? `Jobs in ${searched.place}`
      : "Jobs across Australia";
  const headline =
    status === "loading"
      ? "Searching…"
      : status === "ready"
        ? [
            // The heading already says where when no role was given.
            `${jobs.length === 0 ? "No" : jobs.length}${hasMore ? "+" : ""} open role${jobs.length === 1 ? "" : "s"} ${searched?.role ? where : ""}`.trim(),
            canFit && strongFits > 0 && `${strongFits} look like a strong fit for you`,
          ]
            .filter(Boolean)
            .join(" · ")
        : null;

  const suggestions = useMemo(
    () =>
      [profileRole, ...profileTerms]
        .filter((s, i, a) => s && a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i)
        .filter((s) => s.toLowerCase() !== (searched?.role ?? "").toLowerCase())
        .slice(0, 4),
    [profileRole, profileTerms, searched?.role],
  );

  return (
    <CraftAppLayout
      topBarLeft={<div className="cc-label-sm text-[color:var(--cc-ash)]">Browse jobs</div>}
      headerActions={
        <button
          type="button"
          data-fly-target="tracker"
          onClick={() => navigate("/tracker")}
          className="cc-action cc-action--ghost cc-action--sm"
        >
          <Briefcase className="h-3.5 w-3.5" />
          Job tracker
          {savedCount > 0 && <span className="cc-tabular text-[color:var(--cc-ash)]">· {savedCount} saved</span>}
        </button>
      }
    >
      <div className="cc-browse space-y-7">
        <header>
          <div className="cc-kicker">Browse jobs</div>
          <h1 className="mt-3 cc-font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">{heading}</h1>
          {headline && (
            <p className="mt-3 cc-font-sans text-base text-[color:var(--cc-ink-soft)] md:text-lg">{headline}</p>
          )}
        </header>

        <SearchSentence
          role={role}
          place={place}
          onRole={setRole}
          onPlace={setPlace}
          onSearch={search}
          searching={status === "loading"}
          suggestions={suggestions}
        />

        {!perso.loading && !canFit && (
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--cc-hair)] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)]">
              Want these sorted by how well they suit you? Tell us the role you're after and where.
            </p>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="cc-action cc-action--ghost cc-action--sm shrink-0"
            >
              Add your target role
            </button>
          </div>
        )}

        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_290px]">
          <section aria-label="Results" className="min-w-0 space-y-4">
            {/* Refine + sort */}
            {status === "ready" && jobs.length > 0 && (
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Narrow these jobs">
                  {REFINE_CHIPS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className="cc-refine cc-font-sans"
                      aria-pressed={active.has(c.key)}
                      disabled={counts[c.key] === 0 && !active.has(c.key)}
                      title={c.hint}
                      onClick={() => toggleChip(c.key)}
                    >
                      {c.label}
                      <span className="cc-refine__n">{counts[c.key]}</span>
                    </button>
                  ))}
                  {active.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setActive(new Set())}
                      className="inline-flex items-center gap-1 px-2 cc-font-sans text-[13px] text-[color:var(--cc-ash)] hover:text-[color:var(--cc-ink)]"
                    >
                      <X className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1 cc-font-sans text-[13px]" role="group" aria-label="Sort">
                  <span className="mr-1 text-[color:var(--cc-ash)]">Sort</span>
                  {(canFit ? (["fit", "newest"] as Sort[]) : (["board", "newest"] as Sort[])).map((s) => (
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
                      {s === "fit" ? "Best fit" : s === "newest" ? "Newest" : "Most relevant"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* The facts, above the list on smaller screens */}
            {status === "ready" && jobs.length > 0 && (
              <details className="xl:hidden">
                <summary className="cursor-pointer cc-font-sans text-[14px] font-medium text-[color:var(--cc-ink-soft)] hover:text-[color:var(--cc-ink)]">
                  What's in this search
                </summary>
                <div className="mt-3">
                  <SearchSummary summary={summary} onRefine={turnOn} />
                </div>
              </details>
            )}

            {partial && status === "ready" && (
              <p className="flex items-center gap-2 cc-font-sans text-[13.5px] text-[color:var(--cc-wheat-deep)]">
                <AlertCircle className="h-4 w-4 flex-none" />
                Part of this search didn't come back from the board, so the list may be shorter than usual.
              </p>
            )}

            {status === "loading" && (
              <div className="space-y-4">
                <p className="flex items-center gap-2 cc-font-sans text-[14px] text-[color:var(--cc-ink-soft)]">
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:[animation-duration:1.8s]" />
                  Searching Adzuna for {role.trim() ? `${role.trim()} jobs` : "jobs"}{" "}
                  {place.trim() ? `in ${place.trim()}` : "across Australia"}…
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="cc-jobad" style={{ animation: "none" }} aria-hidden>
                      <div className="flex gap-3">
                        <div className="cc-skel h-10 w-10 rounded-[11px]" />
                        <div className="flex-1 space-y-2">
                          <div className="cc-skel h-4 w-3/4" />
                          <div className="cc-skel h-3 w-1/3" />
                        </div>
                      </div>
                      <div className="mt-4 flex gap-1.5">
                        <div className="cc-skel h-5 w-20 rounded-full" />
                        <div className="cc-skel h-5 w-16 rounded-full" />
                      </div>
                      <div className="cc-skel mt-4 h-3 w-full" />
                      <div className="cc-skel mt-2 h-3 w-5/6" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-6 py-10 text-center">
                <div className="cc-font-display text-xl tracking-tight">We couldn't reach the job board</div>
                <p className="mx-auto mt-2 max-w-sm cc-font-sans text-[14px] text-[color:var(--cc-ink-soft)]">
                  It's usually a blip on Adzuna's side. Give it another go.
                </p>
                <button type="button" onClick={() => search()} className="cc-action cc-action--sm mt-5">
                  Try again
                </button>
              </div>
            )}

            {status === "ready" && jobs.length === 0 && (
              <div className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-6 py-10 text-center">
                <div className="cc-font-display text-xl tracking-tight">No jobs for that search</div>
                <p className="mx-auto mt-2 max-w-sm cc-font-sans text-[14px] text-[color:var(--cc-ink-soft)]">
                  Try a broader role, or look across all of Australia.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {searched?.place && (
                    <button
                      type="button"
                      onClick={() => {
                        setPlace("");
                        void runSearch({ role, place: "" });
                      }}
                      className="cc-action cc-action--sm"
                    >
                      Search all of Australia
                    </button>
                  )}
                  {searched?.role && (
                    <button
                      type="button"
                      onClick={() => {
                        setRole("");
                        void runSearch({ role: "", place });
                      }}
                      className="cc-action cc-action--ghost cc-action--sm"
                    >
                      Any role
                    </button>
                  )}
                </div>
              </div>
            )}

            {status === "ready" && jobs.length > 0 && visible.length === 0 && (
              <div className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-6 py-8 text-center cc-font-sans">
                <p className="text-[15px] text-[color:var(--cc-ink-soft)]">
                  None of these {jobs.length} jobs match those filters.
                </p>
                <button
                  type="button"
                  onClick={() => setActive(new Set())}
                  className="cc-action cc-action--ghost cc-action--sm mt-4"
                >
                  Clear filters
                </button>
              </div>
            )}

            {status === "ready" && visible.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {visible.map((job, i) => (
                  <JobAdCard
                    key={job.id}
                    job={job}
                    index={i}
                    fit={fits.get(job.id) ?? null}
                    tracked={isTracked(job)}
                    saving={savingId === job.id}
                    onSave={save}
                    onOpenTracker={() => navigate("/tracker")}
                  />
                ))}
              </div>
            )}

            {status === "ready" && hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void runSearch({ role: searched?.role ?? role, place: searched?.place ?? place, page: page + 1, append: true })}
                  className="cc-action cc-action--ghost"
                >
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:[animation-duration:1.8s]" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {loadingMore ? "Loading…" : "Show more jobs"}
                </button>
              </div>
            )}

            {(status === "ready" || status === "loading") && (
              <p className="pt-2 cc-font-sans text-xs text-[color:var(--cc-ash)]">
                Jobs by{" "}
                <a
                  href="https://www.adzuna.com.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-[color:var(--cc-ink)]"
                >
                  Adzuna
                </a>
              </p>
            )}
          </section>

          <aside className="hidden xl:block">
            {status === "ready" && jobs.length > 0 && (
              <div className="sticky top-6">
                <SearchSummary summary={summary} onRefine={turnOn} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </CraftAppLayout>
  );
}
