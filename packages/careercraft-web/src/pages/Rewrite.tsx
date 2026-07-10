/* ───────────────────────────────────────────────────────────
   Bullet rewrite — one job, done well: paste a weak bullet,
   optionally a job description, get an ATS-strong rewrite.
   Full-resume rewriting lives in /analysis; per-bullet rewrites
   are also inline in the builder. This page is the quick tool.
   ─────────────────────────────────────────────────────────── */

import { motion } from "framer-motion";
import { ArrowRight, Check, Copy, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import {
  CraftAppBody,
  CraftAppHeader,
  CraftAppShell,
  CraftButton,
} from "@/components/craft/AppPrimitives";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { rewriteBullet } from "@/lib/aiRewriter";

interface RewriteEntry {
  original: string;
  rewritten: string;
}

export default function Rewrite() {
  const { toast } = useToast();
  const [bullet, setBullet] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isRewriting, setIsRewriting] = useState(false);
  const [history, setHistory] = useState<RewriteEntry[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleRewrite = async () => {
    const original = bullet.trim();
    if (!original) return;
    setIsRewriting(true);
    try {
      const rewritten = await rewriteBullet(original, jobDescription.trim());
      setHistory((prev) => [{ original, rewritten }, ...prev]);
      setBullet("");
    } catch (error) {
      console.error("Bullet rewrite failed:", error);
      toast({
        title: "Rewrite failed",
        description: "The AI service didn't respond. Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsRewriting(false);
    }
  };

  const copyResult = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <CraftAppShell>
      <CraftAppHeader
        kicker="Bullet rewrite"
        title={
          <>
            Sharpen <span className="cc-italic-wonk">one line</span> at a time.
          </>
        }
        backTo="/dashboard"
      />

      <CraftAppBody data-ds-tokenized="true">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <p className="text-[15px] text-[color:var(--cc-ink-soft)] mb-8 max-w-xl">
            Paste a bullet point from your résumé. Add the job description to
            steer the rewrite toward its keywords. Rewriting the whole résumé?
            That lives in{" "}
            <Link to="/analysis" className="underline underline-offset-2">
              ATS Analysis
            </Link>
            .
          </p>

          <div className="space-y-5">
            <div>
              <div className="cc-label text-[color:var(--cc-ash)] mb-2">Your bullet point</div>
              <Textarea
                value={bullet}
                onChange={(e) => setBullet(e.target.value)}
                placeholder="e.g. Responsible for managing the team's deployment process"
                rows={3}
                className="bg-white"
              />
            </div>

            <div>
              <div className="cc-label text-[color:var(--cc-ash)] mb-2">
                Job description (optional, improves keyword targeting)
              </div>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the role's job description here…"
                rows={4}
                className="bg-white"
              />
            </div>

            <CraftButton onClick={handleRewrite} disabled={isRewriting || !bullet.trim()}>
              {isRewriting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Rewrite bullet
            </CraftButton>
          </div>

          {history.length > 0 && (
            <div className="mt-12 space-y-6">
              <div className="cc-label text-[color:var(--cc-ash)]">Rewrites this session</div>
              {history.map((entry, i) => (
                <div
                  key={i}
                  className="border border-[color:var(--cc-hair-strong)] bg-white"
                >
                  <div className="px-5 py-4 border-b border-[color:var(--cc-hair-strong)] text-[15px] text-[color:var(--cc-ink-soft)] line-through decoration-[color:var(--cc-ash)]">
                    {entry.original}
                  </div>
                  <div className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 text-[15px]">
                      <ArrowRight className="w-4 h-4 mt-1 shrink-0 text-[color:var(--cc-rust)]" />
                      <span>{entry.rewritten}</span>
                    </div>
                    <button
                      onClick={() => copyResult(entry.rewritten, i)}
                      className="cc-btn cc-btn-ghost shrink-0"
                      style={{ padding: "0.5rem 0.8rem" }}
                    >
                      {copiedIndex === i ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copiedIndex === i ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </CraftAppBody>
    </CraftAppShell>
  );
}
