// RAG Metadata Function
// Provides document statistics, counts, and metadata without full content
// Powers dashboards and resource listings

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    includeTotalCount: true,
    facets: [
      'category,count:100',
      'sector,count:100',
      'documentType,count:10',
    ],
  }

  if (filterExpr) {
    searchBody.filter = filterExpr
  }

  const response = await fetch(
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
    throw new Error('Failed to get stats')
  }

  const data = await response.json()
  
  // Get unique document count
  const uniqueDocsResponse = await fetch(
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
        top: 10000,
        select: 'documentId',
        ...(filterExpr && { filter: filterExpr }),
      }),
    }
  )

  let uniqueDocCount = 0
  if (uniqueDocsResponse.ok) {
    const uniqueDocsData = await uniqueDocsResponse.json()
    const uniqueDocIds = new Set(uniqueDocsData.value?.map((d: any) => d.documentId) || [])
    uniqueDocCount = uniqueDocIds.size
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
  const response = await fetch(
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
    throw new Error('Failed to get category stats')
  }

  const data = await response.json()
  const facets = data['@search.facets'] || {}

  // Get unique document counts per category
  const categoryStats: CategoryStats[] = []
  if (facets.category) {
    for (const facet of facets.category) {
      const categoryDocs = await fetch(
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
            top: 1000,
            select: 'documentId',
            filter: `category eq '${facet.value}'`,
          }),
        }
      )

      if (categoryDocs.ok) {
        const categoryData = await categoryDocs.json()
        const uniqueDocIds = new Set(categoryData.value?.map((d: any) => d.documentId) || [])
        categoryStats.push({
          category: facet.value,
          count: uniqueDocIds.size,
          documentIds: Array.from(uniqueDocIds),
        })
      }
    }
  }

  return new Response(
    JSON.stringify({
      categories: categoryStats,
      sectors: facets.sector || [],
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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

  // Get unique documents (group by documentId)
  const searchBody: any = {
    search: '*',
    queryType: 'simple',
    top: 10000, // Get all to deduplicate
    select: 'documentId,title,category,sector,documentType,tags,url',
    orderby: 'documentId',
  }

  if (filterExpr) {
    searchBody.filter = filterExpr
  }

  const response = await fetch(
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
    throw new Error('Failed to get documents')
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

  const response = await fetch(
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

