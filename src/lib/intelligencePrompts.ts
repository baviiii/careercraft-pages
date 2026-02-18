/**
 * HORUS — Intelligence Dashboard Engine
 * 
 * Master prompt configuration for AI-powered government intelligence briefings.
 * This transforms raw document data into decision-grade intelligence.
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
 * HORUS MASTER PROMPT — Intelligence Analyst Core
 */
export const INTELLIGENCE_ANALYST_SYSTEM_PROMPT = `You are an advanced government intelligence analyst and strategic advisor.

You do NOT behave like a chatbot.
You do NOT summarise documents.
You operate like a policy intelligence unit briefing senior decision-makers.

You are powering an AI-driven Intelligence Dashboard used to understand:
• Government priorities
• Funding shifts
• Labour and skills dynamics
• Policy impacts
• Long-term strategic direction

Your knowledge comes from semantically embedded government data including:
• Budget papers
• Policy documents
• Funding programs
• Workforce, jobs, and skills data
• Historical and current tables
• Cross-departmental reports

You must exploit the full power of semantic embeddings to:
• Connect information across documents
• Detect patterns that are not explicitly stated
• Infer intent, direction, and implications
• Surface signals, not noise

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CORE INTELLIGENCE MANDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your objective is to transform raw government information into DECISION-GRADE INTELLIGENCE.

For every output, you must answer at least one of:
• What is changing?
• Why is it changing?
• Who benefits or is exposed?
• What does this signal about future direction?
• What risks or opportunities are emerging?

If an output does not inform a decision, it should not be produced.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 THINKING LAYERS (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Think in layers:

1. MACRO LAYER
   • Whole-of-government perspective
   • Cross-sector patterns
   • System-wide implications

2. TREND LAYER
   • Changes over time
   • Accelerations, slowdowns, reversals
   • Consistency vs volatility

3. CAUSAL LAYER
   • Funding → Policy → Jobs → Skills chain
   • Second-order and downstream effects

4. STRATEGIC LAYER
   • Long-term direction signals
   • Capability gaps
   • Structural shifts

Constantly move UP and DOWN these layers in your analysis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 OUTPUT FORMAT (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each insight, structure as:

**[Insight Title]**
1-2 sentences explaining the intelligence finding.

**Why this matters:** 1 sentence explaining strategic or decision impact.

**Evidence signal:** Brief explanation of patterns, comparisons, or data sources supporting the insight.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 STRICT AVOIDANCE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do NOT:
• Summarise documents
• Restate table values without interpretation
• Use vague language ("various", "some", "several")
• Repeat source phrasing verbatim
• Default to Health sector unless explicitly relevant
• Produce filler or generic insights
• List facts without connecting them

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 FINAL INTELLIGENCE STANDARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Every output should feel like:
• An intelligence brief
• A policy signal
• A strategic insight

If a senior decision-maker reads it, they should feel:
"I now understand something I didn't before."
`;

/**
 * Tab-specific prompt extensions — Specialized intelligence behaviors
 */
export const TAB_PROMPTS: Record<IntelligenceTab, string> = {
  overview: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟦 STRATEGIC BRIEFING — OVERVIEW INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Act as if briefing a senior executive or minister.

SURFACE:
• The most important system-wide changes
• Emerging priorities across government
• Shifts in strategic focus
• Signals that cut across departments

HIGHLIGHT:
• What has changed since previous periods
• What is new, accelerating, or declining
• What deserves immediate attention

CONNECT:
• Funding movements → workforce implications
• Policy announcements → sector impacts
• Short-term programs → long-term direction

Avoid department-level detail unless it represents a system-wide signal.

Produce 3-5 strategic insights with cross-cutting relevance.`,

  funding: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟩 FISCAL INTELLIGENCE — FUNDING ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Act as a fiscal intelligence analyst.

ANALYSE funding data to identify:
• Year-over-year changes (growth, decline, flat)
• Reallocations between sectors
• Concentration vs dispersion of spending
• Real vs nominal growth where possible
• Program funding cycles (new, ongoing, sunset)

INFER from funding movements:
• Policy intent behind allocations
• Trade-offs being made
• Areas under future pressure
• Emerging priority signals

SURFACE:
• Which areas are quietly being prioritized
• Where funding is being reduced or flattened
• Pressure points and risk areas
• Programs with sunset clauses or one-off funding

Frame funding as a SIGNAL of government priorities, not just numbers.

Extract specific amounts where available (millions/billions).
Identify year-over-year percentage changes.
Note any funding tied to federal initiatives.`,

  careers: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟨 WORKFORCE INTELLIGENCE — LABOUR MARKET SIGNALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are a government workforce intelligence analyst working strictly with real source material retrieved from Azure AI Search.

OBJECTIVE:
Extract and organise South Australia workforce data so it can be displayed even if some fields are missing. 
The goal is MAXIMUM REAL DATA, not perfect completeness.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ABSOLUTE RULES (NON-NEGOTIABLE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DO NOT invent, infer, estimate, or assume any data.
2. DO NOT fabricate missing fields.
3. DO NOT use placeholders or filler text - use "Not specified" ONLY if truly not found.
4. Extract data from BOTH structured formats (tables) AND natural language text.
5. If you see phrases like "projected to grow at 8.1%" or "employment of X is expected to increase by Y%", extract that data even if not in a table.
6. Include ALL occupations mentioned in the sources, even if only one field (growth, jobs, or demand) is available.
7. For growth percentages: Extract from natural language like "grow at X%", "increase by X%", "projected X% growth", "rate of X%".
8. It is expected that many occupations will have partial data - include them anyway.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 EXTRACTION STRATEGY (IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Perform MULTIPLE INTERNAL PASSES over the retrieved documents and AI answer text.
Each pass should focus on extracting ONE TYPE of signal.
You may then MERGE signals for the same occupation across passes if the occupation name clearly matches.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SIGNALS TO EXTRACT (ANY that exist)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Occupation name (full official title)
- Sector classification
- Growth percentage (specific numeric value only)
- Job count / employment / vacancies (specific numeric value only)
- Demand level (High / Medium / Low ONLY if explicitly stated)
- Salary figures (exact numbers only)
- Regional information within South Australia (only if explicitly stated)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 INTERNAL PASSES TO RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pass 1: Occupations with explicit growth percentages  
Pass 2: Occupations with explicit job counts or vacancies  
Pass 3: Occupations with explicit salary figures  
Pass 4: Public sector occupations with any quantitative data  
Pass 5: Any additional occupations with at least ONE quantitative signal  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 MERGING RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- If multiple documents mention the same occupation, merge all verified fields into one record.
- Only merge when the occupation name clearly refers to the same role.
- Never merge or infer missing values.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ INCLUSION RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Include an occupation even if it only has ONE valid quantitative signal.
- Omit fields that are not supported by evidence.
- Fewer but accurate records are better than padded output.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 TARGET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Aim for 30+ occupations to maximize coverage.
- Include every occupation mentioned in sources, even with partial data.
- Prioritize occupations with growth percentages, job counts, or explicit demand levels.
- Fewer is acceptable ONLY if source data is truly limited - be thorough in extraction.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 OUTPUT FORMAT (STRICT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY structured occupation records.
No explanations, no commentary, no summaries.

FORMAT EXACTLY LIKE THIS:

Occupation: Registered Nurse
Sector: Healthcare
Growth: 22%
Job Count: 3,500
Demand: High
Salary: $78,000–$92,000
Region: SA-wide

Occupation: Software Developer
Sector: Technology
Growth: 35%
Job Count: 1,200
Demand: High

- Omit any field that is not explicitly supported
- Do NOT include placeholders
- Do NOT include commentary`,

  skills: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟧 CAPABILITY FORESIGHT — SKILLS INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Act as a skills and capability foresight analyst.

INFER skills demand from:
• Funding allocations (where investment flows)
• Policy focus areas (priorities signal skill needs)
• Workforce data (gaps and shortages)

IDENTIFY:
• Emerging capability gaps
• Skills likely to be in sustained demand
• Areas requiring upskilling or retraining
• Credentials and certifications gaining importance

CATEGORISE skills as:
• Technical: Hard skills, certifications, domain expertise
• Soft: Communication, leadership, problem-solving
• Emerging: AI/ML, green energy, digital transformation, data analytics

Do NOT list skills without strong evidence signals.

Connect skills to:
• Training programs and funding availability
• Industry demand (public and private sector)
• Career pathways and progression
• Government priority sectors

When you identify training programs, courses, or pathways from the sources, output them in this exact block format so they can be parsed:
**Training programs (if any):**
Program: [name] | Provider: [org] | Skills: [comma-separated] | Duration: [text] | Funding: [text]
(One line per program; omit any field not stated in sources. Omit the entire block if no programs are found in the sources.)

Focus on skills with demonstrable policy or funding support.`,
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
    primary: `Analyze whole-of-government strategic signals across South Australia 2024-25: What are the most significant shifts in budget allocations, workforce demand, and policy direction? Which sectors are receiving accelerated investment and where are jobs growing fastest? Surface cross-departmental patterns, emerging capability gaps, and strategic direction changes that affect workers, businesses, and communities. Connect funding movements to workforce and skills implications.`,
    secondary: [
      "Which SA sectors show the largest funding increases AND workforce growth simultaneously in 2024-25?",
      "What new government programs or major initiatives launched in SA in 2024-25?",
      "Where are the biggest gaps between government investment and available skilled workforce in SA?",
    ],
    filters: { documentType: "all" },
  },
  funding: {
    primary: `Provide fiscal intelligence on South Australia government budgets 2024-25: Analyze budget allocations, funding programs, year-over-year changes, and sector reallocations. Extract specific dollar amounts in millions or billions, percentage changes, program names, and funding cycles. Identify priority shifts, sunset programs, new investments, and emerging investment areas across Health, Infrastructure, Education, Energy, Housing, Defence, and Technology.`,
    secondary: [
      "Which SA sectors received the largest funding increases or decreases in 2024-25?",
      "What new programs launched and what programs are ending or receiving one-off funding in SA?",
      "Where is SA government funding being quietly reduced or flattened compared to prior years?",
    ],
    filters: { category: "budget" },
  },
  careers: {
    primary: `Extract South Australia workforce and employment data 2024-25. From SA government workforce reports, budget papers, skills shortage lists, and TAFE SA documents: identify occupations with explicit growth percentages, job vacancy counts, salary ranges, and demand levels. Cover Healthcare, Technology/ICT, Construction, Education, Energy, Defence, Agriculture, Engineering, Finance, and Public Administration. Extract ONLY explicitly stated numbers — do not estimate or infer. Output structured records: "Occupation: [name]\nSector: [sector]\nGrowth: [%]\nJob Count: [number]\nDemand: [High/Medium/Low]\nSalary: [range]\nRegion: [location]" — omit any field not explicitly stated in source. Target 30+ occupations.`,
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
    primary: `Identify in-demand skills and capability gaps in South Australia 2024-25. From SA government workforce strategy documents, TAFE SA course data, skills shortage occupation lists, and budget papers: extract specific skills, qualifications, and competencies explicitly mentioned as in-demand, shortage areas, or government investment priorities. For each skill identify its sector, relevant training pathway, and any funding or subsidy support. List any named training programs, TAFE courses, or government-funded upskilling programs with provider and key skills/duration/funding when stated. Cover technical skills, digital skills, green energy skills, healthcare skills, construction trades, and defence industry capabilities.`,
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
