// Edge Function: Extract Insights, Trends, Budgets from RAG Documents
// Parses documents to extract structured data for visualizations and decision support

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExtractionRequest {
  content: string
  category: string
  documentType: 'pdf' | 'web'
}

interface ExtractedInsights {
  budgetFigures: BudgetFigure[]
  trends: Trend[]
  policyChanges: PolicyChange[]
  marketInsights: MarketInsight[]
  comparativeData: ComparativeData[]
}

interface BudgetFigure {
  sector: string
  amount: number
  currency: string
  year: number
  change?: string
  program?: string
}

interface Trend {
  metric: string
  sector?: string
  occupation?: string
  value: string
  period: string
  direction: 'up' | 'down' | 'stable'
}

interface PolicyChange {
  policy: string
  date: string
  impact: string[]
  description?: string
}

interface MarketInsight {
  type: 'opportunity' | 'demand' | 'growth' | 'shortage'
  sector?: string
  occupation?: string
  description: string
  magnitude?: string
}

interface ComparativeData {
  metric: string
  comparisons: { label: string; value: string | number }[]
  period?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, category, documentType }: ExtractionRequest = await req.json()

    if (!content) {
      throw new Error('Content is required')
    }

    const insights = await extractInsights(content, category, documentType)

    return new Response(
      JSON.stringify(insights),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function extractInsights(
  content: string,
  category: string,
  documentType: string
): Promise<ExtractedInsights> {
  const contentLower = content.toLowerCase()
  const currentYear = new Date().getFullYear()

  // Extract budget figures
  const budgetFigures = extractBudgetFigures(content, contentLower)

  // Extract trends
  const trends = extractTrends(content, contentLower)

  // Extract policy changes
  const policyChanges = extractPolicyChanges(content, contentLower, category)

  // Extract market insights
  const marketInsights = extractMarketInsights(content, contentLower)

  // Extract comparative data
  const comparativeData = extractComparativeData(content, contentLower)

  return {
    budgetFigures,
    trends,
    policyChanges,
    marketInsights,
    comparativeData,
  }
}

function extractBudgetFigures(content: string, contentLower: string): BudgetFigure[] {
  const figures: BudgetFigure[] = []
  
  // Pattern: "$X million", "$X billion", "$X,XXX,XXX"
  const budgetPatterns = [
    /\$[\d,]+(?:\.\d+)?\s*(?:million|billion|thousand|m|b|k)/gi,
    /\$\s*[\d,]+(?:\.\d+)?/g,
    /[\d,]+(?:\.\d+)?\s*(?:million|billion|thousand|m|b|k)\s*(?:dollars|dollar)/gi,
  ]

  const extractedAmounts = new Set<string>()
  
  for (const pattern of budgetPatterns) {
    const matches = content.match(pattern) || []
    for (const match of matches) {
      if (!extractedAmounts.has(match)) {
        extractedAmounts.add(match)
        const amount = parseBudgetAmount(match)
        if (amount > 0) {
          // Try to find associated sector/program
          const context = extractContext(content, match, 200)
          const sector = extractSector(context)
          const program = extractProgram(context)
          
          figures.push({
            sector: sector || 'general',
            amount,
            currency: 'AUD',
            year: extractYear(context) || new Date().getFullYear(),
            program,
          })
        }
      }
    }
  }

  return figures
}

function parseBudgetAmount(text: string): number {
  const clean = text.toLowerCase().replace(/[$,]/g, '')
  
  let multiplier = 1
  if (clean.includes('billion') || clean.includes('b')) {
    multiplier = 1000000000
  } else if (clean.includes('million') || clean.includes('m')) {
    multiplier = 1000000
  } else if (clean.includes('thousand') || clean.includes('k')) {
    multiplier = 1000
  }
  
  const numberMatch = clean.match(/[\d.]+/)
  if (!numberMatch) return 0
  
  return parseFloat(numberMatch[0]) * multiplier
}

function extractTrends(content: string, contentLower: string): Trend[] {
  const trends: Trend[] = []
  
  // Patterns: "increased by X%", "grew X%", "declined X%", "+X%", "-X%"
  const trendPatterns = [
    /(increased|grew|rose|up|growth)\s+(?:by\s+)?([\d.]+)%/gi,
    /(decreased|declined|fell|down|drop)\s+(?:by\s+)?([\d.]+)%/gi,
    /([+-][\d.]+)%/g,
    /(growth|decline|increase|decrease)\s+(?:of\s+)?([\d.]+)%/gi,
  ]

  for (const pattern of trendPatterns) {
    const matches = [...content.matchAll(pattern)]
    for (const match of matches) {
      const value = match[2] || match[1]
      const direction = (match[1] || match[0]).toLowerCase().includes('dec') || match[0].startsWith('-')
        ? 'down'
        : match[1]?.toLowerCase().includes('growth') || match[1]?.toLowerCase().includes('increase')
        ? 'up'
        : 'stable'

      const context = extractContext(content, match[0], 300)
      const sector = extractSector(context)
      const occupation = extractOccupation(context)
      
      // Determine metric type
      let metric = 'general'
      if (context.includes('hiring') || context.includes('employment')) metric = 'hiring-growth'
      else if (context.includes('salary') || context.includes('wage')) metric = 'salary-trend'
      else if (context.includes('skill') || context.includes('demand')) metric = 'skill-demand'
      else if (context.includes('budget') || context.includes('funding')) metric = 'budget-growth'

      trends.push({
        metric,
        sector,
        occupation,
        value: `${direction === 'down' ? '-' : '+'}${value}%`,
        period: extractPeriod(context) || 'recent',
        direction: direction as 'up' | 'down' | 'stable',
      })
    }
  }

  return trends
}

function extractPolicyChanges(content: string, contentLower: string, category: string): PolicyChange[] {
  const changes: PolicyChange[] = []
  
  if (category !== 'policy' && !contentLower.includes('policy') && !contentLower.includes('announce')) {
    return changes
  }

  // Look for policy announcements, updates
  const policyKeywords = ['new policy', 'policy change', 'announced', 'updated policy', 'introducing']
  const dates = extractDates(content)

  for (const keyword of policyKeywords) {
    if (contentLower.includes(keyword)) {
      const context = extractContext(content, keyword, 500)
      const policyTitle = extractTitle(context, keyword)
      const impact = extractImpactAreas(context)
      
      changes.push({
        policy: policyTitle || keyword,
        date: dates[0] || new Date().toISOString().split('T')[0],
        impact,
        description: context.substring(0, 200),
      })
    }
  }

  return changes
}

function extractMarketInsights(content: string, contentLower: string): MarketInsight[] {
  const insights: MarketInsight[] = []
  
  // Look for opportunity indicators
  const opportunityPhrases = ['opportunity', 'growing demand', 'expanding', 'new roles', 'hiring']
  const shortagePhrases = ['shortage', 'in demand', 'needed', 'required', 'seeking']
  const growthPhrases = ['growth', 'expanding', 'increasing', 'rising']

  const allPhrases = [
    ...opportunityPhrases.map(p => ({ phrase: p, type: 'opportunity' as const })),
    ...shortagePhrases.map(p => ({ phrase: p, type: 'shortage' as const })),
    ...growthPhrases.map(p => ({ phrase: p, type: 'growth' as const })),
  ]

  for (const { phrase, type } of allPhrases) {
    if (contentLower.includes(phrase)) {
      const context = extractContext(content, phrase, 300)
      const sector = extractSector(context)
      const occupation = extractOccupation(context)
      
      insights.push({
        type,
        sector,
        occupation,
        description: context.substring(0, 200),
      })
    }
  }

  return insights
}

function extractComparativeData(content: string, contentLower: string): ComparativeData[] {
  const comparisons: ComparativeData[] = []
  
  // Look for comparison tables, "vs", "compared to", year-over-year
  if (contentLower.includes('compared to') || contentLower.includes('vs') || contentLower.includes('year over year')) {
    // Extract comparison data (simplified - would need more sophisticated parsing for tables)
    const context = extractContext(content, 'compared', 500)
    
    comparisons.push({
      metric: 'general',
      comparisons: extractComparisonValues(context),
      period: extractPeriod(context),
    })
  }

  return comparisons
}

// Helper functions
function extractContext(content: string, match: string, length: number): string {
  const index = content.toLowerCase().indexOf(match.toLowerCase())
  if (index === -1) return ''
  const start = Math.max(0, index - length)
  const end = Math.min(content.length, index + match.length + length)
  return content.substring(start, end)
}

function extractSector(context: string): string | undefined {
  const sectors = ['health', 'education', 'public-sector', 'it-technology', 'finance', 'engineering']
  const contextLower = context.toLowerCase()
  for (const sector of sectors) {
    if (contextLower.includes(sector)) return sector
  }
  return undefined
}

function extractOccupation(context: string): string | undefined {
  const occupations = ['nurse', 'teacher', 'engineer', 'developer', 'accountant', 'manager']
  const contextLower = context.toLowerCase()
  for (const occ of occupations) {
    if (contextLower.includes(occ)) return occ
  }
  return undefined
}

function extractProgram(context: string): string | undefined {
  // Extract program names (would be enhanced with NLP)
  return undefined
}

function extractYear(context: string): number | undefined {
  const yearMatch = context.match(/\b(20\d{2})\b/)
  return yearMatch ? parseInt(yearMatch[1]) : undefined
}

function extractDates(content: string): string[] {
  const datePatterns = [
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
  ]
  
  const dates: string[] = []
  for (const pattern of datePatterns) {
    const matches = [...content.matchAll(pattern)]
    for (const match of matches) {
      dates.push(match[0])
    }
  }
  return dates
}

function extractTitle(context: string, keyword: string): string {
  // Extract policy/program title (simplified)
  const sentences = context.split(/[.!?]/)
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(keyword)) {
      return sentence.trim().substring(0, 100)
    }
  }
  return ''
}

function extractImpactAreas(context: string): string[] {
  const areas: string[] = []
  const keywords = ['skills', 'training', 'jobs', 'employment', 'migration', 'education']
  const contextLower = context.toLowerCase()
  for (const keyword of keywords) {
    if (contextLower.includes(keyword)) areas.push(keyword)
  }
  return areas
}

function extractPeriod(context: string): string | undefined {
  const periods = ['2023-2024', '2024-2025', 'last year', 'this year', 'next year', 'quarter', 'annual']
  const contextLower = context.toLowerCase()
  for (const period of periods) {
    if (contextLower.includes(period)) return period
  }
  return undefined
}

function extractComparisonValues(context: string): { label: string; value: string | number }[] {
  // Simplified - would need table parsing for real implementation
  return []
}





