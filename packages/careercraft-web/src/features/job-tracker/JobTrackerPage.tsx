import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { CraftAppLayout } from "@/components/craft/CraftAppLayout";
import { CraftEmpty } from "@/components/craft/AppPrimitives";
import { letterLabel } from "@/features/cover-letter/lib/letterLabel";
import { usePersonalization } from "@/hooks/usePersonalization";

import { JobDetailPanel } from "./components/JobDetailPanel";
import { JobFilterBar } from "./components/JobFilterBar";
import { TrackerBoard } from "./components/TrackerBoard";
import { UpNext } from "./components/UpNext";
import { WireDispatch } from "./components/WireDispatch";
import { AddJobDialog } from "./dialogs/AddJobDialog";
import { DeleteJobDialog } from "./dialogs/DeleteJobDialog";
import { EditJobDialog } from "./dialogs/EditJobDialog";
import { useJobAutomation } from "./hooks/useJobAutomation";
import { useJobDiscovery } from "./hooks/useJobDiscovery";
import { useJobTracker } from "./hooks/useJobTracker";
import { confettiFrom, firstCelebration } from "./lib/confetti";
import { importToForm, takePendingImport, type JobImport } from "./lib/jobImport";
import { STATUS_ORDER } from "./types";
import type { ApplicationStatus, JobApplication } from "./types";
import "./tracker.css";

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
  /* A job captured by the browser extension (via /save-job) opens Add Job
     pre-filled, once the tracker has loaded. */
  const [captured, setCaptured] = useState<JobImport | null>(null);
  useEffect(() => {
    if (loading) return;
    const job = takePendingImport();
    if (job) {
      setCaptured(job);
      setAddOpen(true);
    }
  }, [loading]);
  const [editTarget, setEditTarget] = useState<JobApplication | null>(null);
  const [viewTarget, setViewTarget] = useState<JobApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);

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

  /* The cover letter desk loads the application itself from the id, prefills
     its ad and résumé, and attaches the letter here when it's saved. */
  const writeCoverLetter = useCallback(
    (app: JobApplication) => navigate(`/cover-letter?application=${app.id}`),
    [navigate],
  );
  const openCoverLetter = useCallback(
    (letterId: string) => navigate(`/cover-letter?letter=${letterId}`),
    [navigate],
  );
  /* The detail panel reads the live row, so a move made from inside it (or
     anywhere else) shows straight away. */
  const viewing = useMemo(
    () => (viewTarget ? applications.find((a) => a.id === viewTarget.id) ?? viewTarget : null),
    [viewTarget, applications],
  );

  const viewLetter = useMemo(() => {
    const id = viewing?.cover_letter_id;
    const cl = id ? coverLetters.find((c) => c.id === id) : undefined;
    return cl && viewing
      ? { id: cl.id, label: letterLabel(cl, viewing), excerpt: cl.content }
      : null;
  }, [viewing, coverLetters]);

  /* Every stage change goes through here: the card's button and menu, the
     detail panel, and drag and drop. The first time a job reaches Offer it
     gets a second of confetti (skipped under reduce motion). */
  const moveTo = useCallback(
    async (id: string, status: ApplicationStatus) => {
      const from = applications.find((a) => a.id === id)?.status;
      if (!from || from === status) return;
      await mutations.updateStatus(id, status);
      if (status === "offer" && firstCelebration(id)) {
        window.setTimeout(
          () => confettiFrom(document.querySelector(`[data-card-id="${id}"]`)),
          450,
        );
      }
    },
    [applications, mutations],
  );

  /* ───── Loading state ─────────────────────────────────────── */
  if (loading) {
    return (
      <CraftAppLayout>
        <div className="grid place-items-center py-32">
          <div className="text-center">
            <div className="cc-kicker mb-3">Loading your board</div>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--cc-hair-strong)] border-t-[color:var(--cc-rust)] motion-reduce:[animation-duration:1.8s]" />
          </div>
        </div>
      </CraftAppLayout>
    );
  }

  const total = applications.length;
  const onTheGo = stats.saved + stats.applied + stats.interview;
  const sent = total - stats.saved;
  const heardBack = stats.interview + stats.offer + stats.rejected;
  const headline = [
    `${onTheGo} on the go`,
    stats.interview > 0 && `${stats.interview} interview${stats.interview === 1 ? "" : "s"} lined up`,
    stats.offer > 0 && `${stats.offer} offer${stats.offer === 1 ? "" : "s"}`,
    sent > 0 && `heard back from ${heardBack} of ${sent} sent`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <CraftAppLayout
      topBarLeft={
        <div className="cc-label-sm text-[color:var(--cc-ash)]">Job tracker</div>
      }
      headerActions={
        <button onClick={() => setAddOpen(true)} className="cc-action cc-action--sm">
          <Plus className="h-3.5 w-3.5" /> Add a job
        </button>
      }
    >
      <div className="cc-board space-y-10">
        <header>
          <div className="cc-kicker">Job tracker</div>
          <h1 className="mt-3 cc-font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
            Your job hunt
          </h1>
          {total > 0 && (
            <p className="mt-3 cc-font-sans text-base text-[color:var(--cc-ink-soft)] md:text-lg">
              {headline}
            </p>
          )}
        </header>

        {total === 0 ? (
          <CraftEmpty
            kicker="Job tracker"
            title="Your board's empty."
            body="Add a job you're eyeing, save one from Find more jobs below, or use the Faircopy browser button on any job ad."
            ctaLabel="Add a job"
            onCta={() => setAddOpen(true)}
          />
        ) : (
          <>
            <UpNext
              applications={applications}
              onOpen={setViewTarget}
              onShowSaved={() => setFilters((f) => ({ ...f, status: "saved" }))}
            />

            <section aria-label="Your board" className="space-y-4">
              <JobFilterBar
                search={filters.search}
                onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
                status={filters.status}
                onStatusChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              />

              {pipelineApplications.length === 0 ? (
                <p className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-5 py-6 cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)]">
                  Nothing matches that.{" "}
                  <button
                    type="button"
                    className="cc-link text-[color:var(--cc-ink)]"
                    onClick={() => setFilters({ search: "", status: "all" })}
                  >
                    Show everything
                  </button>
                </p>
              ) : (
                <TrackerBoard
                  lanes={lanes}
                  getResumeName={getResumeName}
                  onView={setViewTarget}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                  onMove={(id, status) => void moveTo(id, status)}
                />
              )}
            </section>
          </>
        )}

        <section aria-labelledby="find-jobs-title" className="space-y-4">
          <h2 id="find-jobs-title" className="cc-font-display text-xl tracking-tight">
            Find more jobs
          </h2>
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
      </div>

      {/* Dialogs */}
      <AddJobDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) setCaptured(null);
        }}
        resumes={resumes}
        coverLetters={coverLetters}
        onSubmit={mutations.createApplication}
        initial={captured ? importToForm(captured) : null}
        sourceLabel={captured?.source}
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
        application={viewing}
        open={!!viewing}
        onOpenChange={(o) => !o && setViewTarget(null)}
        resumeName={viewing ? getResumeName(viewing.resume_id) : null}
        hasCoverLetter={Boolean(viewing?.cover_letter_id)}
        coverLetter={viewLetter}
        onEdit={setEditTarget}
        onStatusChange={(id, status) => void moveTo(id, status)}
        events={viewing ? automation.eventsByApplication[viewing.id] || [] : []}
        onAnalyse={analyseApplication}
        onWriteCoverLetter={writeCoverLetter}
        onOpenCoverLetter={openCoverLetter}
        onLoadTimeline={(id) => automation.loadEvents(id).then(() => undefined)}
        onClassifyEmail={(id, subject, body, requireConfirm) =>
          automation.classifyEmail(id, subject, body, requireConfirm)
        }
        onConfirmStatusUpdate={async (id, status) => {
          // The move happens server-side; pull the board so the card follows.
          await automation.confirmStatusUpdate(id, status);
          await refreshApplications();
        }}
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
    </CraftAppLayout>
  );
}
