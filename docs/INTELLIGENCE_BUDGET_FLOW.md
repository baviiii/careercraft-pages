# How Budget Details Are Fetched (Intelligence Dashboard)

Use this to debug why budget numbers or insights change on reload.

## End-to-end flow

1. **Page load**  
   `IntelligenceContext` runs `initialize()` and calls:
   - `fetchTabData("overview")`
   - `fetchTabData("funding")`
   - `fetchTabData("careers")`
   - `fetchTabData("skills")`
   in parallel (see `IntelligenceContext.tsx` ~2862).

2. **Per-tab fetch (e.g. funding)**  
   - **Query (fixed per tab):** `SEMANTIC_QUERIES.funding.primary` from `src/lib/intelligencePrompts.ts` (line ~408).  
     One query only; `secondary` is not used here.
   - **Filters:** `SEMANTIC_QUERIES.funding.filters` → `{ documentType: "all" }` (no category filter).
   - **Options:** `topK: 120`, `systemPrompt: getTabPrompt("funding")`.
   - **Call:** `semanticSearch(queryConfig.primary, queryConfig.filters, { topK, systemPrompt })` in `IntelligenceContext.tsx` ~2371.

3. **RAG (useRAGMetadata → Azure)**  
   - `useRAGMetadata.ts`: `semanticSearch()` builds cache key from `{ query, filters, options }`.  
     Same key → 5 min cache (if cache hit, no new request).
   - Request goes to Azure Function **rag-metadata** (`azure-functions/rag-metadata/index.js`):
     - **Embedding:** Query text → Azure OpenAI embedding (deterministic).
     - **Search:** Vector + hybrid search, `topK` chunks, filter by `documentType: "all"`.  
       Chunk order can vary slightly (e.g. ties, scoring).
     - **Chat:** Context = concatenation of those chunks; user message = query + “produce 3–5 insights”.  
       **LLM uses `temperature: 0.4`** → **answer text varies on every request** → different parsed insights and different `extractFundingFromAnswer()` results on reload.

4. **Back in the frontend**  
   - **Sources:** `result.sources` = the same topK chunks (order may vary).
   - **Answer:** `result.answer` = model-generated text (varies because of temperature).
   - **Funding data:**
     - `fromSources` = `extractFundingAllocations(sources)` (tables + text in chunks).
     - `fromAnswer` = `extractFundingFromAnswer(result.answer)` (structured lines in the model reply).
   - Merge: per sector, keep the **higher** amount (`fromSources` vs `fromAnswer`).
   - Then: `removeSameAmountDuplicates()`, sort by amount, set `state.fundingAllocations`.

## Prompts used for funding

- **Search query (user message to retrieval):**  
  `src/lib/intelligencePrompts.ts` → `SEMANTIC_QUERIES.funding.primary`  
  (long string: “Extract South Australia government budget allocations 2024-25 by sector…”).

- **System prompt (model behaviour):**  
  `getTabPrompt("funding")` = `INTELLIGENCE_ANALYST_SYSTEM_PROMPT` + `TAB_PROMPTS.funding`  
  in `src/lib/intelligencePrompts.ts` (lines ~28–234: fiscal rules, output format “Sector: X | Amount: $Y …”).

- **Backend fallback:**  
  If no `options.systemPrompt` is passed, `rag-metadata/index.js` uses its own default HORUS system prompt (~747).

## Why “every reload gets different” results

1. **Temperature 0.4** in `rag-metadata` chat completions → different answer text each time → different insights and different parsed sector/amounts from the answer.
2. **Cache:** After a full page reload, in-memory cache is empty, so every tab does a fresh search + chat.
3. **Vector search:** Same query can return the same set of chunks in a slightly different order (e.g. ties), so context order can change and the model may emphasise different parts.

## Making budget details stable

- **Done:** `azure-functions/rag-metadata/index.js` chat completions use **temperature: 0** so the same chunks + query produce the same answer. Budget details and insights should be stable across reloads (until cache expires or index content changes).
