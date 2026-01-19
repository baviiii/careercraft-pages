const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-functions-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300;

async function fetchWithRetry(url, options, retryCount = 0, maxRetries = 5) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  try {
    const response = await fetch(url, options);

    if ((response.status === 503 || response.status === 429) && retryCount < maxRetries) {
      const retryAfter = response.headers.get('Retry-After');
      const baseDelay = response.status === 503 ? 2000 : 1000;
      const delay = retryAfter 
        ? Math.max(parseInt(retryAfter) * 1000, baseDelay)
        : baseDelay * Math.pow(2, retryCount);
      
      console.warn(`Azure Search throttled (${response.status}), retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retryCount + 1, maxRetries);
    }

    if (response.status === 503 || response.status === 429) {
      return response;
    }

    return response;
  } catch (error) {
    if (retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.warn(`Request failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retryCount + 1, maxRetries);
    }
    throw error;
  }
}

async function getStats(endpoint, key, indexName, filters) {
  let filterExpr = "";
  const filterParts = [];

  if (filters?.category) {
    filterParts.push(`category eq '${filters.category}'`);
  }
  if (filters?.sector) {
    filterParts.push(`sector eq '${filters.sector}'`);
  }
  if (filters?.documentType && filters.documentType !== 'all') {
    filterParts.push(`documentType eq '${filters.documentType}'`);
  }

  if (filterParts.length > 0) {
    filterExpr = filterParts.join(' and ');
  }

  const searchBody = {
    search: '*',
    queryType: 'simple',
    top: 0,
    facets: [
      'category,count:100',
      'sector,count:100',
      'documentType,count:10',
    ],
  };

  if (filterExpr) {
    searchBody.filter = filterExpr;
  }

  let response;
  try {
    const statsUrl = `${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01&$count=true`;
    
    response = await fetchWithRetry(statsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify(searchBody),
    });
  } catch (fetchError) {
    console.error('Fetch error getting stats:', fetchError);
    throw new Error(`Failed to connect to Azure Search: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Azure Search error response:', response.status, errorText);
    throw new Error(`Azure Search API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const totalChunks = data['@odata.count'] || 0;
  const estimatedDocCount = Math.floor(totalChunks / 10);

  return {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      totalDocuments: estimatedDocCount,
      totalChunks: totalChunks,
      facets: data['@search.facets'] || {},
    }),
  };
}

async function getCategoryStats(endpoint, key, indexName) {
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
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Search error in getCategoryStats:', response.status, errorText);
      throw new Error(`Azure Search API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const facets = data['@search.facets'] || {};

    const categoryStats = [];
    if (facets.category) {
      for (const facet of facets.category) {
        categoryStats.push({
          category: facet.value,
          count: facet.count,
          documentIds: [],
        });
      }
    }

    return {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: categoryStats,
        sectors: facets.sector || [],
      }),
    };
  } catch (error) {
    console.error('Error in getCategoryStats:', error);
    throw error;
  }
}

async function getDocuments(endpoint, key, indexName, filters, top) {
  let filterExpr = "";
  const filterParts = [];

  if (filters?.category) {
    filterParts.push(`category eq '${filters.category}'`);
  }
  if (filters?.sector) {
    filterParts.push(`sector eq '${filters.sector}'`);
  }
  if (filters?.documentType && filters.documentType !== 'all') {
    filterParts.push(`documentType eq '${filters.documentType}'`);
  }
  if (filters?.tags && filters.tags.length > 0) {
    const tagFilters = filters.tags.map(tag => `tags/any(t: t eq '${tag}')`).join(' or ');
    filterParts.push(`(${tagFilters})`);
  }

  if (filterParts.length > 0) {
    filterExpr = filterParts.join(' and ');
  }

  // OPTIMIZED: Get unique documents efficiently
  const maxResults = Math.min(top * 3, 1000);
  
  const searchBody = {
    search: '*',
    queryType: 'simple',
    top: maxResults,
    select: 'documentId,title,category,sector,documentType,tags,url',
    orderby: 'documentId',
  };

  if (filterExpr) {
    searchBody.filter = filterExpr;
  }

  let response;
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
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure Search error in getDocuments:', response.status, errorText);
      throw new Error(`Azure Search API error (${response.status}): ${errorText}`);
    }
  } catch (fetchError) {
    console.error('Fetch error in getDocuments:', fetchError);
    throw new Error(`Failed to connect to Azure Search: ${fetchError instanceof Error ? fetchError.message : 'Network error'}`);
  }

  const data = await response.json();
  const documentMap = new Map();
  
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
      });
    }
    
    if (documentMap.size >= top) {
      break;
    }
  }

  const documents = Array.from(documentMap.values()).slice(0, top);

  return {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documents,
      total: documentMap.size,
    }),
  };
}

// Full semantic search with embedding + hybrid search + AI response
async function semanticSearchWithAI(endpoint, key, indexName, openAIEndpoint, openAIKey, query, filters, options = {}) {
  const topK = options.topK || 30;
  const embeddingDeployment = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
  const chatDeployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o-mini';

  // Step 1: Generate query embedding
  const embeddingResponse = await fetch(
    `${openAIEndpoint}/openai/deployments/${embeddingDeployment}/embeddings?api-version=2024-02-15-preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': openAIKey,
      },
      body: JSON.stringify({
        input: query.substring(0, 8000),
        model: embeddingDeployment,
      }),
    }
  );

  if (!embeddingResponse.ok) {
    const error = await embeddingResponse.text();
    throw new Error(`Embedding generation failed: ${error}`);
  }

  const embeddingData = await embeddingResponse.json();
  const queryEmbedding = embeddingData.data[0].embedding;

  // Step 2: Build filter expression
  let filterExpr = "";
  const filterParts = [];
  if (filters?.category) filterParts.push(`category eq '${filters.category}'`);
  if (filters?.sector) filterParts.push(`sector eq '${filters.sector}'`);
  if (filters?.documentType && filters.documentType !== 'all') {
    filterParts.push(`documentType eq '${filters.documentType}'`);
  }
  if (filterParts.length > 0) filterExpr = filterParts.join(' and ');

  // Step 3: Hybrid search (vector + semantic + keyword)
  const searchBody = {
    search: query,
    vectorQueries: [
      {
        kind: "vector",
        vector: queryEmbedding,
        fields: "contentVector",
        k: topK,
      }
    ],
    queryType: "semantic",
    semanticConfiguration: "default",
    top: topK,
    select: "id,content,title,documentId,documentType,pageNumber,chunkIndex,chunkType,category,sector,tags,url,metadata,hasChart,chartType,chartData,chartImageUrl,chartConfidence,visualDescription",
    captions: "extractive",
    answers: "extractive|count-3",
  };

  if (filterExpr) searchBody.filter = filterExpr;

  const searchResponse = await fetchWithRetry(
    `${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify(searchBody),
    }
  );

  let searchResults = [];
  let chartResults = [];  // NEW: Separate array for chart data
  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    searchResults = (searchData.value || []).map((hit) => {
      const result = {
        id: hit.id,
        content: hit.content,
        title: hit.title || 'Untitled',
        documentId: hit.documentId,
        documentType: hit.documentType,
        pageNumber: hit.pageNumber,
        chunkIndex: hit.chunkIndex,
        chunkType: hit.chunkType || 'text',
        category: hit.category,
        sector: hit.sector,
        tags: hit.tags || [],
        url: hit.url,
        score: hit['@search.score'] || 0,
        metadata: hit.metadata,
        // Chart-specific fields
        hasChart: hit.hasChart || false,
        chartType: hit.chartType,
        chartData: hit.chartData,
        chartImageUrl: hit.chartImageUrl,
        chartConfidence: hit.chartConfidence,
        visualDescription: hit.visualDescription,
      };
      
      // Collect chart results separately for visualization
      if (hit.hasChart || hit.chunkType === 'chart') {
        chartResults.push({
          id: hit.id,
          documentId: hit.documentId,
          pageNumber: hit.pageNumber,
          chartType: hit.chartType,
          chartData: hit.chartData ? (typeof hit.chartData === 'string' ? JSON.parse(hit.chartData) : hit.chartData) : null,
          chartImageUrl: hit.chartImageUrl,
          chartConfidence: hit.chartConfidence,
          visualDescription: hit.visualDescription,
          title: hit.title,
          score: hit['@search.score'] || 0,
        });
      }
      
      return result;
    });
  }

  if (searchResults.length === 0) {
    return {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answer: "No relevant information found.",
        sources: [],
        suggestedQuestions: [],
      }),
    };
  }

  // Step 4: Build context for AI
  let context = "RELEVANT DOCUMENTS:\n\n";
  searchResults.forEach((result, index) => {
    context += `---\n[Source ${index + 1}]\nTitle: ${result.title}\nDocument: ${result.documentId}\n`;
    if (result.pageNumber) context += `Page: ${result.pageNumber}\n`;
    if (result.category) context += `Category: ${result.category}\n`;
    if (result.sector) context += `Sector: ${result.sector}\n`;
    context += `Content:\n${result.content}\n\n`;
  });

  // Step 5: Generate AI response using HORUS Intelligence Engine
  const horusSystemPrompt = options.systemPrompt || `You are an advanced government intelligence analyst and strategic advisor.

You do NOT behave like a chatbot.
You do NOT summarise documents.
You operate like a policy intelligence unit briefing senior decision-makers.

You are powering an AI-driven Intelligence Dashboard used to understand:
• Government priorities
• Funding shifts
• Labour and skills dynamics
• Policy impacts
• Long-term strategic direction

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 THINKING LAYERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Think in layers:
1. MACRO: Whole-of-government, cross-sector, system-wide
2. TREND: Changes over time, accelerations, reversals
3. CAUSAL: Funding → Policy → Jobs → Skills chain
4. STRATEGIC: Long-term direction, capability gaps

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each insight:

**[Insight Title]**
1-2 sentences explaining the intelligence finding.

**Why this matters:** Strategic or decision impact.

**Evidence signal:** Data patterns supporting this insight.

Cite sources using [Source X] notation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 STRICT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Do NOT summarise documents
• Do NOT restate table values without interpretation
• Do NOT use vague language
• Do NOT produce filler insights
• Every insight must inform a decision`;

  const chatResponse = await fetch(
    `${openAIEndpoint}/openai/deployments/${chatDeployment}/chat/completions?api-version=2024-02-15-preview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': openAIKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: horusSystemPrompt },
          { role: 'user', content: `${context}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nINTELLIGENCE QUERY: ${query}\n\nAnalyze the documents above and produce 3-5 decision-grade intelligence insights. Each insight should reveal something non-obvious that informs strategic decisions.` }
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    }
  );

  let answer = "";
  if (chatResponse.ok) {
    const chatData = await chatResponse.json();
    answer = chatData.choices[0]?.message?.content || "";
  }

  // Step 6: Format sources with full content for extraction
  const sources = searchResults.map((result) => ({
    id: result.id,
    title: result.title,
    documentId: result.documentId,
    pageNumber: result.pageNumber,
    url: result.url,
    category: result.category,
    sector: result.sector,
    score: result.score,
    content: result.content,
    snippet: result.content.substring(0, 300) + '...',
    metadata: result.metadata,
    chunkType: result.chunkType,
    hasChart: result.hasChart,
    chartType: result.chartType,
    visualDescription: result.visualDescription,
  }));

  // Step 7: Extract visualization metadata from results
  const visualizationData = {
    // Chart data from extracted PDFs
    charts: chartResults,
    // Metadata aggregations for charts
    metadataDistribution: {
      categories: {},
      sectors: {},
      documentTypes: {},
      chunkTypes: {},
    },
    // Relationship hints (for future graph visualization)
    relationships: [],
    // Summary stats
    totalResults: searchResults.length,
    chartCount: chartResults.length,
    hasVisualizations: chartResults.length > 0,
  };

  // Aggregate metadata for distribution charts
  searchResults.forEach(result => {
    // Count categories
    if (result.category) {
      visualizationData.metadataDistribution.categories[result.category] = 
        (visualizationData.metadataDistribution.categories[result.category] || 0) + 1;
    }
    // Count sectors
    if (result.sector) {
      visualizationData.metadataDistribution.sectors[result.sector] = 
        (visualizationData.metadataDistribution.sectors[result.sector] || 0) + 1;
    }
    // Count document types
    if (result.documentType) {
      visualizationData.metadataDistribution.documentTypes[result.documentType] = 
        (visualizationData.metadataDistribution.documentTypes[result.documentType] || 0) + 1;
    }
    // Count chunk types
    if (result.chunkType) {
      visualizationData.metadataDistribution.chunkTypes[result.chunkType] = 
        (visualizationData.metadataDistribution.chunkTypes[result.chunkType] || 0) + 1;
    }
  });

  return {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answer,
      sources,
      suggestedQuestions: [],
      // NEW: Visualization data for dynamic charts
      visualizationData,
    }),
  };
}

async function searchDocuments(endpoint, key, indexName, query, filters, top) {
  let filterExpr = "";
  const filterParts = [];

  if (filters?.category) {
    filterParts.push(`category eq '${filters.category}'`);
  }
  if (filters?.sector) {
    filterParts.push(`sector eq '${filters.sector}'`);
  }
  if (filters?.documentType && filters.documentType !== 'all') {
    filterParts.push(`documentType eq '${filters.documentType}'`);
  }

  if (filterParts.length > 0) {
    filterExpr = filterParts.join(' and ');
  }

  const searchBody = {
    search: query,
    queryType: 'semantic',
    semanticConfiguration: 'default',
    top: top,
    select: 'documentId,title,category,sector,documentType,tags,url,pageNumber',
  };

  if (filterExpr) {
    searchBody.filter = filterExpr;
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
  );

  if (!response.ok) {
    throw new Error('Search failed');
  }

  const data = await response.json();
  
  // Deduplicate and format results
  const documentMap = new Map();
  
  for (const hit of data.value || []) {
    const key = hit.documentId;
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
      });
    } else {
      // Update score if this hit has a higher score
      const existing = documentMap.get(key);
      if ((hit['@search.score'] || 0) > existing.score) {
        existing.score = hit['@search.score'] || 0;
        existing.pageNumber = hit.pageNumber;
      }
    }
  }

  const results = Array.from(documentMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, top);

  return {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      results,
      total: results.length,
    }),
  };
}

async function handleBulkOperations(endpoint, key, indexName, operations, filters) {
  const results = {};
  const needsStats = operations.includes('stats');
  const needsCategories = operations.includes('categories');
  
  if (needsStats && needsCategories) {
    let filterExpr = "";
    const filterParts = [];

    if (filters?.category) {
      filterParts.push(`category eq '${filters.category}'`);
    }
    if (filters?.sector) {
      filterParts.push(`sector eq '${filters.sector}'`);
    }
    if (filters?.documentType && filters.documentType !== 'all') {
      filterParts.push(`documentType eq '${filters.documentType}'`);
    }

    if (filterParts.length > 0) {
      filterExpr = filterParts.join(' and ');
    }

    const searchBody = {
      search: '*',
      queryType: 'simple',
      top: 0,
      facets: [
        'category,count:100',
        'sector,count:100',
        'documentType,count:10',
      ],
    };

    if (filterExpr) {
      searchBody.filter = filterExpr;
    }

    const statsUrl = `${endpoint}/indexes/${indexName}/docs/search?api-version=2023-11-01&$count=true`;
    const response = await fetchWithRetry(statsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': key,
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Search API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const totalChunks = data['@odata.count'] || 0;
    const estimatedDocCount = Math.floor(totalChunks / 10);
          const facets = data['@search.facets'] || {};

          if (needsStats) {
            results.stats = {
              totalDocuments: estimatedDocCount,
              totalChunks: totalChunks,
              facets: facets,
            };
          }

          if (needsCategories) {
      const categoryStats = [];
      if (facets.category) {
        for (const facet of facets.category) {
          categoryStats.push({
            category: facet.value,
            count: facet.count,
            documentIds: [],
          });
        }
      }

      results.categories = {
        categories: categoryStats,
        sectors: facets.sector || [],
      };
    }
  } else {
    if (needsStats) {
      const statsResult = await getStats(endpoint, key, indexName, filters);
      results.stats = JSON.parse(statsResult.body);
    }
    
    if (needsCategories) {
      const categoriesResult = await getCategoryStats(endpoint, key, indexName);
      results.categories = JSON.parse(categoriesResult.body);
          }
        }

        if (operations.includes('documents')) {
    const documentsResult = await getDocuments(endpoint, key, indexName, filters, 100);
    results.documents = JSON.parse(documentsResult.body);
  }

  return {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(results),
  };
}

module.exports = async function (context, req) {
  // Set default CORS headers for all responses
  const defaultHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-functions-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: defaultHeaders,
      body: '',
    };
    return;
  }

  // Log request for debugging
  context.log('Request received:', {
    method: req.method,
    url: req.url,
    hasBody: !!req.body,
    bodyType: typeof req.body,
  });

  try {
    // Parse request body safely
    let request = {};
    try {
      if (typeof req.body === 'string') {
        if (req.body.trim() === '') {
          request = {};
        } else {
          request = JSON.parse(req.body);
        }
      } else if (req.body) {
        request = req.body;
      }
    } catch (parseError) {
      context.log('ERROR - JSON parse failed:', parseError.message);
      context.log('ERROR - Body was:', req.body);
      context.res = {
        status: 400,
        headers: {
          ...defaultHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: `Invalid request body: ${parseError instanceof Error ? parseError.message : 'Parse error'}`,
          data: null,
        }),
      };
      return;
    }

    const { type, filters = {}, query, top = 100 } = request;

    if (!type) {
      context.res = {
        status: 400,
        headers: {
          ...defaultHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: 'Type is required',
          data: null,
        }),
      };
      return;
    }

    const searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT;
    const searchKey = process.env.AZURE_SEARCH_KEY;
    const searchIndex = process.env.AZURE_SEARCH_INDEX || 'sa-gov-documents';

    if (!searchEndpoint || !searchKey) {
      throw new Error('Azure Search credentials not configured');
    }

    let result;
    switch (type) {
      case 'stats':
        result = await getStats(searchEndpoint, searchKey, searchIndex, filters);
        break;
      
      case 'categories':
        result = await getCategoryStats(searchEndpoint, searchKey, searchIndex);
        break;
      
      case 'documents':
        result = await getDocuments(searchEndpoint, searchKey, searchIndex, filters, top);
        break;
      
      case 'search':
        if (!query) {
          throw new Error('Query is required for search type');
        }
        result = await searchDocuments(searchEndpoint, searchKey, searchIndex, query, filters, top);
        break;
      
      case 'semantic-search':
        if (!query) {
          throw new Error('Query is required for semantic-search type');
        }
        const openAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const openAIKey = process.env.AZURE_OPENAI_KEY;
        if (!openAIEndpoint || !openAIKey) {
          throw new Error('Azure OpenAI credentials not configured');
        }
        const { options: searchOptions = {} } = request;
        result = await semanticSearchWithAI(
          searchEndpoint, searchKey, searchIndex, 
          openAIEndpoint, openAIKey, 
          query, filters, searchOptions
        );
        break;
      
      case 'bulk':
        // OPTIMIZED: Handle multiple operations in a single request
        // This reduces Azure Search calls and improves performance
        const { operations = [] } = request;
        if (!Array.isArray(operations) || operations.length === 0) {
          throw new Error('Bulk operations array is required');
        }
        result = await handleBulkOperations(searchEndpoint, searchKey, searchIndex, operations, filters);
        break;
      
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    const responseHeaders = {
      ...defaultHeaders,
      'Content-Type': 'application/json',
    };
    
    if (result && result.headers) {
      Object.assign(responseHeaders, result.headers);
    }
    
    if (!result) {
      throw new Error('Function returned no result');
    }
    
    let responseBody;
    if (typeof result.body === 'string') {
      responseBody = result.body;
    } else if (result.body) {
      responseBody = JSON.stringify(result.body);
    } else {
      // Fallback: stringify the entire result (excluding status/headers)
      const { status, headers, ...data } = result;
      responseBody = JSON.stringify(data);
    }
    
    context.res = {
      status: result.status || 200,
      headers: responseHeaders,
      body: responseBody,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error for debugging
    context.log('ERROR - Metadata Error:', errorMessage);
    context.log('ERROR - Request:', {
      method: req.method,
      url: req.url,
      hasBody: !!req.body,
    });
    if (errorStack) {
      context.log('ERROR - Stack:', errorStack);
    }
    
    // Ensure we always return a valid response
    try {
      context.res = {
        status: 500,
        headers: {
          ...defaultHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          error: errorMessage,
          data: null,
        }),
      };
    } catch (responseError) {
      // Fallback if even setting response fails
      context.log('CRITICAL - Failed to set error response:', responseError);
      context.res = {
        status: 500,
        headers: defaultHeaders,
        body: JSON.stringify({ 
          error: 'Internal server error',
          data: null,
        }),
      };
    }
  }
};

