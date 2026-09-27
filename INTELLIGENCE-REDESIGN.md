# Intelligence — redesign plan

Written 2026-09-21, after the honesty pass and the topK/metadata fixes.
State at time of writing: Horus live, 84 docs / 2,416 chunks / 9 categories,
all four tabs returning data, no fabricated figures left on the page.

---

## 1. The real problem is not the gradients

The page is **10,577 lines across 26 components**. It has four tabs, an
"Observatory" metaphor, a HORUS v2.0 masthead, a UTC clock, a telemetry
readout in the corner, and classification badges reading `STRATEGIC` /
`FISCAL` / `WORKFORCE`.

Ask the question that matters: **what is a user supposed to do here?**

Nothing on the page answers that. It is dressed as a government intelligence
console — and Faircopy's user is someone in Adelaide trying to work out
whether to retrain as an enrolled nurse. Those are not the same person. The
styling reads as "AI slop" partly because of the purple gradients, but mostly
because **the page is cosplaying an audience it does not have**.

Retheming 26 components without fixing that would produce a beautiful page
that still has no job.

### The frame to move to

| Today (analyst console) | Should be (career context) |
|---|---|
| FISCAL ALLOCATION · $28.1B | Where the state is spending — and which sectors that grows |
| WORKFORCE SIGNALS | Which roles SA is actually hiring for |
| CAPABILITY DEMAND | Skills worth having, and where to get them |
| AI CONNECTIONS · cross-sector patterns | "Health funding is up and nursing roles are growing — here's the link" |
| § Observatory · Signal active | *(delete — it is set dressing)* |

One sentence to design against:

> **"South Australia published its budget and workforce plans. Here is what
> that means for your next move."**

Everything that does not serve that sentence is a candidate for deletion.

---

## 2. What exists and is real (verified 2026-09-21)

Do not design around data that is not there. This is the whole inventory.

**Corpus**
- 84 documents, 2,416 chunks
- 9 categories: budget 19, industry 18, education 17, career-guidance 11,
  jobs-skills 9, …
- **9,781 entities, 13,808 relationships — currently rendered nowhere**

**Funding** (real, parsed from budget papers, high confidence)
- Infrastructure $25.6B · Health $1.7B · Education $715M · Skills $54.5M ·
  Housing $36.6M · Justice $16.5M · Defence $6.8M

**Careers** — ~11 occupations. Frequently *named without headcounts*; the
corpus says "Registered Nurses are in demand", not "4,200 vacancies". Design
for named-without-number as the normal case, not the exception.

**Skills** — ~7–10 with demand/growth, plus training pathways.

**Narrative** — a genuinely good 2,700-char analysis per tab.

**Known gaps**
- No sector facet in metadata (sectors are derived from funding)
- No trend/time-series anywhere — every "+15.4%" on the page today is either
  from the AI answer or was invented; there is no historical series to chart
- Requests take 30–50s. This is the single biggest UX constraint.

---

## 3. Delete first

The cheapest way to make this page good is to make it smaller.

**Dead — zero imports, delete outright (1,335 lines)**
- `RelationshipGraph.tsx` (717)
- `QueryInsightsVisualizer.tsx` (384)
- `MetadataDistributionCharts.tsx` (234)

**Strong delete candidates — set dressing with no informational content**
- The UTC clock in the topbar
- The corner "Receiving · SA Gov archive" telemetry pill
- `HORUS v2.0` masthead + `INTELLIGENCE BRIEFING_` typewriter line
- Classification badges (`STRATEGIC`, `FISCAL`, `WORKFORCE`)
- The `§ Observatory` framing generally

**Merge candidates** — `CareerPulse` (324) and `BreakingNews` (227) and
`ExecutiveSummary` (197) all present "notable things" in three different
shapes. One component.

Target: **26 components → ~12**, before any restyling. Every component
deleted is one that does not need migrating.

---

## 4. Usability — ordered by how much it hurts

### 4.1 The 30–50 second wait (worst problem on the page)
Four parallel requests, each 20–50s. Today the user gets skeletons and no
sense of progress.

- Render each panel the moment *its own* tab resolves — do not wait on
  `Promise.all`. Funding often lands 30s before careers.
- Say what is happening and roughly how long: "Reading 84 budget papers —
  about 30 seconds." A named wait is a wait people will sit through.
- Cache to `localStorage` with the corpus `lastUpdated` as the key. The
  archive changes rarely; a returning user should see yesterday's answer
  instantly with a "refreshed 2 min ago" line, not an empty page.
- Consider prefetching on `/dashboard` hover.

### 4.2 No entry point
The page opens on everything at once. There is no "start here". Give it a
single lead answer — the strongest finding, in a sentence, at the top — then
let the tabs be the detail.

### 4.3 Tabs are categories, not questions
`Overview / Careers / Skills / Funding` are filing-cabinet labels. Better:
- *Where the money is going*
- *Who is hiring*
- *What to learn*

Same data, framed as questions a job seeker actually has.

### 4.4 Nothing is actionable
The page ends at information. Every finding should be able to hand off into
the rest of Faircopy:
- a growing occupation → "tailor my résumé for this role"
- an in-demand skill → "add to my profile" / the training pathway link
- a funded sector → the job search, pre-filtered

This is the single biggest reason to keep the page at all.

### 4.5 Provenance is the trust anchor — surface it
Every figure traces to a real SA government document. That is the page's
credibility and it is currently buried. "Infrastructure $25.6B" should carry
its source document within one click. `DataProvenance.tsx` already exists.

### 4.6 Honest empty states (done, keep it that way)
Already fixed. The rule going forward: **loading means a request is in
flight — nothing else.** Never `loading: value === 0`. Never a pulsing dot
over a static feed. Never a hardcoded count.

---

## 5. Visual direction

Faircopy's language, applied to a dense data surface. **Not** a new aesthetic
— the entire complaint is that this page invented one.

**Ground:** `--cc-cream` paper, `--cc-ink` carbon, hairline `--cc-hair` rules.
Retire the dark navy panel entirely.

**Type:** Bricolage Grotesque display for findings and figures; editorial
serif for narrative; `cc-label` small caps + `§` for section marks. Numbers
in `cc-tabular` so columns align.

**Colour discipline — the core rule.** Today: 320 gradient classes, every
panel a different hue, colour carrying no meaning. Going forward:
- Paper and ink do the work
- **One** accent (`--cc-rust`, persona-aware) for emphasis
- `--cc-signal` reserved for genuinely good news
- Amber/rust reserved for genuine warnings
- **No gradients.** A sector gets a colour only if that colour means
  something consistently across the whole page.

**Charts:** flat, hairline axes, single accent, direct labels instead of
legends. Load the `dataviz` skill before writing any chart code.

**Motion:** one staggered reveal on load. Nothing loops. Nothing pulses
unless it represents live activity — that rule is now load-bearing.

**Warmth** comes from paper, generous margins, real sentences and honest
copy — not from colour saturation. The rest of Faircopy already proves this.

---

## 6. Phasing

Each phase ships on its own and leaves the page working.

### Phase 0 — done, but the claim above was wrong
Honest states, real counts, metadata/sector fix.

Two corrections, both found 2026-09-27:

- **The topK fix was never applied.** `horus-rag` validated `topK` with
  `.max(50)` and *rejected* larger values; the client asked for 120 on funding
  and 60 on careers. Those two tabs 400'd on every load for months, surfacing
  as empty panels rather than an error — which is why it was repeatedly
  diagnosed as a dead backend. Fixed on both sides now. It is an edge function,
  so it needs `supabase functions deploy horus-rag`, not a git push.
- **"No fabricated figures left on the page" was not true.** `deterministicValue()`
  was still hashing names into career growth rates and skill demand scores, and
  the Skills ROI carousel was entirely hardcoded — ROI 1,580%, salary increase
  $127,000, lifetime value $2.4M, break even 2.4 weeks. See §8.

### Phase 1 — Delete — **done**
Six components (~2,200 lines) and the set dressing: the UTC clock, the
"Receiving" pill, the hardcoded "Signal active", the simulated SystemStatus
lights, the System Status panel, three sparkle badges and a "Live" pill.

The "merge the three notable-things components" item is **not needed**.
`CareerPulse` was the real duplicate and it is deleted; `BreakingNews` and
`ExecutiveSummary` render in different places for different jobs —
`ExecutiveSummary` lives *inside* `FundingDashboard`. Merging them would be
churn.

Also deleted `IntelligenceNav` and 15 other dead files repo-wide, plus 9
orphaned npm dependencies.

### Phase 2 — Perceived speed — **done**
`snapshotCache.ts` paints last visit's figures immediately, labelled with their
age, and discards them when the corpus size changes. `Promise.all` →
`allSettled` with per-tab painting, so `globalLoading` clears on first settle
and one failure cannot strand the others.

### Phase 3 — Reframe — **mostly done**
Tabs are questions. The hero has a lead finding and reports findings rather
than chunk counts. All six panels reframed: headings answer the tab's question,
three "Real-time" claims removed, genre badges gone.

Still open: the `FundingDashboard` / `CareersDashboard` story carousels remain
structurally analyst-shaped, and §4.4 (make findings actionable) is Phase 5.

Still on the old styling — **deliberately**, so the information architecture is
judged on its own before paint hides it.

### Phase 4 — Retheme (2–3 days)
Migrate the ~12 survivors to `--cc-*`. Shell and the three dashboards first
(they carry 184 of the 320 gradients). Charts last.

### Phase 5 — Make it actionable (1–2 days)
Wire findings into résumé / job search / profile. The thing that makes the
page worth its existence.

**Do not reorder 3 and 4.** Styling an information architecture you are about
to change is the one way to guarantee wasted work.

---

## 7. Open questions

1. **Does this page earn its keep?** 10,577 lines for a soft-launch product
   whose core loop is résumé building. A smaller, sharper "SA job market"
   panel on the dashboard might deliver 80% of the value. Worth deciding
   before Phase 4, not after.
2. **What are the 9,781 entities and 13,808 relationships for?** Real,
   substantial, and rendered nowhere. Either surface them or stop fetching.
3. **Is SA-only still right?** Positioning has moved AU-wide; this page is
   explicitly South Australian.
4. **Can the 30–50s be reduced server-side?** If Horus can cache these four
   standing queries, Phase 2 gets much easier.

---

## 8. The fabricated figures (found 2026-09-27)

§2 of this document says "do not design around data that is not there". The
page was doing exactly that, in two shapes, and §4.6 recorded it as fixed.

**`deterministicValue(seed, min, max)`** hashed a string into a range. Its own
comment said it existed so numbers would not change between renders — which is
the tell, because stability is what a measurement has. It produced career growth
rates (15–25% for "high demand" wording, 5–15% for "growing"), skill demand
scores (60–95) and skill growth rates (5–35). A role called "Registered Nurse"
showed the same +21.3% on every visit. Removed; it has no callers.

Consequently `SkillDemand.demand` and `.growth` are now **optional**, and the UI
says "named, no figure stated" rather than drawing a bar. A document mentioning
a skill is evidence the skill matters; it is not a score.

**Hardcoded literals rendered as findings.** In careers: "12,000+ open
positions", "42.0% growth", "Healthcare" as the fallback sector, plus
"Avg Timeline 6-12 months" and "Success Rate 87%" which were not fallbacks at
all — no field fed them.

**The Skills ROI carousel**, deleted whole: ROI 1,580% · Job Security 96% ·
investment $3,200 · salary increase $127,000 · break even 2.4 weeks · lifetime
value $2.4M · "Fast Track to $100K+" · Starting Salary $94K · Success Rate 89% ·
"340% salary multiplier" · Competition "Low". One narrative opened with
"Data shows" before an invented multiplier, beside real dollar amounts parsed
from budget papers, inheriting their credibility.

The corpus holds skills, categories, sectors and training pathways. It holds no
salaries, no completion times, no success rates and no return on investment —
not "none reliable", none. There was no honest version to write.

### The rule this leaves

**A figure appears only if a document states it.** Absent is rendered as absent
— "—", or a sentence saying no figure was stated — never as zero, never as an
average diluted by the rows that have no figure, and never behind an "est."
badge, which implies a derivation.

Two traps worth naming, because both were live:

- `(x.growth || 0) > 10` reads *missing* as *zero*, silently excluding every row
  the documents describe qualitatively. Key off the demand label instead.
- Summing stated percentages and dividing by **all** rows printed "+0.4%" as
  though measured. Divide by the rows that actually have figures, or show "—".

And note **CONCERNS #6**: `strictNullChecks` is off, so adding `?` to a type
enforces nothing. Three `.toFixed()` crash sites had to be found by grep. Every
new optional field needs a manual sweep of its readers.
