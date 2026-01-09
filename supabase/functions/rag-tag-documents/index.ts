                                                                                                                // Edge Function: RAG Document Tagging
// Analyzes documents and extracts meaningful tags for RAG retrieval

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TaggingRequest {
  content: string
  documentType: 'pdf' | 'web'
  source?: string
  url?: string
  title?: string
}

interface DocumentTags {
  category: string
  sector: string | null
  tags: string[]
  topics: string[]
  occupation: string | null
  programType: string | null
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { content, documentType, source, url, title }: TaggingRequest = await req.json()

    if (!content) {
      throw new Error('Content is required')
    }

    // Get Azure OpenAI key from environment (if available)
    const azureOpenAIKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    const azureOpenAIEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const azureOpenAIDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT') || 'gpt-4o-mini'

    let tags: DocumentTags

    if (azureOpenAIKey && azureOpenAIEndpoint) {
      // Use AI-powered tagging
      tags = await tagWithAI(content, documentType, source, url, title, {
        endpoint: azureOpenAIEndpoint,
        key: azureOpenAIKey,
        deployment: azureOpenAIDeployment,
      })
    } else {
      // Use rule-based tagging as fallback
      tags = tagWithRules(content, documentType, source, url, title)
    }

    return new Response(
      JSON.stringify(tags),
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

async function tagWithAI(
  content: string,
  documentType: string,
  source: string | undefined,
  url: string | undefined,
  title: string | undefined,
  config: { endpoint: string; key: string; deployment: string }
): Promise<DocumentTags> {
  const prompt = `Analyze this SA government career-related document and extract structured tags.

Document Type: ${documentType}
Source: ${source || 'unknown'}
URL: ${url || 'N/A'}
Title: ${title || 'N/A'}

Content Preview (first 2000 chars):
${content.substring(0, 2000)}

Extract and return JSON with:
- category: One of: policy, budget, strategy, guideline, report, job-listing, career-guidance, training-program, skill-requirement, occupation-profile, migrant-support, selection-criteria, news-update, program-info
- sector: health, education, public-sector, it-technology, finance, engineering, administration, community-services, transport, defense, environment, or null
- tags: Array of relevant tags (e.g., ["sa-government", "full-time", "urgent"])
- topics: Array of main topics (e.g., ["job-search", "interview-prep", "skill-development"])
- occupation: Specific occupation/role if mentioned (e.g., "registered-nurse", "software-engineer") or null
- programType: training-program, subsidised-training, job-support, skills-assessment, mentoring, networking, grant-funding, or null

Return ONLY valid JSON, no markdown, no explanation.`

  const response = await fetch(`${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=2024-02-15-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': config.key,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a document tagging system. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const resultText = data.choices[0]?.message?.content || '{}'
  
  // Parse JSON (handle markdown code blocks if present)
  const jsonMatch = resultText.match(/\{[\s\S]*\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : resultText
  
  return JSON.parse(jsonStr)
}

function tagWithRules(
  content: string,
  documentType: string,
  source: string | undefined,
  url: string | undefined,
  title: string | undefined
): DocumentTags {
  const contentLower = content.toLowerCase()
  const urlLower = url?.toLowerCase() || ''
  const titleLower = title?.toLowerCase() || ''
  
  // Determine category from URL patterns or content
  let category = 'report'
  if (urlLower.includes('/jobs/') || urlLower.includes('/job/') || urlLower.includes('jobs.sa.gov.au')) {
    category = 'job-listing'
  } else if (urlLower.includes('/news/') || urlLower.includes('/media-releases/') || urlLower.includes('premier.sa.gov.au')) {
    category = 'news-update'
  } else if (urlLower.includes('/training/') || urlLower.includes('/courses/')) {
    category = 'training-program'
  } else if (urlLower.includes('/careers/') || urlLower.includes('/career/')) {
    category = 'career-guidance'
  } else if (urlLower.includes('/skills/') || contentLower.includes('skill requirement')) {
    category = 'skill-requirement'
  } else if (urlLower.includes('/occupation/') || contentLower.includes('occupation profile')) {
    category = 'occupation-profile'
  } else if (urlLower.includes('/migration/') || contentLower.includes('migrant')) {
    category = 'migrant-support'
  } else if (contentLower.includes('selection criteria')) {
    category = 'selection-criteria'
  } else if (contentLower.includes('budget') || contentLower.includes('financial allocation')) {
    category = 'budget'
  } else if (contentLower.includes('policy') || contentLower.includes('framework')) {
    category = 'policy'
  } else if (contentLower.includes('strategic plan') || contentLower.includes('strategy')) {
    category = 'strategy'
  }

  // Determine sector from URL domain or content
  let sector: string | null = null
  if (urlLower.includes('sahealth') || contentLower.includes('health sector') || contentLower.includes('healthcare')) {
    sector = 'health'
  } else if (urlLower.includes('education') || contentLower.includes('education sector')) {
    sector = 'education'
  } else if (urlLower.includes('publicsector') || contentLower.includes('public sector')) {
    sector = 'public-sector'
  } else if (contentLower.includes('it') || contentLower.includes('technology') || contentLower.includes('software')) {
    sector = 'it-technology'
  } else if (contentLower.includes('finance') || contentLower.includes('accounting')) {
    sector = 'finance'
  } else if (contentLower.includes('engineering')) {
    sector = 'engineering'
  }

  // Extract topics from content keywords
  const topics: string[] = []
  if (contentLower.includes('job search') || contentLower.includes('finding work')) topics.push('job-search')
  if (contentLower.includes('interview')) topics.push('interview-prep')
  if (contentLower.includes('resume') || contentLower.includes('cv')) topics.push('resume-writing')
  if (contentLower.includes('skill') && contentLower.includes('development')) topics.push('skill-development')
  if (contentLower.includes('career change') || contentLower.includes('transition')) topics.push('career-change')
  if (contentLower.includes('qualification') || contentLower.includes('certification')) topics.push('qualifications')
  if (contentLower.includes('selection criteria')) topics.push('selection-criteria')
  if (contentLower.includes('application') && contentLower.includes('public sector')) topics.push('public-sector-application')

  // Extract tags
  const tags: string[] = []
  if (urlLower.includes('sa.gov.au') || urlLower.includes('south australia')) tags.push('sa-government')
  if (contentLower.includes('regional') || contentLower.includes('rural')) tags.push('regional')
  if (contentLower.includes('graduate')) tags.push('graduate')
  if (contentLower.includes('entry level') || contentLower.includes('junior')) tags.push('entry-level')
  if (contentLower.includes('senior') || contentLower.includes('lead')) tags.push('senior')
  if (contentLower.includes('part time') || contentLower.includes('part-time')) tags.push('part-time')
  if (contentLower.includes('full time') || contentLower.includes('full-time')) tags.push('full-time')
  if (contentLower.includes('urgent') || contentLower.includes('closing soon')) tags.push('urgent')

  // Extract occupation (simple keyword matching)
  let occupation: string | null = null
  const occupationKeywords: Record<string, string> = {
    'nurse': 'registered-nurse',
    'teacher': 'teacher',
    'software engineer': 'software-engineer',
    'developer': 'software-engineer',
    'accountant': 'accountant',
    'project manager': 'project-manager',
    'engineer': 'engineer',
  }
  
  for (const [keyword, occ] of Object.entries(occupationKeywords)) {
    if (contentLower.includes(keyword) || titleLower.includes(keyword)) {
      occupation = occ
      break
    }
  }

  // Determine program type
  let programType: string | null = null
  if (contentLower.includes('training program') || contentLower.includes('training course')) {
    programType = 'training-program'
  } else if (contentLower.includes('subsidised') || contentLower.includes('fee-free')) {
    programType = 'subsidised-training'
  } else if (contentLower.includes('job support') || contentLower.includes('employment service')) {
    programType = 'job-support'
  } else if (contentLower.includes('skills assessment') || contentLower.includes('skills recognition')) {
    programType = 'skills-assessment'
  } else if (contentLower.includes('mentoring') || contentLower.includes('mentor')) {
    programType = 'mentoring'
  } else if (contentLower.includes('grant') || contentLower.includes('funding')) {
    programType = 'grant-funding'
  }

  return {
    category,
    sector,
    tags,
    topics,
    occupation,
    programType,
  }
}




