import { categoryName, commonCategory, severalWords, termShares } from "./terms.ts";

const eq = (got: unknown, want: unknown, why: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(`${why}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};

const it = { tag: "it-jobs", label: "IT Jobs" };
const health = { tag: "healthcare-nursing-jobs", label: "Healthcare & Nursing Jobs" };
const other = { tag: "other-general-jobs", label: "Other/General Jobs" };
const graduate = { tag: "graduate-jobs", label: "Graduate Jobs" };
const partTime = { tag: "part-time-jobs", label: "Part time Jobs" };

Deno.test("the field most ads are filed under, never one that cuts across fields", () => {
  eq(commonCategory([it, health, it]), it, "most");
  eq(commonCategory([health, it]), health, "first seen on a tie");
  eq(commonCategory([other, other, it]), it, "catch-all skipped");
  eq(commonCategory([graduate, partTime, graduate, health]), health, "graduate and part time skipped");
  eq(commonCategory([other]), null, "only the catch-all");
  eq(commonCategory([]), null, "no ads");
});

Deno.test("a category's name without 'Jobs'", () => {
  eq(categoryName("IT Jobs"), "IT", "it");
  eq(categoryName("Healthcare & Nursing Jobs"), "Healthcare & Nursing", "health");
});

Deno.test("several words, or one", () => {
  eq(severalWords("Software Developer"), true, "two");
  eq(severalWords("  nurse  "), false, "one");
  eq(severalWords(""), false, "none");
});

Deno.test("shares add up to the page exactly, the first term getting at least half", () => {
  eq(termShares(50, 1), [50], "one term");
  eq(termShares(50, 2), [25, 25], "two terms");
  eq(termShares(50, 3), [26, 12, 12], "three terms");
  eq(termShares(30, 3), [16, 7, 7], "the default page");
  eq(termShares(1, 3), [1, 0, 0], "too small to share");
  for (let perPage = 1; perPage <= 50; perPage++) {
    for (let n = 1; n <= 4; n++) {
      const s = termShares(perPage, n);
      const sum = s.reduce((a, b) => a + b, 0);
      if (sum !== perPage) throw new Error(`${perPage} over ${n} terms adds to ${sum}`);
      if (s[0] < perPage / 2) throw new Error(`${perPage} over ${n}: first share ${s[0]} is under half`);
      if (s.some((x) => x < 0)) throw new Error(`${perPage} over ${n}: a negative share`);
    }
  }
});
