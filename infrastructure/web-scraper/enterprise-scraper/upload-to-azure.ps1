# Upload scraped content to Azure AI Search
# Reads JSON output from Playwright scraper and uploads to Azure AI Search with embeddings

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$InputFile = "",
    
    [Parameter(Mandatory=$false)]
    [string]$SearchIndexName = "sa-gov-documents"
)

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Upload to Azure AI Search" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Find latest output file if not specified
if ([string]::IsNullOrEmpty($InputFile)) {
    $outputDir = Join-Path $PSScriptRoot "output"
    $latestFile = Get-ChildItem -Path $outputDir -Filter "scraped-content-*.json" | 
        Sort-Object LastWriteTime -Descending | 
        Select-Object -First 1
    
    if ($latestFile) {
        $InputFile = $latestFile.FullName
        Write-Host "Using latest output file: $($latestFile.Name)" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] No output file found. Run scraper.js first." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path $InputFile)) {
    Write-Host "[ERROR] Input file not found: $InputFile" -ForegroundColor Red
    exit 1
}

# Get Azure resources
Write-Host "[1/4] Getting Azure resources..." -ForegroundColor Yellow

$searchService = az search service list --resource-group $ResourceGroupName --query "[0]" | ConvertFrom-Json
if (-not $searchService) {
    Write-Host "[ERROR] No Azure AI Search service found" -ForegroundColor Red
    exit 1
}

$searchEndpoint = "https://$($searchService.name).search.windows.net"
$searchKey = az search admin-key show --resource-group $ResourceGroupName --service-name $searchService.name --query "primaryKey" -o tsv

$openAI = az cognitiveservices account list --resource-group $ResourceGroupName --query "[?kind=='OpenAI'] | [0]" | ConvertFrom-Json
if (-not $openAI) {
    Write-Host "[ERROR] Azure OpenAI not found - embeddings require OpenAI!" -ForegroundColor Red
    exit 1
}

$openAIEndpoint = $openAI.properties.endpoint
$openAIKey = az cognitiveservices account keys list --name $openAI.name --resource-group $ResourceGroupName --query "key1" -o tsv
$embeddingDeployment = "text-embedding-3-large"

Write-Host "  Search Service: $($searchService.name)" -ForegroundColor Green
Write-Host "  OpenAI: $($openAI.name)" -ForegroundColor Green
Write-Host ""

# Load scraped content
Write-Host "[2/4] Loading scraped content..." -ForegroundColor Yellow
$documents = Get-Content $InputFile | ConvertFrom-Json
Write-Host "  Loaded $($documents.Count) documents" -ForegroundColor Green
Write-Host ""

# Generate embeddings
Write-Host "[3/4] Generating embeddings..." -ForegroundColor Yellow

function Generate-Embedding {
    param(
        [string]$Text,
        [string]$Endpoint,
        [string]$Key,
        [string]$Deployment,
        [int]$RetryCount = 0
    )
    
    # Skip empty or very short content
    if ([string]::IsNullOrWhiteSpace($Text) -or $Text.Length -lt 10) {
        return $null
    }
    
    $headers = @{
        "Content-Type" = "application/json"
        "api-key" = $Key
    }
    
    # Limit text length (Azure OpenAI embedding models have token limits)
    $textToEmbed = $Text.Substring(0, [Math]::Min(8000, $Text.Length)).Trim()
    
    if ([string]::IsNullOrWhiteSpace($textToEmbed)) {
        return $null
    }
    
    # Use correct API structure for Azure OpenAI
    $body = @{
        input = @($textToEmbed)
    } | ConvertTo-Json
    
    $embeddingUrl = "$Endpoint/openai/deployments/$Deployment/embeddings?api-version=2024-02-15-preview"
    
    try {
        $response = Invoke-RestMethod -Uri $embeddingUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
        if ($response.data -and $response.data.Count -gt 0) {
            return $response.data[0].embedding
        }
        return $null
    }
    catch {
        $errorMsg = $_.Exception.Message
        $statusCode = $null
        
        # Try to get status code
        try {
            $statusCode = $_.Exception.Response.StatusCode.value__
        } catch {
            # Status code not available, check error message
            if ($errorMsg -like "*429*" -or $errorMsg -like "*Too Many Requests*") {
                $statusCode = 429
            } elseif ($errorMsg -like "*400*" -or $errorMsg -like "*Bad Request*") {
                $statusCode = 400
            }
        }
        
        # Handle rate limiting with exponential backoff
        if ($statusCode -eq 429 -and $RetryCount -lt 3) {
            $waitTime = [Math]::Pow(2, $RetryCount) * 2  # 2, 4, 8 seconds
            Write-Host "    [RETRY] Rate limited, waiting $waitTime seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds $waitTime
            return Generate-Embedding -Text $Text -Endpoint $Endpoint -Key $Key -Deployment $Deployment -RetryCount ($RetryCount + 1)
        }
        
        Write-Host "    [ERROR] Embedding failed: $errorMsg" -ForegroundColor Red
        return $null
    }
}

$processed = 0
$failed = 0
$docIndex = 0

foreach ($doc in $documents) {
    $docIndex++
    
    # Validate document has content
    if (-not $doc.content -or $doc.content.Length -lt 10) {
        Write-Host "    [SKIP] Document $docIndex has no content" -ForegroundColor Yellow
        $failed++
        continue
    }
    
    $embedding = Generate-Embedding -Text $doc.content -Endpoint $openAIEndpoint -Key $openAIKey -Deployment $embeddingDeployment
    
    if ($embedding) {
        $doc | Add-Member -NotePropertyName "contentVector" -NotePropertyValue $embedding -Force
        $processed++
    } else {
        $failed++
    }
    
    # Progress update
    if ($docIndex % 5 -eq 0) {
        Write-Host "  Progress: $processed/$docIndex embeddings generated..." -ForegroundColor Gray
    }
    
    # Rate limiting - wait longer to avoid 429 errors
    Start-Sleep -Milliseconds 200  # Increased from 50ms to 200ms
}

Write-Host "  [OK] Generated $processed/$($documents.Count) embeddings ($failed failed)" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })

Write-Host "  [OK] Generated $processed embeddings" -ForegroundColor Green
Write-Host ""

# Upload to Azure AI Search
Write-Host "[4/4] Uploading to Azure AI Search..." -ForegroundColor Yellow

$searchHeaders = @{
    "Content-Type" = "application/json"
    "api-key" = $searchKey
}

$batchSize = 50  # Reduced batch size for more reliable uploads
$totalUploaded = 0
$totalFailed = 0

for ($i = 0; $i -lt $documents.Count; $i += $batchSize) {
    $batch = $documents[$i..([Math]::Min($i + $batchSize - 1, $documents.Count - 1))]
    
    $uploadDocs = @()
    foreach ($doc in $batch) {
        # Validate required fields
        if (-not $doc.id) {
            Write-Host "    [SKIP] Document missing ID" -ForegroundColor Yellow
            continue
        }
        
        if (-not $doc.content -or $doc.content.Length -lt 10) {
            Write-Host "    [SKIP] Document $($doc.id) has no content" -ForegroundColor Yellow
            continue
        }
        
        $uploadDoc = @{
            "@search.action" = "upload"
            "id" = $doc.id
            "content" = $doc.content.Substring(0, [Math]::Min(50000, $doc.content.Length))  # Limit content size
            "title" = if ($doc.title) { $doc.title.Substring(0, [Math]::Min(1000, $doc.title.Length)) } else { "Untitled" }
            "url" = if ($doc.url) { $doc.url } else { "" }
            "documentType" = "web"
            "source" = if ($doc.url) { $doc.url } else { "" }
            "chunkIndex" = if ($doc.chunkIndex -ne $null) { $doc.chunkIndex } else { 0 }
            "category" = if ($doc.category) { $doc.category } else { "general" }
            "sector" = if ($doc.sector) { $doc.sector } else { "government" }
            "tags" = if ($doc.tags) { $doc.tags } else { @() }
            "indexedAt" = if ($doc.indexedAt) { $doc.indexedAt } else { (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") }
        }
        
        # Only add contentVector if it exists and is valid
        if ($doc.contentVector -and $doc.contentVector.Count -gt 0) {
            $uploadDoc["contentVector"] = $doc.contentVector
        }
        
        $uploadDocs += $uploadDoc
    }
    
    if ($uploadDocs.Count -eq 0) {
        Write-Host "  [SKIP] Batch $($i / $batchSize + 1) has no valid documents" -ForegroundColor Yellow
        continue
    }
    
    try {
        $body = @{
            value = $uploadDocs
        } | ConvertTo-Json -Depth 10
        
        $indexUrl = "$searchEndpoint/indexes/$SearchIndexName/docs/index?api-version=2023-11-01"
        $response = Invoke-RestMethod -Uri $indexUrl -Method Post -Headers $searchHeaders -Body $body -ErrorAction Stop
        
        $batchUploaded = $uploadDocs.Count
        $totalUploaded += $batchUploaded
        Write-Host "  ✓ Uploaded batch: $totalUploaded/$($documents.Count) documents" -ForegroundColor Green
    }
    catch {
        $errorMsg = $_.Exception.Message
        $totalFailed += $uploadDocs.Count
        
        # Try to get more detailed error
        try {
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorDetails = $errorResponse.error.message
        } catch {
            $errorDetails = $errorMsg
        }
        
        Write-Host "  [FAIL] Batch upload failed: $errorDetails" -ForegroundColor Red
        
        # If it's a validation error, try uploading documents one by one
        if ($errorMsg -like "*validation*" -or $errorMsg -like "*400*") {
            Write-Host "    Trying individual uploads for this batch..." -ForegroundColor Yellow
            foreach ($singleDoc in $uploadDocs) {
                try {
                    $singleBody = @{ value = @($singleDoc) } | ConvertTo-Json -Depth 10
                    $singleResponse = Invoke-RestMethod -Uri $indexUrl -Method Post -Headers $searchHeaders -Body $singleBody -ErrorAction Stop
                    $totalUploaded++
                    $totalFailed--
                } catch {
                    Write-Host "      Failed to upload document: $($singleDoc.id)" -ForegroundColor Red
                }
            }
        }
        
        # Small delay between batches
        Start-Sleep -Milliseconds 500
    }
}

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Upload Complete" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Documents uploaded: $totalUploaded/$($documents.Count)" -ForegroundColor $(if ($totalUploaded -eq $documents.Count) { "Green" } else { "Yellow" })
if ($totalFailed -gt 0) {
    Write-Host "  Documents failed: $totalFailed" -ForegroundColor Red
}
Write-Host "  Index: $SearchIndexName" -ForegroundColor White
Write-Host "  Embeddings: $processed/$($documents.Count) documents have embeddings" -ForegroundColor $(if ($processed -eq $documents.Count) { "Green" } else { "Yellow" })
Write-Host ""
if ($totalUploaded -gt 0) {
    Write-Host "  ✅ Content uploaded to Azure AI Search!" -ForegroundColor Cyan
}
Write-Host ""

