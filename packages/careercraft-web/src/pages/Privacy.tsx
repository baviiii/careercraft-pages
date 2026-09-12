import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CraftPageShell } from "@/components/landing/CraftShell";

const sections = [
  {
    n: "01",
    title: "What we collect",
    items: [
      "Information you provide — name, email, résumé data.",
      "Usage signals used to improve the product, never sold.",
      "Cookies for session and preference continuity.",
      "Data from third parties only when you connect them.",
    ],
  },
  {
    n: "02",
    title: "How we use it",
    items: [
      "To run and refine your career intelligence workshop.",
      "To personalise recommendations against SA signal.",
      "To communicate with you about your account.",
      "To analyse usage patterns in aggregate.",
      "To comply with legal obligations.",
    ],
  },
  {
    n: "03",
    title: "How it is kept",
    items: [
      "Industry-standard encryption in transit and at rest.",
      "Data stored in encrypted, access-controlled databases.",
      "Regular security audits and updates.",
      "Strict role-based access inside the shop.",
      "We never sell your personal information. Ever.",
    ],
  },
  {
    n: "04",
    title: "Your rights",
    items: [
      "Access your personal data at any time.",
      "Request correction of anything inaccurate.",
      "Request deletion of your account and data.",
      "Opt out of marketing communications at will.",
      "Export your data in a portable format.",
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
                At Faircopy we take your privacy seriously. This policy
                explains, in clear terms, how we collect, use, disclose and
                safeguard your information when you use our platform. By using
                Faircopy you agree to the collection and use of information
                in accordance with this policy.
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
