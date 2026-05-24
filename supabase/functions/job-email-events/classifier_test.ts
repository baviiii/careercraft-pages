import { classifyEmail, statusFromEvent } from "./classifier.ts";

Deno.test("classifyEmail detects interview signals", () => {
  const result = classifyEmail("We would like to invite you for an interview next week.");
  if (result.eventType !== "interview") {
    throw new Error(`Expected interview, got ${result.eventType}`);
  }
  if (statusFromEvent(result.eventType) !== "interview") {
    throw new Error("Expected mapped status to be interview");
  }
});

Deno.test("classifyEmail detects rejection language", () => {
  const result = classifyEmail(
    "Unfortunately we will not be progressing your application at this stage.",
  );
  if (result.eventType !== "rejection") {
    throw new Error(`Expected rejection, got ${result.eventType}`);
  }
});
