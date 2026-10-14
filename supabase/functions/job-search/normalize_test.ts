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
  if (!detectRemote("Data Analyst", "This role can be worked fully remote")) throw new Error("Expected remote=true");
  if (!detectRemote("Support Officer", "Work from home three days a week")) throw new Error("Expected remote=true");
  if (detectRemote("Senior Engineer", "Onsite only")) throw new Error("Expected remote=false");
});

Deno.test("detectRemote ignores remote places", () => {
  if (detectRemote("Registered Nurse", "Serving rural and remote communities across SA")) {
    throw new Error("rural and remote communities is a place, not remote work");
  }
  if (detectRemote("Teacher", "Remote area allowance applies")) throw new Error("remote area allowance is pay, not remote work");
  if (detectRemote("Remote Area Nurse", "Based in Coober Pedy")) throw new Error("Remote Area Nurse is on site");
});
