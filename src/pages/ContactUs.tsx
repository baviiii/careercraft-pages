import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { CraftPageShell } from "@/components/landing/CraftShell";

export default function ContactUs() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

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
            Back to the atelier
          </button>

          <div className="cc-label text-[color:var(--cc-rust)]">§ 00 · Correspondence</div>
          <h1 className="mt-4 cc-font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-[color:var(--cc-ink)]">
            Write to the<br />
            <span className="cc-italic-wonk">editors.</span>
          </h1>
          <p className="mt-8 cc-font-editorial text-2xl md:text-[28px] leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
            Questions, commissions, corrections — every letter opened by a person, usually within a day.
          </p>
        </div>
      </section>

      {/* Body — 2 column: details + letter */}
      <section className="bg-[color:var(--cc-cream)] pb-24 md:pb-36">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-12 gap-8 md:gap-16 border-t border-[color:var(--cc-hair-strong)] pt-16 md:pt-20">
            {/* Left column — addresses */}
            <div className="col-span-12 md:col-span-5">
              <div className="cc-label text-[color:var(--cc-rust)]">§ 01 · The Address</div>
              <h2 className="mt-4 cc-font-display text-3xl md:text-4xl leading-tight tracking-tight text-[color:var(--cc-ink)]">
                Three ways to reach<br />
                <span className="cc-italic-wonk">the workshop.</span>
              </h2>

              <dl className="mt-12 space-y-8">
                <div className="border-t border-[color:var(--cc-hair)] pt-5">
                  <dt className="cc-label-sm text-[color:var(--cc-ash)]">Post · electronic</dt>
                  <dd className="mt-2 cc-font-display italic text-2xl md:text-3xl">
                    <a href="mailto:support@careercraft.com" className="cc-link text-[color:var(--cc-ink)]">
                      support@careercraft.com
                    </a>
                  </dd>
                </div>
                <div className="border-t border-[color:var(--cc-hair)] pt-5">
                  <dt className="cc-label-sm text-[color:var(--cc-ash)]">By telephone</dt>
                  <dd className="mt-2 cc-font-display italic text-2xl md:text-3xl">
                    <a href="tel:+611300000000" className="cc-link text-[color:var(--cc-ink)]">
                      +61 1300 000 000
                    </a>
                  </dd>
                </div>
                <div className="border-t border-[color:var(--cc-hair)] pt-5">
                  <dt className="cc-label-sm text-[color:var(--cc-ash)]">In person</dt>
                  <dd className="mt-2 cc-font-editorial text-xl md:text-2xl text-[color:var(--cc-ink-soft)] leading-snug">
                    Adelaide, South Australia<br />
                    <span className="cc-font-display italic text-[color:var(--cc-ink)]">by quiet appointment</span>
                  </dd>
                </div>
              </dl>

              <div className="mt-12 border-t border-[color:var(--cc-ink)] pt-5">
                <div className="cc-label-sm text-[color:var(--cc-ash)]">Opening hours</div>
                <div className="mt-3 cc-font-editorial text-xl text-[color:var(--cc-ink-soft)] leading-snug">
                  Mon &ndash; Fri · 9:00 &ndash; 17:00 AEST<br />
                  Weekends closed · letters held
                </div>
              </div>
            </div>

            {/* Right column — letter form */}
            <div className="col-span-12 md:col-span-7">
              <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · The Letter</div>
              <h2 className="mt-4 cc-font-display text-3xl md:text-4xl leading-tight tracking-tight text-[color:var(--cc-ink)]">
                Leave a <span className="cc-italic-wonk">note.</span>
              </h2>

              <div className="mt-10">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-[color:var(--cc-ink)] p-10 md:p-14 text-center bg-[color:var(--cc-cream)]"
                  >
                    <CheckCircle2 className="w-10 h-10 text-[color:var(--cc-rust)] mx-auto" />
                    <div className="mt-6 cc-label text-[color:var(--cc-rust)]">Letter received</div>
                    <h3 className="mt-4 cc-font-display text-3xl md:text-4xl text-[color:var(--cc-ink)]">
                      Thank you — <span className="cc-italic-wonk">we'll write back soon.</span>
                    </h3>
                    <p className="mt-4 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)]">
                      A reply is typically posted within one working day.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                      <label htmlFor="c-name" className="cc-label-sm text-[color:var(--cc-ash)]">From &mdash; your name</label>
                      <input
                        id="c-name"
                        type="text"
                        required
                        placeholder="e.g. Ada Lovelace"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="cc-input mt-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="c-email" className="cc-label-sm text-[color:var(--cc-ash)]">Return address</label>
                      <input
                        id="c-email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="cc-input mt-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="c-subject" className="cc-label-sm text-[color:var(--cc-ash)]">Subject line</label>
                      <input
                        id="c-subject"
                        type="text"
                        required
                        placeholder="What is this about?"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="cc-input mt-2"
                      />
                    </div>

                    <div>
                      <label htmlFor="c-message" className="cc-label-sm text-[color:var(--cc-ash)]">The letter</label>
                      <textarea
                        id="c-message"
                        required
                        placeholder="Tell us how we can help…"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="cc-textarea mt-2"
                      />
                    </div>

                    <div className="pt-2">
                      <button type="submit" className="cc-btn cc-btn-primary">
                        Send the Letter <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </CraftPageShell>
  );
}
