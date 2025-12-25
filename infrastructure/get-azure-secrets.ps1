# Get All Azure Secrets for Supabase Edge Functions
# This script fetches all Azure API keys and automatically pushes them to Supabase

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-careercraft-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$SupabaseProjectRef = "hfchxjytxhsiuwqaugmv"
)

Write-Host "Fetching Azure Secrets for Supabase Configuration" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Supabase Project: $SupabaseProjectRef" -ForegroundColor Yellow
Write-Host ""

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "Azure CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Check if logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Logging in..." -ForegroundColor Yellow
    az login
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-Host "Failed to login to Azure" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host ""

# Get service names
$searchServiceName = "careercraft-search-dev"
$openAIName = "careercraft-openai-dev"
$docIntelName = "careercraft-docintel-dev"

$secrets = @{}
$errors = @()

Write-Host "Fetching Azure AI Search key..." -ForegroundColor Cyan
try {
    $searchKey = az search admin-key show `
        --resource-group $ResourceGroupName `
        --service-name $searchServiceName `
        --query primaryKey -o tsv 2>$null
    
    if ($searchKey) {
        $secrets['AZURE_SEARCH_KEY'] = $searchKey
        $secrets['AZURE_SEARCH_ENDPOINT'] = "https://$searchServiceName.search.windows.net"
        $secrets['AZURE_SEARCH_INDEX'] = "sa-gov-documents"
        Write-Host "AI Search key retrieved" -ForegroundColor Green
    } else {
        $errors += "AI Search key not found"
    }
} catch {
    $errors += "Failed to get AI Search key: $_"
}

Write-Host "Fetching Azure OpenAI key..." -ForegroundColor Cyan
try {
    $openAIKey = az cognitiveservices account keys list `
        --name $openAIName `
        --resource-group $ResourceGroupName `
        --query key1 -o tsv 2>$null
    
    if ($openAIKey) {
        $secrets['AZURE_OPENAI_KEY'] = $openAIKey
        $secrets['AZURE_OPENAI_ENDPOINT'] = "https://$openAIName.openai.azure.com/"
        $secrets['AZURE_OPENAI_EMBEDDING_DEPLOYMENT'] = "text-embedding-3-large"
        $secrets['AZURE_OPENAI_CHAT_DEPLOYMENT'] = "gpt-4o-mini"
        Write-Host "OpenAI key retrieved" -ForegroundColor Green
    } else {
        $errors += "OpenAI key not found (service may not exist if OpenAI was disabled)"
    }
} catch {
    $errors += "Failed to get OpenAI key: $_"
}

Write-Host "Fetching Azure Document Intelligence key..." -ForegroundColor Cyan
try {
    $docIntelKey = az cognitiveservices account keys list `
        --name $docIntelName `
        --resource-group $ResourceGroupName `
        --query key1 -o tsv 2>$null
    
    if ($docIntelKey) {
        $secrets['AZURE_DOCUMENT_INTELLIGENCE_KEY'] = $docIntelKey
        $secrets['AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'] = "https://$docIntelName.cognitiveservices.azure.com/"
        Write-Host "Document Intelligence key retrieved" -ForegroundColor Green
    } else {
        $errors += "Document Intelligence key not found"
    }
} catch {
    $errors += "Failed to get Document Intelligence key: $_"
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "SECRETS RETRIEVED" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

# Display all secrets (without values for security)
foreach ($key in $secrets.Keys | Sort-Object) {
    Write-Host "$key=[REDACTED]" -ForegroundColor White
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "Warnings:" -ForegroundColor Yellow
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Yellow
    }
    Write-Host ""
}

# Push secrets to Supabase using npx
Write-Host "Pushing secrets to Supabase..." -ForegroundColor Cyan
Write-Host "Project: $SupabaseProjectRef" -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($key in $secrets.Keys | Sort-Object) {
    Write-Host "Setting $key..." -ForegroundColor Gray
    $value = $secrets[$key]
    
    # Use npx supabase secrets set
    $result = npx --yes supabase secrets set "$key=$value" --project-ref $SupabaseProjectRef 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  $key set successfully" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  Failed to set $key" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "Successfully set: $successCount secrets" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "Failed to set: $failCount secrets" -ForegroundColor Red
}
Write-Host ""

Write-Host "SECURITY REMINDER:" -ForegroundColor Red
Write-Host "  - Never commit these secrets to Git!" -ForegroundColor Yellow
Write-Host "  - Keep them secure and rotate regularly" -ForegroundColor Yellow
Write-Host "  - Only store in Supabase Edge Function secrets" -ForegroundColor Yellow
Write-Host ""

