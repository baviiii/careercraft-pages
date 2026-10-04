# Faircopy — what is where

A map of the repo, written 2026-09-30 by walking the actual tree rather than
from memory. If something here disagrees with the code, the code is right and
this file is stale.

Scale: **~92,000 lines of TypeScript** in the web app, **12 edge functions**,
**43 migrations**.

---

## Top level

```
packages/careercraft-web/   the React app — everything a user sees
packages/shared/            types shared between app and functions (small)
supabase/functions/         edge functions — every server-side call
supabase/migrations/        schema, RLS, plans and limits (43 files)
scripts/                    PDF preview rendering, secret-setting helpers
dist/                       build output, not source
```

**Docs at the root, and what each is for:**

| File | What it holds |
|---|---|
| `README.md` | What the product is, how to run it, where the AI comes from |
| `LAUNCH-TODO.md` | What's left before launch, ordered by what blocks what |
| `CONCERNS.md` | Known issues parked on purpose. **Read before "fixing" something odd** |
| `MONETIZATION-PLAN.md` | Plans, limits, the token ledger. Mostly built, enforcement off |
| `INTELLIGENCE-REDESIGN.md` | The /intelligence rebuild, phase by phase |
| `PERSONALISATION-PLAN.md` | The embeddings work, phase by phase |
| `ARCHITECTURE.md` | This file |

---

## The web app — `packages/careercraft-web/src`

| Folder | Files | Lines | What it is |
|---|---|---|---|
| `components/` | 143 | 29,580 | Reusable UI. The biggest folder, and the most mixed |
| `features/` | 113 | 21,021 | Whole features, each self-contained |
| `pages/` | 31 | 16,450 | One file per route. Some are very large |
| `lib/` | 43 | 13,870 | Logic with no UI — AI clients, PDF, security |
| `hooks/` | 15 | 6,015 | Shared React state |
| `contexts/` | 1 | 3,291 | Just `IntelligenceContext` — one file, 3.3k lines |
| `integrations/` | 2 | 2,204 | Generated Supabase client + types |

### `features/` — the real products

Each folder owns its own page, components, hooks and types. This is the
healthiest part of the codebase; new work should look like this.

| Feature | Files | Does |
|---|---|---|
| `resume-builder/` | 28 | Build a résumé, pick a template, export PDF. Guests allowed |
| `analysis/` | 22 | **The ATS check.** Résumé + job ad → score, gaps, rewrites |
| `interview/` | 20 | Interview prep hub and practice room |
| `job-tracker/` | 17 | Applications board, discovery feed, email automation |
| `my-resumes/` | 10 | The saved-résumé library |
| `onboarding/` | 8 | "Getting started" — AI reads a résumé and fills the profile |
| `dispatch/` | 8 | News digests |

### `pages/` — one per route

Routes, from `App.tsx`:

**Public:** `/` `/auth` `/onboarding` `/about` `/contact` `/privacy` `/terms` `/try`
**Core:** `/dashboard` `/builder` `/my-resumes` `/analysis` `/rewrite` `/cover-letter` `/tracker` `/interview-prep`
**Market:** `/au-jobs` `/job-market-news` `/intelligence` `/career-coach` `/market-trends` `/career-explorer` `/policy`
**Admin:** `/admin/*` — users, activity, sessions, security, access, prompts, plans, audit

Pages are lazy-loaded, so they look unreferenced to a naive grep. They are not.

### `components/` — mixed bag, worth knowing the split

| Folder | Files | What |
|---|---|---|
| `ui/` | 35 | shadcn primitives. Vendored, mostly untouched |
| `templates/` | 27 | Résumé template designs (HTML side) |
| `intelligence/` | 20 | The /intelligence page's panels |
| `landing/` | 12 | Homepage sections |
| `admin/` | 10 | Admin tables and forms |
| `astral/` | 8 | The dark shell /intelligence sits in |
| `craft/` | 6 | **The main app shell** — sidebar, layout, buttons, dialogs |
| `job-market/`, `career-dev/`, `rag/`, `interview/`, `layout/`, `auth/`, `pdf/`, `brand/`, `careers/` | 1–5 each | Smaller groupings |

### `lib/` — logic without UI

| File / folder | What |
|---|---|
| `horusKnowledge.ts` | Client-side Horus calls |
| `atsAIAnalyzer.ts` | Calls `ats-analyze`; the ATS check's client half |
| `aiRewriter.ts`, `careerCoach.ts`, `interviewCoach.ts` | Feature-specific AI calls |
| `resumeParser.ts` | Reads an uploaded résumé in the browser |
| `pdfExport.ts` + `pdf/` (11) | react-pdf rendering. **Must mirror the HTML templates** |
| `security/` (11) | Sanitisers, rate limiting, audit log |
| `intelligence/` (2) | Snapshot cache, visualisation shaping |
| `personaTheme.ts` | Accent colour from the AI persona |
| `postAuthDestination.ts` | Where a user lands after login, incl. guest-draft claim |
| `coachChat.ts` | The Career Coach's stream client — parses the agent's SSE frames |
| `quota.ts`, `careerFields.ts` | Limits, field taxonomy |

### `hooks/` — the important ones

| Hook | Why it matters |
|---|---|
| `usePersonalization.ts` | **The match score lives here.** 8 signals, the similarity window, article scoring |
| `useUserProfile.ts` | Profile CRUD and the canonical enums (`INDUSTRIES`, `CAREER_LEVELS`) |
| `useRAGMetadata.ts` | One-shot retrieval (`semanticSearch`) for /intelligence and its siblings. **Horus only** — the Azure fallback was removed on purpose |
| `useCoachChat.ts` | The Career Coach conversation: drives the Horus agent, turns its tool calls into the thinking ledger |
| `useImpactQueries.ts` | Knowledge-graph impacts |

### `contexts/`

`IntelligenceContext.tsx` — 3,291 lines, the whole /intelligence data layer:
four standing queries, the snapshot cache, per-tab progressive rendering.
Large, and the biggest single file in the app.

---

## Edge functions — `supabase/functions`

Every server-side call. None of them hold a model key except `parse-resume`.

| Function | Lines | Does | AI? |
|---|---|---|---|
| `_shared/` | 1,823 | Auth, errors, quota, Horus clients, similarity | — |
| `job-news` | 1,534 | AU jobs, news, market trends. Adzuna + JSearch | yes (trends) |
| `ats-analyze` | 1,269 | The ATS check | **yes** |
| `track-session` | 586 | Login/session telemetry, geo | — |
| `horus-rag` | ~470 | One-shot retrieval and graph/budget reads for /intelligence | **yes** |
| `coach-chat` | ~230 | Career Coach: relays the Horus agent's stream (`/api/sdk/chat`), persona from `chat_prompts`, records spend | **yes** |
| `parse-resume` | 438 | Résumé → structured data. **Only direct Azure call** | **yes** |
| `onboard-analyze` | 386 | Résumé → profile, persona, targets, skills | **yes** |
| `job-search` | 359 | Tracker's discovery feed. Adzuna, nothing stored | — |
| `generate-prompt` | 268 | Admin prompt tooling | yes |
| `job-email-events` | 267 | Classifies recruiter emails → status changes | yes |
| `infer` | 224 | Thin shim to Horus | **yes** |
| `rewrite-resume` | 130 | Bullet rewriting | **yes** |

### `_shared/ai/` — worth knowing individually

| File | What |
|---|---|
| `horus.ts` | Generation: `horusInfer`, `horusGenerateText`, `horusGenerateObject`. Tiers, token ceilings, a mandatory meter |
| `horus-knowledge.ts` | Retrieval + `horusEmbed` + `cosineSimilarity` |
| `similarity.ts` | `attachSimilarity` — ranks a list against a profile. Used by job-news and job-search |
| `meter.ts`, `errors.ts` | Spend limits, typed errors |

---

## How the AI is wired

```
browser  →  supabase edge function  →  Horus gateway (horus.bavi.au)  →  Azure
```

**Everything** goes through Horus: parsing, onboarding, ATS, rewrites, cover
letters, chat, the /intelligence corpus, and embeddings.

Two doors for questions over the corpus, used for different things:

- **Career Coach chat** → `coach-chat` → Horus agent (`/api/sdk/chat`). The
  model picks its own tools (document search, graph lookup), keeps the
  conversation, and streams tokens and tool steps. Persona comes from
  `chat_prompts`, read server-side.
- **One-shot questions** (/intelligence tabs, the career popup, /try cards) →
  `horus-rag` op `search` → Horus `rag.query`: one search, one cited answer. There is no second
retrieval path — the old Azure AI Search estate was removed deliberately, so
an outage shows up as an outage instead of quietly answering from a stale
index.

One carve-out: `parse-resume` calls Azure OpenAI vision directly, because
Horus `/api/infer` does not accept image inputs.

Horus lives in a **separate repo** at `../horus-platform`.

---

## The job match score — where it actually lives

Asked often enough to be worth pinning down. It is one function:
`usePersonalization.isJobRecommended()`.

| Signal | Points | Source |
|---|---|---|
| Target role in title | 30 | profile |
| Current role in title | 20 | profile |
| Skills named in the ad | 10 each, max 4 | your own skills |
| Remote matches preference | 20 | profile |
| Location | 15 | profile |
| Salary meets floor | 15 (7 if predicted) | Adzuna |
| Industry | 10 | `INDUSTRIES` + synonyms |
| **Similarity to profile** | **0–25, graded** | Horus embeddings |

Then `matchLevel()` maps the raw sum onto 0–100 with a saturating curve, which
is why the top of the range is compressed and low scores move the most.

`scoreArticle()` is the same idea for news, capped lower.

---

## Things that will confuse you later

- **`npm run typecheck` compiles zero files.** Use `npx vite build` as the gate.
  See CONCERNS #3.
- **`strictNullChecks` is off**, so `?` on a type enforces nothing. CONCERNS #6.
- **Pages are lazy-loaded**, so a grep for `from "..."` will call them dead.
- **`observatory-bridge.css`** is a deliberate temporary shim mapping the dark
  /intelligence classes onto the cream palette. It should only ever shrink.
- **`job_fit_scores`** table still exists; nothing reads it.
- **Two `INDUSTRIES` lists** — the canonical one in `useUserProfile.ts` and a
  second, different one at `AustralianJobs.tsx:89`. CONCERNS #7.
- **Generated Supabase types are stale** (2026-08-22) and missing several
  tables, so some table names are not typed.
