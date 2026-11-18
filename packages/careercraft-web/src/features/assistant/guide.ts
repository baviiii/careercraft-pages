/* What Fay knows about where you are and where you can go.

   - Each page she lives on has a name, its sidebar icon, a colour (the same
     tones the Home tools use) and the questions people ask there.
   - Her search box finds pages, the things you do on them and her own
     settings by plain word matching: instant, and it costs nothing. Only
     "Ask Fay" goes to the AI.
   Every destination here was checked against the app, and every question
   is one Fay's guide (her persona, in chat_prompts) can answer; keep both
   true when a page changes. */

import type { ComponentType } from "react";
import {
  ArrowDownToLine,
  Award,
  Banknote,
  Bell,
  BookMarked,
  Compass,
  Gauge,
  Highlighter,
  History,
  Lock,
  MessageCircle,
  MessageCircleOff,
  Target,
  Upload,
  User,
} from "lucide-react";

import { CRAFT_SIDEBAR_LINKS } from "@/components/craft/CraftSidebar";

export type Tone = "ink" | "cobalt" | "sage" | "wheat" | "pen" | "teal" | "plum";

/** A sidebar icon or any lucide one. */
export type FayIcon = ComponentType<{ className?: string }>;

export interface PageGuide {
  path: string;
  label: string;
  icon: FayIcon;
  tone: Tone;
  /** What people ask on this page; Fay answers them. */
  questions: string[];
}

/** Each page's sidebar name and icon, so Fay always matches the sidebar. */
const SIDEBAR = new Map(CRAFT_SIDEBAR_LINKS.map((l) => [l.path, l]));

const page = (
  path: string,
  tone: Tone,
  questions: string[],
  fallback?: { label: string; icon: FayIcon },
): PageGuide => {
  const link = SIDEBAR.get(path);
  return {
    path,
    label: link?.label ?? fallback?.label ?? path,
    icon: link?.icon ?? fallback?.icon ?? Compass,
    tone,
    questions,
  };
};

const GUIDES: PageGuide[] = [
  page("/dashboard", "cobalt", [
    "Where do I start?",
    "Can I upload the résumé I already have?",
    "How do I check my résumé against a job?",
  ]),
  page("/my-resumes", "cobalt", [
    "How do I download a PDF?",
    "Should I have a different résumé for each job?",
    "How do I fit my résumé on fewer pages?",
  ]),
  page("/analysis", "sage", [
    "What does my score mean?",
    "How do I raise my score?",
    "Why paste the whole job ad?",
  ]),
  page(
    "/rewrite",
    "wheat",
    ["What makes a strong bullet point?", "How do I show results with numbers?"],
    { label: "Bullet Rewrite", icon: Highlighter },
  ),
  page("/cover-letter", "pen", [
    "How long should a cover letter be?",
    "Can I write one from my résumé?",
    "How do I attach a letter to a job?",
  ]),
  page("/tracker", "wheat", [
    "How do I save jobs from other sites?",
    "How do follow-up dates work?",
    "Can Faircopy read a job email for me?",
  ]),
  page("/interview-prep", "plum", [
    "Which practice interview should I start with?",
    "How are my answers scored?",
    "What's the STAR method?",
  ]),
  page("/au-jobs", "teal", [
    "How are these jobs sorted for me?",
    "How do I save a job to my tracker?",
    "How do I get better matches?",
  ]),
  page("/job-market-news", "ink", [
    "What does the Your market tab show?",
    "Where can I see pay for my kind of role?",
  ]),
  page("/intelligence", "wheat", [
    "Which skills are in demand in my field?",
    "What should I learn next?",
  ]),
  page("/settings", "ink", [
    "What should I fill in on my profile?",
    "Why does a fuller profile help?",
    "Where do I add certificates and licences?",
  ]),
];

const BY_PATH = new Map(GUIDES.map((g) => [g.path, g]));

/** The guide for the page someone is on, if Fay has one. */
export const guideFor = (pathname: string): PageGuide | null =>
  BY_PATH.get(pathname.replace(/\/+$/, "") || "/") ?? null;

/** Asked anywhere else. */
export const GENERAL_QUESTIONS = [
  "How do I check my résumé against a job?",
  "Where do I track my applications?",
  "How do I fit my résumé on fewer pages?",
];

/* ── Her search box ───────────────────────────────────────────────────── */

/** Apple keyboards open her box with ⌘ K; everyone else's with Ctrl K. */
export const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Things Fay does herself, rather than a page she opens. */
export type FayAct = "tour" | "chatty" | "tuck" | "corner";

export interface FayCommand {
  id: string;
  label: string;
  /** The page it opens, shown beside the label. */
  hint?: string;
  icon: FayIcon;
  tone: Tone;
  /** More words it answers to (synonyms, what people type). */
  words: string;
  run: { go: string } | { fay: FayAct };
}

const pageCommand = (path: string, words: string): FayCommand => {
  const g = BY_PATH.get(path) ?? page(path, "cobalt", []);
  return { id: path, label: g.label, icon: g.icon, tone: g.tone, words, run: { go: path } };
};

const builder = SIDEBAR.get("/builder");
const coach = SIDEBAR.get("/career-coach");

/** Pages first, then the deeper places on them. */
export const DESTINATIONS: FayCommand[] = [
  pageCommand("/dashboard", "home dashboard start overview"),
  {
    id: "/builder",
    label: builder?.label ?? "Résumé Builder",
    icon: builder?.icon ?? Upload,
    tone: "cobalt",
    words: "resume cv build create new make write template edit",
    run: { go: "/builder" },
  },
  pageCommand("/my-resumes", "resume cv saved list download pdf duplicate rename delete"),
  pageCommand("/analysis", "ats score check scan match job ad keywords analysis analyse analyze"),
  pageCommand("/rewrite", "bullet point line rewrite improve stronger wording achievement"),
  pageCommand("/cover-letter", "cover letter write application"),
  pageCommand(
    "/tracker",
    "track applications applied board kanban follow up reminder offer rejected saved jobs pipeline",
  ),
  pageCommand(
    "/interview-prep",
    "interview practice mock questions star behavioural behavioral technical phone screen",
  ),
  {
    id: "/career-coach",
    label: coach?.label ?? "Career Coach",
    icon: coach?.icon ?? MessageCircle,
    tone: "ink",
    words: "coach advice career chat talk",
    run: { go: "/career-coach" },
  },
  pageCommand("/intelligence", "insights skills demand trends learn hiring intelligence"),
  pageCommand("/au-jobs", "jobs search browse find ads vacancies listings openings seek"),
  pageCommand("/job-market-news", "news market hiring layoffs headlines"),
  pageCommand("/settings", "settings preferences"),
  {
    id: "upload",
    label: "Upload my résumé",
    hint: builder?.label ?? "Résumé Builder",
    icon: Upload,
    tone: "cobalt",
    words: "upload import existing resume cv pdf word docx file",
    run: { go: "/builder" },
  },
  {
    id: "stories",
    label: "My interview stories",
    hint: "Interview Prep",
    icon: BookMarked,
    tone: "plum",
    words: "stories star examples answers",
    run: { go: "/interview-prep?tab=stories" },
  },
  {
    id: "history",
    label: "Past practice interviews",
    hint: "Interview Prep",
    icon: History,
    tone: "plum",
    words: "history past scores debrief results report",
    run: { go: "/interview-prep?tab=history" },
  },
  {
    id: "pay",
    label: "Pay for my kind of role",
    hint: "Market News",
    icon: Banknote,
    tone: "ink",
    words: "pay salary wage money rate earn market",
    run: { go: "/job-market-news?tab=market" },
  },
  {
    id: "profile",
    label: "Edit my profile",
    hint: "Settings",
    icon: User,
    tone: "ink",
    words: "profile name details location",
    run: { go: "/settings?tab=profile" },
  },
  {
    id: "career",
    label: "My career goals",
    hint: "Settings",
    icon: Target,
    tone: "ink",
    words: "career goals target role preferences",
    run: { go: "/settings?tab=career" },
  },
  {
    id: "skills",
    label: "My skills and certificates",
    hint: "Settings",
    icon: Award,
    tone: "ink",
    words: "skills certificates licences licenses certifications",
    run: { go: "/settings?tab=skills" },
  },
  {
    id: "alerts",
    label: "Job alerts",
    hint: "Settings",
    icon: Bell,
    tone: "ink",
    words: "alerts emails notifications",
    run: { go: "/settings?tab=alerts" },
  },
  {
    id: "plan",
    label: "My plan and usage",
    hint: "Settings",
    icon: Gauge,
    tone: "ink",
    words: "plan usage limits quota upgrade premium billing subscription",
    run: { go: "/settings?tab=plan" },
  },
  {
    id: "account",
    label: "Password and account",
    hint: "Settings",
    icon: Lock,
    tone: "ink",
    words: "account password email delete sign out security",
    run: { go: "/settings?tab=account" },
  },
];

/** Her own commands, worded for how things are right now. */
export function fayCommands(state: {
  canTour: boolean;
  chatty: boolean;
  atHome: boolean;
}): FayCommand[] {
  return [
    ...(state.canTour
      ? [
          {
            id: "tour",
            label: "Show me around this page",
            icon: Compass,
            tone: "cobalt" as Tone,
            words: "tour tips help around guide explain this page",
            run: { fay: "tour" as const },
          },
        ]
      : []),
    {
      id: "chatty",
      label: state.chatty ? "Turn off tips and bubbles" : "Turn on tips and bubbles",
      icon: state.chatty ? MessageCircleOff : MessageCircle,
      tone: "ink",
      words: "tips bubbles quiet mute notifications off on fay",
      run: { fay: "chatty" },
    },
    ...(state.atHome
      ? []
      : [
          {
            id: "corner",
            label: "Move Fay back to her corner",
            icon: ArrowDownToLine,
            tone: "ink" as Tone,
            words: "move corner reset position fay",
            run: { fay: "corner" as const },
          },
        ]),
    {
      id: "tuck",
      label: "Tuck Fay away",
      icon: ArrowDownToLine,
      tone: "ink",
      words: "hide tuck away fay close quokka",
      run: { fay: "tuck" },
    },
  ];
}

/* Words that say nothing about where to go ("how do I …"). */
const FILLER = new Set(
  "a an and are can could do does for get help how i in is it me my of on or please show the this to want what where which with you your".split(
    " ",
  ),
);

/** Lower case, accents off ("Résumé" → "resume"), split into words. */
const words = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Reads like a question for Fay rather than the name of a place. */
export function looksLikeQuestion(query: string): boolean {
  const q = query.trim();
  return (
    /\?$/.test(q) ||
    /^(how|what|why|where|when|which|who|can|could|should|would|do|does|is|are|will)\b/i.test(q) ||
    q.split(/\s+/).length >= 5
  );
}

/** The commands that match at least half the meaningful words typed, best
    first: the more words matched, and the more of them in the name, the
    higher. A short query has to match all its words. */
export function searchFay(query: string, commands: FayCommand[], limit = 5): FayCommand[] {
  const wanted = words(query).filter((w) => !FILLER.has(w));
  if (!wanted.length) return [];
  const needed = wanted.length <= 2 ? wanted.length : Math.ceil(wanted.length / 2);
  const scored: { c: FayCommand; score: number; i: number }[] = [];
  commands.forEach((c, i) => {
    const label = words(`${c.label} ${c.hint ?? ""}`);
    const extra = words(c.words);
    const hit = (pool: string[], w: string) =>
      pool.includes(w) ? 3 : w.length >= 2 && pool.some((p) => p.startsWith(w)) ? 2 : 0;
    let score = 0;
    let matched = 0;
    for (const w of wanted) {
      const inLabel = hit(label, w);
      const inWords = hit(extra, w);
      if (!inLabel && !inWords) continue;
      matched += 1;
      score += Math.max(inLabel + 1, inWords);
    }
    if (matched >= needed) scored.push({ c, score, i });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((s) => s.c);
}
