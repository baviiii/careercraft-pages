# ============================================================================
# GRAPH POPULATION SCRIPT
# Extracts entities from Azure Search chunks and populates Cosmos DB (Gremlin) graph
# Supports both Cosmos DB and Neo4j backends
# ============================================================================

param(
    [int]$BatchSize = 10,
    [int]$StartOffset = 0,
    [int]$MaxBatches = 0,  # 0 = unlimited
    [int]$DelayBetweenBatches = 2,  # seconds
    [switch]$DryRun
)

# Load environment variables
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Configuration
$EntityExtractionUrl = $env:VITE_AZURE_ENTITY_EXTRACTION_URL
$FunctionKey = $env:VITE_AZURE_FUNCTION_KEY

if (-not $EntityExtractionUrl) {
    # Fallback to constructing URL from functions URL
    $FunctionsUrl = $env:VITE_AZURE_FUNCTIONS_URL
    if ($FunctionsUrl) {
        $EntityExtractionUrl = "$FunctionsUrl/api/entity-extraction"
    } else {
        Write-Error "Entity extraction URL not configured. Set VITE_AZURE_ENTITY_EXTRACTION_URL in .env"
        exit 1
    }
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GRAPH POPULATION SCRIPT" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:"
Write-Host "  - Entity Extraction URL: $EntityExtractionUrl"
Write-Host "  - Batch Size: $BatchSize"
Write-Host "  - Starting Offset: $StartOffset"
Write-Host "  - Max Batches: $(if ($MaxBatches -eq 0) { 'Unlimited' } else { $MaxBatches })"
Write-Host "  - Delay Between Batches: ${DelayBetweenBatches}s"
Write-Host "  - Dry Run: $DryRun"
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No actual API calls will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Statistics
$stats = @{
    TotalProcessed = 0
    TotalSucceeded = 0
    TotalFailed = 0
    TotalEntities = 0
    TotalRelationships = 0
    StartTime = Get-Date
}

# Headers
$headers = @{
    "Content-Type" = "application/json"
}
if ($FunctionKey) {
    $headers["x-functions-key"] = $FunctionKey
}

$currentOffset = $StartOffset
$batchCount = 0
$hasMore = $true

while ($hasMore) {
    $batchCount++
    
    if ($MaxBatches -gt 0 -and $batchCount -gt $MaxBatches) {
        Write-Host ""
        Write-Host "Reached max batch limit ($MaxBatches). Stopping." -ForegroundColor Yellow
        break
    }
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "Batch $batchCount (offset: $currentOffset)" -ForegroundColor White
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would process chunks $currentOffset to $($currentOffset + $BatchSize - 1)" -ForegroundColor Yellow
        $currentOffset += $BatchSize
        $hasMore = $batchCount -lt 3  # Simulate 3 batches for dry run
        Start-Sleep -Seconds 1
        continue
    }
    
    try {
        $body = @{
            mode = "batch"
            batchSize = $BatchSize
            offset = $currentOffset
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri $EntityExtractionUrl -Method POST -Headers $headers -Body $body -TimeoutSec 300
        
        # Update statistics
        $stats.TotalProcessed += $response.processed
        $stats.TotalSucceeded += $response.succeeded
        $stats.TotalFailed += $response.failed
        
        # Count entities and relationships from results
        foreach ($result in $response.results) {
            if ($result.success) {
                $stats.TotalEntities += $result.entitiesExtracted
                $stats.TotalRelationships += $result.relationshipsExtracted
            }
        }
        
        # Log batch results
        Write-Host "  Processed: $($response.processed) chunks" -ForegroundColor Green
        Write-Host "  Succeeded: $($response.succeeded) | Failed: $($response.failed)" -ForegroundColor $(if ($response.failed -gt 0) { "Yellow" } else { "Green" })
        Write-Host "  Execution Time: $($response.executionTime)ms" -ForegroundColor DarkGray
        
        # Check if there are more chunks
        $hasMore = $response.hasMore
        $currentOffset = $response.nextOffset
        
        if (-not $hasMore) {
            Write-Host ""
            Write-Host "No more chunks to process." -ForegroundColor Cyan
        }
        
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $stats.TotalFailed += $BatchSize
        
        # Continue to next batch
        $currentOffset += $BatchSize
        
        # Stop if too many consecutive failures
        if ($batchCount -gt 3 -and $stats.TotalSucceeded -eq 0) {
            Write-Host "Too many failures. Check your configuration and try again." -ForegroundColor Red
            break
        }
    }
    
    # Delay between batches to avoid rate limiting
    if ($hasMore) {
        Write-Host "  Waiting ${DelayBetweenBatches}s before next batch..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $DelayBetweenBatches
    }
}

# Final statistics
$duration = (Get-Date) - $stats.StartTime

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  EXTRACTION COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Statistics:" -ForegroundColor White
Write-Host "  - Total Chunks Processed: $($stats.TotalProcessed)"
Write-Host "  - Succeeded: $($stats.TotalSucceeded)" -ForegroundColor Green
Write-Host "  - Failed: $($stats.TotalFailed)" -ForegroundColor $(if ($stats.TotalFailed -gt 0) { "Yellow" } else { "Green" })
Write-Host "  - Entities Extracted: $($stats.TotalEntities)" -ForegroundColor Cyan
Write-Host "  - Relationships Extracted: $($stats.TotalRelationships)" -ForegroundColor Cyan
Write-Host "  - Duration: $($duration.ToString('hh\:mm\:ss'))"
Write-Host ""

if ($stats.TotalFailed -gt 0) {
    Write-Host "Some chunks failed. You can resume from offset $currentOffset" -ForegroundColor Yellow
    Write-Host "Command: .\populate-graph.ps1 -StartOffset $currentOffset" -ForegroundColor Yellow
}

# Return stats for programmatic use
return $stats
