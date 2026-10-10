import { ExternalLink, Loader2, PenLine } from "lucide-react";

import { CraftButton } from "@/components/craft/AppPrimitives";

import { FULL_AD_CHARS, TONES, type LetterTone, type ResumeOption } from "../types";

const PASTE = "__paste__";

interface BriefPanelProps {
  resumes: ResumeOption[];
  /** "" when the résumé is pasted rather than picked. */
  resumeId: string;
  onPickResume: (id: string) => void;
  resumeText: string;
  onResumeText: (text: string) => void;
  ad: string;
  onAd: (text: string) => void;
  tone: LetterTone;
  onTone: (tone: LetterTone) => void;
  onWrite: () => void;
  generating: boolean;
  /** There's already a letter on the sheet, so writing replaces it. */
  hasLetter: boolean;
  /** Posting link, when the brief came from a tracked application. */
  postingUrl?: string | null;
}

export const BriefPanel = ({
  resumes,
  resumeId,
  onPickResume,
  resumeText,
  onResumeText,
  ad,
  onAd,
  tone,
  onTone,
  onWrite,
  generating,
  hasLetter,
  postingUrl,
}: BriefPanelProps) => {
  const pasting = !resumeId;
  const adLength = ad.trim().length;
  const shortAd = adLength > 0 && adLength < FULL_AD_CHARS;
  const ready = resumeText.trim().length > 0 && adLength > 0;

  return (
    <section className="cc-surface p-6 md:p-8 space-y-8">
      {/* Résumé */}
      <div>
        <label htmlFor="cl-resume" className="cc-desk-field-label">
          Résumé
        </label>
        {resumes.length > 0 && (
          <select
            id="cl-resume"
            className="cc-select"
            value={resumeId || PASTE}
            onChange={(e) => onPickResume(e.target.value === PASTE ? "" : e.target.value)}
          >
            {resumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            <option value={PASTE}>Paste it instead</option>
          </select>
        )}
        {pasting && (
          <textarea
            id={resumes.length ? undefined : "cl-resume"}
            value={resumeText}
            onChange={(e) => onResumeText(e.target.value)}
            placeholder="Paste your résumé."
            className="cc-textarea w-full min-h-[140px] mt-2"
          />
        )}
      </div>

      {/* The ad */}
      <div>
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="cl-ad" className="cc-desk-field-label">
            The ad
          </label>
          {postingUrl && (
            <a
              href={postingUrl}
              target="_blank"
              rel="noreferrer"
              className="cc-label-sm cc-link text-[color:var(--cc-rust)] inline-flex items-center gap-1"
            >
              Open posting <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <textarea
          id="cl-ad"
          value={ad}
          onChange={(e) => onAd(e.target.value)}
          placeholder="Paste the full job ad."
          className="cc-textarea w-full min-h-[200px]"
        />
        {shortAd && (
          <p className="mt-3 cc-desk-note" role="note">
            This looks like an extract. Job boards often send only the first couple of lines, so
            paste the full ad for a letter that answers it.
          </p>
        )}
      </div>

      {/* Tone */}
      <fieldset>
        <legend className="cc-desk-field-label">Tone</legend>
        <div role="radiogroup" aria-label="Tone" className="flex flex-wrap gap-2 mt-1">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={tone === t.value}
              data-tone={t.value}
              className="cc-desk-tone"
              onClick={() => onTone(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <CraftButton onClick={onWrite} disabled={!ready || generating} className="w-full justify-center">
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
        {generating ? "Writing" : hasLetter ? "Write it again" : "Write letter"}
      </CraftButton>
    </section>
  );
};
