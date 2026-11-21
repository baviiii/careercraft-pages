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

const HEADER_LINE =
  /^(dear\b|to whom|sincerely\b|kind regards|yours (?:sincerely|faithfully)|regards\b|\[your name\]|your name\b)/i;

/** A date, an email, a phone number, or a "[Your Name]" stand-in: not a name for the letter. */
function isHeaderLine(line: string): boolean {
  if (line.length < 8) return true;
  if (HEADER_LINE.test(line)) return true;
  if (/^\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/.test(line)) return true;
  if (/@|\b(?:https?:|www\.)/i.test(line)) return true;
  if (/^\[.+\]$/.test(line)) return true;
  const digits = line.replace(/\D/g, "");
  return digits.length >= 8 && digits.length >= line.replace(/\s/g, "").length * 0.5;
}

/**
 * What the letter itself says it is for, when nobody gave it a title.
 * Skips the address block ("[Your Name]", the email) and reads the sentence
 * that names the role.
 */
const clip = (text: string) => (text.length > 72 ? `${text.slice(0, 69).trimEnd()}…` : text);

const NOT_A_COMPANY = new Set([
  "your", "the", "this", "that", "our", "my", "dear", "hiring", "manager", "further", "discussing", "you", "sincerely",
]);

/** The last "at Capgemini" / "to Capgemini" in the letter. Closings name the employer there. */
function employerMention(content: string): string | null {
  // One line only, so a name never runs on into the sign-off ("Capgemini.
  // Sincerely"); not "with", which is mostly skills ("with Python").
  const matches = [
    ...content.matchAll(/\b(?:at|to)[ \t]+([A-Z][A-Za-z0-9&.'’-]{2,}(?:[ \t]+[A-Z][A-Za-z0-9&.'’-]{2,}){0,2})/g),
  ];
  for (let i = matches.length - 1; i >= 0; i--) {
    const name = matches[i][1].replace(/[.'’-]+$/, "");
    if (!NOT_A_COMPANY.has(name.split(/\s/)[0].toLowerCase())) return name;
  }
  return null;
}

export function letterOpening(content: string): string | null {
  // The role, up to "role"/"position", "at …", a comma or the sentence's end:
  // a dot inside it ("Sr. Developer", ".NET") doesn't end it.
  const apply = content.match(
    /(?:applying for|apply for|application for|position of|role of)\s+(?:the\s+)?(?!the\s)([^\n]{6,90}?)(?=\s+(?:role|position|job|opportunity)\b|\s+at\s|,|[.!?](?:\s|$)|\n|$)/i,
  );
  const phrase = apply?.[1].replace(/\s+/g, " ").trim();
  if (phrase) return clip(phrase);

  const employer = employerMention(content);
  if (employer) return employer;

  const line = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => !isHeaderLine(l));
  if (!line) return null;
  return clip(line);
}

/**
 * The line in a picker. A saved title, the application it went out with, or
 * the ad's first line, as {@link letterLabel}. A letter with none of those
 * is named from what it says it is for, not from its address block.
 */
export function coverLetterChoiceLabel(
  letter: LabelSource & { content?: string | null },
  sentWith?: ApplicationLike | null,
): string | null {
  // Null when nothing names it: the caller shows the date. Said outright,
  // not sniffed from the text, so a title like "Letter · draft 2" stays.
  return (
    letter.title?.trim() ||
    (sentWith ? applicationLabel(sentWith) : null) ||
    firstLineOf(letter.job_description) ||
    (letter.content ? letterOpening(letter.content) : null)
  );
}
