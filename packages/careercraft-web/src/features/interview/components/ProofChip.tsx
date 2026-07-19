import { ArrowUpRight } from "lucide-react";
import type { Proof } from "@/lib/interviewCoach";

/**
 * A real, vetted source (e.g. a Hacker News thread with points/comments)
 * behind a tip/resource/coaching note. Only rendered when the MCP returns
 * proof — never fabricated.
 */
export function ProofChip({ proof }: { proof: Proof | null }) {
  if (!proof) return null;
  return (
    <a
      href={proof.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 border border-[color:var(--cc-hair-strong)] bg-[color:var(--cc-cream-2)] px-2.5 py-1.5 transition-colors hover:border-[color:var(--cc-rust)] hover:text-[color:var(--cc-rust)]"
    >
      <span className="cc-label-sm text-[color:var(--cc-ash)]">source</span>
      <span className="text-xs font-medium">{proof.label}</span>
      {proof.stat && (
        <span className="cc-label-sm text-[color:var(--cc-rust)]">{proof.stat}</span>
      )}
      <ArrowUpRight className="h-3 w-3" />
    </a>
  );
}
