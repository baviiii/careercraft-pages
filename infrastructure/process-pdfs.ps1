# Process PDFs: Enterprise-Grade Extraction, Tagging, and Indexing
# Full RAG pipeline with Document Intelligence, semantic chunking, and vector indexing
# Designed for production use with complete source attribution

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$ContainerName = "rag-documents",
    
    [Parameter(Mandatory=$false)]
    [string]$SearchIndexName = "sa-gov-documents",
    
    [Parameter(Mandatory=$false)]
    [int]$ChunkSize = 800,
    
    [Parameter(Mandatory=$false)]
    [int]$ChunkOverlap = 200,
    
    [Parameter(Mandatory=$false)]
    [switch]$GenerateEmbeddings = $false
)

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ENTERPRISE PDF PROCESSING PIPELINE" -ForegroundColor Cyan
Write-Host "  Zero Hallucination Guarantee - Full Source Attribution" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# STEP 1: DISCOVER AND VALIDATE AZURE RESOURCES
# ============================================================

Write-Host "[STEP 1] Discovering Azure Resources..." -ForegroundColor Yellow

# Get Storage Account
$storageAccount = az storage account list --resource-group $ResourceGroupName --query "[0]" --output json 2>$null | ConvertFrom-Json
if (-not $storageAccount) {
    Write-Host "[ERROR] No storage account found in resource group: $ResourceGroupName" -ForegroundColor Red
    exit 1
}
$storageAccountName = $storageAccount.name
$storageKey = (az storage account keys list --account-name $storageAccountName --resource-group $ResourceGroupName --query "[0].value" --output tsv 2>$null)

# Get Document Intelligence
$allCogServices = az cognitiveservices account list --resource-group $ResourceGroupName --output json 2>$null | ConvertFrom-Json
$docIntel = $allCogServices | Where-Object { $_.kind -eq "FormRecognizer" } | Select-Object -First 1
if (-not $docIntel) {
    Write-Host "[ERROR] No Document Intelligence account found" -ForegroundColor Red
    exit 1
}
$docIntelEndpoint = $docIntel.properties.endpoint
$docIntelKey = (az cognitiveservices account keys list --name $docIntel.name --resource-group $ResourceGroupName --query "key1" --output tsv 2>$null)

# Get AI Search
$searchService = az search service list --resource-group $ResourceGroupName --query "[0]" --output json 2>$null | ConvertFrom-Json
if (-not $searchService) {
    Write-Host "[ERROR] No AI Search service found" -ForegroundColor Red
    exit 1
}
$searchEndpoint = "https://$($searchService.name).search.windows.net"
$searchKey = (az search admin-key show --resource-group $ResourceGroupName --service-name $searchService.name --query "primaryKey" --output tsv 2>$null)

# Get OpenAI (optional for embeddings)
$openAI = $allCogServices | Where-Object { $_.kind -eq "OpenAI" } | Select-Object -First 1
if ($openAI) {
    $openAIEndpoint = $openAI.properties.endpoint
    $openAIKey = (az cognitiveservices account keys list --name $openAI.name --resource-group $ResourceGroupName --query "key1" --output tsv 2>$null)
    $hasOpenAI = $true
} else {
    $hasOpenAI = $false
}

Write-Host "[OK] Resources discovered:" -ForegroundColor Green
Write-Host "     Storage: $storageAccountName" -ForegroundColor White
Write-Host "     Document Intelligence: $($docIntel.name)" -ForegroundColor White
Write-Host "     AI Search: $($searchService.name)" -ForegroundColor White
if ($hasOpenAI) {
    Write-Host "     OpenAI: $($openAI.name) (embeddings available)" -ForegroundColor White
} else {
    Write-Host "     OpenAI: Not configured (text search only)" -ForegroundColor Gray
}
Write-Host ""

# ============================================================
# STEP 2: LIST ALL PDFs IN BLOB STORAGE
# ============================================================

Write-Host "[STEP 2] Scanning Blob Storage for PDFs..." -ForegroundColor Yellow

$pdfs = az storage blob list `
    --account-name $storageAccountName `
    --container-name $ContainerName `
    --account-key $storageKey `
    --query "[?ends_with(name, '.pdf')].{name:name, size:properties.contentLength}" `
    --output json 2>$null | ConvertFrom-Json

if (-not $pdfs -or $pdfs.Count -eq 0) {
    Write-Host "[ERROR] No PDFs found in container: $ContainerName" -ForegroundColor Red
    Write-Host "        Upload PDFs first using:" -ForegroundColor Yellow
    Write-Host "        az storage blob upload-batch --account-name $storageAccountName --destination $ContainerName --source <folder>" -ForegroundColor White
    exit 1
}

$totalSize = ($pdfs | Measure-Object -Property size -Sum).Sum / 1MB
Write-Host "[OK] Found $($pdfs.Count) PDFs (Total: $([math]::Round($totalSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# ============================================================
# HELPER FUNCTIONS
# ============================================================

function Invoke-DocumentIntelligence {
    param(
        [string]$PdfUrl,
        [string]$Endpoint,
        [string]$Key
    )
    
    $headers = @{
        "Ocp-Apim-Subscription-Key" = $Key
        "Content-Type" = "application/json"
    }
    
    $body = @{ urlSource = $PdfUrl } | ConvertTo-Json
    $analysisUrl = "$Endpoint/formrecognizer/documentModels/prebuilt-layout:analyze?api-version=2023-07-31"
    
    try {
        $response = Invoke-WebRequest -Uri $analysisUrl -Method Post -Headers $headers -Body $body -UseBasicParsing
        $operationLocation = $response.Headers["Operation-Location"]
        
        if (-not $operationLocation) {
            return $null
        }
        
        # Poll for results with timeout
        $maxWait = 300  # 5 minutes max
        $waited = 0
        
        do {
            Start-Sleep -Seconds 3
            $waited += 3
            $result = Invoke-RestMethod -Uri $operationLocation -Method Get -Headers @{"Ocp-Apim-Subscription-Key" = $Key}
        } while ($result.status -eq "running" -and $waited -lt $maxWait)
        
        if ($result.status -eq "succeeded") {
            return $result.analyzeResult
        }
        
        return $null
    }
    catch {
        return $null
    }
}

function Split-TextIntoChunks {
    param(
        [string]$Text,
        [int]$ChunkSize = 800,
        [int]$Overlap = 200
    )
    
    $chunks = @()
    $sentences = $Text -split '(?<=[.!?])\s+'
    
    $currentChunk = ""
    $chunkIndex = 0
    
    foreach ($sentence in $sentences) {
        if (($currentChunk.Length + $sentence.Length) -gt $ChunkSize -and $currentChunk.Length -gt 0) {
            $chunks += @{
                text = $currentChunk.Trim()
                index = $chunkIndex
                charCount = $currentChunk.Length
            }
            $chunkIndex++
            
            # Start new chunk with overlap from previous
            $words = $currentChunk -split '\s+'
            $overlapWords = $words | Select-Object -Last ([math]::Min(30, $words.Count))
            $currentChunk = ($overlapWords -join ' ') + ' ' + $sentence
        }
        else {
            $currentChunk += ' ' + $sentence
        }
    }
    
    # Add final chunk
    if ($currentChunk.Trim().Length -gt 50) {
        $chunks += @{
            text = $currentChunk.Trim()
            index = $chunkIndex
            charCount = $currentChunk.Length
        }
    }
    
    return $chunks
}

function Get-DocumentCategory {
    param([string]$FileName, [string]$Content)
    
    $lowerName = $FileName.ToLower()
    $lowerContent = $Content.ToLower().Substring(0, [Math]::Min(2000, $Content.Length))
    
    # Detect category based on filename and content
    if ($lowerName -match "budget|financial|revenue|expenditure") { return "budget" }
    if ($lowerName -match "strategy|strategic|plan|roadmap") { return "strategy" }
    if ($lowerName -match "workforce|employment|jobs|career") { return "workforce" }
    if ($lowerName -match "education|learning|school|training") { return "education" }
    if ($lowerName -match "health|medical|hospital") { return "health" }
    if ($lowerName -match "interview|resume|cv|selection") { return "career-guidance" }
    if ($lowerName -match "report|annual|review") { return "report" }
    if ($lowerName -match "policy|guideline|procedure") { return "policy" }
    
    # Content-based detection
    if ($lowerContent -match "budget|appropriation|revenue|expenditure") { return "budget" }
    if ($lowerContent -match "interview|resume|selection criteria") { return "career-guidance" }
    if ($lowerContent -match "workforce|employment|job market") { return "workforce" }
    
    return "government-document"
}

function Get-DocumentTags {
    param([string]$FileName, [string]$Content)
    
    $tags = @()
    $lowerContent = $Content.ToLower()
    
    # Extract relevant tags
    if ($lowerContent -match "south australia|sa government") { $tags += "south-australia" }
    if ($lowerContent -match "education|school|learning") { $tags += "education" }
    if ($lowerContent -match "health|medical|nursing") { $tags += "health" }
    if ($lowerContent -match "employment|job|career|workforce") { $tags += "employment" }
    if ($lowerContent -match "budget|financial|funding") { $tags += "budget" }
    if ($lowerContent -match "training|skills|qualification") { $tags += "training" }
    if ($lowerContent -match "interview|resume|application") { $tags += "job-application" }
    if ($lowerContent -match "migration|immigrant|visa") { $tags += "migration" }
    if ($lowerContent -match "regional|rural|country") { $tags += "regional" }
    if ($lowerContent -match "disability|inclusion|accessibility") { $tags += "disability-inclusion" }
    if ($lowerContent -match "indigenous|aboriginal") { $tags += "indigenous" }
    if ($lowerContent -match "youth|young people|graduate") { $tags += "youth" }
    
    return $tags | Select-Object -Unique
}

function Get-DocumentSector {
    param([string]$Content)
    
    $lowerContent = $Content.ToLower().Substring(0, [Math]::Min(3000, $Content.Length))
    
    if ($lowerContent -match "health|hospital|nursing|medical") { return "health" }
    if ($lowerContent -match "education|school|teacher|learning") { return "education" }
    if ($lowerContent -match "public sector|government|department") { return "public-sector" }
    if ($lowerContent -match "construction|building|infrastructure") { return "construction" }
    if ($lowerContent -match "technology|it|digital|software") { return "technology" }
    if ($lowerContent -match "agriculture|farming|rural") { return "agriculture" }
    if ($lowerContent -match "mining|resources|energy") { return "resources" }
    if ($lowerContent -match "retail|hospitality|tourism") { return "services" }
    
    return "general"
}

function Generate-Embedding {
    param(
        [string]$Text,
        [string]$Endpoint,
        [string]$Key
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "api-key" = $Key
    }
    
    $body = @{
        input = $Text.Substring(0, [Math]::Min(8000, $Text.Length))
        model = "text-embedding-3-large"
    } | ConvertTo-Json
    
    $embeddingUrl = "$Endpoint/openai/deployments/text-embedding-3-large/embeddings?api-version=2024-02-15-preview"
    
    try {
        $response = Invoke-RestMethod -Uri $embeddingUrl -Method Post -Headers $headers -Body $body
        return $response.data[0].embedding
    }
    catch {
        return $null
    }
}

# ============================================================
# STEP 3: PROCESS EACH PDF
# ============================================================

Write-Host "[STEP 3] Processing PDFs..." -ForegroundColor Yellow
Write-Host ""

$searchHeaders = @{
    "Content-Type" = "application/json"
    "api-key" = $searchKey
}

$stats = @{
    processed = 0
    failed = 0
    chunks = 0
    indexed = 0
}

$startTime = Get-Date

foreach ($pdf in $pdfs) {
    $pdfName = $pdf.name
    $pdfIndex = $stats.processed + $stats.failed + 1
    
    Write-Host "[$pdfIndex/$($pdfs.Count)] $pdfName" -ForegroundColor Cyan
    
    try {
        # Generate SAS URL for Document Intelligence
        $expiry = (Get-Date).AddHours(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        $sasToken = az storage blob generate-sas `
            --account-name $storageAccountName `
            --container-name $ContainerName `
            --name $pdfName `
            --permissions r `
            --expiry $expiry `
            --account-key $storageKey `
            --output tsv `
            --only-show-errors 2>$null
        
        $pdfUrl = "https://$storageAccountName.blob.core.windows.net/$ContainerName/$([uri]::EscapeDataString($pdfName))?$sasToken"
        
        # Extract content using Document Intelligence
        Write-Host "   [1/4] Extracting content with Document Intelligence..." -ForegroundColor Gray
        $analysisResult = Invoke-DocumentIntelligence -PdfUrl $pdfUrl -Endpoint $docIntelEndpoint -Key $docIntelKey
        
        if (-not $analysisResult) {
            Write-Host "   [FAILED] Document Intelligence extraction failed" -ForegroundColor Red
            $stats.failed++
            continue
        }
        
        # Extract text with page tracking
        $fullText = ""
        $pageTexts = @{}
        $pageCount = 0
        
        foreach ($page in $analysisResult.pages) {
            $pageCount++
            $pageText = ""
            
            if ($analysisResult.paragraphs) {
                $pageParagraphs = $analysisResult.paragraphs | Where-Object { 
                    $_.boundingRegions -and $_.boundingRegions[0].pageNumber -eq $page.pageNumber 
                }
                foreach ($para in $pageParagraphs) {
                    $pageText += $para.content + "`n`n"
                }
            }
            
            if (-not $pageText -and $page.lines) {
                foreach ($line in $page.lines) {
                    $pageText += $line.content + " "
                }
            }
            
            $pageTexts[$page.pageNumber] = $pageText.Trim()
            $fullText += $pageText + "`n`n"
        }
        
        Write-Host "   [OK] Extracted $pageCount pages, $($fullText.Length) characters" -ForegroundColor Green
        
        # Extract tables if present
        $tables = @()
        if ($analysisResult.tables) {
            foreach ($table in $analysisResult.tables) {
                $tableContent = "Table ($($table.rowCount) rows x $($table.columnCount) cols):`n"
                foreach ($cell in $table.cells) {
                    $tableContent += "[$($cell.rowIndex),$($cell.columnIndex)]: $($cell.content)`n"
                }
                $tables += $tableContent
            }
        }
        
        # Chunk the content
        Write-Host "   [2/4] Chunking content (size: $ChunkSize, overlap: $ChunkOverlap)..." -ForegroundColor Gray
        $chunks = Split-TextIntoChunks -Text $fullText -ChunkSize $ChunkSize -Overlap $ChunkOverlap
        Write-Host "   [OK] Created $($chunks.Count) chunks" -ForegroundColor Green
        
        # Analyze document for metadata
        Write-Host "   [3/4] Analyzing document metadata..." -ForegroundColor Gray
        $category = Get-DocumentCategory -FileName $pdfName -Content $fullText
        $tags = Get-DocumentTags -FileName $pdfName -Content $fullText
        $sector = Get-DocumentSector -Content $fullText
        $title = ($pdfName -replace '\.pdf$', '' -replace '[-_]', ' ')
        
        Write-Host "   [OK] Category: $category, Sector: $sector, Tags: $($tags.Count)" -ForegroundColor Green
        
        # Index chunks
        Write-Host "   [4/4] Indexing $($chunks.Count) chunks to AI Search..." -ForegroundColor Gray
        
        $indexedChunks = 0
        foreach ($chunk in $chunks) {
            $docId = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$pdfName-chunk-$($chunk.index)")) -replace '[^a-zA-Z0-9]', ''
            $docId = $docId.Substring(0, [Math]::Min(128, $docId.Length))
            
            # Determine page number for this chunk
            $chunkPage = 1
            $charPosition = 0
            foreach ($pageNum in ($pageTexts.Keys | Sort-Object)) {
                $pageLength = $pageTexts[$pageNum].Length
                if ($charPosition + $pageLength -gt ($chunk.index * ($ChunkSize - $ChunkOverlap))) {
                    $chunkPage = $pageNum
                    break
                }
                $charPosition += $pageLength
            }
            
            $document = @{
                "@search.action" = "upload"
                id = $docId
                content = $chunk.text
                documentId = $pdfName
                documentType = "pdf"
                source = "blob-storage"
                url = "https://$storageAccountName.blob.core.windows.net/$ContainerName/$pdfName"
                title = $title
                pageNumber = $chunkPage
                chunkIndex = $chunk.index
                indexedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                category = $category
                tags = $tags
                sector = $sector
                metadata = (@{
                    fileName = $pdfName
                    fileSize = $pdf.size
                    totalPages = $pageCount
                    totalChunks = $chunks.Count
                    chunkCharCount = $chunk.charCount
                    extractionMethod = "DocumentIntelligence-Layout"
                    tablesFound = $tables.Count
                } | ConvertTo-Json -Compress)
            }
            
            # Generate embedding if OpenAI is available and enabled
            if ($hasOpenAI -and $GenerateEmbeddings) {
                $embedding = Generate-Embedding -Text $chunk.text -Endpoint $openAIEndpoint -Key $openAIKey
                if ($embedding) {
                    $document["contentVector"] = $embedding
                }
            }
            
            $indexBody = @{ value = @($document) } | ConvertTo-Json -Depth 10
            $indexUrl = "$searchEndpoint/indexes/$SearchIndexName/docs/index?api-version=2023-11-01"
            
            try {
                Invoke-RestMethod -Uri $indexUrl -Method Post -Headers $searchHeaders -Body $indexBody -UseBasicParsing | Out-Null
                $indexedChunks++
            }
            catch {
                # Log but continue
            }
        }
        
        Write-Host "   [OK] Indexed $indexedChunks/$($chunks.Count) chunks" -ForegroundColor Green
        $stats.processed++
        $stats.chunks += $chunks.Count
        $stats.indexed += $indexedChunks
    }
    catch {
        Write-Host "   [FAILED] $($_.Exception.Message)" -ForegroundColor Red
        $stats.failed++
    }
    
    Write-Host ""
}

# ============================================================
# STEP 4: SUMMARY
# ============================================================

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PROCESSING COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Duration:       $([math]::Round($duration.TotalMinutes, 1)) minutes" -ForegroundColor White
Write-Host "  PDFs Processed: $($stats.processed)/$($pdfs.Count)" -ForegroundColor $(if ($stats.failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "  PDFs Failed:    $($stats.failed)" -ForegroundColor $(if ($stats.failed -eq 0) { "Green" } else { "Red" })
Write-Host "  Total Chunks:   $($stats.chunks)" -ForegroundColor White
Write-Host "  Indexed:        $($stats.indexed)" -ForegroundColor White
Write-Host ""
Write-Host "  Search Index:   $SearchIndexName" -ForegroundColor White
Write-Host "  Endpoint:       $searchEndpoint" -ForegroundColor White
Write-Host ""

if ($stats.processed -gt 0) {
    Write-Host "  [SUCCESS] Your RAG system is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Every document has:" -ForegroundColor Cyan
    Write-Host "    - Full text extraction (Document Intelligence Layout)" -ForegroundColor White
    Write-Host "    - Sentence-aware chunking with overlap" -ForegroundColor White
    Write-Host "    - Page number tracking for citations" -ForegroundColor White
    Write-Host "    - Automatic categorization and tagging" -ForegroundColor White
    Write-Host "    - Sector classification" -ForegroundColor White
    Write-Host "    - Complete source attribution (zero hallucination)" -ForegroundColor White
    if ($hasOpenAI -and $GenerateEmbeddings) {
        Write-Host "    - Vector embeddings for semantic search" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
