# Master Deployment Script - Runs All Steps in Correct Order
# Simple CLI-based deployment using Azure CLI (az login)

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "australiaeast",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [switch]$EnableOpenAI = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipWebScraping = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "[Master Deployment - Complete RAG Infrastructure]" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

# Check Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Azure CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "   Install from: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    exit 1
}

# Check Azure login
Write-Host "[AUTH] Checking Azure authentication..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "[ERROR] Not logged in to Azure CLI." -ForegroundColor Red
    Write-Host "   Run 'az login' first, then try again." -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
Write-Host ""

# Step 1: Deploy Core Infrastructure
Write-Host "[STEP 1/4] Deploying Core Infrastructure..." -ForegroundColor Yellow
Write-Host "   This creates: Storage, Document Intelligence, AI Search, OpenAI (if enabled)" -ForegroundColor Gray
Write-Host ""
& "$PSScriptRoot\deploy.ps1" -ResourceGroupName $ResourceGroupName -Location $Location -Environment $Environment -EnableOpenAI:$EnableOpenAI

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Infrastructure deployment failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "[OK] Step 1 Complete!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy OpenAI Model (if enabled)
if ($EnableOpenAI) {
    Write-Host "[STEP 2/4] Deploying OpenAI Embedding Model..." -ForegroundColor Yellow
    Write-Host "   Deploying text-embedding-3-large model" -ForegroundColor Gray
    Write-Host ""
    & "$PSScriptRoot\deploy-openai-model.ps1" -ResourceGroupName $ResourceGroupName
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] OpenAI model deployment had issues (may already be deployed or not available)" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Step 2 Complete!" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "[SKIP] Step 2/4: Skipping OpenAI model (not enabled)" -ForegroundColor Gray
    Write-Host ""
}

# Step 3: Create Search Index
Write-Host "[STEP 3/4] Creating Search Index..." -ForegroundColor Yellow
Write-Host "   Creating sa-gov-documents index with vector fields" -ForegroundColor Gray
Write-Host ""
& "$PSScriptRoot\create-search-index.ps1" -ResourceGroupName $ResourceGroupName

if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Search index creation had issues (may already exist)" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Step 3 Complete!" -ForegroundColor Green
}
Write-Host ""

# Step 4: Configure Web Scraping (optional)
if (-not $SkipWebScraping) {
    Write-Host "[STEP 4/4] Configuring Web Scraping..." -ForegroundColor Yellow
    Write-Host "   Setting up 6 indexers to crawl SA Government websites" -ForegroundColor Gray
    Write-Host ""
    & "$PSScriptRoot\web-scraper\configure-web-scraping.ps1" -ResourceGroupName $ResourceGroupName -SearchIndexName "sa-gov-documents"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] Web scraping configuration had issues" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Step 4 Complete!" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "[SKIP] Step 4/4: Skipping Web Scraping (SkipWebScraping flag set)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ("=" * 80) -ForegroundColor Green
Write-Host "[SUCCESS] Deployment Complete!" -ForegroundColor Green
Write-Host ("=" * 80) -ForegroundColor Green
Write-Host ""

Write-Host "[NEXT STEPS]" -ForegroundColor Cyan
Write-Host "1. Copy API keys from Step 1 output above" -ForegroundColor Yellow
Write-Host "2. Store keys in Supabase Environment Variables (NOT in Git!)" -ForegroundColor Yellow
Write-Host "3. Upload PDFs to Blob Storage (when ready):" -ForegroundColor Yellow
Write-Host "   az storage blob upload-batch --account-name <storage-account> --source <pdf-folder> --destination rag-documents --auth-mode login" -ForegroundColor White
Write-Host "4. Process PDFs (when ready):" -ForegroundColor Yellow
Write-Host "   .\process-pdfs.ps1 -ResourceGroupName $ResourceGroupName" -ForegroundColor White
Write-Host ""

Write-Host "[DOCUMENTATION]" -ForegroundColor Cyan
Write-Host "  - Deployment order: DEPLOYMENT-ORDER.md" -ForegroundColor White
Write-Host "  - Security: SECURITY-AUDIT.md" -ForegroundColor White
Write-Host "  - Storage: STORAGE-ARCHITECTURE.md" -ForegroundColor White
Write-Host ""

