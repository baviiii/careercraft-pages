import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CraftAppLayout } from "@/components/craft/CraftAppLayout";
import { CraftEmpty } from "@/components/craft/AppPrimitives";
import { usePersonalization } from "@/hooks/usePersonalization";

import { AutomationDialog } from "./components/AutomationDialog";
import { AutomationStrip } from "./components/AutomationStrip";
import { JobCard } from "./components/JobCard";
import { JobDetailPanel } from "./components/JobDetailPanel";
import { JobFilterBar } from "./components/JobFilterBar";
import { LedgerRule } from "./components/LedgerRule";
import { LedgerSummary } from "./components/LedgerSummary";
import { WireDispatch } from "./components/WireDispatch";
import { AddJobDialog } from "./dialogs/AddJobDialog";
import { DeleteJobDialog } from "./dialogs/DeleteJobDialog";
import { EditJobDialog } from "./dialogs/EditJobDialog";
import { useJobAutomation } from "./hooks/useJobAutomation";
import { useJobDiscovery } from "./hooks/useJobDiscovery";
import { useJobTracker } from "./hooks/useJobTracker";
import {
  STATUS_ACCENT,
  STATUS_META,
  STATUS_ORDER,
} from "./types";
import type { ApplicationStatus, JobApplication } from "./types";

export default function JobTrackerPage() {
  const navigate = useNavigate();
  const {
    loading,
    applications,
    resumes,
    coverLetters,
    stats,
    filters,
    setFilters,
    getResumeName,
    refreshApplications,
    mutations,
  } = useJobTracker();
  const perso = usePersonalization();
  // Only send a real city — never the "australia" fallback. Adzuna stores
  // state names ("New South Wales", "Victoria"), so a country-wide `ilike`
  // filter matches almost nothing and silently empties the feed.
  const personalizedCity = (
    perso.profile.preferredLocations[0] ||
    perso.profile.location ||
    ""
  )
    .split(",")[0]
    .trim();
  const discovery = useJobDiscovery(refreshApplications, {
    query: perso.hasPersonalizationData ? perso.getPersonalizedJobQuery() : undefined,
    location:
      perso.hasPersonalizationData && personalizedCity ? personalizedCity : undefined,
    // The alternate phrasings, when onboarding produced them. Falls back to the
    // single title above for anyone who onboarded before this existed.
    terms: perso.profile.searchTerms?.length ? perso.profile.searchTerms : undefined,
    profileText: perso.hasPersonalizationData
      ? perso.getProfileEmbeddingText() ?? undefined
      : undefined,
    ready: !perso.loading,
  });
  const automation = useJobAutomation();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobApplication | null>(null);
  const [viewTarget, setViewTarget] = useState<JobApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);
  const [automationOpen, setAutomationOpen] = useState(false);

  const searchFilteredApplications = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(
      (a) =>
        a.company.toLowerCase().includes(q) ||
        a.job_title.toLowerCase().includes(q),
    );
  }, [applications, filters.search]);

  const pipelineApplications = useMemo(() => {
    if (filters.status === "all") return searchFilteredApplications;
    return searchFilteredApplications.filter((a) => a.status === filters.status);
  }, [filters.status, searchFilteredApplications]);

  const lanes = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        items: pipelineApplications.filter((a) => a.status === status),
      })),
    [pipelineApplications],
  );

  // Rank the discovery feed by how well each role fits the profile (target
  // role, location, salary, remote pref) so the strongest matches sit on top,
  // instead of the raw date order the catalog returns.
  const rankedDiscoveryJobs = useMemo(() => {
    if (!perso.hasPersonalizationData) return discovery.jobs;
    return [...discovery.jobs]
      .map((job) => ({
        job,
        score: perso.isJobRecommended({
          title: job.title,
          company: job.company,
          location: job.location ?? undefined,
          salaryMin: job.salary_min ?? undefined,
          salaryMax: job.salary_max ?? undefined,
          salaryIsPredicted: job.salary_is_predicted,
          category: job.category ?? undefined,
          /* Was passing no text at all, so the skills signal could not fire
             here even in principle. The snippet is short, but a job title plus
             two sentences still names the skills that matter. */
          description: job.description_snippet ?? undefined,
          isRemote: job.is_remote,
          similarity: job.similarity,
        }).score,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.job);
  }, [discovery.jobs, perso.hasPersonalizationData, perso.isJobRecommended]);

  useEffect(() => {
    automation.loadSettings().catch(() => undefined);
  }, [automation.loadSettings]);

  useEffect(() => {
    if (!viewTarget) return;
    automation.loadEvents(viewTarget.id).catch(() => undefined);
  }, [viewTarget, automation.loadEvents]);

  /* Hand an application to the real analyser rather than scoring it here.
     /analysis already reads both of these on mount — `?id=` preselects the
     saved résumé (useAnalysis.ts), and the `jobDescription` sessionStorage key
     prefills the textarea — so the user arrives with the work done and can
     paste over the description when the job board only gave an extract.

     sessionStorage rather than route state because that is the channel
     /analysis already listens on, and it survives the page's own reloads. */
  const analyseApplication = useCallback(
    (app: JobApplication) => {
      try {
        sessionStorage.setItem("jobDescription", app.job_description ?? "");
      } catch {
        /* Private mode or a full quota. The page still opens; they paste. */
      }
      navigate(app.resume_id ? `/analysis?id=${app.resume_id}` : "/analysis");
    },
    [navigate],
  );

  /* ───── Loading state ─────────────────────────────────────── */
  if (loading) {
    return (
      <CraftAppLayout>
        <div className="grid place-items-center py-32">
          <div className="text-center">
            <div className="cc-kicker mb-3">Loading applications</div>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--cc-hair-strong)] border-t-[color:var(--cc-rust)]" />
          </div>
        </div>
      </CraftAppLayout>
    );
  }

  const total = applications.length;
  const visible = pipelineApplications.length;

  return (
    <CraftAppLayout
      topBarLeft={
        <div className="cc-label-sm text-[color:var(--cc-ash)]">Job tracker</div>
      }
      headerActions={
        <button onClick={() => setAddOpen(true)} className="cc-action cc-action--sm">
          File application <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      }
    >
      <header className="mb-9">
        <div className="cc-kicker">Job tracker</div>
        <h1 className="mt-3 cc-font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
          Track every job in <span className="cc-italic-wonk">one</span> clear board.
        </h1>
        <p className="mt-4 max-w-2xl cc-font-editorial text-lg text-[color:var(--cc-ink-soft)] md:text-xl">
          Log applications, move them through stages, and spot what needs action today.
        </p>
      </header>

      <div className="space-y-12" data-ds-tokenized="true">
        {/* ── § A. LEDGER SUMMARY ─────────────────────────────────────── */}
        <section className="space-y-4">
          <LedgerRule
            mark="§"
            label="Overview"
            right={`${String(total).padStart(2, "0")} applications`}
          />
          <LedgerSummary applications={applications} stats={stats} />
        </section>

        {/* ── § B. PIPELINE ───────────────────────────────────────────── */}
        <section className="space-y-5">
          <LedgerRule
            mark="¶"
            label="Pipeline"
            right={
              filters.status === "all" ? (
                <>
                  {visible} / {total} visible
                </>
              ) : (
                `Showing ${STATUS_META[filters.status as ApplicationStatus].label}`
              )
            }
          />

          <JobFilterBar
            search={filters.search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            status={filters.status}
            onStatusChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />

          {pipelineApplications.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[
                { n: "Step 1", t: "Find a role using search and status filters." },
                { n: "Step 2", t: "Open a card to review notes, fit score, and timeline." },
                { n: "Step 3", t: "Use card actions to move status as your process changes." },
              ].map((s) => (
                <div key={s.n} className="cc-surface p-4">
                  <div className="cc-font-sans text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--cc-ash)]">
                    {s.n}
                  </div>
                  <p className="mt-1 cc-font-sans text-sm text-[color:var(--cc-ink-soft)]">
                    {s.t}
                  </p>
                </div>
              ))}
            </div>
          )}

          {pipelineApplications.length === 0 ? (
            <CraftEmpty
              kicker={
                applications.length === 0
                  ? "No applications yet"
                  : "No matches"
              }
              title={
                applications.length === 0 ? (
                  <>
                    File your first application.
                  </>
                ) : (
                  <>No applications match these filters.</>
                )
              }
              body={
                applications.length === 0
                  ? "One entry per application. Keep it current and the ledger will start telling its own story."
                  : "Clear search or switch status to see more applications."
              }
              ctaLabel={
                applications.length === 0 ? "File your first" : undefined
              }
              onCta={applications.length === 0 ? () => setAddOpen(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
              {lanes.map((lane, laneIndex) => {
                const accent = STATUS_ACCENT[lane.status];
                const meta = STATUS_META[lane.status];
                return (
                  <motion.div
                    key={lane.status}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: laneIndex * 0.05, duration: 0.4 }}
                    className="cc-surface overflow-hidden"
                  >
                    {/* Lane header */}
                    <header
                      className="flex items-center justify-between border-b px-4 py-3"
                      style={{
                        borderColor: "var(--cc-hair)",
                        background: `linear-gradient(90deg, ${accent.soft} 0%, transparent 70%)`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="cc-font-display italic text-base leading-none w-6 h-6 grid place-items-center"
                          style={{
                            color: accent.deep,
                            fontVariationSettings: "'SOFT' 100, 'WONK' 1",
                          }}
                          aria-hidden
                        >
                          {accent.mark}
                        </span>
                        <div>
                          <div
                            className="cc-font-sans text-sm font-semibold"
                            style={{ color: accent.deep }}
                          >
                            {meta.label}
                          </div>
                          <div className="cc-font-sans text-xs text-[color:var(--cc-ash)]">
                            {accent.note}
                          </div>
                        </div>
                      </div>
                      <span
                        className="cc-font-sans cc-tabular text-2xl font-semibold leading-none"
                        style={{ color: accent.deep }}
                      >
                        {String(lane.items.length).padStart(2, "0")}
                      </span>
                    </header>

                    <div className="p-3 space-y-3 min-h-[120px]">
                      {lane.items.length === 0 ? (
                        <div className="border border-dashed border-[color:var(--cc-hair-strong)] py-8 px-3 text-center cc-font-sans text-sm text-[color:var(--cc-ash)]">
                          No applications in this stage yet.{" "}
                          <button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className="cc-link"
                            style={{ color: accent.deep }}
                          >
                            file one
                          </button>
                        </div>
                      ) : (
                        <AnimatePresence initial={false}>
                          {lane.items.map((app, i) => (
                            <JobCard
                              key={app.id}
                              application={app}
                              index={i}
                              resumeName={getResumeName(app.resume_id)}
                              hasCoverLetter={Boolean(app.cover_letter_id)}
                              onView={setViewTarget}
                              onEdit={setEditTarget}
                              onDelete={setDeleteTarget}
                              onStatusChange={mutations.updateStatus}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── § C. AUTOMATION ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <LedgerRule mark="⚙" label="Automation" accent="ash" />
          <AutomationStrip
            settings={automation.settings}
            onConfigure={() => setAutomationOpen(true)}
          />
        </section>

        {/* ── § D. DISCOVERY (Adzuna feed) ────────────────────────────── */}
        <section className="space-y-5">
          <LedgerRule
            mark="✺"
            label="Job discovery"
            right={discovery.jobs.length > 0 ? `${discovery.jobs.length} results` : "—"}
          />
          <WireDispatch
            jobs={rankedDiscoveryJobs}
            filters={discovery.filters}
            setFilters={discovery.setFilters}
            isLoading={discovery.isLoading}
            isIngesting={discovery.isIngesting}
            lastIngestSummary={discovery.lastIngestSummary}
            onSearch={discovery.listJobs}
            onRefresh={discovery.ingest}
            onSave={discovery.saveToTracker}
          />
        </section>

        {/* End rule */}
        {pipelineApplications.length > 0 && (
          <div className="flex items-center justify-between border-t border-[color:var(--cc-hair)] pt-3 cc-font-sans text-xs text-[color:var(--cc-ash)]">
            <span>Board summary</span>
            <span className="cc-tabular">
              {visible} of {total}
            </span>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AddJobDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        resumes={resumes}
        coverLetters={coverLetters}
        onSubmit={mutations.createApplication}
      />

      <EditJobDialog
        application={editTarget}
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        resumes={resumes}
        coverLetters={coverLetters}
        onSubmit={mutations.updateApplication}
      />

      <JobDetailPanel
        application={viewTarget}
        open={!!viewTarget}
        onOpenChange={(o) => !o && setViewTarget(null)}
        resumeName={viewTarget ? getResumeName(viewTarget.resume_id) : null}
        hasCoverLetter={Boolean(viewTarget?.cover_letter_id)}
        onEdit={setEditTarget}
        events={viewTarget ? automation.eventsByApplication[viewTarget.id] || [] : []}
        onAnalyse={analyseApplication}
        onLoadTimeline={(id) => automation.loadEvents(id).then(() => undefined)}
        onClassifyEmail={(id, subject, body, requireConfirm) =>
          automation.classifyEmail(id, subject, body, requireConfirm)
        }
        onConfirmStatusUpdate={(id, status) =>
          automation.confirmStatusUpdate(id, status)
        }
      />

      <DeleteJobDialog
        application={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await mutations.deleteApplication(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <AutomationDialog
        open={automationOpen}
        onOpenChange={setAutomationOpen}
        settings={automation.settings}
        isBusy={automation.isBusy}
        onSave={automation.saveSettings}
      />
    </CraftAppLayout>
  );
}
