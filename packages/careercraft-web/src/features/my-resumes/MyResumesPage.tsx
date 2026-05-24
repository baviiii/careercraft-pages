import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  CraftAppBody,
  CraftAppHeader,
  CraftAppShell,
  CraftAppStats,
  CraftEmpty,
} from "@/components/craft/AppPrimitives";
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

  const downloadPdf = async (r: Resume) => {
    setIsExporting(true);
    try {
      const { pageCount } = await exportResumeToPdf({ resume: r });
      toast({
        title: "PDF downloaded",
        description: `High-quality export · ${pageCount} page${
          pageCount > 1 ? "s" : ""
        }`,
      });
    } catch (e: any) {
      toast({
        title: "Export failed",
        description: e?.message || "Open the builder to export instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  /* ───── Loading state ─────────────────────────────────────── */
  if (loading) {
    return (
      <CraftAppShell>
        <div className="min-h-screen grid place-items-center">
          <div className="text-center">
            <div className="cc-label text-[color:var(--cc-rust)] mb-3">
              § Loading your resumes
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
        kicker="§ 02 · My resumes"
        title={
          <>
            Your <span className="cc-italic-wonk">saved</span>
            <br />
            résumés.
          </>
        }
        sub="Every version of you — tagged, dated, ready to reopen."
        ctaLabel="New resume"
        onCta={() => goToBuilder()}
      />

      <CraftAppBody className="!py-8 md:!py-10">
        {/* Stats */}
        <CraftAppStats
          stats={[
            { label: "Total resumes", value: stats.total, note: "saved" },
            { label: "Favourites", value: stats.favorites, note: "starred" },
            { label: "Tags used", value: stats.tags, note: "distinct" },
            { label: "This week", value: stats.recent, note: "edited" },
          ]}
        />

        {/* Filters */}
        <div className="mt-10">
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
            onSortByChange={(v) => setFilters((f) => ({ ...f, sortBy: v }))}
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

        {/* List / grid */}
        <section className="mt-10">
          {filteredResumes.length === 0 ? (
            <CraftEmpty
              kicker={
                resumes.length === 0 ? "§ No resumes yet" : "§ Nothing found"
              }
              title={
                resumes.length === 0 ? (
                  <>
                    Start with a <span className="cc-italic-wonk">clean</span>{" "}
                    sheet.
                  </>
                ) : (
                  <>No resumes match these filters.</>
                )
              }
              body={
                resumes.length === 0
                  ? "One résumé per chapter. Keep drafts — you'll revise you as often as you revise them."
                  : "Loosen the search, clear a filter, or pick another category."
              }
              ctaLabel={resumes.length === 0 ? "Draft the first one" : undefined}
              onCta={resumes.length === 0 ? () => goToBuilder() : undefined}
            />
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <AnimatePresence initial={false}>
                {filteredResumes.map((r, i) => (
                  <ResumeCard
                    key={r.id}
                    resume={r}
                    index={i}
                    onPreview={setPreviewTarget}
                    onEdit={goToBuilder}
                    onAnalyze={goToAnalysis}
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
            <div className="border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream)]">
              <AnimatePresence initial={false}>
                {filteredResumes.map((r, i) => (
                  <ResumeRow
                    key={r.id}
                    resume={r}
                    index={i}
                    onPreview={setPreviewTarget}
                    onEdit={goToBuilder}
                    onAnalyze={goToAnalysis}
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

        {/* Pagination hint / ruler */}
        {filteredResumes.length > 0 && (
          <div className="mt-12 cc-dot-rule">
            <span>end of register</span>
            <span className="cc-tabular">
              {filteredResumes.length} of {resumes.length}
            </span>
          </div>
        )}
      </CraftAppBody>

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
    </CraftAppShell>
  );
}
