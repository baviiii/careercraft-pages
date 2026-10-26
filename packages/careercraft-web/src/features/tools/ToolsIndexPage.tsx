/* /tools: every tool, grouped by the stage of the search it helps with,
   each linking to its own page. Prerendered like the tool pages.

   It opens like the homepage, on the painted footage, then each stage
   gets its own time of day. */

import { ArrowDown, ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { CraftPageShell } from "@/components/landing/CraftShell";
import { publicPageMeta, usePageMeta } from "@/hooks/usePageMeta";
import publicPages from "@/seo/public-pages.json";

import { Footage } from "./components/Footage";
import { SkySection, type Tone } from "./components/Sky";
import { Strong, ToolCard } from "./components/ToolCard";
import { TOOLS, TOOLS_BY_STAGE } from "./data/tools";

const SITE = publicPages.site;
const CREAM = "#E1E0CC";
const STAGE_TONE: Tone[] = ["day", "dusk", "day"];

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
    <CraftPageShell navVariant="ink">
      <div className="cc-tools">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />

        {/* ── Opening: the homepage footage, the count, the way in ── */}
        <section className="relative flex min-h-[640px] w-full flex-col overflow-hidden bg-[color:var(--cc-ink)] md:h-[88svh]">
          <Footage priority />
          <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pt-24 md:px-10 md:pt-28">
            <Link to="/" className="cc-link cc-label-sm inline-flex items-center gap-2" style={{ color: CREAM }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
          </div>
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 pt-10 text-center">
            <div className="cc-label text-[rgba(225,224,204,0.85)]">The toolkit</div>
            <h1 className="mt-5 [text-shadow:0_2px_50px_rgba(0,0,0,0.5)]" style={{ color: CREAM }}>
              <span className="block cc-font-display font-medium leading-[0.85] tracking-[-0.04em] text-[20vw] sm:text-[15vw] md:text-[11vw] lg:text-[9.5vw]">
                Nine <Strong>tools</Strong>
              </span>{" "}
              <span className="mt-5 block cc-font-display text-2xl tracking-tight sm:text-3xl md:text-4xl">for the Australian job search.</span>
            </h1>
            <p className="mt-6 max-w-2xl cc-font-editorial text-xl leading-snug text-[rgba(225,224,204,0.92)] [text-shadow:0_1px_24px_rgba(0,0,0,0.6)]">
              From working out what fits to the interview itself. Each one has its own page: what it does, how it works and what it won't
              do. Most need a free account; the résumé builder doesn't.
            </p>
            <div className="mt-9 flex flex-col items-center gap-5 sm:flex-row">
              <Link to="/builder" className="cc-tl-pill cc-tl-pill--cream">
                Build a résumé, no account needed
                <span className="cc-tl-pill__dot">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </Link>
              <Link to="/auth" className="cc-link text-[15px]" style={{ color: "rgba(225,224,204,0.88)" }}>
                Make a free account
              </Link>
            </div>
            <nav aria-label="Stages" className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-3">
              {TOOLS_BY_STAGE.map((s) => (
                <a key={s.stage} href={`#${s.stage}`} className="group inline-flex items-center gap-2 cc-label" style={{ color: "rgba(225,224,204,0.85)" }}>
                  <span className="cc-tabular">{s.n}</span> {s.name}
                  <ArrowDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
                </a>
              ))}
            </nav>
          </div>
        </section>

        {/* ── One stage per time of day ── */}
        {TOOLS_BY_STAGE.map((stage, si) => (
          <SkySection key={stage.stage} id={stage.stage} tone={STAGE_TONE[si] ?? "day"} labelledBy={`stage-${stage.stage}`} className="scroll-mt-16">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-8">
              <span className="cc-font-display text-8xl leading-[0.8] text-[color:var(--cc-rust)] md:text-[9rem]" aria-hidden>
                {Number(stage.n)}
              </span>
              <div className="md:pb-2">
                <h2 id={`stage-${stage.stage}`} className="cc-font-display text-4xl tracking-tight text-[color:var(--cc-ink)] md:text-6xl">
                  {stage.name}
                </h2>
                <p className="mt-2 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)] md:text-xl">{stage.line}</p>
              </div>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stage.tools.map((t) => (
                <ToolCard key={t.slug} tool={t} big sizes="(min-width: 1024px) 420px, (min-width: 768px) 46vw, 92vw" />
              ))}
            </div>
          </SkySection>
        ))}
      </div>
    </CraftPageShell>
  );
}
