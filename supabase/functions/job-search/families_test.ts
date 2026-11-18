import { normalizeRole, relatedTitles, termShares } from "./families.ts";

const eq = (got: unknown, want: unknown, why: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(`${why}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

Deno.test("a software developer search also finds the engineer ads", () => {
  eq(relatedTitles("Software Developer"), ["software engineer"], "developer");
  eq(relatedTitles("software engineer"), ["software developer"], "engineer");
});

Deno.test("one other name by default, more only when asked", () => {
  eq(relatedTitles("Software Developer", 2), ["software engineer", "programmer"], "two");
  for (const q of ["Mobile Developer", "QA Engineer", "IT Support Officer", "Recruiter"]) {
    if (relatedTitles(q).length > 1) throw new Error(`${q} gave more than one`);
  }
});

Deno.test("seniority is kept on the other name", () => {
  eq(relatedTitles("Senior Software Developer"), ["senior software engineer"], "senior");
  eq(relatedTitles("Graduate Full-Stack Developer"), ["graduate full stack engineer"], "graduate");
});

Deno.test("spellings of full stack, front end and back end are one", () => {
  eq(normalizeRole("Full-Stack Developer"), "full stack developer", "full-stack");
  eq(normalizeRole("Fullstack  developer"), "full stack developer", "fullstack");
  eq(normalizeRole("Frontend Engineer"), "front end engineer", "frontend");
  eq(relatedTitles("Full-Stack Developer"), ["full stack engineer"], "full stack");
});

Deno.test("a software role not in the list swaps developer and engineer", () => {
  eq(relatedTitles("React Developer"), ["react engineer"], "react");
  eq(relatedTitles("Java Software Developer"), ["java software engineer"], "java software developer");
  eq(relatedTitles("Salesforce Engineer"), ["salesforce developer"], "salesforce");
});

Deno.test("C#, C++ and .NET count as software", () => {
  eq(relatedTitles("C# Developer"), ["c# engineer"], "c#");
  eq(relatedTitles("C++ Engineer"), ["c++ developer"], "c++");
  eq(relatedTitles(".NET Developer"), [".net engineer"], ".net");
});

Deno.test("no other occupation is searched by mistake", () => {
  // Each of these once came out as a different job (2026-11-17 review).
  for (const q of [
    "CNC Programmer",
    "Aerospace Systems Engineer",
    "Systems Engineer",
    "Industrial Product Designer",
    "Window Cleaner",
    "Farm Labourer",
    "Youth Support Worker",
    "Sous Chef",
    "Chef",
    "Civil Engineer",
    "Mechanical Engineer",
    "engineer",
  ]) {
    eq(relatedTitles(q), [], q);
  }
});

Deno.test("non-tech families, and nothing for unknown or empty roles", () => {
  eq(relatedTitles("Aged Care Worker"), ["personal care worker"], "aged care");
  eq(relatedTitles("Teacher Aide"), ["school services officer"], "teacher aide");
  eq(relatedTitles("Astronaut"), [], "unknown");
  eq(relatedTitles(""), [], "empty");
  eq(relatedTitles("Senior"), [], "only a seniority word");
});

Deno.test("shares add up to the page exactly, the first term getting at least half", () => {
  eq(termShares(50, 1), [50], "one term");
  eq(termShares(50, 2), [25, 25], "two terms");
  eq(termShares(50, 3), [26, 12, 12], "three terms");
  eq(termShares(30, 3), [16, 7, 7], "the default page");
  eq(termShares(1, 3), [1, 0, 0], "too small to share");
  for (let perPage = 1; perPage <= 50; perPage++) {
    for (let n = 1; n <= 3; n++) {
      const s = termShares(perPage, n);
      const sum = s.reduce((a, b) => a + b, 0);
      if (sum !== perPage) throw new Error(`${perPage} over ${n} terms adds to ${sum}`);
      if (s[0] < perPage / 2) throw new Error(`${perPage} over ${n}: first share ${s[0]} is under half`);
      if (s.some((x) => x < 0)) throw new Error(`${perPage} over ${n}: a negative share`);
    }
  }
});
