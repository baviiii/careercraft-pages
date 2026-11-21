import { AlertCircle, ExternalLink } from "lucide-react";

import { Ready } from "./proof";

/** Matches JobDetailPanel and CoverLetterPage: Adzuna's search API only sends
    ~200 characters, whereas a real job ad is thousands. */
export const FULL_AD_CHARS = 400;

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Direct link to the external job posting when checking a tracked job. */
  jobUrl?: string | null;
}

export const JobDescriptionInput = ({
  value,
  onChange,
  jobUrl,
}: JobDescriptionInputProps) => {
  const trimmedLength = value.trim().length;
  const isShortExtract = trimmedLength > 0 && trimmedLength < FULL_AD_CHARS;
  const isFullAd = trimmedLength >= FULL_AD_CHARS;

  return (
    <section className="cc-surface p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="cc-font-display text-[22px] leading-tight text-[color:var(--cc-ink)]">
          Job description
        </h3>
        <div className="flex items-center gap-3">
          {jobUrl && (
            <a
              href={jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cc-label-sm cc-link text-[color:var(--cc-rust)] inline-flex items-center gap-1"
            >
              Open job ad <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {isFullAd && <Ready>Added</Ready>}
          {isShortExtract && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--cc-wheat-soft)] px-2.5 py-1 text-[12px] font-semibold text-[color:var(--cc-wheat-deep)]">
              <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
              Short extract
            </span>
          )}
        </div>
      </div>

      {isShortExtract && (
        <div
          role="note"
          className="mb-4 rounded-xl border-l-[3px] border-[color:var(--cc-wheat)] bg-[color:var(--cc-wheat-soft)] px-4 py-3 text-[14px] leading-relaxed text-[color:var(--cc-wheat-deep)]"
        >
          <p className="font-medium">
            {jobUrl
              ? "We only get a short preview of this ad from the job board."
              : "This looks like only a short extract of the job ad."}
          </p>
          <p className="mt-1">
            {jobUrl
              ? "Open the job posting, copy the full description — responsibilities, requirements, and skills — and paste it below so your ATS check covers the whole role."
              : "Paste the complete job description — responsibilities, requirements, and skills — so your ATS check doesn't miss key requirements."}
          </p>
          {jobUrl && (
            <a
              href={jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1.5 font-semibold text-[color:var(--cc-rust)] underline-offset-2 hover:underline"
            >
              Open the job ad to copy full description
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}

      {trimmedLength === 0 && jobUrl && (
        <div
          role="note"
          className="mb-4 rounded-xl border border-[color:var(--cc-hair)] bg-[color:var(--cc-cream-2)] px-4 py-3 text-[14px] leading-relaxed text-[color:var(--cc-ink-soft)]"
        >
          Open the job posting, copy the full job description, and paste it below to run your check.{" "}
          <a
            href={jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[color:var(--cc-rust)] underline-offset-2 hover:underline"
          >
            Open job ad <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      <textarea
        placeholder="Paste the full job ad — requirements, responsibilities, all of it."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Job description"
        className="cc-textarea w-full min-h-[280px]"
      />
    </section>
  );
};
