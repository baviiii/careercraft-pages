/* One name for a cover letter, wherever it shows up: the library, the
   tracker's picker, the tracker's enclosures.

   Letters only got a title column on 2026-10-11, and the ATS page still saves
   without one, so most letters need a fallback: the application the letter
   went out with, else the first line of the ad (usually the job title), else
   the date. */

interface LabelSource {
  title?: string | null;
  job_description?: string | null;
  created_at: string;
}

interface ApplicationLike {
  job_title: string;
  company: string;
}

export const applicationLabel = (app: ApplicationLike) =>
  [app.job_title, app.company].filter(Boolean).join(" — ");

export const letterDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

/** The first real line of an ad, usually the job title. */
export const firstLineOf = (text: string | null | undefined) => {
  const line = text
    ?.split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length >= 4);
  if (!line) return null;
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}…` : line;
};

export function letterLabel(letter: LabelSource, sentWith?: ApplicationLike | null): string {
  const title = letter.title?.trim();
  if (title) return title;
  if (sentWith) return applicationLabel(sentWith);
  return firstLineOf(letter.job_description) ?? `Letter · ${letterDate(letter.created_at)}`;
}
