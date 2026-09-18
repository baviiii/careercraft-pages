// au-context.ts — Australian job-market grounding shared across edge functions.
//
// CareerCraft serves the Australian market. Generic resume prompts default to
// US conventions (one-page rule, drop referees, US spelling, MM/DD dates),
// which is actively wrong advice here. These blocks are appended to system
// prompts so every AI path gives Australian answers by instruction, not by
// the model's defaults.
//
// Scope note: selection criteria are DETECTED and FLAGGED, not authored.
// Writing selection-criteria responses is a separate flow (parse criteria,
// draft against each, evidence per criterion) that does not exist yet —
// these prompts must not pretend it does.

/** Conventions for prompts that WRITE or ADVISE ON resume content
 * (ats-analyze rewrites/analysis, rewrite-resume bullets & cover letters). */
export const AU_RESUME_CONVENTIONS = `
=== AUSTRALIAN MARKET CONVENTIONS (this product serves Australian job seekers) ===

- LENGTH: 2-3 pages is the Australian standard. NEVER advise cutting a resume to one page and NEVER treat 2-3 pages as too long. Do not trim content to hit a US-style page limit.
- REFEREES: a "Referees" section is normal and expected in Australia. NEVER advise removing referees or recommend dropping them to save space. "Referees available on request" is also acceptable.
- QUALIFICATIONS: Australian qualifications follow the AQF — Certificate I-IV, Diploma, Advanced Diploma, Bachelor, Graduate Certificate, Graduate Diploma, Masters. Keep them exactly as named (e.g. "Certificate III in Individual Support"). NEVER convert them to US equivalents or suggest they need explanation.
- PERSONAL DETAILS: no photo, no date of birth, no marital status. Location as suburb/city + state (e.g. "Adelaide, SA") is sufficient — do not ask for a full street address.
- SPELLING: Australian English throughout — organised, specialised, analysed, optimised, centre, licence (noun), colour, honours. NEVER introduce US spellings, and never flag Australian spelling as an error.
- DATES: Australian format — "March 2024" or DD/MM/YYYY. Day comes before month in numeric dates.
- RIGHT TO WORK: preserve exact phrasing of citizenship, permanent residency, or visa work rights (e.g. "Australian citizen", "PR holder", "482 visa with full work rights"). NEVER reword into US visa terminology.
- STAR: behavioural examples framed as Situation-Task-Action-Result are well understood by Australian recruiters, especially in government hiring.
- SELECTION CRITERIA: Australian government and public-sector jobs often require a separate statement addressing each selection criterion. If the job description lists selection criteria, say so explicitly and remind the user the resume alone does not answer them — but do NOT attempt to write the selection-criteria responses yourself.
`.trim();

/** Rules for prompts that READ resumes (parse-resume text & vision paths).
 * Parsing is extraction, so the risk is misreading AU conventions, not giving
 * bad advice. */
export const AU_PARSING_RULES = `
AUSTRALIAN RESUMES — most documents are from the Australian market:
- "Referees" is the Australian name for the references section; extract it into references.
- Preserve AQF qualification names exactly as written ("Certificate III in Individual Support", "Diploma of Nursing", "Advanced Diploma", "Graduate Certificate") in the degree field. NEVER rename them to US equivalents.
- Numeric dates are DD/MM/YYYY — day before month. "03/07/2021" is 3 July 2021 (2021-07), not March 7. Convert accordingly when producing YYYY-MM.
- Locations are commonly "Suburb, STATE" using SA, NSW, VIC, QLD, WA, TAS, NT, ACT. Keep them as given.
- Right-to-work statements ("Australian citizen", "Permanent resident", "482 visa") often appear near contact details or the summary — keep the exact wording, folding it into the summary if there is no better field.
- Keep Australian English spelling exactly as written (organised, specialised, licence) — never "correct" it to US spelling.
`.trim();

/** One-liner for light-touch prompts where the full block is overkill. */
export const AU_SPELLING_NOTE =
  "Use Australian English spelling throughout (organised, specialised, analysed, centre, licence). This is for the Australian job market — never introduce US spellings.";
