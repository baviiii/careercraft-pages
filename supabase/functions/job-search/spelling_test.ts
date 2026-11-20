import { correctQuery, editDistance } from "./spelling.ts";

const eq = (got: unknown, want: unknown, why: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(`${why}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

const IT_TITLES = ["Software Developer", "Senior Software Engineer", ".NET Developer", "Graduate Developer"];
const CARE_TITLES = ["Registered Nurse", "Enrolled Nurse", "Assistant in Nursing", "Aged Care Worker", "Personal Care Worker"];

Deno.test("edits: added, dropped, changed and swapped letters each count once", () => {
  eq(editDistance("devloper", "developer"), 1, "dropped");
  eq(editDistance("nurce", "nurse"), 1, "changed");
  eq(editDistance("softwrae", "software"), 1, "swapped");
  eq(editDistance("welder", "wonder"), 2, "two");
  eq(editDistance("", "chef"), 4, "empty");
});

Deno.test("a slip of the keyboard is corrected from nearby ad titles", () => {
  eq(correctQuery("devloper", IT_TITLES), "developer", "one word");
  eq(correctQuery("Sofware Developer", IT_TITLES), "software Developer", "first word, the rest as typed");
  eq(correctQuery("software devloper", IT_TITLES), "software developer", "last word");
  eq(correctQuery("nurce", CARE_TITLES), "nurse", "nurse");
  eq(correctQuery("aged care workr", CARE_TITLES), "aged care worker", "worker");
});

Deno.test("everything around the words is kept", () => {
  eq(correctQuery(".NET Devloper", IT_TITLES), ".NET developer", ".NET");
  eq(correctQuery("C#/.NET Develper", IT_TITLES), "C#/.NET developer", "C#/.NET");
});

Deno.test("words the titles use, and short or numbered words, are left alone", () => {
  eq(correctQuery("software developer", IT_TITLES), null, "already right");
  eq(correctQuery("astronaut", IT_TITLES), null, "nothing close");
  eq(correctQuery("welder", ["Wonder Lead", "Wonder Hand"]), null, "a short word two edits away");
  eq(correctQuery("dev", ["Den Manager", "Den Assistant"]), null, "under four letters");
  eq(correctQuery("level 3", ["Level 2 Support", "Level 2 Analyst"]), null, "digits");
});

Deno.test("a word in only one ad's title is no correction, however often it's repeated", () => {
  eq(correctQuery("lawyer", ["Layer Manager - Layer Farm"]), null, "one ad");
  eq(correctQuery("lawyer", ["Layer Manager", "Layer Hand"]), "layer", "two ads");
});

Deno.test("ordinary words in descriptions don't count", () => {
  // Only titles are passed in: "must" from an ad's text is never a candidate.
  eq(correctQuery("rust developer", IT_TITLES), null, "rust");
});

Deno.test("nothing to correct in an empty search or no ads", () => {
  eq(correctQuery("", IT_TITLES), null, "empty search");
  eq(correctQuery("devloper", []), null, "no ads");
});
