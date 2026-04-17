import { useEffect, useState, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { CraftNav, CraftFooter, CraftSectionHead } from "@/components/landing/CraftShell";

/* ───────────────────────────────────────────────────────────
   CareerCraft — Landing (Vol. I · MMXXVI)
   Theme tokens live in src/styles/craft.css.
   Nav / Footer live in src/components/landing/CraftShell.tsx.
   ─────────────────────────────────────────────────────────── */

/* ─────────────────────────── HERO ─────────────────────────── */

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
      className="relative bg-[color:var(--cc-cream)] pt-28 pb-20 md:pt-36 md:pb-32 overflow-hidden"
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
    </section>
  );
});

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

/* ─────────────────────────── FIGURES ─────────────────────────── */

const Figures = memo(() => {
  const rows = [
    { fig: "7,412", label: "Roles indexed", sub: "39 SA industries" },
    { fig: "$2.1B", label: "Tracked investment", sub: "emerging sectors" },
    { fig: "96%", label: "Grounded in gov data", sub: "every claim sourced" },
  ];
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="bg-[color:var(--cc-cream)] py-24 md:py-36">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <CraftSectionHead
          section="§ 01 · The Ledger"
          title={<>Numbers we admit<br /><span className="cc-italic-wonk">to the record.</span></>}
        />

        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--cc-hair-strong)] border border-[color:var(--cc-hair-strong)]">
          {rows.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: i * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
              className="bg-[color:var(--cc-cream)] p-10 md:p-14"
            >
              <div className="cc-label-sm text-[color:var(--cc-ash)]">fig. {String(i + 1).padStart(2, "0")}</div>
              <div className="mt-8 cc-font-display text-6xl md:text-8xl leading-none tracking-tight text-[color:var(--cc-ink)]">
                {r.fig}
              </div>
              <div className="mt-6 cc-font-editorial text-xl text-[color:var(--cc-ink-soft)]">{r.label}</div>
              <div className="mt-1 cc-label-sm text-[color:var(--cc-ash)]">{r.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ─────────────────────────── TOOLKIT ─────────────────────────── */

const toolkit = [
  { n: "01", title: ["Policy", "Intelligence"], body: "Every SA policy and budget, parsed and cited line by line." },
  { n: "02", title: ["Workforce", "Signals"], body: "Live sector growth, emerging roles, skill premiums." },
  { n: "03", title: ["Résumé", "Workshop"], body: "Draft against the live demand signal. ATS-safe, hand-tuned." },
  { n: "04", title: ["Interview", "Atelier"], body: "Rehearse with an AI editor steeped in your sector." },
  { n: "05", title: ["Investment", "Ledger"], body: "Track where state funds flow and which skills they need." },
  { n: "06", title: ["Career", "Cartography"], body: "Map adjacent roles. Transferable skills. Clear next steps." },
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
      className="group bg-[color:var(--cc-cream)] border border-[color:var(--cc-hair-strong)] p-10 md:p-12 min-h-[280px] flex flex-col"
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
    </motion.article>
  );
});

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

/* ─────────────────────────── METHOD ─────────────────────────── */

const Method = memo(() => {
  const steps = [
    { tag: "i.", title: "Gather", body: "Every SA document ingested and indexed. Raw ink, structured archive." },
    { tag: "ii.", title: "Interpret", body: "Policy cross-referenced with workforce data. Patterns surface." },
    { tag: "iii.", title: "Set", body: "You compose — résumé, interview, route — against live signal." },
  ];
  return (
    <section id="method" className="bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] py-24 md:py-36">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
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

/* ─────────────────────────── SUBJECTS ─────────────────────────── */

const subjects = [
  { id: "A", who: "The Seeker", body: "Match your history against the sectors SA is actively funding." },
  { id: "B", who: "The Student", body: "Plot pathways from today's policy to tomorrow's demand." },
  { id: "C", who: "The Migrant", body: "Translate credentials. Find visa-friendly, in-demand roles." },
  { id: "D", who: "The Transitioner", body: "Adjacent roles mapped. Transferable skills named. No waste." },
];

const Subjects = memo(() => (
  <section id="subjects" className="bg-[color:var(--cc-cream)] py-24 md:py-36">
    <div className="max-w-[1400px] mx-auto px-6 md:px-10">
      <CraftSectionHead
        section="§ 04 · The Subjects"
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

/* ─────────────────────────── CTA ─────────────────────────── */

const CTA = memo(({ session, navigate }: { session: Session | null; navigate: (to: string) => void }) => (
  <section className="relative bg-[color:var(--cc-rust)] text-[color:var(--cc-cream)] py-24 md:py-40 overflow-hidden">
    <div className="absolute inset-0 cc-grain" />
    <div className="max-w-3xl mx-auto px-6 md:px-10 relative text-center">
      <div className="cc-label text-[color:var(--cc-cream)]/75">§ 05 · The Invitation</div>
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
));

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
      <Hero session={session} navigate={navigate} />
      <Marquee />
      <Figures />
      <Toolkit />
      <Method />
      <Subjects />
      <CTA session={session} navigate={navigate} />
      <CraftFooter />
    </main>
  );
});

Index.displayName = "Index";

export default Index;
