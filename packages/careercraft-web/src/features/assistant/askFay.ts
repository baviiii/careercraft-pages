/* Turning Fay's streamed answers into something her card can show.

   Her persona asks for plain sentences with Faircopy pages written as
   markdown links — [Job Tracker](/tracker). Only links to the app's own
   pages become buttons; anything else keeps its words and loses the link,
   so an answer can never send someone off-site. The agent's citation
   markers ([1], [2]) and stray markdown emphasis are dropped: the card is a
   few sentences, not a document. */

export type AnswerPiece =
  | { kind: "text"; text: string }
  | { kind: "link"; label: string; path: string };

export type AnswerBlock = { kind: "para" | "item"; pieces: AnswerPiece[] };

/** The pages an answer may link to (the persona lists the same ones), by name. */
const FAY_PAGES = new Map([
  ["/dashboard", "Home"],
  ["/builder", "Résumé Builder"],
  ["/my-resumes", "My Résumés"],
  ["/analysis", "ATS Check"],
  ["/cover-letter", "Cover Letters"],
  ["/tracker", "Job Tracker"],
  ["/interview-prep", "Interview Prep"],
  ["/career-coach", "Career Coach"],
  ["/intelligence", "Career Insights"],
  ["/au-jobs", "Browse Jobs"],
  ["/job-market-news", "Market News"],
  ["/settings", "Settings"],
]);
export const FAY_PATHS = new Set(FAY_PAGES.keys());

/** The page's own name, for a button ("/tracker" → "Job Tracker"). */
export const pageLabel = (path: string) => FAY_PAGES.get(path) ?? path;

const LINK = /\[([^\]\n]{1,80})\]\(([^)\s]{1,200})\)/g;

/** The page part of a link, if it's one of ours ("/tracker?x" → "/tracker"). */
export function internalPath(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return FAY_PATHS.has(path) ? path : null;
}

function tidy(text: string): string {
  return text
    .replace(/\s?\[\d+(?:\s*,\s*\d+)*\]/g, "") // citation markers
    .replace(/\s*—\s*/g, ", ") // em dashes read as machine-written
    .replace(/\*\*|__/g, "") // bold
    .replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|$|[.,!?])/g, "$1$2"); // italics
}

function pieces(line: string): AnswerPiece[] {
  const out: AnswerPiece[] = [];
  let last = 0;
  for (const m of line.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: tidy(line.slice(last, at)) });
    const path = internalPath(m[2]);
    out.push(path ? { kind: "link", label: tidy(m[1]), path } : { kind: "text", text: tidy(m[1]) });
    last = at + m[0].length;
  }
  if (last < line.length) out.push({ kind: "text", text: tidy(line.slice(last)) });
  return out.filter((p) => p.kind === "link" || p.text.length > 0);
}

/** Paragraphs and list items, each a run of text and page links. */
export function parseAnswer(answer: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  for (const raw of answer.split(/\n+/)) {
    const line = raw.trim().replace(/^#{1,6}\s+/, "");
    if (!line) continue;
    const item = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    const ps = pieces(item ? item[1] : line);
    if (ps.length) blocks.push({ kind: item ? "item" : "para", pieces: ps });
  }
  return blocks;
}

/** The app pages an answer links to, in the order it mentions them. */
export function pagesIn(blocks: AnswerBlock[]): string[] {
  const seen: string[] = [];
  for (const b of blocks)
    for (const p of b.pieces)
      if (p.kind === "link" && !seen.includes(p.path)) seen.push(p.path);
  return seen;
}
