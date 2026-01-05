#!/bin/bash
# Set Supabase Edge Function Secrets
# This script reads from your .env file and sets all secrets in Supabase

echo "🚀 Setting Supabase Edge Function secrets..."
echo "Make sure you've filled in your .env file first!"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file from .env.example"
    exit 1
fi

# Source the .env file
set -a
source .env
set +a

echo "📝 Setting Azure OpenAI secrets..."
supabase secrets set AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT"
supabase secrets set AZURE_OPENAI_KEY="$AZURE_OPENAI_KEY"
supabase secrets set AZURE_OPENAI_CHAT_DEPLOYMENT="$AZURE_OPENAI_CHAT_DEPLOYMENT"
supabase secrets set AZURE_OPENAI_EMBEDDING_DEPLOYMENT="$AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
supabase secrets set AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY"
supabase secrets set AZURE_OPENAI_DEPLOYMENT="$AZURE_OPENAI_DEPLOYMENT"

echo "📝 Setting Azure Document Intelligence secrets..."
supabase secrets set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="$AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"
supabase secrets set AZURE_DOCUMENT_INTELLIGENCE_KEY="$AZURE_DOCUMENT_INTELLIGENCE_KEY"

echo "📝 Setting Azure AI Search secrets..."
supabase secrets set AZURE_SEARCH_ENDPOINT="$AZURE_SEARCH_ENDPOINT"
supabase secrets set AZURE_SEARCH_KEY="$AZURE_SEARCH_KEY"
supabase secrets set AZURE_SEARCH_INDEX="$AZURE_SEARCH_INDEX"

echo "📝 Setting Supabase secrets..."
supabase secrets set SUPABASE_URL="$SUPABASE_URL"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

echo "📝 Setting optional API keys..."
if [ ! -z "$LOVABLE_API_KEY" ]; then
    supabase secrets set LOVABLE_API_KEY="$LOVABLE_API_KEY"
fi

if [ ! -z "$ADZUNA_APP_ID" ]; then
    supabase secrets set ADZUNA_APP_ID="$ADZUNA_APP_ID"
    supabase secrets set ADZUNA_APP_KEY="$ADZUNA_APP_KEY"
fi

if [ ! -z "$JSEARCH_API_KEY" ]; then
    supabase secrets set JSEARCH_API_KEY="$JSEARCH_API_KEY"
fi

if [ ! -z "$CURRENTS_API_KEY" ]; then
    supabase secrets set CURRENTS_API_KEY="$CURRENTS_API_KEY"
fi

echo ""
echo "✅ All secrets have been set!"
echo ""
echo "Next steps:"
echo "1. Deploy Edge Functions: supabase functions deploy"
echo "2. Deploy to Vercel: vercel --prod"
echo ""
