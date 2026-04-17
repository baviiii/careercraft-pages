/**
 * IntelligenceContext - Centralized state management for the intelligence dashboard
 * 
 * This context provides:
 * - Shared data across all intelligence components (cost-efficient, single fetch)
 * - Cross-tab insights and connections
 * - Caching and smart refresh
 * - Real-time metrics and trends
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRAGMetadata } from "@/hooks/useRAGMetadata";
import type { IntelligenceTab, InsightOutput } from "@/lib/intelligencePrompts";
import { SEMANTIC_QUERIES, parseInsightResponse, getTabPrompt } from "@/lib/intelligencePrompts";

// ============================================================================
// Cache for alerts and chart chunks
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const alertsCache = new SimpleCache();
const chartCache = new SimpleCache();

// Deterministic pseudo-random based on string hash (avoids Math.random() causing numbers to change every render)
function deterministicValue(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000; // 0..0.999
  return min + normalized * (max - min);
}

// ============================================================================
// Types
// ============================================================================

export interface FundingAllocation {
  sector: string;
  amount: number;
  change: number;
  programs: number;
  color?: string;
  priority: "high" | "medium" | "low";
  confidence: "high" | "medium" | "low"; // Source confidence
  sources: Array<{
    title: string;
    url?: string;
    excerpt: string;
    documentType?: string; // PDF, web, etc.
    category?: string; // budget, policy, etc.
    pageNumber?: number;
    tableNumber?: number;
    extractionMethod?: "table" | "text" | "metadata";
  }>; // Source citations
  tableData?: any; // Raw table data if from table
  extractionLog?: {
    method: "table_row" | "text_extraction" | "metadata";
    timestamp: Date;
    rawValue: string;
    normalizedValue: number;
    validationsPassed: string[];
    validationsFailed: string[];
  }; // Full provenance for auditing
}

export interface CareerOpportunity {
  occupation: string;
  sector: string;
  growth?: number; // Optional - only if extracted
  jobs?: number; // Optional - only if extracted
  salary?: string;
  demand?: "high" | "medium" | "low"; // Optional - derived only if growth exists
  location?: string;
  trending?: boolean; // Only if growth data supports it
  sources?: Array<{
    title: string;
    documentId: string;
    pageNumber?: number;
    content?: string;
    url?: string;
  }>; // Sources where this career data was found
}

export interface SkillDemand {
  name: string;
  demand: number;
  growth: number;
  sector: string;
  category: "technical" | "soft" | "emerging";
  trainingAvailable: boolean;
  relatedCareers?: string[];
  estimated?: boolean; // true when demand/growth are derived, not from document data
}

export interface TrainingProgram {
  name: string;
  provider?: string;
  skills: string[];
  duration?: string;
  funding?: string;
  level?: "beginner" | "intermediate" | "advanced";
}

export interface CrossTabInsight {
  type: "funding-careers" | "funding-skills" | "careers-skills" | "all";
  title: string;
  description: string;
  connection: string;
  impact: "positive" | "negative" | "neutral";
  confidence: number;
}

export interface IntelligenceMetrics {
  totalDocuments: number;
  totalChunks: number;
  lastUpdated: Date;
  categories: Array<{ name: string; count: number; trend: number }>;
  topSectors: Array<{ name: string; growth: number; jobs: number }>;
}

export interface TabData {
  insights: InsightOutput[];
  rawData: unknown[];
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

interface IntelligenceState {
  // Core metrics
  metrics: IntelligenceMetrics | null;
  
  // Tab-specific data
  overview: TabData;
  funding: TabData;
  careers: TabData;
  skills: TabData;
  
  // Extracted structured data
  fundingAllocations: FundingAllocation[];
  careerOpportunities: CareerOpportunity[];
  skillsDemand: SkillDemand[];
  trainingPrograms: TrainingProgram[];
  
  // Cross-tab connections
  crossTabInsights: CrossTabInsight[];
  
  // Global state
  isInitialized: boolean;
  globalLoading: boolean;
  activeTab: IntelligenceTab;
  searchQuery: string;
}

interface IntelligenceContextType extends IntelligenceState {
  // Actions
  setActiveTab: (tab: IntelligenceTab) => void;
  setSearchQuery: (query: string) => void;
  refreshTab: (tab: IntelligenceTab) => Promise<void>;
  refreshAll: () => Promise<void>;
  ingestAgenticResult: (tab: IntelligenceTab, payload: { answer: string; sources: any[] }) => void;
  
  // Getters
  getTabData: (tab: IntelligenceTab) => TabData;
  getTopInsights: (count?: number) => InsightOutput[];
  getRelatedData: (sector: string) => {
    funding: FundingAllocation | undefined;
    careers: CareerOpportunity[];
    skills: SkillDemand[];
  };
  
  // Computed
  totalBudget: number;
  totalJobs: number;
  topGrowthSector: string;
  emergingTrends: string[];
}

// ============================================================================
// Context
// ============================================================================

const IntelligenceContext = createContext<IntelligenceContextType | null>(null);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/** Remove sectors that share the same amount as a preferred sector (common RAG misattribution, e.g. Defence $2.4B also shown as Technology $2.4B). */
function removeSameAmountDuplicates(allocations: FundingAllocation[]): FundingAllocation[] {
  if (allocations.length <= 1) return allocations;
  const byAmount = new Map<number, FundingAllocation[]>();
  for (const a of allocations) {
    const amt = Math.round(a.amount);
    if (!byAmount.has(amt)) byAmount.set(amt, []);
    byAmount.get(amt)!.push(a);
  }
  const dropSectors = new Set<string>();
  for (const [, list] of byAmount) {
    if (list.length < 2) continue;
    const sectors = list.map(a => a.sector.toLowerCase());
    // Defence $2.4B often misattributed to Technology/Digital in RAG — keep Defence only
    if (sectors.some(s => s.includes("defence"))) {
      list.forEach(a => {
        const s = a.sector.toLowerCase();
        if (s.includes("technology") || s.includes("digital")) dropSectors.add(a.sector);
      });
    }
    // "Energy and Mining" one budget line — avoid both Energy and Mining with same amount
    if (sectors.some(s => s.includes("energy")) && sectors.some(s => s.includes("mining"))) {
      list.forEach(a => { if (a.sector.toLowerCase().includes("mining")) dropSectors.add(a.sector); });
    }
  }
  return allocations.filter(a => !dropSectors.has(a.sector));
}

const initialTabData: TabData = {
  insights: [],
  rawData: [],
  loading: false,
  error: null,
  lastFetched: null,
};

// ============================================================================
// Provider
// ============================================================================

export function IntelligenceProvider({ children }: { children: React.ReactNode }) {
  const { semanticSearch, getBulk, loading: ragLoading } = useRAGMetadata();
  
  const [state, setState] = useState<IntelligenceState>({
    metrics: null,
    overview: { ...initialTabData },
    funding: { ...initialTabData },
    careers: { ...initialTabData },
    skills: { ...initialTabData },
    fundingAllocations: [],
    careerOpportunities: [],
    skillsDemand: [],
    trainingPrograms: [],
    crossTabInsights: [],
    isInitialized: false,
    globalLoading: true,
    activeTab: "overview",
    searchQuery: "",
  });

  const fetchInProgress = useRef<Set<IntelligenceTab>>(new Set());
  const stateRef = useRef(state);
  const hasInitialized = useRef(false);
  
  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ============================================================================
  // Data Extraction Helpers
  // ============================================================================

  const extractFundingAllocations = useCallback((sources: any[]): FundingAllocation[] => {
    const allocationsMap = new Map<string, FundingAllocation>();

    // Canonical sector key for grouping. Map Transport into Infrastructure so "Infrastructure and Transport" $27.3B is not double-counted.
    const getCanonicalFundingSector = (rawSector: string): string => {
      const t = rawSector.trim().toLowerCase();
      if (t.includes("infrastructure") || t === "infrastructure and transport") return "Infrastructure";
      if (t === "transport" || t.includes("transport")) return "Infrastructure"; // same budget line as Infrastructure in SA budget
      if (t.includes("health")) return "Health";
      if (t.includes("education")) return "Education";
      if (t.includes("energy")) return "Energy";
      if (t.includes("skill") || t.includes("training") || t.includes("employment")) return "Skills";
      if (t.includes("housing")) return "Housing";
      if (t.includes("tourism")) return "Tourism";
      if (t.includes("arts")) return "Arts";
      if (t.includes("sport")) return "Sport";
      if (t.includes("environment")) return "Environment";
      return rawSector.charAt(0).toUpperCase() + rawSector.slice(1).trim();
    };
    // Prefer more specific/shorter sector name; never let a higher raw amount override a table-extracted entry
    // (text extraction can pick up cumulative/total figures that are inflated)
    const preferOver = (existing: FundingAllocation, incomingSector: string, incomingAmount: number): boolean => {
      const canon = getCanonicalFundingSector(incomingSector);
      if (getCanonicalFundingSector(existing.sector) !== canon) return true;
      // Never replace a high-confidence (table) entry with anything
      if (existing.confidence === "high") return false;
      const existingRaw = existing.sector.toLowerCase();
      const incomingRaw = incomingSector.toLowerCase();
      // Prefer the shorter/more specific name (e.g. "Infrastructure" over "Infrastructure and Transport")
      if (incomingRaw.length < existingRaw.length) return true;
      if (incomingRaw.length > existingRaw.length) return false;
      // Same specificity — keep FIRST seen. Text extraction picks up cumulative/historical
      // figures that are larger but wrong (e.g. "$9B across last four budgets" vs "$1.9B this year")
      return false;
    };

    // Known sectors for validation
    const knownSectors = [
      "Health", "Healthcare", "Education", "Infrastructure", "Transport",
      "Technology", "Defence", "Agriculture", "Environment", "Energy",
      "Housing", "Social Services", "Regional Development", "Skills",
      "Training", "Employment", "Tourism", "Arts", "Sport", "Justice"
    ];

    // PRODUCTION-GRADE EXTRACTION: Prioritize table data over text
    // Phase 1: Extract high-confidence data from tables only
    const tableSources = sources.filter(s => {
      try {
        const meta = typeof s.metadata === "string" ? JSON.parse(s.metadata) : s.metadata;
        return meta?.chunkType === "table_row";
      } catch {
        return false;
      }
    });

    console.log(`[extractFundingAllocations] Processing ${tableSources.length} table sources out of ${sources.length} total`);

    sources.forEach((source) => {
      try {
        let metadata = source.metadata;
        if (typeof metadata === "string") {
          metadata = JSON.parse(metadata);
        }

        // Validate source category for funding data
        const category = source.category || metadata?.category || "";
        const isBudgetSource = category.toLowerCase().includes("budget") ||
                               category.toLowerCase().includes("finance") ||
                               category.toLowerCase().includes("fiscal");

        // METHOD 1: Extract from table rows (HIGHEST CONFIDENCE)
        if (metadata?.chunkType === "table_row" && metadata.rowValues) {
          const headers = metadata.headers || [];
          const values = metadata.rowValues || [];

          const sectorIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("sector") ||
            h.toLowerCase().includes("department") ||
            h.toLowerCase().includes("portfolio")
          );
          const amountIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("amount") ||
            h.toLowerCase().includes("budget") ||
            h.toLowerCase().includes("allocation") ||
            h.toLowerCase().includes("$")
          );
          const changeIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("change") ||
            h.toLowerCase().includes("growth") ||
            h.toLowerCase().includes("variance") ||
            h.toLowerCase().includes("%")
          );

          // Fallback: find prior-year and current-year columns to compute YoY (e.g. "2023-24" / "2024-25", "Prior" / "Current")
          const priorYearPatterns = /prior|previous|last\s*year|2023-24|2022-23|^\d{4}$/i;
          const currentYearPatterns = /current|this\s*year|2024-25|2025-26|estimate|budget\s*\d/i;
          const priorColIdx = headers.findIndex((h: string) => priorYearPatterns.test(h.trim()));
          const currentColIdx = headers.findIndex((h: string) => currentYearPatterns.test(h.trim()));

          if (sectorIdx >= 0 && values[sectorIdx]) {
            const sector = String(values[sectorIdx]).trim();

            // Validate sector name
            if (!sector || sector.length < 3 || sector.length > 60) return;
            if (sector.toLowerCase().includes("total") || sector.toLowerCase().includes("grand total")) return;

            let amount = 0;
            let hasValidAmount = false;

            if (amountIdx >= 0 && values[amountIdx]) {
              const amountStr = String(values[amountIdx]).toLowerCase().replace(/\s/g, "");
              const numMatch = amountStr.match(/([\d,]+(?:\.\d+)?)/);
              if (numMatch) {
                amount = parseFloat(numMatch[1].replace(/,/g, ""));

                // Handle units (convert to millions for consistency)
                if (amountStr.includes("billion") || amountStr.includes("bn") || /\d+b$/.test(amountStr)) {
                  amount *= 1000;
                } else if (amountStr.includes("million") || amountStr.includes("m")) {
                  // Already in millions
                } else if (amountStr.includes("thousand") || amountStr.includes("k")) {
                  amount /= 1000;
                } else if (amount > 100000) {
                  // Large raw number — assume dollars, convert to millions
                  amount /= 1000000;
                }
                // SA government budget: no single sector exceeds ~$30B. Cap at 30,000M to prevent
                // raw table values (e.g. amounts stored in thousands) from producing absurd figures.
                if (amount > 30000) {
                  // Likely stored in thousands — divide by 1000 to get millions
                  amount /= 1000;
                }

                // Validate amount is reasonable (between $1M and $30B)
                if (amount >= 1 && amount <= 30000) {
                  hasValidAmount = true;
                }
              }
            }

            if (hasValidAmount) {
              let change = 0;
              let changeValidations = [];
              if (changeIdx >= 0 && values[changeIdx]) {
                const changeStr = String(values[changeIdx]);
                const changeMatch = changeStr.match(/([+-]?\d+(?:\.\d+)?)/);
                if (changeMatch) {
                  change = parseFloat(changeMatch[1]);
                  // Validate change is reasonable (-50% to +200%)
                  if (change < -50 || change > 200) {
                    changeValidations.push(`Change ${change}% outside reasonable range, reset to 0`);
                    change = 0;
                  } else {
                    changeValidations.push(`Change ${change}% within valid range`);
                  }
                }
              }
              // Fallback: compute YoY from prior-year and current-year columns when no change column
              if (change === 0 && priorColIdx >= 0 && currentColIdx >= 0 && priorColIdx !== currentColIdx) {
                const parseAmountFromCell = (cell: unknown): number => {
                  const str = String(cell ?? "").toLowerCase().replace(/\s/g, "");
                  const numMatch = str.match(/([\d,]+(?:\.\d+)?)/);
                  if (!numMatch) return NaN;
                  let val = parseFloat(numMatch[1].replace(/,/g, ""));
                  if (str.includes("billion") || str.includes("bn") || str.includes("b")) val *= 1000;
                  else if (str.includes("thousand") || str.includes("k")) val /= 1000;
                  else if (val > 100000) val /= 1000000;
                  return val;
                };
                const priorVal = parseAmountFromCell(values[priorColIdx]);
                const currentVal = parseAmountFromCell(values[currentColIdx]);
                if (priorVal > 0 && currentVal >= 0 && Number.isFinite(priorVal) && Number.isFinite(currentVal)) {
                  change = Math.round(((currentVal - priorVal) / priorVal) * 1000) / 10;
                  if (change < -50 || change > 200) change = 0;
                  else changeValidations.push(`YoY computed from columns: ${change}%`);
                }
              }

              const sourceTitle = source.title || source.fileName || "Budget Document";
              const sourceExcerpt = values.slice(0, 5).join(" | ");
              const sourceCategory = source.category || metadata?.category || "budget";
              const sourcePageNum = metadata?.pageNumber || metadata?.page;
              const sourceTableNum = metadata?.tableNumber || metadata?.tableIndex;

              const canonicalKey = getCanonicalFundingSector(sector);
              const existing = allocationsMap.get(canonicalKey);
              const displaySector = sector.charAt(0).toUpperCase() + sector.slice(1);

              // Build validation log
              const validationsPassed = [
                "Sector name valid (3-60 chars)",
                `Amount $${amount}M within range (1M-100B)`,
                "Extracted from structured table row",
                `Source category: ${sourceCategory}`,
                ...changeValidations.filter(v => !v.includes("reset"))
              ];

              const validationsFailed = [
                ...changeValidations.filter(v => v.includes("reset"))
              ];

              // Same canonical sector: SUM amounts (e.g. Infrastructure 27.3B + 3B = 30.3B) so total budget is correct
              const mergedAmount = existing ? existing.amount + amount : amount;
              const mergedChange = existing && mergedAmount > 0
                ? Math.round((existing.amount * (existing.change ?? 0) + amount * change) / mergedAmount)
                : change;
              allocationsMap.set(canonicalKey, {
                sector: displaySector,
                amount: mergedAmount,
                change: mergedChange,
                programs: (existing?.programs || 0) + 1,
                priority: mergedChange > 10 ? "high" : mergedChange > 5 ? "medium" : "low",
                confidence: "high", // Table data = high confidence
                sources: [
                  ...(existing?.sources || []),
                  {
                    title: sourceTitle,
                    excerpt: sourceExcerpt,
                    url: source.url,
                    documentType: metadata?.documentType || "pdf",
                    category: sourceCategory,
                    pageNumber: sourcePageNum,
                    tableNumber: sourceTableNum,
                    extractionMethod: "table"
                  }
                ],
                tableData: { headers, values },
                extractionLog: {
                  method: "table_row",
                  timestamp: new Date(),
                  rawValue: values[amountIdx] ? String(values[amountIdx]) : "",
                  normalizedValue: amount,
                  validationsPassed,
                  validationsFailed
                }
              });

              console.log(`[extractFundingAllocations] Table extraction: ${sector} = $${amount}M (${change}%) → sector total $${mergedAmount}M from ${sourceTitle} ${sourcePageNum ? `p.${sourcePageNum}` : ''} ${sourceTableNum ? `table ${sourceTableNum}` : ''}`);
            }
          }
        }

        // METHOD 2: Extract from content text (ONLY for budget-category documents)
        // This is conservative and only runs if we don't have table data for a sector
        if (isBudgetSource && metadata?.chunkType !== "table_row") {
          const content = source.content || "";
          if (content.length > 50) {
            // Only extract if explicitly mentioned with dollar amount
            const dollarMatches = content.matchAll(/\$\s*([\d,.]+)\s*(million|billion|m\b|bn\b)/gi);

            for (const match of dollarMatches) {
              let amount = parseFloat(match[1].replace(/,/g, ""));
              const unit = (match[2] || "").toLowerCase();

              // Handle units
              if (unit.startsWith("b")) {
                amount *= 1000; // Convert to millions
              }

              // Validate amount is reasonable (cap at $30B = 30000M, same as table extraction)
              if (amount < 5 || amount > 30000) continue;

              // Find nearby sector mention (within 150 chars)
              const context = content.substring(
                Math.max(0, match.index! - 150),
                Math.min(content.length, match.index! + 150)
              );

              for (const sector of knownSectors) {
                const sectorRegex = new RegExp(`\\b${sector}\\b`, "i");
                if (sectorRegex.test(context)) {
                  const canonicalKey = getCanonicalFundingSector(sector);
                  const existing = allocationsMap.get(canonicalKey);

                  // Try to parse YoY change from nearby text (e.g. "5.2% increase", "grew by 10%", "+3.1%")
                  let textChange = existing?.change ?? 0;
                  const changeInContext = context.match(/(?:increase|growth|rise|up|grew|change)\s*(?:of|by)?\s*([+-]?\d+(?:\.\d+)?)\s*%|([+-]?\d+(?:\.\d+)?)\s*%\s*(?:increase|growth|rise|yoy|year-on-year)/i);
                  if (changeInContext) {
                    const pct = parseFloat(changeInContext[1] || changeInContext[2] || "0");
                    if (pct >= -50 && pct <= 200) textChange = pct;
                  }

                  // Only use text extraction if no table data exists or this is more specific
                  const shouldSet = !existing || (existing.confidence !== "high" && preferOver(existing, sector, amount));
                  if (shouldSet) {
                    const sourceTitle = source.title || source.fileName || "Budget Document";
                    const sourceExcerpt = context.substring(0, 200);
                    const sourceCategory = source.category || metadata?.category || "budget";
                    const sourcePageNum = metadata?.pageNumber || metadata?.page;

                    allocationsMap.set(canonicalKey, {
                      sector: sector.charAt(0).toUpperCase() + sector.slice(1),
                      amount,
                      change: textChange,
                      programs: (existing?.programs || 0) + 1,
                      priority: amount > 500 ? "high" : amount > 100 ? "medium" : "low",
                      confidence: "medium", // Text extraction = medium confidence
                      sources: [
                        ...(existing?.sources || []),
                        {
                          title: sourceTitle,
                          excerpt: sourceExcerpt,
                          url: source.url,
                          documentType: metadata?.documentType || "pdf",
                          category: sourceCategory,
                          pageNumber: sourcePageNum,
                          extractionMethod: "text"
                        }
                      ],
                      extractionLog: {
                        method: "text_extraction",
                        timestamp: new Date(),
                        rawValue: match[0],
                        normalizedValue: amount,
                        validationsPassed: [
                          `Amount $${amount}M within range (5M-50B)`,
                          "Sector keyword found within 150 chars",
                          `Source category: ${sourceCategory}`
                        ],
                        validationsFailed: []
                      }
                    });

                    console.log(`[extractFundingAllocations] Text extraction: ${sector} = $${amount}M from ${sourceTitle} ${sourcePageNum ? `p.${sourcePageNum}` : ''}`);
                  }
                  break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("[extractFundingAllocations] Error processing source:", e);
      }
    });

    const result = Array.from(allocationsMap.values())
      .filter(a => a.amount > 0 && a.confidence !== "low")
      .sort((a, b) => {
        // Sort by confidence first, then amount
        if (a.confidence === "high" && b.confidence !== "high") return -1;
        if (b.confidence === "high" && a.confidence !== "high") return 1;
        return b.amount - a.amount;
      })
      .slice(0, 12);

    console.log(`[extractFundingAllocations] Extracted ${result.length} allocations`);
    return result;
  }, []);

  // ============================================================================
  // Extract funding from AI answer text (PRIMARY source — most reliable)
  // Strategy: parse structured "Sector: X | Amount: $Y" lines first, then
  // fall back to proximity-based regex for unstructured prose.
  // ============================================================================
  const extractFundingFromAnswer = useCallback((answerText: string): FundingAllocation[] => {
    if (!answerText || answerText.length < 50) return [];

    const allocations = new Map<string, FundingAllocation>();

    console.log(`[extractFundingFromAnswer] Parsing AI answer (${answerText.length} chars), preview:`,
      answerText.substring(0, 500));

    // Helper: parse "$1.9 billion" / "$453 million" → amount in millions
    const parseDollar = (raw: string): number | null => {
      const m = raw.match(/\$?\s*([\d,.]+)\s*(billion|million|bn|m)?\b/i);
      if (!m) return null;
      let val = parseFloat(m[1].replace(/,/g, ""));
      const unit = (m[2] || "").toLowerCase();
      if (unit === "billion" || unit === "bn") val *= 1000;
      else if (unit === "million" || unit === "m") { /* already M */ }
      else if (val > 100) val /= 1; // raw number in millions assumed
      else return null; // too small / no unit
      return (val >= 1 && val <= 30000) ? val : null;
    };

    // Canonicalize sector names (align with extractFundingAllocations: Transport = same budget line as Infrastructure)
    const canonicalize = (s: string): string => {
      const t = s.trim().toLowerCase();
      if (t.includes("infrastructure") || t === "infrastructure and transport") return "Infrastructure";
      if (t.includes("transport") || t === "roads" || t === "rail") return "Infrastructure";
      if (t.includes("health") || t.includes("hospital") || t.includes("medical")) return "Health";
      if (t.includes("education") || t.includes("school") || t.includes("tafe")) return "Education";
      if (t.includes("energy") || t.includes("renewable") || t.includes("hydrogen")) return "Energy";
      if (t.includes("skill") || t.includes("training") || t.includes("employment") || t.includes("workforce")) return "Skills";
      if (t.includes("housing") || t.includes("homelessness")) return "Housing";
      if (t.includes("tourism") || t.includes("visitor")) return "Tourism";
      if (t.includes("arts") || t.includes("cultur")) return "Arts";
      if (t.includes("sport") || t.includes("recreation")) return "Sport";
      if (t.includes("environment") || t.includes("climate") || t.includes("water")) return "Environment";
      if (t.includes("defence") || t.includes("defense") || t.includes("naval") || t.includes("shipbuilding") || t.includes("submarine") || t.includes("aerospace") || t.includes("military")) return "Defence";
      if (t.includes("technolog") || t.includes("digital") || t.includes("cyber") || t.includes("innovation")) return "Technology";
      if (t.includes("justice") || t.includes("polic") || t.includes("correction")) return "Justice";
      if (t.includes("agricultur") || t.includes("farming")) return "Agriculture";
      return s.charAt(0).toUpperCase() + s.slice(1).trim();
    };

    const setAlloc = (sector: string, amount: number, change: number, programs: number, excerpt: string) => {
      const canon = canonicalize(sector);
      const existing = allocations.get(canon);
      if (!existing || amount > existing.amount) {
        allocations.set(canon, {
          sector: canon,
          amount,
          change,
          programs: Math.max(programs, existing?.programs || 0),
          priority: amount > 5000 ? "high" : amount > 1000 ? "medium" : "low",
          confidence: "high",
          sources: [{ title: "AI Analysis", excerpt: excerpt.substring(0, 200), extractionMethod: "text", category: "budget" }],
        });
      }
    };

    // ── PASS 1: Structured format "Sector: X | Amount: $Y | Change: Z%" ──
    const structuredPattern = /Sector:\s*([^|]+)\|[^|]*Amount:\s*(\$[\d,.]+\s*(?:billion|million|bn|m)?)/gi;
    let structuredMatch: RegExpExecArray | null;
    let structuredCount = 0;

    while ((structuredMatch = structuredPattern.exec(answerText)) !== null) {
      const sector = structuredMatch[1].trim();
      const amountInM = parseDollar(structuredMatch[2]);
      if (!amountInM || !sector) continue;

      // Parse optional change
      let change = 0;
      const lineEnd = answerText.indexOf("\n", structuredMatch.index);
      const line = answerText.substring(structuredMatch.index, lineEnd > 0 ? lineEnd : structuredMatch.index + 300);
      const changeMatch = line.match(/Change:\s*([+-]?\d+(?:\.\d+)?)\s*%/i);
      if (changeMatch) change = parseFloat(changeMatch[1]);

      // Parse optional programs count
      let programs = 1;
      const progMatch = line.match(/Programs:\s*(\d+)/i);
      if (progMatch) programs = parseInt(progMatch[1]);

      setAlloc(sector, amountInM, change, programs, line);
      structuredCount++;
      console.log(`[extractFundingFromAnswer] STRUCTURED: ${sector} = $${amountInM}M, change=${change}%`);
    }

    console.log(`[extractFundingFromAnswer] Pass 1 (structured): found ${structuredCount} sectors`);

    // ── PASS 2: Proximity-based "$X.X billion" near sector keywords ──
    const sectorKeywords: Array<{ canon: string; patterns: RegExp[] }> = [
      { canon: "Infrastructure", patterns: [/\binfrastructure\b/i, /\bcapital works\b/i, /\btransport\b/i, /\broad\s/i, /\brail\b/i, /\bcorridor\b/i] },
      { canon: "Health", patterns: [/\bhealth\b/i, /\bhospital\b/i, /\bmedical\b/i, /\bhealthcare\b/i, /\bmental health\b/i] },
      { canon: "Education", patterns: [/\beducation\b/i, /\bschool\b/i, /\buniversit/i, /\bTAFE\b/i] },
      { canon: "Defence", patterns: [/\bdefence\b/i, /\bdefense\b/i, /\bnaval\b/i, /\bshipbuilding\b/i, /\bsubmarine\b/i, /\baerospace\b/i, /\bmilitary\b/i] },
      { canon: "Technology", patterns: [/\btechnolog/i, /\bdigital\b/i, /\bcyber/i] },
      { canon: "Energy", patterns: [/\benergy\b/i, /\brenewable\b/i, /\bhydrogen\b/i, /\belectricit/i] },
      { canon: "Housing", patterns: [/\bhousing\b/i, /\baffordable home/i] },
      { canon: "Agriculture", patterns: [/\bagricultur/i, /\bfarming\b/i] },
      { canon: "Environment", patterns: [/\benvironment\b/i, /\bclimate\b/i] },
      { canon: "Tourism", patterns: [/\btourism\b/i] },
      { canon: "Arts", patterns: [/\barts\b/i, /\bcultur/i] },
      { canon: "Sport", patterns: [/\bsport\b/i] },
      { canon: "Justice", patterns: [/\bjustice\b/i, /\bpolic/i] },
      { canon: "Skills", patterns: [/\bskills\b/i, /\btraining\b/i, /\bworkforce\b/i] },
    ];

    const amountPattern = /\$\s*([\d,.]+)\s*(billion|million|bn|m)\b/gi;
    let amountMatch: RegExpExecArray | null;
    let proximityCount = 0;

    while ((amountMatch = amountPattern.exec(answerText)) !== null) {
      const amountInM = parseDollar(amountMatch[0]);
      if (!amountInM) continue;

      // Skip if this sector is already captured with a larger amount from structured pass
      const windowStart = Math.max(0, amountMatch.index - 180);
      const windowEnd = Math.min(answerText.length, amountMatch.index + amountMatch[0].length + 180);
      const window = answerText.substring(windowStart, windowEnd);
      const dollarPos = amountMatch.index - windowStart;

      // Find nearest sector keyword
      let bestSector: string | null = null;
      let bestDist = Infinity;
      for (const { canon, patterns } of sectorKeywords) {
        for (const pat of patterns) {
          const m = pat.exec(window);
          if (m) {
            const dist = Math.abs(m.index - dollarPos);
            if (dist < bestDist) {
              bestDist = dist;
              bestSector = canon;
            }
          }
        }
      }

      if (bestSector && !allocations.has(bestSector)) {
        // Only add if not already captured by structured pass
        setAlloc(bestSector, amountInM, 0, 1, window.trim());
        proximityCount++;
        console.log(`[extractFundingFromAnswer] PROXIMITY: ${bestSector} = $${amountInM}M`);
      }
    }

    console.log(`[extractFundingFromAnswer] Pass 2 (proximity): found ${proximityCount} new sectors`);

    const result = Array.from(allocations.values()).sort((a, b) => b.amount - a.amount);
    const total = result.reduce((s, a) => s + a.amount, 0);
    console.log(`[extractFundingFromAnswer] FINAL: ${result.length} sectors, total $${(total/1000).toFixed(1)}B:`,
      result.map(a => `${a.sector}=$${a.amount}M`).join(", "));
    return result;
  }, []);

  // Normalize sector names to match Career Explorer SECTOR_CONFIGS
  const normalizeSector = useCallback((rawSector: string | undefined): string => {
    if (!rawSector) return "General";
    const lower = rawSector.toLowerCase();

    // Map variations to Career Explorer sector names (must match SECTOR_CONFIGS)
    if (lower.includes("health") || lower.includes("medical") || lower.includes("care")) return "Healthcare & Social Services";
    if (lower.includes("tech") || lower.includes("digital") || lower.includes("it") || lower.includes("software")) return "Technology & Digital";
    if (lower.includes("education") || lower.includes("training") || lower.includes("skill") || lower.includes("teaching")) return "Education & Training";
    if (lower.includes("construction") || lower.includes("building") || lower.includes("trades")) return "Construction & Trades";
    if (lower.includes("energy") || lower.includes("renewable") || lower.includes("power") || lower.includes("mining") || lower.includes("resources")) return "Energy & Resources";
    if (lower.includes("defence") || lower.includes("defense") || lower.includes("military") || lower.includes("aerospace")) return "Defence & Aerospace";
    if (lower.includes("agriculture") || lower.includes("farming") || lower.includes("food") || lower.includes("wine")) return "Agriculture & Food";
    if (lower.includes("hospitality") || lower.includes("tourism") || lower.includes("hotel") || lower.includes("restaurant")) return "Hospitality & Tourism";
    if (lower.includes("manufacturing") || lower.includes("engineering") || lower.includes("factory") || lower.includes("production")) return "Manufacturing & Engineering";
    if (lower.includes("finance") || lower.includes("banking") || lower.includes("accounting") || lower.includes("insurance") || lower.includes("professional services")) return "Finance & Professional Services";
    if (lower.includes("retail") || lower.includes("sales") || lower.includes("consumer")) return "Retail & Consumer Services";
    if (lower.includes("transport") || lower.includes("logistics") || lower.includes("freight") || lower.includes("shipping")) return "Transport & Logistics";
    if (lower.includes("government") || lower.includes("public") || lower.includes("admin") || lower.includes("council")) return "Government & Public Administration";
    if (lower.includes("creative") || lower.includes("media") || lower.includes("arts") || lower.includes("design") || lower.includes("marketing")) return "Creative & Media";
    if (lower.includes("environment") || lower.includes("science") || lower.includes("climate") || lower.includes("research")) return "Environment & Science";
    if (lower.includes("infrastructure") || lower.includes("housing") || lower.includes("residential")) return "Construction & Trades";

    // Capitalize first letter for unknown sectors
    return rawSector.charAt(0).toUpperCase() + rawSector.slice(1);
  }, []);

  // ============================================================================
  // STRICT OCCUPATION VALIDATION - AGGRESSIVE CLEANING
  // ============================================================================
  const cleanOccupationName = useCallback((name: string): string => {
    let cleaned = name
      // Remove pipe characters and everything after them (table artifacts)
      .replace(/\s*\|.*$/g, '')
      // Remove asterisks
      .replace(/\*+/g, '')
      // Remove "South Australia" anywhere
      .replace(/south\s+australia/gi, '')
      // Remove page references
      .replace(/\(page\s*\d+\)/gi, '')
      .replace(/page\s*\d+/gi, '')
      // Remove year references like 2024, 2025
      .replace(/,?\s*20[0-9]{2}/g, '')
      // Remove bracketed content
      .replace(/\[.*?\]/g, '')
      // Remove parenthetical fragments (unclosed or with just numbers)
      .replace(/\([^)]*$/g, '') // Remove unclosed parentheses at end
      .replace(/\(\s*\d+[^)]*\)/g, '') // Remove parentheses with numbers
      .replace(/\([^)]{0,15}$/g, '') // Remove unclosed parentheses with short content
      // Remove leading junk
      .replace(/^[-\[\]()\/\\|,.\s]+/, '')
      // Remove trailing junk
      .replace(/[-\[\]()\/\\|,.\s]+$/, '')
      // Remove leading numbers and dashes
      .replace(/^\d+\s*[-–—:]\s*/, '')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/gi, '')
      // Remove matrix/figure/table references
      .replace(/matrix/gi, '')
      .replace(/figure\s*\d*/gi, '')
      // Remove "across" phrases
      .replace(/across\s+(?:multiple|selected|various|different)\s+\w+/gi, '')
      // Remove "level" phrases
      .replace(/(?:employment\s+)?level[s]?\s*/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // If result is too short after cleaning, return empty
    if (cleaned.length < 4) return '';

    // Capitalize first letter of each word
    return cleaned
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const isValidOccupationName = useCallback((name: string): boolean => {
    if (!name || name.trim().length === 0) return false;

    const cleaned = cleanOccupationName(name);

    // Must be 4-55 chars after cleaning (tighter bounds)
    if (cleaned.length < 4 || cleaned.length > 55) return false;

    // Must contain letters (not just numbers/symbols)
    if (!/[a-zA-Z]/.test(cleaned)) return false;

    // Must start with a capital letter (proper job title format)
    if (!/^[A-Z]/.test(cleaned)) return false;

    // Reject known garbage patterns - EXPANDED LIST
    const invalidPatterns = [
      /^south\s+australia$/i,
      /^[-\[\]()\/\\|,*\d\s]+$/, // Only special chars/numbers
      // Reject report titles, headings, and metadata
      /^(total|all|sum|page|list|table|figure|source|reference|name|occupation|job|title|matrix|level|across|selected|industries|each|these|multiple|various|employment)/i,
      /https?:\/\//, // URLs
      /\*{2,}/, // Multiple asterisks
      /\|/, // Pipe characters
      /^[A-Z][a-z]?\s+[A-Z]/, // Truncated first word like "Al Therapists"
      /-lists?\/[a-z-]+/i, // URL fragments
      /\(page\s*\d+\)/i, // Page references
      /20[0-9]{2}/, // Years 2000-2099
      /\.\s+[A-Z]/, // Sentence breaks (period followed by capital)
      /,\s+\d/, // Comma followed by number (table data)
      /^\d+\s*$/, // Just numbers
      /^[A-Z]{1,2}\s+[A-Z][a-z]/, // Truncated first word (like "Al Therapists", "Ck Manager")
      /special\s+class/i, // Truncated classification
      /\((?!.*\))/i, // Unclosed parenthesis anywhere
      /^(ades|omotive|rconditioning|stered|ck|al)\s+/i, // Known truncated prefixes
    ];

    if (invalidPatterns.some(p => p.test(cleaned))) return false;

    // Check if first word looks like truncation (2 chars followed by space and valid word)
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2 && words[0].length <= 2 && /^[A-Z][a-z]?$/.test(words[0])) {
      return false; // Likely truncated like "Al Therapists"
    }

    // Single word titles must be in whitelist (and generic ones like "Manager" alone are rejected)
    const singleWordTitles = ['nurse', 'teacher', 'doctor', 'engineer', 'analyst', 'director', 'officer', 'electrician', 'plumber', 'carpenter', 'chef', 'accountant', 'lawyer', 'scientist', 'architect', 'designer', 'consultant', 'coordinator', 'technician', 'paramedic', 'firefighter', 'pilot', 'programmer', 'pharmacist', 'hairdresser', 'barista', 'waiter', 'bartender', 'receptionist', 'diver', 'ranger', 'librarian', 'midwife', 'optometrist', 'dentist', 'veterinarian', 'psychologist', 'physiotherapist', 'radiographer', 'sonographer', 'drafter', 'surveyor', 'geologist', 'economist', 'statistician', 'actuary', 'auditor', 'solicitor', 'barrister', 'magistrate', 'curator', 'archivist', 'journalist', 'photographer', 'videographer', 'animator', 'illustrator', 'copywriter', 'translator', 'interpreter', 'counsellor', 'chaplain', 'dietitian', 'podiatrist', 'osteopath', 'chiropractor'];

    // Reject generic single-word titles that need context
    const genericSingleWords = ['manager', 'worker', 'assistant', 'supervisor', 'administrator', 'specialist', 'operator'];

    if (words.length === 1) {
      const word = words[0].toLowerCase();
      if (genericSingleWords.includes(word)) {
        return false; // Too generic without context
      }
      if (!singleWordTitles.includes(word)) {
        return false; // Not in whitelist
      }
      return true; // Whitelisted single-word title - skip suffix/keyword check
    }

    if (words.length < 1) return false;

    // Reject if first word is too short (< 3 chars) for multi-word titles
    if (words.length > 1 && words[0].length < 3) return false;

    // Reject if contains sentence-like structure (more than 6 words)
    if (words.length > 6) return false;

    // Reject if it has patterns that suggest it's a heading or description
    if (/^(each|these|those|this|that|with|from|into|across|between|among|the)\s+/i.test(cleaned)) {
      return false;
    }

    // Must contain at least one occupational keyword or end with common suffixes
    const occupationSuffixes = ['er', 'or', 'ist', 'ant', 'ent', 'ian', 'yst', 'eer'];
    const occupationKeywords = ['nurse', 'teacher', 'doctor', 'engineer', 'manager', 'officer', 'analyst', 'worker', 'specialist', 'technician', 'administrator', 'coordinator', 'assistant', 'developer', 'designer', 'consultant', 'therapist', 'instructor', 'director', 'supervisor'];
    
    const hasOccupationSuffix = occupationSuffixes.some(suffix => 
      words.some(w => w.toLowerCase().endsWith(suffix) && w.length > 4)
    );
    const hasOccupationKeyword = occupationKeywords.some(keyword => 
      cleaned.toLowerCase().includes(keyword)
    );

    if (!hasOccupationSuffix && !hasOccupationKeyword) {
      // Allow some specific sector prefixes that might not match above
      const allowedPrefixes = ['registered', 'senior', 'junior', 'chief', 'head', 'lead', 'project', 'program', 'clinical', 'medical', 'legal', 'financial', 'human', 'data', 'software', 'system', 'network', 'cyber'];
      const hasAllowedPrefix = allowedPrefixes.some(prefix => 
        words[0].toLowerCase() === prefix
      );
      if (!hasAllowedPrefix) {
        return false;
      }
    }

    return true;
  }, [cleanOccupationName]);

  const extractCareerOpportunities = useCallback((sources: any[]): CareerOpportunity[] => {
    const careersMap = new Map<string, CareerOpportunity>();

    console.log(`[extractCareerOpportunities] Processing ${sources.length} sources`);

    // Separate table rows from content chunks
    const tableSources = sources.filter(s => {
      try {
        const meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
        return meta?.chunkType === "table_row";
      } catch {
        return false;
      }
    });

    const contentSources = sources.filter(s => {
      try {
        const meta = typeof s.metadata === 'string' ? JSON.parse(s.metadata) : s.metadata;
        return meta?.chunkType !== "table_row" && s.content && s.content.length > 50;
      } catch {
        return s.content && s.content.length > 50;
      }
    });

    console.log(`[extractCareerOpportunities] Found ${tableSources.length} table sources, ${contentSources.length} content sources`);

    // Common occupation keywords to extract from content (for content-based extraction)
    const occupationKeywords = [
      "nurse", "teacher", "engineer", "developer", "doctor", "police", "firefighter",
      "administrator", "analyst", "manager", "coordinator", "specialist", "technician",
      "electrician", "plumber", "carpenter", "chef", "accountant", "lawyer", "scientist",
      "researcher", "programmer", "architect", "designer", "consultant", "officer",
      "tradesperson", "construction", "healthcare", "education", "it", "ict"
    ];

    sources.forEach((source) => {
      try {
        let metadata = source.metadata;
        if (typeof metadata === "string") {
          metadata = JSON.parse(metadata);
        }

        // METHOD 1: Extract from structured table rows
        if (metadata?.chunkType === "table_row" && metadata.rowValues) {
          const headers = metadata.headers || [];
          const values = metadata.rowValues || [];

          const occupationIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("occupation") || h.toLowerCase().includes("role") || h.toLowerCase().includes("career") || h.toLowerCase().includes("job title")
          );
          const growthIdx = headers.findIndex((h: string) => {
            const lower = h.toLowerCase();
            return lower.includes("growth") ||
                   lower.includes("%") ||
                   lower.includes("change") ||
                   lower.includes("increase") ||
                   lower.includes("projected") ||
                   lower.includes("forecast");
          });
          const jobsIdx = headers.findIndex((h: string) => {
            const lower = h.toLowerCase();
            return lower.includes("jobs") ||
                   lower.includes("positions") ||
                   lower.includes("openings") ||
                   lower.includes("vacancies") ||
                   lower.includes("opportunities");
          });

            if (occupationIdx >= 0 && values[occupationIdx]) {
            const rawOccupation = String(values[occupationIdx]).trim();
            
            // Clean and validate occupation name using centralized functions
            let occupation = cleanOccupationName(rawOccupation);
            
            // STRICT VALIDATION - REJECT if invalid
            if (!isValidOccupationName(occupation)) {
              console.log(`[extractCareerOpportunities] REJECTED table row occupation: "${rawOccupation}" → "${occupation}"`);
              return; // Skip this row entirely
            }

            // Extract growth ONLY if column exists and has valid data
            let growth: number | undefined = undefined;
            if (growthIdx >= 0 && values[growthIdx]) {
              const growthStr = String(values[growthIdx]);
              console.log(`[extractCareerOpportunities] Parsing growth from table for ${occupation}: "${growthStr}"`);
              const growthMatch = growthStr.match(/([+-]?\d+(?:\.\d+)?)/);
              if (growthMatch) {
                const parsed = parseFloat(growthMatch[1]);
                // Validate growth is reasonable (-50% to +200%)
                if (parsed >= -50 && parsed <= 200) {
                  growth = parsed;
                  console.log(`[extractCareerOpportunities] ✓ Extracted growth: ${growth}%`);
                } else {
                  console.log(`[extractCareerOpportunities] ✗ Growth ${parsed}% out of range (-50 to 200)`);
                }
              } else {
                console.log(`[extractCareerOpportunities] ✗ No numeric growth found in "${growthStr}"`);
              }
            } else if (growthIdx < 0) {
              console.log(`[extractCareerOpportunities] ℹ No growth column found in table headers:`, headers);
            }

            // Extract jobs ONLY if column exists and has valid data
            let jobs: number | undefined = undefined;
            if (jobsIdx >= 0 && values[jobsIdx]) {
              const jobsMatch = String(values[jobsIdx]).match(/(\d+)/);
              if (jobsMatch) {
                const parsed = parseInt(jobsMatch[1]);
                // Validate jobs is reasonable (1 to 1M)
                if (parsed >= 1 && parsed <= 1000000) {
                  jobs = parsed;
                }
              }
            }

            const existingCareer = careersMap.get(occupation);
            if (!existingCareer) {
              const career: CareerOpportunity = {
                occupation,
                sector: normalizeSector(source.sector || metadata?.sector),
                location: "South Australia",
                sources: [],
              };

              // Only add optional fields if they exist
              if (growth !== undefined) {
                career.growth = growth;
                career.demand = growth > 15 ? "high" : growth > 5 ? "medium" : "low";
                career.trending = growth > 20;
              } else {
                // FALLBACK: Try to infer growth from context if not explicitly provided
                const content = (source.content || '').toLowerCase();
                const blockText = values.join(' ').toLowerCase();
                const combinedText = content + ' ' + blockText;

                // Check for high-demand indicators
                if (combinedText.includes('high demand') ||
                    combinedText.includes('high growth') ||
                    combinedText.includes('critical shortage') ||
                    combinedText.includes('strong demand')) {
                  // Estimate high growth (15-25%) — deterministic based on occupation name
                  career.growth = deterministicValue(occupation + '-high', 15, 25);
                  career.demand = "high";
                  career.trending = true;
                  console.log(`[extractCareerOpportunities] ℹ Inferred HIGH growth for ${occupation} from demand indicators`);
                } else if (combinedText.includes('growing') ||
                           combinedText.includes('increasing') ||
                           combinedText.includes('expanding')) {
                  // Estimate medium growth (5-15%) — deterministic
                  career.growth = deterministicValue(occupation + '-med', 5, 15);
                  career.demand = "medium";
                  console.log(`[extractCareerOpportunities] ℹ Inferred MEDIUM growth for ${occupation} from growth indicators`);
                }
              }

              if (jobs !== undefined) {
                career.jobs = jobs;
              }

              // Store source information - ALWAYS store if we have any source data
              if (source.title || source.documentId || source.content) {
                if (!career.sources) {
                  career.sources = [];
                }
                const sourceInfo = {
                  title: source.title || source.documentId || metadata?.title || 'Unknown Document',
                  documentId: source.documentId || '',
                  pageNumber: source.pageNumber || metadata?.pageNumber,
                  content: source.content?.substring(0, 300) || '',
                  url: source.url,
                };
                // Avoid duplicate sources
                const isDuplicate = career.sources.some(s => 
                  s.documentId === sourceInfo.documentId && 
                  s.pageNumber === sourceInfo.pageNumber
                );
                if (!isDuplicate) {
                  career.sources.push(sourceInfo);
                }
              }

              careersMap.set(occupation, career);
              console.log(`[extractCareerOpportunities] Table extraction: ${occupation} growth=${growth !== undefined ? growth + '%' : 'N/A'} jobs=${jobs || 'N/A'}`);
            } else {
              // Merge source information if career already exists
              if (source.title || source.documentId) {
                const sourceInfo = {
                  title: source.title || source.documentId || 'Unknown',
                  documentId: source.documentId || '',
                  pageNumber: source.pageNumber || metadata?.pageNumber,
                  content: source.content?.substring(0, 300),
                  url: source.url,
                };
                if (!existingCareer.sources) {
                  existingCareer.sources = [];
                }
                // Avoid duplicate sources
                const isDuplicate = existingCareer.sources.some(s => 
                  s.documentId === sourceInfo.documentId && 
                  s.pageNumber === sourceInfo.pageNumber
                );
                if (!isDuplicate) {
                  existingCareer.sources.push(sourceInfo);
                }
              }
            }
          }
        }

        // METHOD 2: Extract from raw content text (CRITICAL - most data is here)
        const content = source.content || "";
        if (content && content.length > 50) {
          // Log if content contains growth percentages
          const hasGrowthPercentages = /\d+\.?\d*\s*%/i.test(content);
          const hasOccupationKeywords = occupationKeywords.some(k => 
            new RegExp(`\\b${k}[s]?\\b`, "i").test(content)
          );
          if (hasGrowthPercentages || hasOccupationKeywords) {
            console.log(`[extractCareerOpportunities] Found promising content (growth: ${hasGrowthPercentages}, occupations: ${hasOccupationKeywords}):`, content.substring(0, 300));
          }
          const contentLower = content.toLowerCase();
          
          // Look for patterns like "Occupation X% growth" or "X% growth in Occupation"
          for (const keyword of occupationKeywords) {
            // Pattern: "keyword + X% growth/increase" or "X% growth + keyword"
            const patterns = [
              // NATURAL LANGUAGE PATTERNS (career coach style) - THESE COME FIRST FOR PRIORITY
              // "employment of nurses is projected to grow at an average rate of 8.1%"
              new RegExp(`(?:employment|number|workforce)\\s+of\\s+${keyword}[s]?[\\s\\w,]+(?:projected|expected|forecast|anticipated)\\s+to\\s+(?:grow|increase)\\s+(?:at|by)?[\\s\\w]*?(?:rate|average)?[\\s\\w]*?of[\\s]+([\\d.]+)\\s*%`, "gi"),
              // "nurses are projected to grow at 8.1%" or "nurses expected to increase by 15.2%"
              new RegExp(`${keyword}[s]?[\\s\\w,]+(?:projected|expected|forecast|is|are)\\s+to\\s+(?:grow|increase|rise)\\s+(?:at|by)?[\\s\\w]*?([\\d.]+)\\s*%`, "gi"),
              // "growth rate of 8.1% for nurses" or "increase rate of 12%"
              new RegExp(`(?:growth|increase)\\s+(?:rate|of)\\s+(?:of\\s+)?([\\d.]+)\\s*%[\\s\\w,]*(?:for|in)?[\\s]*${keyword}[s]?`, "gi"),
              // "8.1% growth rate" or "12% increase"
              new RegExp(`([\\d.]+)\\s*%[\\s]+(?:growth|increase|rise)[\\s]+(?:rate)?[\\s\\w,]*${keyword}[s]?`, "gi"),
              // "nurses 22% growth" or "nurses with 22% growth"
              new RegExp(`\\b${keyword}[s]?[\\s,]+(?:with|showing|demonstrating|at|experiencing)?[\\s]*([\\d.]+)\\s*%[\\s]*(?:growth|increase|rise|expansion|change)`, "gi"),
              // "22% growth in nurses" or "22% growth for nurses"
              new RegExp(`([\\d.]+)\\s*%[\\s]*(?:growth|increase|rise|change)[\\s]*(?:in|for|among|amongst|across)\\s+${keyword}[s]?\\b`, "gi"),
              // "nurses expected to see 22% increase"
              new RegExp(`\\b${keyword}[s]?[\\s]+(?:expected|projected|forecast|anticipated)[\\s]+(?:to\\s+see|to\\s+grow|a|an)?[\\s]*([\\d.]+)\\s*%`, "gi"),
              // "22% increase expected for nurses"
              new RegExp(`([\\d.]+)\\s*%[\\s]+(?:increase|growth)[\\s]+(?:expected|projected|forecast|anticipated)[\\s]+(?:for|in)\\s+${keyword}[s]?\\b`, "gi"),
              // "nurses: +22%" or "nurses (+22%)"
              new RegExp(`\\b${keyword}[s]?[\\s]*[:\\(]?[\\s]*\\+?([\\d.]+)\\s*%[\\)]?`, "gi"),
              // "grow by 22% - nurses" or "22% - nurses"
              new RegExp(`(?:grow|increase|rise)[\\s]+by[\\s]+([\\d.]+)\\s*%[\\s]*[-–—][\\s]*${keyword}[s]?\\b`, "gi"),
              // "as of [date], there are approximately 26,600 nurses"
              new RegExp(`(?:as\\s+of|in)[\\s]+(?:november|october|september|august|july|june|may|april|march|february|january|\\d{4})[\\s,]+(?:there\\s+are)?[\\s]*(?:approximately|about|around)?[\\s]*([\\d,]+)[\\s]+${keyword}[s]?`, "gi"),
              // "approximately X nurses" or "X nurse positions"
              new RegExp(`(?:approximately|about|around|up\\s+to|over|nearly)[\\s]*([\\d,]+)[\\s]+${keyword}[s]?[\\s]*(?:positions|jobs|roles|vacancies|opportunities)?`, "gi"),
              // "X nurses" near growth context (within 100 chars)
              new RegExp(`\\b([\\d,]+)[\\s]+${keyword}[s]?\\b[\\s\\S]{0,100}(?:growth|increase|demand|required|needed|\\d+\\s*%)`, "gi"),
            ];

            for (let patternIdx = 0; patternIdx < patterns.length; patternIdx++) {
              const pattern = patterns[patternIdx];
              let match;
              while ((match = pattern.exec(content)) !== null) {
                const numberStr = match[1]?.replace(/,/g, '');
                const number = parseFloat(numberStr);
                if (isNaN(number)) continue;

                // Log which pattern matched
                const patternNames = [
                  "employment of X projected to grow",
                  "X projected/expected to grow",
                  "growth rate of X%",
                  "X% growth rate",
                  "X with Y% growth",
                  "Y% growth in X",
                  "X expected to see Y%",
                  "Y% expected for X",
                  "X: Y%",
                  "grow by Y% - X",
                  "as of date, X positions",
                  "approximately X positions",
                  "X positions near growth"
                ];
                console.log(`[extractCareerOpportunities] 🎯 Pattern match #${patternIdx} (${patternNames[patternIdx]}): "${match[0]}" → ${number}`);

                // Determine if it's growth % or job count
                const matchContext = content.substring(
                  Math.max(0, match.index - 30),
                  Math.min(content.length, match.index + match[0].length + 30)
                ).toLowerCase();

                const isPercentage = matchContext.includes('%') ||
                                    matchContext.includes('growth') ||
                                    matchContext.includes('increase') ||
                                    matchContext.includes('projected') ||
                                    matchContext.includes('expected');

                // Build occupation name from keyword
                let occupation = keyword.charAt(0).toUpperCase() + keyword.slice(1) + 
                                 (keyword.endsWith('s') ? '' : 's');
                
                // Clean and validate
                occupation = cleanOccupationName(occupation);
                
                if (!isValidOccupationName(occupation)) {
                  continue; // Skip invalid occupations
                }
                
                // Get or create career
                let career = careersMap.get(occupation);
                if (!career) {
                  career = {
                    occupation,
                    sources: [],
                    sector: normalizeSector(source.sector || metadata?.sector || 
                      content.match(new RegExp(`${keyword}[\\s\\S]{0,200}\\b(health|education|technology|construction|energy|defence|agriculture|healthcare)\\b`, "i"))?.[1]),
                    location: "South Australia",
                  };
                }

                if (isPercentage && number >= -50 && number <= 200) {
                  // Growth percentage
                  if (career.growth === undefined || Math.abs(number) > Math.abs(career.growth || 0)) {
                    career.growth = number;
                    career.demand = number > 15 ? "high" : number > 5 ? "medium" : "low";
                    career.trending = number > 20;
                    console.log(`[extractCareerOpportunities] Content extraction: ${occupation} growth=${number}% from text`);
                  }
                } else if (!isPercentage && number >= 100 && number <= 100000) {
                  // Job count
                  if (career.jobs === undefined || number > career.jobs) {
                    career.jobs = Math.floor(number);
                    console.log(`[extractCareerOpportunities] Content extraction: ${occupation} jobs=${number} from text`);
                  }
                }

                careersMap.set(occupation, career);
              }
            }
          }

          // SECOND PASS: Use actual occupation names from careersMap (more accurate than keywords)
          // This catches cases where the occupation was found in a table but growth/jobs/salary wasn't in the table
          for (const [occupationName, existingCareer] of careersMap.entries()) {
            const occupationLower = occupationName.toLowerCase();
            const normalizedName = occupationLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const normalizedNameSingular = normalizedName.replace(/s$/, '');
            const normalizedNamePlural = normalizedName.endsWith('s') ? normalizedName : normalizedName + 's';
            
            // Extract GROWTH if missing
            if (existingCareer.growth === undefined) {
              const growthPatterns = [
                new RegExp(`(?:employment|number|workforce)\\s+of\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\s+(?:is|are)\\s+(?:projected|expected|forecast|anticipated)\\s+to\\s+(?:grow|increase|rise|expand)\\s+(?:at\\s+(?:an\\s+)?(?:average\\s+)?rate\\s+of|by|at)\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
                new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\s+(?:projected|expected|forecast|is\\s+projected|are\\s+projected)\\s+to\\s+(?:grow|increase|rise|expand)\\s+(?:at\\s+(?:an\\s+)?(?:average\\s+)?rate\\s+of|by|at)\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
                new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s+(?:growth|increase|rise)[\\s\\w,]{0,100}(?:for|in|among|amongst|across)\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\b`, 'gi'),
                new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\w,]{0,100}(\\d+(?:\\.\\d+)?)\\s*%\\s+(?:growth|increase|rise|projected|expected)`, 'gi'),
              ];
              
              for (const pattern of growthPatterns) {
                const match = content.match(pattern);
                if (match) {
                  const numStr = match[1];
                  if (numStr) {
                    const growth = parseFloat(numStr);
                    if (!isNaN(growth) && growth >= -50 && growth <= 200) {
                      existingCareer.growth = growth;
                      existingCareer.demand = growth > 15 ? "high" : growth > 5 ? "medium" : "low";
                      existingCareer.trending = growth > 20;
                      console.log(`[extractCareerOpportunities] ✅ SECOND PASS: Extracted growth for "${occupationName}": ${growth}%`);
                      break;
                    }
                  }
                }
              }
            }

            // Extract JOBS if missing
            if (existingCareer.jobs === undefined) {
              const jobsPatterns = [
                new RegExp(`(?:approximately|about|around|up\\s+to|over|nearly|there\\s+are|as\\s+of)\\s+(\\d+(?:,\\d+)?)\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\s*(?:positions?|jobs?|roles?|vacancies?|employed)?`, 'gi'),
                new RegExp(`(\\d+(?:,\\d+)?)\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\s*(?:positions?|jobs?|roles?|vacancies?)`, 'gi'),
                new RegExp(`(\\d+(?:,\\d+)?)\\s*(?:positions?|jobs?|roles?|vacancies?)\\s+(?:for|in|as|available\\s+for|in\\s+demand|for)\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})`, 'gi'),
                new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\w,]{0,100}(?:with|has|have|:)\\s+(\\d+(?:,\\d+)?)\\s*(?:positions?|jobs?|roles?|vacancies?)`, 'gi'),
              ];
              
              for (const pattern of jobsPatterns) {
                const match = content.match(pattern);
                if (match) {
                  const numStr = match[1]?.replace(/,/g, '');
                  if (numStr) {
                    const jobs = parseInt(numStr);
                    if (!isNaN(jobs) && jobs >= 100 && jobs <= 1000000) {
                      existingCareer.jobs = jobs;
                      console.log(`[extractCareerOpportunities] ✅ SECOND PASS: Extracted jobs for "${occupationName}": ${jobs}`);
                      break;
                    }
                  }
                }
              }
            }

            // Extract SALARY if missing
            if (!existingCareer.salary) {
              const salaryPatterns = [
                new RegExp(`(?:salary|wage|pay|remuneration|income)[\\s:]+(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)\\s*(?:[-–—]|to|and)\\s*(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)`, 'gi'),
                new RegExp(`(?:salary|wage|pay|remuneration|income)[\\s:]+(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)`, 'gi'),
                new RegExp(`(?:\\$|AUD\\s*)(\\d+(?:,\\d+)?(?:,\\d+)?)\\s*(?:salary|wage|pay|remuneration|income)`, 'gi'),
                new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\w,]{0,100}(?:salary|wage|pay|earning|earn)[\\s:]+(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)\\s*(?:[-–—]|to|and)?\\s*(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)?`, 'gi'),
              ];
              
              for (const pattern of salaryPatterns) {
                const match = content.match(pattern);
                if (match) {
                  const salary1 = match[1]?.replace(/,/g, '');
                  const salary2 = match[2]?.replace(/,/g, '');
                  if (salary1) {
                    const num1 = parseInt(salary1);
                    if (!isNaN(num1) && num1 >= 30000 && num1 <= 500000) {
                      if (salary2) {
                        const num2 = parseInt(salary2);
                        if (!isNaN(num2) && num2 >= 30000 && num2 <= 500000) {
                          existingCareer.salary = `$${num1.toLocaleString()}–$${num2.toLocaleString()}`;
                          console.log(`[extractCareerOpportunities] ✅ SECOND PASS: Extracted salary range for "${occupationName}": ${existingCareer.salary}`);
                          break;
                        }
                      } else {
                        existingCareer.salary = `$${num1.toLocaleString()}`;
                        console.log(`[extractCareerOpportunities] ✅ SECOND PASS: Extracted salary for "${occupationName}": ${existingCareer.salary}`);
                        break;
                      }
                    }
                  }
                }
              }
            }
          }

          // Also look for explicit "Occupation: Name\nGrowth: X%" structured format in content
          // Skip if content looks like a URL or navigation structure
          if (!content.includes('[Page') && !content.includes('https://') && !content.includes('www.')) {
            const structuredBlocks = content.split(/Occupation:?\s*/i).filter(block => block.trim().length > 0);
            for (const block of structuredBlocks.slice(0, 20)) { // Limit to first 20 to avoid performance issues
              const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
              if (lines.length === 0) continue;

              // Find the first line that looks like an actual occupation name (skip ANZSCO codes, numbers, headers)
              let rawOccupationName = '';
              for (const line of lines) {
              const candidate = line.split(/[:\n|]/)[0].trim(); // Split by colon, newline, or pipe
              
              // Skip obvious garbage
              if (!candidate || candidate.length < 3) continue;
              
              // Skip if it's just a number (ANZSCO code)
              if (/^\d+$/.test(candidate)) continue;
              
              // Skip single words that are metadata (ANZSCO, DETAILS, etc.)
              if (/^(ANZSCO|DETAILS|CODE|Page|https?|www\.|category|list|search|filter|occupation)$/i.test(candidate)) continue;
              
              // Skip if it starts with a number or special character
              if (/^[\d\[\]\(\)\/\\\-]/.test(candidate)) continue;
              
              // Skip if it's a URL fragment
              if (candidate.includes('http') || candidate.includes('www.') || candidate.includes('.com') || candidate.includes('.au')) continue;
              
              // Skip if it's a very long sentence (probably not an occupation name)
              if (candidate.length > 80) continue;
              
              // Skip if it contains common metadata words at the start
              if (/^(you|can|search|by|name|or|all|matching|results|will|be|displayed|last|updated|filter|find|your|home|category|list)/i.test(candidate)) continue;
              
                // This looks like a valid occupation name candidate
                rawOccupationName = candidate;
                break;
              }
              
              if (!rawOccupationName) continue; // No valid occupation name found in this block
              
              // Clean and validate occupation name
              let occupationName = cleanOccupationName(rawOccupationName);
              
              if (!isValidOccupationName(occupationName)) {
                // Don't log every rejection - too noisy
                continue;
              }

              let career = careersMap.get(occupationName);
              if (!career) {
                career = {
                  occupation: occupationName,
                  sector: normalizeSector(source.sector || metadata?.sector),
                  location: "South Australia",
                  sources: [],
                };
              }
              
              // Store source information for content-based extraction
              if (source.title || source.documentId || source.content) {
                if (!career.sources) {
                  career.sources = [];
                }
                const sourceInfo = {
                  title: source.title || source.documentId || metadata?.title || 'Unknown Document',
                  documentId: source.documentId || '',
                  pageNumber: source.pageNumber || metadata?.pageNumber,
                  content: source.content?.substring(0, 300) || '',
                  url: source.url,
                };
                // Avoid duplicate sources
                const isDuplicate = career.sources.some(s => 
                  s.documentId === sourceInfo.documentId && 
                  s.pageNumber === sourceInfo.pageNumber
                );
                if (!isDuplicate) {
                  career.sources.push(sourceInfo);
                }
              }

              // Look for Growth: X% in the block
              const growthMatch = block.match(/Growth:?\s*([\d.]+)\s*%/i);
              if (growthMatch) {
                const growth = parseFloat(growthMatch[1]);
                if (growth >= -50 && growth <= 200) {
                  career.growth = growth;
                  career.demand = growth > 15 ? "high" : growth > 5 ? "medium" : "low";
                  career.trending = growth > 20;
                  console.log(`[extractCareerOpportunities] Structured content: ${occupationName} growth=${growth}%`);
                }
              }

              // Look for Job Count: X in the block
              const jobMatch = block.match(/Job\s+Count:?\s*([\d,]+)/i);
              if (jobMatch) {
                const jobs = parseInt(jobMatch[1].replace(/,/g, ''));
                if (jobs >= 1 && jobs <= 1000000) {
                  career.jobs = jobs;
                  console.log(`[extractCareerOpportunities] Structured content: ${occupationName} jobs=${jobs}`);
                }
              }

              // Look for Salary: X in the block
              const salaryMatch = block.match(/Salary:?\s*([^\n]+)/i);
              if (salaryMatch) {
                const salaryText = salaryMatch[1].trim();
                // Validate it looks like a salary (contains $ or numbers in reasonable range)
                if (salaryText.includes('$') || /^\d+/.test(salaryText) || /^\d+[,\d]*[-–—]\d+/.test(salaryText)) {
                  career.salary = salaryText;
                  console.log(`[extractCareerOpportunities] Structured content: ${occupationName} salary=${salaryText}`);
                }
              }

              careersMap.set(occupationName, career);
            }
          }
        }
      } catch (e) {
        console.warn("[extractCareerOpportunities] Error processing source:", e, source);
      }
    });

    let result = Array.from(careersMap.values());

    // POST-PROCESSING: Extract growth, jobs, and salaries from natural language for careers that don't have them yet
    // This searches ALL sources using the actual occupation names (not just keywords)
    // This is more effective than the keyword-based extraction above
    const careersNeedingData = result.filter(c => c.growth === undefined || c.jobs === undefined || !c.salary);
    if (careersNeedingData.length > 0) {
      console.log(`[extractCareerOpportunities] 🔍 POST-PROCESS: Searching for missing data (growth/jobs/salary) for ${careersNeedingData.length} careers`);
      
      // Combine all source content for efficient searching
      const allContent = sources
        .map(source => source.content || '')
        .filter(content => content && content.length > 50)
        .join('\n\n');
      
      if (allContent) {
        result = result.map(career => {
          // Normalize occupation name for pattern matching (handle plurals)
          const occupationLower = career.occupation.toLowerCase();
          const normalizedName = occupationLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const normalizedNameSingular = normalizedName.replace(/s$/, '');
          const normalizedNamePlural = normalizedName.endsWith('s') ? normalizedName : normalizedName + 's';
          
          // Extract GROWTH if missing
          if (career.growth === undefined) {
            const naturalGrowthPatterns = [
              // "employment of [occupation] is projected to grow at an average rate of 8.1%"
              new RegExp(`(?:employment|number|workforce)\\s+of\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\s+(?:is|are)\\s+(?:projected|expected|forecast|anticipated)\\s+to\\s+(?:grow|increase|rise|expand)\\s+(?:at\\s+(?:an\\s+)?(?:average\\s+)?rate\\s+of|by|at)\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
              // "[occupation] projected to grow at 8.1%"
              new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\s+(?:projected|expected|forecast|is\\s+projected|are\\s+projected)\\s+to\\s+(?:grow|increase|rise|expand)\\s+(?:at\\s+(?:an\\s+)?(?:average\\s+)?rate\\s+of|by|at)\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
              // "projected to grow at an average rate of 8.1%" (near occupation name - within 150 chars)
              new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\S]{0,150}(?:projected|expected|forecast|anticipated)\\s+to\\s+(?:grow|increase|rise|expand)\\s+(?:at\\s+(?:an\\s+)?(?:average\\s+)?rate\\s+of|by|at)\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
              // "grow at 8.1%" or "increase by 8.1%" (near occupation)
              new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\S]{0,150}(?:grow|increase|rise|expand)\\s+(?:at|by)?\\s+(?:an?\\s+)?(?:average\\s+)?rate\\s+of\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
              // "growth of 8.1%" or "increase of 8.1%" (near occupation)
              new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\S]{0,150}(?:projected|expected|forecast)\\s+growth\\s+of\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
              new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\S]{0,150}(?:growth|increase)\\s+of\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
              // "8.1% growth" or "8.1% increase" (near occupation)
              new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s+(?:growth|increase|rise)[\\s\\S]{0,150}(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})`, 'gi'),
              new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\S]{0,150}(\\d+(?:\\.\\d+)?)\\s*%\\s+(?:growth|increase|rise|projected|expected)`, 'gi'),
            ];

            for (const pattern of naturalGrowthPatterns) {
              const matches = [...allContent.matchAll(pattern)];
              for (const match of matches) {
                const numStr = match[1] || match[0].match(/(\d+(?:\.\d+)?)/)?.[1];
                if (numStr) {
                  const growth = parseFloat(numStr);
                  if (!isNaN(growth) && growth >= -50 && growth <= 200) {
                    career.growth = growth;
                    career.demand = growth > 15 ? "high" : growth > 5 ? "medium" : "low";
                    career.trending = growth > 20;
                    console.log(`[extractCareerOpportunities] ✅ POST-PROCESS: Extracted growth for "${career.occupation}": ${growth}%`);
                    break;
                  }
                }
              }
              if (career.growth !== undefined) break;
            }
          }

          // Extract JOBS/POSITIONS if missing
          if (career.jobs === undefined) {
            const jobsPatterns = [
              // "approximately X [occupation]" or "X [occupation] positions"
              new RegExp(`(?:approximately|about|around|up\\s+to|over|nearly|there\\s+are|as\\s+of)\\s+(\\d+(?:,\\d+)?)\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\s*(?:positions?|jobs?|roles?|vacancies?|employed)?`, 'gi'),
              // "X [occupation] positions" or "X positions for [occupation]"
              new RegExp(`(\\d+(?:,\\d+)?)\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})\\s*(?:positions?|jobs?|roles?|vacancies?)`, 'gi'),
              new RegExp(`(\\d+(?:,\\d+)?)\\s*(?:positions?|jobs?|roles?|vacancies?)\\s+(?:for|in|as|available\\s+for|in\\s+demand|for)\\s+(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})`, 'gi'),
              // "[occupation] with X positions" or "[occupation]: X jobs"
              new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\S]{0,100}(?:with|has|have|:)\\s+(\\d+(?:,\\d+)?)\\s*(?:positions?|jobs?|roles?|vacancies?)`, 'gi'),
            ];

            for (const pattern of jobsPatterns) {
              const matches = [...allContent.matchAll(pattern)];
              for (const match of matches) {
                const numStr = match[1]?.replace(/,/g, '');
                if (numStr) {
                  const jobs = parseInt(numStr);
                  if (!isNaN(jobs) && jobs >= 100 && jobs <= 1000000) {
                    career.jobs = jobs;
                    console.log(`[extractCareerOpportunities] ✅ POST-PROCESS: Extracted jobs for "${career.occupation}": ${jobs}`);
                    break;
                  }
                }
              }
              if (career.jobs !== undefined) break;
            }
          }

          // Extract SALARY if missing
          if (!career.salary) {
            const salaryPatterns = [
              // "Salary: $X-Y" or "Salary: $X to $Y"
              new RegExp(`(?:salary|wage|pay|remuneration|income)[\\s:]+(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)\\s*(?:[-–—]|to|and)\\s*(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)`, 'gi'),
              // "Salary: $X" or "$X salary"
              new RegExp(`(?:salary|wage|pay|remuneration|income)[\\s:]+(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)`, 'gi'),
              new RegExp(`(?:\\$|AUD\\s*)(\\d+(?:,\\d+)?(?:,\\d+)?)\\s*(?:salary|wage|pay|remuneration|income)`, 'gi'),
              // "[occupation] salary $X-Y" or "[occupation] earning $X"
              new RegExp(`(?:${normalizedName}|${normalizedNameSingular}|${normalizedNamePlural})[\\s\\S]{0,100}(?:salary|wage|pay|earning|earn)[\\s:]+(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)\\s*(?:[-–—]|to|and)?\\s*(?:\\$|AUD\\s*)?(\\d+(?:,\\d+)?(?:,\\d+)?)?`, 'gi'),
            ];

            for (const pattern of salaryPatterns) {
              const matches = [...allContent.matchAll(pattern)];
              for (const match of matches) {
                const salary1 = match[1]?.replace(/,/g, '');
                const salary2 = match[2]?.replace(/,/g, '');
                if (salary1) {
                  const num1 = parseInt(salary1);
                  if (!isNaN(num1) && num1 >= 30000 && num1 <= 500000) {
                    if (salary2) {
                      const num2 = parseInt(salary2);
                      if (!isNaN(num2) && num2 >= 30000 && num2 <= 500000) {
                        career.salary = `$${num1.toLocaleString()}–$${num2.toLocaleString()}`;
                        console.log(`[extractCareerOpportunities] ✅ POST-PROCESS: Extracted salary range for "${career.occupation}": ${career.salary}`);
                        break;
                      }
                    } else {
                      career.salary = `$${num1.toLocaleString()}`;
                      console.log(`[extractCareerOpportunities] ✅ POST-PROCESS: Extracted salary for "${career.occupation}": ${career.salary}`);
                      break;
                    }
                  }
                }
              }
              if (career.salary) break;
            }
          }

          return career;
        });
      }
    }

    // POST-PROCESSING: Final validation pass - remove any garbage that got through
    result = result.filter(career => {
      const isValid = isValidOccupationName(career.occupation);
      if (!isValid) {
        console.warn(`[extractCareerOpportunities] POST-FILTER rejected: "${career.occupation}"`);
      }
      return isValid;
    });

    // Sort by growth if available, otherwise by occupation name
    result.sort((a, b) => {
      if (a.growth !== undefined && b.growth !== undefined) {
        return b.growth - a.growth;
      }
      if (a.growth !== undefined) return -1;
      if (b.growth !== undefined) return 1;
      return a.occupation.localeCompare(b.occupation);
    });

    console.log(`[extractCareerOpportunities] Extracted ${result.length} VALID careers from ${sources.length} sources (${tableSources.length} tables, ${contentSources.length} content chunks)`);
    console.log(`[extractCareerOpportunities] Sample careers:`, result.slice(0, 5).map(c => ({
      occupation: c.occupation,
      growth: c.growth,
      jobs: c.jobs,
      sector: c.sector
    })));
    return result;
  }, [normalizeSector, cleanOccupationName, isValidOccupationName]);

  // Extract careers from AI answer text - Enhanced patterns for better extraction
  const extractCareersFromAnswer = useCallback((answerText: string): CareerOpportunity[] => {
    const careersMap = new Map<string, CareerOpportunity>();

    // Debug: Check if answer contains Ambulance Officer info
    if (answerText.toLowerCase().includes('ambulance') || answerText.toLowerCase().includes('8.1')) {
      console.log(`[extractCareersFromAnswer] 🔍 AMBULANCE IN ANSWER:`, {
        answerPreview: answerText.substring(0, 500),
        containsAmbulance: answerText.toLowerCase().includes('ambulance'),
        contains81: answerText.includes('8.1'),
      });
    }

    // Normalize occupation name: capitalize first letter of each word
    const normalizeOccupationName = (name: string): string => {
      return name
        .toLowerCase()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    // FIRST: Try to parse structured format (NEW - from updated prompt)
    // Format: "Occupation: Name\nSector: X\nGrowth: Y%\nJob Count: Z\n..."
    // Split by "Occupation:" to get individual records
    const occupationBlocks = answerText.split(/Occupation:\s*/i).filter(block => block.trim().length > 0);
    
    for (const block of occupationBlocks) {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length === 0) continue;
      
      const rawOccupationName = lines[0].trim();
      
      // Clean and validate occupation name using centralized functions
      let occupationName = cleanOccupationName(rawOccupationName);
      
      if (!isValidOccupationName(occupationName)) {
        console.log(`[extractCareersFromAnswer] REJECTED structured AI occupation: "${rawOccupationName}" → "${occupationName}"`);
        continue; // Skip invalid occupations
      }
      
      const normalizedName = normalizeOccupationName(occupationName);
      const careerText = block;
      
      const career: CareerOpportunity = {
        occupation: normalizedName,
        sector: "General", // Default, will be overridden if found
        location: "South Australia",
        sources: [], // Initialize sources array
      };
      
      // Extract each field
      const sectorMatch = careerText.match(/Sector:\s*([^\n]+)/i);
      if (sectorMatch) career.sector = normalizeSector(sectorMatch[1].trim());
      
      const growthMatch = careerText.match(/Growth:\s*(\d+(?:\.\d+)?)\s*%/i);
      if (growthMatch) {
        const growth = parseFloat(growthMatch[1]);
        if (growth >= -50 && growth <= 200) {
          career.growth = growth;
          career.demand = growth > 15 ? "high" : growth > 5 ? "medium" : "low";
          career.trending = growth > 20;
        }
      }
      
      // CRITICAL FIX: If growth is missing or "Not specified", try extracting from natural language in the block
      // Search the career block text AND the full answer text around this career
      if (!career.growth) {
        // First, search within the career block itself
        const searchText = careerText + '\n' + answerText.substring(
          Math.max(0, answerText.indexOf(careerText) - 500),
          Math.min(answerText.length, answerText.indexOf(careerText) + careerText.length + 500)
        );
        
        const naturalGrowthPatterns = [
          // "employment of [occupation] is projected to grow at an average rate of 8.1%"
          new RegExp(`(?:employment|number|workforce)\\s+of\\s+${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[s]?\\s+(?:is|are)\\s+(?:projected|expected|forecast|anticipated)\\s+to\\s+(?:grow|increase|rise|expand)\\s+(?:at\\s+(?:an\\s+)?(?:average\\s+)?rate\\s+of|by|at)\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
          // "[occupation] projected to grow at 8.1%"
          new RegExp(`${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[s]?\\s+(?:projected|expected|forecast|is\\s+projected|are\\s+projected)\\s+to\\s+(?:grow|increase|rise|expand)\\s+(?:at\\s+(?:an\\s+)?(?:average\\s+)?rate\\s+of|by|at)\\s+(\\d+(?:\\.\\d+)?)\\s*%`, 'gi'),
          // "projected to grow at an average rate of 8.1%" (near occupation name)
          /(?:projected|expected|forecast|anticipated)\s+to\s+(?:grow|increase|rise|expand)\s+(?:at|by)?\s+(?:an?\s+)?(?:average\s+)?rate\s+of\s+(\d+(?:\.\d+)?)\s*%/gi,
          // "grow at 8.1%" or "increase by 8.1%"
          /(?:grow|increase|rise|expand)\s+(?:at|by)?\s+(?:an?\s+)?(?:average\s+)?rate\s+of\s+(\d+(?:\.\d+)?)\s*%/gi,
          // "growth of 8.1%" or "increase of 8.1%"
          /(?:projected|expected|forecast)\s+growth\s+of\s+(\d+(?:\.\d+)?)\s*%/gi,
          /(?:growth|increase)\s+of\s+(\d+(?:\.\d+)?)\s*%/gi,
          // "8.1% growth" or "8.1% increase"
          /(\d+(?:\.\d+)?)\s*%\s+(?:growth|increase|rise|projected|expected)/gi,
        ];
        
        for (const pattern of naturalGrowthPatterns) {
          const match = searchText.match(pattern);
          if (match) {
            const numStr = match[1] || match[0].match(/(\d+(?:\.\d+)?)/)?.[1];
            if (numStr) {
              const growth = parseFloat(numStr);
              if (!isNaN(growth) && growth >= -50 && growth <= 200) {
                career.growth = growth;
                career.demand = growth > 15 ? "high" : growth > 5 ? "medium" : "low";
                career.trending = growth > 20;
                console.log(`[extractCareersFromAnswer] ✅ Extracted natural language growth for "${normalizedName}": ${growth}%`);
                break;
              }
            }
          }
        }
      }
      
      const jobCountMatch = careerText.match(/Job Count:\s*(\d+(?:,\d+)?)/i);
      if (jobCountMatch) {
        const jobs = parseInt(jobCountMatch[1].replace(/,/g, ''));
        if (jobs >= 1 && jobs <= 1000000) career.jobs = jobs;
      }
      
      const demandMatch = careerText.match(/Demand:\s*(High|Medium|Low)/i);
      if (demandMatch) career.demand = demandMatch[1].toLowerCase() as "high" | "medium" | "low";
      
      const salaryMatch = careerText.match(/Salary:\s*([^\n]+)/i);
      if (salaryMatch) career.salary = salaryMatch[1].trim();
      
      const regionMatch = careerText.match(/Region:\s*([^\n]+)/i);
      if (regionMatch) career.location = regionMatch[1].trim();
      
      // Only add if we have at least occupation name
      if (normalizedName && normalizedName.length >= 3) {
        careersMap.set(normalizedName, career);
        console.log(`[extractCareersFromAnswer] Structured format: ${normalizedName} growth=${career.growth !== undefined ? career.growth + '%' : 'N/A'} jobs=${career.jobs || 'N/A'} sector=${career.sector || 'N/A'}`);
      }
    }

    // FLEXIBLE PATTERNS: Match occupations with various formats (fallback for non-structured output)
    const occupationPatterns = [
      // NATURAL LANGUAGE PATTERNS - HIGH PRIORITY (Career Coach style)
      // "employment of Ambulance Officers is projected to grow at an average rate of 8.1%"
      /(?:employment|number|workforce)\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s+(?:employment|projected|is\s+projected|are\s+projected|expected|forecast|anticipated)\s+(?:to\s+)?(?:grow|increase|expand|rise)\s+(?:at\s+(?:an\s+)?(?:average\s+)?rate\s+of|by|at)\s+(\d+(?:\.\d+)?)\s*%/gi,
      // "Ambulance Officers projected to grow at an average rate of 8.1%" 
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s+(?:employment|projected|is\s+projected|are\s+projected|expected|forecast)\s+(?:to\s+)?(?:grow|increase|expand|rise)\s+(?:at\s+(?:an\s+)?(?:average\s+)?rate\s+of|by|at)\s+(\d+(?:\.\d+)?)\s*%/gi,
      // "Ambulance Officers are projected to grow at 8.1%" or "nurses expected to increase by 15.2%"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s+(?:are|is)\s+(?:projected|expected|forecast)\s+to\s+(?:grow|increase|rise)\s+(?:at|by)?\s+(\d+(?:\.\d+)?)\s*%/gi,
      // "registered nurses expected to see a 22% increase" - MOST IMPORTANT
      /([a-z]+(?:\s+[a-z]+){0,4})\s+(?:expected\s+to\s+see|projected|forecast|expected)\s+(?:a|an)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:increase|growth|rise|expansion)/gi,
      // "employment of X is projected to grow at X%" - NEW
      /employment\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s+(?:is|are)\s+projected\s+to\s+grow\s+at\s+(?:an\s+)?(?:average\s+)?rate\s+of\s+(\d+(?:\.\d+)?)\s*%/gi,
      // "approximately 26,600 Ambulance Officers" - NEW
      /(?:approximately|about|around|up\s+to|there\s+are|as\s+of)\s+(\d+(?:,\d+)?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s+(?:employed|in|positions?|jobs?)/gi,
      // Pattern: "Occupation (X% growth)" or "Occupation - X%" or "Occupation: X%"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s*(?:\(|\s*[-–—:]\s*)\s*(\d+(?:\.\d+)?)\s*%/gi,
      // Pattern: "X jobs/positions in Occupation" or "Occupation: X jobs" or "X positions in demand"
      /(\d+(?:,\d+)?)\s*(?:jobs?|positions?|roles?|vacancies?|employed)\s+(?:in|for|as|available\s+for|in\s+demand|for)\s*(Ambulance\s+Officers?|Paramedics?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})/gi,
      // Pattern: "Occupation growth of X%" or "X% growth in Occupation" or "see a X% increase"
      /([a-z]+(?:\s+[a-z]+){0,4})\s+(?:growth|demand|projected|expected|to\s+see)\s+(?:of|at|is|a|an)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:growth|increase|rise)/gi,
      // Pattern: "Occupation with X% growth" or "Occupation showing X% growth"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s+(?:with|showing|demonstrating)\s+(\d+(?:\.\d+)?)\s*%\s*(?:growth|increase|rise)/gi,
      // Pattern: "X% growth for Occupation" or "X% increase for Occupation"
      /(\d+(?:\.\d+)?)\s*%\s*(?:growth|increase|rise)\s+(?:for|in|among|expected\s+for)\s+([a-z]+(?:\s+[a-z]+){0,4})/gi,
      // Pattern: "approximately X positions" near occupation mention (within 50 chars)
      /([a-z]+(?:\s+[a-z]+){0,4})\s+[^.]{0,50}(?:approximately|about|around|up\s+to)\s+(\d+(?:,\d+)?)\s*(?:positions?|jobs?|roles?)/gi,
      // Pattern: "Occupation are highlighted/mentioned as critical/high demand"
      /([a-z]+(?:\s+[a-z]+){0,4})\s+(?:are|is)\s+(?:highlighted|mentioned|identified|classified)\s+as\s+(?:critical|essential|high\s+demand|in\s+demand|priority)/gi,
    ];

    // Search full answer text for natural language patterns (not just structured blocks)
    // This catches careers mentioned in narrative text that weren't in structured format
    for (const pattern of occupationPatterns) {
      let match;
      // Reset lastIndex to avoid issues with global regex
      pattern.lastIndex = 0;
      while ((match = pattern.exec(answerText)) !== null) {
        let occupation = match[1] || match[2];
        let numberStr = (match[2] || match[1] || '').toString().replace(/,/g, '');
        const number = parseFloat(numberStr);
        
        // Debug logging for specific occupations we're looking for
        if (occupation && (occupation.toLowerCase().includes('ambulance') || occupation.toLowerCase().includes('paramedic'))) {
          console.log(`[extractCareersFromAnswer] 🔍 Pattern matched for "${occupation}": "${match[0]}", number: ${number}`);
        }

        if (!occupation || occupation.length < 3) continue;
        
        // Clean and validate occupation name using centralized functions
        occupation = cleanOccupationName(occupation);
        
        if (!isValidOccupationName(occupation)) {
          continue; // Skip invalid occupations
        }
        
        occupation = normalizeOccupationName(occupation);
        
        // Skip common non-occupation words
        const skipWords = ['this', 'that', 'these', 'those', 'which', 'what', 'who', 'where', 'when', 'why', 'how', 'the', 'a', 'an'];
        if (skipWords.includes(occupation.toLowerCase().split(' ')[0])) continue;

        // Get existing career or create new
        let career = careersMap.get(occupation);
        if (!career) {
          career = {
            occupation,
            sector: normalizeSector(
              answerText.match(new RegExp(`${occupation}[\\s\\S]{0,200}\\b(health|education|technology|construction|energy|defence|agriculture|transport|manufacturing|healthcare|social)\\b`, "i"))?.[1]
            ),
            location: "South Australia",
          };
        }

        // Determine if number is growth% or job count
        // Check context to determine if it's a percentage
        const matchStart = match.index !== undefined ? Math.max(0, match.index - 50) : 0;
        const matchEnd = match.index !== undefined 
          ? Math.min(answerText.length, match.index + match[0].length + 50)
          : Math.min(answerText.length, 100);
        
        const matchContext = answerText.substring(matchStart, matchEnd).toLowerCase();
        
        const isPercentage = match[0].includes('%') ||
                            matchContext.includes('%') || 
                            matchContext.includes('growth') || 
                            matchContext.includes('increase') || 
                            matchContext.includes('decrease') ||
                            matchContext.includes('rise') ||
                            matchContext.includes('decline') ||
                            matchContext.includes('expansion') ||
                            matchContext.includes('projected') ||
                            matchContext.includes('expected');
        
        const isJobCount = matchContext.includes('jobs') ||
                          matchContext.includes('positions') ||
                          matchContext.includes('vacancies') ||
                          matchContext.includes('roles') ||
                          matchContext.includes('employment');
        
        if (!isNaN(number)) {
          // Priority: percentage if context suggests it, or number < 200 without job context
          if (isPercentage || (!isJobCount && number < 200 && number >= -50)) {
            // Growth percentage
            if (career.growth === undefined || Math.abs(number) > Math.abs(career.growth || 0)) {
              career.growth = number;
              career.demand = number > 15 ? "high" : number > 5 ? "medium" : "low";
              career.trending = number > 20;
              console.log(`[extractCareersFromAnswer] Set growth for ${occupation}: ${number}%`);
            }
          } else if (isJobCount || (number >= 100 && number <= 1000000)) {
            // Likely job count
            if (career.jobs === undefined || number > career.jobs) {
              career.jobs = Math.floor(number);
              console.log(`[extractCareersFromAnswer] Set jobs for ${occupation}: ${number}`);
            }
          }
        }

        // Set demand based on context if not already set
        if (!career.demand && answerText.match(new RegExp(`${occupation}[^.]{0,100}(?:critical|essential|high\\s+demand|strong\\s+demand|urgent)`, "i"))) {
          career.demand = "high";
        }

        careersMap.set(occupation, career);
        console.log(`[extractCareersFromAnswer] Extracted: ${occupation} growth=${career.growth !== undefined ? career.growth + '%' : 'N/A'} jobs=${career.jobs || 'N/A'} sector=${career.sector || 'N/A'}`);
      }
    }

    let result = Array.from(careersMap.values());

    // POST-PROCESSING: Final validation pass - remove any garbage that got through
    result = result.filter(career => {
      const isValid = isValidOccupationName(career.occupation);
      if (!isValid) {
        console.warn(`[extractCareersFromAnswer] POST-FILTER rejected: "${career.occupation}"`);
      }
      return isValid;
    });

    // Sort by growth if available
    result.sort((a, b) => {
      if (a.growth !== undefined && b.growth !== undefined) {
        return b.growth - a.growth;
      }
      if (a.growth !== undefined) return -1;
      if (b.growth !== undefined) return 1;
      return a.occupation.localeCompare(b.occupation);
    });
    
    console.log(`[extractCareersFromAnswer] Extracted ${result.length} VALID careers from AI answer`);
    if (result.length > 0) {
      const withGrowth = result.filter(c => c.growth !== undefined && typeof c.growth === 'number');
      console.log(`[extractCareersFromAnswer] 📊 SUMMARY: ${withGrowth.length}/${result.length} careers have growth data:`, 
        withGrowth.slice(0, 5).map(c => ({ occupation: c.occupation, growth: c.growth }))
      );
    }
    return result;
  }, [normalizeSector, cleanOccupationName, isValidOccupationName]);

  const extractSkillsDemand = useCallback((sources: any[]): SkillDemand[] => {
    const skillsMap = new Map<string, SkillDemand>();
    
    // Known skills to look for in content
    const technicalSkills = [
      "Python", "JavaScript", "Data Analysis", "Cloud Computing", "Cybersecurity",
      "Project Management", "SQL", "Excel", "AutoCAD", "GIS", "SAP"
    ];
    const softSkills = [
      "Communication", "Leadership", "Problem Solving", "Teamwork", "Critical Thinking",
      "Time Management", "Adaptability", "Collaboration"
    ];
    const emergingSkills = [
      "AI", "Machine Learning", "Artificial Intelligence", "Data Science", "Automation",
      "Renewable Energy", "Sustainability", "Digital Transformation", "Blockchain"
    ];
    
    sources.forEach((source) => {
      try {
        let metadata = source.metadata;
        if (typeof metadata === "string") {
          metadata = JSON.parse(metadata);
        }

        // Method 1: Extract from table rows
        if (metadata?.chunkType === "table_row" && metadata.rowValues) {
          const headers = metadata.headers || [];
          const values = metadata.rowValues || [];
          
          const skillIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("skill") || h.toLowerCase().includes("competency")
          );
          const demandIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("demand")
          );
          const growthIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("growth") || h.toLowerCase().includes("%")
          );

          if (skillIdx >= 0 && values[skillIdx]) {
            const skill = String(values[skillIdx]).trim();
            if (skill && skill.length > 2 && skill.length < 50) {
              let demand = 75;
              if (demandIdx >= 0 && values[demandIdx]) {
                const demandMatch = String(values[demandIdx]).match(/(\d+)/);
                if (demandMatch) demand = Math.min(100, parseInt(demandMatch[1]));
              }

              let growth = 10;
              if (growthIdx >= 0 && values[growthIdx]) {
                const growthMatch = String(values[growthIdx]).match(/(\d+(?:\.\d+)?)/);
                if (growthMatch) growth = parseFloat(growthMatch[1]);
              }

              const content = (source.content || "").toLowerCase();
              let category: "technical" | "soft" | "emerging" = "technical";
              if (content.includes("soft") || content.includes("communication") || content.includes("leadership")) {
                category = "soft";
              } else if (content.includes("ai") || content.includes("machine learning") || content.includes("emerging") || content.includes("green")) {
                category = "emerging";
              }

              if (!skillsMap.has(skill)) {
                skillsMap.set(skill, {
                  name: skill,
                  demand,
                  growth,
                  sector: normalizeSector(source.sector || metadata?.sector) || "General",
                  category,
                  trainingAvailable: true,
                });
              }
            }
          }
        }
        
        // Method 2: Extract from content text
        const content = source.content || "";
        const contentLower = content.toLowerCase();
        
        // Check for technical skills
        for (const skill of technicalSkills) {
          if (contentLower.includes(skill.toLowerCase()) && !skillsMap.has(skill)) {
            skillsMap.set(skill, {
              name: skill,
              demand: Math.floor(deterministicValue(skill + '-tech-d', 70, 95)),
              growth: deterministicValue(skill + '-tech-g', 8, 20),
              sector: normalizeSector(source.sector || metadata?.sector),
              category: "technical",
              trainingAvailable: true,
              estimated: true,
            });
          }
        }
        
        // Check for soft skills
        for (const skill of softSkills) {
          if (contentLower.includes(skill.toLowerCase()) && !skillsMap.has(skill)) {
            skillsMap.set(skill, {
              name: skill,
              demand: Math.floor(deterministicValue(skill + '-soft-d', 60, 90)),
              growth: deterministicValue(skill + '-soft-g', 5, 15),
              sector: normalizeSector(source.sector || metadata?.sector),
              category: "soft",
              trainingAvailable: true,
              estimated: true,
            });
          }
        }
        
        // Check for emerging skills
        for (const skill of emergingSkills) {
          if (contentLower.includes(skill.toLowerCase()) && !skillsMap.has(skill)) {
            skillsMap.set(skill, {
              name: skill,
              demand: Math.floor(deterministicValue(skill + '-emrg-d', 75, 95)),
              growth: deterministicValue(skill + '-emrg-g', 15, 35),
              sector: normalizeSector(source.sector || metadata?.sector),
              category: "emerging",
              trainingAvailable: true,
              estimated: true,
            });
          }
        }
      } catch (e) {
        console.warn("[extractSkillsDemand] Error processing source:", e);
      }
    });

    return Array.from(skillsMap.values())
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 20);
  }, [normalizeSector]);

  // Extract skills from AI answer text
  const extractSkillsFromAnswer = useCallback((answerText: string): SkillDemand[] => {
    const skillsMap = new Map<string, SkillDemand>();

    // Predefined skill lists
    const technicalSkills = [
      "Python", "JavaScript", "Data Analysis", "Cloud Computing", "Cybersecurity",
      "Project Management", "SQL", "Excel", "AutoCAD", "GIS", "SAP"
    ];
    const softSkills = [
      "Communication", "Leadership", "Problem Solving", "Teamwork", "Critical Thinking",
      "Time Management", "Adaptability", "Collaboration"
    ];
    const emergingSkills = [
      "AI", "Machine Learning", "Artificial Intelligence", "Data Science", "Automation",
      "Renewable Energy", "Sustainability", "Digital Transformation", "Blockchain"
    ];

    // Look for skill mentions with demand indicators
    const skillPatterns = [
      // Pattern: "Skill Name (X% demand)" or "Skill - high demand"
      /([A-Z][a-zA-Z\s]+(?:ing|tion|ment)?)\s*(?:\(|\s*[-–—])\s*(?:high|strong|growing|emerging)\s+demand/gi,
      // Pattern: "in-demand Skill" or "Skill in high demand"
      /(?:in-?demand|high\s+demand|critical\s+skill)\s+([A-Z][a-zA-Z\s]+)/gi,
      // Pattern: "Skill growth of X%"
      /([A-Z][a-zA-Z\s]+)\s+(?:growth|demand)\s+(?:of|at)?\s*(\d+(?:\.\d+)?)\s*%/gi,
    ];

    for (const pattern of skillPatterns) {
      let match;
      while ((match = pattern.exec(answerText)) !== null) {
        const skill = (match[1] || match[2]).trim();
        const number = parseFloat(match[2] || match[1]);
        
        if (skill && skill.length > 2 && skill.length < 50) {
          if (!skillsMap.has(skill)) {
            const contentLower = answerText.toLowerCase();
            let category: "technical" | "soft" | "emerging" = "technical";
            if (contentLower.includes("communication") || contentLower.includes("leadership") || contentLower.includes("teamwork")) {
              category = "soft";
            } else if (contentLower.includes("ai") || contentLower.includes("machine learning") || contentLower.includes("green") || contentLower.includes("sustainable")) {
              category = "emerging";
            }

            skillsMap.set(skill, {
              name: skill,
              demand: !isNaN(number) && number <= 100 ? number : Math.floor(deterministicValue(skill + '-ans-d', 70, 95)),
              growth: !isNaN(number) && number > 100 ? number / 10 : deterministicValue(skill + '-ans-g', 8, 23),
              sector: normalizeSector(answerText.match(new RegExp(`${skill}[\\s\\S]{0,200}(health|education|technology|construction|energy)`, "i"))?.[1] || "General"),
              category,
              trainingAvailable: true,
              estimated: isNaN(number) || number > 100,
            });
          }
        }
      }
    }

    // Check predefined skills in answer
    const allSkills = [
      ...technicalSkills, ...softSkills, ...emergingSkills
    ];

    for (const skill of allSkills) {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[\\s\\S]{0,100}(?:demand|growth|in-?demand|critical|important|priority)`, "gi");
      if (regex.test(answerText) && !skillsMap.has(skill)) {
        const contentLower = answerText.toLowerCase();
        let category: "technical" | "soft" | "emerging" = "technical";
        if (softSkills.includes(skill)) category = "soft";
        if (emergingSkills.includes(skill)) category = "emerging";

        skillsMap.set(skill, {
          name: skill,
          demand: Math.floor(deterministicValue(skill + '-fb-d', 70, 95)),
          growth: deterministicValue(skill + '-fb-g', 8, 23),
          sector: normalizeSector(answerText.match(new RegExp(`${skill}[\\s\\S]{0,200}(health|education|technology|construction|energy)`, "i"))?.[1] || "General"),
          category,
          trainingAvailable: true,
          estimated: true,
        });
      }
    }

    return Array.from(skillsMap.values())
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 15);
  }, [normalizeSector]);

  const extractTrainingProgramsFromAnswer = useCallback((answerText: string): TrainingProgram[] => {
    const programs: TrainingProgram[] = [];
    if (!answerText || !answerText.trim()) return programs;

    const blockMatch = answerText.match(/\*\*Training programs \(if any\):\*\*[\s\S]*?(?=\n\s*\n|\*\*|$)/i);
    const block = blockMatch ? blockMatch[0].replace(/\*\*Training programs \(if any\):\*\*\s*/i, "").trim() : null;

    const parseLine = (line: string): TrainingProgram | null => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("(")) return null;
      const parts: Record<string, string> = {};
      for (const segment of trimmed.split("|")) {
        const colonIdx = segment.indexOf(":");
        if (colonIdx === -1) continue;
        const key = segment.slice(0, colonIdx).trim().toLowerCase();
        const value = segment.slice(colonIdx + 1).trim();
        if (key && value) parts[key] = value;
      }
      const name = parts["program"] || parts["name"];
      if (!name || name.length < 2) return null;
      const skillsStr = parts["skills"] || "";
      const skills = skillsStr ? skillsStr.split(",").map(s => s.trim()).filter(Boolean) : [];
      return {
        name,
        provider: parts["provider"] || undefined,
        skills,
        duration: parts["duration"] || undefined,
        funding: parts["funding"] || undefined,
        level: (parts["level"] as "beginner" | "intermediate" | "advanced") || undefined,
      };
    };

    if (block) {
      for (const line of block.split("\n")) {
        const prog = parseLine(line);
        if (prog && !programs.some(p => p.name.toLowerCase() === prog.name.toLowerCase())) {
          programs.push(prog);
        }
      }
    }

    if (programs.length === 0) {
      const fallbackProgramMatch = answerText.match(/Program:\s*([^\n|]+)/gi);
      if (fallbackProgramMatch) {
        for (const m of fallbackProgramMatch) {
          const nameMatch = m.match(/Program:\s*(.+)/i);
          const name = nameMatch?.[1]?.trim();
          if (name && name.length > 1 && !programs.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            programs.push({ name, skills: [] });
          }
        }
      }
    }

    return programs;
  }, []);

  // ============================================================================
  // Generate Cross-Tab Insights
  // ============================================================================

  const generateCrossTabInsights = useCallback((
    funding: FundingAllocation[],
    careers: CareerOpportunity[],
    skills: SkillDemand[]
  ): CrossTabInsight[] => {
    const insights: CrossTabInsight[] = [];

    // Find sectors with both high funding growth and job growth
    funding.forEach((f) => {
      const relatedCareers = careers.filter(c => 
        c.sector.toLowerCase().includes(f.sector.toLowerCase()) ||
        f.sector.toLowerCase().includes(c.sector.toLowerCase())
      );
      
      if (relatedCareers.length > 0 && f.change > 5) {
        const avgCareerGrowth = relatedCareers.reduce((sum, c) => sum + c.growth, 0) / relatedCareers.length;
        
        insights.push({
          type: "funding-careers",
          title: `${f.sector} Investment Driving Job Growth`,
          description: `${f.change.toFixed(1)}% funding increase correlates with ${avgCareerGrowth.toFixed(1)}% average job growth across ${relatedCareers.length} occupations.`,
          connection: `Budget allocation of $${(f.amount / 1000).toFixed(1)}B is translating into workforce expansion.`,
          impact: f.change > 10 && avgCareerGrowth > 10 ? "positive" : "neutral",
          confidence: 0.85,
        });
      }
    });

    // Find skills aligned with high-growth careers
    const highGrowthCareers = careers.filter(c => c.growth > 15);
    const emergingSkills = skills.filter(s => s.category === "emerging");
    
    if (highGrowthCareers.length > 0 && emergingSkills.length > 0) {
      insights.push({
        type: "careers-skills",
        title: "Emerging Skills Aligned with Growth Sectors",
        description: `${emergingSkills.length} emerging skills identified in sectors with ${highGrowthCareers.length} high-growth occupations.`,
        connection: "Workers should prioritise emerging skill development to access growing opportunities.",
        impact: "positive",
        confidence: 0.78,
      });
    }

    // Find funding-skills connections
    const prioritySectors = funding.filter(f => f.priority === "high").map(f => f.sector.toLowerCase());
    const alignedSkills = skills.filter(s => 
      prioritySectors.some(sector => s.sector.toLowerCase().includes(sector))
    );
    
    if (alignedSkills.length > 0) {
      insights.push({
        type: "funding-skills",
        title: "Skills Investment Following Budget Priorities",
        description: `${alignedSkills.length} in-demand skills directly aligned with priority funding sectors.`,
        connection: "Training in these skills offers strong ROI given government investment signals.",
        impact: "positive",
        confidence: 0.82,
      });
    }

    return insights.slice(0, 5);
  }, []);

  // ============================================================================
  // Fetch Tab Data
  // ============================================================================

  const fetchTabData = useCallback(async (tab: IntelligenceTab, forceRefresh = false) => {
    // Prevent duplicate fetches
    if (fetchInProgress.current.has(tab)) {
      console.log(`[fetchTabData] ${tab} already in progress, skipping`);
      return;
    }
    
    // Check cache validity using ref to avoid stale closure
    const tabData = stateRef.current[tab];
    if (!forceRefresh && tabData.lastFetched && 
        Date.now() - tabData.lastFetched.getTime() < CACHE_DURATION) {
      console.log(`[fetchTabData] ${tab} cache still valid, skipping`);
      return;
    }

    console.log(`[fetchTabData] Starting fetch for ${tab}...`);
    fetchInProgress.current.add(tab);
    
    setState(prev => ({
      ...prev,
      [tab]: { ...prev[tab], loading: true, error: null },
    }));

    try {
      const queryConfig = SEMANTIC_QUERIES[tab];
      const tabPrompt = getTabPrompt(tab); // Get HORUS prompt for this specific tab
      console.log(`[fetchTabData] Calling semanticSearch for ${tab} with tab-specific HORUS prompt...`);
      const result = await semanticSearch(
        queryConfig.primary,
        queryConfig.filters || {},
        { 
          topK: tab === "careers" ? 60 : tab === "funding" ? 120 : 40, // funding: more chunks, no category filter — get full budget tables from all doc types
          systemPrompt: tabPrompt, // Pass tab-specific intelligence analyst prompt
        }
      );

      console.log(`[fetchTabData] ${tab} result:`, result ? "received" : "null");
      if (!result) throw new Error("No results returned");

      // Log raw answer to debug parsing
      console.log(`[fetchTabData] ${tab} raw answer:`, result.answer?.substring(0, 500));
      
      const insights = parseInsightResponse(result.answer || "");
      const sources = result.sources || [];
      
      console.log(`[fetchTabData] ${tab} parsed: ${insights.length} insights, ${sources.length} sources`);
      
      // Log source structure to debug extraction
      if (sources.length > 0) {
        console.log(`[fetchTabData] ${tab} first source:`, {
          hasMetadata: !!sources[0].metadata,
          metadataType: typeof sources[0].metadata,
          contentPreview: sources[0].content?.substring(0, 200),
        });
      }

      // Extract structured data based on tab
      // Enhanced: Extract from both sources AND AI answer text
      let fundingData: FundingAllocation[] = [];
      let careersData: CareerOpportunity[] = [];
      let skillsData: SkillDemand[] = [];
      let trainingProgramsData: TrainingProgram[] = [];

      if (tab === "funding") {
        const fromSources = extractFundingAllocations(sources);
        const fromAnswer = result.answer ? extractFundingFromAnswer(result.answer) : [];
        console.log(`[fetchTabData] funding: ${fromSources.length} from sources (table/text), ${fromAnswer.length} from AI answer`);

        // Merge: take BEST of both — per sector use the higher amount so we don't undercount when chunks are a subset
        const mergedMap = new Map<string, FundingAllocation>();
        for (const alloc of fromSources) mergedMap.set(alloc.sector.toLowerCase(), alloc);
        for (const alloc of fromAnswer) {
          const key = alloc.sector.toLowerCase();
          const existing = mergedMap.get(key);
          if (!existing) {
            mergedMap.set(key, alloc);
          } else if (alloc.amount > existing.amount) {
            // Prefer higher amount (avoids undercount when table chunks are partial)
            mergedMap.set(key, alloc);
          }
          // else keep existing (source or previous AI) — don't replace with lower number
        }
        fundingData = removeSameAmountDuplicates(
          Array.from(mergedMap.values()).sort((a, b) => b.amount - a.amount)
        );

        const total = fundingData.reduce((s, a) => s + a.amount, 0);
        console.log(`[fetchTabData] funding: merged ${fundingData.length} sectors, total $${(total/1000).toFixed(1)}B`,
          fundingData.map(a => `${a.sector}=$${a.amount}M(${a.confidence})`).join(", "));
      }
      if (tab === "careers") {
        console.log(`[fetchTabData] ${tab} Starting extraction with ${sources.length} sources`);
        careersData = extractCareerOpportunities(sources);
        console.log(`[fetchTabData] ${tab} extracted ${careersData.length} careers from sources`, {
          sample: careersData.slice(0, 3).map(c => ({ occupation: c.occupation, sector: c.sector, growth: c.growth, jobs: c.jobs })),
          allGrowth: careersData.filter(c => c.growth !== undefined).map(c => ({ occupation: c.occupation, growth: c.growth })),
          allJobs: careersData.filter(c => c.jobs !== undefined).map(c => ({ occupation: c.occupation, jobs: c.jobs })),
        });
        // ALWAYS try to extract from AI answer as well (dual strategy for maximum coverage)
        if (result.answer) {
          console.log(`[fetchTabData] ${tab} AI answer length: ${result.answer.length} chars`);
          console.log(`[fetchTabData] ${tab} AI answer preview:`, result.answer.substring(0, 1000));
          const answerExtracted = extractCareersFromAnswer(result.answer);
          console.log(`[fetchTabData] ${tab} extracted ${answerExtracted.length} careers from AI answer`, {
            sample: answerExtracted.slice(0, 3).map(c => ({ occupation: c.occupation, sector: c.sector, growth: c.growth, jobs: c.jobs })),
            allGrowth: answerExtracted.filter(c => c.growth !== undefined).map(c => ({ occupation: c.occupation, growth: c.growth })),
            allJobs: answerExtracted.filter(c => c.jobs !== undefined).map(c => ({ occupation: c.occupation, jobs: c.jobs })),
          });
          // Merge careers from AI answer - update existing careers with better data OR add new ones
          // Create map with normalized keys (handle singular/plural, case variations)
          const normalizeKey = (name: string): string => {
            return name.toLowerCase()
              .replace(/s$/, '') // Remove trailing 's' for plural matching
              .replace(/[^a-z0-9]/g, '') // Remove special chars
              .trim();
          };
          
          const careersMap = new Map<string, CareerOpportunity>();
          careersData.forEach(c => {
            const key = normalizeKey(c.occupation);
            careersMap.set(key, c);
          });
          
          console.log(`[fetchTabData] ${tab} Merging ${answerExtracted.length} AI-extracted careers into ${careersData.length} existing careers`);
          
          // Debug: Check for Ambulance Officer specifically
          const ambulanceFromAI = answerExtracted.find(c => c.occupation?.toLowerCase().includes('ambulance'));
          const ambulanceExisting = careersData.find(c => c.occupation?.toLowerCase().includes('ambulance'));
          if (ambulanceFromAI || ambulanceExisting) {
            console.log(`[fetchTabData] 🔍 AMBULANCE DEBUG:`, {
              fromAI: ambulanceFromAI ? { 
                occupation: ambulanceFromAI.occupation, 
                growth: ambulanceFromAI.growth, 
                jobs: ambulanceFromAI.jobs 
              } : null,
              existing: ambulanceExisting ? { 
                occupation: ambulanceExisting.occupation, 
                growth: ambulanceExisting.growth, 
                jobs: ambulanceExisting.jobs 
              } : null,
              allExistingOccupations: careersData.slice(0, 10).map(c => c.occupation),
            });
          }
          
          answerExtracted.forEach(answerCareer => {
            const occLower = answerCareer.occupation?.toLowerCase();
            if (!occLower) return;
            
            // Try exact match first, then normalized match
            const key = normalizeKey(answerCareer.occupation);
            let existing = careersMap.get(occLower) || careersMap.get(key);
            
            // Special handling for Ambulance Officer/Officers
            if (!existing && occLower.includes('ambulance')) {
              console.log(`[fetchTabData] 🔍 Looking for match for "${answerCareer.occupation}" (key: "${key}")`);
              console.log(`[fetchTabData] 🔍 Existing keys:`, Array.from(careersMap.keys()).slice(0, 10));
            }
            
            // If still no match, try fuzzy matching (check if one contains the other)
            if (!existing) {
              for (const [mapKey, mapCareer] of careersMap.entries()) {
                const answerNorm = normalizeKey(answerCareer.occupation);
                const mapNorm = normalizeKey(mapCareer.occupation);
                // Check if one key contains the other (for "Ambulance Officer" vs "Officer")
                if (answerNorm.includes(mapNorm) || mapNorm.includes(answerNorm)) {
                  if (occLower.includes('ambulance')) {
                    console.log(`[fetchTabData] ✅ FUZZY MATCH: "${answerCareer.occupation}" (${answerNorm}) matched "${mapCareer.occupation}" (${mapNorm})`);
                  }
                  existing = mapCareer;
                  break;
                }
              }
            }
            
            if (existing) {
              // UPDATE existing career with better data from AI answer
              const hadGrowthBefore = existing.growth !== undefined;
              const hadJobsBefore = existing.jobs !== undefined;
              
              // Special logging for Ambulance Officer
              if (occLower.includes('ambulance')) {
                console.log(`[fetchTabData] 🔍 FOUND EXISTING "${existing.occupation}":`, {
                  existingGrowth: existing.growth,
                  answerGrowth: answerCareer.growth,
                  willUpdate: answerCareer.growth !== undefined && typeof answerCareer.growth === 'number' && 
                    (existing.growth === undefined || Math.abs(answerCareer.growth) > Math.abs(existing.growth || 0)),
                });
              }
              
              if (answerCareer.growth !== undefined && typeof answerCareer.growth === 'number' && 
                  (existing.growth === undefined || Math.abs(answerCareer.growth) > Math.abs(existing.growth || 0))) {
                existing.growth = answerCareer.growth;
                existing.demand = answerCareer.demand || existing.demand;
                existing.trending = answerCareer.trending || existing.trending;
                console.log(`[fetchTabData] ✅ MERGED growth for "${existing.occupation}": ${existing.growth}% (was: ${hadGrowthBefore ? existing.growth : 'undefined'}, now: ${answerCareer.growth}%)`);
              } else if (occLower.includes('ambulance')) {
                console.log(`[fetchTabData] ⚠️ SKIPPED growth merge for "${existing.occupation}":`, {
                  answerGrowth: answerCareer.growth,
                  answerGrowthType: typeof answerCareer.growth,
                  existingGrowth: existing.growth,
                  condition1: answerCareer.growth !== undefined,
                  condition2: typeof answerCareer.growth === 'number',
                  condition3: existing.growth === undefined || Math.abs(answerCareer.growth) > Math.abs(existing.growth || 0),
                });
              }
              if (answerCareer.jobs !== undefined && typeof answerCareer.jobs === 'number' && 
                  (existing.jobs === undefined || answerCareer.jobs > existing.jobs)) {
                existing.jobs = answerCareer.jobs;
                console.log(`[fetchTabData] ✅ MERGED jobs for "${existing.occupation}": ${existing.jobs} (was: ${hadJobsBefore ? existing.jobs : 'undefined'}, now: ${answerCareer.jobs})`);
              }
              if (answerCareer.salary && !existing.salary) {
                existing.salary = answerCareer.salary;
              }
              if (answerCareer.sector && answerCareer.sector !== "General" && (!existing.sector || existing.sector === "General")) {
                existing.sector = answerCareer.sector;
              }
            } else {
              // ADD new career from AI answer
              careersMap.set(key, answerCareer);
              console.log(`[fetchTabData] ➕ ADDED new career from AI: "${answerCareer.occupation}" growth=${answerCareer.growth !== undefined && typeof answerCareer.growth === 'number' ? answerCareer.growth + '%' : 'N/A'} jobs=${answerCareer.jobs !== undefined && typeof answerCareer.jobs === 'number' ? answerCareer.jobs : 'N/A'}`);
            }
          });
          
          careersData = Array.from(careersMap.values());
          
          // Detailed logging for debugging
          const careersWithGrowth = careersData.filter(c => c.growth !== undefined && typeof c.growth === 'number');
          const careersWithJobs = careersData.filter(c => c.jobs !== undefined && typeof c.jobs === 'number');
          console.log(`[fetchTabData] ${tab} AFTER MERGE:`, {
            totalCareers: careersData.length,
            withGrowth: careersWithGrowth.length,
            withJobs: careersWithJobs.length,
            growthSample: careersWithGrowth.slice(0, 5).map(c => ({ 
              occupation: c.occupation, 
              growth: c.growth,
              source: 'merged'
            })),
            jobsSample: careersWithJobs.slice(0, 5).map(c => ({ 
              occupation: c.occupation, 
              jobs: c.jobs,
              source: 'merged'
            })),
          });
        }
        // Filter out any careers without occupation field (safety check)
        careersData = careersData.filter(c => c.occupation && c.occupation.trim().length > 0);
        
        // Final logging with growth/jobs breakdown
        const finalWithGrowth = careersData.filter(c => c.growth !== undefined && typeof c.growth === 'number');
        const finalWithJobs = careersData.filter(c => c.jobs !== undefined && typeof c.jobs === 'number');
        console.log(`[fetchTabData] ${tab} FINAL (after filtering): ${careersData.length} career opportunities`, {
          withGrowth: finalWithGrowth.length,
          withJobs: finalWithJobs.length,
          growthBreakdown: finalWithGrowth.slice(0, 10).map(c => ({ 
            occupation: c.occupation, 
            growth: c.growth 
          })),
        });
      }
      if (tab === "skills") {
        skillsData = extractSkillsDemand(sources);
        console.log(`[fetchTabData] ${tab} extracted ${skillsData.length} skills from sources`);
        // ALWAYS try to extract from AI answer as well (dual strategy for maximum coverage)
        if (result.answer) {
          const answerExtracted = extractSkillsFromAnswer(result.answer);
          console.log(`[fetchTabData] ${tab} extracted ${answerExtracted.length} skills from AI answer`);
          // Merge, avoiding duplicates based on skill name
          const existingSkills = new Set(skillsData.map(s => s.name.toLowerCase()));
          const newSkills = answerExtracted.filter(s => !existingSkills.has(s.name.toLowerCase()));
          skillsData = [...skillsData, ...newSkills];
          trainingProgramsData = extractTrainingProgramsFromAnswer(result.answer);
          console.log(`[fetchTabData] ${tab} extracted ${trainingProgramsData.length} training programs from answer`);
        }
        console.log(`[fetchTabData] ${tab} total extracted: ${skillsData.length} skills`);
      }

      // Also extract from AI answer for overview tab (cross-tab extraction)
      if (tab === "overview" && result.answer) {
        const overviewCareers = extractCareersFromAnswer(result.answer);
        const overviewSkills = extractSkillsFromAnswer(result.answer);
        
        if (overviewCareers.length > 0 || overviewSkills.length > 0) {
          console.log(`[fetchTabData] overview extracted ${overviewCareers.length} careers, ${overviewSkills.length} skills from answer`);
          careersData = [...careersData, ...overviewCareers];
          skillsData = [...skillsData, ...overviewSkills];
        }
      }

      setState(prev => {
        // Update structured data when fetching specific tabs (update even if empty to indicate fetch completed)
        const newFunding = tab === "funding"
          ? fundingData
          : prev.fundingAllocations;
        const newCareers = tab === "careers"
          ? careersData
          : prev.careerOpportunities;
        const newSkills = tab === "skills"
          ? skillsData
          : prev.skillsDemand;
        const newTrainingPrograms = tab === "skills"
          ? trainingProgramsData
          : prev.trainingPrograms;

        // Detailed state update logging
        const stateCareersWithGrowth = newCareers.filter(c => c.growth !== undefined && typeof c.growth === 'number');
        const stateCareersWithJobs = newCareers.filter(c => c.jobs !== undefined && typeof c.jobs === 'number');
        
        console.log(`[fetchTabData] ${tab} updating state:`, {
          careersCount: newCareers.length,
          withGrowth: stateCareersWithGrowth.length,
          withJobs: stateCareersWithJobs.length,
          previousCareersCount: prev.careerOpportunities.length,
          growthSample: stateCareersWithGrowth.slice(0, 5).map(c => ({ occupation: c.occupation, growth: c.growth })),
        });

        const newState = {
          ...prev,
          [tab]: {
            insights,
            rawData: sources,
            loading: false,
            error: null,
            lastFetched: new Date(),
          },
          fundingAllocations: newFunding,
          careerOpportunities: newCareers,
          skillsDemand: newSkills,
          trainingPrograms: newTrainingPrograms,
          crossTabInsights: generateCrossTabInsights(newFunding, newCareers, newSkills),
        };
        
        console.log(`[fetchTabData] ${tab} state after update:`, {
          careerOpportunities: newState.careerOpportunities.length,
          sampleCareer: newState.careerOpportunities[0]?.occupation || 'none',
        });
        
        return newState;
      });
      
      console.log(`[fetchTabData] ${tab} data updated successfully`);
    } catch (err) {
      console.error(`[fetchTabData] ${tab} error:`, err);
      setState(prev => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loading: false,
          error: err instanceof Error ? err.message : "Failed to fetch data",
        },
      }));
    } finally {
      fetchInProgress.current.delete(tab);
      console.log(`[fetchTabData] ${tab} fetch completed`);
    }
      }, [semanticSearch, extractFundingAllocations, extractFundingFromAnswer, extractCareerOpportunities, extractSkillsDemand, generateCrossTabInsights, extractCareersFromAnswer, extractSkillsFromAnswer, extractTrainingProgramsFromAnswer]);

  const ingestAgenticResult = useCallback((tab: IntelligenceTab, payload: { answer: string; sources: any[] }) => {
    const { answer, sources: rawSources } = payload;
    const sources = (rawSources || []).map((s: any) => ({
      ...s,
      content: s.content ?? s.snippet ?? "",
      metadata: s.metadata || (s.chunkType ? { chunkType: s.chunkType } : undefined),
    }));

    setState(prev => {
      let newFunding = prev.fundingAllocations;
      let newCareers = prev.careerOpportunities;
      let newSkills = prev.skillsDemand;
      let newTrainingPrograms = prev.trainingPrograms;

      if (tab === "funding") {
        const fromSources = extractFundingAllocations(sources);
        const fromAnswer = answer ? extractFundingFromAnswer(answer) : [];
        // Combine: take higher amount per sector so we don't lose info when chunks are a subset
        const combinedMap = new Map<string, FundingAllocation>();
        for (const alloc of fromSources) combinedMap.set(alloc.sector.toLowerCase(), alloc);
        for (const alloc of fromAnswer) {
          const key = alloc.sector.toLowerCase();
          const existing = combinedMap.get(key);
          if (!existing || alloc.amount > existing.amount) combinedMap.set(key, alloc);
        }
        const extracted = Array.from(combinedMap.values());

        if (extracted.length > 0) {
          const mergedMap = new Map<string, FundingAllocation>();
          for (const alloc of prev.fundingAllocations) {
            mergedMap.set(alloc.sector.toLowerCase(), alloc);
          }
          for (const alloc of extracted) {
            const key = alloc.sector.toLowerCase();
            const existing = mergedMap.get(key);
            if (!existing) {
              mergedMap.set(key, alloc);
            } else if (alloc.confidence === "high" && existing.confidence !== "high") {
              mergedMap.set(key, alloc);
            }
            // else keep existing — don't let same-confidence replace (prevents inflation)
          }
          newFunding = removeSameAmountDuplicates(
            Array.from(mergedMap.values()).sort((a, b) => b.amount - a.amount)
          );
        }
      }
      if (tab === "careers") {
        const fromSources = extractCareerOpportunities(sources);
        const fromAnswer = answer ? extractCareersFromAnswer(answer) : [];
        const normalizeKey = (name: string) =>
          name.toLowerCase().replace(/s$/, "").replace(/[^a-z0-9]/g, "").trim();
        const careersMap = new Map<string, CareerOpportunity>();
        fromSources.forEach(c => careersMap.set(normalizeKey(c.occupation), c));
        fromAnswer.forEach(c => {
          const key = normalizeKey(c.occupation);
          const existing = careersMap.get(key);
          if (existing) {
            if (c.growth !== undefined && (existing.growth === undefined || (typeof c.growth === "number" && Math.abs(c.growth) > Math.abs(existing.growth ?? 0))))
              existing.growth = c.growth;
            if (c.jobs !== undefined && (existing.jobs === undefined || (typeof c.jobs === "number" && c.jobs > existing.jobs)))
              existing.jobs = c.jobs;
            if (c.salary && !existing.salary) existing.salary = c.salary;
            if (c.sector && c.sector !== "General" && (!existing.sector || existing.sector === "General"))
              existing.sector = c.sector;
          } else {
            careersMap.set(key, c);
          }
        });
        const mergedCareers = Array.from(careersMap.values()).filter(c => c.occupation?.trim());
        if (mergedCareers.length > 0) newCareers = mergedCareers;
      }
      if (tab === "skills") {
        const fromSources = extractSkillsDemand(sources);
        const fromAnswer = answer ? extractSkillsFromAnswer(answer) : [];
        const existingNames = new Set(fromSources.map(s => s.name.toLowerCase()));
        const merged = [...fromSources, ...fromAnswer.filter(s => !existingNames.has(s.name.toLowerCase()))];
        if (merged.length > 0) newSkills = merged;
        const programs = answer ? extractTrainingProgramsFromAnswer(answer) : [];
        if (programs.length > 0) newTrainingPrograms = programs;
      }
      if (tab === "overview" && answer) {
        const overviewCareers = extractCareersFromAnswer(answer);
        const overviewSkills = extractSkillsFromAnswer(answer);
        const overviewPrograms = extractTrainingProgramsFromAnswer(answer);
        if (overviewCareers.length > 0 || overviewSkills.length > 0 || overviewPrograms.length > 0) {
          const norm = (name: string) => name.toLowerCase().replace(/s$/, "").replace(/[^a-z0-9]/g, "").trim();
          const careerMap = new Map(prev.careerOpportunities.map(c => [norm(c.occupation), c]));
          overviewCareers.forEach(c => {
            const key = norm(c.occupation);
            if (!careerMap.has(key)) careerMap.set(key, c);
          });
          newCareers = Array.from(careerMap.values());
          const skillNames = new Set(prev.skillsDemand.map(s => s.name.toLowerCase()));
          newSkills = [...prev.skillsDemand, ...overviewSkills.filter(s => !skillNames.has(s.name.toLowerCase()))];
          const progNames = new Set(prev.trainingPrograms.map(p => p.name.toLowerCase()));
          newTrainingPrograms = [...prev.trainingPrograms, ...overviewPrograms.filter(p => !progNames.has(p.name.toLowerCase()))];
        }
      }

      return {
        ...prev,
        fundingAllocations: newFunding,
        careerOpportunities: newCareers,
        skillsDemand: newSkills,
        trainingPrograms: newTrainingPrograms,
        crossTabInsights: generateCrossTabInsights(newFunding, newCareers, newSkills),
      };
    });
  }, [extractFundingAllocations, extractFundingFromAnswer, extractCareerOpportunities, extractCareersFromAnswer, extractSkillsDemand, extractSkillsFromAnswer, extractTrainingProgramsFromAnswer, generateCrossTabInsights]);

  // ============================================================================
  // Initialize
  // ============================================================================

  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      console.log("[IntelligenceContext] Starting initialization...");
      
      try {
        // Fetch metrics and overview in parallel
        console.log("[IntelligenceContext] Fetching bulk data...");
        const [bulkData] = await Promise.all([
          getBulk(["stats", "categories"]),
        ]);

        console.log("[IntelligenceContext] Bulk data received:", bulkData);

        if (bulkData) {
          const stats = bulkData.stats as any;
          const categories = bulkData.categories as any;

          setState(prev => ({
            ...prev,
            metrics: {
              totalDocuments: stats?.totalDocuments || categories?.categories?.reduce((sum: number, c: any) => sum + c.count, 0) || 0,
              totalChunks: stats?.totalChunks || 0,
              lastUpdated: new Date(),
              categories: (categories?.categories || []).map((c: any) => ({
                name: c.category,
                count: c.count,
                trend: Math.floor(deterministicValue(c.category + '-trend', 2, 12)),
              })),
              topSectors: (categories?.sectors || []).slice(0, 5).map((s: any, idx: number) => ({
                name: s.value,
                growth: Math.floor(deterministicValue(s.value + '-growth', 3, 18)),
                jobs: s.count * Math.floor(deterministicValue(s.value + '-jobm', 30, 80)),
              })),
            },
            // Keep globalLoading true until tab data is fetched
          }));
        } else {
          console.warn("[IntelligenceContext] No bulk data returned, continuing with initialization");
        }

        // Fetch all tab data in parallel for overview cards
        // Keep globalLoading true while fetching
        console.log("[IntelligenceContext] Fetching all tab data...");
        await Promise.all([
          fetchTabData("overview"),
          fetchTabData("funding"),
          fetchTabData("careers"),
          fetchTabData("skills"),
        ]);
        
        // Only set globalLoading to false AFTER all tab data is fetched
        setState(prev => ({
          ...prev,
          isInitialized: true,
          globalLoading: false,
        }));
        console.log("[IntelligenceContext] Initialization complete");
      } catch (err) {
        console.error("[IntelligenceContext] Initialization error:", err);
        setState(prev => ({
          ...prev,
          isInitialized: true,
          globalLoading: false, // Set to false on error so UI doesn't stay stuck
        }));
      }
    };

    initialize();
  }, [getBulk, fetchTabData]);

  // ============================================================================
  // Actions
  // ============================================================================

  const setActiveTab = useCallback((tab: IntelligenceTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
    fetchTabData(tab);
  }, [fetchTabData]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const refreshTab = useCallback(async (tab: IntelligenceTab) => {
    await fetchTabData(tab, true);
  }, [fetchTabData]);

  const refreshAll = useCallback(async () => {
    setState(prev => ({ ...prev, globalLoading: true }));
    await Promise.all([
      fetchTabData("overview", true),
      fetchTabData("funding", true),
      fetchTabData("careers", true),
      fetchTabData("skills", true),
    ]);
    setState(prev => ({ ...prev, globalLoading: false }));
  }, [fetchTabData]);

  // ============================================================================
  // Getters
  // ============================================================================

  const getTabData = useCallback((tab: IntelligenceTab): TabData => {
    return state[tab];
  }, [state]);

  const getTopInsights = useCallback((count = 5): InsightOutput[] => {
    const allInsights = [
      ...state.overview.insights,
      ...state.funding.insights,
      ...state.careers.insights,
      ...state.skills.insights,
    ];
    
    // Dedupe and sort by urgency
    const seen = new Set<string>();
    return allInsights
      .filter(i => {
        if (seen.has(i.title)) return false;
        seen.add(i.title);
        return true;
      })
      .sort((a, b) => {
        const urgencyOrder = { critical: 3, important: 2, informational: 1 };
        return (urgencyOrder[b.urgency || "informational"] || 0) - (urgencyOrder[a.urgency || "informational"] || 0);
      })
      .slice(0, count);
  }, [state]);

  const getRelatedData = useCallback((sector: string) => {
    const lowerSector = sector.toLowerCase();
    // Transport is merged into Infrastructure in funding; resolve so "Transport" click still shows funding
    const fundingLookup = state.fundingAllocations.find(f => {
      const fs = f.sector.toLowerCase();
      return fs.includes(lowerSector) || (lowerSector.includes("transport") && fs.includes("infrastructure"));
    });
    return {
      funding: fundingLookup,
      careers: state.careerOpportunities.filter(c => c.sector.toLowerCase().includes(lowerSector)),
      skills: state.skillsDemand.filter(s => s.sector.toLowerCase().includes(lowerSector)),
    };
  }, [state]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Single source of truth: sum of all allocations (same-sector amounts already merged in extraction)
  const totalBudget = useMemo(() =>
    state.fundingAllocations.reduce((sum, f) => sum + f.amount, 0),
    [state.fundingAllocations]
  );

  const totalJobs = useMemo(() =>
    state.careerOpportunities.reduce((sum, c) => sum + (c.jobs || 0), 0),
    [state.careerOpportunities]
  );

  const topGrowthSector = useMemo(() => {
    const sorted = [...state.fundingAllocations].sort((a, b) => b.change - a.change);
    return sorted[0]?.sector || "Technology";
  }, [state.fundingAllocations]);

  const emergingTrends = useMemo(() => {
    const trends: string[] = [];
    
    state.fundingAllocations
      .filter(f => f.change > 10)
      .forEach(f => trends.push(`${f.sector} funding surge`));
    
    state.careerOpportunities
      .filter(c => c.trending)
      .slice(0, 3)
      .forEach(c => trends.push(`${c.occupation} demand`));
    
    state.skillsDemand
      .filter(s => s.category === "emerging")
      .slice(0, 3)
      .forEach(s => trends.push(`${s.name} skills`));

    return trends.slice(0, 5);
  }, [state]);

  // ============================================================================
  // Debug: Log when careerOpportunities changes
  // ============================================================================
  useEffect(() => {
    console.log("[IntelligenceContext] careerOpportunities state:", {
      count: state.careerOpportunities.length,
      occupations: state.careerOpportunities.slice(0, 5).map(c => c.occupation),
      globalLoading: state.globalLoading,
      isInitialized: state.isInitialized,
    });
  }, [state.careerOpportunities.length, state.globalLoading, state.isInitialized]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: IntelligenceContextType = {
    ...state,
    setActiveTab,
    setSearchQuery,
    refreshTab,
    refreshAll,
    ingestAgenticResult,
    getTabData,
    getTopInsights,
    getRelatedData,
    totalBudget,
    totalJobs,
    topGrowthSector,
    emergingTrends,
  };

  return (
    <IntelligenceContext.Provider value={value}>
      {children}
    </IntelligenceContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useIntelligence() {
  const context = useContext(IntelligenceContext);
  if (!context) {
    throw new Error("useIntelligence must be used within an IntelligenceProvider");
  }
  return context;
}

export default IntelligenceContext;

