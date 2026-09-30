# Faircopy

A résumé workshop for the Australian job market. Build the file, check it against a
job ad, track applications, and read what the market is actually doing.

Deployed to Vercel on push to `main`. Live docs worth reading before you change
anything: [ARCHITECTURE.md](ARCHITECTURE.md) (what is where),
[LAUNCH-TODO.md](LAUNCH-TODO.md) (what's left before launch),
[CONCERNS.md](CONCERNS.md) (known issues parked on purpose),
[MONETIZATION-PLAN.md](MONETIZATION-PLAN.md) (plans, limits, the token ledger).

## Layout

```
packages/careercraft-web    the React app (Vite + TypeScript + Tailwind + shadcn)
packages/shared             types shared between the app and the functions
supabase/functions          edge functions — every AI call goes through one
supabase/migrations         schema, RLS, plans and limits
```

## Running it

```sh
npm i
npm run dev          # turbo dev across the workspace
npm run typecheck    # per-package tsc --noEmit
```

## Where the AI comes from

Everything — résumé parsing, ATS scoring, rewrites, cover letters, the chat and the
Intelligence corpus — goes through the **Horus** gateway (`horus.bavi.au`) via the
`horus-rag` and `infer` edge functions. There is no second retrieval path: the old
Azure AI Search / Azure Functions estate has been removed, on purpose, so an outage
shows up as an outage instead of silently answering from a stale corpus.

The one carve-out is `parse-resume`, which calls Azure OpenAI vision directly
because Horus `/api/infer` does not accept image inputs yet.

## Environment

See `.env.example` for the full list. The ones that matter: `SUPABASE_*`,
`HORUS_BASE_URL` + `HORUS_API_KEY`, `AZURE_OPENAI_*` (vision carve-out),
`ADZUNA_*` / `JSEARCH_API_KEY` (job search). `VITE_HORUS_RAG=off` disables the
retrieval path.

---

© 2026 Faircopy. All rights reserved.
