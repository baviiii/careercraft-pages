/* Other names for the same job.

   The board matches words, so a search finds one wording of a job. In
   Adelaide most software roles are advertised as "Software Engineer", and a
   search for "Software Developer" found two of them (2026-11-14). So a search
   for one of the titles below also searches the next one in its group, and
   the results are merged, de-duplicated and ranked by meaning as before. The
   page says what else it searched.

   Only plain equivalents belong here: another name for the same work, not a
   step up ("early childhood teacher"), a step sideways ("systems engineer"
   for a systems administrator, "cook" for a chef) or a narrower or broader
   wording the board already finds ("front desk receptionist"). Each extra
   title is another paid board call, so a group earns its place only when the
   other wording is genuinely how the same ads are titled. The commonest
   Australian wording goes first. */

const FAMILIES: string[][] = [
  // Software and IT
  ["software developer", "software engineer", "programmer"],
  ["full stack developer", "full stack engineer"],
  ["front end developer", "front end engineer", "ui developer"],
  ["back end developer", "back end engineer"],
  ["mobile developer", "mobile engineer", "mobile app developer"],
  ["qa engineer", "test engineer", "software tester", "test analyst"],
  ["it support officer", "service desk analyst", "help desk support", "it support"],
  ["cyber security analyst", "information security analyst", "security analyst"],
  ["data analyst", "reporting analyst", "insights analyst"],
  ["ux designer", "ui ux designer"],
  // Care and health
  ["aged care worker", "personal care worker", "assistant in nursing"],
  ["disability support worker", "support worker"],
  ["dental assistant", "dental nurse"],
  // Office
  ["administration officer", "administrative assistant", "office administrator"],
  ["customer service officer", "customer service representative"],
  ["hr officer", "human resources officer"],
  ["recruiter", "recruitment consultant", "talent acquisition"],
  ["marketing coordinator", "marketing officer"],
  ["graphic designer", "visual designer"],
  // Education
  ["early childhood educator", "childcare educator"],
  ["teacher aide", "school services officer", "education support officer"],
  // Retail, hospitality, logistics, trades
  ["sales assistant", "retail assistant"],
  ["kitchen hand", "kitchen assistant"],
  ["warehouse worker", "storeperson", "picker packer"],
  ["forklift driver", "forklift operator"],
  ["labourer", "general hand"],
  ["mechanic", "automotive technician", "motor mechanic"],
];

/* A developer of software is an engineer of it, whatever the language. Only
   used when the role isn't in a group above, and only for clearly software
   roles: a "civil engineer" is not a "civil developer". Whole words of the
   normalised role, not \b: "c++", "c#" and ".net" start or end with a
   symbol, where \b never matches. */
const SOFTWARE =
  /(?:^|\s)(?:software|web|full stack|front end|back end|mobile|ios|android|app|application|java|javascript|typescript|python|php|ruby|golang|rust|scala|kotlin|swift|c\+\+|c#|\.net|react|angular|vue|node|salesforce|embedded|firmware|game)(?=\s|$)/;

const SENIORITY =
  /^(?:(?:senior|snr|junior|jnr|graduate|grad|lead|principal|staff|mid level|entry level|trainee)\s+)+/;

/** Lower case, one spelling of "full stack" and friends, single spaces. */
export function normalizeRole(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bfull[\s-]?stack\b/g, "full stack")
    .replace(/\bfront[\s-]?end\b/g, "front end")
    .replace(/\bback[\s-]?end\b/g, "back end")
    .replace(/\bdev[\s-]?ops\b/g, "devops")
    .replace(/\bui\s*\/\s*ux\b|\bux\s*\/\s*ui\b/g, "ui ux")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Up to `max` other names for the job in `query`, lower case, keeping any
 * seniority word ("senior software developer" → "senior software engineer").
 * Empty when the job isn't one we know other names for. One by default: each
 * is another paid board call.
 */
export function relatedTitles(query: string, max = 1): string[] {
  const q = normalizeRole(query);
  if (!q) return [];
  const prefix = q.match(SENIORITY)?.[0] ?? "";
  const role = q.slice(prefix.length);
  if (!role) return [];

  const out: string[] = [];
  const add = (title: string) => {
    const t = `${prefix}${title}`.trim();
    if (t !== q && !out.includes(t)) out.push(t);
  };

  // The whole role is one of the titles: "software developer". Not a role
  // that merely ends in one: "CNC programmer" isn't a software job.
  for (const family of FAMILIES) if (family.includes(role)) family.forEach(add);

  // A software developer is a software engineer: "react developer".
  if (!out.length && SOFTWARE.test(role)) {
    if (/ developer$/.test(role)) add(role.replace(/ developer$/, " engineer"));
    else if (/ engineer$/.test(role)) add(role.replace(/ engineer$/, " developer"));
  }

  return out.slice(0, max);
}

/**
 * How many results each term asks the board for, adding up to exactly
 * `perPage`: the first term (what the person typed, or the phrasing that
 * describes them best) gets at least half, the others split the rest. The
 * same shares every page, so page 2 carries on where page 1 stopped for
 * every term and nothing is trimmed off and lost. A page too small to share
 * goes to the first term alone (a share of 0 means "don't search it").
 */
export function termShares(perPage: number, terms: number): number[] {
  if (terms <= 1) return [perPage];
  const rest = Math.floor(perPage / 2 / (terms - 1));
  if (rest < 1) return Array.from({ length: terms }, (_, i) => (i === 0 ? perPage : 0));
  return [perPage - rest * (terms - 1), ...Array.from({ length: terms - 1 }, () => rest)];
}
