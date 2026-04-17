import { useEffect, useState, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { motion, useInView, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight, ArrowRight, ArrowDown } from "lucide-react";
import {
  CraftNav,
  CraftFooter,
  CraftSectionHead,
  CraftScrollProgress,
  CraftFleuron,
} from "@/components/landing/CraftShell";

/* ───────────────────────────────────────────────────────────
   CareerCraft — Landing (Vol. I · MMXXVI)
   Theme tokens live in src/styles/craft.css.
   Nav / Footer live in src/components/landing/CraftShell.tsx.
   ─────────────────────────────────────────────────────────── */

/* ─────────────────────────── HERO ─────────────────────────── */

const HERO_TOC = [
  { id: "01", label: "The Ledger", href: "#figures" },
  { id: "02", label: "The Toolkit", href: "#toolkit" },
  { id: "03", label: "The Method", href: "#method" },
  { id: "04", label: "Dispatches", href: "#dispatches" },
  { id: "05", label: "The Subjects", href: "#subjects" },
];

const Hero = memo(({ session, navigate }: { session: Session | null; navigate: (to: string) => void }) => {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });

  return (
    <section
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 16);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 10);
      }}
      className="relative bg-[color:var(--cc-cream)] pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden"
    >
      {/* Top strip */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="flex items-center justify-between pb-14 md:pb-20 border-b border-[color:var(--cc-hair-strong)]">
          <div className="cc-label text-[color:var(--cc-ink)]">Vol. I · Issue 01</div>
          <div className="hidden sm:flex items-center gap-2 cc-label text-[color:var(--cc-ink)]">
            <span className="cc-blink text-[color:var(--cc-rust)]">●</span>
            <span>Live · SA Government Data</span>
          </div>
          <div className="cc-label text-[color:var(--cc-ash)]">Adelaide · MMXXVI</div>
        </div>
      </div>

      {/* Masthead */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 pt-16 md:pt-24 relative">
        <motion.h1
          style={{ x: sx, y: sy }}
          className="cc-font-display text-[color:var(--cc-ink)] leading-[0.82] tracking-[-0.035em] text-center"
        >
          <span className="block text-[22vw] md:text-[16vw] font-light">Career</span>
          <span className="block cc-italic-wonk text-[22vw] md:text-[16vw] text-[color:var(--cc-rust)] -mt-[1vw]">
            Craft
          </span>
        </motion.h1>

        {/* Rotating stamp */}
        <div className="hidden md:block absolute right-6 md:right-10 top-28 md:top-36 w-28 h-28 pointer-events-none">
          <svg viewBox="0 0 200 200" className="w-full h-full cc-spin-slow">
            <defs>
              <path id="stampCircle" d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />
            </defs>
            <text className="fill-[color:var(--cc-ink)]" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 5 }}>
              <textPath href="#stampCircle" startOffset="0">CRAFT · FORGE · SHAPE · COMPOSE · </textPath>
            </text>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border border-[color:var(--cc-ink)] flex items-center justify-center">
              <div className="text-center">
                <div className="cc-font-display cc-italic-wonk text-2xl leading-none text-[color:var(--cc-rust)]">cc</div>
                <div className="cc-label-sm text-[color:var(--cc-ink)] mt-1">MMXXVI</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lede + CTAs */}
      <div className="max-w-3xl mx-auto px-6 mt-16 md:mt-20 text-center">
        <p className="cc-font-editorial text-2xl md:text-[28px] leading-[1.35] text-[color:var(--cc-ink-soft)]">
          A workshop for careers in motion —
          <span className="italic text-[color:var(--cc-ink)]"> policy, workforce and opportunity</span>
          set against verified South Australian data.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          {session ? (
            <button onClick={() => navigate("/intelligence")} className="cc-btn cc-btn-primary w-full sm:w-auto">
              Enter the Atelier <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
            </button>
          ) : (
            <>
              <button onClick={() => navigate("/auth")} className="cc-btn cc-btn-primary w-full sm:w-auto">
                Begin a File <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
              </button>
              <button onClick={() => navigate("/playground")} className="cc-btn cc-btn-ghost w-full sm:w-auto">
                Open Playground <ArrowRight className="w-4 h-4 cc-arrow-right" />
              </button>
            </>
          )}
        </div>

        <div className="mt-8 cc-label-sm text-[color:var(--cc-ash)]">
          Free to begin · No card required
        </div>
      </div>

      {/* In-this-issue contents strip */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 mt-20 md:mt-28">
        <div className="cc-fleuron mb-10 text-[color:var(--cc-ash)]">
          <span className="cc-fleuron-mark">✻</span>
        </div>
        <div className="grid grid-cols-12 gap-4 md:gap-6 items-baseline">
          <div className="col-span-12 md:col-span-3">
            <div className="cc-label text-[color:var(--cc-rust)]">In this issue</div>
            <div className="mt-3 cc-font-display cc-italic-wonk text-3xl text-[color:var(--cc-ink)] leading-none">
              Contents.
            </div>
          </div>
          <ol className="col-span-12 md:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
            {HERO_TOC.map((item) => (
              <li key={item.id} className="bg-[color:var(--cc-cream)]">
                <a
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="group flex items-baseline justify-between gap-3 px-5 py-5 transition-colors duration-300 hover:bg-[color:var(--cc-ink)] hover:text-[color:var(--cc-cream)]"
                >
                  <span className="cc-label text-[color:var(--cc-ash)] group-hover:text-[color:var(--cc-cream)]/70 cc-tabular">§ {item.id}</span>
                  <span className="cc-font-display italic text-xl leading-none text-[color:var(--cc-ink)] group-hover:text-[color:var(--cc-cream)]">
                    {item.label}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="mt-16 md:mt-24 flex items-center justify-center">
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center gap-3 cc-label-sm text-[color:var(--cc-ash)]"
        >
          <span>Turn the page</span>
          <ArrowDown className="w-3.5 h-3.5" />
        </motion.div>
      </div>
    </section>
  );
});
Hero.displayName = "Hero";

/* ─────────────────────────── TICKER RIBBON ─────────────────────────── */

const tickerItems = [
  "Healthcare · +15% YoY growth",
  "Cyber & Space · $660M allocated",
  "Manufacturing · 12,400 new roles forecast",
  "Renewables · 38 active SA grants",
  "Education · pathways refreshed Q2",
  "Defence · Hunter class recruitment rolling",
  "Agri-tech · 22 new apprenticeships funded",
];

const TickerRibbon = memo(() => (
  <div className="cc-ribbon" aria-hidden="true">
    <div className="flex items-center gap-3 py-3 px-6 md:px-10 relative">
      <div className="cc-label text-[color:var(--cc-rust)] shrink-0 z-[3] bg-[color:var(--cc-cream-2)] pr-3">
        <span className="cc-blink mr-2">●</span>Dispatch
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex whitespace-nowrap cc-marquee-track-fast will-change-transform">
          {[...tickerItems, ...tickerItems, ...tickerItems].map((t, i) => (
            <span
              key={i}
              className="cc-font-editorial text-[color:var(--cc-ink)] text-lg md:text-xl px-10 inline-flex items-center gap-10"
            >
              <span className="italic">{t}</span>
              <span className="text-[color:var(--cc-rust)]">✻</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
));
TickerRibbon.displayName = "TickerRibbon";

/* ─────────────────────────── MARQUEE ─────────────────────────── */

const Marquee = memo(() => {
  const items = ["Forge", "Compose", "Refine", "Shape", "Redraft", "Assemble"];
  return (
    <div className="bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] border-y border-[color:var(--cc-ink)] py-6 overflow-hidden select-none">
      <div className="flex whitespace-nowrap cc-marquee-track">
        {[...items, ...items, ...items, ...items].map((t, i) => (
          <span key={i} className="cc-font-display cc-italic-wonk text-4xl md:text-6xl px-10 inline-flex items-center gap-10">
            {t}
            <span className="text-[color:var(--cc-rust)]">✻</span>
          </span>
        ))}
      </div>
    </div>
  );
});
Marquee.displayName = "Marquee";

/* ─────────────────────────── COUNT UP ─────────────────────────── */

/* A small utility: parse a figure like "7,412" / "$2.1B" / "96%" and count
   up from 0 to target when it enters view. Non-numeric prefixes/suffixes
   are preserved verbatim. */
const useCountUp = (target: string, inView: boolean, duration = 1400) => {
  const [value, setValue] = useState("0");
  useEffect(() => {
    if (!inView) return;
    const match = target.match(/^(\D*?)([\d.,]+)(\D*)$/);
    if (!match) {
      setValue(target);
      return;
    }
    const [, prefix, numStr, suffix] = match;
    const clean = parseFloat(numStr.replace(/,/g, ""));
    if (isNaN(clean)) {
      setValue(target);
      return;
    }
    const isInt = !numStr.includes(".");
    const hasComma = numStr.includes(",");
    const decimals = isInt ? 0 : (numStr.split(".")[1]?.length ?? 0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = clean * eased;
      let rendered: string;
      if (isInt) {
        const n = Math.round(current);
        rendered = hasComma ? n.toLocaleString("en-US") : String(n);
      } else {
        rendered = current.toFixed(decimals);
      }
      setValue(`${prefix}${rendered}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, inView, duration]);
  return value;
};

/* ─────────────────────────── SPARKLINE ─────────────────────────── */

const Sparkline = memo(({ points, color = "var(--cc-rust)" }: { points: number[]; color?: string }) => {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const w = 120, h = 32, pad = 2;
  const xStep = (w - pad * 2) / (points.length - 1);
  const scale = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * xStep} ${scale(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[120px] h-8 block">
      <path d={d} stroke={color} strokeWidth={1.25} fill="none" vectorEffect="non-scaling-stroke" />
      <circle
        cx={pad + (points.length - 1) * xStep}
        cy={scale(points[points.length - 1])}
        r={2}
        fill={color}
      />
    </svg>
  );
});
Sparkline.displayName = "Sparkline";

/* ─────────────────────────── FIGURES ─────────────────────────── */

const Figures = memo(() => {
  const rows = [
    { fig: "7,412", label: "Roles indexed", sub: "39 SA industries", spark: [4, 6, 5, 7, 8, 6, 9, 11, 10, 12] },
    { fig: "$2.1B", label: "Tracked investment", sub: "emerging sectors", spark: [3, 4, 3, 5, 6, 5, 7, 8, 9, 10] },
    { fig: "96%",   label: "Grounded in gov data", sub: "every claim sourced", spark: [7, 8, 7, 9, 9, 10, 10, 11, 11, 12] },
  ];
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="figures" ref={ref} className="bg-[color:var(--cc-cream)] py-24 md:py-36">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <CraftSectionHead
          section="§ 01 · The Ledger"
          title={<>Numbers we admit<br /><span className="cc-italic-wonk">to the record.</span></>}
        />

        <div className="mt-12 md:mt-16">
          <CraftFleuron />
        </div>

        <div className="mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
          {rows.map((r, i) => (
            <FigureCell key={r.label} row={r} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
});
Figures.displayName = "Figures";

const FigureCell = memo(({
  row, index, inView,
}: {
  row: { fig: string; label: string; sub: string; spark: number[] };
  index: number;
  inView: boolean;
}) => {
  const value = useCountUp(row.fig, inView, 1500 + index * 200);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
      className="bg-[color:var(--cc-cream)] p-10 md:p-14 relative"
    >
      <div className="flex items-center justify-between">
        <div className="cc-label-sm text-[color:var(--cc-ash)]">fig. {String(index + 1).padStart(2, "0")}</div>
        <Sparkline points={row.spark} />
      </div>
      <div className="mt-8 cc-font-display text-6xl md:text-8xl leading-none tracking-tight text-[color:var(--cc-ink)] cc-tabular">
        {value}
      </div>
      <div className="mt-6 cc-font-editorial text-xl text-[color:var(--cc-ink-soft)]">{row.label}</div>
      <div className="mt-1 cc-label-sm text-[color:var(--cc-ash)]">{row.sub}</div>
    </motion.div>
  );
});
FigureCell.displayName = "FigureCell";

/* ─────────────────────────── PULL QUOTE ─────────────────────────── */

const PullQuote = memo(() => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section ref={ref} className="relative bg-[color:var(--cc-cream-2)] py-24 md:py-36 overflow-hidden">
      <div className="absolute inset-0 cc-grain" />
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 md:col-span-2">
            <div className="cc-label text-[color:var(--cc-rust)]">Marginalia</div>
            <div className="mt-3 cc-label-sm text-[color:var(--cc-ash)]">fol. 17</div>
          </div>

          <motion.blockquote
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
            className="col-span-12 md:col-span-8"
          >
            <p className="cc-pullquote text-5xl md:text-7xl">
              <span className="cc-pullquote-open text-[1.6em] align-top mr-2">“</span>
              The future of work won&rsquo;t be found in slogans.
              It sits, quietly, inside <span className="cc-italic-wonk text-[color:var(--cc-rust)]">the budget lines</span>{" "}
              and the plans a state is brave enough to publish.
              <span className="cc-pullquote-close text-[1.6em] align-top ml-1">”</span>
            </p>
            <footer className="mt-10 flex items-center gap-4">
              <div className="h-px flex-1 bg-[color:var(--cc-hair-strong)]" />
              <div className="cc-label text-[color:var(--cc-ink)]">The Editors — Adelaide, MMXXVI</div>
            </footer>
          </motion.blockquote>

          <div className="hidden md:block col-span-2" />
        </div>
      </div>
    </section>
  );
});
PullQuote.displayName = "PullQuote";

/* ─────────────────────────── TOOLKIT ─────────────────────────── */

const toolkit = [
  {
    n: "01",
    title: ["Policy", "Intelligence"],
    body: "Every SA policy and budget, parsed and cited line by line.",
    tags: ["Budget", "Strategy", "Citations"],
  },
  {
    n: "02",
    title: ["Workforce", "Signals"],
    body: "Live sector growth, emerging roles, skill premiums.",
    tags: ["Sectors", "Demand", "Skills"],
  },
  {
    n: "03",
    title: ["Résumé", "Workshop"],
    body: "Draft against the live demand signal. ATS-safe, hand-tuned.",
    tags: ["ATS", "Rewrite", "Templates"],
  },
  {
    n: "04",
    title: ["Interview", "Atelier"],
    body: "Rehearse with an AI editor steeped in your sector.",
    tags: ["Mock", "Feedback", "Sector"],
  },
  {
    n: "05",
    title: ["Investment", "Ledger"],
    body: "Track where state funds flow and which skills they need.",
    tags: ["Grants", "Pipeline", "Forecast"],
  },
  {
    n: "06",
    title: ["Career", "Cartography"],
    body: "Map adjacent roles. Transferable skills. Clear next steps.",
    tags: ["Maps", "Adjacency", "Paths"],
  },
];

const ToolkitCard = memo(({ item, i }: { item: typeof toolkit[0]; i: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: (i % 3) * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
      className="cc-fold group bg-[color:var(--cc-cream)] border border-[color:var(--cc-hair-strong)] p-10 md:p-12 min-h-[300px] flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <span className="cc-font-display text-2xl italic text-[color:var(--cc-rust)]">N° {item.n}</span>
        <ArrowUpRight className="w-5 h-5 text-[color:var(--cc-ash)] transition-all duration-500 group-hover:rotate-45 group-hover:text-[color:var(--cc-rust)]" />
      </div>

      <h3 className="mt-10 cc-font-display text-3xl md:text-4xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)]">
        {item.title[0]}
        <br />
        <span className="cc-italic-wonk">{item.title[1]}</span>
      </h3>

      <p className="mt-6 cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
        {item.body}
      </p>

      <div
        className="mt-auto pt-8 flex flex-wrap gap-2 opacity-0 translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0"
        aria-hidden="true"
      >
        {item.tags.map((t) => (
          <span key={t} className="cc-tag">
            {t}
          </span>
        ))}
      </div>
    </motion.article>
  );
});
ToolkitCard.displayName = "ToolkitCard";

const Toolkit = memo(() => (
  <section id="toolkit" className="relative bg-[color:var(--cc-cream-2)] py-24 md:py-36 overflow-hidden">
    <div className="absolute inset-0 cc-grain" />
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
      <CraftSectionHead
        section="§ 02 · The Toolkit"
        title={<>Six instruments.<br /><span className="cc-italic-wonk">One workbench.</span></>}
        sub={<>Each tool pairs your intent with live South Australian signal.</>}
      />

      <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
        {toolkit.map((t, i) => (
          <ToolkitCard key={t.n} item={t} i={i} />
        ))}
      </div>
    </div>
  </section>
));
Toolkit.displayName = "Toolkit";

/* ─────────────────────────── METHOD ─────────────────────────── */

const Method = memo(() => {
  const steps = [
    { tag: "i.", title: "Gather", body: "Every SA document ingested and indexed. Raw ink, structured archive." },
    { tag: "ii.", title: "Interpret", body: "Policy cross-referenced with workforce data. Patterns surface." },
    { tag: "iii.", title: "Set", body: "You compose — résumé, interview, route — against live signal." },
  ];
  return (
    <section id="method" className="bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] py-24 md:py-36 relative overflow-hidden">
      <div className="absolute inset-0 cc-grain opacity-[0.08]" />
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
        <div className="max-w-2xl">
          <div className="cc-label text-[color:var(--cc-rust)]">§ 03 · The Method</div>
          <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight">
            A pressroom for<br />
            <span className="cc-italic-wonk">your next role.</span>
          </h2>
        </div>

        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--cc-cream)]/20 border border-[color:var(--cc-cream)]/20">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.2, 0.8, 0.2, 1] }}
              className="bg-[color:var(--cc-ink)] p-10 md:p-14"
            >
              <div className="cc-font-display italic text-6xl text-[color:var(--cc-rust)] leading-none">{s.tag}</div>
              <h3 className="mt-8 cc-font-display text-3xl md:text-4xl tracking-tight text-[color:var(--cc-cream)]">
                {s.title}
              </h3>
              <p className="mt-5 cc-font-editorial text-lg leading-snug text-[color:var(--cc-cream)]/75 max-w-sm">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});
Method.displayName = "Method";

/* ─────────────────────────── DISPATCHES ─────────────────────────── */

const dispatches = [
  {
    date: "17 · IV · MMXXVI",
    dept: "Dept. of Industry & Skills",
    headline: "Cyber apprenticeships expanded by 320 seats",
    body: "New intake targeting school leavers and mid-career switchers. Focus: SOC analyst, cloud security, GRC.",
  },
  {
    date: "12 · IV · MMXXVI",
    dept: "Invest SA",
    headline: "$144M committed to advanced manufacturing corridor",
    body: "Elizabeth–Osborne corridor receives funding. Robotics, composites, and low-emissions metals prioritised.",
  },
  {
    date: "04 · IV · MMXXVI",
    dept: "Dept. for Health",
    headline: "Regional allied-health roles: +18% forecast",
    body: "Mid-north regions leading growth. Physio, occupational therapy, and mental-health streams named.",
  },
];

const Dispatches = memo(() => (
  <section id="dispatches" className="bg-[color:var(--cc-cream)] py-24 md:py-36">
    <div className="max-w-[1400px] mx-auto px-6 md:px-10">
      <CraftSectionHead
        section="§ 04 · Dispatches"
        title={<>Latest from the<br /><span className="cc-italic-wonk">wire room.</span></>}
        sub={<>Selected cables from the SA government archive — kept current, signed and dated.</>}
      />

      <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
        {dispatches.map((d, i) => (
          <motion.article
            key={d.headline}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
            className="cc-telegram cc-font-mono"
          >
            <div className="cc-tele-stamp">
              Telegram · {String(i + 1).padStart(2, "0")}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2">
              <div className="cc-label-sm text-[color:var(--cc-ash)]">{d.date}</div>
              <div className="cc-label-sm text-[color:var(--cc-rust)]">Filed</div>
            </div>

            <div className="mt-4 cc-label text-[color:var(--cc-ink-soft)]">{d.dept}</div>

            <h3 className="mt-5 cc-font-display text-2xl md:text-3xl leading-tight tracking-tight text-[color:var(--cc-ink)]">
              {d.headline}
            </h3>

            <p className="mt-4 cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
              {d.body}
            </p>

            <div className="mt-8 pt-4 flex items-center justify-between text-[color:var(--cc-ash)]">
              <span className="cc-label-sm">—— END ——</span>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  </section>
));
Dispatches.displayName = "Dispatches";

/* ─────────────────────────── SUBJECTS ─────────────────────────── */

const subjects = [
  { id: "A", who: "The Seeker", body: "Match your history against the sectors SA is actively funding." },
  { id: "B", who: "The Student", body: "Plot pathways from today's policy to tomorrow's demand." },
  { id: "C", who: "The Migrant", body: "Translate credentials. Find visa-friendly, in-demand roles." },
  { id: "D", who: "The Transitioner", body: "Adjacent roles mapped. Transferable skills named. No waste." },
];

const Subjects = memo(() => (
  <section id="subjects" className="bg-[color:var(--cc-cream-2)] py-24 md:py-36 relative overflow-hidden">
    <div className="absolute inset-0 cc-grain" />
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
      <CraftSectionHead
        section="§ 05 · The Subjects"
        title={<>Four readers.<br /><span className="cc-italic-wonk">One atelier.</span></>}
      />

      <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-14">
        {subjects.map((s, i) => (
          <motion.article
            key={s.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: (i % 2) * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            className="border-t border-[color:var(--cc-ink)] pt-8 flex items-start gap-8"
          >
            <div className="cc-font-display italic text-7xl md:text-8xl text-[color:var(--cc-rust)] leading-none shrink-0">
              {s.id}
            </div>
            <div className="pt-2">
              <h3 className="cc-font-display text-3xl tracking-tight text-[color:var(--cc-ink)]">{s.who}</h3>
              <p className="mt-4 cc-font-editorial text-xl leading-snug text-[color:var(--cc-ink-soft)] max-w-sm">
                {s.body}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  </section>
));
Subjects.displayName = "Subjects";

/* ─────────────────────────── COLOPHON ─────────────────────────── */

const Colophon = memo(() => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section ref={ref} className="bg-[color:var(--cc-cream)] py-20 md:py-28">
      <div className="max-w-[1100px] mx-auto px-6 md:px-10">
        <hr className="cc-colophon-rule" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9 }}
          className="mt-14 grid grid-cols-12 gap-8"
        >
          <div className="col-span-12 md:col-span-3">
            <div className="cc-label text-[color:var(--cc-rust)]">Colophon</div>
            <div className="mt-3 cc-font-display cc-italic-wonk text-3xl text-[color:var(--cc-ink)] leading-none">
              A note on the text.
            </div>
          </div>
          <div className="col-span-12 md:col-span-9">
            <p className="cc-font-editorial text-xl md:text-[22px] leading-[1.5] text-[color:var(--cc-ink-soft)] cc-dropcap">
              Set in <span className="italic text-[color:var(--cc-ink)]">Fraunces</span> and
              <span className="italic text-[color:var(--cc-ink)]"> Instrument Serif</span>,
              with labels in <span className="italic text-[color:var(--cc-ink)]">JetBrains Mono</span>.
              Composed in Adelaide against verified South Australian policy, workforce and
              investment data. Every claim is traced to a public source, every rewrite is
              reversible, every session is the reader&rsquo;s own. Published quietly and often.
            </p>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 cc-label-sm text-[color:var(--cc-ash)]">
              <div>
                <div className="text-[color:var(--cc-ink)]">Display</div>
                <div className="mt-1">Fraunces</div>
              </div>
              <div>
                <div className="text-[color:var(--cc-ink)]">Body</div>
                <div className="mt-1">Instrument Serif</div>
              </div>
              <div>
                <div className="text-[color:var(--cc-ink)]">Labels</div>
                <div className="mt-1">JetBrains Mono</div>
              </div>
              <div>
                <div className="text-[color:var(--cc-ink)]">Pressed</div>
                <div className="mt-1 cc-tabular">MMXXVI · Issue 01</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});
Colophon.displayName = "Colophon";

/* ─────────────────────────── CTA ─────────────────────────── */

const CTA = memo(({ session, navigate }: { session: Session | null; navigate: (to: string) => void }) => {
  const { scrollYProgress } = useScroll();
  const stampRotate = useTransform(scrollYProgress, [0.7, 1], [-12, 8]);

  return (
    <section className="relative bg-[color:var(--cc-rust)] text-[color:var(--cc-cream)] py-24 md:py-40 overflow-hidden">
      <div className="absolute inset-0 cc-grain" />

      {/* Decorative wax seal, top-right */}
      <motion.div
        style={{ rotate: stampRotate }}
        className="hidden md:block absolute top-14 right-14 pointer-events-none"
      >
        <div className="cc-wax relative">
          <div className="text-center pointer-events-none">
            <div className="cc-font-display cc-italic-wonk text-5xl leading-none">cc</div>
            <div className="cc-label-sm mt-1 text-[color:var(--cc-cream)]/80">MMXXVI</div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-6 md:px-10 relative text-center">
        <div className="cc-label text-[color:var(--cc-cream)]/75">§ 06 · The Invitation</div>
        <h2 className="mt-5 cc-font-display text-5xl md:text-7xl leading-[0.95] tracking-tight">
          Take a seat<br />
          at the <span className="cc-italic-wonk">workbench.</span>
        </h2>
        <p className="mt-8 cc-font-editorial text-xl md:text-2xl leading-snug text-[color:var(--cc-cream)]/85">
          First folio is open. Résumé, interview, career map — all bound to live
          South Australian intelligence.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(session ? "/intelligence" : "/auth")}
            className="cc-btn cc-btn-onrust w-full sm:w-auto"
          >
            {session ? "Return to the Atelier" : "Enlist — it's free"}
            <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
          </button>
        </div>

        <div className="mt-10 cc-label-sm text-[color:var(--cc-cream)]/70">
          No card · Free folio · Adelaide built
        </div>
      </div>
    </section>
  );
});
CTA.displayName = "CTA";

/* ─────────────────────────── PAGE ─────────────────────────── */

const Index = memo(() => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      if (s) navigate("/dashboard");
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <main className="cc-root cc-font-sans min-h-screen bg-[color:var(--cc-cream)] text-[color:var(--cc-ink)] overflow-x-hidden antialiased">
      <CraftNav variant="cream" session={session} />
      <CraftScrollProgress />
      <Hero session={session} navigate={navigate} />
      <TickerRibbon />
      <Marquee />
      <Figures />
      <PullQuote />
      <Toolkit />
      <Method />
      <Dispatches />
      <Subjects />
      <Colophon />
      <CTA session={session} navigate={navigate} />
      <CraftFooter />
    </main>
  );
});

Index.displayName = "Index";

export default Index;
