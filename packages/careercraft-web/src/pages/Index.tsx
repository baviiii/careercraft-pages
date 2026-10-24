import { useEffect, useState, memo, useRef, ReactNode, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthDestination } from "@/lib/postAuthDestination";
import { Session } from "@supabase/supabase-js";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import {
  CraftNav,
  CraftFooter,
  CraftSectionHead,
  CraftFleuron,
} from "@/components/landing/CraftShell";
import { publicPageMeta, usePageMeta } from "@/hooks/usePageMeta";

/* The 3D meadow is heavy (three.js) — load it on demand so it never weighs
   down first paint. A painted sky placeholder holds its space meanwhile. */
const MeadowInterlude = lazy(() => import("@/components/landing/MeadowInterlude"));

/* ───────────────────────────────────────────────────────────
   Faircopy — Landing
   "Sunlit" cut — the calm, warm, hand-painted Ghibli mood of the
   hero carried softly through the whole page: gentle sky washes,
   drifting clouds, golden light and a painterly grain. Light and
   calming throughout (no dark/glassy surfaces).

   Theme tokens live in src/styles/craft.css.
   Nav / Footer live in src/components/landing/CraftShell.tsx.
   ─────────────────────────────────────────────────────────── */

const HERO_CREAM = "#E1E0CC"; // warm off-white the cinematic type is set in

/* ── The calming, painterly atmosphere shared by every section ─────────────── */

/* A soft, sunlit sky — warm gradient + a low sun, a few drifting clouds and a
   paper grain. Three times of day give the page a gentle rhythm as you scroll.
   Pure CSS, so it always renders and stays light + warm (never "AI" dark). */
const SkyBackdrop = ({ tone = "dawn", clouds = true }: { tone?: "dawn" | "day" | "dusk"; clouds?: boolean }) => {
  const grad = {
    dawn: "linear-gradient(180deg,#F5E2CB 0%,#F3EADB 48%,#ECE0CB 100%)",
    day: "linear-gradient(180deg,#DEE6DC 0%,#F0E9D8 55%,#F3EADB 100%)",
    dusk: "linear-gradient(180deg,#F1D7AF 0%,#ECD4BE 52%,#E6D2BD 100%)",
  }[tone];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ background: grad }} />
      {/* low warm sun */}
      <div
        className="absolute -top-32 right-[-8%] h-[520px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(245,212,150,0.6) 0%, rgba(245,212,150,0.15) 45%, transparent 70%)" }}
      />
      {clouds && (
        <>
          <div
            className="animate-float absolute left-[3%] top-[13%] h-44 w-[46%] rounded-full opacity-70"
            style={{ background: "radial-gradient(60% 60% at 50% 50%, rgba(255,253,247,0.92), transparent 70%)", filter: "blur(26px)" }}
          />
          <div
            className="animate-float-slow absolute right-[5%] top-[30%] h-36 w-[40%] rounded-full opacity-55"
            style={{ background: "radial-gradient(60% 60% at 50% 50%, rgba(255,253,247,0.85), transparent 70%)", filter: "blur(30px)" }}
          />
          <div
            className="animate-float absolute left-[24%] bottom-[12%] h-28 w-[34%] rounded-full opacity-45"
            style={{ background: "radial-gradient(60% 60% at 50% 50%, rgba(255,252,244,0.8), transparent 70%)", filter: "blur(28px)", animationDelay: "2.5s" }}
          />
        </>
      )}
      {/* painterly grain + a soft vintage vignette */}
      <div className="cc-grain absolute inset-0" />
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 180px 50px rgba(120,80,40,0.10)" }} />
    </div>
  );
};

/* Soft, cosy card — warm cream that lets the sky glow through a touch, a gentle
   shadow and rounded corners. The opposite of a hard-edged or glassy panel. */
const SOFT_CARD =
  "rounded-[1.25rem] bg-[rgba(250,244,233,0.86)] border border-[rgba(14,12,10,0.06)] " +
  "shadow-[0_22px_50px_-32px_rgba(70,45,20,0.5)] transition-all duration-500 " +
  "hover:-translate-y-1.5 hover:shadow-[0_32px_60px_-30px_rgba(70,45,20,0.55)]";

/* Wrap a section in the sunlit atmosphere. */
const SkySection = ({
  id,
  tone,
  children,
}: {
  id?: string;
  tone?: "dawn" | "day" | "dusk";
  children: ReactNode;
}) => (
  <section id={id} className="relative overflow-hidden py-24 md:py-36">
    <SkyBackdrop tone={tone} />
    <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10">{children}</div>
  </section>
);

/* The meadow is three.js (~140 KB) far down the page. It loads when the
   reader scrolls within a screen or so of it, not with the page. */
const MEADOW_PLACEHOLDER = (
  <div
    style={{ height: "min(90vh, 860px)", minHeight: 540, background: "linear-gradient(180deg,#b9cdd6 0%,#f0e2c0 45%,#cdb86f 100%)" }}
  />
);

const WhenNear = ({ children, placeholder }: { children: ReactNode; placeholder: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInView(ref, { once: true, margin: "900px 0px" });
  return <div ref={ref}>{near ? children : placeholder}</div>;
};

/* ─────────────────────────── HERO ─────────────────────────── */

/* The footage's first frame, painted straight away (it's in the prerendered
   HTML), with the 10-second loop faded in over it once the page has finished
   loading. The loop is ~340 KB, self-hosted; it used to be a 16 MB file on
   the video tool's CDN, fetched on every visit, phones included. Phones,
   data-saver connections and anyone who's asked for less motion keep the
   still frame. */
const HeroBackdrop = () => {
  const [play, setPlay] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const lessMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (lessMotion || small || saveData) return;
    const start = () => setPlay(true);
    if (document.readyState === "complete") {
      const id = window.setTimeout(start, 200);
      return () => window.clearTimeout(id);
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);
  return (
    <>
      <img
        src="/media/hero-poster.webp"
        srcSet="/media/hero-poster-800.webp 800w, /media/hero-poster.webp 1600w"
        sizes="100vw"
        alt=""
        width={1600}
        height={895}
        decoding="async"
        {...{ fetchpriority: "high" }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {play && (
        <video
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          onCanPlay={() => setReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
        >
          <source src="/media/hero.webm" type="video/webm" />
          <source src="/media/hero.mp4" type="video/mp4" />
        </video>
      )}
    </>
  );
};

/* Cinematic, full-bleed opening — a centred statement over the live, painterly
   footage. The words pull up into place on load; layered ink washes keep the
   type legible over any frame. This is the only section that stays dark. */
const Hero = memo(({ session, navigate }: { session: Session | null; navigate: (to: string) => void }) => {
  return (
    <section className="relative h-[100svh] min-h-[640px] w-full bg-[color:var(--cc-ink)]">
      <div className="relative h-full w-full overflow-hidden">

        <HeroBackdrop />

        {/* Legibility — vertical ink wash + soft centre veil */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0E0C0A]/45 via-[#0E0C0A]/15 to-[#0E0C0A]/80" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 62% at 50% 50%, rgba(14,12,10,0.5) 0%, rgba(14,12,10,0.15) 45%, transparent 78%)" }}
        />

        {/* Centred content — brand first, then one headline, one line, CTAs */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">

          <h1
            className="cc-font-display italic font-medium leading-[0.85] tracking-[-0.04em] text-[18vw] sm:text-[14vw] md:text-[12vw] lg:text-[10vw]"
            style={{ color: HERO_CREAM, textShadow: "0 2px 50px rgba(0,0,0,0.5)" }}
          >
            <div className="flex justify-center">Faircopy</div>
          </h1>

          {/* No entrance fades in the hero: the text is the first thing anyone
              sees, and it's already in the HTML. Fading it in made the page
              look blank for three seconds and counted as a slow load. */}
          <p
            className="mt-5 cc-font-display text-3xl sm:text-4xl md:text-5xl leading-[0.95] tracking-tight"
            style={{ color: HERO_CREAM, textShadow: "0 2px 36px rgba(0,0,0,0.45)" }}
          >
            Your next <span className="cc-italic-wonk">move.</span>
          </p>

          <p
            className="mt-6 max-w-2xl cc-font-editorial text-xl leading-snug sm:text-2xl"
            style={{ color: "rgba(225, 224, 204, 0.92)", textShadow: "0 1px 24px rgba(0,0,0,0.6)" }}
          >
            Work out where you're headed, get ready for the market, then go for the role. One calm workspace for the Australian job market.
          </p>

          <div
            className="mt-9 flex flex-col items-center gap-4 sm:flex-row"
          >
            {session ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="group inline-flex items-center gap-2 rounded-full py-1 pl-6 pr-1 text-sm font-medium text-[color:var(--cc-ink)] transition-all hover:gap-3 sm:text-base"
                style={{ backgroundColor: HERO_CREAM }}
              >
                Open dashboard
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--cc-ink)] transition-transform group-hover:scale-110">
                  <ArrowUpRight className="h-4 w-4" style={{ color: HERO_CREAM }} />
                </span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/auth")}
                  className="group inline-flex items-center gap-2 rounded-full py-1 pl-6 pr-1 text-sm font-medium text-[color:var(--cc-ink)] transition-all hover:gap-3 sm:text-base"
                  style={{ backgroundColor: HERO_CREAM }}
                >
                  Get started free
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--cc-ink)] transition-transform group-hover:scale-110">
                    <ArrowUpRight className="h-4 w-4" style={{ color: HERO_CREAM }} />
                  </span>
                </button>
                <button
                  onClick={() => navigate("/builder")}
                  className="group inline-flex items-center gap-2 text-sm transition-colors sm:text-base"
                  style={{ color: "rgba(225, 224, 204, 0.85)" }}
                >
                  Build a résumé now — no account needed
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </section>
  );
});
Hero.displayName = "Hero";

/* ─────────────────────────── COUNT UP ─────────────────────────── */

/* A small utility: parse a figure like "7,412" / "$2.1B" / "96%" and count
   up from 0 to target when it enters view. */
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

/* ─────────────────────────── FIGURES ─────────────────────────── */

/* Three figures a visitor can check for themselves: the template count,
   the tool count, and the number of steps to a finished PDF. Nothing here
   is a market statistic — if it can't be verified inside the app, it
   doesn't belong on the page. */

const FigureCell = memo(({
  row, index, inView,
}: {
  row: { fig: string; label: string; sub: string };
  index: number;
  inView: boolean;
}) => {
  const value = useCountUp(row.fig, inView, 1500 + index * 200);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: index * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
      className={`${SOFT_CARD} p-10 md:p-12`}
    >
      <div className="cc-font-display text-6xl md:text-7xl leading-none tracking-tight text-[color:var(--cc-ink)] cc-tabular">
        {value}
      </div>
      <div className="mt-6 cc-font-editorial text-xl text-[color:var(--cc-ink-soft)]">{row.label}</div>
      <div className="mt-1 cc-label-sm text-[color:var(--cc-ash)]">{row.sub}</div>
    </motion.div>
  );
});
FigureCell.displayName = "FigureCell";

const Figures = memo(() => {
  const rows = [
    { fig: "25", label: "Résumé templates", sub: "modern · professional · creative · minimal" },
    { fig: "9", label: "Tools in the workspace", sub: "first question through to signed offer" },
    { fig: "3", label: "Stages, start to finish", sub: "figure it out · get ready · go for it" },
  ];
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="figures" ref={ref} className="relative overflow-hidden py-24 md:py-36">
      <SkyBackdrop tone="dawn" />
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10">
        <CraftSectionHead
          section="What's inside"
          title={<>Everything the search<br /><span className="cc-italic-wonk">actually takes.</span></>}
        />

        <div className="mt-12 md:mt-16 opacity-70">
          <CraftFleuron />
        </div>

        <div className="mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {rows.map((r, i) => (
            <FigureCell key={r.label} row={r} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
});
Figures.displayName = "Figures";

/* ─────────────────────────── TOOLKIT ─────────────────────────── */

/* The nine tools that actually exist in the app, grouped by the stage
   they help with. The face carries the promise in the reader's words; the
   back carries the specifics. Stages are numbered because they're a rough
   order; the tools inside a stage aren't, because you pick from them. */
type Tool = { title: [string, string]; face: string; back: string; tags: string[] };

const stages: { n: string; name: string; tools: Tool[] }[] = [
  {
    n: "01",
    name: "Figure it out",
    tools: [
      {
        title: ["Career", "coach"],
        face: "Not sure what's next? Talk it through and get answers with their sources attached.",
        back: "Ask about roles, pathways or where the work is, and follow up like a conversation. Answers come back with the document behind them, so you can check the claim rather than take our word for it. Deepest on South Australia today, widening from there.",
        tags: ["Cited answers", "Follow-up questions", "SA-deep"],
      },
      {
        title: ["Market", "news"],
        face: "What's moving in your industry, without the doomscroll.",
        back: "Work news from Australian outlets, sorted by how close it is to your role, plus live ad numbers and advertised pay for any role. So you know whether it's you or the market.",
        tags: ["Australian sources", "Sorted for you", "Live ad numbers"],
      },
      {
        title: ["Browse", "jobs"],
        face: "Openings across Australia, read for what the employer actually wants.",
        back: "Search live Australian ads, sorted by how well they fit you, with the reasons in words. Save the ones you want to your tracker in a tap.",
        tags: ["Live listings", "Fit explained", "Straight to your tracker"],
      },
    ],
  },
  {
    n: "02",
    name: "Get ready",
    tools: [
      {
        title: ["Résumé", "builder"],
        face: "Start from the résumé you already have, or from nothing at all. Watch it take shape as you type.",
        back: "Paste what you have, or upload a PDF, Word file or photo with a free account, and Faircopy sorts it into sections. Edit with the page live beside you, choose from 25 templates, then export a print-ready PDF.",
        tags: ["Live preview", "25 templates", "PDF export"],
      },
      {
        title: ["Bullet", "rewrite"],
        face: "Turn “responsible for” into something a hiring manager actually remembers.",
        back: "Paste a line and the job you're going for, and get back a plain, specific rewrite. Check it says what really happened, then copy it into your résumé.",
        tags: ["Line by line", "Job-matched", "Plain English"],
      },
      {
        title: ["Cover", "letters"],
        face: "A letter that sounds like you wrote it, for the role in front of you.",
        back: "Draws on the résumé you've already built and the job ad you're answering, in Australian English — organised, not organized. Edit until it reads right, then keep it in your library or download it.",
        tags: ["From your résumé", "Australian English", "Fully editable"],
      },
    ],
  },
  {
    n: "03",
    name: "Go for it",
    tools: [
      {
        title: ["ATS", "analysis"],
        face: "See what the screening software sees — while there's still time to do something about it.",
        back: "Paste the job ad and get a compatibility score with the reasoning shown: which keywords matched, which requirements you meet, which you don't, and the red flags a recruiter would catch on the first pass. Reads résumés the Australian way — two pages and a referees section won't cost you marks.",
        tags: ["Match score", "Keyword gaps", "Built for AU résumés"],
      },
      {
        title: ["Job", "tracker"],
        face: "Every application in one place, so nothing quietly goes cold on you.",
        back: "Log each role, move it along as things progress, and see at a glance what's waiting on you. Covers every state and territory.",
        tags: ["Your pipeline", "Status at a glance", "Australia-wide"],
      },
      {
        title: ["Interview", "practice"],
        face: "Rehearse the hard questions before somebody asks them for real.",
        back: "Work through the questions that come up for your role, step into a practice room and answer them properly, then read back how it went.",
        tags: ["Practice room", "Role-specific", "Debrief"],
      },
    ],
  },
];

/* The same cosy surface as SOFT_CARD, minus the hover translate — a
   Tailwind transform utility on a face would overwrite the rotateY that
   turns the card, so the hover here is shadow only. */
const FLIP_FACE =
  "rounded-[1.25rem] bg-[rgba(250,244,233,0.86)] border border-[rgba(14,12,10,0.06)] " +
  "shadow-[0_22px_50px_-32px_rgba(70,45,20,0.5)] transition-shadow duration-500 " +
  "group-hover:shadow-[0_32px_60px_-30px_rgba(70,45,20,0.55)] p-10 md:p-12 min-h-[21rem]";

const ToolkitCard = memo(({ item, i }: { item: Tool; i: number }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [open, setOpen] = useState(false);
  const name = `${item.title[0]} ${item.title[1]}`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: (i % 3) * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
      className="h-full"
    >
      <button
        type="button"
        className="cc-flip group h-full"
        aria-expanded={open}
        aria-label={open ? `${name} — back to summary` : `${name} — see how it works`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cc-flip-inner">
          {/* The face — what this does for you */}
          <span className={`cc-flip-face cc-flip-face--front ${FLIP_FACE}`}>
            <span className="flex items-center justify-end">
              <ArrowUpRight className="cc-flip-mark w-5 h-5 text-[color:var(--cc-ash)]" />
            </span>

            <span className="mt-10 block cc-font-display text-3xl md:text-4xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)]">
              {item.title[0]}
              <br />
              <span className="cc-italic-wonk">{item.title[1]}</span>
            </span>

            <span className="mt-6 block cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
              {item.face}
            </span>

            <span className="mt-auto pt-8 block cc-label-sm text-[color:var(--cc-rust)]">
              Tap to see how it works
            </span>
          </span>

          {/* The back — the specifics */}
          <span className={`cc-flip-face cc-flip-face--back ${FLIP_FACE}`}>
            <span className="flex items-center justify-between gap-4">
              <span className="cc-label-sm text-[color:var(--cc-rust)]">{name}</span>
              <ArrowUpRight className="cc-flip-mark w-5 h-5 text-[color:var(--cc-ash)]" />
            </span>

            <span className="mt-8 block cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)]">
              {item.back}
            </span>

            <span className="mt-auto pt-8 flex flex-wrap gap-2">
              {item.tags.map((t) => (
                <span key={t} className="cc-tag">{t}</span>
              ))}
            </span>
          </span>
        </span>
      </button>
    </motion.div>
  );
});
ToolkitCard.displayName = "ToolkitCard";

const Toolkit = memo(() => (
  <SkySection id="toolkit" tone="day">
    <CraftSectionHead
      section="The toolkit"
      title={<>Nine tools.<br /><span className="cc-italic-wonk">One workspace.</span></>}
      sub={<>Everything from working out what's next to the signed offer. Tap any card to see what it actually does.</>}
    />

    <div className="mt-16 md:mt-20 space-y-16 md:space-y-20">
      {stages.map((stage) => (
        <div key={stage.n}>
          <h3 className="border-t border-[rgba(20,22,26,0.4)] pt-6 flex items-baseline gap-4">
            <span className="cc-label-sm cc-tabular text-[color:var(--cc-rust)]">{stage.n}</span>
            <span className="cc-font-display text-2xl md:text-3xl tracking-tight text-[color:var(--cc-ink)]">{stage.name}</span>
          </h3>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stage.tools.map((t, i) => (
              <ToolkitCard key={`${t.title[0]}-${t.title[1]}`} item={t} i={i} />
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Each tool has its own page: what it's for, how it works, its limits. */}
    <div className="mt-14 md:mt-16">
      <Link to="/tools" className="cc-btn cc-btn-ghost">
        See how each tool works <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
      </Link>
    </div>
  </SkySection>
));
Toolkit.displayName = "Toolkit";

/* ─────────────────────────── METHOD ─────────────────────────── */

const Method = memo(() => {
  /* A real sequence — you do these in order — so the numerals carry
     information rather than decoration. */
  const steps = [
    { n: "01", title: "Figure it out", body: "Talk through where you're headed, see what's being advertised and what it pays, and keep up with what's moving in your field." },
    { n: "02", title: "Get ready", body: "Bring the résumé you have or start fresh, tighten every line, and write a cover letter that sounds like you." },
    { n: "03", title: "Go for it", body: "Check your résumé against the ad, keep every application moving, and rehearse the interview before it's real." },
  ];
  return (
    <SkySection id="method" tone="dusk">
      <div className="max-w-2xl">
        <div className="cc-label text-[color:var(--cc-rust)]">How it works</div>
        <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight text-[color:var(--cc-ink)]">
          Three steps to<br />
          <span className="cc-italic-wonk text-[color:var(--cc-rust)]">your next role.</span>
        </h2>
      </div>

      <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: i * 0.15, ease: [0.2, 0.8, 0.2, 1] }}
            className={`${SOFT_CARD} p-10 md:p-12`}
          >
            <div className="cc-label-sm cc-tabular text-[color:var(--cc-rust)]">{s.n}</div>
            <h3 className="mt-4 cc-font-display text-3xl md:text-4xl tracking-tight text-[color:var(--cc-ink)]">
              {s.title}
            </h3>
            <p className="mt-5 cc-font-editorial text-lg leading-snug text-[color:var(--cc-ink-soft)] max-w-sm">
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>
    </SkySection>
  );
});
Method.displayName = "Method";

/* ─────────────────────────── SUBJECTS ─────────────────────────── */

const subjects = [
  { id: "A", who: "Job seekers", body: "One place for every application, so nothing starts from scratch or quietly goes cold." },
  { id: "B", who: "Career changers", body: "Find the roles your experience already qualifies you for — and the words to prove it." },
  { id: "C", who: "Students & graduates", body: "Figure out where to start, then apply like it isn't your first time." },
  { id: "D", who: "New to Australia", body: "Get a read on the market here, and put your experience in the shape Australian employers expect." },
];

const Subjects = memo(() => (
  <SkySection id="subjects" tone="day">
    <CraftSectionHead
      section="Who it's for"
      title={<>Four people.<br /><span className="cc-italic-wonk">One workspace.</span></>}
      sub={<>Built for the Australian market — every state and territory.</>}
    />

    <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-14">
      {subjects.map((s, i) => (
        <motion.article
          key={s.id}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: (i % 2) * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
          className="border-t border-[rgba(20,22,26,0.4)] pt-8 flex items-start gap-8"
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
  </SkySection>
));
Subjects.displayName = "Subjects";

/* ─────────────────────────── CTA ─────────────────────────── */

const CTA = memo(({ session, navigate }: { session: Session | null; navigate: (to: string) => void }) => {
  return (
    <section className="relative overflow-hidden py-28 md:py-36 border-y border-[color:var(--cc-hair)]">
      {/* A soft, faded echo of the hero footage to gently bookend the page */}
      {/* The hero's first frame, faded: the same bookend without a second video. */}
      <img
        src="/media/hero-poster-800.webp"
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(243,234,219,0.86) 0%, rgba(236,224,203,0.92) 100%)" }}
      />
      <div className="cc-grain absolute inset-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-10 text-center">
        <div className="cc-label text-[color:var(--cc-rust)]">Get started</div>
        <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[1.02] tracking-tight text-[color:var(--cc-ink)]">
          Ready to run your job search with less chaos?
        </h2>
        <p className="mt-6 cc-font-editorial text-lg md:text-xl leading-snug text-[color:var(--cc-ink-soft)]">
          Nine tools and one place to keep it all. Start wherever you are: a question, a résumé, or an interview next week.
        </p>
        <div className="mt-10 flex items-center justify-center">
          <button
            onClick={() => navigate(session ? "/dashboard" : "/auth")}
            className="group inline-flex items-center gap-2 rounded-full py-1 pl-6 pr-1 text-sm font-medium transition-all hover:gap-3 sm:text-base"
            style={{ backgroundColor: "var(--cc-ink)", color: HERO_CREAM }}
          >
            {session ? "Open dashboard" : "Create free account"}
            <span className="flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:scale-110" style={{ backgroundColor: HERO_CREAM }}>
              <ArrowUpRight className="h-4 w-4" style={{ color: "var(--cc-ink)" }} />
            </span>
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
  usePageMeta(publicPageMeta("/"));

  useEffect(() => {
    let cancelled = false;
    const pending = new Set<number>();

    /* OAuth and email-confirmation links both come back to "/", so this page
       is where most new sessions are first seen — including the ones that
       belong to a guest mid-way through building a résumé. It used to send
       every session to /dashboard, which silently threw that away. The
       destination is not this page's call to make; see postAuthDestination. */
    const routeSession = async (s: Session | null) => {
      if (cancelled || !s) return;
      const destination = await resolvePostAuthDestination(s.user.id);
      if (!cancelled) navigate(destination, { replace: true });
    };

    /* Supabase holds a lock for the whole onAuthStateChange callback, and
       for the moment getSession() is resolving. Filing the guest résumé
       (another Supabase call) inside that moment fails: the session is not
       ready, the insert errors, and a brand-new Google / Microsoft / email
       confirmation lands on "couldn't file your résumé". Waiting until this
       turn finishes lets the lock go before the save starts. */
    const routeAfterAuthUnlock = (s: Session | null) => {
      const timer = window.setTimeout(() => {
        pending.delete(timer);
        void routeSession(s);
      }, 0);
      pending.add(timer);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s);
      routeAfterAuthUnlock(s);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      routeAfterAuthUnlock(s);
    });
    return () => {
      cancelled = true;
      pending.forEach((timer) => window.clearTimeout(timer));
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main
      className="cc-root cc-font-sans min-h-screen overflow-x-hidden antialiased text-[color:var(--cc-ink)]"
      style={{ backgroundColor: "var(--cc-cream)" }}
    >
      <CraftNav variant="ink" session={session} />
      <Hero session={session} navigate={navigate} />
      <Figures />
      <Toolkit />
      <Method />
      <Subjects />
      <WhenNear placeholder={MEADOW_PLACEHOLDER}>
        <Suspense fallback={MEADOW_PLACEHOLDER}>
          <MeadowInterlude />
        </Suspense>
      </WhenNear>
      <CTA session={session} navigate={navigate} />
      <CraftFooter />
    </main>
  );
});

Index.displayName = "Index";

export default Index;
