/**
 * CrossTabConnections - Real intelligence: funding → careers → skills
 * Queries the search index directly per sector. No placeholder data.
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  ArrowRight, DollarSign, Briefcase, Brain,
  TrendingUp, Zap, Link2, Loader2, Building2,
  GraduationCap, Leaf, Cpu, Heart, Wrench, Globe,
  FileText, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { horusSemanticSearch } from "@/lib/horusKnowledge";

// ─── Sector config ────────────────────────────────────────────────────────────

interface SectorConfig {
  key: string; label: string; icon: React.ElementType;
  gradient: string; query: string;
}

const SECTORS: SectorConfig[] = [
  { key: "infrastructure", label: "Infrastructure", icon: Building2,    gradient: "from-amber-500 to-orange-500",   query: "infrastructure transport roads construction capital investment budget" },
  { key: "health",         label: "Health",         icon: Heart,         gradient: "from-red-500 to-pink-500",      query: "health hospital medical nursing workforce budget allocation" },
  { key: "education",      label: "Education",      icon: GraduationCap, gradient: "from-violet-500 to-purple-500", query: "education schools TAFE training teachers budget workforce" },
  { key: "energy",         label: "Energy",         icon: Zap,           gradient: "from-emerald-500 to-teal-500",  query: "energy renewable hydrogen electricity grid budget investment" },
  { key: "technology",     label: "Technology",     icon: Cpu,           gradient: "from-cyan-500 to-blue-500",     query: "technology digital AI innovation cybersecurity budget workforce" },
  { key: "environment",    label: "Environment",    icon: Leaf,          gradient: "from-lime-500 to-green-500",    query: "environment climate nature conservation parks budget" },
  { key: "tourism",        label: "Tourism",        icon: Globe,         gradient: "from-orange-500 to-amber-500",  query: "tourism hospitality events arts culture budget" },
  { key: "industry",       label: "Industry",       icon: Wrench,        gradient: "from-slate-400 to-gray-500",   query: "manufacturing industry trade business investment jobs" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectorIntelligence {
  funding: Array<{ amount: string; label: string }>;
  careers: Array<{ title: string; ctx: string }>;
  skills: Array<{ name: string }>;
  insight: string;
  sources: string[];
  chartData: Array<{ name: string; value: number }>;
}

const CHART_COLORS = ["#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#f59e0b"];

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseFunding(text: string): Array<{ amount: string; label: string }> {
  const out: Array<{ amount: string; label: string }> = [];
  const re = /(\$[\d,.]+\s*(?:billion|million|B|M)\b)/gi;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const amt = m[1].trim();
    if (seen.has(amt)) continue;
    seen.add(amt);
    const before = text.slice(Math.max(0, m.index - 50), m.index).replace(/\n/g, " ").trim();
    const after = text.slice(m.index + amt.length, m.index + amt.length + 60).replace(/\n/g, " ").trim();
    const label = (before.split(/[.!?]/).pop() || after.split(/[.!?]/)[0] || "allocation").trim().slice(0, 60);
    out.push({ amount: amt, label: label || "allocation" });
    if (out.length >= 5) break;
  }
  return out;
}

function parseCareers(text: string): Array<{ title: string; ctx: string }> {
  // Multi-word roles first (order matters — check longer phrases before single words)
  const multiWord = [
    "project manager", "program manager", "contract manager", "asset manager",
    "registered nurse", "enrolled nurse", "clinical nurse",
    "civil engineer", "structural engineer", "electrical engineer", "mechanical engineer", "software engineer",
    "data scientist", "data analyst", "business analyst", "policy analyst",
    "social worker", "case worker", "community worker",
    "school principal", "early childhood educator",
    "project officer", "program officer", "compliance officer", "safety officer",
    "human resources", "HR manager",
    "chief executive", "general manager", "operations manager", "finance manager",
    "IT specialist", "cyber security", "network engineer",
    "environmental officer", "planning officer",
  ];
  const singleWord = [
    "manager", "director", "officer", "analyst", "engineer", "nurse", "doctor",
    "teacher", "technician", "specialist", "coordinator", "developer", "scientist",
    "planner", "inspector", "advisor", "consultant", "supervisor", "operator",
    "worker", "administrator", "accountant", "architect", "paramedic", "pharmacist",
    "psychologist", "counsellor", "librarian", "ranger", "electrician", "plumber",
    "carpenter", "mechanic", "driver", "researcher", "lecturer", "professor",
    "principal", "superintendent", "commissioner", "secretary",
  ];
  const seen = new Set<string>();
  const out: Array<{ title: string; ctx: string }> = [];
  const lower = text.toLowerCase();

  // Check multi-word first
  for (const phrase of multiWord) {
    const idx = lower.indexOf(phrase);
    if (idx < 0 || seen.has(phrase)) continue;
    seen.add(phrase);
    const ctx = text.slice(Math.max(0, idx - 40), idx + 120).replace(/\n/g, " ").trim();
    out.push({ title: phrase.replace(/\b\w/g, c => c.toUpperCase()), ctx: ctx.slice(0, 110) });
    if (out.length >= 8) return out;
  }

  // Then single words
  for (const t of singleWord) {
    if (seen.has(t)) continue;
    const re = new RegExp(`\\b(${t}s?)\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      seen.add(t);
      const ctx = text.slice(Math.max(0, m.index - 40), m.index + 120).replace(/\n/g, " ").trim();
      out.push({ title: t.charAt(0).toUpperCase() + t.slice(1), ctx: ctx.slice(0, 110) });
      break;
    }
    if (out.length >= 8) break;
  }
  return out;
}

function parseSkills(text: string): Array<{ name: string }> {
  const kws = [
    // Technical
    "project management", "program management", "contract management",
    "data analysis", "data science", "data engineering",
    "software development", "software engineering", "systems integration",
    "cybersecurity", "network security", "cloud computing",
    "machine learning", "artificial intelligence", "AI",
    "GIS", "spatial analysis", "remote sensing",
    "electrical engineering", "civil engineering", "structural engineering",
    "renewable energy", "energy management", "hydrogen technology",
    "procurement", "supply chain", "logistics",
    "financial management", "budget management", "accounting",
    "asset management", "facilities management",
    // Soft / cross-sector
    "leadership", "stakeholder engagement", "communication",
    "policy development", "policy analysis", "regulatory compliance",
    "research", "grant writing", "report writing",
    "change management", "risk management", "governance",
    "community engagement", "cultural competency",
    // Health
    "clinical skills", "patient care", "aged care", "mental health",
    "nursing", "allied health", "emergency response",
    // Education
    "teaching", "curriculum development", "early childhood",
    "training and development", "coaching", "mentoring",
    // Construction / trades
    "construction", "project delivery", "site management",
    "drafting", "AutoCAD", "BIM",
    // Digital
    "digital literacy", "digital transformation", "UX design",
    "web development", "database management", "ERP systems",
  ];
  const lower = text.toLowerCase();
  return kws
    .filter(kw => lower.includes(kw.toLowerCase()))
    .map(kw => ({ name: kw.replace(/\b\w/g, c => c.toUpperCase()) }));
}

function amountToNumber(amt: string): number {
  const n = parseFloat(amt.replace(/[^0-9.]/g, "")) || 0;
  if (/billion/i.test(amt) || /\dB\b/.test(amt)) return n * 1000;
  return n;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CrossTabConnections() {
  const [selectedSector, setSelectedSector] = useState<SectorConfig | null>(null);
  const [intel, setIntel] = useState<SectorIntelligence | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchIntelligence = useCallback(async (sector: SectorConfig) => {
    setLoading(true);
    setIntel(null);
    try {
      const result = await horusSemanticSearch(sector.query, { topK: 20 });
      if (result.success && result.data) {
        const { answer, sources } = result.data;
        const allText = [answer, ...sources.map((s: any) => s.content || s.snippet || "")].join(" ");
        const funding = parseFunding(allText);
        const careers = parseCareers(allText);
        const skills = parseSkills(allText);
        const chartData = funding
          .map(f => ({ name: f.amount, value: amountToNumber(f.amount) }))
          .filter(d => d.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        const srcSet = new Set<string>();
        sources.forEach((s: any) => { if (s.documentId || s.title) srcSet.add(s.title || s.documentId); });
        const firstTwo = answer.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
        setIntel({ funding, careers, skills, insight: firstTwo, sources: Array.from(srcSet).slice(0, 5), chartData });
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = (sector: SectorConfig) => {
    if (selectedSector?.key === sector.key) {
      setSelectedSector(null);
      setIntel(null);
    } else {
      setSelectedSector(sector);
      fetchIntelligence(sector);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900 border border-purple-500/20 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Link2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">How sectors connect</h3>
              <p className="text-[11px] text-white/40">Pick a sector to see its funding, the roles it names, and the skills behind them</p>
            </div>
          </div>
          {/* A badge reading "Live" sat here, hardcoded, with a sparkle. It
              was live in the sense that a click fetches — which is true of
              every control on the page — and it survived the months this
              panel had nothing to show. The last of these. */}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Sector grid */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {SECTORS.map((sector, i) => {
            const Icon = sector.icon;
            const active = selectedSector?.key === sector.key;
            return (
              <motion.button
                key={sector.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleSelect(sector)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all duration-200",
                  active
                    ? "border-purple-400/60 bg-purple-500/20 shadow-lg shadow-purple-500/20 scale-105"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br", sector.gradient)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className={cn("text-[10px] font-medium leading-tight", active ? "text-white" : "text-white/60")}>
                  {sector.label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Intelligence panel */}
        <AnimatePresence mode="wait">
          {selectedSector && (
            <motion.div
              key={selectedSector.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-12 text-white/40">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Querying SA government documents for {selectedSector.label} intelligence...</span>
                </div>
              ) : intel ? (
                <div className="space-y-4">
                  {/* Flow header */}
                  <div className="flex items-center gap-2">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br", selectedSector.gradient)}>
                      <selectedSector.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    {/* "Intelligence Flow" named nothing the panel shows. */}
                    <h4 className="font-semibold text-white text-sm">{selectedSector.label}: funding, roles and skills</h4>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedSector(null); setIntel(null); }}
                      className="ml-auto text-[11px] text-white/40 hover:text-white h-6 px-2">
                      Close
                    </Button>
                  </div>

                  {/* 3-column flow */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Funding */}
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-300">Budget Signals</span>
                        <Badge className="ml-auto text-[10px] bg-amber-500/20 text-amber-300 border-amber-400/30">
                          {intel.funding.length} found
                        </Badge>
                      </div>
                      {intel.funding.length > 0 ? (
                        <div className="space-y-2">
                          {intel.funding.map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-amber-300 font-bold text-sm whitespace-nowrap">{f.amount}</span>
                              <span className="text-white/50 text-[11px] leading-tight">{f.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/30 text-xs">No specific dollar amounts found in documents</p>
                      )}
                    </div>

                    {/* Careers */}
                    <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-semibold text-blue-300">Career Roles</span>
                        <Badge className="ml-auto text-[10px] bg-blue-500/20 text-blue-300 border-blue-400/30">
                          {intel.careers.length} roles
                        </Badge>
                      </div>
                      {intel.careers.length > 0 ? (
                        <div className="space-y-2">
                          {intel.careers.map((c, i) => (
                            <div key={i}>
                              <div className="flex items-center gap-1.5">
                                <ChevronRight className="w-3 h-3 text-blue-400 flex-shrink-0" />
                                <span className="text-white text-xs font-medium">{c.title}</span>
                              </div>
                              <p className="text-white/40 text-[10px] pl-4 leading-tight">{c.ctx}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/30 text-xs">No specific roles mentioned in documents</p>
                      )}
                    </div>

                    {/* Skills */}
                    <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-purple-300">Skills in Demand</span>
                        <Badge className="ml-auto text-[10px] bg-purple-500/20 text-purple-300 border-purple-400/30">
                          {intel.skills.length}
                        </Badge>
                      </div>
                      {intel.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {intel.skills.map((s, i) => (
                            <Badge key={i} className="text-[10px] bg-purple-500/20 text-purple-200 border-purple-400/30">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/30 text-xs">No specific skills mentioned in documents</p>
                      )}
                    </div>
                  </div>

                  {/* Flow arrows between columns */}
                  <div className="flex items-center justify-center gap-4 -mt-2 mb-1">
                    <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-blue-500/30" />
                    <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <ArrowRight className="w-4 h-4 text-white/20" />
                    </motion.div>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-500/30 to-purple-500/30" />
                    <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}>
                      <ArrowRight className="w-4 h-4 text-white/20" />
                    </motion.div>
                    <div className="flex-1 h-px bg-purple-500/30" />
                  </div>

                  {/* Chart — only if we have chart data */}
                  {intel.chartData.length > 1 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <p className="text-xs font-medium text-white/60 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                        Budget Allocation Comparison
                      </p>
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={intel.chartData} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} angle={-20} textAnchor="end" interval={0} />
                          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}B` : `$${v}M`} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: "#1e1b4b", border: "1px solid rgba(139,92,246,0.4)", borderRadius: "8px", fontSize: "11px", color: "#fff" }}
                            formatter={(v: any) => [v >= 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v}M`, "Amount"]}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {intel.chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* AI Insight */}
                  {intel.insight && (
                    <div className="rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/20 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-purple-300 mb-1">AI Intelligence Summary</p>
                          <p className="text-xs text-white/70 leading-relaxed">{intel.insight}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Source documents */}
                  {intel.sources.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="w-3 h-3 text-white/30" />
                      <span className="text-[10px] text-white/30">Sources:</span>
                      {intel.sources.map((s, i) => (
                        <Badge key={i} className="text-[10px] bg-white/5 text-white/40 border-white/10">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-white/30 text-sm">No intelligence found for this sector.</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Default state */}
        {!selectedSector && (
          <div className="text-center py-6">
            <p className="text-white/30 text-sm">Select a sector above to see real intelligence from SA government documents</p>
            <p className="text-white/20 text-xs mt-1">Funding amounts · Career roles · In-demand skills · AI summary</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrossTabConnections;
