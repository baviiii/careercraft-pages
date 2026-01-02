# RAG System Environment Variables

## Required Variables for Supabase Edge Functions

Add these to your Supabase project: **Settings > Edge Functions > Secrets**

### Azure AI Search
```
AZURE_SEARCH_ENDPOINT=https://careercraft-search-dev.search.windows.net
AZURE_SEARCH_KEY=<your-search-key>
AZURE_SEARCH_INDEX=sa-gov-documents
```

### Azure OpenAI
```
AZURE_OPENAI_ENDPOINT=https://careercraft-openai-dev.openai.azure.com/
AZURE_OPENAI_KEY=<your-openai-key>
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
```

### Azure Document Intelligence (for Resume Parser)
```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://careercraft-docintel-dev.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<your-docintel-key>
```

### Azure Storage (for document URLs)
```
AZURE_STORAGE_ACCOUNT=ccdevc5takjp4zp3pw
AZURE_STORAGE_CONTAINER=rag-documents
```

---

## Get Your Keys (Run in PowerShell)

```powershell
# AI Search Key
az search admin-key show --resource-group rg-careercraft-dev --service-name careercraft-search-dev --query primaryKey -o tsv

# OpenAI Key  
az cognitiveservices account keys list --name careercraft-openai-dev --resource-group rg-careercraft-dev --query key1 -o tsv

# Document Intelligence Key
az cognitiveservices account keys list --name careercraft-docintel-dev --resource-group rg-careercraft-dev --query key1 -o tsv
```

---

## How to Add Secrets in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Click **Add Secret**
4. Add each variable above

---

## OpenAI Models Deployed

| Model | Deployment Name | Purpose |
|-------|-----------------|---------|
| `text-embedding-3-large` | `text-embedding-3-large` | Vector embeddings |
| `gpt-4o-mini` | `gpt-4o-mini` | Chat/RAG answers |

Both are deployed in Australia East with GlobalStandard SKU.

---

## Hybrid Architecture

This system uses a hybrid architecture:
- **Supabase Edge Functions**: Chat, conversational queries (`rag-query`, `rag-chat`)
- **Azure Functions**: Dashboard intelligence, metadata (`rag-metadata`)

See `docs/AZURE-FUNCTIONS-SETUP.md` for Azure Functions configuration.

## Test the RAG System

After deploying functions, test with:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/rag-query' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "What healthcare jobs are available in South Australia?",
    "options": {
      "topK": 5,
      "responseStyle": "detailed"
    }
  }'
```

---

## Functions Overview

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `rag-query` | One-shot Q&A with citations | `/functions/v1/rag-query` |
| `rag-chat` | Conversational with history | `/functions/v1/rag-chat` |
| `rag-tag-documents` | Auto-tag documents | `/functions/v1/rag-tag-documents` |
| `rag-extract-insights` | Extract budgets/trends | `/functions/v1/rag-extract-insights` |
| `parse-resume` | AI resume/document parser | `/functions/v1/parse-resume` |

---

## AI Resume Parser

The `parse-resume` function uses Azure Document Intelligence + GPT-4o-mini to:
- Parse PDFs, Word docs, images (OCR)
- Extract personal info, work experience, education, skills
- Auto-populate the template builder

**Usage:**
```typescript
const formData = new FormData()
formData.append('file', file)

const { data } = await supabase.functions.invoke('parse-resume', {
  body: formData
})

// data.parsed contains structured resume data
```

