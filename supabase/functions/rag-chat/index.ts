// Enterprise RAG Chat Function
// Maintains conversation context and provides personalized career guidance
// Integrates with rag-query for intelligent responses

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  message: string
  sessionId?: string
  userId?: string
  context?: {
    occupation?: string
    sector?: string
    experience?: string
    goals?: string[]
  }
}

interface ChatResponse {
  response: string
  sessionId: string
  sources: Source[]
  suggestedQuestions: string[]
  metadata: {
    messageCount: number
    processingTime: number
  }
}

interface Source {
  title: string
  documentId: string
  pageNumber?: number
  url?: string
  snippet: string
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: Source[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const { message, sessionId, userId, context }: ChatRequest = await req.json()

    if (!message || message.trim().length === 0) {
      throw new Error('Message is required')
    }

    // Initialize Supabase client for session storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get or create session
    let currentSessionId = sessionId
    let conversationHistory: ConversationMessage[] = []

    if (currentSessionId) {
      // Fetch existing conversation
      const { data: session } = await supabase
        .from('chat_sessions')
        .select('messages')
        .eq('id', currentSessionId)
        .single()

      if (session?.messages) {
        conversationHistory = session.messages
      }
    } else {
      // Create new session
      currentSessionId = crypto.randomUUID()
      await supabase
        .from('chat_sessions')
        .insert({
          id: currentSessionId,
          user_id: userId || null,
          messages: [],
          context: context || {},
          created_at: new Date().toISOString(),
        })
    }

    // Build filters from user context
    const filters: any = {}
    if (context?.sector) {
      filters.sector = context.sector
    }

    // Determine response style based on conversation length
    const responseStyle = conversationHistory.length < 2 ? 'detailed' : 'concise'

    // Call RAG query function
    const ragResponse = await callRAGQuery({
      query: message,
      conversationHistory: conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
      filters,
      options: {
        topK: 8,
        responseStyle,
        includeMetadata: true,
      }
    })

    // Add messages to history
    conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    })

    conversationHistory.push({
      role: 'assistant',
      content: ragResponse.answer,
      timestamp: new Date().toISOString(),
      sources: ragResponse.sources,
    })

    // Keep only last 20 messages to manage context length
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20)
    }

    // Update session in database
    await supabase
      .from('chat_sessions')
      .update({
        messages: conversationHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSessionId)

    const response: ChatResponse = {
      response: ragResponse.answer,
      sessionId: currentSessionId,
      sources: ragResponse.sources,
      suggestedQuestions: ragResponse.suggestedQuestions,
      metadata: {
        messageCount: conversationHistory.length,
        processingTime: Date.now() - startTime,
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Chat Error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        response: "I'm having trouble processing your request. Please try again.",
        sources: [],
        suggestedQuestions: [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function callRAGQuery(request: {
  query: string
  conversationHistory: { role: string; content: string }[]
  filters: any
  options: any
}): Promise<{
  answer: string
  sources: Source[]
  suggestedQuestions: string[]
}> {
  // Get Azure credentials
  const searchEndpoint = Deno.env.get('AZURE_SEARCH_ENDPOINT')
  const searchKey = Deno.env.get('AZURE_SEARCH_KEY')
  const searchIndex = Deno.env.get('AZURE_SEARCH_INDEX') || 'sa-gov-documents'
  const openAIEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
  const openAIKey = Deno.env.get('AZURE_OPENAI_KEY')
  const embeddingDeployment = Deno.env.get('AZURE_OPENAI_EMBEDDING_DEPLOYMENT') || 'text-embedding-3-large'
  const chatDeployment = Deno.env.get('AZURE_OPENAI_CHAT_DEPLOYMENT') || 'gpt-4'

  // Generate embedding for query
  const embeddingResponse = await fetch(
    `${openAIEndpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=2024-02-15-preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': openAIKey!,
      },
      body: JSON.stringify({
        input: request.query.substring(0, 8000),
        model: embeddingDeployment,
      }),
    }
  )

  let queryEmbedding: number[] = []
  if (embeddingResponse.ok) {
    const embData = await embeddingResponse.json()
    queryEmbedding = embData.data[0].embedding
  }

  // Search Azure AI Search
  const searchBody: any = {
    search: request.query,
    queryType: "semantic",
    semanticConfiguration: "default",
    top: request.options.topK || 8,
    select: "id,content,title,documentId,documentType,pageNumber,chunkIndex,category,sector,tags,url",
  }

  // Add vector search if we have embedding
  if (queryEmbedding.length > 0) {
    searchBody.vectorQueries = [{
      kind: "vector",
      vector: queryEmbedding,
      fields: "contentVector",
      k: request.options.topK || 8,
    }]
  }

  // Add filters
  if (request.filters && Object.keys(request.filters).length > 0) {
    const filterParts: string[] = []
    if (request.filters.sector) {
      filterParts.push(`sector eq '${request.filters.sector}'`)
    }
    if (request.filters.category) {
      filterParts.push(`category eq '${request.filters.category}'`)
    }
    if (filterParts.length > 0) {
      searchBody.filter = filterParts.join(' and ')
    }
  }

  const searchResponse = await fetch(
    `${searchEndpoint}/indexes/${searchIndex}/docs/search?api-version=2023-11-01`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': searchKey!,
      },
      body: JSON.stringify(searchBody),
    }
  )

  let searchResults: any[] = []
  if (searchResponse.ok) {
    const searchData = await searchResponse.json()
    searchResults = searchData.value || []
  }

  // Build context from search results
  let context = "RELEVANT DOCUMENTS:\n\n"
  searchResults.forEach((result: any, index: number) => {
    context += `---\n[Source ${index + 1}]\n`
    context += `Title: ${result.title || 'Untitled'}\n`
    context += `Document: ${result.documentId}\n`
    if (result.pageNumber) context += `Page: ${result.pageNumber}\n`
    if (result.category) context += `Category: ${result.category}\n`
    context += `Content:\n${result.content}\n\n`
  })

  // Generate response with GPT-4
  const systemPrompt = `You are CareerCraft AI, an expert career advisor for South Australian government jobs and career guidance.

RULES:
1. ONLY use information from the provided documents
2. ALWAYS cite sources using [Source X] notation
3. Be helpful, professional, and encouraging
4. Provide actionable advice when possible
5. If information isn't in the documents, say so honestly

Every claim must be traceable to a source. No hallucinations.`

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
  ]

  // Add conversation history
  for (const msg of request.conversationHistory.slice(-6)) {
    messages.push({ role: msg.role, content: msg.content })
  }

  messages.push({
    role: 'user',
    content: `${context}\n\n---\n\nUSER QUESTION: ${request.query}\n\nProvide a helpful answer based ONLY on the documents above.`
  })

  const chatResponse = await fetch(
    `${openAIEndpoint}/openai/deployments/${chatDeployment}/chat/completions?api-version=2024-02-15-preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': openAIKey!,
      },
      body: JSON.stringify({
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
    }
  )

  let answer = "I couldn't generate a response. Please try again."
  if (chatResponse.ok) {
    const chatData = await chatResponse.json()
    answer = chatData.choices[0]?.message?.content || answer
  }

  // Extract sources
  const sources: Source[] = searchResults.slice(0, 5).map((result: any) => ({
    title: result.title || 'Untitled',
    documentId: result.documentId,
    pageNumber: result.pageNumber,
    url: result.url,
    snippet: (result.content || '').substring(0, 150) + '...',
  }))

  // Default suggested questions
  const suggestedQuestions = [
    "What qualifications do I need?",
    "How do I apply for this role?",
    "What training programs are available?",
  ]

  return {
    answer,
    sources,
    suggestedQuestions,
  }
}

