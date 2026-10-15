import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import {
  CraftPageShell,
  CraftSectionHead,
  CraftScrollProgress,
  CraftFleuron,
} from "@/components/landing/CraftShell";
import { publicPageMeta, usePageMeta } from "@/hooks/usePageMeta";

const values = [
  { n: "i.", title: "Mission", body: "One workspace for the Australian search, from finding a fit to walking into the interview. Free to start." },
  { n: "ii.", title: "Vision", body: "Someone can go from “I’m not sure what I want” to a sent application without picking up another product." },
  { n: "iii.", title: "Values", body: "Australian hiring conventions. A source when we state a fact. Built for the person using it." },
];

const pillars = [
  { k: "Built in", v: "Adelaide, SA" },
  { k: "Written for", v: "Australian hiring" },
  { k: "Grounded in", v: "Government publications" },
  /* Was "Published SA papers". The corpus is still mostly those papers, but
     the workspace is for the Australian search, so the pillar names the
     source type rather than one state. */
  { k: "Covers", v: "The whole search" },
];

export default function AboutUs() {
  const navigate = useNavigate();
  usePageMeta(publicPageMeta("/about"));

  return (
    <CraftPageShell>
      <CraftScrollProgress />
      {/* Hero / masthead */}
      <section className="bg-[color:var(--cc-cream)] pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-ink)] cc-link mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="cc-label text-[color:var(--cc-rust)]">§ 00 · About</div>
          <h1 className="mt-4 cc-font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-[color:var(--cc-ink)]">
            Everything for<br />
            <span className="cc-italic-wonk">the search.</span>
          </h1>
          <p className="mt-8 cc-font-editorial text-2xl md:text-[28px] leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
            Faircopy is a career workspace built in Adelaide. Work out what fits,
            see what it would take to get there, write the application, and
            prepare for the interview. Or just read the market until you know more.
          </p>
        </div>
      </section>

      {/* Pillars row */}
      <section className="bg-[color:var(--cc-cream)]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[color:var(--cc-hair-strong)] border-y border-[color:var(--cc-hair-strong)]">
            {pillars.map((p, i) => (
              <motion.div
                key={p.k}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="bg-[color:var(--cc-cream)] p-8 md:p-10"
              >
                <div className="cc-label-sm text-[color:var(--cc-ash)]">{p.k}</div>
                <div className="mt-4 cc-font-display italic text-2xl md:text-3xl text-[color:var(--cc-ink)]">{p.v}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <CraftFleuron mark="✻" />

      {/* Long-read */}
      <section className="bg-[color:var(--cc-cream)] py-24 md:py-36">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-12 gap-8 md:gap-16">
            <div className="col-span-12 md:col-span-4">
              <div className="cc-label text-[color:var(--cc-rust)]">§ 01 · Our story</div>
              <h2 className="mt-4 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)]">
                Why we<br /><span className="cc-italic-wonk">built this.</span>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-8 cc-font-editorial text-xl md:text-[22px] leading-[1.5] text-[color:var(--cc-ink-soft)] space-y-6">
              <p className="cc-dropcap">
                Some people know the job they want. Some are changing fields.
                Some only want to understand what is out there. Faircopy is the
                same place either way. You can look at roles, see the skills they
                ask for, build a résumé, write the letter, keep track of who you
                have contacted, and practise the interview.
              </p>
              <p>
                The tools we tried before this one assumed an American search.
                Cut the résumé to one page. Leave off your referees. Explain a
                Cert III as if it needs translating. That advice costs Australians
                interviews, and it gets called best practice. Faircopy writes the
                way hiring works here. Two to three pages. Referees on the page.
                AQF qualifications under their real names. Organised spelt with an s.
              </p>
              <p>
                Where a figure comes from a government publication, you can open
                that publication. The rest of the workspace is there so you can
                act on it: learn the role, write the application, prepare for the
                conversation.
              </p>
              <p className="cc-font-display italic text-2xl text-[color:var(--cc-ink)]">
                Built for the person using it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values — three columns on ink */}
      <section className="bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] py-24 md:py-36">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="max-w-2xl">
            <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · Our standards</div>
            <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight">
              Three rules<br /><span className="cc-italic-wonk">we live by.</span>
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--cc-cream)]/20 border border-[color:var(--cc-cream)]/20">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
                className="bg-[color:var(--cc-ink)] p-10 md:p-14"
              >
                <div className="cc-font-display italic text-6xl text-[color:var(--cc-rust)] leading-none">{v.n}</div>
                <h3 className="mt-8 cc-font-display text-3xl tracking-tight text-[color:var(--cc-cream)]">{v.title}</h3>
                <p className="mt-5 cc-font-editorial text-lg leading-snug text-[color:var(--cc-cream)]/75 max-w-sm">{v.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[color:var(--cc-cream)] py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
          <CraftSectionHead
            section="§ 03 · Get started"
            title={<>Ready to<br /><span className="cc-italic-wonk">begin?</span></>}
            align="center"
          />
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate("/auth")} className="cc-btn cc-btn-primary w-full sm:w-auto">
              Get started free <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
            </button>
            <button onClick={() => navigate("/contact")} className="cc-btn cc-btn-ghost w-full sm:w-auto">
              Get in touch <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
            </button>
          </div>
        </div>
      </section>
    </CraftPageShell>
  );
}
