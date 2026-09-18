/**
 * CONVERSATION ROUTER — the pre-retrieval gate.
 *
 * Every message used to go straight into the RAG pipeline, so "hey there"
 * paid for hybrid search + two model calls and came back with "the provided
 * passages do not address the query" under a 95% confidence badge. This
 * module classifies a message *before* any network call:
 *
 *   - greetings / thanks / farewells / acknowledgements → answered locally,
 *     instantly, for free;
 *   - capability questions ("what can you do") → answered locally from the
 *     persona description;
 *   - everything else → retrieval, as before.
 *
 * Detection is deliberately heuristic and conservative: a message only
 * short-circuits when it matches a small-talk shape in full AND carries no
 * domain vocabulary. "hi, what are the fastest growing careers" retrieves.
 */

// ─── Thinking trace ─────────────────────────────────────────────────────────
// The live "what is the agent doing right now" ledger rendered in the chat.
// Hooks append/update these on the in-flight message as phases progress.

export type ThinkingStatus = "active" | "done" | "skipped" | "failed";

export interface ThinkingStep {
  id: string;
  /** Human phase label, e.g. "Searching the corpus". */
  label: string;
  /** Optional machine detail, e.g. "hybrid · top 24 passages". */
  detail?: string;
  status: ThinkingStatus;
  /** Elapsed milliseconds, filled in when the step completes. */
  ms?: number;
}

// ─── Routing ────────────────────────────────────────────────────────────────

export type RouteKind = "greeting" | "thanks" | "farewell" | "ack" | "capability" | "retrieve";

export interface DirectRoute {
  kind: Exclude<RouteKind, "retrieve">;
  /** Instant local reply — no retrieval, no model call. */
  reply: string;
  /** Starter questions to surface under the reply. */
  followUps: string[];
  /** One-line trace entry explaining why retrieval was skipped. */
  trace: string;
}

export interface RetrieveRoute {
  kind: "retrieve";
}

export type Route = DirectRoute | RetrieveRoute;

/** Vocabulary that means the user is actually asking about the corpus. */
const DOMAIN_HINT =
  /\b(job|career|work|role|occupation|salar|pay|wage|budget|fund|grant|skill|train|tafe|course|study|degree|qualif|interview|resume|cv|policy|policies|visa|migrat|sector|industr|health|nurs|teach|engineer|defence|mining|energy|housing|infrastructure|economy|employ|apprentice|government|sa\b|australia)/i;

const GREETING_HEAD =
  /^(hi+|hii+|hey+|heya|hello+|helo+|yo+|sup|wassup|what'?s\s*up|howdy|hiya|g'?day|hola|morning|afternoon|evening|good\s?(morning|afternoon|evening|day))\b/i;

const GREETING_TAIL =
  /^([\s,!.:-]*(there|horus|mate|team|all|coach|everyone|again|friend)?([\s,!.:-]+(how('?s| is| are)? ?(it going|things|you|u|ya)( doing| going| today)?|what'?s up|wassup|how are ya))?)?[\s?!.]*$/i;

const THANKS_RE =
  /^(thanks?|thank\s?(you|u)|thx|ty|tysm|cheers|much appreciated|appreciate (it|that)|legend)([\s,!.]*(a lot|so much|heaps|mate))?$/i;

const FAREWELL_RE =
  /^(bye+|goodbye|see\s?(ya|you)( later)?|cya|later[sz]?|good\s?night|take care|catch you later|gotta go)$/i;

const ACK_RE =
  /^(ok+|okay+|k+|cool|nice|great|perfect|awesome|got it|sounds good|makes sense|understood|sure|yep|yeah|no worries|all good|roger)([\s,!.]*(thanks?|thank you|mate))?$/i;

const CAPABILITY_RE =
  /^(who are (you|u)|what are (you|u)|what can (you|u) (do|help( me)? with)|what do (you|u) (do|know)|how (do|can) (you|u) (work|help)|help|what is this|tell me about (yourself|you))[\s?!.]*$/i;

const WELLBEING_RE = /^how('?s| is| are)? (it going|things|you|u)( (doing|going|today))?[\s?!.]*$/i;

/** "hey there", "hi how are you", "hey horus what's up" — greeting + filler only. */
function isGreeting(text: string): boolean {
  if (!text) return true;
  if (WELLBEING_RE.test(text)) return true;
  const head = text.match(GREETING_HEAD);
  if (!head) return false;
  return GREETING_TAIL.test(text.slice(head[0].length));
}

/** Strip punctuation noise and emoji so "Hey!! 👋" still matches. */
function normalise(message: string): string {
  return message
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[!.?,;:~-]+$/g, "")
    .trim();
}

interface PersonaVoice {
  intro: string;
  capability: string;
  followUps: string[];
}

const VOICES: Record<string, PersonaVoice> = {
  careers: {
    intro:
      "Hey — I'm the SA career coach. Occupations, pay, training, interview prep: I answer from government documents, and I cite the page.",
    capability:
      "I'm a career intelligence agent grounded in SA Government documents. I can tell you which occupations are growing, what they pay, which training pathways lead to them, and how to prepare for public-sector applications — always with page-level citations.",
    followUps: [
      "What are the fastest growing careers in South Australia?",
      "Show me the top 5 in-demand occupations",
      "What government-funded retraining programs exist?",
    ],
  },
  analyst: {
    intro:
      "Hello. I read across SA budget papers, policy, and workforce reports — looking for patterns, gaps, and the places the documents disagree.",
    capability:
      "I perform deep cross-document analysis over SA Government sources: comparing budget cycles, detecting contradictions between stated priorities and allocations, and mapping cross-sector dependencies — with cited evidence.",
    followUps: [
      "What contradictions exist between priorities and budget allocations?",
      "Compare infrastructure spending across the last 3 budget cycles",
      "Summarize the key strategic themes across SA government documents",
    ],
  },
  funding: {
    intro:
      "Hi! I track every dollar in the SA budget — allocations, grants, and investment trends across departments. Ask me where the money is going.",
    capability:
      "I'm a funding and budget expert over SA Government documents: sector allocations, program funding, grants and year-on-year investment shifts, each answer cited to the budget paper and page.",
    followUps: [
      "What are the largest allocations in the current SA budget?",
      "Which sectors received the biggest funding increases?",
      "What grants are available for small businesses in SA?",
    ],
  },
  skills: {
    intro:
      "Hey there! I'm your skills advisor — I map workforce skills gaps and the training pathways that close them, straight from SA Government workforce reports.",
    capability:
      "I analyse skills demand and training supply across South Australia: in-demand technical skills, emerging capability gaps, and which TAFE and university programs align with them — all cited.",
    followUps: [
      "What are the most in-demand technical skills in SA right now?",
      "Which industries have the biggest skills shortages?",
      "What free training programs does the SA government offer?",
    ],
  },
  policies: {
    intro:
      "Hello — SA policy analyst here. I unpack government policies, regulations and strategic frameworks, and what they mean for industries and careers.",
    capability:
      "I analyse SA Government policy: current priorities, regulatory changes, and how policy decisions flow through to industries, communities and jobs — grounded in the source documents.",
    followUps: [
      "What are the key policy priorities in the current SA agenda?",
      "How do SA housing policies affect workforce mobility?",
      "What regulatory changes are planned for the health sector?",
    ],
  },
  entrepreneurship: {
    intro:
      "Hey! I'm your startup advisor — grants, innovation programs, and business support across the SA Government, from idea to scale-up.",
    capability:
      "I help entrepreneurs navigate SA Government support: startup grants, innovation hubs like Lot Fourteen, procurement pathways and export assistance — with the source for every claim.",
    followUps: [
      "What government grants are available for startups in SA?",
      "How do I access the SA Innovation Hub programs?",
      "How can I get government contracts as a small business?",
    ],
  },
  basic: {
    intro:
      "Hello. I answer from the SA government corpus — budgets, careers, skills, policy. Ask anything; I'll cite the paper.",
    capability:
      "I'm a general intelligence agent over the SA Government corpus: budgets, careers, skills, policies and services. Every answer is grounded in and cited to the source documents.",
    followUps: [
      "Give me an overview of the SA Government's key priorities",
      "What are the biggest changes in this year's SA budget?",
      "What are the fastest growing occupations in SA?",
    ],
  },
};

function voiceFor(focusArea: string): PersonaVoice {
  if (VOICES[focusArea]) return VOICES[focusArea];
  const lower = focusArea.toLowerCase();
  if (lower.includes("career") || lower.includes("job")) return VOICES.careers;
  if (lower.includes("analyst") || lower.includes("intellig")) return VOICES.analyst;
  if (lower.includes("fund") || lower.includes("budget")) return VOICES.funding;
  if (lower.includes("skill") || lower.includes("train")) return VOICES.skills;
  if (lower.includes("polic")) return VOICES.policies;
  if (lower.includes("entrepre") || lower.includes("startup") || lower.includes("business")) return VOICES.entrepreneurship;
  return VOICES.basic;
}

/**
 * Classify a message. Returns a DirectRoute with a ready-to-render reply for
 * small talk, or `{ kind: "retrieve" }` when the corpus should be consulted.
 */
export function routeMessage(message: string, focusArea: string = "careers"): Route {
  const text = normalise(message);

  // Empty after stripping emoji ("👋") is still a hello. Anything carrying
  // domain vocabulary, or that's actually a question about the corpus, retrieves.
  if (text.length > 80 || text.split(" ").length > 12 || (text.length > 0 && DOMAIN_HINT.test(text))) {
    return { kind: "retrieve" };
  }

  const voice = voiceFor(focusArea);

  if (isGreeting(text)) {
    return {
      kind: "greeting",
      reply: `${voice.intro}\n\nWhat would you like to dig into?`,
      followUps: voice.followUps,
      trace: "Recognised a greeting — replied directly, no document search needed",
    };
  }

  if (CAPABILITY_RE.test(text)) {
    return {
      kind: "capability",
      reply: voice.capability,
      followUps: voice.followUps,
      trace: "Capability question — answered from persona profile, no document search needed",
    };
  }

  if (THANKS_RE.test(text)) {
    return {
      kind: "thanks",
      reply: "You're welcome! Happy to keep going whenever you are.",
      followUps: voice.followUps.slice(0, 2),
      trace: "Acknowledgement — replied directly, no document search needed",
    };
  }

  if (FAREWELL_RE.test(text)) {
    return {
      kind: "farewell",
      reply: "See you next time — good luck out there. Everything we discussed stays cited if you export the conversation.",
      followUps: [],
      trace: "Farewell — replied directly, no document search needed",
    };
  }

  if (ACK_RE.test(text)) {
    return {
      kind: "ack",
      reply: "Great — anything else you'd like to explore?",
      followUps: voice.followUps.slice(0, 2),
      trace: "Acknowledgement — replied directly, no document search needed",
    };
  }

  return { kind: "retrieve" };
}

// ─── Answer quality ─────────────────────────────────────────────────────────

/**
 * Detect a grounded-refusal answer ("the provided passages do not address…").
 * Used to stop the UI from decorating a refusal with high-confidence badges
 * and a wall of irrelevant sources.
 */
export function isRefusalAnswer(answer: string): boolean {
  return /\b(passages?|documents?|sources?|context) (provided |retrieved )?(do(es)? not|don'?t) (address|cover|contain|mention|answer)|no relevant (information|passages?|documents?)|not (covered|addressed) in the (provided|retrieved|available)|cannot (find|answer|locate).{0,40}(documents?|corpus|sources?)/i.test(
    answer,
  );
}
