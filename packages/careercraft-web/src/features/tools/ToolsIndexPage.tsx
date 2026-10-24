/* /tools: every tool, grouped by the stage of the search it helps with,
   each linking to its own page. Prerendered like the tool pages. */

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { CraftPageShell } from "@/components/landing/CraftShell";
import { publicPageMeta, usePageMeta } from "@/hooks/usePageMeta";

import { TOOLS, TOOLS_BY_STAGE } from "./data/tools";

const SITE = "https://www.faircopy.au";

const LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE}/tools`,
  url: `${SITE}/tools`,
  name: "Faircopy tools",
  isPartOf: { "@id": `${SITE}/#website` },
  mainEntity: {
    "@type": "ItemList",
    itemListElement: TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/tools/${t.slug}`,
      name: t.name,
    })),
  },
};

export default function ToolsIndexPage() {
  usePageMeta(publicPageMeta("/tools"));

  return (
    <CraftPageShell>
      <div className="cc-tools">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />

        <section className="bg-[color:var(--cc-cream)] pt-32 pb-14 md:pt-40 md:pb-20">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <Link to="/" className="cc-link cc-label inline-flex items-center gap-2 text-[color:var(--cc-ink)]">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <div className="mt-10 cc-label text-[color:var(--cc-rust)]">§ Tools</div>
            <h1 className="mt-4 max-w-5xl cc-font-display text-[2.6rem] leading-[0.95] tracking-tight text-[color:var(--cc-ink)] md:text-7xl lg:text-8xl">
              Nine tools for the
              <br />
              <span className="cc-italic-wonk">Australian job search.</span>
            </h1>
            <p className="mt-8 max-w-3xl cc-font-editorial text-xl leading-[1.45] text-[color:var(--cc-ink-soft)] md:text-2xl">
              From working out what fits to the interview itself. Each page shows what the tool does, how it works, why
              it exists and what it won't do. Most need a free account; the résumé builder doesn't.
            </p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link to="/builder" className="cc-btn cc-btn-primary">
                Build a résumé, no account needed <ArrowUpRight className="h-4 w-4 cc-arrow-up" />
              </Link>
              <Link to="/auth" className="cc-link cc-label text-[color:var(--cc-ink)]">
                Make a free account
              </Link>
            </div>
          </div>
        </section>

        {TOOLS_BY_STAGE.map((stage, si) => (
          <section
            key={stage.stage}
            aria-labelledby={`stage-${stage.stage}`}
            className={`${si % 2 === 0 ? "bg-[color:var(--cc-cream-2)]" : "bg-[color:var(--cc-cream)]"} py-16 md:py-24`}
          >
            <div className="mx-auto max-w-[1400px] px-6 md:px-10">
              <div className="flex flex-col gap-2 border-t border-[rgba(20,22,26,0.4)] pt-6 md:flex-row md:items-baseline md:gap-6">
                <span className="cc-label-sm cc-tabular text-[color:var(--cc-rust)]">{stage.n}</span>
                <h2 id={`stage-${stage.stage}`} className="cc-font-display text-3xl tracking-tight text-[color:var(--cc-ink)] md:text-4xl">
                  {stage.name}
                </h2>
                <p className="cc-font-editorial text-[17px] text-[color:var(--cc-ink-soft)] md:ml-auto">{stage.line}</p>
              </div>

              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {stage.tools.map((t) => (
                  <Link key={t.slug} to={`/tools/${t.slug}`} className="cc-tl-card cc-tl-card--shot group">
                    <span className="cc-tl-thumb">
                      <img
                        src={t.shot.src.replace(/\.webp$/, "-thumb.webp")}
                        srcSet={`${t.shot.src.replace(/\.webp$/, "-thumb.webp")} 720w, ${t.shot.src.replace(/\.webp$/, "-thumb@2x.webp")} 1440w`}
                        sizes="(min-width: 1024px) 420px, 92vw"
                        alt=""
                        width={720}
                        height={450}
                        loading="lazy"
                        decoding="async"
                      />
                    </span>
                    <span className="block px-6 pb-6 pt-5">
                      <span className="block cc-font-display text-2xl tracking-tight text-[color:var(--cc-ink)]">{t.name}</span>
                      <span className="mt-2.5 block cc-font-editorial text-[16px] leading-snug text-[color:var(--cc-ink-soft)]">
                        {t.h1}
                      </span>
                      <span className="mt-5 flex items-center justify-between gap-3">
                        <span className="cc-label-sm text-[color:var(--cc-ash)]">
                          {t.account === "free" ? "Free account" : "No account to start"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 cc-label-sm text-[color:var(--cc-ink)]">
                          How it works <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </CraftPageShell>
  );
}
