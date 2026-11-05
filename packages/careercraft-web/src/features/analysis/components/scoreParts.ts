// The four parts of the ATS score, and which one to point a person at first.
// Shared by the scorecard's sentence and its breakdown, so they always agree.

export interface SubScores {
  skillsMatch: number;
  experienceMatch: number;
  keywordMatch: number;
  formatCompatibility: number;
}

/** Each part of the score, with what it actually measures. */
export const SCORE_PARTS = [
  { key: "skillsMatch", label: "Skills", hint: "The skills the ad asks for" },
  { key: "experienceMatch", label: "Experience", hint: "How your experience lines up with the role" },
  { key: "keywordMatch", label: "Keywords", hint: "The ad's own wording, used in your résumé" },
  { key: "formatCompatibility", label: "Format", hint: "How cleanly an ATS can read the file" },
] as const;

/**
 * The lowest part, when it's worth pointing at. Nothing is singled out when
 * every part is already strong — there's no weakest worth fixing then.
 */
export const weakestArea = (subScores: SubScores): { key: string; label: string; value: number } | null => {
  const scored = SCORE_PARTS.map((p) => ({ key: p.key, label: p.label, value: Math.round(subScores[p.key]) }));
  const lowest = scored.reduce((a, b) => (b.value < a.value ? b : a));
  return lowest.value < 80 ? lowest : null;
};
