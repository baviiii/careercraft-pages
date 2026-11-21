/* Contact, from inside the app. A question, a bug, or an idea, saved
   against the signed-in account so it isn't lost in a mail app. */

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { CraftAppLayout } from "@/components/craft/CraftAppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Kind = "question" | "bug" | "idea";

const KINDS: { id: Kind; label: string; hint: string }[] = [
  { id: "question", label: "Ask something", hint: "How something works, or your account." },
  { id: "bug", label: "Report a bug", hint: "Something broke, or didn't do what it said." },
  { id: "idea", label: "Share an idea", hint: "Something you'd like Faircopy to do." },
];

const MIN = 10;
const MAX = 4000;

export default function ContactUsApp() {
  const { toast } = useToast();
  const [kind, setKind] = useState<Kind>("question");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const trimmed = message.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN;

  const send = async () => {
    if (trimmed.length < MIN || trimmed.length > MAX || sending) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast({ title: "Sign in to send a message", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("contact-message", {
        body: { kind, message: trimmed },
      });
      if (error) throw error;
      if (data && data.emailed === false) {
        toast({
          title: "Saved",
          description: "It's stored, but the copy to hello@faircopy.au didn't send.",
        });
      }
      setSent(true);
    } catch (error) {
      console.error("Contact message failed:", error);
      toast({
        title: "Couldn't send that",
        description: "Try again in a moment, or write to hello@faircopy.au.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <CraftAppLayout topBarLeft={<div className="cc-label-sm text-[color:var(--cc-ash)]">Contact</div>}>
      <div className="mx-auto max-w-2xl px-6 py-10 md:px-10 md:py-14">
        <p className="cc-kicker text-[color:var(--cc-rust)]">Contact</p>
        <h1 className="mt-3 cc-font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
          Tell us <span className="cc-italic-wonk">what's on your mind.</span>
        </h1>
        <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-[color:var(--cc-ink-soft)]">
          A question, a bug, or an idea. A person reads it, usually within a day or two.
        </p>

        {sent ? (
          <div className="mt-10 rounded-2xl border border-[color:var(--cc-ink)] bg-white px-6 py-10">
            <Check className="h-6 w-6 text-[color:var(--cc-rust)]" />
            <h2 className="mt-4 cc-font-display text-3xl tracking-tight">Sent.</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--cc-ink-soft)]">
              We'll reply to the email on your account.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setMessage("");
                setKind("question");
              }}
              className="cc-action cc-action--ghost mt-6"
            >
              Send another
            </button>
          </div>
        ) : (
          <form
            className="mt-10 space-y-8"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <fieldset>
              <legend className="cc-label-sm text-[color:var(--cc-ash)]">What is this?</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {KINDS.map((k) => {
                  const on = kind === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setKind(k.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                        on
                          ? "border-[color:var(--cc-ink)] bg-white"
                          : "border-[color:var(--cc-hair)] bg-transparent hover:border-[color:var(--cc-ink)]"
                      }`}
                    >
                      <span className="block text-[15px] font-semibold text-[color:var(--cc-ink)]">{k.label}</span>
                      <span className="mt-1 block text-[13px] leading-snug text-[color:var(--cc-ash)]">{k.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="contact-message" className="cc-label-sm text-[color:var(--cc-ash)]">
                {kind === "bug" ? "What happened?" : kind === "idea" ? "The idea" : "Your message"}
              </label>
              <textarea
                id="contact-message"
                required
                minLength={MIN}
                maxLength={MAX}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  kind === "bug"
                    ? "What you were doing, what you expected, and what happened instead."
                    : kind === "idea"
                      ? "What you'd like, and when it would have helped."
                      : "Ask away."
                }
                className="cc-textarea mt-2 min-h-[180px]"
              />
              <p className={`mt-2 text-[13px] ${tooShort ? "text-[color:var(--cc-rust)]" : "text-[color:var(--cc-ash)]"}`}>
                {tooShort ? `A little more — at least ${MIN} characters.` : `${trimmed.length} / ${MAX}`}
              </p>
            </div>

            <button type="submit" disabled={sending || trimmed.length < MIN} className="cc-action">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </CraftAppLayout>
  );
}
