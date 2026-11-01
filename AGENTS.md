# AGENTS.md — careercraft-pages (Faircopy)

Instructions for any AI coding agent (Claude Code, Codex, Cursor…) working in this
repo. Read this before changing anything.

This is Faircopy (www.faircopy.au): the React site (`packages/careercraft-web`),
the Supabase database (`supabase/migrations`) and Supabase Edge Functions
(`supabase/functions`). The interview coach is a separate repo
(interview-coach-mcp); Horus is another (horus-platform).

## Before every push — no exceptions

**What a push does:** Vercel builds a preview of every pushed branch; a push to
`main` deploys the live site, and the workflows in `.github/workflows` run —
including applying database migrations. So every push, to any branch:

1. **Run the checks, all green:**
   ```bash
   npm run typecheck
   npm run lint
   npm run build:web
   ```
   Changed an Edge Function? Type-check it with Deno (`deno check
   supabase/functions/<name>/index.ts`). Changed a migration? Run it against a
   scratch Postgres (PGlite works without Docker) before it reaches `main`.
2. **Code review the diff** for correctness bugs (in Claude Code: `/code-review`).
3. **Security review the diff** (in Claude Code: `/security-review`). Here that
   means especially: RLS on every table and `SECURITY DEFINER` function (who can
   call it, with whose id?), nothing secret in `VITE_*` variables (they ship to
   the browser), the CSP in `vercel.json`, and what each Edge Function trusts.
4. **Show the owner the diff and wait for an explicit yes.** Plain-language
   explanation of each change, plus the check and review results. Approval is
   per push: an earlier "go ahead" doesn't cover the next one, and approving a
   summary isn't the same as seeing the code.

Never `--no-verify`, never force-push, never commit secrets.

## Other agents may be working here

More than one agent session can share this folder. Before anything else:
`git status` and `git log --oneline -3` — if the branch or files aren't what you
expect, someone else is working. Don't switch their branch, don't revert or commit
changes you didn't make, and never `git add -A` blindly: add your own files by
name. Running the Supabase CLI rewrites `supabase/.temp/cli-latest`; don't commit
that. To work on another branch without disturbing them, use a temporary
`git worktree` outside the repo.

## Things that have broken before

- **The CSP.** `connect-src` in `vercel.json` must list every host the browser
  calls (the coach's Lambda URL, Supabase, …). A new or moved host is blocked
  until it's there.
- **Order of releases.** A migration that the coach or the site needs goes to
  `main` first; the coach's CI checks the live database has its columns.
- **Generated types** (`src/integrations/supabase/types.ts`) — regenerate with
  `supabase gen types typescript --project-id hfchxjytxhsiuwqaugmv` after a
  migration lands.
- **AI calls in Edge Functions wait 15–30 s each**, and Supabase fails to start
  extra workers for a burst (503 `BOOT_ERROR`). Keep that in mind before adding
  another AI call to an Edge Function.
- **Plan limits** live in Postgres (`consume_plan_quota`, `plan_limits`). The
  plan decides each call's model tier and token cap (`clampTier`/`clampTokens`
  in `_shared/ai/meter.ts`); a caller only asks. Free and Premium get the same
  coach model and differ in how many calls.
- **Azure is gone** (2026-10). Every AI call goes through Horus
  (`_shared/ai/horus.ts`) — never a model vendor directly. Images go to Horus as
  content parts (see `parse-resume`), and a `schema` makes the model fill an
  exact shape.
