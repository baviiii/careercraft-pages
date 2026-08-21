# Paywall & Usage Metering — what was built, and what's left

Built 2026-08-21/22. Companion to `LAUNCH-TODO.md` §4, which sketched this.

**Status: shipped to `main`, enforcing nothing.** Every limit is recorded and
reported; no user is refused. Turning it on is a secret change, not a deploy —
see [Turning it on](#turning-it-on).

---

## Why

Every AI feature spends real money — Horus's Azure budget for generation, and
CareerCraft's own `AZURE_OPENAI_KEY` for resume vision. Nothing tied that spend
to a user, a plan, or a ceiling. `LAUNCH-TODO.md:30` flags capping it as a
launch blocker; `:72` flags the missing cost attribution.

No payment provider yet, deliberately (`LAUNCH-TODO.md:117` — validate demand
first). Admin grants premium by hand. The tables are shaped so a Stripe or
Paddle webhook drops in later without a migration.

## The shape of it

There was almost one chokepoint. `_shared/ai/horus.ts` `horusInfer()` is where
all text generation funnels, and it already returned token counts that every
caller but one discarded. What it lacked was any idea *who* was calling.

So the core of the work is threading identity down to the money:

```
requireUser()  ──knows who──┐
                            ├──► MeterContext ──► horusInfer() ──► ledger
consume_plan_quota() ───────┘                    (knows the cost)
```

`meter` is a **required** field on `HorusInferOptions`. That is the point: a
future call site that forgets it fails `deno check` rather than silently
billing nobody. It is also a shared mutable object, because `ats-analyze` fans
out to four calls and the last needs to see the first three's spend without
another round trip. `AsyncLocalStorage` was rejected — the edge runtime reuses
isolates, so a continuation escaping request scope would read a stale store and
bill the wrong user.

Four things escaped that chokepoint and were handled separately: `infer`
(hand-rolled fetch, no JWT), `parse-resume` (Azure direct), `horus-rag`
(generation-backed via `rag.query`), and `onboard-analyze`'s bespoke limiter.

## Three layers

| Layer | Purpose | Window |
|---|---|---|
| Monthly allowance | the paywall | calendar month, UTC |
| Hourly burst | anti-abuse | rolling hour, UTC |
| Daily token ceiling | true cost backstop | UTC day |

The token layer exists because request counts lie: one `ats-analyze` request
can be four model calls.

Hourly counters kept the bare resource key — for a 60-minute window the old
epoch floor lands on exactly the same boundary as `date_trunc('hour')`, so
nothing reset at deploy. Monthly needed a new key (`_m_` prefix, collision-proof
because the legacy RPC's own validation rejects a leading underscore) since
`floor(epoch/30 days)` drifts out of phase with the calendar.

## Tables

`plans` · `plan_limits` · `user_subscriptions` · `user_subscription_events` ·
`user_limit_overrides` · `token_usage_ledger` · `plan_upgrade_requests`

Limits are relational, not a JSONB blob: the admin screen edits one resource at
a time, and a blob makes every edit a read-modify-write two admins can lose.

`NULL` = inherit, `-1` = explicitly unlimited. The `-1` matters — without it an
override can never *uncap* a plan that caps everyone else.

## Turning it on

Order matters. Do not skip step 1.

1. **Apply the migrations.** `20260821000000` … `20260821000400`. Nothing below
   works until they are live. Check: `select * from plans;` returns 2 rows, and
   `select count(*) from user_subscriptions;` matches `auth.users`.
2. **Let the ledger fill.** Use the product normally for a few days. The seeded
   limits are guesses — this is what replaces them:
   ```sql
   -- what a typical month actually looks like, per feature
   select resource, count(*) filter (where attempt = 1) as requests,
          count(*) as model_calls, sum(total_tokens) as tokens,
          count(distinct user_id) as users
   from token_usage_ledger
   where created_at >= date_trunc('month', now())
   group by resource order by tokens desc;

   -- the hidden second bill: schema-retry rate per task
   select task, count(*) filter (where attempt = 2)::float
                / nullif(count(*), 0) as retry_rate
   from token_usage_ledger group by task order by retry_rate desc;
   ```
   A `retry_rate` above ~10% is a prompt bug, not a quota problem.
3. **Retune** the numbers at `/admin/plans`. No deploy needed.
4. **Enforce, one at a time**, via the `QUOTA_ENFORCE` Supabase secret. Watch
   for `[quota:observe] would deny …` in the logs first — that is the dry-run
   telling you who *would* have been blocked.
   ```
   QUOTA_ENFORCE=horus-rag-search          # widest hole, generation-backed
   QUOTA_ENFORCE=horus-rag-search,ats-analyze
   …
   QUOTA_ENFORCE=all
   ```

## Still to do

- [ ] **MCP forwards the user JWT.** `../interview-coach-mcp/`
      `src/adapters/horus/http-client.ts` — `headers()` and `infer()` forward it;
      `post()` should pass 429s through instead of collapsing them to 500. The
      browser already sends it, and the MCP already sets `userRef` at ~20 call
      sites; it just never puts either on the wire. **Then** set
      `INFER_REQUIRE_JWT=true`. Until that lands, coach traffic gets an IP limit
      and ledger attribution, but consumes no plan quota — `userRef` from a
      request body cannot be trusted to spend someone's allowance.
- [ ] **`Pricing.tsx` still has hardcoded plans.** Left alone because it is not
      rendered anywhere — `Index.tsx` does not include it and only dead
      `#pricing` anchors point at it. Wire it to the `plans` table when it goes
      back on the landing page.
- [ ] **Payment provider**, when demand justifies it. `user_subscriptions`
      already has the `provider_*` columns and the idempotency indexes; a
      webhook fills them and flips `plan_key`. Check
      `plan_upgrade_requests` first — that is the demand signal this was built
      to capture.
- [ ] **`types.ts` regeneration.** Still stale by 13 pre-existing tables; the new
      ones were hand-added to avoid dragging that in. Worth doing on its own.
- [ ] **`UserManagement.tsx:105,126`** call `supabase.auth.admin.*` from the
      browser with the anon key. These can never work — they need service-role.
      Disable them or move them behind an `admin-users` edge function.

## Things that will bite you

- **Do not clamp the analysis features to `fast`.** It is the obvious cost save
  and it backfires: truncated rewrites trip the completeness retry at
  `ats-analyze:1140`, so you pay for two calls and get a worse answer. Only
  `infer` is seeded with a clamp, where the caller used to choose the model.
- **The daily ceiling is soft.** Checked before a call, recorded after, so one
  request can overshoot by ~34k tokens. Set it with headroom.
- **Everything is UTC.** An Australian user's month rolls over mid-morning on
  the 1st. The UI says "resets in 3 days" rather than a clock time for exactly
  this reason.
- **`refund_plan_quota` is load-bearing.** `onboard-analyze` used to count only
  completed runs, so an outage cost the user nothing. Consuming up front
  regresses that unless the refund fires — it is wired into the catch block.
