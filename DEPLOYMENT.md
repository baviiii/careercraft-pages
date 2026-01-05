# Deployment Guide

This guide will help you deploy CareerCraft to Vercel and configure all necessary environment variables.

## Prerequisites

- Vercel account
- Supabase account with project set up
- Azure account with OpenAI and AI Search resources

## Step 1: Fill in Your `.env` File

1. Copy `.env.example` to `.env` if you haven't already
2. Fill in all the values with your actual credentials:

```bash
# Get these from Azure Portal → Azure OpenAI Service
AZURE_OPENAI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
AZURE_OPENAI_KEY=YOUR-KEY-HERE

# Get these from Azure Portal → Azure AI Search
AZURE_SEARCH_ENDPOINT=https://YOUR-SEARCH.search.windows.net
AZURE_SEARCH_KEY=YOUR-KEY-HERE

# Get from Azure Portal → Document Intelligence (optional)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://YOUR-DOC-INTEL.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=YOUR-KEY-HERE

# Get from Supabase Dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
```

## Step 2: Set Up Supabase Edge Function Secrets

**IMPORTANT**: Supabase Edge Functions need their own environment variables set separately.

### Using Supabase CLI:

```bash
# Navigate to your project
cd "C:\Users\asees\Downloads\free-lance work\careercraft-pages"

# Set each secret (run these one by one)
supabase secrets set AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
supabase secrets set AZURE_OPENAI_KEY=your-key-here
supabase secrets set AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-4o-mini
supabase secrets set AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-3-large
supabase secrets set AZURE_OPENAI_API_KEY=your-key-here
supabase secrets set AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini

supabase secrets set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your-endpoint
supabase secrets set AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key

supabase secrets set AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
supabase secrets set AZURE_SEARCH_KEY=your-key
supabase secrets set AZURE_SEARCH_INDEX=sa-gov-documents

supabase secrets set SUPABASE_URL=https://hfchxjytxhsiuwqaugmv.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional API keys
supabase secrets set LOVABLE_API_KEY=your-lovable-key
supabase secrets set ADZUNA_APP_ID=your-adzuna-id
supabase secrets set ADZUNA_APP_KEY=your-adzuna-key
supabase secrets set JSEARCH_API_KEY=your-jsearch-key
supabase secrets set CURRENTS_API_KEY=your-currents-key
```

### Or via Supabase Dashboard:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **Edge Functions**
4. Click **Add Secret** for each variable above

## Step 3: Deploy Edge Functions

Deploy the updated `parse-resume` function:

```bash
supabase functions deploy parse-resume
```

Deploy all other functions if needed:

```bash
supabase functions deploy
```

## Step 4: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Deploy
vercel

# For production
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect Vite config
4. Click **Deploy**

**Note**: You DON'T need to add environment variables to Vercel for this project because:
- Supabase credentials are hardcoded in `src/integrations/supabase/client.ts`
- Azure credentials are set in Supabase Edge Function secrets (server-side)

## Step 5: Test Your Deployment

After deployment, test these features:

1. **Quick Resume Parse**: Upload a PDF using Quick mode
2. **Advanced Resume Parse**: Upload a scanned document using Advanced mode
3. **Intelligence Dashboard**: Navigate to Intelligence → Overview
4. **Job Search**: Try searching for jobs in different locations

## Environment Variables Summary

### ✅ Required for Core Features:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_CHAT_DEPLOYMENT`
- `SUPABASE_SERVICE_ROLE_KEY`

### ✅ Required for Intelligence Dashboard:
- `AZURE_SEARCH_ENDPOINT`
- `AZURE_SEARCH_KEY`
- `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`

### ⚠️ Optional (Advanced Resume Parsing):
- `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- `AZURE_DOCUMENT_INTELLIGENCE_KEY`

### ⚠️ Optional (Job/News Features):
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`
- `JSEARCH_API_KEY`
- `CURRENTS_API_KEY`
- `LOVABLE_API_KEY`

## Troubleshooting

### Issue: "AI parsing not available" error
**Solution**: Make sure `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_KEY` are set in Supabase secrets

### Issue: Advanced mode fails but Quick mode works
**Solution**: This is expected if `AZURE_DOCUMENT_INTELLIGENCE_*` variables aren't set. Quick mode will still work fine.

### Issue: Intelligence dashboard shows no data
**Solution**: Ensure `AZURE_SEARCH_ENDPOINT` and `AZURE_SEARCH_KEY` are set, and your index has data

### Issue: Edge Function timeout
**Solution**: This is normal for Advanced mode on large PDFs. Recommend users use Quick mode for faster processing.

## Cost Optimization

- **Quick Mode**: ~$0.0015 per resume (GPT only)
- **Advanced Mode**: ~$0.0030 per resume (Azure DI + GPT)
- **Intelligence Dashboard**: $75-250/month (Azure AI Search time-based)

Encourage users to use Quick mode by default to save costs!

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Functions → Logs
2. Check Vercel logs: Dashboard → Deployments → Click deployment → Logs
3. Verify all secrets are set correctly in Supabase
