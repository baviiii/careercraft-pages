/* One tool's public page (/tools/:slug): what it's for, how it works, why it
   exists, what it won't do, questions people ask. Content lives in
   data/tools.ts; titles and descriptions for search in
   src/seo/public-pages.json. Rendered to static HTML at build time
   (src/seo/prerender.tsx), so nothing here may touch `window` while
   rendering. */

import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Minus } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";

import { CraftFleuron, CraftPageShell, CraftSectionHead } from "@/components/landing/CraftShell";
import { findPublicPageMeta, usePageMeta } from "@/hooks/usePageMeta";

import { ToolClip } from "./components/ToolClip";
import { ToolShot } from "./components/ToolShot";
import { STAGES, TOOLS, toolBySlug, type Tool } from "./data/tools";

const SITE = "https://www.faircopy.au";

/** Where each tool lives in the app, for the screenshot's address bar. */
const APP_PATH: Record<string, string> = {
  "resume-builder": "faircopy.au/builder",
  "bullet-rewrite": "faircopy.au/rewrite",
  "cover-letters": "faircopy.au/cover-letter",
  "ats-checker": "faircopy.au/analysis",
  "job-tracker": "faircopy.au/tracker",
  "interview-practice": "faircopy.au/interview-prep",
  "career-coach": "faircopy.au/career-coach",
  "market-news": "faircopy.au/job-market-news",
  "browse-jobs": "faircopy.au/au-jobs",
};

const ACCOUNT_LINE: Record<Tool["account"], string> = {
  none: "No account needed.",
  partial: "No account needed to start. A free account lets you download and keep it.",
  free: "Needs a free account. No card, no trial that runs out.",
};

/** Structured data: what the tool is, where the page sits, and its questions. */
function jsonLd(tool: Tool, title: string, description: string) {
  const url = `${SITE}/tools/${tool.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: `Faircopy ${tool.name}`,
        url,
        description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "en-AU",
        offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
        publisher: { "@id": `${SITE}/#organization` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Faircopy", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE}/tools` },
          { "@type": "ListItem", position: 3, name: tool.name, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: tool.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      { "@type": "WebPage", "@id": url, url, name: title, isPartOf: { "@id": `${SITE}/#website` } },
    ],
  };
}

export function ToolPage({ slug }: { slug: string }) {
  const tool = toolBySlug(slug);
  const meta = findPublicPageMeta(`/tools/${slug}`);
  usePageMeta(meta ?? { title: "Tools · Faircopy", noindex: true });
  if (!tool || !meta) return <Navigate to="/tools" replace />;

  const stage = STAGES[tool.stage];
  const related = tool.related.map(toolBySlug).filter((t): t is Tool => Boolean(t));

  return (
    <CraftPageShell>
      <div className="cc-tools">
        <script
          type="application/ld+json"
          // Static data from this file, not user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(tool, meta.title, meta.description ?? "")) }}
        />

        {/* ── Heading ── */}
        <section className="bg-[color:var(--cc-cream)] pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <nav aria-label="Breadcrumb" className="cc-label-sm text-[color:var(--cc-ash)]">
              <Link to="/tools" className="cc-link inline-flex items-center gap-2 text-[color:var(--cc-ink)]">
                <ArrowLeft className="h-3.5 w-3.5" /> All tools
              </Link>
              <span className="mx-3" aria-hidden>
                /
              </span>
              <span>{stage.name}</span>
            </nav>

            <div className="mt-10 cc-label text-[color:var(--cc-rust)]">
              § {stage.n} · {tool.name}
            </div>
            <h1 className="mt-4 max-w-5xl cc-font-display text-[2.6rem] leading-[0.98] tracking-tight text-[color:var(--cc-ink)] md:text-7xl">
              {tool.h1}
            </h1>
            <p className="mt-8 max-w-3xl cc-font-editorial text-xl leading-[1.45] text-[color:var(--cc-ink-soft)] md:text-2xl">
              {tool.lede}
            </p>

            <ul className="mt-8 flex flex-wrap gap-2" aria-label="At a glance">
              {tool.facts.map((f) => (
                <li key={f} className="cc-tl-fact">
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link to={tool.cta.to} className="cc-btn cc-btn-primary">
                {tool.cta.label} <ArrowUpRight className="h-4 w-4 cc-arrow-up" />
              </Link>
              <a href="#how" className="cc-link cc-label text-[color:var(--cc-ink)]">
                How it works
              </a>
            </div>
            <p className="mt-4 cc-font-sans text-[14px] text-[color:var(--cc-ink-soft)]">
              {ACCOUNT_LINE[tool.account]}
            </p>
          </div>
        </section>

        {/* ── What it looks like ── */}
        <section className="bg-[color:var(--cc-cream)] pb-20 md:pb-28">
          <div className="mx-auto max-w-[1200px] px-6 md:px-10">
            <ToolShot
              src={tool.shot.src}
              alt={tool.shot.alt}
              caption={tool.shot.caption}
              path={APP_PATH[tool.slug] ?? "faircopy.au"}
              eager
            />
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="scroll-mt-24 bg-[color:var(--cc-cream-2)] py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <CraftSectionHead section="How it works" title={<>{tool.steps.length} steps.</>} />
            <ol className={`mt-14 grid gap-6 md:grid-cols-2 ${tool.steps.length > 3 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
              {tool.steps.map((s, i) => (
                <li key={s.title} className="cc-tl-step">
                  <span className="cc-tl-step__n cc-tabular">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-5 cc-font-display text-2xl tracking-tight text-[color:var(--cc-ink)]">{s.title}</h3>
                  <p className="mt-3 cc-font-editorial text-[17px] leading-relaxed text-[color:var(--cc-ink-soft)]">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {tool.clip && (
          <section className="bg-[color:var(--cc-cream-2)] pb-20 md:pb-28">
            <div className="mx-auto max-w-[1200px] px-6 md:px-10">
              <div className="mb-6 cc-label text-[color:var(--cc-rust)]">Watch it work</div>
              <ToolClip {...tool.clip} />
            </div>
          </section>
        )}

        {tool.extraShot && (
          <section className="bg-[color:var(--cc-cream-2)] pb-20 md:pb-28">
            <div className="mx-auto max-w-[1200px] px-6 md:px-10">
              <ToolShot {...tool.extraShot} />
            </div>
          </section>
        )}

        {/* ── Why it exists ── */}
        <section className="bg-[color:var(--cc-cream)] py-20 md:py-32">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="grid grid-cols-12 gap-8 md:gap-16">
              <div className="col-span-12 md:col-span-4">
                <div className="cc-label text-[color:var(--cc-rust)]">Background</div>
                <h2 className="mt-4 cc-font-display text-4xl leading-[0.98] tracking-tight text-[color:var(--cc-ink)] md:text-5xl">
                  {tool.background.heading}
                </h2>
              </div>
              <div className="col-span-12 space-y-6 cc-font-editorial text-xl leading-[1.55] text-[color:var(--cc-ink-soft)] md:col-span-8 md:text-[21px]">
                {tool.background.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <CraftFleuron mark="✻" />

        {/* ── Australia, and the honest limits ── */}
        <section className="bg-[color:var(--cc-cream)] pb-20 pt-12 md:pb-28 md:pt-16">
          <div className="mx-auto grid max-w-[1400px] gap-6 px-6 md:grid-cols-2 md:px-10">
            <div className="cc-tl-panel">
              <h2 className="cc-font-display text-3xl tracking-tight text-[color:var(--cc-ink)]">Built for Australia</h2>
              <ul className="mt-6 space-y-3.5">
                {tool.australia.map((a) => (
                  <li key={a} className="cc-tl-li">
                    <Check className="cc-tl-li__icon text-[color:var(--cc-signal)]" aria-hidden />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cc-tl-panel cc-tl-panel--quiet">
              <h2 className="cc-font-display text-3xl tracking-tight text-[color:var(--cc-ink)]">What it won't do</h2>
              <ul className="mt-6 space-y-3.5">
                {tool.limits.map((l) => (
                  <li key={l} className="cc-tl-li">
                    <Minus className="cc-tl-li__icon text-[color:var(--cc-ash)]" aria-hidden />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Questions ── */}
        <section className="bg-[color:var(--cc-cream-2)] py-20 md:py-28">
          <div className="mx-auto max-w-[900px] px-6 md:px-10">
            <CraftSectionHead section="Questions" title="Asked often." />
            <div className="mt-12 divide-y divide-[color:var(--cc-hair-strong)] border-y border-[color:var(--cc-hair-strong)]">
              {tool.faqs.map((f) => (
                <details key={f.q} className="cc-tl-faq group">
                  <summary className="cc-tl-faq__q">
                    <span>{f.q}</span>
                    <span className="cc-tl-faq__mark" aria-hidden />
                  </summary>
                  <p className="cc-tl-faq__a">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Related, and start ── */}
        <section className="bg-[color:var(--cc-cream)] py-20 md:py-28">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <div className="cc-label text-[color:var(--cc-rust)]">Works well with</div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} to={`/tools/${r.slug}`} className="cc-tl-card group">
                  <span className="cc-label-sm text-[color:var(--cc-rust)]">{STAGES[r.stage].name}</span>
                  <span className="mt-3 block cc-font-display text-2xl tracking-tight text-[color:var(--cc-ink)]">{r.name}</span>
                  <span className="mt-3 block cc-font-editorial text-[16px] leading-snug text-[color:var(--cc-ink-soft)]">
                    {r.h1}
                  </span>
                  <span className="mt-6 inline-flex items-center gap-1.5 cc-label-sm text-[color:var(--cc-ink)]">
                    How it works <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-20 rounded-[28px] bg-[color:var(--cc-ink)] px-8 py-14 text-center text-[color:var(--cc-cream)] md:px-16 md:py-20">
              <h2 className="cc-font-display text-4xl tracking-tight md:text-5xl">{tool.closing}</h2>
              <p className="mx-auto mt-5 max-w-xl cc-font-editorial text-lg text-[rgba(247,247,244,0.75)]">
                {ACCOUNT_LINE[tool.account]} Everything else in Faircopy comes with it.
              </p>
              <Link to={tool.cta.to} className="cc-btn cc-tl-cta-light mt-9">
                {tool.cta.label} <ArrowUpRight className="h-4 w-4 cc-arrow-up" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </CraftPageShell>
  );
}

/** /tools/:slug in the app. Prerender renders ToolPage with the slug directly. */
export default function ToolRoute() {
  const { slug = "" } = useParams();
  if (!TOOLS.some((t) => t.slug === slug)) return <Navigate to="/tools" replace />;
  return <ToolPage slug={slug} />;
}
