# Personalisation — embeddings plan

Written 2026-09-27, after fixing the job match score by hand (commits
`da98e0e`, `8d7fcc1`, `9553ac8`). Those fixes took the score from 3 working
signals to 7 using only deterministic matching. This document covers what
deterministic matching **cannot** do, and what to build for it.

---

## 1. The rule this plan follows

> **Use a map when both sides are a closed list. Use embeddings when either
> side is open.**

Applied to what exists today:

| Mapping | Input | Output | Tool | State |
|---|---|---|---|---|
| Adzuna category → industry | ~30 labels | 20 industries | map | **done** (`industryMatches`, 14/14) |
| Résumé free text → industry | **anything** | 20 industries | embeddings | Phase 3 |
| Your skills → advert phrasing | **anything** | **anything** | embeddings | Phase 4 |
| Job title → job title | **anything** | **anything** | embeddings | Phase 4 |

The two deterministic wins are already shipped. Everything below is the open
cases, where no list can ever be finished.

## 2. What deterministic matching cannot do

**Skills match on exact phrasing.** A profile saying `Wound Care` matches an ad
saying "wound care" and misses "wound management", "clinical dressings",
"dressing changes". `skill_tags` growing helps the *vocabulary* and does
nothing for *phrasing* — those are separate rows that will never match each
other. One synonym entry per pair, forever.

**Job titles are not compared at all.** "Enrolled Nurse" ↔ "Patient Care
Assistant" ↔ "Aged Care Worker" are the same job market to a human and share no
word. This is the biggest gap for a career changer, which is the user this
product is for.

**Onboarding narrows a versatile input into a 20-value enum.** Extraction is
AI and handles any résumé (`onboard-analyze` → `horusGenerateObject`). Then
`normalize.ts` maps it onto canonical enums with five aliases
(`it, ict, fintech, defence, mining`) and a keyword list. "Aged Care" finds no
exact match, no alias, probably no keyword — and becomes **`'Other'`**, which
can never match any job or article again. Silently, permanently, for that user.

That last one is the root. The profile feeds jobs, news, market trends, ATS
advice and résumé guidance, so one wrong `'Other'` degrades four surfaces at
once. Job-match similarity improves ranking on one screen.

## 3. What this plan deliberately does not build

- No new tables. No migration. No pgvector query.
- **No stored vectors** — not for profiles, not for jobs.
- No cache, no TTL, no cleanup job.
- No cron, no triggers, no queues, no background functions.
- No new UI. `MatchMeter` already draws the ring; it gets a better number.

Storing nothing is a deliberate choice, and it is what answers the objections
that killed `jobs_catalog`: nothing goes stale, nothing expires, nothing is
per-user, nothing is redundant, and switching embedding model later costs
nothing because there is no data to migrate.

It is affordable because the volume is trivial. ~50 jobs × ~75 tokens ≈ 3,750
tokens per search; on `text-embedding-3-small` at roughly $0.02/M that is about
**$0.00008 per search** — ten thousand searches for under a dollar. A cache
would save well under a dollar and cost a table, a staleness question and a
cleanup job. **Verify that rate before committing.**

The real cost is latency: one extra round trip per search.

## 4. Phases

### Phase 0 — Measure first (half a day)
Do not build either embedding path before knowing whether it matters.

- `normalize.ts` — log when `normalizeIndustry` falls through to `'Other'` and
  when `normalizeCareerLevel` returns null, with the AI's original string.
- `job-news` / `job-search` — log when a job's category matches no industry.

Within days of real traffic this gives the actual rate. If 2% of users land on
`'Other'`, Phase 3 is not worth it. If it is 40%, it is the highest-value work
in this document. **Decide with the number, not by reasoning about it.**

### Phase 1 — Expose embeddings from Horus (small)
Horus already embeds — `packages/core/src/knowledge/embeddings.ts` exports
`embedTexts(texts: string[]): Promise<number[][]>`, batched, against the Azure
embedding deployment. It is used internally for RAG ingest and is not reachable
over HTTP. So this is a route, not a feature.

`apps/web/src/app/api/embed/route.ts`, modelled on `api/infer/route.ts`:

```
POST /api/embed
  in:  { input: string[] }
  out: { vectors: number[][], model, dimensions, tokens }
```

- `validateApiKey` then `hasAllScopes(auth.scopes, [SCOPES.INTELLIGENCE_INFER])`
- **Reuse `intelligence:infer`** rather than adding a scope. CareerCraft's
  tenant key already carries it, so no key needs re-minting. Embedding is an
  inference call.
- Cap input: array length and total characters, so one request cannot embed a
  novel.
- Meter tokens into the ledger like `infer` does.
- Deploy.

### Phase 2 — CareerCraft can call it (small)
- `horusEmbed(texts: string[])` in `supabase/functions/_shared/ai/horus.ts`,
  beside `horusInfer` / `horusGenerateText` / `horusGenerateObject`.
- A throwaway script proving a live call returns vectors of the expected length.
  Nothing downstream is testable until this passes.

### Phase 3 — Fix the profile at the source
Replace the alias/keyword fallback in `normalizeIndustry` with nearest
neighbour over the 20 canonical industries.

The output side is closed, which is a gift: embed those 20 **once**, commit the
vectors as a constant, and at runtime embed only the AI's single string. One
embedding call per onboarding.

- Above a similarity threshold, take the nearest industry.
- Below it, keep `'Other'` — an honest unknown beats a confident wrong answer.
- If Horus is unavailable, fall through to the existing keyword path. Onboarding
  must never fail because of this.
- Same treatment for `normalizeCareerLevel` only if Phase 0 says it is a real
  problem.

### Phase 4 — Job similarity, one surface only (the gate)
`job-news` / `fetch_au_jobs` and nothing else.

```
AustralianJobs.tsx
  client assembles profileText from data usePersonalization already holds:
    targetJobTitles + currentJobTitle + industry + skills
  and sends it in the existing request body

job-news / fetch_au_jobs           ← already runs on every search
  ├─ fetch from Adzuna + JSearch   ← already happens
  ├─ texts = [profileText, ...jobs.map(title + description)]
  ├─ ONE horusEmbed(texts)         ← the only new I/O
  ├─ cosine(v[0], v[i]) in memory  ← free
  └─ return each job with `similarity`
```

**The client sends the profile text.** It already has the profile loaded, so
this avoids a DB read per search, avoids duplicating profile assembly across
two edge functions, and leaves nothing to invalidate when someone edits their
profile. It is an embedding input, not a prompt — no injection surface. Cap the
length.

**Embed the profile, never the search query.** Adzuna has already filtered by
the query, so every returned job matches it to a similar degree — a signal that
is near-identical across all results cannot rank anything. The query's work is
done as a filter; similarity's job is to separate the survivors.

Known limitation: a nurse searching "admin assistant" to change careers gets
her profile scored against admin jobs and ranks them low. This is pre-existing
— `targetJobTitles` already awards +30 for roles she did not search for — and it
is additive, so nothing is hidden. If it becomes a real complaint, blend the
query into the reference text. Do not build that first.

**Then stop.** Does "Enrolled Nurse" actually score close to "Patient Care
Assistant" on real adverts? If not, the theory is wrong and every phase after
this is wasted effort.

### Phase 5 — Fold into the score, then retune
- `isJobRecommended` accepts `similarity`, adds up to ~25 points, reason
  "Close match to your background".
- The raw ceiling moves from ~120 to ~145, so the saturating curve in
  `matchLevel` now maps to different bands. "Strong match" means something new —
  re-check against real jobs rather than assuming.

### Phase 6 — The remaining three surfaces
Copy of Phase 4 with a different item text:

| Surface | Function | Item text |
|---|---|---|
| Tracker suggestions | `job-search` | title + snippet |
| Job Market News | `job-news` / `fetch_news` | article title + description |
| Market Trends | `job-news` / `fetch_trends` | article / trend text |

`scoreArticle` already matches profile data rather than a hardcoded list, so
news never had the IT bias jobs had.

### Phase 7 — Cleanups found along the way
Small, unrelated to embeddings, each independently worth doing:

- `usePersonalization.scoreSkill` (~line 634) still uses bidirectional
  substring, the bug fixed in the job matcher. A one-letter skill over-matches.
- `AustralianJobs.tsx:89` declares its own second `INDUSTRIES` list, which can
  drift from the canonical one in `useUserProfile`.
- `job-news:175` truncates JSearch descriptions to 300 characters. **JSearch
  returns the full advert text**, so full descriptions are being thrown away —
  relevant to the ATS check, which currently asks users to paste the ad because
  Adzuna only sends a snippet. For JSearch jobs the real text may already be in
  hand.
- `verify_jwt` and function config are in sync as of `20046cc`; re-check after
  adding nothing here (no new functions are introduced by this plan).

## 5. Failure behaviour — build it in from the first line

The Horus Supabase project is free-tier and pauses after about a week idle
(LAUNCH-TODO §1, still unticked). Every path here must survive that:

```
horusEmbed fails / times out / Horus paused
  ├─ Phase 3 (onboarding)  → fall back to keyword normalisation
  └─ Phase 4-6 (ranking)   → omit similarity, score with the other 7 signals
                              page renders, ranking slightly worse, no error
```

Similarity is an enhancement to a working score, never a dependency of one.

## 6. Open decisions

1. ~~**`-small` or `-large`?**~~ **Answered by the code.** Horus is already on
   `text-embedding-3-large` at 3072 dimensions
   (`clients/openai.ts:22` — `AZURE_OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-large'`;
   `knowledge/store.ts:24` — `AZURE_SEARCH_VECTOR_DIMENSIONS ?? 3072`).

   So reuse it. I had recommended `-small` on cost grounds, but that was before
   reading the Horus config: introducing a second model would mean a second Azure
   deployment and a second thing to keep straight, to save a fraction of a cent
   per search. `-large` also costs nothing extra to *store* here, because nothing
   is stored.

   One consequence worth noting: 3072 floats per vector means ~51 vectors ≈ 156k
   floats crossing the wire per search. That is a few MB of JSON. If it proves
   slow, `embedTexts` already supports a reduced `dimensions` parameter — ask for
   256 or 512 for this use case, which barely affects ranking quality and cuts the
   payload by 6-12×. Measure before optimising.
2. **Threshold for Phase 3.** Needs real pairs to calibrate. Pick it after
   seeing what "Aged Care" → "Healthcare" actually scores.
3. **Phase 0 numbers.** Everything else is sequenced; Phase 0 decides whether
   Phase 3 happens at all.
