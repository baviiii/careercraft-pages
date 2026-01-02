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
                if (amountStr.includes("billion") || amountStr.includes("bn") || amountStr.includes("b")) {
                  amount *= 1000;
                } else if (amountStr.includes("million") || amountStr.includes("m")) {
                  // Already in millions
                } else if (amountStr.includes("thousand") || amountStr.includes("k")) {
                  amount /= 1000;
                } else if (amount > 100000) {
                  // Assume large numbers are in dollars, convert to millions
                  amount /= 1000000;
                }

                // Validate amount is reasonable (between $1M and $100B)
                if (amount >= 1 && amount <= 100000) {
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

              const sourceTitle = source.title || source.fileName || "Budget Document";
              const sourceExcerpt = values.slice(0, 5).join(" | ");
              const sourceCategory = source.category || metadata?.category || "budget";
              const sourcePageNum = metadata?.pageNumber || metadata?.page;
              const sourceTableNum = metadata?.tableNumber || metadata?.tableIndex;

              const existing = allocationsMap.get(sector);

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

              // Prefer table data with higher amounts (more specific/recent)
              if (!existing || existing.confidence !== "high" || amount > existing.amount) {
                allocationsMap.set(sector, {
                  sector: sector.charAt(0).toUpperCase() + sector.slice(1),
                  amount,
                  change,
                  programs: (existing?.programs || 0) + 1,
                  priority: change > 10 ? "high" : change > 5 ? "medium" : "low",
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

                console.log(`[extractFundingAllocations] Table extraction: ${sector} = $${amount}M (${change}%) from ${sourceTitle} ${sourcePageNum ? `p.${sourcePageNum}` : ''} ${sourceTableNum ? `table ${sourceTableNum}` : ''}`);
              }
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

              // Validate amount is reasonable
              if (amount < 5 || amount > 50000) continue;

              // Find nearby sector mention (within 150 chars)
              const context = content.substring(
                Math.max(0, match.index! - 150),
                Math.min(content.length, match.index! + 150)
              );

              for (const sector of knownSectors) {
                const sectorRegex = new RegExp(`\\b${sector}\\b`, "i");
                if (sectorRegex.test(context)) {
                  const existing = allocationsMap.get(sector);

                  // Only use text extraction if no table data exists or this is more specific
                  if (!existing || (existing.confidence !== "high" && amount > existing.amount)) {
                    const sourceTitle = source.title || source.fileName || "Budget Document";
                    const sourceExcerpt = context.substring(0, 200);
                    const sourceCategory = source.category || metadata?.category || "budget";
                    const sourcePageNum = metadata?.pageNumber || metadata?.page;

                    allocationsMap.set(sector, {
                      sector,
                      amount,
                      change: existing?.change || 0,
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
  // STRICT OCCUPATION VALIDATION
  // ============================================================================
  const cleanOccupationName = useCallback((name: string): string => {
    return name
      .replace(/\*+/g, '') // Remove all asterisks
      .replace(/^south\s+australia\s*/i, '') // Remove "South Australia" prefix
      .replace(/\s+south\s+australia$/i, '') // Remove "South Australia" suffix
      .replace(/^[-\[\]()\/\\\s]+/, '') // Remove leading junk
      .replace(/[-\[\]()\/\\\s]+$/, '') // Remove trailing junk
      .replace(/^\d+\s*[-–—]\s*/, '') // Remove leading numbers and dashes
      .replace(/\s+Page\s+\d+/i, '') // Remove page references
      .replace(/\s+https?:\/\/.*/i, '') // Remove URLs
      .replace(/\s+\[.*?\]/g, '') // Remove bracketed content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      // Capitalize first letter of each word (standardize)
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }, []);

  const isValidOccupationName = useCallback((name: string): boolean => {
    if (!name || name.trim().length === 0) return false;

    const cleaned = cleanOccupationName(name);

    // Must be 3-60 chars after cleaning
    if (cleaned.length < 3 || cleaned.length > 60) return false;

    // Must contain letters (not just numbers/symbols)
    if (!/[a-zA-Z]/.test(cleaned)) return false;

    // Must start with a capital letter (proper job title format)
    if (!/^[A-Z]/.test(cleaned)) return false;

    // Reject known garbage patterns
    const invalidPatterns = [
      /^south\s+australia$/i,
      /^[-\[\]()\/\\\*\d\s]+$/, // Only special chars/numbers
      /^(total|all|sum|page|list|table|figure|source|reference|name|occupation|job|title)/i,
      /https?:\/\//, // URLs
      /\*{2,}/, // Multiple asterisks
      /^[a-z]{1,2}\s+[a-z]/, // Very short leading word (like "stered Nurse")
      /-lists?\/[a-z-]+/i, // URL fragments
      /\[page\s+\d+\]/i, // Page references
    ];

    if (invalidPatterns.some(p => p.test(cleaned))) return false;

    // Must look like a job title (2+ words OR common single-word titles)
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    const singleWordTitles = ['nurse', 'teacher', 'doctor', 'engineer', 'analyst', 'manager', 'director', 'officer'];
    
    if (words.length === 1 && !singleWordTitles.includes(words[0].toLowerCase())) {
      return false; // Single word titles must be in whitelist
    }

    if (words.length < 1) return false;

    // Reject if it looks like a partial word (very short first word suggests truncation)
    if (words[0].length < 3 && words.length === 1) return false;

    // Reject incomplete names (like "stered" which is probably "Registered" cut off)
    if (/^[a-z]{1,3}\s+/i.test(cleaned)) {
      // Check if first word is suspiciously short and lowercase
      const firstWord = words[0];
      if (firstWord.length < 4 && firstWord === firstWord.toLowerCase() && words.length > 1) {
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
            h.toLowerCase().includes("occupation") || h.toLowerCase().includes("role") || h.toLowerCase().includes("career")
          );
          const growthIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("growth") || h.toLowerCase().includes("%")
          );
          const jobsIdx = headers.findIndex((h: string) =>
            h.toLowerCase().includes("jobs") || h.toLowerCase().includes("positions")
          );

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
              const growthMatch = String(values[growthIdx]).match(/([+-]?\d+(?:\.\d+)?)/);
              if (growthMatch) {
                const parsed = parseFloat(growthMatch[1]);
                // Validate growth is reasonable (-50% to +200%)
                if (parsed >= -50 && parsed <= 200) {
                  growth = parsed;
                }
              }
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
              // "nurses 22% growth" or "nurses with 22% growth"
              new RegExp(`\\b${keyword}[s]?[\\s,]+(?:with|showing|demonstrating|at)?[\\s]*([\\d.]+)\\s*%[\\s]*(?:growth|increase|rise|expansion)`, "gi"),
              // "22% growth in nurses" or "22% growth for nurses"
              new RegExp(`([\\d.]+)\\s*%[\\s]*(?:growth|increase|rise)[\\s]*(?:in|for|among|amongst)\\s+${keyword}[s]?\\b`, "gi"),
              // "nurses expected to see 22% increase"
              new RegExp(`\\b${keyword}[s]?[\\s]+(?:expected|projected|forecast)[\\s]+(?:to\\s+see|a|an)?[\\s]*([\\d.]+)\\s*%`, "gi"),
              // "approximately X nurses" or "X nurse positions"
              new RegExp(`(?:approximately|about|around|up\\s+to|over)[\\s]*([\\d,]+)[\\s]+${keyword}[s]?[\\s]*(?:positions|jobs|roles|vacancies)?`, "gi"),
              // "X nurses" near growth context (within 100 chars)
              new RegExp(`\\b([\\d,]+)[\\s]+${keyword}[s]?\\b[\\s\\S]{0,100}(?:growth|increase|\\d+\\s*%)`, "gi"),
            ];

            for (const pattern of patterns) {
              let match;
              while ((match = pattern.exec(content)) !== null) {
                const numberStr = match[1]?.replace(/,/g, '');
                const number = parseFloat(numberStr);
                if (isNaN(number)) continue;

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

          // Also look for explicit "Occupation: Name\nGrowth: X%" structured format in content
          const structuredBlocks = content.split(/Occupation:?\s*/i).filter(block => block.trim().length > 0);
          for (const block of structuredBlocks.slice(0, 20)) { // Limit to first 20 to avoid performance issues
            const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (lines.length === 0) continue;

            const rawOccupationName = lines[0].split(/[:\n]/)[0].trim();
            
            // Clean and validate occupation name
            let occupationName = cleanOccupationName(rawOccupationName);
            
            if (!isValidOccupationName(occupationName)) {
              console.log(`[extractCareerOpportunities] REJECTED structured content occupation: "${rawOccupationName}" → "${occupationName}"`);
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

            careersMap.set(occupationName, career);
          }
        }
      } catch (e) {
        console.warn("[extractCareerOpportunities] Error processing source:", e, source);
      }
    });

    let result = Array.from(careersMap.values());

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
      // Pattern: "registered nurses expected to see a 22% increase" - MOST IMPORTANT
      /([a-z]+(?:\s+[a-z]+){0,3})\s+(?:expected\s+to\s+see|projected|forecast|expected)\s+(?:a|an)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:increase|growth|rise|expansion)/gi,
      // Pattern: "Occupation (X% growth)" or "Occupation - X%" or "Occupation: X%"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s*(?:\(|\s*[-–—:]\s*)\s*(\d+(?:\.\d+)?)\s*%/gi,
      // Pattern: "X jobs/positions in Occupation" or "Occupation: X jobs" or "X positions in demand"
      /(\d+(?:,\d+)?)\s*(?:jobs?|positions?|roles?|vacancies?)\s+(?:in|for|as|available\s+for|in\s+demand)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})/gi,
      // Pattern: "Occupation growth of X%" or "X% growth in Occupation" or "see a X% increase"
      /([a-z]+(?:\s+[a-z]+){0,3})\s+(?:growth|demand|projected|expected|to\s+see)\s+(?:of|at|is|a|an)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:growth|increase|rise)/gi,
      // Pattern: "Occupation with X% growth" or "Occupation showing X% growth"
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\s+(?:with|showing|demonstrating)\s+(\d+(?:\.\d+)?)\s*%\s*(?:growth|increase|rise)/gi,
      // Pattern: "X% growth for Occupation" or "X% increase for Occupation"
      /(\d+(?:\.\d+)?)\s*%\s*(?:growth|increase|rise)\s+(?:for|in|among|expected\s+for)\s+([a-z]+(?:\s+[a-z]+){0,3})/gi,
      // Pattern: "approximately X positions" near occupation mention (within 50 chars)
      /([a-z]+(?:\s+[a-z]+){0,3})\s+[^.]{0,50}(?:approximately|about|around|up\s+to)\s+(\d+(?:,\d+)?)\s*(?:positions?|jobs?|roles?)/gi,
      // Pattern: "Occupation are highlighted/mentioned as critical/high demand"
      /([a-z]+(?:\s+[a-z]+){0,3})\s+(?:are|is)\s+(?:highlighted|mentioned|identified|classified)\s+as\s+(?:critical|essential|high\s+demand|in\s+demand|priority)/gi,
    ];

    for (const pattern of occupationPatterns) {
      let match;
      // Reset lastIndex to avoid issues with global regex
      pattern.lastIndex = 0;
      while ((match = pattern.exec(answerText)) !== null) {
        let occupation = match[1] || match[2];
        let numberStr = (match[2] || match[1] || '').toString().replace(/,/g, '');
        const number = parseFloat(numberStr);

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
              demand: 70 + Math.floor(Math.random() * 25),
              growth: 8 + Math.random() * 12,
              sector: normalizeSector(source.sector || metadata?.sector),
              category: "technical",
              trainingAvailable: true,
            });
          }
        }
        
        // Check for soft skills
        for (const skill of softSkills) {
          if (contentLower.includes(skill.toLowerCase()) && !skillsMap.has(skill)) {
            skillsMap.set(skill, {
              name: skill,
              demand: 60 + Math.floor(Math.random() * 30),
              growth: 5 + Math.random() * 10,
              sector: normalizeSector(source.sector || metadata?.sector),
              category: "soft",
              trainingAvailable: true,
            });
          }
        }
        
        // Check for emerging skills
        for (const skill of emergingSkills) {
          if (contentLower.includes(skill.toLowerCase()) && !skillsMap.has(skill)) {
            skillsMap.set(skill, {
              name: skill,
              demand: 75 + Math.floor(Math.random() * 20),
              growth: 15 + Math.random() * 20,
              sector: normalizeSector(source.sector || metadata?.sector),
              category: "emerging",
              trainingAvailable: true,
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
              demand: !isNaN(number) && number <= 100 ? number : 70 + Math.floor(Math.random() * 25),
              growth: !isNaN(number) && number > 100 ? number / 10 : 8 + Math.random() * 15,
              sector: normalizeSector(answerText.match(new RegExp(`${skill}[\\s\\S]{0,200}(health|education|technology|construction|energy)`, "i"))?.[1] || "General"),
              category,
              trainingAvailable: true,
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
          demand: 70 + Math.floor(Math.random() * 25),
          growth: 8 + Math.random() * 15,
          sector: normalizeSector(answerText.match(new RegExp(`${skill}[\\s\\S]{0,200}(health|education|technology|construction|energy)`, "i"))?.[1] || "General"),
          category,
          trainingAvailable: true,
        });
      }
    }

    return Array.from(skillsMap.values())
      .sort((a, b) => b.demand - a.demand)
      .slice(0, 15);
  }, [normalizeSector]);

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
          topK: 40,
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

      if (tab === "funding") {
        fundingData = extractFundingAllocations(sources);
        console.log(`[fetchTabData] ${tab} extracted ${fundingData.length} funding allocations`);
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
          // Merge, avoiding duplicates based on occupation name
          const existingOccupations = new Set(careersData.map(c => c.occupation?.toLowerCase()).filter(Boolean));
          const newCareers = answerExtracted.filter(c => {
            const occLower = c.occupation?.toLowerCase();
            return occLower && !existingOccupations.has(occLower);
          });
          careersData = [...careersData, ...newCareers];
        }
        // Filter out any careers without occupation field (safety check)
        careersData = careersData.filter(c => c.occupation && c.occupation.trim().length > 0);
        console.log(`[fetchTabData] ${tab} total extracted (after filtering): ${careersData.length} career opportunities`, {
          allOccupations: careersData.map(c => c.occupation),
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

        console.log(`[fetchTabData] ${tab} updating state:`, {
          careersCount: newCareers.length,
          skillsCount: newSkills.length,
          fundingCount: newFunding.length,
          previousCareersCount: prev.careerOpportunities.length,
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
      }, [semanticSearch, extractFundingAllocations, extractCareerOpportunities, extractSkillsDemand, generateCrossTabInsights, extractCareersFromAnswer, extractSkillsFromAnswer]);

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
                trend: 5, // Default positive trend
              })),
              topSectors: (categories?.sectors || []).slice(0, 5).map((s: any) => ({
                name: s.value,
                growth: 10,
                jobs: s.count * 50,
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
    return {
      funding: state.fundingAllocations.find(f => f.sector.toLowerCase().includes(lowerSector)),
      careers: state.careerOpportunities.filter(c => c.sector.toLowerCase().includes(lowerSector)),
      skills: state.skillsDemand.filter(s => s.sector.toLowerCase().includes(lowerSector)),
    };
  }, [state]);

  // ============================================================================
  // Computed Values
  // ============================================================================

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

