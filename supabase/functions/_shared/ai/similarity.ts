// Ranking by meaning, shared by every function that returns a list.
//
// Lives here rather than in one function because job-news and job-search both
// need it and a second copy would drift — two implementations producing scores
// that look comparable across surfaces and are not. That is the same reason
// cosineSimilarity sits in horus-knowledge.ts rather than at a call site.

import {
  cosineSimilarity,
  horusEmbed,
  horusKnowledgeConfigured,
  HORUS_EMBED_MAX_INPUTS,
} from "./horus-knowledge.ts";

/* ── Similarity ranking ──────────────────────────────────────────────────────
   Scores each job against the user's profile by meaning rather than by shared
   words, so "Enrolled Nurse" can rank near "Patient Care Assistant" — a pair
   that has no word in common and is obviously the same job market to a person.

   Everything here is a suggestion, not a gate. The number attached is a
   continuous 0-1, the caller folds it in as one weighted signal among several,
   and a job that scores poorly is ranked lower, never hidden. There is
   deliberately no threshold at which a job is "not a match": a cut-off would
   mean one arbitrary constant decides what a career change is allowed to look
   like, and the whole reason for doing this was that a fixed list cannot know
   that in advance.

   Failure is silent by design. Similarity improves an ordering that already
   works without it — the caller still has target role, location, salary,
   remote, skills and industry — so a Horus outage costs ranking quality and
   never a broken page. The Horus project is free-tier and pauses when idle,
   so this is a real path, not a theoretical one.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * What gets embedded for an item: title first, because it carries most of the
 * signal and Horus truncates long inputs. Works for jobs and articles alike —
 * both are a headline plus a paragraph.
 */
function itemEmbedText(item: { title?: string; description?: string }): string {
  return `${item.title ?? ""}. ${item.description ?? ""}`.trim();
}

/**
 * Why a page came back without similarity scores.
 *
 * Returned rather than only logged because degrading silently makes a broken
 * Horus connection indistinguishable from a working one: the other signals
 * still rank the page, so the UI looks correct either way. Anyone testing this
 * end to end needs to be able to tell, without reading function logs.
 */
export type SimilarityStatus =
  /** Scores attached. */
  | "ok"
  /** User has not onboarded — nothing to compare against, and no cost. */
  | "no-profile"
  /** HORUS_BASE_URL / key absent. A config problem, not an outage. */
  | "not-configured"
  /** Horus refused, timed out, or is paused. Expected on free tier. */
  | "unavailable";

export async function attachSimilarity(
  items: Array<Record<string, unknown>>,
  profileText: string | undefined,
  /**
   * What was searched for. Each item is also scored against it, as
   * `relevance`, for ordering ads the search widened into (job-search).
   */
  query?: string,
): Promise<SimilarityStatus> {
  const profile = (profileText ?? "").trim();
  const search = (query ?? "").trim();
  /* Nothing to compare against: a user who has not onboarded, and no search
     to score. Skipping here is what keeps them off the bill entirely. */
  if ((!profile && !search) || items.length === 0) return "no-profile";
  if (!horusKnowledgeConfigured()) return "not-configured";

  try {
    /* One request for the profile, the search and every job. Horus caps the
       batch, and a page beyond that cap simply goes unranked rather than being
       split into sequential calls whose latencies would add up inside a
       user's search. */
    const anchors = [profile, search].filter(Boolean);
    const ranked = items.slice(0, HORUS_EMBED_MAX_INPUTS - anchors.length);
    const texts = [...anchors, ...ranked.map((j) => itemEmbedText(j as { title?: string; description?: string }))];

    const { vectors } = await horusEmbed(texts, {
      model: "small",
      /* Native width is 1536; one profile plus fifty jobs at that width is
         megabytes of JSON for an ordering that does not need the precision. */
      dimensions: 512,
    });

    const profileVector = profile ? vectors[0] : undefined;
    const searchVector = search ? vectors[anchors.length - 1] : undefined;
    if (!profileVector && !searchVector) return "unavailable";

    for (let i = 0; i < ranked.length; i++) {
      const vector = vectors[i + anchors.length];
      if (!vector) continue;
      if (profileVector) ranked[i].similarity = cosineSimilarity(profileVector, vector);
      if (searchVector) ranked[i].relevance = cosineSimilarity(searchVector, vector);
    }
    /* The status is about the profile: scored against the search alone,
       there's still no fit to show. */
    if (!profileVector) return "no-profile";

    if (ranked.length > 0) {
      const scores = ranked
        .map((j) => j.similarity as number | undefined)
        .filter((s): s is number => typeof s === "number")
        .sort((a, b) => a - b);
      if (scores.length > 0) {
        /* The spread, not the average — it is what says whether this signal is
           separating anything. A run where every job scores 0.61 is a signal
           doing no work, and that is invisible from any single number. It is
           also what the caller's scaling window has to be calibrated against. */
        console.log(
          `[similarity] ${scores.length} items, min=${scores[0]!.toFixed(3)} ` +
            `median=${scores[Math.floor(scores.length / 2)]!.toFixed(3)} ` +
            `max=${scores[scores.length - 1]!.toFixed(3)}`,
        );
      }
    }
    return "ok";
  } catch (e) {
    /* Ranking without it is the fallback, and it is a good fallback. */
    console.warn("[similarity] unavailable, ranking without it:", e);
    return "unavailable";
  }
}
