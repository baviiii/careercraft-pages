import { AnimatePresence } from "framer-motion";
import { useState } from "react";

import {
  CraftAppBody,
  CraftAppHeader,
  CraftAppShell,
  CraftEmpty,
} from "@/components/craft/AppPrimitives";

import { JobCard } from "./components/JobCard";
import { JobDetailPanel } from "./components/JobDetailPanel";
import { JobFilterBar } from "./components/JobFilterBar";
import { JobStatsStrip } from "./components/JobStatsStrip";
import { AddJobDialog } from "./dialogs/AddJobDialog";
import { DeleteJobDialog } from "./dialogs/DeleteJobDialog";
import { EditJobDialog } from "./dialogs/EditJobDialog";
import { useJobTracker } from "./hooks/useJobTracker";
import type { JobApplication } from "./types";

export default function JobTrackerPage() {
  const {
    loading,
    applications,
    filteredApplications,
    resumes,
    coverLetters,
    stats,
    filters,
    setFilters,
    getResumeName,
    mutations,
  } = useJobTracker();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobApplication | null>(null);
  const [viewTarget, setViewTarget] = useState<JobApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null);

  /* ───── Loading state ─────────────────────────────────────── */
  if (loading) {
    return (
      <CraftAppShell>
        <div className="min-h-screen grid place-items-center">
          <div className="text-center">
            <div className="cc-label text-[color:var(--cc-rust)] mb-3">
              § Opening the ledger
            </div>
            <div className="w-10 h-10 border-2 border-[color:var(--cc-ink)] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </CraftAppShell>
    );
  }

  return (
    <CraftAppShell>
      <CraftAppHeader
        kicker="§ 03 · The ledger"
        title={
          <>
            The <span className="cc-italic-wonk">ledger</span> of your
            <br />
            applications, kept true.
          </>
        }
        sub="Every dispatch, every reply, every offer — lined up like entries in a ship's log."
        ctaLabel="Log an application"
        onCta={() => setAddOpen(true)}
      />

      <CraftAppBody className="!py-8 md:!py-10">
        <JobStatsStrip
          total={stats.total}
          applied={stats.applied}
          interview={stats.interview}
          offer={stats.offer}
        />

        {/* Filters */}
        <div className="mt-10">
          <JobFilterBar
            search={filters.search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            status={filters.status}
            onStatusChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
        </div>

        {/* Pipeline */}
        <section className="mt-10">
          {filteredApplications.length === 0 ? (
            <CraftEmpty
              kicker={
                applications.length === 0
                  ? "§ A fresh ledger"
                  : "§ Nothing on file"
              }
              title={
                applications.length === 0 ? (
                  <>
                    Start with a{" "}
                    <span className="cc-italic-wonk">first dispatch</span>.
                  </>
                ) : (
                  <>No entries match these filters.</>
                )
              }
              body={
                applications.length === 0
                  ? "One entry per application. Keep the record true — you'll thank yourself when the replies start coming in."
                  : "Loosen the search, or reset the status filter to see every line."
              }
              ctaLabel={
                applications.length === 0 ? "Log the first one" : undefined
              }
              onCta={applications.length === 0 ? () => setAddOpen(true) : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence initial={false}>
                {filteredApplications.map((app, i) => (
                  <JobCard
                    key={app.id}
                    application={app}
                    index={i}
                    resumeName={getResumeName(app.resume_id)}
                    hasCoverLetter={Boolean(app.cover_letter_id)}
                    onView={setViewTarget}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {filteredApplications.length > 0 && (
          <div className="mt-12 cc-dot-rule">
            <span>end of ledger</span>
            <span className="cc-tabular">
              {filteredApplications.length} of {applications.length}
            </span>
          </div>
        )}
      </CraftAppBody>

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
    </CraftAppShell>
  );
}
