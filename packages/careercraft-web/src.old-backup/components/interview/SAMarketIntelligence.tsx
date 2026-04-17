/**
 * SAMarketIntelligence
 *
 * Queries the SA government document index for sector-specific intelligence
 * and surfaces it as interview prep context: salary signals, in-demand skills,
 * key employers, and document-backed tips — all real data from the PDFs.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHorusClient } from "@/providers/HorusProvider";
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Briefcase,
  Lightbulb,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Building2,
  GraduationCap,
  Target,
  AlertCircle,
  BookOpen,
} from "lucide-react";

// ─── Field → SA sector query mapping ──────────────────────────────────────────

const FIELD_QUERIES: Record<string, { query: string; sector: string; saLabel: string }> = {
  "Healthcare / Nursing": {
    query: "health nursing workforce salary employment South Australia",
    sector: "Health",
    saLabel: "SA Health & Medical",
  },
  "Software Engineering": {
    query: "technology digital ICT software engineering jobs South Australia",
    sector: "Technology",
    saLabel: "SA Technology & Digital",
  },
  "DevOps / SRE": {
    query: "technology digital infrastructure cloud engineering South Australia",
    sector: "Technology",
    saLabel: "SA Technology & Digital",
  },
  "Cloud / AWS": {
    query: "cloud computing digital transformation technology South Australia",
    sector: "Technology",
    saLabel: "SA Technology & Digital",
  },
  "Data Science": {
    query: "data analytics artificial intelligence workforce South Australia",
    sector: "Technology",
    saLabel: "SA Data & Analytics",
  },
  "Product Management": {
    query: "product management digital innovation technology South Australia",
    sector: "Technology",
    saLabel: "SA Technology & Innovation",
  },
  "UX/UI Design": {
    query: "digital design user experience technology workforce South Australia",
    sector: "Technology",
    saLabel: "SA Digital & Creative",
  },
  "Finance": {
    query: "finance accounting budget management South Australia government",
    sector: "Finance",
    saLabel: "SA Finance & Government",
  },
  "Human Resources": {
    query: "human resources workforce management employment South Australia",
    sector: "General",
    saLabel: "SA Workforce & HR",
  },
  "Operations": {
    query: "operations management infrastructure project delivery South Australia",
    sector: "Infrastructure",
    saLabel: "SA Infrastructure & Operations",
  },
  "Marketing": {
    query: "marketing communications tourism South Australia government",
    sector: "Tourism",
    saLabel: "SA Marketing & Tourism",
  },
  "Sales": {
    query: "business development trade investment South Australia",
    sector: "General",
    saLabel: "SA Business & Trade",
  },
  "Legal": {
    query: "legal justice attorney government South Australia",
    sector: "General",
    saLabel: "SA Legal & Justice",
  },
  "Customer Success": {
    query: "customer service community engagement South Australia government",
    sector: "General",
    saLabel: "SA Community Services",
  },
};

// ─── Parsers ───────────────────────────────────────────────────────────────────

function extractSalarySignals(text: string): string[] {
  const signals: string[] = [];
  const seen = new Set<string>();

  // Dollar amounts with context
  const re = /(\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|k|K|M|B))?(?:\s*(?:to|-)\s*\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|k|K|M|B))?)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const amt = m[1].trim();
    if (seen.has(amt)) continue;
    // Only include salary-range-looking amounts (not huge budget figures)
    const num = parseFloat(amt.replace(/[^0-9.]/g, ""));
    if (num > 200000 && !/million|billion/i.test(amt)) continue; // skip huge non-salary numbers
    seen.add(amt);
    const ctx = text.slice(Math.max(0, m.index - 60), m.index + 80).replace(/\n/g, " ").trim();
    // Only include if context looks salary-related
    if (/salary|wage|pay|remuneration|package|earn|income|band|level|grade/i.test(ctx)) {
      signals.push(ctx.slice(0, 120));
    }
    if (signals.length >= 3) break;
  }
  return signals;
}

function extractSkillsFromText(text: string): string[] {
  const keywords = [
    "project management", "stakeholder engagement", "clinical skills", "patient care",
    "data analysis", "software development", "cybersecurity", "cloud computing",
    "machine learning", "artificial intelligence", "policy development", "procurement",
    "financial management", "leadership", "communication", "risk management",
    "change management", "digital transformation", "research", "engineering",
    "nursing", "allied health", "mental health", "aged care", "teaching",
    "curriculum development", "civil engineering", "electrical engineering",
    "renewable energy", "construction", "asset management", "GIS",
    "AutoCAD", "BIM", "SAP", "ERP", "SQL", "Python", "JavaScript",
    "community engagement", "grant writing", "regulatory compliance",
  ];
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase()))
    .map(k => k.replace(/\b\w/g, c => c.toUpperCase()))
    .slice(0, 10);
}

function extractEmployers(text: string): string[] {
  const patterns = [
    /SA\s+Health/g,
    /Department\s+of\s+[A-Z][a-zA-Z\s]+/g,
    /SA\s+Water/g,
    /SA\s+Power\s+Networks/g,
    /ElectraNet/g,
    /SAPOL/g,
    /SA\s+Ambulance/g,
    /TAFE\s+SA/g,
    /University\s+of\s+(?:Adelaide|South\s+Australia|Flinders)/g,
    /Renewal\s+SA/g,
    /Infrastructure\s+SA/g,
    /Green\s+Industries\s+SA/g,
    /Attorney[-\s]General/g,
    /DHS/g,
    /DCSI/g,
  ];
  const found = new Set<string>();
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      found.add(m[0].trim());
      if (found.size >= 5) break;
    }
    if (found.size >= 5) break;
  }
  return Array.from(found);
}

function extractInterviewTips(text: string, field: string): string[] {
  const tips: string[] = [];

  // Look for priority/focus areas mentioned in documents
  const priorityRe = /(?:priority|focus|key|critical|essential|important)\s+(?:area|skill|requirement|competency)[s]?\s*(?:include|are|:)?\s*([^.!?\n]{20,100})/gi;
  let m: RegExpExecArray | null;
  while ((m = priorityRe.exec(text)) !== null) {
    const tip = m[1].trim();
    if (tip.length > 20 && tips.length < 3) {
      tips.push(`SA employers prioritise: ${tip.charAt(0).toUpperCase() + tip.slice(1)}`);
    }
  }

  // Look for workforce strategy mentions
  const stratRe = /(?:workforce|employment|recruitment)\s+(?:strategy|plan|initiative|program)[^.!?\n]{0,80}/gi;
  while ((m = stratRe.exec(text)) !== null) {
    const tip = m[0].trim();
    if (tip.length > 30 && tips.length < 4) {
      tips.push(tip.charAt(0).toUpperCase() + tip.slice(1));
    }
  }

  return tips.slice(0, 3);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MarketIntel {
  skills: string[];
  salarySignals: string[];
  employers: string[];
  tips: string[];
  sources: Array<{ title: string; documentId: string }>;
  answerSummary: string;
}

interface Props {
  field: string;
  seniority?: string;
  variant?: 'light' | 'dark';
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function SAMarketIntelligence({ field, seniority, variant = 'light' }: Props) {
  const dark = variant === 'dark';
  const [intel, setIntel] = useState<MarketIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const client = useHorusClient();

  const config = FIELD_QUERIES[field];

  const fetchIntel = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError(null);
    setIntel(null);

    try {
      const searchResult = await client.semanticSearch(config.query, {}, { topK: 15 });

      if (!searchResult) {
        setError("Could not load SA market data");
        return;
      }

      const answer = searchResult.answer || "";
      const sources = searchResult.sources || [];

      // Combine all text for parsing
      const allText = [answer, ...sources.map((s: any) => s.content || "")].join("\n");

      const skills = extractSkillsFromText(allText);
      const salarySignals = extractSalarySignals(allText);
      const employers = extractEmployers(allText);
      const tips = extractInterviewTips(allText, field);

      // Clean up answer to 2 sentences max
      const sentences = answer.split(/(?<=[.!?])\s+/);
      const answerSummary = sentences.slice(0, 2).join(" ");

      setIntel({
        skills,
        salarySignals,
        employers,
        tips,
        answerSummary,
        sources: sources.slice(0, 4).map((s: any) => ({
          title: s.title || s.documentId || "SA Government Document",
          documentId: s.documentId || "",
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load market intelligence");
    } finally {
      setLoading(false);
    }
  }, [config, field]);

  useEffect(() => {
    if (field && config) {
      fetchIntel();
    }
  }, [field]);

  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={dark
        ? "rounded-xl overflow-hidden"
        : "rounded-2xl border border-blue-200/60 dark:border-blue-800/40 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-sky-50/60 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900/60 overflow-hidden"
      }
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={dark
          ? "w-full flex items-center justify-between px-1 py-2 hover:opacity-80 transition-opacity"
          : "w-full flex items-center justify-between px-5 py-4 hover:bg-blue-100/40 dark:hover:bg-blue-900/20 transition-colors"
        }
      >
        <div className="flex items-center gap-3">
          <div className={dark
            ? "w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md shadow-pink-500/30"
            : "w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm"
          }>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className={dark ? "font-semibold text-sm text-white" : "font-semibold text-sm text-slate-800 dark:text-white"}>
              SA Market Intelligence
            </p>
            <p className={dark ? "text-xs text-white/55" : "text-xs text-slate-500 dark:text-slate-400"}>
              {config.saLabel} · sourced from SA government documents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className={dark ? "w-4 h-4 animate-spin text-pink-400" : "w-4 h-4 animate-spin text-blue-500"} />}
          {!loading && intel && (
            <Badge className={dark
              ? "text-[10px] bg-pink-500/20 text-pink-200 border-pink-400/40"
              : "text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300/40"
            }>
              Live data
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className={dark ? "w-4 h-4 text-white/40" : "w-4 h-4 text-slate-400"} />
          ) : (
            <ChevronDown className={dark ? "w-4 h-4 text-white/40" : "w-4 h-4 text-slate-400"} />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className={dark ? "pb-2 space-y-4 pt-3" : "px-5 pb-5 space-y-4 border-t border-blue-200/40 dark:border-blue-800/30 pt-4"}>

              {/* Loading */}
              {loading && (
                <div className={`flex items-center gap-3 py-4 text-sm ${dark ? 'text-white/50' : 'text-slate-500 dark:text-slate-400'}`}>
                  <Loader2 className={`w-4 h-4 animate-spin shrink-0 ${dark ? 'text-pink-400' : 'text-blue-500'}`} />
                  Querying SA government documents for {config.saLabel} intelligence…
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                  <Button variant="ghost" size="sm" onClick={fetchIntel} className="ml-auto text-xs h-7">
                    Retry
                  </Button>
                </div>
              )}

              {/* Content */}
              {intel && !loading && (
                <div className="space-y-4">

                  {/* AI Summary */}
                  {intel.answerSummary && (
                    <div className={dark
                      ? "p-3 rounded-xl bg-white/8 border border-pink-500/20"
                      : "p-3 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-blue-100 dark:border-blue-900/40"
                    }>
                      <p className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${dark ? 'text-pink-300' : 'text-blue-700 dark:text-blue-400'}`}>
                        <BookOpen className="w-3.5 h-3.5" />
                        SA Sector Overview
                      </p>
                      <p className={`text-sm leading-relaxed ${dark ? 'text-white/80' : 'text-slate-700 dark:text-slate-300'}`}>
                        {intel.answerSummary}
                      </p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">

                    {/* In-Demand Skills */}
                    {intel.skills.length > 0 && (
                      <div className="space-y-2">
                        <p className={`text-xs font-semibold flex items-center gap-1.5 ${dark ? 'text-white/70' : 'text-slate-600 dark:text-slate-400'}`}>
                          <GraduationCap className={`w-3.5 h-3.5 ${dark ? 'text-pink-400' : 'text-purple-500'}`} />
                          In-Demand Skills in SA
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {intel.skills.map(skill => (
                            <Badge
                              key={skill}
                              className={dark
                                ? "text-[11px] bg-pink-500/20 text-pink-200 border-pink-400/30 hover:bg-pink-500/30 transition-colors"
                                : "text-[11px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/40 hover:bg-purple-500/20 transition-colors"
                              }
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key SA Employers */}
                    {intel.employers.length > 0 && (
                      <div className="space-y-2">
                        <p className={`text-xs font-semibold flex items-center gap-1.5 ${dark ? 'text-white/70' : 'text-slate-600 dark:text-slate-400'}`}>
                          <Building2 className={`w-3.5 h-3.5 ${dark ? 'text-fuchsia-400' : 'text-emerald-500'}`} />
                          Key SA Employers
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {intel.employers.map(emp => (
                            <Badge
                              key={emp}
                              className={dark
                                ? "text-[11px] bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30"
                                : "text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40"
                              }
                            >
                              {emp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Salary Signals */}
                  {intel.salarySignals.length > 0 && (
                    <div className="space-y-2">
                      <p className={`text-xs font-semibold flex items-center gap-1.5 ${dark ? 'text-white/70' : 'text-slate-600 dark:text-slate-400'}`}>
                        <DollarSign className={`w-3.5 h-3.5 ${dark ? 'text-purple-400' : 'text-amber-500'}`} />
                        Salary Context from SA Documents
                      </p>
                      <div className="space-y-1.5">
                        {intel.salarySignals.map((sig, i) => (
                          <div
                            key={i}
                            className={dark
                              ? "text-xs text-white/75 bg-purple-500/10 border border-purple-400/20 rounded-lg px-3 py-2 leading-relaxed"
                              : "text-xs text-slate-600 dark:text-slate-300 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/40 dark:border-amber-800/30 rounded-lg px-3 py-2 leading-relaxed"
                            }
                          >
                            "…{sig}…"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interview Tips from Documents */}
                  {intel.tips.length > 0 && (
                    <div className="space-y-2">
                      <p className={`text-xs font-semibold flex items-center gap-1.5 ${dark ? 'text-white/70' : 'text-slate-600 dark:text-slate-400'}`}>
                        <Target className={`w-3.5 h-3.5 ${dark ? 'text-pink-400' : 'text-blue-500'}`} />
                        What SA Employers Look For
                      </p>
                      <div className="space-y-1.5">
                        {intel.tips.map((tip, i) => (
                          <div key={i} className={`flex items-start gap-2 text-xs ${dark ? 'text-white/75' : 'text-slate-600 dark:text-slate-300'}`}>
                            <TrendingUp className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${dark ? 'text-pink-400' : 'text-blue-400'}`} />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interview Prep Tips — always shown, field-specific */}
                  <div className="space-y-2">
                    <p className={`text-xs font-semibold flex items-center gap-1.5 ${dark ? 'text-white/70' : 'text-slate-600 dark:text-slate-400'}`}>
                      <Lightbulb className={`w-3.5 h-3.5 ${dark ? 'text-fuchsia-400' : 'text-yellow-500'}`} />
                      Interview Prep Tips for {field} in SA
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {getFieldTips(field, seniority).map((tip, i) => (
                        <div
                          key={i}
                          className={dark
                            ? "flex items-start gap-2 p-2.5 rounded-lg bg-white/6 border border-white/10 text-xs text-white/80"
                            : "flex items-start gap-2 p-2.5 rounded-lg bg-white/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 text-xs text-slate-700 dark:text-slate-300"
                          }
                        >
                          <span className={`font-bold shrink-0 ${dark ? 'text-pink-400' : 'text-blue-500'}`}>{i + 1}.</span>
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sources */}
                  {intel.sources.length > 0 && (
                    <div className={`pt-2 border-t ${dark ? 'border-white/10' : 'border-blue-100/60 dark:border-blue-900/30'}`}>
                      <p className={`text-[10px] flex items-center gap-1 mb-1.5 ${dark ? 'text-white/35' : 'text-slate-400 dark:text-slate-500'}`}>
                        <FileText className="w-3 h-3" />
                        Source documents
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {intel.sources.map((src, i) => (
                          <span
                            key={i}
                            className={dark
                              ? "text-[10px] text-white/40 bg-white/6 px-2 py-0.5 rounded-full border border-white/10 truncate max-w-[200px]"
                              : "text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/40 truncate max-w-[200px]"
                            }
                            title={src.title}
                          >
                            {src.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {intel.skills.length === 0 && intel.salarySignals.length === 0 && intel.tips.length === 0 && (
                    <div className={`text-center py-4 text-sm ${dark ? 'text-white/40' : 'text-slate-400'}`}>
                      <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No specific SA data found for this field — general prep tips shown below.
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Field-specific SA interview tips ─────────────────────────────────────────

function getFieldTips(field: string, seniority?: string): string[] {
  const seniorNote = seniority && ["Senior", "Lead", "Manager", "Director", "VP", "C-Level"].includes(seniority)
    ? "senior"
    : "general";

  const tips: Record<string, string[]> = {
    "Healthcare / Nursing": [
      "Reference SA Health's workforce strategy and patient-centred care priorities",
      "Demonstrate knowledge of SA's health reform agenda and hospital network",
      "Highlight experience with EPAS (SA's electronic patient administration system) if applicable",
      "Show awareness of SA's rural and remote health workforce challenges",
      seniorNote === "senior" ? "Be ready to discuss workforce planning and clinical governance frameworks" : "Use the STAR method for clinical scenario questions",
      "Mention any experience with SA Health's safety and quality frameworks",
    ],
    "Software Engineering": [
      "SA government is investing heavily in digital transformation — mention cloud and API experience",
      "Reference SA's Digital Strategy and GovTech initiatives in your answers",
      "Highlight any experience with government security standards (ISM, IRAP)",
      "Show awareness of SA's data sovereignty and privacy requirements",
      seniorNote === "senior" ? "Discuss architecture decisions and how they align with whole-of-government platforms" : "Demonstrate agile delivery experience relevant to government projects",
    ],
    "Finance": [
      "Reference SA's budget process and MYEFO/Budget Statement familiarity",
      "Demonstrate knowledge of the Public Finance and Audit Act",
      "Show experience with government financial reporting frameworks (AASB standards)",
      "Highlight any experience with SA's central agencies (DTF, DPC)",
      seniorNote === "senior" ? "Be ready to discuss whole-of-government financial risk and fiscal strategy" : "Show proficiency with government ERP systems (SAP is widely used in SA)",
    ],
    "Data Science": [
      "SA government is building data analytics capability — reference the SA Data Strategy",
      "Highlight experience with public sector data governance and privacy (SA Privacy Act)",
      "Show awareness of SA's open data portal and government datasets",
      "Demonstrate experience with geospatial data — GIS is heavily used in SA government",
      seniorNote === "senior" ? "Discuss how data products translate to policy outcomes" : "Show Python/SQL skills and experience with Azure or AWS (SA government cloud platforms)",
    ],
    "Human Resources": [
      "Reference the SA Public Sector Act and Commissioner for Public Sector Employment guidelines",
      "Demonstrate knowledge of SA's workforce diversity and inclusion strategy",
      "Show experience with enterprise bargaining and public sector industrial relations",
      "Highlight any experience with SA's performance development frameworks",
      seniorNote === "senior" ? "Be ready to discuss workforce planning aligned to SA's Strategic Plan" : "Show experience with HRMS systems used in SA government (SAP SuccessFactors)",
    ],
    "Operations": [
      "Reference SA's Infrastructure Plan and major capital works program",
      "Demonstrate knowledge of SA's procurement framework (State Procurement Board)",
      "Show experience with project delivery methodologies (PRINCE2, Agile) used in SA government",
      "Highlight any experience with SA's asset management frameworks",
      seniorNote === "senior" ? "Discuss how operational strategy aligns to SA's Economic Statement" : "Show experience with contract management and supplier relationship management",
    ],
  };

  // Default tips for unmapped fields
  const defaultTips = [
    "Research SA government's current strategic priorities and budget commitments for your sector",
    "Demonstrate awareness of SA's public sector values: service, professionalism, trust, respect, collaboration",
    "Use the STAR method and reference SA-specific context in your examples",
    "Show knowledge of the SA Public Sector Act and code of ethics",
    seniorNote === "senior" ? "Be ready to discuss how your leadership aligns to SA's Strategic Plan outcomes" : "Highlight any experience working with or for SA government agencies",
    "Prepare questions about the agency's current transformation or reform agenda",
  ];

  return (tips[field] || defaultTips).slice(0, 6);
}

export default SAMarketIntelligence;
