/**
 * Reading a debrief's prose.
 *
 * The coach asks for strengths, gaps and a plan as lists, and a short summary.
 * Some debriefs come back with the lists empty and everything in one long
 * summary instead. Rather than show that as a wall of text, it's split into
 * sentences and each is filed under what it's about, by the words it uses.
 * The rules are deliberately plain and readable: a sentence that matches none
 * of them stays as a general note, never guessed into a group.
 *
 * Inline, question numbers ("Q2"), scores ("1.7/10") and quoted terms are
 * picked out so they can be marked up.
 */

export type NoteKind = "worked" | "gap" | "untested" | "expect" | "next" | "note";

export interface Note {
  kind: NoteKind;
  text: string;
}

/* Abbreviations that end in a full stop but don't end a sentence. */
const ABBREVIATIONS = /\b(e\.g|i\.e|etc|vs|approx|incl|Mr|Ms|Dr)\./gi;
const HOLD = "\u0001";

/** "One. Two? Three." → ["One.", "Two?", "Three."] */
export function sentences(text: string): string[] {
  const held = text.replace(/\s+/g, " ").trim().replace(ABBREVIATIONS, (m) => m.replace(/\./g, HOLD));
  return held
    .replace(/([.!?]["”')\]]?)\s+(?=["“(*]?[A-Z0-9])/g, "$1\n")
    .split("\n")
    .map((s) => s.split(HOLD).join(".").trim())
    .filter(Boolean);
}

/* What files a sentence where. Checked in this order; the first match wins.
   "Next" comes before "gap" so "the gap is addressable, but it needs
   drilling" reads as the way forward, not another gap; "strongest" before
   "gap" so "Q3 was the strongest moment" isn't filed by a stray "no". */
const RULES: Array<{ kind: NoteKind; test: RegExp }> = [
  { kind: "untested", test: /\buntested\b|\bnot (?:yet )?(?:reached|tested|assessed|covered)\b|\bnever (?:reached|tested)\b|\bwasn'?t tested\b|\bweren'?t tested\b/i },
  { kind: "expect", test: /\b(?:will|would) expect\b|\bexpect(?:s|ed)? (?:at minimum|to see|candidates)\b|\binterviewers (?:at|in|for|will|would)\b|\bhiring managers?\b|\bpanels? (?:will|would|at|in)\b|\bin the australian market\b/i },
  { kind: "next", test: /\baddressable\b|\bbefore (?:the|your) next\b|\b(?:requires?|needs?) (?:focused|deliberate|more|some|targeted)\b|\bnext step\b|\bshould (?:focus|drill|practi[sc]e|work on|prepare)\b|(?:^|[^-\w])drilling\b|\bto improve\b|\bwork on\b/i },
  { kind: "worked", test: /\bstrongest\b|\bbest (?:moment|answer)\b|\bstood out\b/i },
  { kind: "gap", test: /\bgaps?\b|\bweakest\b|\bweak\b|\bcut off\b|\bno (?:code|example|detail|outcome|specifics?|named|actual|concrete|structure|metrics?)\b|\bnothing (?:about|on|concrete)\b|\bgeneric\b|\bcannot\b|\bcan'?t\b|\black(?:s|ed|ing)?\b|\bmissing\b|\bexposed\b|\bfailed\b|\bdidn'?t\b|\bdid not\b|\bvague\b|\bstruggled\b|\bshallow\b|\bunclear\b|\bpoor\b|\bhowever\b/i },
  { kind: "worked", test: /\bworth acknowledging\b|\bgenuine\b|\bcorrectly\b|\bclear(?:ly)?\b|\bgood\b|\bsolid\b|\bstrong(?:ly)?\b|\bimpressive\b|\bwell[- ]structured\b|\bconfident(?:ly)?\b|\bdefensible\b|\bdid well\b|\bunderst(?:and|ood)s?\b|\btidy\b/i },
];

export function noteKind(sentence: string): NoteKind {
  return RULES.find((r) => r.test.test(sentence))?.kind ?? "note";
}

/** A long summary, filed sentence by sentence. */
export function fileSentences(summary: string): Note[] {
  return sentences(summary).map((text) => ({ kind: noteKind(text), text }));
}

/**
 * A list set off by dashes inside a sentence ("Several competencies — A, B,
 * C — were untested") as items, with the sentence left without it. Null
 * when there's no such list (fewer than three items).
 */
export function dashList(sentence: string): { items: string[]; rest: string } | null {
  const m = sentence.match(/\s[—–]\s([^—–]+?)\s[—–]\s/);
  if (!m) return null;
  const items = m[1]
    .split(/,\s*|\s+and\s+/)
    .map((s) => s.trim().replace(/^and\s+/, ""))
    .filter(Boolean);
  if (items.length < 3) return null;
  return { items, rest: sentence.replace(m[0], " ") };
}

/** Short enough to read as one paragraph, as written. */
export function isShortSummary(summary: string): boolean {
  const words = summary.trim().split(/\s+/).filter(Boolean).length;
  return words <= 55 || sentences(summary).length <= 2;
}

/* ── Inline marks ─────────────────────────────────────────────────────── */

export type Mark =
  | { t: "text"; v: string }
  | { t: "q"; v: string; n: number }
  | { t: "score"; v: string; of10: number }
  | { t: "quote"; v: string }
  | { t: "em"; v: string };

const INLINE =
  /\bQ(\d{1,2})\b|(\d+(?:\.\d+)?)\s?\/\s?(10|100)\b|[“"]([^”"]{2,60})[”"]|\*\*([^*]{1,80})\*\*|\*([^*\s][^*]{0,80}?)\*/g;

/** A sentence cut into plain runs and the bits worth marking. */
export function marks(text: string): Mark[] {
  if (typeof text !== "string") return [];
  const out: Mark[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ t: "text", v: text.slice(last, at) });
    if (m[1]) out.push({ t: "q", v: `Q${m[1]}`, n: Number(m[1]) });
    else if (m[2]) {
      const value = Number(m[2]);
      const of10 = m[3] === "100" ? value / 10 : value;
      out.push({ t: "score", v: `${m[2]}/${m[3]}`, of10 });
    } else if (m[4]) out.push({ t: "quote", v: m[4] });
    else out.push({ t: "em", v: m[5] ?? m[6] ?? "" });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

/** A score given out of 10 or out of 100, on 0-10. */
export function scoreOn10(raw: number): number {
  return Math.max(0, Math.min(10, raw > 10 ? raw / 10 : raw));
}

/** low / mid / high, for colouring a score out of 10. */
export function scoreBand(of10: number): "low" | "mid" | "high" {
  return of10 < 4.5 ? "low" : of10 < 7 ? "mid" : "high";
}
