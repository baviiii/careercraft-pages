import type { CoachFinalEvaluation } from "@/lib/interviewCoach";

import { fileSentences, isShortSummary, sentences, type NoteKind } from "../../lib/debriefText";

export interface GroupItem {
  text: string;
  /** From the coach's "critical" list: the first things to fix. */
  fixFirst?: boolean;
  /** A name, not a sentence (an untested competency): shown as a chip. */
  chip?: boolean;
}

export interface DebriefGroups {
  /** Read as written, above the groups. Null when every sentence is filed below. */
  lead: string | null;
  /** The whole summary, kept to read in full when it was long and lists exist too. */
  fullNote: string | null;
  items: Record<NoteKind, GroupItem[]>;
}

/**
 * Where each piece of a debrief goes. The coach's own lists win when it sent
 * them; a long summary fills in what the lists don't cover (what wasn't
 * tested, what interviewers will expect, what to do next), and fills every
 * group itself when the lists came back empty.
 */
export function debriefGroups(ev: CoachFinalEvaluation): DebriefGroups {
  const structured = ev.strengths.length + ev.mustFix.length + ev.weaknesses.length > 0;
  const summary = ev.summary.trim();
  const short = !summary || isShortSummary(summary);
  const filed = short ? [] : fileSentences(summary);
  const pick = (kind: NoteKind): GroupItem[] => filed.filter((n) => n.kind === kind).map((n) => ({ text: n.text }));

  return {
    lead: short ? summary || null : structured ? sentences(summary).slice(0, 2).join(" ") : null,
    fullNote: !short && structured ? summary : null,
    items: {
      worked: structured ? ev.strengths.map((text) => ({ text })) : pick("worked"),
      gap: structured
        ? [...ev.mustFix.map((text) => ({ text, fixFirst: true })), ...ev.weaknesses.map((text) => ({ text }))]
        : pick("gap"),
      // The coach's own list wins, as with strengths and gaps; a long
      // summary's sentences only fill in when there isn't one. A short name
      // reads as a chip, a longer note stays a line.
      untested: ev.untested.length
        ? ev.untested
            .filter((text, i, all) => all.findIndex((t) => t.toLowerCase() === text.toLowerCase()) === i)
            .map((text) => ({ text, chip: text.length <= 48 }))
        : pick("untested"),
      expect: pick("expect"),
      next: pick("next"),
      note: structured ? [] : pick("note"),
    },
  };
}
