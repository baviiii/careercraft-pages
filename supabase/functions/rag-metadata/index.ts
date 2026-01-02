// RAG Metadata Function - Version 2.1
// Fixed: Added rate limiting and retry logic for Azure Search throttling
// Provides document statistics, counts, and metadata without full content
// Powers dashboards and resource listings
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ENTERPRISE: Rate limiting for Azure Search
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 100 // 100ms between requests (10 req/sec max)

// ENTERPRISE: Retry with exponential backoff for throttling
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<Response> {
  // Rate limiting: wait if needed
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()

  try {
    const response = await fetch(url, options)

    // Check for rate limiting (503 or 429)
    if ((response.status === 503 || response.status === 429) && retryCount < maxRetries) {
      const retryAfter = response.headers.get('Retry-After')
      const delay = retryAfter 
        ? parseInt(retryAfter) * 1000 
        : Math.pow(2, retryCount) * 1000 // Exponential backoff: 1s, 2s, 4s
      
      console.warn(`Azure Search throttled (${response.status}), retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, retryCount + 1, maxRetries)
    }

    return response
  } catch (error) {
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000
      console.warn(`Request failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, retryCount + 1, maxRetries)
    }
    throw error
  }
}

interface MetadataRequest {
  type: 'stats' | 'documents' | 'categories' | 'search'
  filters?: {
    category?: string
    sector?: string
    documentType?: 'pdf' | 'web' | 'all'
    tags?: string[]
  }
  query?: string
  top?: number
}

interface DocumentMetadata {
  documentId: string
  title: string
  category?: string
  sector?: string
  documentType: string
  tags?: string[]
  url?: string
  pageCount?: number
  chunkCount?: number
  lastModified?: string
}

interface CategoryStats {
  category: string
  count: number
  documentIds: string[]
}

interface SectorStats {
  sector: string
  count: number
  documentIds: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: MetadataRequest = await req.json()
    const { type, filters = {}, query, top = 100 } = request

    const searchEndpoint = Deno.env.get('AZURE_SEARCH_ENDPOINT')
    const searchKey = Deno.env.get('AZURE_SEARCH_KEY')
    const searchIndex = Deno.env.get('AZURE_SEARCH_INDEX') || 'sa-gov-documents'

    if (!searchEndpoint || !searchKey) {
      throw new Error('Azure Search credentials not configured')
    }

    switch (type) {
      case 'stats':
        return await getStats(searchEndpoint, searchKey, searchIndex, filters)
      
      case 'categories':
        return await getCategoryStats(searchEndpoint, searchKey, searchIndex)
      
      case 'documents':
        return await getDocuments(searchEndpoint, searchKey, searchIndex, filters, top)
      
      case 'search':
        if (!query) {
          throw new Error('Query is required for search type')
        }
        return await searchDocuments(searchEndpoint, searchKey, searchIndex, query, filters, top)
      
      default:
        throw new Error(`Unknown type: ${type}`)
    }
  } catch (error) {
    console.error('Metadata Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function getStats(
  endpoint: string,
  key: string,
  indexName: string,
  filters: MetadataRequest['filters']
): Promise<Response> {
  // Build filter expression
  let filterExpr = ""
  const filterParts: string[] = []

  if (filters?.category) {
    filterParts.push(`category eq '${filters.category}'`)
  }
  if (filters?.sector) {
    filterParts.push(`sector eq '${filters.sector}'`)
  }
  if (filters?.documentType && filters.documentType !== 'all') {
    filterParts.push(`documentType eq '${filters.documentType}'`)
  }

  if (filterParts.length > 0) {
    filterExpr = filterParts.join(' and ')
  }

  // Get total document count (unique documentIds)
  const searchBody: any = {
    search: '*',
    queryType: 'simple',
    top: 0, // We only want count
    facets: [
      'category,count:100',
      'sector,count:100',
      'documentType,count:10',
    ],
  }

  if (filterExpr) {
    searchBody.filter = filterExpr
  }

  let response: Response
  try {
    // Use $count=true as URL parameter instead of includeTotalCount in body
    const statsUrl = `${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01&$count=true`
    console.log('getStats: Azure Search request', {
      url: statsUrl,
      hasIncludeTotalCount: Object.prototype.hasOwnProperty.call(searchBody, 'includeTotalCount'),
      top: searchBody.top,
      filter: searchBody.filter,
    })

    response = await fetchWithRetry(statsUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': key,
        },
        body: JSON.stringify(searchBody),
      }
    )
  } catch (fetchError) {
    console.error('Fetch error getting stats:', fetchError)
    throw new Error(`Failed to connect to Azure Search: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`)
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Azure Search error response:', response.status, errorText)
    throw new Error(`Azure Search API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  
  // OPTIMIZED: Use a more efficient approach to get unique document count
  // Instead of fetching 10,000 docs, use a smaller sample and estimate
  let uniqueDocCount = 0
  try {
    const uniqueDocsResponse = await fetchWithRetry(
      `${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': key,
        },
        body: JSON.stringify({
          search: '*',
          queryType: 'simple',
          top: 1000, // Reduced from 10000 to avoid timeout
          select: 'documentId',
          ...(filterExpr && { filter: filterExpr }),
        }),
      }
    )

    if (uniqueDocsResponse.ok) {
      const uniqueDocsData = await uniqueDocsResponse.json()
      const uniqueDocIds = new Set(uniqueDocsData.value?.map((d: any) => d.documentId) || [])
      uniqueDocCount = uniqueDocIds.size
      
      // If we got 1000 results, there might be more - use total count as estimate
      if (uniqueDocsData.value?.length === 1000) {
        // Use chunk count as approximation (usually close to document count for large datasets)
        uniqueDocCount = Math.max(uniqueDocCount, Math.floor((data['@odata.count'] || 0) / 10))
      }
    } else {
      // Fallback: estimate from chunk count
      uniqueDocCount = Math.floor((data['@odata.count'] || 0) / 10) // Rough estimate: 10 chunks per doc
    }
  } catch (error) {
    console.warn('Could not get exact document count, using estimate:', error)
    // Fallback: estimate from chunk count
    uniqueDocCount = Math.floor((data['@odata.count'] || 0) / 10)
  }

  return new Response(
    JSON.stringify({
      totalDocuments: uniqueDocCount,
      totalChunks: data['@odata.count'] || 0,
      facets: data['@search.facets'] || {},
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getCategoryStats(
  endpoint: string,
  key: string,
  indexName: string
): Promise<Response> {
  try {
    const response = await fetchWithRetry(
      `${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': key,
        },
        body: JSON.stringify({
          search: '*',
          queryType: 'simple',
          top: 0,
          facets: ['category,count:100', 'sector,count:100'],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Azure Search error in getCategoryStats:', response.status, errorText)
      throw new Error(`Azure Search API error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const facets = data['@search.facets'] || {}

    // OPTIMIZED: Use facet counts directly instead of making separate queries
    // This is much faster and avoids timeouts
    const categoryStats: CategoryStats[] = []
    if (facets.category) {
      for (const facet of facets.category) {
        // Use facet count as approximation (much faster than querying all docs)
        // For exact counts, we'd need to query, but that's too slow
        categoryStats.push({
          category: facet.value,
          count: facet.count, // Use facet count as approximation
          documentIds: [], // Empty to save time - can be populated on demand
        })
      }
    }

    return new Response(
      JSON.stringify({
        categories: categoryStats,
        sectors: facets.sector || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in getCategoryStats:', error)
    throw error
  }
}

async function getDocuments(
  endpoint: string,
  key: string,
  indexName: string,
  filters: MetadataRequest['filters'],
  top: number
): Promise<Response> {
  let filterExpr = ""
  const filterParts: string[] = []

  if (filters?.category) {
    filterParts.push(`category eq '${filters.category}'`)
  }
  if (filters?.sector) {
    filterParts.push(`sector eq '${filters.sector}'`)
  }
  if (filters?.documentType && filters.documentType !== 'all') {
    filterParts.push(`documentType eq '${filters.documentType}'`)
  }
  if (filters?.tags && filters.tags.length > 0) {
    const tagFilters = filters.tags.map(tag => `tags/any(t: t eq '${tag}')`).join(' or ')
    filterParts.push(`(${tagFilters})`)
  }

  if (filterParts.length > 0) {
    filterExpr = filterParts.join(' and ')
  }

  // OPTIMIZED: Get unique documents efficiently
  // Use a reasonable limit to avoid timeouts
  const maxResults = Math.min(top * 3, 1000) // Get 3x requested to account for duplicates
  
  const searchBody: any = {
    search: '*',
    queryType: 'simple',
    top: maxResults,
    select: 'documentId,title,category,sector,documentType,tags,url',
    orderby: 'documentId',
  }

  if (filterExpr) {
    searchBody.filter = filterExpr
  }

  let response: Response
  try {
    response = await fetchWithRetry(
      `${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': key,
        },
        body: JSON.stringify(searchBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Azure Search error in getDocuments:', response.status, errorText)
      throw new Error(`Azure Search API error (${response.status}): ${errorText}`)
    }
  } catch (fetchError) {
    console.error('Fetch error in getDocuments:', fetchError)
    throw new Error(`Failed to connect to Azure Search: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`)
  }

  const data = await response.json()
  
  // Deduplicate by documentId and get metadata
  const documentMap = new Map<string, DocumentMetadata>()
  
  for (const hit of data.value || []) {
    if (!documentMap.has(hit.documentId)) {
      documentMap.set(hit.documentId, {
        documentId: hit.documentId,
        title: hit.title || 'Untitled',
        category: hit.category,
        sector: hit.sector,
        documentType: hit.documentType || 'pdf',
        tags: hit.tags || [],
        url: hit.url,
      })
    }
    
    // Stop if we have enough unique documents
    if (documentMap.size >= top) {
      break
    }
  }

  const documents = Array.from(documentMap.values()).slice(0, top)

  return new Response(
    JSON.stringify({
      documents,
      total: documentMap.size,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function searchDocuments(
  endpoint: string,
  key: string,
  indexName: string,
  query: string,
  filters: MetadataRequest['filters'],
  top: number
): Promise<Response> {
  let filterExpr = ""
  const filterParts: string[] = []

  if (filters?.category) {
    filterParts.push(`category eq '${filters.category}'`)
  }
  if (filters?.sector) {
    filterParts.push(`sector eq '${filters.sector}'`)
  }
  if (filters?.documentType && filters.documentType !== 'all') {
    filterParts.push(`documentType eq '${filters.documentType}'`)
  }

  if (filterParts.length > 0) {
    filterExpr = filterParts.join(' and ')
  }

  const searchBody: any = {
    search: query,
    queryType: 'semantic',
    semanticConfiguration: 'default',
    top: top,
    select: 'documentId,title,category,sector,documentType,tags,url,pageNumber',
  }

  if (filterExpr) {
    searchBody.filter = filterExpr
  }

  const response = await fetchWithRetry(
    `${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify(searchBody),
    }
  )

  if (!response.ok) {
    throw new Error('Search failed')
  }

  const data = await response.json()
  
  // Deduplicate and format results
  const documentMap = new Map<string, any>()
  
  for (const hit of data.value || []) {
    const key = hit.documentId
    if (!documentMap.has(key)) {
      documentMap.set(key, {
        documentId: hit.documentId,
        title: hit.title || 'Untitled',
        category: hit.category,
        sector: hit.sector,
        documentType: hit.documentType || 'pdf',
        tags: hit.tags || [],
        url: hit.url,
        score: hit['@search.score'] || 0,
        pageNumber: hit.pageNumber,
      })
    } else {
      // Update score if this hit has a higher score
      const existing = documentMap.get(key)!
      if ((hit['@search.score'] || 0) > existing.score) {
        existing.score = hit['@search.score'] || 0
        existing.pageNumber = hit.pageNumber
      }
    }
  }

  const results = Array.from(documentMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, top)

  return new Response(
    JSON.stringify({
      results,
      total: results.length,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

