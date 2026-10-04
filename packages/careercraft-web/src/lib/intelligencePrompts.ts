/**
 * HORUS — Intelligence Dashboard prompts
 *
 * These are caller prompts for Horus `rag.query`, which already holds the
 * grounding rules: answer only from the numbered passages, cite each claim as
 * [n], quote figures as written, say so when the passages don't cover
 * something. So these prompts set the briefing's voice and the exact text
 * format the parsers in IntelligenceContext read — and nothing that competes
 * with those rules.
 *
 * Earlier versions asked the model to "detect patterns that are not explicitly
 * stated" and "infer intent", carried sample figures (Health $1.9B, Registered
 * Nurse 22%, 3,500 jobs) that are exactly the numbers that leak into answers,
 * and repeated the record formats inside the search queries, which also drive
 * retrieval. The careers tab came back empty and the funding tab refused.
 *
 * Record formats stay byte-compatible with the parsers:
 *   "Occupation: …\nSector: …\nGrowth: …\nJob Count: …"  → extractCareersFromAnswer
 *   "Program: … | Provider: … | Skills: …"                  → extractTrainingProgramsFromAnswer
 *   "**[Title]** … **Why this matters:** … **Evidence signal:**" → parseInsightResponse
 */

export type IntelligenceTab = "overview" | "funding" | "careers" | "skills";

/**
 * Insight output format for consistent UX
 */
export interface InsightOutput {
  title: string;
  explanation: string;
  whyItMatters: string;
  evidenceSignal: string;
  category?: string;
  confidence?: "high" | "medium" | "low";
  trendDirection?: "up" | "down" | "stable";
  urgency?: "critical" | "important" | "informational";
  visualSuggestion?: "trend-line" | "comparison-bar" | "delta-chart" | "heatmap";
}

/**
 * The briefing voice shared by every tab.
 */
export const INTELLIGENCE_ANALYST_SYSTEM_PROMPT = `You write briefings for a dashboard about South Australian government priorities: funding, jobs, skills and policy. Readers are job seekers, career changers and people planning training — not policy specialists.

Each insight answers at least one of: what is changing, who it affects, or what it shows about the direction government is taking. Where several passages speak to the same thing, connect them.

Write each insight in exactly this format:

**[Insight title]**
One or two sentences stating the finding.

**Why this matters:** One sentence on who it affects or what decision it informs.

**Evidence signal:** The passages and figures the finding rests on.

Be specific: name the program, sector or occupation, and keep figures as the passage writes them. Plain English, no filler.`;

/**
 * Tab-specific instructions — what to cover and, where a parser reads the
 * answer, the exact record format.
 */
export const TAB_PROMPTS: Record<IntelligenceTab, string> = {
  overview: `Tab: overview.

Write 3 to 5 insights about the biggest cross-government shifts in the passages: where investment is going, where jobs are growing, and where the two meet or pull apart. Prefer signals that cut across departments over single-department detail.`,

  funding: `Tab: funding.

Write 3 to 5 insights about what the budget passages show about government priorities: which areas receive the largest stated amounts, what is new or ending, and where funding is tied to federal initiatives. Name each measure and give its amount exactly as the passage states it, with its year. Do not add amounts together.`,

  careers: `Tab: careers.

List the occupations the passages describe as in demand, growing, or in shortage — up to 15. Write only the records, one blank line between them, in exactly this format:

Occupation: [occupation name]
Sector: [sector]
Growth: [growth percentage, if a passage states one]
Job Count: [employment or vacancy number, if a passage states one]
Demand: [High, Medium or Low — only if a passage says so]
Region: [region, if a passage states one]

Leave out any line a passage does not state. An occupation the passages name without a figure still belongs on the list, with only its Occupation and Sector lines.`,

  skills: `Tab: skills.

Write 3 to 5 insights about the skills the passages name as in demand, in shortage, or targeted by funding or training. For each, say what kind of skill it is (technical, digital, trade, care, emerging) and connect it to the training pathway or funding the passages mention.

If the passages name training programs, courses or pathways, add this block after the insights:

**Training programs:**
Program: [name] | Provider: [organisation] | Skills: [comma-separated] | Duration: [as stated] | Funding: [as stated]

One line per program; leave out any field the passage does not state, and leave out the block if no programs are named.`,
};

/**
 * Get the full prompt for a specific tab
 */
export function getTabPrompt(tab: IntelligenceTab): string {
  return `${INTELLIGENCE_ANALYST_SYSTEM_PROMPT}\n\n${TAB_PROMPTS[tab]}`;
}

/**
 * Semantic search query templates — Optimized for intelligence extraction
 */
export const SEMANTIC_QUERIES: Record<IntelligenceTab, {
  primary: string;
  secondary?: string[];
  filters?: {
    category?: string;
    documentType?: "pdf" | "web" | "all";
  };
}> = {
  overview: {
    primary: `What are the most significant shifts in South Australian government budget priorities, workforce demand and policy direction for 2024-25, and which sectors are receiving the most investment?`,
    secondary: [
      "Which SA sectors show the largest funding increases AND workforce growth simultaneously in 2024-25?",
      "What new government programs or major initiatives launched in SA in 2024-25?",
      "Where are the biggest gaps between government investment and available skilled workforce in SA?",
    ],
    filters: { documentType: "all" },
  },
  funding: {
    primary: `What does the South Australian 2024-25 budget allocate to each sector and program, and which measures are new, increased or ending?`,
    secondary: [
      "What are the exact dollar allocations for Health, Infrastructure, Education, Defence, Energy, and Housing in the SA 2024-25 budget?",
      "Which SA sectors received the largest funding increases or decreases in 2024-25 and by what percentage?",
      "What new programs launched and what programs are ending or receiving one-off funding in SA 2024-25?",
    ],
    // No category filter — budget tables live in agency statements, fiscal docs, etc.; category eq 'budget' was too restrictive and returned too few chunks (~$7.9B). Search across all docs so we get full allocation tables.
    filters: { documentType: "all" },
  },
  careers: {
    primary: `Which occupations in South Australia are in demand, growing or in shortage, and what employment growth or vacancy figures do government workforce documents state for them?`,
    secondary: [
      "Which SA occupations have explicit projected growth percentages above 10% in government documents?",
      "What are the current job vacancy counts or total employment numbers by occupation in South Australia?",
      "Which occupations are listed as critical shortage or priority occupations in SA government workforce documents?",
      "What salary ranges are explicitly stated for SA public sector and high-demand private sector roles?",
      "Which emerging roles appear in SA 2024-25 workforce strategy, digital economy, or defence industry documents?",
      "What is the total employment size of key SA sectors like healthcare, construction, defence, and technology?",
      "Which SA regions outside Adelaide show the strongest occupation demand or skills shortages?",
    ],
    filters: { documentType: "all" },
  },
  skills: {
    primary: `Which skills and qualifications are in demand or in shortage in South Australia, and which TAFE SA courses and government-funded training programs support them?`,
    secondary: [
      "Which specific technical skills or qualifications appear on SA skills shortage lists or critical occupation lists?",
      "What qualifications and certifications are SA government programs explicitly funding or subsidising in 2024-25?",
      "Which digital, AI, green energy, or emerging technology skills are explicitly prioritised in SA policy documents?",
      "What skills gaps are explicitly identified in SA healthcare, construction, defence, and technology sectors?",
      "Which TAFE SA courses or apprenticeship programs have the highest government investment or enrolment targets?",
    ],
    filters: { documentType: "all" },
  },
};

/**
 * Parse AI response into structured insights
 * Supports multiple formats and robust extraction
 */
export function parseInsightResponse(response: string): InsightOutput[] {
  const insights: InsightOutput[] = [];
  
  if (!response || response.trim().length === 0) {
    console.log("[HORUS] Empty response received");
    return insights;
  }

  console.log("[HORUS] Parsing intelligence response, length:", response.length);
  
  // Strategy 1: **[Title]** format
  let insightBlocks = response.split(/\*\*\[/).filter(block => block.trim());
  
  for (const block of insightBlocks) {
    const titleMatch = block.match(/^([^\]]+)\]\*\*/);
    if (!titleMatch) continue;
    
    const title = titleMatch[1].trim();
    const content = block.substring(titleMatch[0].length);
    const parsed = parseInsightContent(title, content);
    if (parsed) insights.push(parsed);
  }
  
  // Strategy 2: **Title** (bold without brackets)
  if (insights.length === 0) {
    const boldMatches = response.matchAll(/\*\*([^*\n]+)\*\*\n([^*]*?)(?=\*\*[^*\n]+\*\*\n|$)/gs);
    for (const match of boldMatches) {
      const title = match[1].trim();
      const content = match[2].trim();
      // Skip labels
      if (title.toLowerCase().includes("why") || title.toLowerCase().includes("evidence")) continue;
      if (title.length < 5 || title.length > 120) continue;
      const parsed = parseInsightContent(title, content);
      if (parsed) insights.push(parsed);
    }
  }
  
  // Strategy 3: ### Header format
  if (insights.length === 0) {
    const headerBlocks = response.split(/###\s+/).filter(block => block.trim());
    for (const block of headerBlocks) {
      const lines = block.split('\n');
      const title = lines[0]?.trim();
      const content = lines.slice(1).join('\n');
      if (title && title.length > 5 && title.length < 120) {
        const parsed = parseInsightContent(title, content);
        if (parsed) insights.push(parsed);
      }
    }
  }
  
  // Strategy 4: Numbered list (1. Title or 1. **Title**)
  if (insights.length === 0) {
    const numberedMatches = response.matchAll(/^\d+\.\s*\*?\*?([^*\n:]+)\*?\*?[:\s]*([\s\S]*?)(?=^\d+\.|$)/gm);
    for (const match of numberedMatches) {
      const title = match[1].trim();
      const content = match[2].trim();
      if (title && title.length > 5) {
        const parsed = parseInsightContent(title, content);
        if (parsed) insights.push(parsed);
      }
    }
  }
  
  // Strategy 5: Paragraph-based extraction
  if (insights.length === 0 && response.length > 100) {
    console.log("[HORUS] Using paragraph-based extraction");
    const paragraphs = response.split(/\n\n+/).filter(p => p.trim().length > 50);
    
    for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
      const para = paragraphs[i].trim();
      const firstSentence = para.match(/^[^.!?]+[.!?]/)?.[0] || para.substring(0, 80);
      const rest = para.substring(firstSentence.length).trim();
      
      insights.push({
        title: firstSentence.replace(/^\d+\.\s*/, '').trim(),
        explanation: rest || "Analysis based on government document data.",
        whyItMatters: "Relevant to government policy and strategic planning.",
        evidenceSignal: "Derived from semantic analysis of indexed documents.",
        confidence: "medium",
        trendDirection: determineTrend(para),
        urgency: determineUrgency(para),
      });
    }
  }
  
  console.log("[HORUS] Extracted", insights.length, "intelligence insights");
  return insights;
}

/**
 * Helper to parse insight content sections
 */
function parseInsightContent(title: string, content: string): InsightOutput | null {
  if (!title || title.length < 3) return null;
  
  // Clean title
  title = title.replace(/^\*\*|\*\*$/g, '').replace(/^\[|\]$/g, '').trim();
  
  // Extract explanation (text before "Why this matters")
  const explanationMatch = content.match(/^([\s\S]*?)(?:\*\*Why this matters|\*\*Evidence|Why this matters|Evidence signal|$)/i);
  let explanation = explanationMatch ? explanationMatch[1].trim() : content.split('\n')[0]?.trim() || "";
  explanation = explanation.replace(/^\*\*|\*\*$/g, '').trim();
  
  // Extract "Why this matters"
  const whyMatch = content.match(/(?:\*\*)?Why this matters:?(?:\*\*)?\s*([\s\S]*?)(?:\*\*Evidence|Evidence signal|$)/i);
  const whyItMatters = whyMatch ? whyMatch[1].trim().replace(/^\*\*|\*\*$/g, '') : "";
  
  // Extract evidence signal
  const evidenceMatch = content.match(/(?:\*\*)?Evidence signal:?(?:\*\*)?\s*([\s\S]*?)$/i);
  const evidenceSignal = evidenceMatch ? evidenceMatch[1].trim().replace(/^\*\*|\*\*$/g, '') : "";
  
  if (!explanation && !whyItMatters) return null;
  
  return {
    title,
    explanation: explanation || "See detailed analysis below.",
    whyItMatters: whyItMatters || "Relevant to government policy and strategic planning.",
    evidenceSignal: evidenceSignal || "Based on indexed document analysis.",
    confidence: determineConfidence(evidenceSignal || content),
    trendDirection: determineTrend(explanation + whyItMatters),
    urgency: determineUrgency(explanation + whyItMatters),
    visualSuggestion: determineVisualization(explanation + whyItMatters),
  };
}

/**
 * Determine confidence level based on evidence quality
 */
function determineConfidence(evidence: string): "high" | "medium" | "low" {
  const strongIndicators = ["table", "data shows", "statistics", "report confirms", "multiple sources", "year-over-year", "percentage", "$", "billion", "million"];
  const weakIndicators = ["suggests", "may", "possibly", "could", "appears"];
  
  const lowerEvidence = evidence.toLowerCase();
  const strongCount = strongIndicators.filter(i => lowerEvidence.includes(i)).length;
  const weakCount = weakIndicators.filter(i => lowerEvidence.includes(i)).length;
  
  if (strongCount >= 2) return "high";
  if (weakCount >= 2 || strongCount === 0) return "low";
  return "medium";
}

/**
 * Determine trend direction from text
 */
function determineTrend(text: string): "up" | "down" | "stable" {
  const lowerText = text.toLowerCase();
  const upIndicators = ["growth", "increase", "rising", "expanding", "acceleration", "surge", "boost", "gain", "higher"];
  const downIndicators = ["decline", "decrease", "falling", "reducing", "contraction", "drop", "cut", "lower", "reduction"];
  
  const upCount = upIndicators.filter(i => lowerText.includes(i)).length;
  const downCount = downIndicators.filter(i => lowerText.includes(i)).length;
  
  if (upCount > downCount) return "up";
  if (downCount > upCount) return "down";
  return "stable";
}

/**
 * Determine urgency level
 */
function determineUrgency(text: string): "critical" | "important" | "informational" {
  const lowerText = text.toLowerCase();
  const criticalIndicators = ["urgent", "critical", "immediate", "shortage", "crisis", "deadline", "risk", "warning", "alert"];
  const importantIndicators = ["significant", "notable", "key", "major", "substantial", "priority", "strategic"];
  
  if (criticalIndicators.some(i => lowerText.includes(i))) return "critical";
  if (importantIndicators.some(i => lowerText.includes(i))) return "important";
  return "informational";
}

/**
 * Suggest visualization type based on content
 */
function determineVisualization(text: string): InsightOutput["visualSuggestion"] {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("year-over-year") || lowerText.includes("trend") || lowerText.includes("over time")) {
    return "trend-line";
  }
  if (lowerText.includes("compare") || lowerText.includes("versus") || lowerText.includes("sectors")) {
    return "comparison-bar";
  }
  if (lowerText.includes("change") || lowerText.includes("delta") || lowerText.includes("growth")) {
    return "delta-chart";
  }
  if (lowerText.includes("distribution") || lowerText.includes("regional") || lowerText.includes("across")) {
    return "heatmap";
  }
  return undefined;
}

/**
 * Build a contextual query for a specific insight type
 */
export function buildInsightQuery(
  tab: IntelligenceTab,
  focusArea?: string,
  context?: {
    selectedSector?: string;
    timeframe?: string;
    comparisonType?: "yoy" | "sector" | "regional";
  }
): string {
  let query = SEMANTIC_QUERIES[tab].primary;
  
  if (focusArea) {
    query += ` Focus specifically on ${focusArea}.`;
  }
  
  if (context?.selectedSector) {
    query += ` Prioritize intelligence related to the ${context.selectedSector} sector.`;
  }
  
  if (context?.timeframe) {
    query += ` Consider the ${context.timeframe} timeframe.`;
  }
  
  if (context?.comparisonType === "yoy") {
    query += " Emphasize year-over-year comparisons and deltas.";
  } else if (context?.comparisonType === "sector") {
    query += " Compare patterns across different sectors.";
  } else if (context?.comparisonType === "regional") {
    query += " Compare metropolitan and regional dynamics.";
  }
  
  return query;
}

export default {
  INTELLIGENCE_ANALYST_SYSTEM_PROMPT,
  TAB_PROMPTS,
  SEMANTIC_QUERIES,
  getTabPrompt,
  parseInsightResponse,
  buildInsightQuery,
};
