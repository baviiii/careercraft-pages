import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CraftPageShell } from "@/components/landing/CraftShell";

const sections = [
  {
    n: "01",
    title: "What we collect",
    items: [
      "Account details — your name, email and login credentials. Passwords are hashed; we never see them.",
      "Career material you give us — résumés, cover letters, job applications you track, and answers you type into our tools.",
      "Profile and preferences — target roles, locations and onboarding answers, used to tailor what you see.",
      "Usage and session data — features used, device and browser information, and approximate location, kept for security and product improvement.",
      "Cookies for session and preference continuity — not for cross-site tracking.",
    ],
  },
  {
    n: "02",
    title: "How we use it",
    items: [
      "To run the tools you use — parsing, analysing and rewriting your résumé, scoring job fit, interview practice and coaching.",
      "AI processing: when you use an AI feature, your résumé or job text is sent to our AI providers to produce that result. It is not used to train AI models.",
      "Job searches are sent to job boards to fetch live listings — the query and location only, never your identity.",
      "To personalise recommendations against South Australian market and policy data.",
      "To send service emails about your account — marketing only ever with your consent.",
      "To analyse usage in aggregate and meet our legal obligations.",
    ],
  },
  {
    n: "03",
    title: "Where it lives",
    items: [
      "Encrypted in transit and at rest, in access-controlled databases with strict role-based access.",
      "Hosted on cloud infrastructure (including Supabase, Vercel and Microsoft Azure), which may store or process data outside Australia. We hold providers to contractual safeguards consistent with the Australian Privacy Principles.",
      "Third parties see only what is needed to run the feature you are using — nothing more.",
      "We never sell your personal information. Ever.",
    ],
  },
  {
    n: "04",
    title: "Your rights",
    items: [
      "We handle personal information in line with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.",
      "Access your personal data at any time, and request correction of anything inaccurate.",
      "Request deletion of your account — we remove your data from our systems.",
      "Export your data in a portable format, and opt out of marketing at will.",
      "Unhappy with our answer? You can complain to us first, and to the Office of the Australian Information Commissioner (oaic.gov.au) if we don't resolve it.",
    ],
  },
];

export default function Privacy() {
  const navigate = useNavigate();
  const updated = new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" });

  return (
    <CraftPageShell>
      {/* Masthead */}
      <section className="bg-[color:var(--cc-cream)] pt-32 pb-12 md:pt-40 md:pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 cc-label text-[color:var(--cc-ink)] cc-link mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="flex items-center gap-4 cc-label text-[color:var(--cc-rust)]">
            <span>§ 00 · Privacy</span>
            <span className="h-px w-10 bg-[color:var(--cc-hair-strong)]" />
            <span className="text-[color:var(--cc-ash)]">Last updated · {updated}</span>
          </div>

          <h1 className="mt-4 cc-font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-[color:var(--cc-ink)]">
            Privacy,<br />
            <span className="cc-italic-wonk">plainly said.</span>
          </h1>
          <p className="mt-8 cc-font-editorial text-2xl md:text-[28px] leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
            A short, honest account of what we collect, why, and how we keep it.
            No legalese. No hidden pages.
          </p>
        </div>
      </section>

      {/* Preamble */}
      <section className="bg-[color:var(--cc-cream)] pb-12">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-12 gap-8 md:gap-16 border-t border-[color:var(--cc-hair-strong)] pt-16">
            <div className="col-span-12 md:col-span-4">
              <div className="cc-label text-[color:var(--cc-rust)]">Preamble</div>
            </div>
            <div className="col-span-12 md:col-span-8 cc-font-editorial text-xl md:text-[22px] leading-[1.5] text-[color:var(--cc-ink-soft)]">
              <p>
                Faircopy is built in Adelaide and handles personal information
                under the Privacy Act 1988 (Cth) and the Australian Privacy
                Principles. Your résumé is some of the most personal data there
                is — work history, education, referees — so this policy says
                plainly what we collect, why, where it goes and what you can do
                about it. By using Faircopy you agree to the practices
                described here.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="bg-[color:var(--cc-cream)] pb-24 md:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="space-y-0">
            {sections.map((s, i) => (
              <motion.article
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: (i % 2) * 0.08 }}
                className="grid grid-cols-12 gap-8 md:gap-16 border-t border-[color:var(--cc-ink)] py-12 md:py-16"
              >
                <header className="col-span-12 md:col-span-4">
                  <div className="cc-font-display italic text-6xl md:text-7xl leading-none text-[color:var(--cc-rust)]">
                    § {s.n}
                  </div>
                  <h2 className="mt-6 cc-font-display text-3xl md:text-4xl leading-tight tracking-tight text-[color:var(--cc-ink)]">
                    {s.title.split(" ")[0]} <span className="cc-italic-wonk">{s.title.split(" ").slice(1).join(" ")}</span>
                  </h2>
                </header>
                <div className="col-span-12 md:col-span-8">
                  <ul className="divide-y divide-[color:var(--cc-hair)]">
                    {s.items.map((item, j) => (
                      <li key={j} className="flex gap-5 py-4 first:pt-0">
                        <span className="cc-font-mono text-xs text-[color:var(--cc-ash)] pt-1 shrink-0">
                          {String(j + 1).padStart(2, "0")}
                        </span>
                        <span className="cc-font-editorial text-xl leading-snug text-[color:var(--cc-ink-soft)]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact for privacy */}
      <section className="bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
          <div className="cc-label text-[color:var(--cc-rust)]">§ 05 · Get in touch</div>
          <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight">
            Questions about<br /><span className="cc-italic-wonk">your data?</span>
          </h2>
          <p className="mt-8 cc-font-editorial text-xl md:text-2xl text-[color:var(--cc-cream)]/80 leading-snug">
            Email&nbsp;
            <a href="mailto:privacy@faircopy.au" className="cc-link text-[color:var(--cc-cream)]">
              privacy@faircopy.au
            </a>
            &nbsp;— or send us a message.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <button onClick={() => navigate("/contact")} className="cc-btn cc-btn-onrust">
              Contact us <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
            </button>
          </div>
        </div>
      </section>
    </CraftPageShell>
  );
}
