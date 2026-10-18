/* Market news (/job-market-news).

   Two tabs. News: Australian work stories from publishers' own feeds,
   ordered by how close they are to the person's profile and whether they
   name a company in their tracker. Your market: Adzuna's figures for one
   role across Australia.

   This replaced pages/JobMarketNews.tsx. Its news had been frozen since April
   (the news API key had died and the page served the cache), view counts were
   random numbers, every article popup carried the same hard-coded "+15% job
   growth expected", and the Analytics and Insights tabs showed a typed-in
   "47.2K jobs" and year-on-year growth read from a hard-coded table. */

import { Briefcase } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { CraftAppLayout } from "@/components/craft/CraftAppLayout";
import { usePersonalization } from "@/hooks/usePersonalization";
import { supabase } from "@/integrations/supabase/client";

import { MarketPanel } from "./components/MarketPanel";
import { NewsDesk } from "./components/NewsDesk";
import { trackedCompanyNames } from "./lib/news";
import "./market-news.css";

type Tab = "news" | "market";

export default function MarketNewsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "market" ? "market" : "news";
  const setTab = (t: Tab) => setParams(t === "news" ? {} : { tab: t }, { replace: true });

  const perso = usePersonalization();
  const canFit = Boolean(perso.hasPersonalizationData);
  /* A job title only. getPersonalizedJobQuery() falls back to a skill or the
     industry, which would put "live ads for Other" on the page. */
  const profileRole = (perso.profile.targetJobTitles[0] || perso.profile.currentJobTitle || "").trim();
  const profileText = canFit ? perso.getProfileEmbeddingText() ?? undefined : undefined;
  const suggestions = useMemo(
    () =>
      [profileRole, ...perso.profile.targetJobTitles, ...(perso.profile.searchTerms ?? [])]
        .filter((s, i, a) => s && a.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i)
        .slice(0, 6),
    [profileRole, perso.profile.targetJobTitles, perso.profile.searchTerms],
  );

  /* Companies already in the tracker, so a story or employer naming one can
     say so. */
  const [trackerCompanies, setTrackerCompanies] = useState<string[]>([]);
  const [trackerReady, setTrackerReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data } = await supabase.from("job_applications").select("company");
        if (alive && data) setTrackerCompanies(trackedCompanyNames(data.map((r) => r.company)));
      } finally {
        if (alive) setTrackerReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <CraftAppLayout
      topBarLeft={<div className="cc-label-sm text-[color:var(--cc-ash)]">Market news</div>}
      headerActions={
        <button type="button" onClick={() => navigate("/tracker")} className="cc-action cc-action--ghost cc-action--sm">
          <Briefcase className="h-3.5 w-3.5" />
          Job tracker
        </button>
      }
    >
      <div className="cc-mnews space-y-7">
        <header>
          <div className="cc-kicker">Market news</div>
          <h1 className="mt-3 cc-font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
            {tab === "news" ? "Work news from Australian outlets" : "Your market in numbers"}
          </h1>
        </header>

        <nav className="cc-tabs max-w-md" role="tablist" aria-label="Market news">
          {(
            [
              ["news", "News"],
              ["market", "Your market"],
            ] as Array<[Tab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`cc-tab ${tab === id ? "is-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Both wait for the profile and the tracker: the profile so neither
            fetches twice, the tracker so the order doesn't reshuffle once its
            companies arrive. */}
        {!perso.loading && trackerReady && tab === "news" && (
          <NewsDesk
            scoreArticle={canFit ? perso.scoreArticle : null}
            profileText={profileText}
            role={profileRole}
            trackedCompanies={trackerCompanies}
            onAddRole={() => navigate("/settings")}
          />
        )}
        {!perso.loading && trackerReady && tab === "market" && (
          <MarketPanel profileRole={profileRole} suggestions={suggestions} trackedCompanies={trackerCompanies} />
        )}
      </div>
    </CraftAppLayout>
  );
}
