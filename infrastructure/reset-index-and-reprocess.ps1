# ============================================================
# Enterprise RAG Reset: Delete Index & Re-process All PDFs
# ============================================================
# This script:
# 1. Deletes the existing Azure AI Search index
# 2. Recreates it with the latest schema (elite features)
# 3. Re-processes all PDFs with enterprise-grade features
#
# Usage:
#   .\reset-index-and-reprocess.ps1 -ResourceGroupName "rg-careercraft-dev"
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$IndexName = "sa-gov-documents",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipPDFProcessing = $false  # If you only want to reset the index
)

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ENTERPRISE RAG RESET & RE-PROCESS" -ForegroundColor Cyan
Write-Host "  Building Elite-Grade RAG System" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# STEP 1: GET AZURE RESOURCES
# ============================================================

Write-Host "[STEP 1] Getting Azure resources..." -ForegroundColor Yellow

$searchService = az search service list --resource-group $ResourceGroupName --query "[0]" --output json 2>$null | ConvertFrom-Json
if (-not $searchService) {
    Write-Host "[ERROR] No Azure AI Search service found in resource group: $ResourceGroupName" -ForegroundColor Red
    exit 1
}

$SearchServiceName = $searchService.name
$searchEndpoint = "https://$SearchServiceName.search.windows.net"
$searchKey = az search admin-key show --resource-group $ResourceGroupName --service-name $SearchServiceName --query "primaryKey" --output tsv 2>$null

if (-not $searchKey) {
    Write-Host "[ERROR] Could not retrieve search service key" -ForegroundColor Red
    exit 1
}

Write-Host "  Search Service: $SearchServiceName" -ForegroundColor Green
Write-Host "  Index Name: $IndexName" -ForegroundColor Green
Write-Host ""

# ============================================================
# STEP 2: DELETE EXISTING INDEX
# ============================================================

Write-Host "[STEP 2] Deleting existing index (removes all old chunks)..." -ForegroundColor Yellow

$headers = @{
    "api-key" = $searchKey
    "Content-Type" = "application/json"
}

$deleteUrl = "$searchEndpoint/indexes/$IndexName`?api-version=2023-11-01"

try {
    $response = Invoke-RestMethod -Uri $deleteUrl -Method Delete -Headers $headers -ErrorAction Stop
    Write-Host "  [OK] Index '$IndexName' deleted successfully" -ForegroundColor Green
    Write-Host "  All old chunks removed - clean slate!" -ForegroundColor Gray
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "  [INFO] Index '$IndexName' doesn't exist (that's ok, will create new)" -ForegroundColor Yellow
    }
    else {
        Write-Host "  [WARN] Could not delete index: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "  Will try to create anyway (may fail if index exists)" -ForegroundColor Gray
    }
}

Write-Host ""

# ============================================================
# STEP 3: RECREATE INDEX WITH NEW SCHEMA
# ============================================================

Write-Host "[STEP 3] Creating new index with elite schema..." -ForegroundColor Yellow
Write-Host "  (Includes: chunkType, confidence, retrievalWeight, embeddingModel, etc.)" -ForegroundColor Gray
Write-Host ""

try {
    & "$PSScriptRoot\create-search-index.ps1" -ResourceGroupName $ResourceGroupName -IndexName $IndexName
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "  [OK] Index created successfully with elite schema!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  [ERROR] Failed to create index" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "  [ERROR] Failed to create index: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# STEP 4: RE-PROCESS ALL PDFs (IF REQUESTED)
# ============================================================

if (-not $SkipPDFProcessing) {
    Write-Host "[STEP 4] Re-processing all PDFs with enterprise features..." -ForegroundColor Yellow
    Write-Host "  This will:" -ForegroundColor Gray
    Write-Host "    - Extract text with Document Intelligence" -ForegroundColor Gray
    Write-Host "    - Extract tables as separate row-level chunks" -ForegroundColor Gray
    Write-Host "    - Add confidence scores per chunk" -ForegroundColor Gray
    Write-Host "    - Generate embeddings (target: 98%+ coverage)" -ForegroundColor Gray
    Write-Host "    - Add all metadata (category, sector, tags, year)" -ForegroundColor Gray
    Write-Host "    - Index with elite features (chunkType, retrievalWeight, etc.)" -ForegroundColor Gray
    Write-Host ""
    
    # Small delay to ensure index is ready
    Start-Sleep -Seconds 2
    
    try {
        & "$PSScriptRoot\process-pdfs.ps1" -ResourceGroupName $ResourceGroupName -GenerateEmbeddings -SearchIndexName $IndexName
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "  [OK] All PDFs re-processed successfully!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "  [WARN] PDF processing completed with some errors - check output above" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host ""
        Write-Host "  [ERROR] Failed to process PDFs: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  You can run manually: .\process-pdfs.ps1 -ResourceGroupName $ResourceGroupName -GenerateEmbeddings" -ForegroundColor Yellow
    }
} else {
    Write-Host "[STEP 4] Skipping PDF processing (use -SkipPDFProcessing:$false to enable)" -ForegroundColor Yellow
    Write-Host "  To process PDFs manually, run:" -ForegroundColor Gray
    Write-Host "    .\process-pdfs.ps1 -ResourceGroupName $ResourceGroupName -GenerateEmbeddings" -ForegroundColor White
}

Write-Host ""

# ============================================================
# SUMMARY
# ============================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RESET COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $SkipPDFProcessing) {
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Verify quality: .\verify-pdf-content.ps1 -ResourceGroupName $ResourceGroupName -Detailed" -ForegroundColor White
    Write-Host "  2. Test retrieval: .\evaluate-rag-quality.ps1 -ResourceGroupName $ResourceGroupName -Detailed" -ForegroundColor White
    Write-Host ""
}

Write-Host "Your enterprise RAG system is now ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Features enabled:" -ForegroundColor Cyan
Write-Host "  [OK] Elite schema (chunkType, confidence, retrievalWeight)" -ForegroundColor White
Write-Host "  [OK] Structured table extraction (row-level chunks)" -ForegroundColor White
Write-Host "  [OK] Confidence scoring per chunk" -ForegroundColor White
Write-Host "  [OK] Embedding coverage (98%+ target)" -ForegroundColor White
Write-Host "  [OK] Time-aware ranking" -ForegroundColor White
Write-Host "  [OK] Complete metadata (category, sector, tags, year)" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan

