# Set Supabase Edge Function Secrets
# This script reads from your .env file and sets all secrets in Supabase

Write-Host "🚀 Setting Supabase Edge Function secrets..." -ForegroundColor Cyan
Write-Host "Make sure you've filled in your .env file first!"
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file from .env.example"
    exit 1
}

# Read .env file and parse variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

Write-Host "📝 Setting Azure OpenAI secrets..." -ForegroundColor Green
supabase secrets set "AZURE_OPENAI_ENDPOINT=$env:AZURE_OPENAI_ENDPOINT"
supabase secrets set "AZURE_OPENAI_KEY=$env:AZURE_OPENAI_KEY"
supabase secrets set "AZURE_OPENAI_CHAT_DEPLOYMENT=$env:AZURE_OPENAI_CHAT_DEPLOYMENT"
supabase secrets set "AZURE_OPENAI_EMBEDDING_DEPLOYMENT=$env:AZURE_OPENAI_EMBEDDING_DEPLOYMENT"
supabase secrets set "AZURE_OPENAI_API_KEY=$env:AZURE_OPENAI_API_KEY"
supabase secrets set "AZURE_OPENAI_DEPLOYMENT=$env:AZURE_OPENAI_DEPLOYMENT"

Write-Host "📝 Setting Azure Document Intelligence secrets..." -ForegroundColor Green
supabase secrets set "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=$env:AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"
supabase secrets set "AZURE_DOCUMENT_INTELLIGENCE_KEY=$env:AZURE_DOCUMENT_INTELLIGENCE_KEY"

Write-Host "📝 Setting Azure AI Search secrets..." -ForegroundColor Green
supabase secrets set "AZURE_SEARCH_ENDPOINT=$env:AZURE_SEARCH_ENDPOINT"
supabase secrets set "AZURE_SEARCH_KEY=$env:AZURE_SEARCH_KEY"
supabase secrets set "AZURE_SEARCH_INDEX=$env:AZURE_SEARCH_INDEX"

Write-Host "📝 Setting Supabase secrets..." -ForegroundColor Green
supabase secrets set "SUPABASE_URL=$env:SUPABASE_URL"
supabase secrets set "SUPABASE_SERVICE_ROLE_KEY=$env:SUPABASE_SERVICE_ROLE_KEY"

Write-Host "📝 Setting Anthropic Claude API key..." -ForegroundColor Green
if ($env:ANTHROPIC_API_KEY) {
    supabase secrets set "ANTHROPIC_API_KEY=$env:ANTHROPIC_API_KEY"
} else {
    Write-Host "⚠️  ANTHROPIC_API_KEY not found in .env — onboard-analyze will fail until set" -ForegroundColor Yellow
}

Write-Host "📝 Setting optional API keys..." -ForegroundColor Green
if ($env:LOVABLE_API_KEY) {
    supabase secrets set "LOVABLE_API_KEY=$env:LOVABLE_API_KEY"
}

if ($env:ADZUNA_APP_ID) {
    supabase secrets set "ADZUNA_APP_ID=$env:ADZUNA_APP_ID"
    supabase secrets set "ADZUNA_APP_KEY=$env:ADZUNA_APP_KEY"
}

if ($env:JSEARCH_API_KEY) {
    supabase secrets set "JSEARCH_API_KEY=$env:JSEARCH_API_KEY"
}

if ($env:CURRENTS_API_KEY) {
    supabase secrets set "CURRENTS_API_KEY=$env:CURRENTS_API_KEY"
}

Write-Host ""
Write-Host "✅ All secrets have been set!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy Edge Functions: supabase functions deploy"
Write-Host "2. Deploy to Vercel: vercel --prod"
Write-Host ""
