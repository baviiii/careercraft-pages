# RAG System Environment Variables

## Required Variables for Supabase Edge Functions

Add these to your Supabase project: **Settings > Edge Functions > Secrets**

### Azure AI Search
```
AZURE_SEARCH_ENDPOINT=https://careercraft-search-dev.search.windows.net
AZURE_SEARCH_KEY=1kn8HVzeYuz2s6ceQSMj42LR5WwUaNOw14vYAGgoJMAzSeBP8HKl
AZURE_SEARCH_INDEX=sa-gov-documents
```

### Azure OpenAI
```
AZURE_OPENAI_ENDPOINT=https://careercraft-openai-dev.openai.azure.com/
AZURE_OPENAI_KEY=321bbea1de2f40aab0b972eeebfd9d0d
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4
```

### Azure Storage (for document URLs)
```
AZURE_STORAGE_ACCOUNT=ccdevc5takjp4zp3pw
AZURE_STORAGE_CONTAINER=rag-documents
```

---

## How to Add Secrets in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Click **Add Secret**
4. Add each variable above

---

## Deploy GPT-4 Model (Required for Chat)

You need to deploy a GPT-4 model for response generation:

```powershell
az cognitiveservices account deployment create `
    --name careercraft-openai-dev `
    --resource-group rg-careercraft-dev `
    --deployment-name gpt-4 `
    --model-name gpt-4 `
    --model-version "turbo-2024-04-09" `
    --model-format OpenAI `
    --sku-capacity 1 `
    --sku-name Standard
```

---

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

