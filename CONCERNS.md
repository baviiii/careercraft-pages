# Concerns

Known issues parked on purpose. **None of these crash anything** — they're
decisions to make when there's time, not bugs to chase now.

Add to this file rather than fixing mid-ship.

---

## 1. Guests get more résumé parses than free accounts

**Found:** 2026-09-19, while opening `parse-resume` to guests.

| Who | Text parses |
|---|---|
| Guest, no account | 10 per hour, forever |
| Free account | **3 per month** |

The free-plan number comes from `plan_limits` (seeded in
`supabase/migrations/20260821000100_plans_and_limits.sql`): free plan,
resource `parse-resume`, `monthly_limit 3`, `hourly_limit 3`.

Guest limits are in `supabase/functions/parse-resume/index.ts`
(`GUEST_HOURLY_PER_IP = 10`, `GUEST_HOURLY_TOTAL = 500`).

**Why it matters:** signing up is currently a downgrade for this feature.
Anyone who hits the wall learns to log out instead.

**Not urgent because:** nothing breaks, and until there's real signup traffic
nobody hits 3/month anyway.

**Decide later:** raise the free plan's `parse-resume` limits (a small
migration), or lower the guest allowance below the free plan's. Leaning
towards raising free — a parse is cheap and it's the moment someone decides
the product works.

---

## 2. Azure Document Intelligence — dead code paths, live credentials

**Found:** 2026-09-19.

No code calls Azure DI anymore. It was removed with the decommissioned
CareerCraft Azure estate; `parse-resume` uses gpt-4o-mini vision instead.
Verified: no `analyzeDocument`, no `prebuilt-*`, no DI endpoint call anywhere
in the repo.

**But the setup plumbing still references it:**

- `set-supabase-secrets.ps1` (lines ~32-34) and `set-supabase-secrets.sh`
  (~29-31) still push `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` and `_KEY` to
  Supabase.
- `.env.example:20` is the only one that's correct — says REMOVED.

**Half resolved 2026-09-27:** `supabase/RAG-ENV-SETUP.md` claimed at line 112
that `parse-resume` used Azure Document Intelligence. That file is deleted —
along with the rest of the Azure-Functions-RAG docs, which described a
retrieval path the code no longer has. Only the two secrets scripts are left.

**Why it matters:** setting up a fresh environment from these scripts/docs
provisions and wires a service nothing uses. Relevant now that Azure has been
recommissioned a different way — the stale docs describe the old shape.

**Not urgent because:** setting an unused secret costs nothing and breaks
nothing.

**Decide later:** strip DI from the two secrets scripts. Unrelated:
`DocumentIntelligenceVisualizer` in
`CareerExplorer.tsx` / `TryUs.tsx` is a Horus-era React component, same words,
nothing to do with Azure DI — leave it alone.

---

## 3. The CI typecheck gate doesn't check anything

**Found:** 2026-09-20.

`.github/workflows/deploy.yml:59` runs `npm run typecheck`, which is
`tsc --noEmit` with no project flag. That resolves to `tsconfig.json`, which
has `"files": []` and only project references — so it compiles **zero files**
and always passes.

The real check is `npx tsc --noEmit -p tsconfig.app.json`, which currently
reports **14 errors** (all pre-existing, spread across `useEnterpriseRAG`,
`usePersonalization`, `usePlansAdmin`, `pdfExport`, `resumeParser`,
`UserManagement`, `Settings`, `NextGenInsights`).

**Confirmed again 2026-09-27**, and it bites: `npm run typecheck` passed clean
immediately after a dead-code sweep that had deleted a component still imported
by `DocumentIntelligenceVisualizer`. `npx vite build` caught it in 2.5 seconds
with an `UNRESOLVED_IMPORT`. Until the script is fixed, **`vite build` is the
gate** — never trust `typecheck` to tell you a deletion was safe.

**Why it matters:** this is how a real bug survived — `creative.tsx` passed
`maxLines` as a prop instead of a style, react-pdf silently ignored it, and
the only thing reporting it was a typecheck nobody was running.

**Not urgent because:** the errors are pre-existing and none of them crash at
runtime today.

**Decide later:** point `typecheck` at `tsconfig.app.json` — but fix or
baseline the 14 errors first, or CI starts failing every deploy immediately.

---

## 4. Smaller notes from the same change

- **Guest résumés go to Azure with no account.** Names, phones, emails, and
  referees' contact details — referees being third parties who never agreed to
  anything. The privacy policy should cover guest processing. This is the one
  here with legal rather than technical consequences.
- **The regex fallback hides breakage.** If `parse-resume` is misconfigured,
  guests silently get bad parses instead of errors. Watch `[parse-resume]`
  logs after deploying rather than assuming silence = working.
- **Per-IP rate limiting may be soft.** The IP comes from `x-forwarded-for`.
  Unverified whether Supabase replaces or appends it — if it appends, the
  10/hour per-IP limit is forgeable. The global 500/hour bucket is the one
  that actually holds, so cost stays capped either way.
- **The global bucket is deniable.** One attacker burning 500/hour drops every
  real guest to the regex fallback. Deliberate trade: caps money, not
  availability.
- **No alerting on any of it.** Nothing tells you when the global cap
  saturates.
- **60k accepted, 15k actually read.** `JsonBodySchema` takes up to 60,000
  characters but the prompt only sees `MAX_INPUT_CHARS` (15,000 — roughly a
  5-6 page résumé, so ~3.5x a normal one). A longer paste is silently
  truncated with no signal. Either stop accepting more than is read, or tell
  the user it was cut.
- **No test runner exists.** `careercraft-web` has no vitest/jest configured
  at all, so "add tests for the guest vs auth branching" means standing up the
  harness first — not a quick win. Untested: `optionalUser`, guest/auth
  branching, rate-limit keys, and the references/awards/volunteer/publications
  mapper.

---

## 5. The only in-repo chat guardrails were dead code

**Found:** 2026-09-27, during the dead-code sweep.

`src/lib/careerGuardrails.ts` held `CAREER_SYSTEM_DISCLAIMER` and
`CAREER_SAFETY_RULES` — explicit refusals for medical, legal and financial
advice, plus "do not invent SA Government programs". Nothing imported it, and
that text existed nowhere else in the repo. So those rules were not being
applied anywhere. Deleted with the rest of the dead code.

Live prompts come from the database via `promptLoader.ts`, falling back to
`FALLBACK_CAREER_PROMPT` in that same file. The fallback covers tone, sourcing
and structure — it does **not** carry any refusal rules.

**Why it matters:** the chat surface will answer a medical or legal question if
the DB prompt does not tell it not to, and the repo no longer contains the text
that says it shouldn't.

**Not urgent because:** the DB prompt may well carry equivalent rules — it is
admin-editable and has been edited. This is unverified, not known-broken.

**Decide later:** read the live `career` prompt row in Supabase. If it has no
refusal section, paste one in — it is a text edit in `/admin`, not a deploy.
The deleted wording is recoverable from git history if you want it verbatim.

---

## 6. `strictNullChecks` is off, so optional fields are unenforced

**Found:** 2026-09-27, while making `SkillDemand.demand` optional.

`packages/careercraft-web/tsconfig.json` sets `strictNullChecks: false` (also
`noImplicitAny: false`, `noUnusedLocals: false`, `noUnusedParameters: false`).

Marking a field optional therefore changes **nothing** the compiler checks.
`skill.growth.toFixed(1)` on `growth?: number` compiles clean and throws at
runtime. Three such sites existed in the intelligence panels and had to be
found by grep; one of them — `ExecutiveSummary`'s `topCareer?.growth.toFixed(1)`
— optional-chained the object but not the field, and had been printing
`NaN% projected growth` in production for as long as any career lacked a figure.

Combined with #3 (the typecheck script compiles zero files), the
practical position is that **nothing** checks nullability in this codebase.

**Why it matters:** the honest-data work depends on absent figures being
absent. Every `?` added to a type is a promise the compiler is not keeping, so
each one needs a manual sweep of its readers.

**Not urgent because:** turning `strictNullChecks` on now would surface a large
backlog at once, and the 14 errors in #3 are not even being read yet.

**Decide later:** fix #3 first so the gate runs at all. Then enable
`strictNullChecks` and work the list down, or enable it for `src/contexts` and
`src/components/intelligence` only, where the honest-data invariants live.

---

## 7. The 20-industry list still flattens the profile

**Found:** 2026-09-30, while adding meaning-based ranking.

`INDUSTRIES` in `useUserProfile.ts:727` is 20 fixed values, and
`normalizeIndustry` forces the AI's inference onto one of them at onboarding.
A résumé reading "aged care nursing" is stored as `Healthcare`; the original
wording is gone before anything downstream sees it.

**Measured impact — small, and smallest where it matters:**

| Case | With the signal | Without | Cost |
|---|---|---|---|
| Strong match (all signals) | 98 strong | 97 strong | **1 pt** |
| Good match | 93 strong | 91 strong | **2 pts** |
| Career changer | 71 good | 62 good | 9 pts |
| **Partial match** | **79 strong** | **72 good** | **7 pts — band flips** |

`matchLevel`'s saturating curve is why. Ten raw points are worth 1–2 match
points on a job that already fits and 8–25 on one that barely does — so the
signal matters *least* at the top of the list, which is the part users read.

It is also additive-only: a miss costs 10 points and can never award them
wrongly or hide a job. And the embedding barely depends on it — industry is one
word out of roughly twenty-five in the profile text, while the job titles and
skills that actually identify someone go through as free text.

**Why it matters anyway:** the one case that moves is a *partial* match flipping
good → strong, which is the middle of the range where people make judgement
calls. And the profile feeds jobs, news, trends and résumé advice alike, so the
flattening is inherited everywhere rather than being local to one screen.

**Not urgent because:** it is a 1–2 point effect on the results anyone actually
looks at, similarity now covers the thin-signal cases that used to depend on it,
and `industryMatches` scores 14/14 against the category labels it was tested on.

**Decide later — cheapest fix first, and it is nearly free.** `persona.vertical`
already holds the unflattened sector ("Public Health", "Aged Care", "FinTech"):
extracted by `onboard-analyze`, kept by `normalize.ts:267`, persisted inside
`ai_persona` (`onboarding-api.ts:179`), and already read at
`usePersonalization.ts:417` for the accent theme. Nothing else uses it. Adding
it to `getProfileEmbeddingText` is about two lines and recovers the lost nuance
with no migration, no new AI call and no list to maintain.

Only if that proves insufficient: let `industry` be free text, or widen the
list. Both are larger than the problem currently justifies.

**Related:** `AustralianJobs.tsx:89` declares its own second `INDUSTRIES` list —
10 values, different from the canonical 20 — which can drift from it. Also
`industryMatches`'s synonym list was written against Adzuna category labels that
were *predicted, not observed*; their `/categories` endpoint needs a key. The
jobs page logs unmatched categories in dev so the real ones surface.
