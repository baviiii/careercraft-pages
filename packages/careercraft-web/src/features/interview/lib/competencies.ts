/**
 * The competencies stories are filed under, for showing the story library.
 *
 * MIRRORS interview-coach-mcp/src/domain/competencies.ts: the keys are what the
 * coach writes to interview_stories.competency, so a key changed there must
 * change here. Labels are the same words the coach uses; the APS and NSW names
 * are the frameworks' own (APSC ILS guide; NSW Capability Framework v2, 2020).
 */
import type { Framework } from "@/lib/interviewCoach";

export interface CompetencyInfo {
  key: string;
  label: string;
  /** Short line under the name: what a story for it shows. */
  shows: string;
}

const GENERIC: CompetencyInfo[] = [
  { key: "ownership", label: "Ownership", shows: "Work you drove from start to finish." },
  { key: "conflict", label: "Working through disagreement", shows: "A real clash, and how it was resolved." },
  { key: "failure", label: "Accountability", shows: "A mistake you owned, fixed, and learned from." },
  { key: "pressure", label: "Prioritising under pressure", shows: "Competing deadlines: what you chose." },
  { key: "stakeholder", label: "Handling a difficult stakeholder", shows: "A hard customer, client or patient." },
  { key: "collaboration", label: "Collaboration", shows: "Getting it done with people unlike you." },
  { key: "adaptability", label: "Adaptability", shows: "A sudden change of plan, and your response." },
  { key: "influence", label: "Influence without authority", shows: "Changing a mind you couldn't overrule." },
  { key: "leadership", label: "Leading people", shows: "Lifting someone, or an unpopular call." },
  { key: "learning", label: "Learning fast", shows: "Picking up something new to deliver." },
];

const APS: Array<CompetencyInfo & { exec: string }> = [
  { key: "aps:results", label: "Achieves results", exec: "Achieves results", shows: "Delivering despite obstacles, to a measurable outcome." },
  { key: "aps:relationships", label: "Supports productive working relationships", exec: "Cultivates productive working relationships", shows: "Building relationships, working across teams, developing others." },
  { key: "aps:influence", label: "Communicates with influence", exec: "Communicates with influence", shows: "Explaining clearly, listening, negotiating to an outcome." },
  { key: "aps:integrity", label: "Displays personal drive and integrity", exec: "Exemplifies personal drive and integrity", shows: "Professional under pressure; owning mistakes; resilience." },
  { key: "aps:strategic", label: "Supports strategic direction", exec: "Shapes strategic thinking", shows: "Seeing the bigger picture and acting on it." },
];

const NSW: Array<CompetencyInfo & { manager?: true }> = [
  { key: "nsw:deliver", label: "Deliver Results", shows: "Results through efficient use of resources and quality." },
  { key: "nsw:collaborate", label: "Work Collaboratively", shows: "Collaborating and valuing others' contribution." },
  { key: "nsw:communicate", label: "Communicate Effectively", shows: "Communicating clearly and listening actively." },
  { key: "nsw:problem-solve", label: "Think and Solve Problems", shows: "Analysing the broader context for practical solutions." },
  { key: "nsw:customer", label: "Commit to Customer Service", shows: "Customer-focused service in line with objectives." },
  { key: "nsw:resilience", label: "Display Resilience and Courage", shows: "Open, honest, willing to commit to change." },
  { key: "nsw:plan", label: "Plan and Prioritise", shows: "Planning for priorities and adapting to change." },
  { key: "nsw:accountability", label: "Demonstrate Accountability", shows: "Responsible for your actions; following policy." },
  { key: "nsw:influence", label: "Influence and Negotiate", shows: "Gaining consensus and resolving conflict." },
  { key: "nsw:integrity", label: "Act with Integrity", shows: "Ethical, professional, upholding public sector values." },
  { key: "nsw:manage-self", label: "Manage Self", shows: "Drive, self-reflection and commitment to learning." },
  { key: "nsw:diversity", label: "Value Diversity and Inclusion", shows: "Inclusive behaviour and respect for difference." },
  { key: "nsw:develop-people", label: "Manage and Develop People", shows: "Engaging staff and developing their capability.", manager: true },
  { key: "nsw:direction", label: "Inspire Direction and Purpose", shows: "Communicating goals and recognising achievement.", manager: true },
  { key: "nsw:business-outcomes", label: "Optimise Business Outcomes", shows: "Managing people and resources for public value.", manager: true },
  { key: "nsw:change", label: "Manage Reform and Change", shows: "Championing change and helping others engage.", manager: true },
];

export const FRAMEWORK_LABEL: Record<Framework, string> = {
  aps: "APS (Integrated Leadership System)",
  nsw: "NSW Public Sector Capability Framework",
};

// The coach's seniority bands (field-profile.ts seniorityBand), so the library
// and the coach agree on which names apply.
const MANAGER_BAND = /manager|director|head|chief|c-level|\bvp\b|\bexec|\bceo\b|founder|owner/i;
const LEAD_BAND = /lead|staff|principal|supervisor/i;
const SENIOR_BAND = /senior/i;
const manages = (seniority: string) => MANAGER_BAND.test(seniority) || LEAD_BAND.test(seniority);
const isExec = (seniority: string) => manages(seniority) || SENIOR_BAND.test(seniority);

/** The competencies a set of stories is shown against, most important first. */
export function competencyList(framework: Framework | null, seniority?: string): CompetencyInfo[] {
  if (framework === "aps") {
    const exec = isExec(seniority ?? "");
    return APS.map((c) => ({ key: c.key, label: exec ? c.exec : c.label, shows: c.shows }));
  }
  if (framework === "nsw") {
    const managesPeople = manages(seniority ?? "");
    return NSW.filter((c) => managesPeople || !c.manager);
  }
  return GENERIC;
}

/** Any competency's label by key, from whichever set it belongs to. */
export function competencyName(key: string, seniority?: string): string {
  const all = [...competencyList(null), ...competencyList("aps", seniority), ...NSW];
  return all.find((c) => c.key === key)?.label ?? key;
}

/** Which framework a stored key belongs to. */
export function frameworkOf(key: string): Framework | null {
  if (key.startsWith("aps:")) return "aps";
  if (key.startsWith("nsw:")) return "nsw";
  return null;
}

export type StoryStrength = "none" | "weak" | "usable" | "strong";

/** Same cut-offs as the coach and the debrief: 8+ strong, 6+ usable. */
export function storyStrength(score: number | null | undefined): StoryStrength {
  if (score === null || score === undefined) return "none";
  if (score >= 8) return "strong";
  if (score >= 6) return "usable";
  return "weak";
}
