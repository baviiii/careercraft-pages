# Faircopy review: QA, marketing and code audit

**Done:** night of 11 October 2026, at `main` = `f5d89a0`.
**Nothing in the code was changed.** This file is the only output. It's uncommitted, so you decide
what happens to it.

---

## 1. The short answer

**Is the product good?** Yes. It's broad, it's honest in ways competitors aren't, it already does the
Australian conventions properly (two-page résumés, referees, Australian English), and the design has
a point of view. For a solo build it's well past "prototype".

**Is it good enough to stand out?** Not on its features alone. An Australian competitor, **Seekario**,
already sells almost the same list: résumé builder, tailoring, cover letters, selection-criteria
(KSC) letters, mock interviews and a job tracker, at about $10–25 a month with a free tier. Globally,
Teal, Rezi and Jobscan own "résumé + ATS + tracker", and ChatGPT is free. Faircopy can stand out on
**honesty** (it's literally in the name) and on **depth for one Australian audience**, not on breadth.
Section 6 says how.

**Is it ready to get users?** It's ready for a **small, hand-picked soft launch (20–50 people)**
once five blockers are fixed. It isn't ready for paid ads or a big public push yet, mainly because
**you can't currently measure anything** (no analytics at all), and the soft launch exists to measure.

### Scorecard

| Area | Score /5 | One line |
|---|---|---|
| Product breadth | 4.5 | Résumé → ATS → letters → tracker → interview → coach, all real |
| Core-flow polish | 3.5 | Strong pages; some dead ends and leftover AI-flavoured copy |
| Trust and legal | 2 | Account deletion doesn't delete; policy date is fake-fresh |
| Measurability | 0.5 | No analytics, no error monitoring, no feedback capture |
| Performance | 3 | Fine homepage; the free builder (the only public demo) is heavy |
| Positioning | 3 | "Career journey" is right, but there's no sharp promise to one audience yet |
| Distribution readiness | 2 | Domain days old, no Search Console, no channel plan, no content |
| Code health | 3 | Good security basics; no tests, a CI typecheck that checks nothing |

---

## 2. How I checked, and what I couldn't

- **Signed-in pages** were read on production using the session already in your Chrome. I only read:
  no saves, no AI runs, nothing written. The account's personal details are deliberately left out of
  this file.
- **Signed-out pages** were checked against a local build of the same commit, so there was no session.
- **Code audit** covered the web app, 12 edge functions and 53 tables' worth of migrations.
- **Market research** was web searches; sources are at the end.
- **Limits:**
  - Your Chrome window was hidden while you slept, and Chrome pauses rendering for hidden windows. So
    screenshots stopped part-way, interactive flows (clicking through the builder) couldn't complete,
    and I couldn't measure scroll smoothness. Those are listed as **"verify"**, not as bugs.
  - I didn't run any AI feature.
  - GitHub Actions isn't visible from here (private repo, no `gh` CLI).

---

## 3. Fix before you invite anyone

These are the things a first user or a regulator could actually trip on. Roughly 1–2 days in total.

### 3.1 "Delete account" doesn't delete anything (HIGH)
- **Evidence:** `src/hooks/useUserProfile.ts:625`. `deleteAccount()` only calls
  `supabase.auth.signOut()` and shows a toast, "Your account will be deleted within 30 days".
  `Settings.tsx:572` makes the user type DELETE first. Nothing records the request, and no server
  function exists that deletes data. The repo has no `delete-account` function.
- **Why it matters:** the privacy policy promises "Request deletion of your account — we remove your
  data from our systems." Telling someone their résumé, referees and history are being deleted when
  they aren't is the kind of promise that ends up in a complaint, whether or not the Privacy Act
  formally applies to a business your size. (Not legal advice.)
- **Fix:** a small edge function using the service role that deletes the auth user, with the data
  either cascading or deleted explicitly. Minimum version: write a `deletion_requests` row, email
  yourself, delete by hand, and change the toast to say exactly that.

### 3.2 You can't measure the soft launch (HIGH)
- **Evidence:** no analytics or monitoring package in either `package.json`, and no tracking calls
  anywhere in `src/`.
- **Why it matters:** your own launch plan says to judge on week-2 return rate. Right now you can't
  see signups → onboarding → first résumé → first application, or a single crash a user hits.
- **Fix:**
  - **PostHog** (free tier, product analytics + session replay) or **Plausible** for traffic, plus
    **Sentry** free tier for front-end errors.
  - Track about six events: `signup`, `onboarding_done`, `resume_saved`, `ats_check_run`,
    `letter_saved`, `application_tracked`.
  - Add a one-line mention to the privacy policy.

### 3.3 The privacy policy and terms say they were updated today, every day (MEDIUM, trust)
- **Evidence:** `src/pages/Privacy.tsx:61` and `src/pages/Terms.tsx:89` compute
  `updated = new Date()`.
- **Why it matters:** the policy looks freshly rewritten every visit, and you can't show which
  version anyone agreed to.
- **Fix:** hardcode the real date and change it when the text changes.

### 3.4 Two things only you can check (from LAUNCH-TODO §1)
- **Signup confirmation email lands in the inbox, not spam.** This is new-domain mail through
  Supabase Auth's SMTP. Google and Microsoft sign-in exist and avoid this, which helps.
- **`support@` and `privacy@faircopy.au` actually arrive.** The Contact form works by opening the
  visitor's own mail app addressed to `support@`, so if that address isn't routed, contact is a dead
  end.

### 3.5 Cost guardrails before strangers arrive (MEDIUM)
- Confirm whether the `QUOTA_ENFORCE` secret is on. The plan system can record usage without
  refusing anything, and the daily ceiling is about US$3 per free user.
- Set the Azure spend alert (still open in LAUNCH-TODO §1).
- The Horus keepalive workflow exists, which is good.

---

## 4. QA findings

Ranked by impact. "Verify" means I saw a symptom but couldn't confirm the cause tonight.

### High / medium

| # | Finding | Where | Suggested fix |
|---|---|---|---|
| Q1 | **Export data leaves out most of the data.** It exports profile, preferences, skills and certifications only: no résumés, letters or applications. The policy promises "export your data in a portable format". | `useUserProfile.ts:650` | Add résumés, cover letters and applications to the export |
| Q2 | **No Cover Letters link in the sidebar.** The rebuilt desk is only reachable from the dashboard's "All tools", the tracker and My Résumés. | `CraftSidebar.tsx:50` (`CRAFT_SIDEBAR_LINKS`) | Add it under Craft, after ATS Check |
| Q3 | **The free builder is heavy.** About 1.2 MB of compressed JavaScript before it's usable: the PDF engine (807 KB gz) and parser (236 KB gz) are imported up front, plus the 142 KB core. This is the only thing a cold visitor can try. | `useResumeExport.ts`, `useResumePdfPreview.ts`, `useResumeImport.ts` (static imports) | `import()` the PDF engine at preview/export and the parser at upload |
| Q4 | **Footer links to `/playground` and `/intelligence`.** Both need sign-in, so logged-out visitors bounce to the login page. | `components/landing/CraftShell.tsx:116-117` | Remove, or point them at public pages |
| Q5 | **The hero video is on someone else's CDN** (a `cloudfront.net` user folder from the generator). If it's deleted, the hero goes blank. | `pages/Index.tsx:116,598` | Self-host it in `public/` or on your own storage |
| Q6 | **The ATS page lists saved letters with US-style dates.** "10/11/2026" reads as 10 November to an Australian. It also labels them "Dear [Hiring Manager's Name]…" instead of a name. | `features/analysis/components/CoverLetterPairing.tsx:43` | `toLocaleDateString("en-AU")` and the shared `letterLabel()` |
| Q7 | **Generated letters contain placeholders.** The live attached letter opens "Dear [Hiring Manager's Name], I am writing to express my interest…": a bracket to fill in and a stock opener. | `rewrite-resume` cover-letter prompt | Part of the AI-quality pass you deferred: ban placeholders and use the company name |
| Q8 | **The homepage figures read "0"** until the count-up runs. The animation starts at 0 and ignores reduced-motion settings, so crawlers, screen readers and anyone with animations off can see "0 Résumé templates". | `Index.tsx:208` (`useCountUp`) | Render the real number by default and animate only when motion is allowed |
| Q9 | **Career Insights is in the old "Astral" design.** The four pages behind it (Insights, Explorer, Trends, Policy) use the dark starfield shell, so clicking it jumps to a different-looking app. | `pages/IntelligenceOverview.tsx` etc. | Move them onto `CraftAppLayout`, or leave them out of the soft launch |
| Q10 | **The coach is SA-only and a starter question is out of date.** It says "answered from SA Gov" (54 documents), and one starter asks about "job openings in 2025". The homepage now says Australia-wide. | `components/rag/CareerCoach.tsx:97` | Remove the year; say "deepest on SA" in the coach too |
| Q11 | **My Résumés categories lean IT:** General / Tech / IT / Business / Creative / Academic. There's no Health, Trades, Education or Government, which works against the non-IT wedge. | `features/my-resumes/types.ts:28` | Use profession-neutral categories, or free tags only |
| Q12 | **The guest builder says "Back to dashboard"** to someone with no account. The link goes home correctly; the label doesn't match. | `ResumeBuilderPage.tsx:152` | Pass `backLabel={isGuest ? "Back to home" : undefined}` |

### Low / copy (your "kill the AI filler" rule)
- **Dashboard** (`Dashboard.tsx:250,656,693,710`):
  - "Profile tuned. Build the résumé, chase the roles, keep the pipeline honest."
  - "One primary action. Three supporting paths."
  - "Everything else, one tap away."
  - "What moved in your workspace."
  - "Ranked against your profile — and it shows its working."
  - A second-person persona paragraph: "You are a dynamic … passionate about creating robust,
    cloud-ready platforms."

  You removed exactly this style from onboarding on 10-09; the dashboard still has it.
- **My Résumés:** "Every version of you — tagged, dated, ready to reopen." (`MyResumesPage.tsx:107`).
  Its labels "UN-MEASURED", "READ THE DRAFT", "END OF REGISTER" and "FILED" are metaphor first,
  meaning second. A cold user won't know "un-measured" means "no ATS score yet".
- **Settings:** "Tune the profile that powers everything… keep it sharp and personal."
- **The 404 page** is still the old default theme ("Oops! Page not found", `NotFound.tsx:17`).
- **Dashboard practice tile** says "Rehearse Software Engineering questions" while the interview hub
  says the target is "AI Engineer". Two sources disagree on the default field.

### Verify on a real device (couldn't confirm tonight)
- **Scroll smoothness on a cheap phone** with the new fixed "paper" background (grid + glow + grain)
  under blurred sticky bars (`f5d89a0`). Screenshots stalled after scrolling, most likely because of
  the hidden window, but fixed full-screen layers under `backdrop-filter` are a known repaint cost.
- **My Résumés stat tiles showed "00"** with one résumé listed. Probably the count-up not running in a
  hidden window, but check.
- **The full click-through of the guest builder** (blank → edit → template → export gate).
- **The new cover letter desk end to end.** It's your test list from last night; it renders live with
  the brief, sheet, tone chips and envelope, and the tracker's new section shows the attached letter.

---

## 5. Code audit

### What's genuinely good
- **Row-level security is on for all 53 tables** created in migrations. Permissive policies are
  limited to public reference data, plus three low-risk insert policies (below).
- **No secrets in the repo.** The only key in the code is the public anon key, which is meant to be
  public.
- **Only two edge functions are reachable without sign-in** (`parse-resume`, `infer`). Both have a
  per-caller limit, a global ceiling and plan quota. Every other function requires a user, and
  `generate-prompt` requires an admin.
- **The `infer` shim was hardened properly.** User JWT or a shared secret, plan clamps, and no
  caller-chosen model or budget.
- **Spend is metered** (plans, limits, token ledger, admin screen), so turning on charging is
  additive.
- **The code comments explain *why*,** including past bugs, which makes this codebase unusually
  auditable.

### Issues

| # | Finding | Severity | Notes |
|---|---|---|---|
| C1 | **The CI typecheck checks zero files.** `npm run typecheck` resolves to a tsconfig with `"files": []`. The real check (`npx tsc --noEmit -p tsconfig.app.json`) shows **10 errors** in Settings ×3, UserManagement ×2, resumeParser, pdfExport, usePlansAdmin, usePersonalization and NextGenInsights. | Medium | Already CONCERNS #3. It bit me today too: I reported "typecheck passes" on the cover-letter work. The real check is clean for that code, but the gate is hollow. |
| C2 | **No automated tests at all.** No runner is configured. | Medium | Start with the money and privacy paths: guest vs auth branching, rate-limit keys, `letterLabel`, `formatResumeDataAsText`, and account deletion once built. |
| C3 | **`strictNullChecks` is off.** | Low–Med | CONCERNS #6. |
| C4 | **23 npm advisories in production dependencies (14 high, 0 critical).** Nearly all are build tooling (tailwind, postcss, glob/brace matchers, chokidar) or denial-of-service on malformed input (`image-size` via `pptxgenjs`, `ws`). | Low | `npm audit fix` clears most; move build tools to `devDependencies`. |
| C5 | **`rag_feedback` accepts inserts from anyone with the public key**, including signed-out visitors (`WITH CHECK (true)`, no role). **`activity_logs` and `login_attempts`** let any signed-in user insert rows for any user id. | Low | Spam or log forgery, not data exposure. Add `TO authenticated` and `user_id = auth.uid()` checks. |
| C6 | **The `production-db` approval gate looks unconfigured.** The `title` migration applied within about a minute of the push, with no approval. The workflow's own comment says it runs ungated without that GitHub environment. | Medium | One setting in GitHub → Environments. Worth having before a bad migration ever ships. |
| C7 | **Interview-coach MCP auth can't be checked here.** It's a separate repo; about 25 browser-reachable endpoints land on `infer`. Whether `INFER_REQUIRE_JWT=true` is set is unknown. | Medium | Check that repo's endpoints require a user token; then retire the legacy shared-secret mode. |
| C8 | **Single points of failure:** Horus (solo Vercel + Supabase) and one Azure account carry every AI feature, with no status page, no alerting and no error monitoring. | Medium | Sentry (3.2) plus a simple uptime ping on `/api/infer` |
| C9 | **Dead code.** Old landing components (`components/landing/Hero`, `Features`, `CTA`, `Pricing`) are imported nowhere. `Playground`, and `/try` (an uncapped chat, behind auth). | Low | Delete, or note them in CONCERNS. |
| C10 | **Résumé content that doesn't fit the 12 sections is dropped.** Work rights, clearances, memberships; plus personalisation losing work rights and languages. | Medium | Parked as CONCERNS #8. Live example tonight: the tracked job's ad says "Australian Citizens with baseline clearance", and nowhere in Faircopy can hold that fact about a user. |
| C11 | **Privacy gaps:** guest (no-account) processing, referees as third-party data, and retention periods aren't covered by the policy. | Low–Med | CONCERNS #4 already notes guests. |

---

## 6. Marketing review: will it stand out and get traction?

### The market you're walking into

| Product | Where | Price | Overlap with Faircopy |
|---|---|---|---|
| **Seekario** | Australian | Free tier; ~$10–25/mo | Résumé builder + tailor, cover letters, **KSC (selection criteria) letters**, mock interviews, tracker with "next best action", LinkedIn optimiser. **Closest competitor.** |
| Teal | US | Free; Teal+ ~$29/mo | Résumé builder + job tracker + match score |
| Rezi | US | Free; $29/mo or $149 lifetime | ATS-optimised résumé builder |
| Jobscan | US | 5 free scans; ~$49.95/mo | ATS scanner |
| Resume.io, StylingCV, AHire | Global / AU | Varies | Templates, "Australian-optimised" résumés, auto-apply |
| ChatGPT | — | Free | People already paste their résumé into it |

**Takeaway:** "AI résumé + ATS + cover letters + tracker + interview practice" is table stakes now,
even in Australia. Leading with the feature list won't stand out.

### Where Faircopy is genuinely different (use these)
1. **Honesty is built in, and Australia just made it a rule.**
   - The APSC published *Principles for candidate use of AI in recruitment* in April 2026: what you
     submit must genuinely reflect your own skills, and you may be asked to disclose AI use.
   - Faircopy already works that way. You approve every line, rewrites are never silent, the coach
     cites its sources, the code refuses to invent figures, and the page says "deepest on SA" instead
     of pretending.
   - The name is literally *Faircopy*. That's a positioning gift: *"AI help that keeps your
     application yours."* No competitor I found leads with this.
2. **It's built for Australian résumés.** Two pages are fine, there's a referees section, the spelling
   is Australian, and the skills prompts are written for nurses and tradies, not only engineers. The
   US tools get this wrong by default.
3. **It's calm and considered.** The design and tone are distinctive next to the neon "10x your job
   search" crowd. That matters to stressed job seekers, and it's hard to copy.

### What's holding it back
- **No sharp promise to one person.** "Your next move" plus nine tools is a good brand line but a weak
  acquisition message. A cold visitor needs "what is this, for whom" in five seconds.
- **The obvious Australian wedge isn't built.** Your strategy (09-13) named selection criteria and
  APS roles as the thing US tools can't do. Faircopy doesn't have it, and Seekario does.
- **The intelligence is SA-only** while the homepage says Australia-wide. That's handled honestly in
  copy, but the "Figure it out" stage is the thinnest for anyone outside SA.
- **Distribution is near zero.** The domain is weeks old, there's no Search Console, no content, no
  community presence yet, and no analytics to learn from.

### Recommendation: pick one beachhead audience for the first 100 users
Same product, different front door. In order of how well they fit what's built:

1. **Public-sector applicants (APS and state government)** — **recommended.**
   - Highest pain, the clearest rules (APSC principles, selection criteria), and your honesty angle
     lands hardest here.
   - It needs a **selection-criteria response tool**: built on the user's own résumé, flagging any
     claim the résumé doesn't support, respecting word limits, with STAR structure.
   - The coach's SA government corpus is a real asset for SA public-sector roles specifically.
2. **Nurses and allied health.**
   - Proves the non-IT wedge. AHPRA registration, clinical skills and AU résumé conventions are all
     handled.
   - Needs the certifications and registration handling to be visibly first-class.
3. **International graduates and new arrivals.**
   - Big pain (Australian conventions, work rights), communities are easy to find, and they're
     willing to pay.
   - Needs work rights captured (CONCERNS #8) before you can serve them well.

Any of these is a *front door*: a landing page, a hero sentence and two or three guides aimed at that
person. Nothing else gets removed.

### Getting the first users without cold outreach
- **Communities where these people already ask for help:**
  - r/auscorp and state public-service groups (selection criteria questions are constant)
  - Australian nursing and new-grad groups
  - University careers services and student societies
  - Migrant and international-student community groups

  Answer questions properly and link only when it helps.
- **Search content that matches the wedge:**
  - "How to write selection criteria (with examples)"
  - "Australian résumé format: two pages, referees"
  - "Can I use AI on an APS application? What the APSC rules say"

  The last one is timely and almost nobody has written it well yet. Search takes months on a new
  domain, so start now.
- **Build in public on LinkedIn.** An Adelaide solo founder building an honest AI career tool is a
  story Australian LinkedIn rewards, and it reaches hiring managers and career coaches, who refer
  people.
- **Let one free tool work without an account.** You already let people build a résumé free. A free
  "is this selection-criteria response backed by your résumé?" check would be a strong lead magnet.
  It needs the server-side rate limit, which the guest parse path already has.

### What to measure in the soft launch (once 3.2 is in)
| Metric | Definition | Target to call it "working" |
|---|---|---|
| Activation | Signed up **and** saved a résumé **and** ran one of ATS / letter / tracker | ≥ 40% of signups |
| Week-2 return | Came back 7–14 days after signup | ≥ 20% |
| Core action | Applications tracked per active user | ≥ 3 |
| Demand for paid | `plan_upgrade_requests` rows, already built | Any organic ones are a strong signal |

### Pricing (when you get there)
- The Australian benchmark is about $10–25/month (Seekario); the US tools are $29–50.
- Job seekers churn by design, since they leave when hired. Consider a **"job-search pass"**
  (e.g. 3 months) next to monthly.
- Keep the free tier generous enough that the honesty story is experienced, not just claimed.

---

## 7. What's missing for the future

Roughly in order of value:
1. **Selection-criteria / KSC response tool.** The Australian wedge, see above.
2. **Account deletion and full export done properly.** See 3.1 and Q1; trust basics.
3. **Analytics, error monitoring and an in-app feedback button.** See 3.2; you can't improve what you
   can't see.
4. **Custom résumé sections, plus work rights and languages on the profile** (CONCERNS #8). This also
   unlocks work-rights job filtering, which your strategy names.
5. **Job-ad capture** (bookmarklet, then extension; parked 10-09). This fixes the root cause of
   truncated ads, which weakens both the ATS check and cover letters.
6. **A "Saved" stage in the tracker.** Saving a job from search currently files it as "applied" and
   skews reply rates (parked 10-09).
7. **Follow-up reminders that actually remind you.** The tracker has `reminder_date`, but nothing
   sends email.
8. **The cover-letter and ATS AI quality pass** you deferred: no placeholders, company-specific
   openers, Australian tone.
9. **Voice mock interviews.** Horus already has realtime voice (playground only); the interview room
   has the seam for it.
10. **LinkedIn profile help.** Seekario has it, and it's a common ask.
11. **A shareable résumé link or public profile page.** A natural referral loop.

---

## 8. Suggested order

**Before inviting anyone (1–2 days)**
- 3.1 account deletion (at least the honest minimum version)
- 3.2 analytics and error monitoring
- 3.3 the hardcoded policy date
- Q2 Cover Letters in the sidebar
- Q4 footer links
- Q12 the guest back label
- 3.4 your two inbox checks
- 3.5 cost switches
- Your cover-letter test from last night

**During the soft launch (1–2 weeks)**
- Q3 builder weight
- Q5 self-host the hero video
- Q6 Australian dates in the ATS picker
- Q8 real numbers in the figures
- The copy pass on the dashboard, My Résumés and Settings filler
- Q11 profession-neutral categories
- C1 fix the CI typecheck (after baselining the 10 errors)
- C6 the production-db gate
- C5 tighten the three insert policies

**After the first ~50 users**
- Choose the beachhead from what the analytics shows, and build its front door
- Probably the selection-criteria tool
- The AI quality pass
- CONCERNS #8
- Job-ad capture
- Tests around money and privacy

---

## Appendix: numbers behind the claims

- **Real typecheck:** `npx tsc --noEmit -p tsconfig.app.json` gives 10 errors, none in the
  cover-letter, tracker, résumés or homepage code changed on 10–11 Oct.
- **Lint:** the files touched on 10–11 Oct have the same lint counts as before; all errors are
  pre-existing `any` types.
- **Design-token guardrail:** `npm run lint:tokens` fails with 80 pre-existing hard-coded colour hits
  (Astral, Auth); none are new.
- **Bundle (gzip):** core app 142 KB; homepage 3D meadow 133 KB (lazy); PDF engine 807 KB; parser
  236 KB; pdf.js worker 272 KB. Total JS is about 8 MB raw across every route.
- **npm audit (production dependencies):** 23 (0 critical, 14 high, 9 moderate).
- **Edge functions (12):**
  - Signed-out access with rate limits: `parse-resume`, `infer`
  - Signed-in user required: `ats-analyze`, `coach-chat`, `horus-rag`, `job-email-events`,
    `job-news`, `job-search`, `onboard-analyze`, `rewrite-resume`, `track-session`
  - Admin required: `generate-prompt`
- **RLS:** all 53 created tables run `ENABLE ROW LEVEL SECURITY` in migrations.
- **Live deploy checks (11 Oct):**
  - `sitemap.xml` is served as `application/xml`, `og-image.png` as `image/png`.
  - The `cover_letters.title` column exists in production.
  - The new `CoverLetterPage` chunk is in the deployed build.

### Sources
- [Seekario: features and pricing (Toolify)](https://www.toolify.ai/tool/seekario)
- [Seekario in the Australian AI directory (industry.gov.au)](https://aidirectory.industry.gov.au/organisation/seekario)
- [APSC: Principles for candidate use of AI in recruitment (April 2026)](https://www.apsc.gov.au/sites/default/files/2026-04/Principles%20for%20candidate%20use%20of%20AI%20in%20recruitment_accessible.pdf)
- [APSC: AI in recruitment](https://www.apsc.gov.au/working-aps/hr-practitioners/recruitment-aps/ai-recruitment)
- [Teal vs Jobscan comparison (JobShinobi)](https://jobshinobi.com/compare/jobscan-resume-scanner-vs-teal)
- [Best AI résumé builders 2026 (Dupple)](https://dupple.com/learn/best-ai-resume-builders)
- [Australian résumé builders 2026 (Arielle)](https://arielle.com.au/resume-builder-australia/)
- [Australian résumé format 2026 (StylingCV)](https://stylingcv.com/australian-resume-format-2026-guide-job-seekers/)
- [AHire (Australian auto-apply platform)](https://ahire.evotech.au/about)
