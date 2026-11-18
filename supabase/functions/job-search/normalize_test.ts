import * as browser from "../../../packages/careercraft-web/src/features/browse-jobs/lib/sameJob.ts";
import {
  companyKey,
  dedupeJobs,
  detectRemote,
  isSameJob,
  normalizeJobType,
  sameCompany,
  samePlace,
  statesPay,
  stripHtml,
  titleKey,
} from "./normalize.ts";

/* Copies seen on 2026-11-14 for "Software Engineer" in Adelaide. */
const FLYWIRE =
  "Are you ready to trade your job for a journey? Become a FlyMate! Passion, excitement & global collaboration are all core to what it means to be a FlyMate. At Flywire, we're on a mission to deliver the world's most important and complex payments.";
const TOPCON =
  "Topcon Precision Agriculture (TPA) is a subsidiary of Topcon Positioning Systems Inc. (TPS). TPA develops and manufactures leading-edge satellite positioning and guidance systems, electronic controls, mapping, monitoring, and land leveling solutions for agriculture. Build technology that helps feed the world.";
const job = (
  title: string,
  company: string,
  snippet: string | null,
  pay?: number,
  location: string | null = "Adelaide, Adelaide Region",
) => ({
  title,
  company,
  location,
  description_snippet: snippet,
  salary_min: pay ?? null,
  salary_max: pay ?? null,
  salary_is_predicted: false,
});
const WOOLWORTHS =
  "At Woolworths Group we are proud to be one of Australia's largest employers, with team members across our stores, distribution centres and support offices. We celebrate diversity and value every team member. Join our store team and help customers every day.";

Deno.test("companyKey drops legal forms, brackets and punctuation", () => {
  if (companyKey("Flywire Pacific Pty [Australia]") !== "flywire pacific") throw new Error(companyKey("Flywire Pacific Pty [Australia]"));
  if (companyKey("Softtest pays pty ltd") !== companyKey("Softtest pays pty")) throw new Error("pty ltd vs pty");
  if (companyKey("Topcon Positioning Systems, Inc") !== "topcon positioning systems") throw new Error("inc");
});

Deno.test("sameCompany allows a longer form, never a placeholder", () => {
  if (!sameCompany("Topcon Positioning", "Topcon Positioning Systems, Inc")) throw new Error("longer form");
  if (!sameCompany("Saab", "Saab Australia")) throw new Error("Saab");
  if (sameCompany("Saab", "Saaby")) throw new Error("prefix of a word is not a company");
  if (sameCompany("Unknown company", "Unknown company")) throw new Error("placeholders are not one company");
});

Deno.test("isSameJob: one ad twice, under different names and openings", () => {
  if (!isSameJob(job("Software Engineer I", "Flywire Pacific Pty [Australia]", FLYWIRE), job("Software Engineer I", "Flywire Pacific Pty [Australia]", FLYWIRE))) {
    throw new Error("identical copies");
  }
  if (!isSameJob(job("Senior Software Engineer", "Topcon Positioning", TOPCON), job("Senior Software Engineer", "Topcon Positioning Systems, Inc", `Adelaide, AUS Full time JR107646 ${TOPCON}`))) {
    throw new Error("agency copy with a different opening");
  }
});

Deno.test("isSameJob: different jobs stay apart", () => {
  if (isSameJob(job("Software Engineer", "Saab", FLYWIRE), job("Senior Software Engineer", "Saab", FLYWIRE))) throw new Error("different title");
  if (isSameJob(job("Software Engineer", "Saab", FLYWIRE), job("Software Engineer", "Fivecast", FLYWIRE))) throw new Error("different company");
  if (isSameJob(job("Registered Nurse", "SA Health", "Emergency department, night shifts in a busy metropolitan hospital"), job("Registered Nurse", "SA Health", "Community mental health team visiting clients across the northern suburbs"))) {
    throw new Error("same title and employer, different jobs");
  }
});

Deno.test("the same job in two places is two jobs", () => {
  // Same employer boilerplate, different stores.
  if (isSameJob(job("Team Member", "Woolworths", WOOLWORTHS, undefined, "Marion, Adelaide"), job("Team Member", "Woolworths", WOOLWORTHS, undefined, "Elizabeth, Adelaide"))) {
    throw new Error("two stores merged");
  }
  // One place said two ways is still one place.
  if (!samePlace("Adelaide CBD, Adelaide", "Adelaide, Adelaide Region")) throw new Error("CBD vs region");
  if (!samePlace("Adelaide", "Marion, Adelaide")) throw new Error("broader place");
  if (!samePlace(null, "Marion, Adelaide")) throw new Error("no place given");
  if (!isSameJob(job("Senior Software Engineer", "Fivecast", TOPCON, undefined, "Adelaide CBD, Adelaide"), job("Senior Software Engineer", "Fivecast", TOPCON, undefined, "Adelaide, Adelaide Region"))) {
    throw new Error("CBD and region copies of one ad");
  }
});

Deno.test("the browser's copy of these rules agrees with this one", () => {
  const names = ["Flywire Pacific Pty [Australia]", "Softtest pays pty", "Softtest pays pty ltd", "Topcon Positioning Systems, Inc", "Topcon Positioning", "Saab", "Saab Australia", "Unknown company", "A & B Co (SA)", "", "Hays"];
  const places = ["Adelaide, Adelaide Region", "Adelaide CBD, Adelaide", "Marion, Adelaide", null, ""];
  const texts = [TOPCON, `Adelaide, AUS Full time JR107646 ${TOPCON}`, WOOLWORTHS, FLYWIRE, "", null];
  const titles = ["Software Engineer", "software engineer!", "Senior Software Engineer"];
  for (const a of names) {
    if (companyKey(a) !== browser.companyKey(a)) throw new Error(`companyKey: ${a}`);
    for (const b of names) if (sameCompany(a, b) !== browser.sameCompany(a, b)) throw new Error(`sameCompany: ${a} | ${b}`);
  }
  for (const t of titles) if (titleKey(t) !== browser.titleKey(t)) throw new Error(`titleKey: ${t}`);
  for (const p of places) for (const q of places) if (samePlace(p, q) !== browser.samePlace(p, q)) throw new Error(`samePlace: ${p} | ${q}`);
  for (const t of titles) for (const x of texts) for (const y of texts) for (const p of places) {
    const a = job("Software Engineer", "Topcon Positioning", x);
    const b = job(t, "Topcon Positioning Systems, Inc", y, 90_000, p);
    if (isSameJob(a, b) !== browser.isSameJob(a, b)) throw new Error(`isSameJob: ${JSON.stringify([a, b])}`);
    if (statesPay(b) !== browser.statesPay(b)) throw new Error("statesPay");
  }
});

Deno.test("mergeCopies: a copy on the next page is dropped, unless it states the pay", () => {
  const shown = [
    { id: "1", ...job("Software Engineer I", "Flywire Pacific", FLYWIRE) },
    { id: "2", ...job("Data Engineer", "Emanate Technology", "NV1 clearance required") },
  ];
  const next = [
    { id: "3", ...job("Software Engineer I", "Flywire Pacific Pty [Australia]", FLYWIRE, 120_000) },
    { id: "2", ...job("Data Engineer", "Emanate Technology", "NV1 clearance required") },
    { id: "4", ...job("AI Architect", "Fivecast", "Lead the design of AI capabilities") },
  ];
  const out = browser.mergeCopies(shown, next);
  if (out.map((j) => j.id).join() !== "3,2,4") throw new Error(`got ${out.map((j) => j.id).join()}`);
});

Deno.test("dedupeJobs keeps the first place and the copy that states pay", () => {
  const out = dedupeJobs([
    job("Software Engineer I", "Flywire Pacific Pty [Australia]", FLYWIRE),
    job("Data Engineer", "Emanate Technology", "NV1 clearance required"),
    job("Software Engineer I", "Flywire Pacific", FLYWIRE, 120_000),
  ]);
  if (out.length !== 2) throw new Error(`expected 2, got ${out.length}`);
  if (out[0].title !== "Software Engineer I" || out[0].salary_min !== 120_000) throw new Error("kept the wrong copy");
  if (out[1].title !== "Data Engineer") throw new Error("order changed");
});

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
