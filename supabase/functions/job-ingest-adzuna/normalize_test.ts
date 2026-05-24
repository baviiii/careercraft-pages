import { detectRemote, normalizeJobType, stripHtml } from "./normalize.ts";

Deno.test("stripHtml removes tags and preserves words", () => {
  const output = stripHtml("<p>Hello <strong>world</strong></p>");
  if (output !== "Hello world") throw new Error(`Unexpected output: ${output}`);
});

Deno.test("normalizeJobType maps Adzuna contract labels", () => {
  if (normalizeJobType("full_time") !== "full-time") throw new Error("full_time not mapped");
  if (normalizeJobType("part_time") !== "part-time") throw new Error("part_time not mapped");
});

Deno.test("detectRemote catches remote hints", () => {
  if (!detectRemote("Senior Engineer (Remote)", null)) throw new Error("Expected remote=true");
  if (detectRemote("Senior Engineer", "Onsite only")) throw new Error("Expected remote=false");
});
