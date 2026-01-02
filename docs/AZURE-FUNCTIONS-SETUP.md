# Azure Functions Setup for Dashboard Intelligence

## Overview

This document describes the hybrid architecture where **Azure Functions** handle dashboard intelligence operations (metadata, stats, aggregations) while **Supabase Edge Functions** handle chat and conversational queries.

## Architecture

```
Frontend (React)
├── Dashboard Components → Azure Functions (rag-metadata)
│   ├── Intelligence Overview
│   ├── Funding Dashboard
│   ├── Skills Dashboard
│   ├── Careers Dashboard
│   └── Metadata/Stats
│
└── Chat/Coach Components → Supabase Edge Functions
    ├── rag-query (semantic search)
    ├── rag-chat (conversational AI)
    └── career-coach (user interactions)
```

## Why Azure Functions for Dashboards?

1. **No Timeout Issues**: 10-minute execution limit vs 60 seconds
2. **Full Data Access**: Can process all 26,000 chunks without limitations
3. **Better Performance**: Native Azure integration, same region
4. **Enterprise Showcase**: Full Azure stack demonstrates enterprise capabilities
5. **Cost Efficient**: Pay-per-use (Consumption plan), only for heavy operations
6. **Scalability**: Auto-scales to handle concurrent users

## Prerequisites

1. Azure subscription with deployed infrastructure (via `main.bicep`)
2. Azure Functions Core Tools (optional, for local development)
3. Azure CLI installed and configured

## Deployment

### Step 1: Deploy Infrastructure

The Function App is created automatically when you deploy the main Bicep template:

```powershell
cd infrastructure
.\deploy.ps1 -ResourceGroupName "rg-careercraft-dev" -EnableOpenAI
```

This creates:
- Function App with Consumption plan
- Application Insights for monitoring
- All required environment variables

### Step 2: Deploy Function Code

Deploy the function code using the deployment script:

```powershell
cd infrastructure
.\deploy-azure-functions.ps1 -ResourceGroupName "rg-careercraft-dev" -Environment "dev"
```

Or manually using Azure Functions Core Tools:

```bash
cd azure-functions
func azure functionapp publish careercraft-functions-dev
```

### Step 3: Configure Frontend

Add these environment variables to your frontend `.env` file:

```env
VITE_AZURE_FUNCTIONS_URL=https://careercraft-functions-dev.azurewebsites.net
VITE_AZURE_FUNCTIONS_KEY=<function-key>
```

To get the function key:

```powershell
az functionapp keys list --resource-group rg-careercraft-dev --name careercraft-functions-dev --query "functionKeys.default" -o tsv
```

## Function Details

### rag-metadata Function

**Endpoint**: `https://<function-app-url>/api/rag-metadata`

**Methods**: POST, OPTIONS (for CORS)

**Authentication**: Function-level key (via `x-functions-key` header)

**Request Body**:
```json
{
  "type": "stats" | "documents" | "categories" | "search",
  "filters": {
    "category": "string (optional)",
    "sector": "string (optional)",
    "documentType": "pdf" | "web" | "all",
    "tags": ["string array (optional)"]
  },
  "query": "string (required for search type)",
  "top": "number (optional, default: 100)"
}
```

**Response**:
```json
{
  "totalDocuments": 2600,
  "totalChunks": 26000,
  "facets": { ... },
  "documents": [ ... ],
  "categories": [ ... ],
  "sectors": [ ... ],
  "results": [ ... ]
}
```

## Environment Variables (Function App)

The following environment variables are automatically configured in the Function App:

- `AZURE_SEARCH_ENDPOINT` - Azure AI Search endpoint
- `AZURE_SEARCH_KEY` - Azure AI Search API key
- `AZURE_SEARCH_INDEX` - Search index name (default: `sa-gov-documents`)
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint (if enabled)
- `AZURE_OPENAI_KEY` - Azure OpenAI API key (if enabled)
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` - Embedding model deployment
- `AZURE_OPENAI_CHAT_DEPLOYMENT` - Chat model deployment
- `APPINSIGHTS_INSTRUMENTATIONKEY` - Application Insights key

## Monitoring

### Application Insights

All function executions are logged to Application Insights. View logs in Azure Portal:

1. Navigate to Function App
2. Click "Application Insights" in the left menu
3. View logs, metrics, and performance data

### Function Logs

View real-time logs:

```powershell
az functionapp log tail --resource-group rg-careercraft-dev --name careercraft-functions-dev
```

## Cost Estimation

**Consumption Plan (Pay-per-use)**:
- First 1 million requests/month: FREE
- After that: $0.20 per million requests
- Execution time: $0.000016 per GB-second
- Estimated cost for 100K requests/month: ~$0-5/month

**Total with infrastructure**: ~$275-365/month (including Search, OpenAI, etc.)

## Troubleshooting

### Function Not Deploying

1. Check Function App exists: `az functionapp list --resource-group <rg>`
2. Verify function code is in `azure-functions/rag-metadata/`
3. Check deployment logs in Azure Portal

### CORS Issues

CORS is configured to allow all origins (`*`). For production, update in:
- Azure Portal → Function App → CORS settings
- Or in `infrastructure/modules/azure-functions.bicep`

### Timeout Issues

Function timeout is set to 10 minutes (max for Consumption plan). If you need longer:
- Upgrade to Premium plan (unlimited timeout)
- Or optimize queries to complete faster

### Rate Limiting

The function includes built-in rate limiting (100ms between requests) and retry logic. If you still hit limits:
- Increase Azure Search tier
- Add more replicas/partitions
- Implement request queuing

## Migration from Supabase

The frontend automatically uses Azure Functions if `VITE_AZURE_FUNCTIONS_URL` is configured. If not set, it falls back to Supabase Edge Functions.

To test migration:
1. Set environment variables
2. Restart frontend
3. Check browser console for which backend is being used
4. Verify dashboard components load correctly

## Rollback

If you need to rollback to Supabase:
1. Remove `VITE_AZURE_FUNCTIONS_URL` from `.env`
2. Restart frontend
3. Functions will automatically use Supabase Edge Functions

## Support

For issues or questions:
1. Check Application Insights logs
2. Review function execution logs
3. Verify environment variables are set correctly
4. Check Azure Search and OpenAI service status

