import { FileText, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

import type { ResumeSource, SavedResume } from "../types";
import { Ready } from "./proof";

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
    <section className="cc-surface p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h3 className="cc-font-display text-[22px] leading-tight text-[color:var(--cc-ink)]">
          Your résumé
        </h3>
        {resumeText && <Ready>Added</Ready>}
      </div>

      <div className="space-y-5">
        {savedResumes.length > 0 && (
          <div>
            <label className="cc-label-sm text-[color:var(--cc-ash)] block mb-2">
              Saved résumés
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
            <div className="flex items-center gap-3 rounded-xl bg-[color:var(--cc-cream-2)] px-4 py-3">
              <FileText className="w-4 h-4 shrink-0 text-[color:var(--cc-rust)]" />
              <span className="text-[15px] font-medium flex-1 truncate text-[color:var(--cc-ink)]">
                {fileName || "Résumé"}
              </span>
              <span className="text-[12px] text-[color:var(--cc-ash)]">
                {resumeSource === "saved" ? "Saved" : "Uploaded"}
              </span>
            </div>

            <div className="cc-proof-sheet max-h-40 overflow-auto p-4 !text-[12.5px] !leading-relaxed !text-[color:var(--cc-ink-soft)]">
              <div className="whitespace-pre-wrap">
                {resumeText.slice(0, 600)}
                {resumeText.length > 600 ? "…" : ""}
              </div>
            </div>

            <button className="cc-action cc-action--ghost cc-action--sm" onClick={onClear}>
              Remove
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`rounded-[1.25rem] border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-[color:var(--cc-rust)] bg-[color:var(--cc-rust-soft)]"
                : "border-[color:var(--cc-hair-strong)] hover:border-[color:var(--cc-ink)] hover:bg-[color:var(--cc-cream-2)]"
            }`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="py-4">
                <div className="w-10 h-10 border-2 border-[color:var(--cc-ink)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[14px] text-[color:var(--cc-ink-soft)]">
                  Reading file…
                </p>
              </div>
            ) : (
              <>
                <Upload className="w-9 h-9 mx-auto mb-3 text-[color:var(--cc-ash)]" />
                <p className="cc-font-display text-xl leading-tight">
                  {isDragActive ? "Drop here" : "Upload a résumé"}
                </p>
                <p className="mt-2 cc-label-sm text-[color:var(--cc-ash)]">
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
