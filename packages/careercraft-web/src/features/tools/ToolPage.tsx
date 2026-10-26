/* One tool's public page (/tools/:slug): what it's for, how it works, why it
   exists, what it won't do, questions people ask. Content lives in
   data/tools.ts; titles and descriptions for search in
   src/seo/public-pages.json. Rendered to static HTML at build time
   (src/seo/prerender.tsx), so nothing here may touch `window` while
   rendering.

   The look is the homepage's: painted sky sections through the day (dawn,
   day, dusk), cosy cream cards and pill buttons, and the homepage's
   footage for the closing band. */

import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { CraftPageShell } from "@/components/landing/CraftShell";
import { findPublicPageMeta, usePageMeta } from "@/hooks/usePageMeta";

import { Footage } from "./components/Footage";
import { Sky, SkySection } from "./components/Sky";
import { Strong, ToolCard } from "./components/ToolCard";
import { ToolClip } from "./components/ToolClip";
import { ToolShot } from "./components/ToolShot";
import { STAGES, toolBySlug, type Tool } from "./data/tools";
import { ACCOUNT_LINE, HOST, StartLink, ToolJsonLd, splitHeading, useSignedIn } from "./shared";

function Head({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <div className="cc-label text-[color:var(--cc-rust)]">{label}</div>
      <h2 id={id} className="mt-4 cc-font-display text-4xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)] md:text-6xl">
        {children}
      </h2>
    </div>
  );
}

export function ToolPage({ slug }: { slug: string }) {
  const tool = toolBySlug(slug);
  const meta = findPublicPageMeta(`/tools/${slug}`);
  const signedIn = useSignedIn();
  usePageMeta(meta ?? { title: "Tools · Faircopy", noindex: true });
  if (!tool || !meta) return <Navigate to="/tools" replace />;

  const stage = STAGES[tool.stage];
  const related = tool.related.map(toolBySlug).filter((t): t is Tool => Boolean(t));
  const [lead, accent] = splitHeading(tool);
  const appUrl = `${HOST}${tool.appPath}`;

  return (
    <CraftPageShell>
      <div className="cc-tools">
        <ToolJsonLd tool={tool} title={meta.title} description={meta.description ?? ""} />

        {/* ── Opening: dawn, the promise, the tool in the low sun ── */}
        <section className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40">
          <Sky tone="dawn" />
          <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10">
            <nav aria-label="Breadcrumb" className="cc-label-sm text-[color:var(--cc-ink-soft)]">
              <Link to="/tools" className="cc-link inline-flex items-center gap-2 text-[color:var(--cc-ink)]">
                <ArrowLeft className="h-3.5 w-3.5" /> All tools
              </Link>
              <span className="mx-3" aria-hidden>
                /
              </span>
              <span>{stage.name}</span>
            </nav>

            <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
              <div className="lg:col-span-7">
                <div className="cc-label text-[color:var(--cc-rust)]">
                  {stage.n} · {tool.name}
                </div>
                <h1 className="mt-5 cc-font-display text-[2.7rem] leading-[0.95] tracking-tight text-[color:var(--cc-ink)] md:text-7xl">
                  {lead}
                  {accent && (
                    <>
                      {" "}
                      <Strong blue>{accent}.</Strong>
                    </>
                  )}
                </h1>
              </div>
              <p className="cc-font-editorial text-xl leading-[1.45] text-[color:var(--cc-ink-soft)] lg:col-span-5 lg:pb-2 md:text-[22px]">
                {tool.lede}
              </p>
            </div>

            <div className="mt-10 flex flex-col items-start gap-5 lg:flex-row lg:items-center">
              <StartLink tool={tool} signedIn={signedIn} className="cc-tl-pill cc-tl-pill--ink">
                {tool.cta.label}
                <span className="cc-tl-pill__dot">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </StartLink>
              <a href="#how" className="cc-link cc-label text-[color:var(--cc-ink)]">
                How it works
              </a>
              <ul className="flex flex-wrap gap-2 lg:ml-auto" aria-label="At a glance">
                {tool.facts.map((f) => (
                  <li key={f} className="cc-tag">
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mt-16 md:mt-20">
              <div className="cc-tl-halo" aria-hidden />
              <ToolShot {...tool.shot} path={appUrl} notes={tool.callouts} eager float />
            </div>
          </div>
        </section>

        {/* ── How it works: a trail of cards ── */}
        <SkySection tone="day" id="how" labelledBy="how-title" className="scroll-mt-16">
          <Head id="how-title" label="How it works">
            {tool.name},
            <br />
            <Strong>step by step.</Strong>
          </Head>
          <ol className={`cc-tl-trail mt-16 md:mt-20 ${tool.steps.length > 3 ? "cc-tl-trail--4" : ""}`}>
            {tool.steps.map((s, i) => (
              <li key={s.title} className="cc-tl-trail__step">
                <span className="cc-tl-trail__dot cc-tabular" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="cc-tl-soft mt-6 p-8 md:p-9">
                  <h3 className="cc-font-display text-2xl tracking-tight text-[color:var(--cc-ink)] md:text-[27px]">{s.title}</h3>
                  <p className="mt-4 cc-font-editorial text-[17px] leading-relaxed text-[color:var(--cc-ink-soft)]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          {(tool.clip || tool.extraShot) && (
            <div className="mt-24 grid gap-12 md:mt-32 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-4">
                <div className="cc-label text-[color:var(--cc-rust)]">{tool.clip ? "Watch it work" : "The other tab"}</div>
                <h3 className="mt-4 cc-font-display text-4xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)] md:text-6xl">
                  {tool.clip ? (
                    <>
                      See it
                      <br />
                      <Strong>run.</Strong>
                    </>
                  ) : (
                    <>
                      Your market,
                      <br />
                      <Strong>in figures.</Strong>
                    </>
                  )}
                </h3>
                <p className="mt-6 cc-font-editorial text-xl leading-snug text-[color:var(--cc-ink-soft)]">
                  {tool.clip
                    ? "Recorded in the app with sample data, from the first click to the result."
                    : "Live ad numbers for any role: how many, what they pay, where they are and who's hiring."}
                </p>
              </div>
              <div className="relative lg:col-span-8">
                <div className="cc-tl-halo cc-tl-halo--soft" aria-hidden />
                {tool.clip ? <ToolClip {...tool.clip} path={appUrl} /> : tool.extraShot && <ToolShot {...tool.extraShot} />}
              </div>
            </div>
          )}
        </SkySection>

        {/* ── What it's good for ── */}
        {tool.goodFor && (
          <SkySection tone="dawn" labelledBy="good-title">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Head id="good-title" label="Try it on">
                  {tool.goodFor.heading}
                </Head>
              </div>
              <ul className="cc-tl-asks lg:col-span-7">
                {tool.goodFor.items.map((q) => (
                  <li key={q} className="cc-tl-soft cc-tl-ask">
                    {tool.goodFor?.quotes ? (
                      <span className="cc-tl-ask__mark" aria-hidden>
                        “
                      </span>
                    ) : (
                      <span className="cc-tl-ask__sun" aria-hidden />
                    )}
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </SkySection>
        )}

        {/* ── Why it exists ── */}
        <SkySection tone="dusk" labelledBy="why-title">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <div className="cc-label text-[color:var(--cc-rust)]">Why it exists</div>
              <h2 id="why-title" className="mt-4 cc-font-display text-4xl leading-[0.98] tracking-tight text-[color:var(--cc-ink)] md:text-6xl">
                {tool.background.heading}
              </h2>
            </div>
            <div className="space-y-6 cc-font-editorial text-xl leading-[1.6] text-[color:var(--cc-ink-soft)] lg:col-span-7 md:text-[21px]">
              {tool.background.paragraphs.map((p, i) => (
                <p key={p.slice(0, 40)} className={i === 0 ? "cc-tl-dropcap" : undefined}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        </SkySection>

        {/* ── Australia, and the honest limits ── */}
        <SkySection tone="day">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="cc-tl-soft p-9 md:p-11">
              <div className="cc-label-sm text-[color:var(--cc-rust)]">Australia</div>
              <h2 className="mt-3 cc-font-display text-3xl tracking-tight text-[color:var(--cc-ink)] md:text-4xl">
                Built for <Strong>Australia.</Strong>
              </h2>
              <ul className="mt-7 space-y-4">
                {tool.australia.map((a) => (
                  <li key={a} className="cc-tl-li">
                    <span className="cc-tl-li__sun" aria-hidden />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cc-tl-soft cc-tl-soft--quiet p-9 md:p-11">
              <div className="cc-label-sm text-[color:var(--cc-ash)]">Limits</div>
              <h2 className="mt-3 cc-font-display text-3xl tracking-tight text-[color:var(--cc-ink)] md:text-4xl">
                What it <Strong>won't do.</Strong>
              </h2>
              <ul className="mt-7 space-y-4">
                {tool.limits.map((l) => (
                  <li key={l} className="cc-tl-li">
                    <span className="cc-tl-li__dash" aria-hidden />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SkySection>

        {/* ── Questions ── */}
        <SkySection tone="dawn" labelledBy="faq-title">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Head id="faq-title" label="Questions">
                Before you
                <br />
                <Strong>start.</Strong>
              </Head>
            </div>
            <div className="space-y-4 lg:col-span-8">
              {tool.faqs.map((f) => (
                <details key={f.q} className="cc-tl-soft cc-tl-faq">
                  <summary className="cc-tl-faq__q">
                    <span>{f.q}</span>
                    <span className="cc-tl-faq__mark" aria-hidden />
                  </summary>
                  <p className="cc-tl-faq__a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </SkySection>

        {/* ── Pairs well with ── */}
        <SkySection tone="day" labelledBy="pairs-title">
          <Head id="pairs-title" label="Goes well with">
            Pairs well
            <br />
            <Strong>with these.</Strong>
          </Head>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {related.map((r) => (
              <ToolCard key={r.slug} tool={r} kicker={STAGES[r.stage].name} sizes="(min-width: 768px) 30vw, 92vw" />
            ))}
          </div>
        </SkySection>

        {/* ── Closing: the homepage's footage, the last word in cream ── */}
        <section className="relative overflow-hidden bg-[color:var(--cc-ink)] py-32 md:py-44">
          <Footage />
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
            <div className="cc-label text-[rgba(225,224,204,0.8)]">{tool.name}</div>
            <h2 className="mt-5 cc-font-display text-5xl font-medium leading-[0.92] tracking-[-0.03em] text-[#E1E0CC] [text-shadow:0_2px_50px_rgba(0,0,0,0.5)] md:text-8xl">
              {tool.closing}
            </h2>
            <p className="mt-6 max-w-xl cc-font-editorial text-lg text-[rgba(225,224,204,0.92)] [text-shadow:0_1px_24px_rgba(0,0,0,0.6)] md:text-xl">
              {ACCOUNT_LINE[tool.account]}
            </p>
            <StartLink tool={tool} signedIn={signedIn} className="cc-tl-pill cc-tl-pill--cream mt-10">
              {tool.cta.label}
              <span className="cc-tl-pill__dot">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </StartLink>
          </div>
        </section>
      </div>
    </CraftPageShell>
  );
}

/** /tools/:slug in the app. Prerender renders ToolPage with the slug directly.
    Keyed on the slug so moving between tool pages starts each one fresh
    (the clip's played state, a failed screenshot) instead of carrying it over. */
export default function ToolRoute() {
  const { slug = "" } = useParams();
  return <ToolPage key={slug} slug={slug} />;
}
