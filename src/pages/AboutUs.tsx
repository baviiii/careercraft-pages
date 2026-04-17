import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CraftPageShell, CraftSectionHead } from "@/components/landing/CraftShell";

const values = [
  { n: "i.", title: "Mission", body: "Make policy, workforce and investment intelligence a common tool — not a privilege." },
  { n: "ii.", title: "Vision", body: "Career decisions composed from data, not guesswork. Everyone a compositor." },
  { n: "iii.", title: "Values", body: "Transparent sources, accessible tools, and quiet craft. Always cited, never salesy." },
];

const pillars = [
  { k: "Built in", v: "Adelaide, SA" },
  { k: "Grounded in", v: "Gov-verified data" },
  { k: "Pressed since", v: "MMXXVI" },
  { k: "Print run", v: "Monthly · ongoing" },
];

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <CraftPageShell>
      {/* Hero / masthead */}
      <section className="bg-[color:var(--cc-cream)] pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-ink)] cc-link mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to the atelier
          </button>

          <div className="cc-label text-[color:var(--cc-rust)]">§ 00 · About</div>
          <h1 className="mt-4 cc-font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-[color:var(--cc-ink)]">
            A small press<br />
            for <span className="cc-italic-wonk">large careers.</span>
          </h1>
          <p className="mt-8 cc-font-editorial text-2xl md:text-[28px] leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
            CareerCraft is a workshop for South Australians. We set policy,
            workforce data and opportunity by hand — and let the page emerge.
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

      {/* Long-read */}
      <section className="bg-[color:var(--cc-cream)] py-24 md:py-36">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-12 gap-8 md:gap-16">
            <div className="col-span-12 md:col-span-4">
              <div className="cc-label text-[color:var(--cc-rust)]">§ 01 · The Shop</div>
              <h2 className="mt-4 cc-font-display text-4xl md:text-5xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)]">
                Why we<br /><span className="cc-italic-wonk">built this.</span>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-8 cc-font-editorial text-xl md:text-[22px] leading-[1.5] text-[color:var(--cc-ink-soft)] space-y-6">
              <p>
                Somewhere between a government PDF and a job advert, a person
                has to decide what to do with the next decade of their life.
                Most of the signal is buried. Most of the noise is paid for.
              </p>
              <p>
                CareerCraft reads the buried signal — every budget line, every
                sector plan, every shortage list — and sets it in type you can
                actually use. A résumé, an interview rehearsal, a career map,
                each one grounded in where South Australia is genuinely moving.
              </p>
              <p className="cc-font-display italic text-2xl text-[color:var(--cc-ink)]">
                We publish for the person at the workbench — not the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values — three columns on ink */}
      <section className="bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] py-24 md:py-36">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="max-w-2xl">
            <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · The Standards</div>
            <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight">
              Three rules,<br /><span className="cc-italic-wonk">kept in ink.</span>
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
            section="§ 03 · Next Page"
            title={<>Come work<br /><span className="cc-italic-wonk">at the bench.</span></>}
            align="center"
          />
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate("/auth")} className="cc-btn cc-btn-primary w-full sm:w-auto">
              Begin a File <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
            </button>
            <button onClick={() => navigate("/contact")} className="cc-btn cc-btn-ghost w-full sm:w-auto">
              Write to the Editors <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
            </button>
          </div>
        </div>
      </section>
    </CraftPageShell>
  );
}
