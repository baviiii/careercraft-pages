import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { CraftAppLayout } from "@/components/craft/CraftAppLayout";
import { CraftEmpty } from "@/components/craft/AppPrimitives";
import { CraftSpinner } from "@/components/craft/CraftSpinner";
import { useToast } from "@/hooks/use-toast";
import { exportResumeToPdf } from "@/lib/pdfExport";

import { ResumeCard } from "./components/ResumeCard";
import { ResumeFilterBar } from "./components/ResumeFilterBar";
import { ResumeRow } from "./components/ResumeRow";
import { DeleteResumeDialog } from "./dialogs/DeleteResumeDialog";
import { PreviewResumeDialog } from "./dialogs/PreviewResumeDialog";
import { TagResumeDialog } from "./dialogs/TagResumeDialog";
import { useResumes } from "./hooks/useResumes";
import type { Resume, ViewMode } from "./types";
import { editedLabel } from "./types";
import "./my-resumes.css";

export default function MyResumesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    loading,
    resumes,
    allTags,
    filteredResumes,
    stats,
    filters,
    setFilters,
    mutations,
  } = useResumes();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);
  const [tagTarget, setTagTarget] = useState<Resume | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Resume | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const goToBuilder = (r?: Resume) => {
    if (r) {
      sessionStorage.setItem("atsResumeData", JSON.stringify(r.content));
      if (r.template_id) sessionStorage.setItem("atsResumeTemplate", r.template_id);
      sessionStorage.setItem("atsResumeName", r.name);
      sessionStorage.setItem("atsResumeId", r.id);
      navigate(`/builder?from=manager&id=${r.id}`);
    } else {
      navigate("/builder");
    }
  };

  const goToAnalysis = (r: Resume) => navigate(`/analysis?id=${r.id}`);
  const goToCoverLetter = (r: Resume) => navigate(`/cover-letter?resume=${r.id}`);

  const downloadPdf = async (r: Resume) => {
    setIsExporting(true);
    try {
      const { pageCount } = await exportResumeToPdf({ resume: r });
      toast({
        title: "PDF downloaded",
        description: `${pageCount} page${pageCount > 1 ? "s" : ""}.`,
      });
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message || "Try again, or download it from the builder.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const lastEdited = resumes.reduce<string | null>(
    (latest, r) => (!latest || r.updated_at > latest ? r.updated_at : latest),
    null,
  );
  const headline = [
    `${stats.total} résumé${stats.total === 1 ? "" : "s"}`,
    stats.favorites > 0 && `${stats.favorites} favourite${stats.favorites === 1 ? "" : "s"}`,
    lastEdited && `last ${editedLabel(lastEdited)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  /* ───── Loading state ─────────────────────────────────────── */
  if (loading) {
    return (
      <CraftAppLayout>
        <div className="grid place-items-center py-32">
          <div className="text-center">
            <div className="cc-kicker mb-3">Loading your résumés</div>
            <div className="flex justify-center">
              <CraftSpinner label="Loading your résumés" />
            </div>
          </div>
        </div>
      </CraftAppLayout>
    );
  }

  return (
    <CraftAppLayout
      topBarLeft={
        <div className="cc-label-sm text-[color:var(--cc-ash)]">My résumés</div>
      }
      headerActions={
        <button onClick={() => goToBuilder()} className="cc-action cc-action--sm">
          <Plus className="h-3.5 w-3.5" /> New résumé
        </button>
      }
    >
      <div className="cc-shelf">
      <header className="mb-8">
        <div className="cc-kicker">My résumés</div>
        <h1 className="mt-3 cc-font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
          Your résumés
        </h1>
        {resumes.length > 0 && (
          <p className="mt-3 cc-font-sans text-base text-[color:var(--cc-ink-soft)] md:text-lg">{headline}</p>
        )}
      </header>

        {/* Filters */}
        {resumes.length > 0 && (
        <div>
          <ResumeFilterBar
            search={filters.search}
            onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
            category={filters.category}
            onCategoryChange={(v) => setFilters((f) => ({ ...f, category: v }))}
            tag={filters.tag}
            onTagChange={(v) => setFilters((f) => ({ ...f, tag: v }))}
            allTags={allTags}
            favoritesOnly={filters.favoritesOnly}
            onFavoritesOnlyToggle={() =>
              setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))
            }
            sortBy={filters.sortBy}
            // Each sort starts the natural way round: names A to Z, dates newest first.
            onSortByChange={(v) =>
              setFilters((f) => ({ ...f, sortBy: v, sortOrder: v === "name" ? "asc" : "desc" }))
            }
            sortOrder={filters.sortOrder}
            onSortOrderToggle={() =>
              setFilters((f) => ({
                ...f,
                sortOrder: f.sortOrder === "asc" ? "desc" : "asc",
              }))
            }
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
        )}

        {/* List / grid */}
        <section className="mt-7">
          {resumes.length === 0 ? (
            <CraftEmpty
              kicker="My résumés"
              title="No résumés yet."
              body="Start from nothing, or upload the one you have and we'll lay it out for you."
              ctaLabel="Start a résumé"
              onCta={() => goToBuilder()}
            />
          ) : filteredResumes.length === 0 ? (
            <p className="rounded-2xl border border-[color:var(--cc-hair)] bg-white px-5 py-6 cc-font-sans text-[15px] text-[color:var(--cc-ink-soft)]">
              Nothing matches that.{" "}
              <button
                type="button"
                className="cc-link text-[color:var(--cc-ink)]"
                onClick={() => setFilters((f) => ({ ...f, search: "", category: "all", tag: "all", favoritesOnly: false }))}
              >
                Show everything
              </button>
            </p>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence initial={false}>
                {filteredResumes.map((r, i) => (
                  <ResumeCard
                    key={r.id}
                    resume={r}
                    index={i}
                    onPreview={setPreviewTarget}
                    onEdit={goToBuilder}
                    onAnalyze={goToAnalysis}
                    onCoverLetter={goToCoverLetter}
                    onDownload={downloadPdf}
                    onDuplicate={mutations.duplicateResume}
                    onManageTags={setTagTarget}
                    onToggleFavorite={mutations.toggleFavorite}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--cc-hair)] bg-white">
              <AnimatePresence initial={false}>
                {filteredResumes.map((r, i) => (
                  <ResumeRow
                    key={r.id}
                    resume={r}
                    index={i}
                    onPreview={setPreviewTarget}
                    onEdit={goToBuilder}
                    onAnalyze={goToAnalysis}
                    onCoverLetter={goToCoverLetter}
                    onDownload={downloadPdf}
                    onDuplicate={mutations.duplicateResume}
                    onManageTags={setTagTarget}
                    onToggleFavorite={mutations.toggleFavorite}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {filteredResumes.length > 0 && filteredResumes.length < resumes.length && (
          <p className="mt-4 cc-font-sans text-[13px] text-[color:var(--cc-ash)]">
            Showing {filteredResumes.length} of {resumes.length}.
          </p>
        )}
      </div>

      {/* Dialogs */}
      <DeleteResumeDialog
        resume={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await mutations.deleteResume(deleteTarget);
          setDeleteTarget(null);
        }}
      />

      <TagResumeDialog
        resume={tagTarget}
        open={!!tagTarget}
        onOpenChange={(o) => !o && setTagTarget(null)}
        onSave={async (tags) => {
          if (tagTarget) await mutations.updateTags(tagTarget, tags);
          setTagTarget(null);
        }}
      />

      <PreviewResumeDialog
        resume={previewTarget}
        open={!!previewTarget}
        onOpenChange={(o) => !o && setPreviewTarget(null)}
        exporting={isExporting}
        onEdit={(r) => {
          setPreviewTarget(null);
          goToBuilder(r);
        }}
        onAnalyze={(r) => {
          setPreviewTarget(null);
          goToAnalysis(r);
        }}
        onDownload={downloadPdf}
      />
    </CraftAppLayout>
  );
}
