/**
 * SAFundingIntelligence — "Where the Money Goes"
 * Queries SA government documents per sector and shows real funding data.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { horusSemanticSearch } from "@/lib/horusKnowledge";
import {
  DollarSign, Building2, Heart, GraduationCap, Zap,
  Users, Home, Cpu, Shield, Loader2, FileText,
  TrendingUp, AlertCircle, ChevronDown, ChevronUp, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FundingCategory {
  key: string;
  label: string;
  emoji: string;
  icon: React.ElementType;
  query: string;
  activeClass: string;
}

interface AmountItem {
  amount: string;
  sentence: string;
}

interface CategoryIntel {
  summary: string;
  amounts: AmountItem[];
  sources: Array<{ title: string; page?: number }>;
}

// ─── Config ────────────────────────────────────────────────────────────────────

const CATEGORIES: FundingCategory[] = [
  {
    key: "infrastructure",
    label: "Infrastructure",
    emoji: "🏗️",
    icon: Building2,
    query: "infrastructure roads transport capital works investment South Australia budget 2024-25",
    activeClass: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400/60",
  },
  {
    key: "health",
    label: "Health",
    emoji: "🏥",
    icon: Heart,
    query: "health hospital medical nursing workforce funding South Australia budget 2024-25",
    activeClass: "bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-400/60",
  },
  {
    key: "education",
    label: "Education",
    emoji: "🎓",
    icon: GraduationCap,
    query: "education schools TAFE training skills funding South Australia budget 2024-25",
    activeClass: "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-violet-400/60",
  },
  {
    key: "energy",
    label: "Energy",
    emoji: "⚡",
    icon: Zap,
    query: "energy renewable hydrogen electricity grid investment South Australia budget 2024-25",
    activeClass: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-400/60",
  },
  {
    key: "skills",
    label: "Skills & Jobs",
    emoji: "👷",
    icon: Users,
    query: "skills training employment jobs workforce funding South Australia budget 2024-25",
    activeClass: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400/60",
  },
  {
    key: "housing",
    label: "Housing",
    emoji: "🏠",
    icon: Home,
    query: "housing affordable homes construction funding South Australia budget 2024-25",
    activeClass: "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/60",
  },
  {
    key: "technology",
    label: "Technology",
    emoji: "💻",
    icon: Cpu,
    query: "technology digital innovation cybersecurity funding South Australia budget 2024-25",
    activeClass: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400/60",
  },
  {
    key: "defence",
    label: "Defence",
    emoji: "🛡️",
    icon: Shield,
    query: "defence aerospace naval shipbuilding funding South Australia budget 2024-25",
    activeClass: "bg-gradient-to-r from-slate-500 to-gray-600 text-white border-slate-400/60",
  },
];

// ─── Parsers ───────────────────────────────────────────────────────────────────

/**
 * Extract dollar amounts paired with the full sentence they appear in.
 * Only includes sentences that are clean and readable (20–200 chars).
 */
function extractAmounts(text: string): AmountItem[] {
  const out: AmountItem[] = [];
  const seenAmounts = new Set<string>();
  const re = /(\$[\d,.]+\s*(?:billion|million|bn|m)\b)/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const amount = m[1].replace(/\s+/g, " ").trim();
    const normalized = amount.toLowerCase().replace(/[^0-9a-z]/g, "");
    if (seenAmounts.has(normalized)) continue;
    seenAmounts.add(normalized);

    // Find the sentence boundaries around this match
    const beforeDot = text.lastIndexOf(".", m.index);
    const afterDot = text.indexOf(".", m.index + amount.length);
    const sentence = text
      .slice(beforeDot < 0 ? 0 : beforeDot + 1, afterDot < 0 ? text.length : afterDot + 1)
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (sentence.length >= 25 && sentence.length <= 220) {
      out.push({ amount, sentence });
    }

    if (out.length >= 5) break;
  }
  return out;
}

/** Get first 3 clean sentences from the AI answer as the summary. */
function extractSummary(answer: string): string {
  const sentences = answer
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300);
  return sentences.slice(0, 3).join(" ");
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SAFundingIntelligence() {
  const [selected, setSelected] = useState<FundingCategory>(CATEGORIES[0]);
  const [intel, setIntel] = useState<CategoryIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Per-key cache so switching back doesn't re-fetch
  const cache = useRef<Map<string, CategoryIntel>>(new Map());

  const fetchIntel = useCallback(async (cat: FundingCategory) => {
    // Return cached result immediately
    if (cache.current.has(cat.key)) {
      setIntel(cache.current.get(cat.key)!);
      return;
    }

    setLoading(true);
    setError(null);
    setIntel(null);

    try {
      const result = await horusSemanticSearch(cat.query, { topK: 20 });

      if (!result.success || !result.data) {
        setError("Could not load funding data. Please try again.");
        return;
      }

      const answer = result.data.answer || "";
      const sources = result.data.sources || [];

      // Only parse the AI answer — it's clean and accurate
      // Source content can be raw/noisy so we skip it for display
      const amounts = extractAmounts(answer);
      const summary = extractSummary(answer);

      const data: CategoryIntel = {
        summary,
        amounts,
        sources: sources.slice(0, 4).map((s: any) => ({
          title: s.title || s.documentId || "SA Government Document",
          page: s.metadata?.pageNumber || s.pageNumber,
        })),
      };

      cache.current.set(cat.key, data);
      setIntel(data);
    } catch (e) {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (cat: FundingCategory) => {
    setSelected(cat);
    // Show cached immediately, or trigger fetch
    if (cache.current.has(cat.key)) {
      setIntel(cache.current.get(cat.key)!);
      setError(null);
    } else {
      setIntel(null);
      fetchIntel(cat);
    }
  };

  // Auto-load first category on mount
  useEffect(() => {
    fetchIntel(CATEGORIES[0]);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/60 via-purple-950/50 to-pink-950/40 backdrop-blur-sm overflow-hidden shadow-xl shadow-fuchsia-500/10"
    >
      {/* ── Header ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-5 pt-5 pb-4 flex items-start justify-between hover:opacity-90 transition-opacity text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shadow-md shadow-fuchsia-500/30 shrink-0">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Where the Money Goes</h3>
              <Badge className="text-[10px] bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40 hidden sm:flex">
                SA Budget 2024–25
              </Badge>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Select a sector to see how SA Government funding is allocated
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-white/40" />
            : <ChevronDown className="w-4 h-4 text-white/40" />
          }
        </div>
      </button>

      {/* ── Body ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-fuchsia-500/20 pt-4">

              {/* Sector pills */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => handleSelect(cat)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
                      "transition-all duration-200 border",
                      selected.key === cat.key
                        ? cn(cat.activeClass, "scale-105 shadow-lg")
                        : "bg-white/8 text-white/60 border-white/15 hover:bg-white/12 hover:text-white hover:border-white/25"
                    )}
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-3 py-8 text-white/50 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400 shrink-0" />
                  Loading {selected.label} funding data…
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="flex items-center gap-2 py-3 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => fetchIntel(selected)}
                    className="ml-auto text-xs h-7 text-white/60 hover:text-white"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Content */}
              {intel && !loading && (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selected.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    {/* Summary — always present, always accurate */}
                    {intel.summary && (
                      <div className="p-4 rounded-xl bg-white/6 border border-fuchsia-500/20">
                        <p className="text-xs font-semibold text-fuchsia-300 mb-2 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" />
                          {selected.emoji} {selected.label} Funding Summary
                        </p>
                        <p className="text-sm text-white/85 leading-relaxed">{intel.summary}</p>
                      </div>
                    )}

                    {/* Dollar amounts with context */}
                    {intel.amounts.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-white/60 flex items-center gap-1.5 mb-2">
                          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                          Key Allocations
                        </p>
                        <div className="space-y-2">
                          {intel.amounts.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/8"
                            >
                              <span className="text-sm font-bold text-amber-300 whitespace-nowrap shrink-0 mt-0.5">
                                {item.amount}
                              </span>
                              <p className="text-xs text-white/70 leading-relaxed">{item.sentence}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No amounts found — summary is still shown above */}
                    {intel.amounts.length === 0 && intel.summary && (
                      <div className="flex items-center gap-2 text-xs text-white/35 py-1">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        No specific dollar figures found in documents for this sector.
                      </div>
                    )}

                    {/* No data at all */}
                    {!intel.summary && intel.amounts.length === 0 && (
                      <p className="text-sm text-white/35 text-center py-4">
                        No funding data found for this sector — try another category.
                      </p>
                    )}

                    {/* Sources */}
                    {intel.sources.length > 0 && (
                      <div className="pt-1 border-t border-white/8">
                        <p className="text-[10px] text-white/30 flex items-center gap-1 mb-1.5">
                          <FileText className="w-3 h-3" />
                          Based on SA Government documents
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {intel.sources.map((src, i) => (
                            <span
                              key={i}
                              title={src.title}
                              className="text-[10px] text-white/35 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 truncate max-w-[200px]"
                            >
                              {src.title}{src.page ? ` · p.${src.page}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default SAFundingIntelligence;
