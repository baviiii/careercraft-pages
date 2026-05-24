import { useEffect, useState, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import {
  CraftNav,
  CraftFooter,
  CraftSectionHead,
  CraftFleuron,
} from "@/components/landing/CraftShell";

/* ───────────────────────────────────────────────────────────
   CareerCraft — Landing (Vol. I · MMXXVI)
   Theme tokens live in src/styles/craft.css.
   Nav / Footer live in src/components/landing/CraftShell.tsx.
   ─────────────────────────────────────────────────────────── */

/* ─────────────────────────── HERO ─────────────────────────── */

const Hero = memo(({ session, navigate }: { session: Session | null; navigate: (to: string) => void }) => {
  return (
    <section className="relative bg-[color:var(--cc-cream)] pt-28 pb-20 md:pt-36 md:pb-24 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <h1 className="cc-font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)] max-w-4xl">
          Build your next move with clear, trusted career data.
        </h1>

        <p className="mt-6 text-lg md:text-2xl leading-[1.45] text-[color:var(--cc-ink-soft)] max-w-3xl">
          Resume building, job tracking, and market signals in one calm workspace. No noise, no guesswork.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-start gap-3">
          {session ? (
            <button onClick={() => navigate("/dashboard")} className="cc-btn cc-btn-primary w-full sm:w-auto">
              Open dashboard <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
            </button>
          ) : (
            <>
              <button onClick={() => navigate("/auth")} className="cc-btn cc-btn-primary w-full sm:w-auto">
                Get started free <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
              </button>
              <button onClick={() => navigate("/playground")} className="cc-btn cc-btn-ghost w-full sm:w-auto">
                Try playground <ArrowRight className="w-4 h-4 cc-arrow-right" />
              </button>
            </>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            "Verified public sources",
            "Private by default",
            "Built for real job search flow",
          ].map((item) => (
            <div key={item} className="ds-surface px-4 py-3 text-sm text-[color:var(--cc-ink-soft)]">
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
Hero.displayName = "Hero";

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
          section="§ 01 · The numbers"
          title={<>The numbers<br /><span className="cc-italic-wonk">behind the work.</span></>}
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
    title: ["Interview", "Practice"],
    body: "Rehearse with an AI coach who knows your sector.",
    tags: ["Mock", "Feedback", "Sector"],
  },
  {
    n: "05",
    title: ["Investment", "Tracker"],
    body: "See where state funds flow and which skills they need.",
    tags: ["Grants", "Pipeline", "Forecast"],
  },
  {
    n: "06",
    title: ["Career", "Pathways"],
    body: "Find adjacent roles, transferable skills, and clear next steps.",
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
        section="§ 02 · The toolkit"
        title={<>Six tools.<br /><span className="cc-italic-wonk">One workspace.</span></>}
        sub={<>Every tool pairs what you want with live South Australian data.</>}
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
    { tag: "i.", title: "Gather", body: "Every SA policy document ingested and indexed — a structured archive." },
    { tag: "ii.", title: "Interpret", body: "Policy cross-referenced with workforce data so patterns surface." },
    { tag: "iii.", title: "Apply", body: "Build your résumé, rehearse interviews and plan your path with live data." },
  ];
  return (
    <section id="method" className="bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] py-24 md:py-36 relative overflow-hidden">
      <div className="absolute inset-0 cc-grain opacity-[0.08]" />
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
        <div className="max-w-2xl">
          <div className="cc-label text-[color:var(--cc-rust)]">§ 03 · How it works</div>
          <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight">
            Three steps to<br />
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
    date: "17 April 2026",
    dept: "Dept. of Industry & Skills",
    headline: "Cyber apprenticeships expanded by 320 seats",
    body: "New intake targeting school leavers and mid-career switchers. Focus: SOC analyst, cloud security, GRC.",
  },
  {
    date: "12 April 2026",
    dept: "Invest SA",
    headline: "$144M committed to advanced manufacturing corridor",
    body: "Elizabeth–Osborne corridor receives funding. Robotics, composites, and low-emissions metals prioritised.",
  },
  {
    date: "04 April 2026",
    dept: "Dept. for Health",
    headline: "Regional allied-health roles: +18% forecast",
    body: "Mid-north regions leading growth. Physio, occupational therapy, and mental-health streams named.",
  },
];

const Dispatches = memo(() => (
  <section id="dispatches" className="bg-[color:var(--cc-cream)] py-24 md:py-36">
    <div className="max-w-[1400px] mx-auto px-6 md:px-10">
      <CraftSectionHead
        section="§ 04 · Updates"
        title={<>Latest from the<br /><span className="cc-italic-wonk">SA government.</span></>}
        sub={<>A rolling feed of policy, funding and hiring news — sourced, dated, and always current.</>}
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
              Update · {String(i + 1).padStart(2, "0")}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2">
              <div className="cc-label-sm text-[color:var(--cc-ash)]">{d.date}</div>
              <div className="cc-label-sm text-[color:var(--cc-rust)]">Published</div>
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
  { id: "A", who: "Job seekers", body: "Match your history against the sectors SA is actively funding." },
  { id: "B", who: "Students", body: "Plot pathways from today's policy to tomorrow's demand." },
  { id: "C", who: "Migrants", body: "Translate credentials and find visa-friendly, in-demand roles." },
  { id: "D", who: "Career changers", body: "See adjacent roles, transferable skills, and real next steps." },
];

const Subjects = memo(() => (
  <section id="subjects" className="bg-[color:var(--cc-cream-2)] py-24 md:py-36 relative overflow-hidden">
    <div className="absolute inset-0 cc-grain" />
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative">
      <CraftSectionHead
        section="§ 05 · Who it's for"
        title={<>Four people.<br /><span className="cc-italic-wonk">One platform.</span></>}
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

/* ─────────────────────────── CTA ─────────────────────────── */

const CTA = memo(({ session, navigate }: { session: Session | null; navigate: (to: string) => void }) => {
  return (
    <section className="relative bg-[color:var(--ds-surface-alt)] text-[color:var(--cc-ink)] py-24 md:py-32 overflow-hidden border-y border-[color:var(--cc-hair)]">
      <div className="max-w-3xl mx-auto px-6 md:px-10 relative text-center">
        <div className="cc-label text-[color:var(--cc-rust)]">Get started</div>
        <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[1.02] tracking-tight">
          Ready to run your career search with less chaos?
        </h2>
        <p className="mt-6 text-lg md:text-xl leading-snug text-[color:var(--cc-ink-soft)]">
          Build your resume, track applications, and stay aligned with market demand from one place.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(session ? "/dashboard" : "/auth")}
            className="cc-btn cc-btn-primary w-full sm:w-auto"
          >
            {session ? "Open dashboard" : "Create free account"}
            <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
          </button>
        </div>
        <div className="mt-8 cc-label-sm text-[color:var(--cc-ash)]">
          Free · No card required
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
    <main className="ds-shell cc-root cc-font-sans min-h-screen text-[color:var(--cc-ink)] overflow-x-hidden antialiased">
      <CraftNav variant="cream" session={session} />
      <Hero session={session} navigate={navigate} />
      <Figures />
      <Toolkit />
      <Method />
      <Dispatches />
      <Subjects />
      <CTA session={session} navigate={navigate} />
      <CraftFooter />
    </main>
  );
});

Index.displayName = "Index";

export default Index;
