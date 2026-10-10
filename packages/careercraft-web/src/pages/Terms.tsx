import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CraftPageShell } from "@/components/landing/CraftShell";
import { usePageMeta } from "@/hooks/usePageMeta";

const sections = [
  {
    n: "01",
    title: "The service",
    items: [
      "Faircopy is a career workspace: résumé building and analysis, job tracking, interview practice, and market intelligence grounded in publicly available Australian government data.",
      "The core tools are free to start. Usage quotas apply to AI features so the service stays fast and fair for everyone.",
      "We may introduce paid plans. If we do, nothing you already created is held hostage — your data stays yours and exportable.",
      "We improve the product continually, which means features may change, be added or be retired with reasonable notice.",
    ],
  },
  {
    n: "02",
    title: "Your account",
    items: [
      "You must provide accurate information and keep your login credentials secure. You are responsible for activity under your account.",
      "You must be at least 16 years old, or have the consent of a parent or guardian.",
      "One person, one account. Accounts are not transferable.",
      "We may suspend or close accounts that breach these terms, after warning you where that is reasonable.",
    ],
  },
  {
    n: "03",
    title: "Your content",
    items: [
      "Your résumés, cover letters and career data belong to you. Full stop.",
      "You grant us a licence to store and process that content solely to run the service for you — nothing else.",
      "Your content is not used to train AI models.",
      "You are responsible for the accuracy of what you submit and what you send to employers. Faircopy helps you write it; you own what it says.",
      "Do not upload content you have no right to use, or another person's personal information without their consent.",
    ],
  },
  {
    n: "04",
    title: "AI, data & advice",
    items: [
      "AI features can be wrong. Outputs are general information, not professional, legal, financial or migration advice. Review everything before you rely on it.",
      "Market intelligence is drawn from official government documents and cited to its source — but budgets change and documents date. Verify before making major decisions.",
      "Job listings come from third-party job boards. We do not control their accuracy, availability or hiring outcomes.",
      "Faircopy improves your material and your information. It does not and cannot guarantee interviews, offers or employment.",
    ],
  },
  {
    n: "05",
    title: "Fair use",
    items: [
      "No scraping, harvesting or bulk-extracting the service or its data.",
      "No reselling, sublicensing or white-labelling the service without a written agreement.",
      "No attempting to bypass quotas, rate limits or security controls.",
      "No unlawful, deceptive or abusive use — including uploading malicious content or impersonating others.",
      "The Faircopy platform, brand and design are ours; these terms give you a personal right to use the service, not a licence to copy it.",
    ],
  },
  {
    n: "06",
    title: "Liability",
    items: [
      "Nothing in these terms excludes, restricts or modifies any consumer guarantee or right under the Australian Consumer Law that cannot lawfully be excluded.",
      "Where liability can lawfully be limited, ours is limited to re-supplying the service or the cost of re-supply.",
      "To the extent permitted by law, we are not liable for indirect or consequential loss, or for decisions made in reliance on AI outputs or third-party data.",
      "We work hard to keep the service available and your data safe, but no online service can promise uninterrupted, error-free operation.",
    ],
  },
  {
    n: "07",
    title: "Ending & changes",
    items: [
      "You can stop using Faircopy and delete your account at any time — your data is removed from our systems on request.",
      "We may suspend access for breach of these terms, or discontinue the service with reasonable notice.",
      "We may update these terms as the product evolves. Material changes will be notified; continued use after notice means acceptance.",
      "These terms are governed by the laws of South Australia, and disputes belong to the courts of South Australia.",
    ],
  },
];

export default function Terms() {
  const navigate = useNavigate();
  usePageMeta({
    title: "Terms of use · Faircopy",
    description: "The agreement between you and Faircopy, in plain Australian English.",
    path: "/terms",
  });
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
            <span>§ 00 · Terms</span>
            <span className="h-px w-10 bg-[color:var(--cc-hair-strong)]" />
            <span className="text-[color:var(--cc-ash)]">Last updated · {updated}</span>
          </div>

          <h1 className="mt-4 cc-font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-[color:var(--cc-ink)]">
            Terms,<br />
            <span className="cc-italic-wonk">fairly put.</span>
          </h1>
          <p className="mt-8 cc-font-editorial text-2xl md:text-[28px] leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
            The agreement between you and Faircopy, in plain Australian
            English. Short enough to actually read.
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
                These terms are a contract between you and Faircopy, based in
                Adelaide, South Australia. They apply whenever you use the
                Faircopy website and tools. If you don't agree with them,
                please don't use the service. Our{" "}
                <a
                  href="/privacy"
                  onClick={(e) => { e.preventDefault(); navigate("/privacy"); }}
                  className="cc-link"
                >
                  Privacy Policy
                </a>{" "}
                explains how we handle your data and forms part of this
                agreement.
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

      {/* Contact */}
      <section className="bg-[color:var(--cc-ink)] text-[color:var(--cc-cream)] py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
          <div className="cc-label text-[color:var(--cc-rust)]">§ 08 · Get in touch</div>
          <h2 className="mt-4 cc-font-display text-4xl md:text-6xl leading-[0.95] tracking-tight">
            Questions about<br /><span className="cc-italic-wonk">these terms?</span>
          </h2>
          <p className="mt-8 cc-font-editorial text-xl md:text-2xl text-[color:var(--cc-cream)]/80 leading-snug">
            We'd rather explain than surprise. Send us a message.
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
