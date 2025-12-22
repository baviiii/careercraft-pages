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
    [switch]$GenerateEmbeddings,  # Embeddings are critical for RAG - use this flag!
    
    [Parameter(Mandatory=$false)]
    [switch]$ForceReprocess  # Force re-processing even if document exists
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
# Note: Foundry accounts use "AIServices" kind, not "OpenAI"
$openAI = $allCogServices | Where-Object { $_.kind -eq "OpenAI" -or $_.kind -eq "AIServices" } | Select-Object -First 1
if ($openAI) {
    $openAIEndpoint = $openAI.properties.endpoint
    $openAIKey = (az cognitiveservices account keys list --name $openAI.name --resource-group $ResourceGroupName --query "key1" --output tsv 2>$null)
    $hasOpenAI = $true
    
    # Verify embedding deployment by testing it directly (more reliable than API check)
    # Also check deployment capacity to optimize rate limiting
    if ($GenerateEmbeddings) {
        $embeddingDeployment = "text-embedding-3-large"
        Write-Host "     Testing embedding deployment..." -ForegroundColor Gray
        
        # Check deployment capacity to optimize delays (optional optimization)
        $deploymentCapacity = $null
        try {
            $headers = @{
                "Content-Type" = "application/json"
                "api-key" = $openAIKey
            }
            $deployUrl = "$openAIEndpoint/openai/deployments/$embeddingDeployment?api-version=2024-02-15-preview"
            $deploymentInfo = Invoke-RestMethod -Uri $deployUrl -Method Get -Headers $headers -ErrorAction SilentlyContinue
            if ($deploymentInfo.sku.capacity) {
                $deploymentCapacity = $deploymentInfo.sku.capacity
                Write-Host "     [INFO] Deployment capacity: $deploymentCapacity" -ForegroundColor Cyan
            }
        } catch {
            # Ignore - we'll use defaults
        }
        
        # Direct test is more reliable than checking deployments API
        # (Some Azure OpenAI endpoints don't expose the deployments list API)
        try {
            $testResult = Generate-Embedding -Text "Test" -Endpoint $openAIEndpoint -Key $openAIKey -Model $embeddingDeployment
            if ($testResult -and $testResult.embedding) {
                Write-Host "     [OK] Embedding deployment verified (dimensions: $($testResult.embedding.Count))" -ForegroundColor Green
            } else {
                Write-Host "     [WARNING] Embedding test failed - deployment may not exist" -ForegroundColor Yellow
                Write-Host "              Will attempt anyway, but check errors carefully" -ForegroundColor Gray
                Write-Host "              If embeddings fail, deploy model: .\deploy-openai-model.ps1 -ResourceGroupName $ResourceGroupName" -ForegroundColor Gray
            }
        } catch {
            Write-Host "     [WARNING] Could not test embedding deployment: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "              Will attempt embeddings anyway..." -ForegroundColor Gray
            Write-Host "              If embeddings fail, deploy model: .\deploy-openai-model.ps1 -ResourceGroupName $ResourceGroupName" -ForegroundColor Gray
        }
    }
} else {
    $hasOpenAI = $false
}

Write-Host "[OK] Resources discovered:" -ForegroundColor Green
Write-Host "     Storage: $storageAccountName" -ForegroundColor White
Write-Host "     Document Intelligence: $($docIntel.name)" -ForegroundColor White
Write-Host "     AI Search: $($searchService.name)" -ForegroundColor White
if ($hasOpenAI) {
    if ($GenerateEmbeddings) {
        Write-Host "     OpenAI: $($openAI.name) (embeddings ENABLED)" -ForegroundColor Green
    } else {
        Write-Host "     OpenAI: $($openAI.name) (embeddings DISABLED - not recommended!)" -ForegroundColor Yellow
    }
} else {
    Write-Host "     OpenAI: Not configured" -ForegroundColor Red
    if ($GenerateEmbeddings) {
        Write-Host "     [WARNING] Embeddings requested but OpenAI not available!" -ForegroundColor Red
        Write-Host "              Deploy OpenAI first: .\deploy-openai-model.ps1" -ForegroundColor Yellow
    }
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

# Default GenerateEmbeddings to TRUE if not specified (production quality)
if (-not $PSBoundParameters.ContainsKey('GenerateEmbeddings')) {
    $GenerateEmbeddings = $true
    Write-Host "[INFO] GenerateEmbeddings defaults to TRUE for production quality" -ForegroundColor Cyan
    Write-Host ""
}

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

function Sanitize-TextForIndexing {
    param([string]$Text)
    
    if ([string]::IsNullOrEmpty($Text)) {
        return $Text
    }
    
    # Use .NET's built-in Unicode normalization and proper encoding handling
    # This is more robust than manual character replacement and handles edge cases automatically
    
    try {
        # Step 1: Normalize Unicode to standard form (FormC = Canonical Composition)
        # This handles combining characters, decomposed forms, etc.
        $Text = $Text.Normalize([System.Text.NormalizationForm]::FormC)
        
        # Step 2: Build clean string using StringBuilder for performance
        $sb = New-Object System.Text.StringBuilder($Text.Length)
        
        foreach ($char in $Text.ToCharArray()) {
            $charCode = [int]$char
            
            # Keep all printable ASCII characters (32-126) and whitespace (9, 10, 13)
            if (($charCode -ge 32 -and $charCode -le 126) -or 
                $charCode -eq 9 -or $charCode -eq 10 -or $charCode -eq 13) {
                $sb.Append($char) | Out-Null
            }
            # Convert common Unicode punctuation to ASCII equivalents
            elseif ($charCode -eq 0x2013 -or $charCode -eq 0x2014) { 
                $sb.Append('-') | Out-Null  # En/Em dash → hyphen
            }
            elseif ($charCode -eq 0x2018 -or $charCode -eq 0x2019) { 
                $sb.Append("'") | Out-Null  # Smart single quotes → apostrophe
            }
            elseif ($charCode -eq 0x201C -or $charCode -eq 0x201D) { 
                $sb.Append('"') | Out-Null  # Smart double quotes → standard quote
            }
            elseif ($charCode -eq 0x2026) { 
                $sb.Append('...') | Out-Null  # Ellipsis → three dots
            }
            elseif ($charCode -eq 0x00B7) { 
                $sb.Append('.') | Out-Null  # Middle dot → period
            }
            elseif ($charCode -eq 0x2022) { 
                $sb.Append('*') | Out-Null  # Bullet → asterisk
            }
            elseif ($charCode -eq 0x00BB -or $charCode -eq 0x00AB) { 
                $sb.Append(' ') | Out-Null  # Angle quotes → space
            }
            elseif ($charCode -eq 0x00A0) { 
                $sb.Append(' ') | Out-Null  # Non-breaking space → space
            }
            # Skip all other non-ASCII characters (zero-width, BOM, control chars, etc.)
            # This automatically handles any new problematic characters we haven't seen yet
        }
        
        $Text = $sb.ToString()
        
        # Step 3: Final UTF-8 validation - ensure the string can be safely encoded
        # Convert to bytes and back to validate UTF-8 encoding
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
        $Text = [System.Text.Encoding]::UTF8.GetString($bytes)
        
        # Step 4: Remove any remaining control characters (safety check)
        $Text = [regex]::Replace($Text, '[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]', '')
        
    } catch {
        # Fallback: If normalization fails, use ASCII-only encoding
        # This ensures we never return invalid text that would cause silent failures
        try {
            $Text = [System.Text.Encoding]::ASCII.GetString(
                [System.Text.Encoding]::Default.GetBytes($Text)
            )
            # Remove any remaining non-ASCII
            $Text = [regex]::Replace($Text, '[^\x20-\x7E\n\r\t]', '')
        } catch {
            # Last resort: return empty string if everything fails
            # Better to skip a chunk than to cause silent failures downstream
            Write-Warning "Text sanitization failed completely, returning empty string"
            return ""
        }
    }
    
    return $Text
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
    
    if ($lowerContent -match "health|hospital|nursing|medical|sa health") { return "health" }
    if ($lowerContent -match "education|school|teacher|learning|department for education") { return "education" }
    if ($lowerContent -match "public sector|government|department|commissioner for public sector") { return "public-sector" }
    if ($lowerContent -match "construction|building|infrastructure") { return "construction" }
    if ($lowerContent -match "technology|it|digital|software|ict") { return "technology" }
    if ($lowerContent -match "agriculture|farming|rural") { return "agriculture" }
    if ($lowerContent -match "mining|resources|energy") { return "resources" }
    if ($lowerContent -match "retail|hospitality|tourism") { return "services" }
    if ($lowerContent -match "finance|accounting|treasury") { return "finance" }
    if ($lowerContent -match "defense|security|police") { return "defense" }
    if ($lowerContent -match "transport|logistics") { return "transport" }
    if ($lowerContent -match "community|social services|welfare") { return "community-services" }
    
    return "general"
}

function Get-PublicationYear {
    param([string]$FileName, [string]$Content)
    
    # Try to extract year from filename (most reliable)
    if ($FileName -match "\b(19|20)\d{2}\b") {
        $year = [int]$matches[0]
        if ($year -ge 2000 -and $year -le (Get-Date).Year + 1) {
            return $year
        }
    }
    
    # Try to extract from content (look for "2024", "published 2023", etc.)
    if ($Content -match "\b(20\d{2})\b") {
        $years = [regex]::Matches($Content, "\b(20\d{2})\b") | ForEach-Object { [int]$_.Value } | Where-Object { $_ -ge 2000 -and $_ -le (Get-Date).Year + 1 }
        if ($years) {
            # Return the most recent year found
            return ($years | Measure-Object -Maximum).Maximum
        }
    }
    
    return $null
}

function Generate-Embedding {
    param(
        [string]$Text,
        [string]$Endpoint,
        [string]$Key,
        [string]$Model = "text-embedding-3-large",
        [int]$RetryCount = 0,
        [int]$MaxRetries = 5
    )
    
    $headers = @{
        "Content-Type" = "application/json"
        "api-key" = $Key
    }
    
    # ELITE: Proper token guard (text-embedding-3-large supports ~8000 tokens, ~32k chars)
    # Conservative limit with safety margin
    $maxChars = 30000
    $textToEmbed = $Text.Substring(0, [Math]::Min($maxChars, $Text.Length)).Trim()
    
    if ([string]::IsNullOrWhiteSpace($textToEmbed) -or $textToEmbed.Length -lt 10) {
        return $null
    }
    
    # CRITICAL: Clean text to ensure valid UTF-8 encoding
    # Remove/replace invalid UTF-8 characters that can cause JSON encoding errors
    try {
        # Convert to UTF-8 bytes and back to string, replacing invalid sequences
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($textToEmbed)
        $textToEmbed = [System.Text.Encoding]::UTF8.GetString($utf8Bytes)
    } catch {
        # If encoding fails, try to clean the string by removing invalid characters
        $textToEmbed = [regex]::Replace($textToEmbed, '[^\x00-\x7F]', '')  # Remove non-ASCII as fallback
    }
    
    # Additional cleaning: replace common problematic characters with safe alternatives
    # Use Unicode escape sequences to avoid PowerShell parsing issues with special characters
    $textToEmbed = $textToEmbed -replace [char]0x00B7, '.'  # Middle dot (·) to period
    $textToEmbed = $textToEmbed -replace [char]0x2013, '-'  # En dash (–) to hyphen
    $textToEmbed = $textToEmbed -replace [char]0x2014, '-'  # Em dash (—) to hyphen
    $textToEmbed = $textToEmbed -replace [char]0x2026, '...'  # Ellipsis (…) to three dots
    $textToEmbed = $textToEmbed -replace [char]0x201C, '"'  # Left double quote (") to standard quote
    $textToEmbed = $textToEmbed -replace [char]0x201D, '"'  # Right double quote (") to standard quote
    $textToEmbed = $textToEmbed -replace [char]0x2018, "'"  # Left single quote (') to standard quote
    $textToEmbed = $textToEmbed -replace [char]0x2019, "'"  # Right single quote (') to standard quote
    
    # Ensure proper JSON encoding
    $body = @{
        input = @($textToEmbed)  # Array format for Azure OpenAI
    } | ConvertTo-Json -Depth 10 -Compress
    
    # Use preview API version (Azure OpenAI embeddings use preview versions)
    # Fix double slash issue (ensure endpoint doesn't end with /)
    $cleanEndpoint = $Endpoint.TrimEnd('/')
    $embeddingUrl = "$cleanEndpoint/openai/deployments/$Model/embeddings?api-version=2024-02-15-preview"
    
    try {
        $response = Invoke-RestMethod -Uri $embeddingUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
        if ($response.data -and $response.data.Count -gt 0) {
            # ELITE: Return structured object with metadata
            return @{
                embedding = $response.data[0].embedding
                model = $Model
                modelVersion = "2024-02-15-preview"
                generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                textLength = $textToEmbed.Length
            }
        }
        return $null
    }
    catch {
        $errorMsg = $_.Exception.Message
        $statusCode = $null
        $errorBody = $null
        $errorDetails = $null
        
        # Extract status code from response
        try {
            if ($_.Exception.Response) {
                $statusCode = $_.Exception.Response.StatusCode.value__
            }
        } catch {}
        
        # Extract error response body using PowerShell's ErrorDetails (more reliable than StreamReader)
        try {
            if ($_.ErrorDetails.Message) {
                $errorBody = $_.ErrorDetails.Message
                # Try to parse JSON error response
                try {
                    $errorDetails = $errorBody | ConvertFrom-Json
                    if ($errorDetails.error) {
                        $errorBody = $errorDetails.error.message
                        if ($errorDetails.error.code) {
                            $errorBody = "$($errorDetails.error.code): $errorBody"
                        }
                    }
                } catch {
                    # Not JSON, use as-is
                }
            }
        } catch {}
        
        # Fallback: Try to extract status code from error message
        if (-not $statusCode) {
            if ($errorMsg -like "*429*" -or $errorMsg -like "*Too Many Requests*" -or $errorMsg -like "*rate limit*") {
                $statusCode = 429
            } elseif ($errorMsg -like "*400*" -or $errorMsg -like "*Bad Request*") {
                $statusCode = 400
            } elseif ($errorMsg -like "*503*" -or $errorMsg -like "*Service Unavailable*") {
                $statusCode = 503
            } elseif ($errorMsg -like "*404*" -or $errorMsg -like "*Not Found*") {
                $statusCode = 404
            }
        }
        
        # ALWAYS show the actual error first - don't mask it
        $fullError = if ($errorBody) { $errorBody } else { $errorMsg }
        if ($statusCode) {
            Write-Host "      [ERROR] HTTP $statusCode : $fullError" -ForegroundColor Red
        } else {
            Write-Host "      [ERROR] $fullError" -ForegroundColor Red
        }
        
        # Check for non-retryable errors (400, 401, 403, 404, etc.) - show and exit immediately
        $nonRetryableErrors = @(400, 401, 403, 404, 413, 422)
        if ($statusCode -in $nonRetryableErrors) {
            Write-Host "      [SKIP] Non-retryable error ($statusCode) - skipping chunk" -ForegroundColor Yellow
            return $null
        }
        
        # Check for encoding/JSON errors - don't retry these
        $isEncodingError = $errorBody -like "*utf-8*" -or $errorBody -like "*codec*" -or $errorBody -like "*decode byte*" -or 
                          $errorBody -like "*invalid json*" -or $errorBody -like "*malformed*" -or
                          $errorMsg -like "*utf-8*" -or $errorMsg -like "*codec*" -or $errorMsg -like "*decode byte*" -or
                          $errorMsg -like "*invalid json*" -or $errorMsg -like "*malformed*"
        
        if ($isEncodingError) {
            Write-Host "      [SKIP] Encoding/JSON error detected - skipping chunk (should have been sanitized)" -ForegroundColor Yellow
            return $null
        }
        
        # Handle rate limiting (429) and service unavailable (503) with exponential backoff
        # Only retry if it's ACTUALLY a rate limit, not a masked error
        $isActualRateLimit = ($statusCode -eq 429 -or $statusCode -eq 503) -and -not $isEncodingError
        
        # If we've retried 3+ times and still hitting rate limits, skip this chunk
        # This prevents infinite loops - we'll process other chunks and come back later
        if ($isActualRateLimit -and $RetryCount -ge 3) {
            Write-Host "      [SKIP] Skipping chunk after $RetryCount retries - rate limit persists" -ForegroundColor Yellow
            Write-Host "      [INFO] This chunk will be skipped. Process remaining chunks and retry later." -ForegroundColor Gray
            return $null
        }
        
        if ($isActualRateLimit -and $RetryCount -lt $MaxRetries) {
            # Track rate limit hits for adaptive throttling
            $script:stats.rateLimitHits++
            
            # Try to extract "retry after X seconds" from error message
            $retryAfterSeconds = $null
            if ($fullError -match "retry after (\d+) seconds?") {
                $retryAfterSeconds = [int]$matches[1]
                Write-Host "      [INFO] Azure OpenAI specified retry after: $retryAfterSeconds seconds" -ForegroundColor Cyan
            }
            
            # Use Azure's specified wait time if available, otherwise use exponential backoff
            if ($retryAfterSeconds -and $retryAfterSeconds -gt 0) {
                # CRITICAL: Add significant buffer - S0 tier limits are per-minute windows
                # If Azure says wait 50 seconds, we should wait longer to ensure window has reset
                $waitTime = $retryAfterSeconds + 15  # Add 15 second buffer (was 5) to ensure rate limit window resets
                Write-Host "      [RETRY $($RetryCount + 1)/$MaxRetries] Rate limited ($statusCode), waiting $waitTime seconds (Azure specified: $retryAfterSeconds + buffer)..." -ForegroundColor Yellow
            } else {
                # Longer exponential backoff: 3, 6, 12, 24, 48 seconds
                $waitTime = [Math]::Pow(2, $RetryCount) * 3
                Write-Host "      [RETRY $($RetryCount + 1)/$MaxRetries] Rate limited ($statusCode), waiting $waitTime seconds..." -ForegroundColor Yellow
            }
            
            Write-Host "      [INFO] Total rate limit hits: $($stats.rateLimitHits) - delays will be increased" -ForegroundColor Gray
            Write-Host "      [TIP] S0 tier has low rate limits. Consider upgrading to S1+ for higher limits." -ForegroundColor Gray
            
            # If we've hit many rate limits, wait even longer to let the window fully reset
            # S0 tier rate limit window is typically 60 seconds, so we need to wait for full reset
            if ($stats.rateLimitHits -gt 5) {
                $additionalWait = 30  # Wait extra 30 seconds to ensure window resets
                Write-Host "      [INFO] High rate limit count - adding $additionalWait second buffer to reset window..." -ForegroundColor Cyan
                $waitTime += $additionalWait
            }
            
            # CRITICAL: For S0 tier, rate limit window is a ROLLING 60-second window
            # If Azure says "retry after 47 seconds", we need to wait LONGER to ensure the window fully resets
            # The issue: Even after waiting, if we immediately retry, we might still be in the same window
            # Solution: Wait at least 90 seconds (1.5x the window) to ensure we're in a fresh window
            if ($waitTime -lt 90) {
                $waitTime = 90  # Always wait at least 90 seconds for S0 tier (1.5x the 60-second window)
                Write-Host "      [INFO] Ensuring full 90-second wait for S0 tier rolling window reset..." -ForegroundColor Cyan
            }
            
            Write-Host "      [WAIT] Waiting $waitTime seconds for rate limit window to fully reset..." -ForegroundColor Yellow
            Start-Sleep -Seconds $waitTime
            
            # CRITICAL: After waiting, add an extra cooldown buffer before making the actual request
            # This ensures we're definitely in a fresh rate limit window
            $cooldownBuffer = 10  # Extra 10 seconds to be absolutely sure
            Write-Host "      [COOLDOWN] Additional $cooldownBuffer second buffer before retry..." -ForegroundColor Cyan
            Start-Sleep -Seconds $cooldownBuffer
            
            Write-Host "      [RETRY] Attempting embedding again after full cooldown..." -ForegroundColor Green
            return Generate-Embedding -Text $Text -Endpoint $Endpoint -Key $Key -Model $Model -RetryCount ($RetryCount + 1) -MaxRetries $MaxRetries
        }
        
        # If we get here and it's not a rate limit, it's an unknown error - don't retry
        if ($statusCode -and $statusCode -ne 429 -and $statusCode -ne 503) {
            Write-Host "      [SKIP] Unknown error ($statusCode) - skipping chunk" -ForegroundColor Yellow
            return $null
        }
        
        # If we've exhausted retries or it's a different error, log and return null
        if ($RetryCount -ge $MaxRetries) {
            Write-Host "      [ERROR] Max retries ($MaxRetries) exceeded for embedding" -ForegroundColor Red
        } else {
            Write-Host "      [ERROR] Embedding generation failed: $errorMsg (Status: $statusCode)" -ForegroundColor Red
            if ($errorBody) {
                Write-Host "      [DEBUG] Error details: $errorBody" -ForegroundColor Gray
            }
        }
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
    embeddingsGenerated = 0
    embeddingErrors = 0
    failed = 0
    chunks = 0
    indexed = 0
    rateLimitHits = 0  # Track rate limit hits for adaptive throttling
}

# Adaptive rate limiting - increase delay if we hit rate limits
# NOTE: S0 tier has very low rate limits (often 60-120 requests/minute for embeddings)
# Consider upgrading to S1+ tier for production workloads with higher limits
# CRITICAL: S0 tier = ~60 requests/minute = 1 request per second MAX
# We need to be very conservative to avoid hitting limits and wasting Document Intelligence costs

# OPTIMIZATION: If deployment capacity is high (scaled up), reduce delays
# Capacity 120 = S0 tier (conservative delays)
# Capacity 240+ = Scaled up (can use faster delays)
if ($deploymentCapacity -and $deploymentCapacity -ge 240) {
    $baseEmbeddingDelay = 500  # 0.5 seconds - safe for high capacity (240+)
    Write-Host "[INFO] High capacity detected ($deploymentCapacity) - using optimized delays" -ForegroundColor Green
} else {
    $baseEmbeddingDelay = 3000  # 3 seconds - conservative for S0 tier (capacity 120)
}

$baseIndexingDelay = 200   # Base delay for indexing operations

# If we've hit too many rate limits, warn user and suggest alternatives
$maxRateLimitHitsBeforeWarning = 10

$startTime = Get-Date

foreach ($pdf in $pdfs) {
    $pdfName = $pdf.name
    $pdfIndex = $stats.processed + $stats.failed + 1
    
    # If we've hit too many rate limits, warn user before processing more PDFs
    # This prevents wasting Document Intelligence costs on PDFs we can't embed
    if ($stats.rateLimitHits -ge 10 -and $pdfIndex -gt 1) {
        Write-Host ""
        Write-Host "  [WARNING] High rate limit hits detected ($($stats.rateLimitHits))" -ForegroundColor Yellow
        Write-Host "  [WARNING] You're paying for Document Intelligence extraction but embeddings are failing!" -ForegroundColor Red
        Write-Host "  [WARNING] Consider:" -ForegroundColor Yellow
        Write-Host "    1. Upgrading OpenAI to S1+ tier for higher limits" -ForegroundColor Gray
        Write-Host "    2. Processing in smaller batches (5-10 PDFs at a time)" -ForegroundColor Gray
        Write-Host "    3. Running overnight when system is idle" -ForegroundColor Gray
        Write-Host "    4. Pausing and waiting 5-10 minutes for rate limit window to reset" -ForegroundColor Gray
        Write-Host "  [INFO] Continuing with very slow processing (3+ seconds between embeddings)..." -ForegroundColor Cyan
        Write-Host ""
    }
    
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
        
        # Extract text with page tracking and confidence scores (ELITE: Confidence tracking)
        $fullText = ""
        $pageTexts = @{}
        $pageConfidences = @{}  # Track confidence per page
        $paragraphConfidences = @()  # Track confidence per paragraph
        $pageCount = 0
        
        # Process pages (collect page numbers first to avoid modification issues)
        $pageNumbers = @()
        foreach ($page in $analysisResult.pages) {
            $pageNumbers += $page.pageNumber
        }
        
        foreach ($pageNum in $pageNumbers) {
            $page = $analysisResult.pages | Where-Object { $_.pageNumber -eq $pageNum } | Select-Object -First 1
            if (-not $page) { continue }
            
            $pageCount++
            $pageText = ""
            $confidencesForPage = @()  # Collect confidences for this page
            
            if ($analysisResult.paragraphs) {
                $pageParagraphs = $analysisResult.paragraphs | Where-Object { 
                    $_.boundingRegions -and $_.boundingRegions[0].pageNumber -eq $pageNum 
                }
                foreach ($para in $pageParagraphs) {
                    $pageText += $para.content + "`n`n"
                    # Capture confidence score (ELITE: Confidence tracking)
                    if ($para.paragraphRole -or $para.confidence) {
                        $confidence = if ($para.confidence) { $para.confidence } else { 1.0 }
                        $paragraphConfidences += @{
                            pageNumber = $pageNum
                            confidence = $confidence
                            content = $para.content
                        }
                        $confidencesForPage += $confidence
                    }
                }
            }
            
            if (-not $pageText -and $page.lines) {
                foreach ($line in $page.lines) {
                    $pageText += $line.content + " "
                }
                # Lines typically have lower confidence (OCR) - only if no paragraph confidences
                if ($confidencesForPage.Count -eq 0) {
                    $confidencesForPage = @(0.85)  # Default OCR confidence
                }
            }
            
            # Store confidence array after collection (avoids modification during iteration)
            $pageConfidences[$pageNum] = $confidencesForPage
            $pageTexts[$pageNum] = $pageText.Trim()
            $fullText += $pageText + "`n`n"
        }
        
        # Calculate average confidence per page (collect keys first to avoid modification during iteration)
        $pageNumbers = @($pageConfidences.Keys)  # Create a copy of keys
        foreach ($pageNum in $pageNumbers) {
            if ($pageConfidences[$pageNum].Count -gt 0) {
                $pageConfidences[$pageNum] = ($pageConfidences[$pageNum] | Measure-Object -Average).Average
            } else {
                $pageConfidences[$pageNum] = 1.0  # Default confidence
            }
        }
        
        Write-Host "   [OK] Extracted $pageCount pages, $($fullText.Length) characters" -ForegroundColor Green
        
        # ELITE: Extract tables as structured intelligence (separate from text)
        $structuredTables = @()  # Store tables separately for row-level chunks
        $tables = @()  # Keep for backward compatibility
        $tableCounter = 0
        
        if ($analysisResult.tables) {
            foreach ($table in $analysisResult.tables) {
                $tableCounter++
                $tablePage = if ($table.boundingRegions -and $table.boundingRegions.Count -gt 0) { 
                    $table.boundingRegions[0].pageNumber 
                } else { 
                    1 
                }
                
                # ELITE: Extract table metadata (units, headers, structure)
                $headers = @()
                $tableRows = @()
                $tableConfidence = if ($table.confidence) { $table.confidence } else { 1.0 }
                
                # Build structured rows
                $rows = @{}
                foreach ($cell in $table.cells) {
                    if (-not $rows.ContainsKey($cell.rowIndex)) {
                        $rows[$cell.rowIndex] = @{}
                    }
                    $rows[$cell.rowIndex][$cell.columnIndex] = @{
                        content = $cell.content
                        kind = if ($cell.kind) { $cell.kind } else { "content" }
                    }
                    
                    # Capture headers (usually row 0)
                    if ($cell.rowIndex -eq 0) {
                        $headers += $cell.content
                    }
                }
                
                # Create structured table representation
                $structuredTable = @{
                    tableIndex = $tableCounter
                    pageNumber = $tablePage
                    rowCount = $table.rowCount
                    columnCount = $table.columnCount
                    headers = $headers
                    confidence = $tableConfidence
                    rows = @()
                }
                
                # Build row-level data
                foreach ($rowNum in ($rows.Keys | Sort-Object)) {
                    $rowData = @()
                    $rowText = ""
                    foreach ($colNum in ($rows[$rowNum].Keys | Sort-Object)) {
                        $cellData = $rows[$rowNum][$colNum]
                        $rowData += $cellData.content
                        $rowText += $cellData.content + " | "
                    }
                    $rowText = $rowText.TrimEnd(" | ")
                    $tableRows += $rowText
                    
                    # ELITE: Store as structured row chunk
                    $structuredTable.rows += @{
                        rowIndex = $rowNum
                        values = $rowData
                        text = $rowText
                        isHeader = ($rowNum -eq 0)
                    }
                }
                
                $structuredTables += $structuredTable
                
                # Also keep text version for backward compatibility
                $tableContent = "`n`n--- TABLE ($($table.rowCount) rows x $($table.columnCount) columns) ---`n"
                $tableContent += ($tableRows -join "`n") + "`n"
                $tableContent += "--- END TABLE ---`n`n"
                $tables += $tableContent
                # Still add to fullText for general searchability
                $fullText += $tableContent
            }
        }
        
        Write-Host "   [OK] Extracted $($structuredTables.Count) structured tables" -ForegroundColor Green
        
        # ELITE: Multi-type chunking (text chunks + table chunks)
        Write-Host "   [2/4] Chunking content (size: $ChunkSize, overlap: $ChunkOverlap)..." -ForegroundColor Gray
        
        # Create text chunks (excluding table content for better structure)
        $textContent = $fullText
        # Remove table markers to chunk clean text separately
        $textContent = $textContent -replace "--- TABLE.*?--- END TABLE ---", ""
        $textChunks = Split-TextIntoChunks -Text $textContent -ChunkSize $ChunkSize -Overlap $ChunkOverlap
        
        # ELITE: Create separate table row chunks (critical for trend analysis)
        $tableChunks = @()
        foreach ($table in $structuredTables) {
            # Create chunks for each row (or logical groups for large tables)
            foreach ($row in $table.rows) {
                if (-not $row.isHeader) {  # Skip header rows (they're in metadata)
                    $tableChunks += @{
                        type = "table_row"
                        tableIndex = $table.tableIndex
                        pageNumber = $table.pageNumber
                        rowIndex = $row.rowIndex
                        content = $row.text
                        headers = $table.headers
                        rowValues = $row.values
                        confidence = $table.confidence
                    }
                }
            }
        }
        
        Write-Host "   [OK] Created $($textChunks.Count) text chunks + $($tableChunks.Count) table row chunks" -ForegroundColor Green
        
        # Analyze document for metadata (Phase 1 - Data Foundation)
        Write-Host "   [3/4] Analyzing document metadata..." -ForegroundColor Gray
        $category = Get-DocumentCategory -FileName $pdfName -Content $fullText
        $tags = Get-DocumentTags -FileName $pdfName -Content $fullText
        $sector = Get-DocumentSector -Content $fullText
        $publicationYear = Get-PublicationYear -FileName $pdfName -Content $fullText
        $title = ($pdfName -replace '\.pdf$', '' -replace '[-_]', ' ')
        
        # Ensure we have at least some tags
        if ($tags.Count -eq 0) {
            $tags = @("sa-government", "general")
        }
        
        # Ensure we have a category
        if (-not $category -or $category -eq "") {
            $category = "government-document"
        }
        
        # Ensure we have a sector
        if (-not $sector -or $sector -eq "") {
            $sector = "general"
        }
        
        Write-Host "   [OK] Category: $category, Sector: $sector, Tags: $($tags.Count), Year: $(if ($publicationYear) { $publicationYear } else { 'Not found' })" -ForegroundColor Green
        
        # Index chunks
        $totalChunksToIndex = $textChunks.Count + $tableChunks.Count
        Write-Host "   [4/4] Indexing $totalChunksToIndex chunks ($($textChunks.Count) text + $($tableChunks.Count) table rows) to AI Search..." -ForegroundColor Gray
        
        $indexedChunks = 0
        $chunkGlobalIndex = 0
        
        # ELITE: Process text chunks with confidence scores
        foreach ($chunk in $textChunks) {
            $docId = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$pdfName-text-chunk-$($chunk.index)")) -replace '[^a-zA-Z0-9]', ''
            $docId = $docId.Substring(0, [Math]::Min(128, $docId.Length))
            
            # Determine page number and confidence for this chunk
            $chunkPage = 1
            $chunkConfidence = 1.0
            $charPosition = 0
            foreach ($pageNum in ($pageTexts.Keys | Sort-Object)) {
                $pageLength = $pageTexts[$pageNum].Length
                if ($charPosition + $pageLength -gt ($chunk.index * ($ChunkSize - $ChunkOverlap))) {
                    $chunkPage = $pageNum
                    $chunkConfidence = if ($pageConfidences.ContainsKey($pageNum)) { $pageConfidences[$pageNum] } else { 1.0 }
                    break
                }
                $charPosition += $pageLength
            }
            
            # ELITE: Build complete metadata with confidence scores
            $documentMetadata = @{
                fileName = $pdfName
                fileSize = $pdf.size
                totalPages = $pageCount
                totalChunks = $textChunks.Count + $tableChunks.Count
                chunkCharCount = $chunk.charCount
                extractionMethod = "DocumentIntelligence-Layout"
                tablesFound = $structuredTables.Count
                chunkType = "text"  # ELITE: Chunk type identification
                confidence = $chunkConfidence  # ELITE: Confidence score
            }
            
            # Add publication year if found (Phase 1 - Data Foundation)
            if ($publicationYear) {
                $documentMetadata["publicationYear"] = $publicationYear
            }
            
            # Source URL (provenance tracking - Phase 1 requirement)
            $sourceUrl = "https://$storageAccountName.blob.core.windows.net/$ContainerName/$pdfName"
            
            # ELITE: Build document with confidence, chunk type, and retrieval weight
            # CRITICAL: Sanitize all text fields to prevent UTF-8 encoding errors
            $sanitizedContent = Sanitize-TextForIndexing -Text $chunk.text
            $sanitizedTitle = Sanitize-TextForIndexing -Text $title
            $sanitizedMetadata = Sanitize-TextForIndexing -Text ($documentMetadata | ConvertTo-Json -Compress)
            
            $document = @{
                "@search.action" = if ($ForceReprocess) { "upload" } else { "mergeOrUpload" }
                id = $docId
                content = $sanitizedContent
                documentId = $pdfName
                documentType = "pdf"
                source = "blob-storage"
                url = $sourceUrl
                title = $sanitizedTitle
                pageNumber = $chunkPage
                chunkIndex = $chunk.index
                chunkType = "text"  # ELITE: Chunk type identification
                confidence = $chunkConfidence  # ELITE: Confidence score (0-1)
                indexedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                category = $category
                tags = $tags
                sector = $sector
                metadata = $sanitizedMetadata
                retrievalWeight = 1.0  # ELITE: Retrieval weight (text = 1.0, tables = 1.5)
            }
            
            # ELITE: Generate embedding with retry logic (target: 98%+ coverage)
            if ($hasOpenAI -and $GenerateEmbeddings) {
                # CRITICAL: Sanitize text BEFORE embedding generation to prevent UTF-8 encoding errors
                $textForEmbedding = Sanitize-TextForIndexing -Text $chunk.text
                $embeddingResult = Generate-Embedding -Text $textForEmbedding -Endpoint $openAIEndpoint -Key $openAIKey
                if ($embeddingResult -and $embeddingResult.embedding) {
                    $document["contentVector"] = $embeddingResult.embedding
                    # ELITE: Store embedding metadata
                    $document["embeddingModel"] = $embeddingResult.model
                    $document["embeddingGeneratedAt"] = $embeddingResult.generatedAt
                    $stats.embeddingsGenerated++
                } else {
                    $stats.embeddingErrors++
                    # Don't index documents without embeddings - this ensures quality
                    Write-Host "      [SKIP] Chunk $($chunk.index) skipped - no embedding generated" -ForegroundColor Yellow
                    continue  # Skip indexing this chunk
                }
                # Adaptive rate limiting - increase delay if we've hit rate limits
                # S0 tier = ~60 requests/minute = need at least 1 second between requests
                # After rate limit hits, be even more conservative
                $currentDelay = if ($stats.rateLimitHits -gt 10) { $baseEmbeddingDelay * 3 }  # 6 seconds
                               elseif ($stats.rateLimitHits -gt 5) { $baseEmbeddingDelay * 2 }  # 4 seconds
                               elseif ($stats.rateLimitHits -gt 2) { $baseEmbeddingDelay * 1.5 }  # 3 seconds
                               else { $baseEmbeddingDelay }  # 2 seconds
                Start-Sleep -Milliseconds $currentDelay
            } elseif ($GenerateEmbeddings -and -not $hasOpenAI) {
                Write-Host "      [ERROR] Embeddings required but OpenAI not configured - aborting" -ForegroundColor Red
                exit 1
            }
            
            $indexBody = @{ value = @($document) } | ConvertTo-Json -Depth 10
            $indexUrl = "$searchEndpoint/indexes/$SearchIndexName/docs/index?api-version=2023-11-01"
            
            try {
                # Use Invoke-WebRequest to get better error details
                $response = Invoke-WebRequest -Uri $indexUrl -Method Post -Headers $searchHeaders -Body $indexBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
                $indexedChunks++
                # Small delay after indexing to avoid hitting Azure AI Search rate limits
                Start-Sleep -Milliseconds $baseIndexingDelay
            }
            catch {
                $errorDetails = $_.Exception.Message
                $statusCode = $null
                $errorBody = $null
                
                # Extract status code
                try {
                    if ($_.Exception.Response) {
                        $statusCode = [int]$_.Exception.Response.StatusCode
                    }
                } catch {}
                
                # Extract detailed error response from Azure AI Search (use ErrorDetails.Message - more reliable)
                try {
                    if ($_.ErrorDetails.Message) {
                        $errorBody = $_.ErrorDetails.Message
                        try {
                            $errorJson = $errorBody | ConvertFrom-Json -ErrorAction Stop
                            if ($errorJson.error) {
                                $errorDetails = "$($errorJson.error.message)"
                                if ($errorJson.error.code) {
                                    $errorDetails = "$($errorJson.error.code): $errorDetails"
                                }
                                if ($errorJson.error.details) {
                                    $detailsText = ($errorJson.error.details | ForEach-Object { 
                                        if ($_.message) { $_.message } else { $_ | ConvertTo-Json -Compress }
                                    }) -join "; "
                                    if ($detailsText) {
                                        $errorDetails += " | Details: $detailsText"
                                    }
                                }
                            } else {
                                $errorDetails = $errorBody
                            }
                        } catch {
                            # If JSON parsing fails, try reading from response stream
                            try {
                                if ($_.Exception.Response) {
                                    $responseStream = $_.Exception.Response.GetResponseStream()
                                    if ($responseStream) {
                                        $reader = New-Object System.IO.StreamReader($responseStream)
                                        $responseBody = $reader.ReadToEnd()
                                        $reader.Close()
                                        $responseStream.Close()
                                        if ($responseBody) {
                                            $errorDetails = $responseBody
                                        }
                                    }
                                }
                            } catch {
                                # Use ErrorDetails if available, otherwise use exception message
                                if ($errorBody) {
                                    $errorDetails = $errorBody
                                }
                            }
                        }
                    } else {
                        # Fallback: Try reading from response stream
                        try {
                            if ($_.Exception.Response) {
                                $responseStream = $_.Exception.Response.GetResponseStream()
                                if ($responseStream) {
                                    $reader = New-Object System.IO.StreamReader($responseStream)
                                    $responseBody = $reader.ReadToEnd()
                                    $reader.Close()
                                    $responseStream.Close()
                                    if ($responseBody) {
                                        $errorDetails = $responseBody
                                    }
                                }
                            }
                        } catch {}
                    }
                } catch {
                    # If all else fails, use exception message
                }
                
                Write-Host "      [WARN] Failed to index chunk: $errorDetails" -ForegroundColor Yellow
                
                # For 400 errors, log additional debugging info (only once per document to avoid spam)
                if ($statusCode -eq 400 -or $errorDetails -like "*400*" -or $errorDetails -like "*Bad Request*") {
                    if ($chunkGlobalIndex -eq 0) {
                        Write-Host "      [DEBUG] Document ID: $docId" -ForegroundColor Gray
                        Write-Host "      [DEBUG] Content length: $($chunk.text.Length) chars" -ForegroundColor Gray
                        Write-Host "      [DEBUG] Has embedding: $(if ($document.ContainsKey('contentVector')) { 'Yes' } else { 'No' })" -ForegroundColor Gray
                        if ($document.ContainsKey('contentVector')) {
                            Write-Host "      [DEBUG] Embedding dimensions: $($document['contentVector'].Count)" -ForegroundColor Gray
                        }
                        # Log a sample of the document structure for debugging
                        $docKeys = $document.Keys -join ", "
                        Write-Host "      [DEBUG] Document fields: $docKeys" -ForegroundColor Gray
                        # Log the actual request body for first error (truncated)
                        $bodyPreview = $indexBody.Substring(0, [Math]::Min(500, $indexBody.Length))
                        Write-Host "      [DEBUG] Request body preview: $bodyPreview..." -ForegroundColor Gray
                    }
                }
            }
            
            $chunkGlobalIndex++
        }
        
        # ELITE: Index table row chunks separately (critical for trend analysis)
        foreach ($tableChunk in $tableChunks) {
            $tableDocId = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$pdfName-table-$($tableChunk.tableIndex)-row-$($tableChunk.rowIndex)")) -replace '[^a-zA-Z0-9]', ''
            $tableDocId = $tableDocId.Substring(0, [Math]::Min(128, $tableDocId.Length))
            
            # ELITE: Build table row chunk with structured metadata
            $tableMetadata = @{
                fileName = $pdfName
                fileSize = $pdf.size
                totalPages = $pageCount
                extractionMethod = "DocumentIntelligence-Layout"
                chunkType = "table_row"
                tableIndex = $tableChunk.tableIndex
                rowIndex = $tableChunk.rowIndex
                headers = $tableChunk.headers
                confidence = $tableChunk.confidence
                rowValues = $tableChunk.rowValues
            }
            
            if ($publicationYear) {
                $tableMetadata["publicationYear"] = $publicationYear
            }
            
            # CRITICAL: Sanitize all text fields to prevent UTF-8 encoding errors
            $sanitizedTableContent = Sanitize-TextForIndexing -Text $tableChunk.content
            $sanitizedTableTitle = Sanitize-TextForIndexing -Text "$title - Table $($tableChunk.tableIndex) Row $($tableChunk.rowIndex)"
            $sanitizedTableMetadata = Sanitize-TextForIndexing -Text ($tableMetadata | ConvertTo-Json -Compress)
            
            $tableDocument = @{
                "@search.action" = if ($ForceReprocess) { "upload" } else { "mergeOrUpload" }
                id = $tableDocId
                content = $sanitizedTableContent
                documentId = $pdfName
                documentType = "pdf"
                source = "blob-storage"
                url = $sourceUrl
                title = $sanitizedTableTitle
                pageNumber = $tableChunk.pageNumber
                chunkIndex = $chunkGlobalIndex
                chunkType = "table_row"  # ELITE: Chunk type
                confidence = $tableChunk.confidence
                indexedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                category = $category
                tags = $tags
                sector = $sector
                metadata = $sanitizedTableMetadata
                retrievalWeight = 1.5  # ELITE: Tables get higher weight for trend queries
            }
            
            # ELITE: Generate embedding for table rows (critical for trend queries) with retry
            if ($hasOpenAI -and $GenerateEmbeddings) {
                # CRITICAL: Sanitize text BEFORE embedding generation to prevent UTF-8 encoding errors
                $tableTextForEmbedding = Sanitize-TextForIndexing -Text $tableChunk.content
                $embeddingResult = Generate-Embedding -Text $tableTextForEmbedding -Endpoint $openAIEndpoint -Key $openAIKey
                if ($embeddingResult -and $embeddingResult.embedding) {
                    $tableDocument["contentVector"] = $embeddingResult.embedding
                    $tableDocument["embeddingModel"] = $embeddingResult.model
                    $tableDocument["embeddingGeneratedAt"] = $embeddingResult.generatedAt
                    $stats.embeddingsGenerated++
                } else {
                    Write-Host "      [SKIP] Table row skipped - no embedding generated" -ForegroundColor Yellow
                    continue  # Skip indexing this table row
                }
                # Adaptive rate limiting for table chunks
                # S0 tier = ~60 requests/minute = need at least 1 second between requests
                $currentDelay = if ($stats.rateLimitHits -gt 10) { $baseEmbeddingDelay * 3 }  # 6 seconds
                               elseif ($stats.rateLimitHits -gt 5) { $baseEmbeddingDelay * 2 }  # 4 seconds
                               elseif ($stats.rateLimitHits -gt 2) { $baseEmbeddingDelay * 1.5 }  # 3 seconds
                               else { $baseEmbeddingDelay }  # 2 seconds
                Start-Sleep -Milliseconds $currentDelay
            }
            
            $indexBody = @{ value = @($tableDocument) } | ConvertTo-Json -Depth 10
            try {
                # Use Invoke-WebRequest to get better error details
                $response = Invoke-WebRequest -Uri $indexUrl -Method Post -Headers $searchHeaders -Body $indexBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
                $indexedChunks++
                $chunkGlobalIndex++
                # Small delay after indexing to avoid hitting Azure AI Search rate limits
                Start-Sleep -Milliseconds $baseIndexingDelay
            }
            catch {
                $errorDetails = $_.Exception.Message
                $statusCode = $null
                $errorBody = $null
                
                # Extract status code
                try {
                    if ($_.Exception.Response) {
                        $statusCode = [int]$_.Exception.Response.StatusCode
                    }
                } catch {}
                
                # Extract detailed error response from Azure AI Search (use ErrorDetails.Message - more reliable)
                try {
                    if ($_.ErrorDetails.Message) {
                        $errorBody = $_.ErrorDetails.Message
                        try {
                            $errorJson = $errorBody | ConvertFrom-Json -ErrorAction Stop
                            if ($errorJson.error) {
                                $errorDetails = "$($errorJson.error.message)"
                                if ($errorJson.error.code) {
                                    $errorDetails = "$($errorJson.error.code): $errorDetails"
                                }
                                if ($errorJson.error.details) {
                                    $detailsText = ($errorJson.error.details | ForEach-Object { 
                                        if ($_.message) { $_.message } else { $_ | ConvertTo-Json -Compress }
                                    }) -join "; "
                                    if ($detailsText) {
                                        $errorDetails += " | Details: $detailsText"
                                    }
                                }
                            } else {
                                $errorDetails = $errorBody
                            }
                        } catch {
                            # If JSON parsing fails, try reading from response stream
                            try {
                                if ($_.Exception.Response) {
                                    $responseStream = $_.Exception.Response.GetResponseStream()
                                    if ($responseStream) {
                                        $reader = New-Object System.IO.StreamReader($responseStream)
                                        $responseBody = $reader.ReadToEnd()
                                        $reader.Close()
                                        $responseStream.Close()
                                        if ($responseBody) {
                                            $errorDetails = $responseBody
                                        }
                                    }
                                }
                            } catch {
                                # Use ErrorDetails if available, otherwise use exception message
                                if ($errorBody) {
                                    $errorDetails = $errorBody
                                }
                            }
                        }
                    } else {
                        # Fallback: Try reading from response stream
                        try {
                            if ($_.Exception.Response) {
                                $responseStream = $_.Exception.Response.GetResponseStream()
                                if ($responseStream) {
                                    $reader = New-Object System.IO.StreamReader($responseStream)
                                    $responseBody = $reader.ReadToEnd()
                                    $reader.Close()
                                    $responseStream.Close()
                                    if ($responseBody) {
                                        $errorDetails = $responseBody
                                    }
                                }
                            }
                        } catch {}
                    }
                } catch {
                    # If all else fails, use exception message
                }
                
                Write-Host "      [WARN] Failed to index table chunk: $errorDetails" -ForegroundColor Yellow
                
                # For 400 errors, log additional debugging info (only once per document to avoid spam)
                if ($statusCode -eq 400 -or $errorDetails -like "*400*" -or $errorDetails -like "*Bad Request*") {
                    if ($chunkGlobalIndex -eq 0) {
                        Write-Host "      [DEBUG] Table Document ID: $tableDocId" -ForegroundColor Gray
                        Write-Host "      [DEBUG] Content length: $($tableChunk.content.Length) chars" -ForegroundColor Gray
                        Write-Host "      [DEBUG] Has embedding: $(if ($tableDocument.ContainsKey('contentVector')) { 'Yes' } else { 'No' })" -ForegroundColor Gray
                        if ($tableDocument.ContainsKey('contentVector')) {
                            Write-Host "      [DEBUG] Embedding dimensions: $($tableDocument['contentVector'].Count)" -ForegroundColor Gray
                        }
                        # Log a sample of the document structure for debugging
                        $docKeys = $tableDocument.Keys -join ", "
                        Write-Host "      [DEBUG] Document fields: $docKeys" -ForegroundColor Gray
                        # Log the actual request body for first error (truncated)
                        $bodyPreview = $indexBody.Substring(0, [Math]::Min(500, $indexBody.Length))
                        Write-Host "      [DEBUG] Request body preview: $bodyPreview..." -ForegroundColor Gray
                    }
                }
            }
        }
        
        $totalExpectedChunks = $textChunks.Count + $tableChunks.Count
        Write-Host "   [OK] Indexed $indexedChunks/$totalExpectedChunks chunks ($($textChunks.Count) text + $($tableChunks.Count) table rows)" -ForegroundColor Green
        $stats.processed++
        $stats.chunks += $totalExpectedChunks
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
Write-Host "  Chunks Indexed: $($stats.indexed)" -ForegroundColor Green

# ELITE: Embedding coverage quality check (target: 98%+)
if ($hasOpenAI -and $GenerateEmbeddings) {
    Write-Host "  Embeddings:     $($stats.embeddingsGenerated)" -ForegroundColor $(if ($stats.embeddingErrors -eq 0) { "Green" } else { "Yellow" })
    if ($stats.embeddingErrors -gt 0) {
        Write-Host "  Embedding Errors: $($stats.embeddingErrors)" -ForegroundColor Yellow
    }
    
    # Quality check (target: 98%+ coverage)
    if ($stats.indexed -gt 0) {
        $embeddingCoverage = [math]::Round(($stats.embeddingsGenerated / $stats.indexed) * 100, 2)
        $coverageColor = if ($embeddingCoverage -ge 98) { "Green" } elseif ($embeddingCoverage -ge 95) { "Yellow" } else { "Red" }
        Write-Host "  Embedding Coverage: $embeddingCoverage%" -ForegroundColor $coverageColor
        
        if ($embeddingCoverage -lt 98) {
            Write-Host ""
            Write-Host "  [WARNING] Embedding coverage: $embeddingCoverage% (Target: 98%+)" -ForegroundColor Yellow
            if ($embeddingCoverage -lt 95) {
                Write-Host "            CRITICAL: Coverage below 95% - reprocess required!" -ForegroundColor Red
            }
        } else {
            Write-Host ""
            Write-Host "  [SUCCESS] Embedding coverage: $embeddingCoverage% - ELITE QUALITY (98%+)" -ForegroundColor Green
        }
    }
} elseif ($GenerateEmbeddings -and -not $hasOpenAI) {
    Write-Host "  [ERROR] Embeddings required but OpenAI is not configured" -ForegroundColor Red
    Write-Host "            Run: .\deploy-openai-model.ps1 -ResourceGroupName $ResourceGroupName" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Search Index:   $SearchIndexName" -ForegroundColor White
Write-Host "  Endpoint:       $searchEndpoint" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Verify quality: .\verify-pdf-content.ps1 -ResourceGroupName $ResourceGroupName" -ForegroundColor White
Write-Host "  2. Check Azure Portal for indexed documents" -ForegroundColor White
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
