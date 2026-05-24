import { FileText, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { CraftButton } from "@/components/craft/AppPrimitives";

import type { ResumeSource, SavedResume } from "../types";

interface ResumeSelectorProps {
  savedResumes: SavedResume[];
  selectedResumeId: string;
  onSelectSaved: (id: string) => void;
  resumeText: string;
  fileName: string;
  resumeSource: ResumeSource;
  isUploading: boolean;
  onDrop: (files: File[]) => void;
  onClear: () => void;
}

export const ResumeSelector = ({
  savedResumes,
  selectedResumeId,
  onSelectSaved,
  resumeText,
  fileName,
  resumeSource,
  isUploading,
  onDrop,
  onClear,
}: ResumeSelectorProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
  });

  return (
    <section className="cc-card p-7 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="cc-label text-[color:var(--cc-rust)]">§ 01 · The draft</div>
          <h3 className="mt-3 cc-font-display text-2xl leading-tight">
            The <span className="cc-italic-wonk">résumé</span> to audit.
          </h3>
        </div>
        {resumeText && (
          <span className="cc-pill cc-pill-filled">On file</span>
        )}
      </div>

      <div className="space-y-5">
        {savedResumes.length > 0 && (
          <div>
            <label className="cc-label text-[color:var(--cc-ash)] block mb-2">
              Saved resumes
            </label>
            <select
              value={selectedResumeId}
              onChange={(e) => onSelectSaved(e.target.value)}
              className="cc-select"
            >
              <option value="">
                {resumeText
                  ? "Switch to another résumé…"
                  : "Pick a saved résumé…"}
              </option>
              {savedResumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.template_id ? " · template" : ""}
                </option>
              ))}
            </select>
            {!resumeText && (
              <div className="cc-dot-rule mt-6">
                <span>or upload new</span>
              </div>
            )}
          </div>
        )}

        {resumeText ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border border-[color:var(--cc-ink)] bg-[color:var(--cc-cream-2)] px-4 py-3">
              <FileText className="w-4 h-4 text-[color:var(--cc-rust)]" />
              <span className="cc-font-editorial italic text-[17px] flex-1 truncate text-[color:var(--cc-ink)]">
                {fileName || "Résumé on file"}
              </span>
              <span className="cc-pill">
                {resumeSource === "saved" ? "Saved" : "Upload"}
              </span>
            </div>

            <div className="border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] max-h-40 overflow-auto p-4">
              <pre className="whitespace-pre-wrap cc-font-mono text-[11px] leading-relaxed text-[color:var(--cc-ink-soft)]">
                {resumeText.slice(0, 600)}
                {resumeText.length > 600 ? "…" : ""}
              </pre>
            </div>

            <CraftButton variant="ghost" size="sm" onClick={onClear}>
              Clear the draft
            </CraftButton>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-cream-2)]"
                : "border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)]"
            }`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="py-4">
                <div className="w-10 h-10 border-2 border-[color:var(--cc-ink)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="cc-font-editorial italic text-[color:var(--cc-ink-soft)]">
                  Setting the type…
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-9 h-9 mx-auto mb-3 text-[color:var(--cc-ash)]" />
                <p className="cc-font-display text-xl leading-tight">
                  {isDragActive ? "Drop here" : "Upload a résumé"}
                </p>
                <p className="mt-2 cc-label text-[color:var(--cc-ash)]">
                  PDF · DOC · DOCX · PNG · JPG
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
