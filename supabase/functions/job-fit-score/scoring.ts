const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "with",
  "to",
  "of",
  "in",
  "on",
  "at",
  "by",
  "from",
  "your",
  "our",
  "you",
  "we",
  "is",
  "are",
  "be",
  "as",
  "this",
  "that",
  "will",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

export function uniqueTop(arr: string[], limit = 12): string[] {
  return [...new Set(arr)].slice(0, limit);
}

export function deriveFitScore(resumeText: string, jobText: string) {
  const resumeTokens = tokenize(resumeText);
  const jobTokens = tokenize(jobText);
  const resumeSet = new Set(resumeTokens);
  const jobSet = new Set(jobTokens);
  const overlap = [...jobSet].filter((t) => resumeSet.has(t));
  const missing = [...jobSet].filter((t) => !resumeSet.has(t));
  const overlapRatio = jobSet.size > 0 ? overlap.length / jobSet.size : 0;
  const score = Math.max(18, Math.min(96, Math.round(30 + overlapRatio * 70)));

  return {
    score,
    overlap,
    missing,
    overlapCount: overlap.length,
    jobKeywordCount: jobSet.size,
  };
}

export function summarizeResumeContent(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  const c = content as Record<string, unknown>;
  const chunks: string[] = [];
  if (typeof c.summary === "string") chunks.push(c.summary);
  if (Array.isArray(c.skills)) chunks.push(c.skills.filter(Boolean).join(" "));
  if (Array.isArray(c.experience)) {
    for (const exp of c.experience as Array<Record<string, unknown>>) {
      if (typeof exp?.title === "string") chunks.push(exp.title);
      if (typeof exp?.company === "string") chunks.push(exp.company);
      if (Array.isArray(exp?.bullets)) chunks.push(exp.bullets.filter(Boolean).join(" "));
    }
  }
  return chunks.join(" ");
}
