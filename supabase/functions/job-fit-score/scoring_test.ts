import { deriveFitScore, summarizeResumeContent } from "./scoring.ts";

Deno.test("deriveFitScore increases with overlap", () => {
  const high = deriveFitScore(
    "React TypeScript AWS leadership achievements",
    "Senior React TypeScript engineer with AWS experience",
  );
  const low = deriveFitScore("retail operations", "Senior React TypeScript engineer with AWS experience");
  if (high.score <= low.score) {
    throw new Error(`Expected high overlap score > low score (${high.score} <= ${low.score})`);
  }
});

Deno.test("summarizeResumeContent aggregates structured resume", () => {
  const text = summarizeResumeContent({
    summary: "Full stack engineer",
    skills: ["React", "TypeScript"],
    experience: [{ title: "Engineer", company: "Acme", bullets: ["Built APIs"] }],
  });
  if (!text.includes("Full stack engineer") || !text.includes("React") || !text.includes("Built APIs")) {
    throw new Error("Expected structured content to be flattened into summary text");
  }
});
