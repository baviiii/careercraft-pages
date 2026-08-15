# CareerCraft — Launch Readiness / What's Left

**Goal:** soft-launch to production and *test the waters* — get real users in front of it and
find out whether people actually like it, before committing more months of build. This doc is the
checklist to get there, ordered so you do the cheapest launch-blocking work first.

> Status legend: 🔴 blocks launch · 🟡 do soon after launch · 🟢 later / nice-to-have

---

## 0. Where things stand (verified 2026-07-22)

- **AI pipeline is live and real.** Resume parsing (Azure OpenAI vision), onboarding analysis,
  ATS scoring, rewrites, cover letters all run through the **Horus** gateway (`horus.bavi.au`).
  Lovable is fully removed. Verified end-to-end with a non-IT (nurse) profile — skills, certs,
  and advice come back profession-appropriate, not IT-biased.
- **Rate-limit engine is production-grade** (`edge_function_rate_limits` migration): atomic,
  per-user + per-IP quotas. Limits are currently hardcoded per function.
- **Admin panel exists** (UserManagement, AccessControl, AdminSettings, audit logs, sessions).
- **Web app deploys** via git push → Vercel (`career-craft.bavi.au`), returns 200.

---

## 1. 🔴 Launch blockers — fix BEFORE pointing traffic at it

- [ ] **Horus DB free-tier auto-pause.** The Horus Supabase project (`xrgomhiwposlbxwkdudg`) is on
      the free tier and pauses after ~1 week idle. When it pauses, **every AI feature dies** with a
      "tenant not found" error. A signup during downtime = dead first impression.
      → Upgrade that project **or** add a weekly keepalive ping. Non-negotiable before advertising.
- [ ] **Cap Azure OpenAI spend.** Every analysis/rewrite costs money. Rate limits exist, but set a
      hard billing ceiling/alert on the Azure OpenAI resource so a loop or abuse can't run up a bill.
- [ ] **Mint a live Horus API key.** Edge functions currently use the *dev* key (`horus_sk_test_…`).
      Create a production key (`pnpm db:bootstrap-key --tenant=careercraft` in horus-platform,
      scope `intelligence:infer`) and swap the `HORUS_API_KEY` Supabase secret.
- [ ] **End-to-end userflow QA** (see §2) — walk the whole journey as a real user and fix what's
      broken. This is the big one and the reason to test the flow before finishing more features.

---

## 2. 🔴 End-to-end userflow test (do this yourself + with me)

Walk the full journey on production, as a brand-new user, and note anything broken/confusing:

- [ ] **Auth** — sign up (email + Google/Microsoft OAuth), confirm, log in, reset password.
- [ ] **Onboarding / Getting Started** — both paths: (a) upload a resume, (b) type a description.
      Confirm the persona/skills/targets reveal is accurate and the profile actually gets written.
      Test with a **non-IT resume** (nurse, tradie, teacher) — this is the differentiator.
- [ ] **Resume builder** — create from scratch + from a parsed upload, edit every section,
      switch templates.
- [ ] **PDF export** — export each template; check it matches the on-screen preview
      (`npm run pdf:previews`). ⚠️ Builder/PDF templates were mid-refactor — verify nothing regressed.
- [ ] **ATS analysis** — upload resume + paste a job description → score, keyword gaps, rewrites.
      Confirm rewrites don't drop certifications/projects.
- [ ] **Job tracker** — add/track/update applications; AU job search returns results.
- [ ] **Interview prep** — ⚠️ actively mid-rebuild (hub + room + debrief). Decide: ship it, or
      hide it behind a "coming soon" for the soft launch so it's not a broken first impression.
- [ ] **Settings** — every dropdown reflects onboarding values; edits persist.
- [ ] **Mobile pass** — the whole flow on a phone screen.

---

## 3. 🟡 Horus readiness (the dependency to sanity-check before finishing)

CareerCraft's AI now *entirely* depends on Horus. Before committing more, confirm Horus is
something you're happy to lean on:

- [ ] **Reliability** — it's a solo Vercel + free-tier-Supabase deployment. Same pause risk as §1.
      Decide whether Horus is "production infra" or still a prototype you're comfortable depending on.
- [ ] **Vision gap** — `parse-resume` still calls Azure OpenAI *directly* because Horus `/api/infer`
      doesn't accept image inputs yet. Either keep that carve-out (fine for now) or extend Horus infer
      with image parts to route 100% through Horus.
- [ ] **Cost attribution** — every CareerCraft call spends Horus's Azure budget. If Horus is meant to
      be a real B2B product, CareerCraft-as-tenant-1 needs usage metering so you know what it costs.
- [ ] **Key/scope hygiene** — one tenant key with `intelligence:infer` today. Fine for launch.

---

## 4. 🟡 Monetization — paywall + plan-based limits (when you're ready to charge)

Foundations exist; this is mostly wiring. ~4–6 focused days for a solid v1.

- [ ] **Pick a payment provider** — Stripe (default, works in AU) vs **Paddle** (merchant-of-record,
      handles GST/tax for you — nice for a solo AU founder). This choice shapes the webhook work.
- [ ] **Plans + subscriptions tables** — `plans` (admin-editable: name, price, per-feature limits)
      and `user_subscriptions` (user, plan, status, renewal). Put limits in the table, not code.
- [ ] **Plan-aware limits** — change `enforceWindowLimit` to read the user's plan limits from the
      table instead of hardcoded constants (small change — enforcement seam already exists).
- [ ] **Checkout + webhook** — one edge function for checkout, one for the webhook that flips a
      user's plan on payment/cancellation. (The fiddly part; well-trodden.)
- [ ] **Entitlement gating (UI)** — upgrade prompt / paywall modal when a free user hits a 429;
      wire the existing `Pricing.tsx` buttons to checkout.
- [ ] **Admin "Plans & Limits" page** — edit plans/limits and override users from admin, so you
      never touch code to change a limit. (Follows the existing admin-page pattern.)

> "Everything from admin" is achievable — plan defs + limits live in a Supabase table the admin
> edits; edge functions read from it. The only thing that stays in the provider's own dashboard is
> payouts/disputes/tax (unavoidable, one-time-ish).

---

## 5. 🟢 Post-launch / nice-to-have

- [ ] Analytics + error monitoring (know what users do and what breaks — critical for "do they like it").
- [ ] Basic landing-page polish + a clear "what is this" above the fold for cold traffic.
- [ ] Feedback capture (a simple in-app "how was this?" beats guessing).
- [ ] Onboarding empty-states / first-run guidance.
- [ ] Delete the Supabase `infer` shim once the interview-coach MCP points straight at Horus.

---

## Suggested order

1. §1 blockers (DB pause, spend cap, live key) — a day or less.
2. §2 userflow QA — find and fix what's actually broken. **This tells you if you're launch-ready.**
3. Decide on interview prep: ship or hide behind "coming soon".
4. Soft-launch. Watch §5 analytics/feedback.
5. Only *then* build §4 monetization — once you know people actually use it.
