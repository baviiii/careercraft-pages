import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import {
  CraftPageShell,
  CraftScrollProgress,
  CraftFleuron,
} from "@/components/landing/CraftShell";
import { publicPageMeta, usePageMeta } from "@/hooks/usePageMeta";

export default function ContactUs() {
  const navigate = useNavigate();
  usePageMeta(publicPageMeta("/contact"));
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  /* This used to set `submitted` and nothing else: the message was discarded
     and the user was told "Message received — you'll hear back within one
     working day". Someone reporting a broken export, or asking about their
     data, got a thank-you and silence.

     There is no inbox endpoint to post to yet, so the honest fix is to hand
     the message to the user's own mail client with everything filled in. It
     genuinely reaches support@faircopy.au, the user keeps a copy in their
     sent items, and the reply address is real rather than typed into a box
     that forgets it. Replace with a real POST when there is somewhere to
     post to — the form state is already shaped for it. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const body = `${formData.message}

—
${formData.name}
${formData.email}`;
    const href =
      `mailto:support@faircopy.au` +
      `?subject=${encodeURIComponent(formData.subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = href;
    setSubmitted(true);
  };

  return (
    <CraftPageShell>
      <CraftScrollProgress />
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

          <div className="cc-label text-[color:var(--cc-rust)]">§ 00 · Contact</div>
          <h1 className="mt-4 cc-font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-[color:var(--cc-ink)]">
            Get in<br />
            <span className="cc-italic-wonk">touch.</span>
          </h1>
          <p className="mt-8 cc-font-editorial text-2xl md:text-[28px] leading-[1.35] text-[color:var(--cc-ink-soft)] max-w-2xl">
            Questions, feedback, corrections — every message read by a person, usually within a day.
          </p>
        </div>
      </section>

      <CraftFleuron mark="✉" />

      {/* Body — 2 column: details + letter */}
      <section className="bg-[color:var(--cc-cream)] pb-24 md:pb-36">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-12 gap-8 md:gap-16 border-t border-[color:var(--cc-hair-strong)] pt-16 md:pt-20">
            {/* Left column — addresses */}
            <div className="col-span-12 md:col-span-5">
              <div className="cc-label text-[color:var(--cc-rust)]">§ 01 · Reach us</div>
              <h2 className="mt-4 cc-font-display text-3xl md:text-4xl leading-tight tracking-tight text-[color:var(--cc-ink)]">
                Two ways to<br />
                <span className="cc-italic-wonk">reach us.</span>
              </h2>

              <dl className="mt-12 space-y-8">
                <div className="border-t border-[color:var(--cc-hair)] pt-5">
                  <dt className="cc-label-sm text-[color:var(--cc-ash)]">Email</dt>
                  <dd className="mt-2 cc-font-display italic text-2xl md:text-3xl">
                    <a href="mailto:support@faircopy.au" className="cc-link text-[color:var(--cc-ink)]">
                      support@faircopy.au
                    </a>
                  </dd>
                </div>
                <div className="border-t border-[color:var(--cc-hair)] pt-5">
                  <dt className="cc-label-sm text-[color:var(--cc-ash)]">In person</dt>
                  <dd className="mt-2 cc-font-editorial text-xl md:text-2xl text-[color:var(--cc-ink-soft)] leading-snug">
                    Adelaide, South Australia<br />
                    <span className="cc-font-display italic text-[color:var(--cc-ink)]">by appointment</span>
                  </dd>
                </div>
              </dl>

              <div className="mt-12 border-t border-[color:var(--cc-ink)] pt-5">
                <div className="cc-label-sm text-[color:var(--cc-ash)]">When you'll hear back</div>
                <div className="mt-3 cc-font-editorial text-xl text-[color:var(--cc-ink-soft)] leading-snug">
                  Weekdays, Adelaide time.<br />
                  Usually a day or two &mdash; it is a small team.
                </div>
              </div>
            </div>

            {/* Right column — letter form */}
            <div className="col-span-12 md:col-span-7">
              <div className="cc-label text-[color:var(--cc-rust)]">§ 02 · Send a message</div>
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
                    <div className="mt-6 cc-label text-[color:var(--cc-rust)]">Over to your email</div>
                    <h3 className="mt-4 cc-font-display text-3xl md:text-4xl text-[color:var(--cc-ink)]">
                      Your mail app should be <span className="cc-italic-wonk">open.</span>
                    </h3>
                    <p className="mt-4 cc-font-editorial text-lg text-[color:var(--cc-ink-soft)]">
                      Press send there and it reaches us. If nothing opened, write to{" "}
                      <a href="mailto:support@faircopy.au" className="cc-link text-[color:var(--cc-ink)]">
                        support@faircopy.au
                      </a>{" "}
                      directly.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                      <label htmlFor="c-name" className="cc-label-sm text-[color:var(--cc-ash)]">Your name</label>
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
                      <label htmlFor="c-email" className="cc-label-sm text-[color:var(--cc-ash)]">Email address</label>
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
                      <label htmlFor="c-subject" className="cc-label-sm text-[color:var(--cc-ash)]">Subject</label>
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
                      <label htmlFor="c-message" className="cc-label-sm text-[color:var(--cc-ash)]">Your message</label>
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
                        Send message <ArrowUpRight className="w-4 h-4 cc-arrow-up" />
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
