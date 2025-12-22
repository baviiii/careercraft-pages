# Enterprise SA Government Web Scraper
# Intelligently scrapes jobs, skills, news, and background info
# Always generates embeddings for optimal RAG performance
# Pushes to Azure AI Search with full vector search support

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$SearchIndexName = "sa-gov-documents",
    
    
    [Parameter(Mandatory=$false)]
    [switch]$JobsOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkillsOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$NewsOnly
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Smart SA Government Web Scraper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get Azure resources
Write-Host "[1/6] Getting Azure resources..." -ForegroundColor Yellow

$searchService = az search service list --resource-group $ResourceGroupName --query "[0]" | ConvertFrom-Json
if (-not $searchService) {
    Write-Host "[ERROR] No Azure AI Search service found" -ForegroundColor Red
    exit 1
}

$searchEndpoint = "https://$($searchService.name).search.windows.net"
$searchKey = az search admin-key show --resource-group $ResourceGroupName --service-name $searchService.name --query "primaryKey" -o tsv

Write-Host "  Search Service: $($searchService.name)" -ForegroundColor Green
Write-Host "  Endpoint: $searchEndpoint" -ForegroundColor Green

# Get OpenAI for embeddings (always required for enterprise scraper)
$openAI = az cognitiveservices account list --resource-group $ResourceGroupName --query "[?kind=='OpenAI'] | [0]" | ConvertFrom-Json
if ($openAI) {
    $openAIEndpoint = $openAI.properties.endpoint
    $openAIKey = az cognitiveservices account keys list --name $openAI.name --resource-group $ResourceGroupName --query "key1" -o tsv
    $embeddingDeployment = "text-embedding-3-large"
    Write-Host "  OpenAI: $($openAI.name) (embeddings enabled)" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] OpenAI not found - embeddings are required for enterprise scraper!" -ForegroundColor Red
    Write-Host "  Deploy OpenAI first: ..\deploy-openai-model.ps1 -ResourceGroupName $ResourceGroupName" -ForegroundColor Yellow
    exit 1
}

# Smart scraping targets with specific purposes
$scrapingTargets = @()

# 1. I WORK FOR SA - Job Postings (for notifications)
if (-not $SkillsOnly -and -not $NewsOnly) {
    $scrapingTargets += @(
        @{
            Name = "I Work for SA - Main Portal"
            Url = "https://iworkfor.sa.gov.au/"
            Category = "jobs"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "job-listings"
        },
        @{
            Name = "I Work for SA - Job Search"
            Url = "https://www.publicsector.sa.gov.au/working-in-the-public-sector/job-opportunities"
            Category = "jobs"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "job-listings"
        },
        @{
            Name = "I Work for SA - Current Vacancies"
            Url = "https://www.publicsector.sa.gov.au/working-in-the-public-sector/job-opportunities/current-vacancies"
            Category = "jobs"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "job-listings"
        },
        @{
            Name = "SA Jobs Portal"
            Url = "https://jobs.sa.gov.au"
            Category = "jobs"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "job-listings"
        },
        @{
            Name = "SA Government - Looking for Work"
            Url = "https://www.sa.gov.au/topics/employment-and-work/looking-for-work"
            Category = "career-guidance"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "SA Government - Finding a Job"
            Url = "https://www.sa.gov.au/topics/employment-and-work/finding-a-job"
            Category = "career-guidance"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "SA Government - Career Information"
            Url = "https://www.sa.gov.au/topics/employment-and-work/career-information"
            Category = "career-guidance"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "Public Sector SA - Careers"
            Url = "https://www.publicsector.sa.gov.au/about/Our-People/careers-in-the-public-sector"
            Category = "public-sector"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "general-info"
        },
        @{
            Name = "Migration SA - Work"
            Url = "https://www.migration.sa.gov.au/work-in-south-australia"
            Category = "migration"
            Sector = "government"
            Priority = "high"
            Type = "jobs"
            ExtractStrategy = "detailed-info"
        }
    )
}

# 2. SKILLS SA - Detailed Skills Information
if (-not $JobsOnly -and -not $NewsOnly) {
    $scrapingTargets += @(
        @{
            Name = "SA Skilled Occupation List"
            Url = "https://www.migration.sa.gov.au/occupation-lists/south-australia-skilled-occupation-list"
            Category = "migration"
            Sector = "government"
            Priority = "high"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "Skills SA - Skills Development"
            Url = "https://www.skills.sa.gov.au/skills-development"
            Category = "skills"
            Sector = "government"
            Priority = "high"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "Skills SA - Training & Learning"
            Url = "https://www.skills.sa.gov.au/training-learning"
            Category = "training"
            Sector = "government"
            Priority = "high"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "Skills SA - Apprenticeships"
            Url = "https://www.skills.sa.gov.au/training-learning/apprenticeships-and-traineeships"
            Category = "training"
            Sector = "government"
            Priority = "high"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "Skills SA - Career Pathways"
            Url = "https://www.skills.sa.gov.au/careers-jobs"
            Category = "career-guidance"
            Sector = "government"
            Priority = "medium"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "Business SA - Programs"
            Url = "https://www.business.sa.gov.au/programs"
            Category = "training"
            Sector = "government"
            Priority = "medium"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "Skilled Workers Business SA"
            Url = "https://skilledworkers.business.sa.gov.au"
            Category = "training"
            Sector = "government"
            Priority = "high"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "State Development SA"
            Url = "https://www.statedevelopment.sa.gov.au"
            Category = "career-guidance"
            Sector = "government"
            Priority = "medium"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "Education SA"
            Url = "https://www.education.sa.gov.au"
            Category = "education"
            Sector = "education"
            Priority = "medium"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        },
        @{
            Name = "SA Health Careers"
            Url = "https://www.sahealth.sa.gov.au/careers"
            Category = "career-guidance"
            Sector = "health"
            Priority = "medium"
            Type = "background"
            ExtractStrategy = "general-info"
        },
        @{
            Name = "Shared Services SA Careers"
            Url = "https://npe.sharedservices.sa.gov.au/careers"
            Category = "career-guidance"
            Sector = "government"
            Priority = "medium"
            Type = "background"
            ExtractStrategy = "general-info"
        }
        @{
            Name = "Skills SA - Occupation Profiles"
            Url = "https://www.skills.sa.gov.au/skills-development/occupation-profiles"
            Category = "skills"
            Sector = "government"
            Priority = "high"
            Type = "skills"
            ExtractStrategy = "detailed-info"
        }
    )
}

# 3. NEWS & UPDATES
if (-not $JobsOnly -and -not $SkillsOnly) {
    $scrapingTargets += @(
        @{
            Name = "Premier SA - Media Releases"
            Url = "https://www.premier.sa.gov.au/media-releases"
            Category = "news"
            Sector = "government"
            Priority = "high"
            Type = "news"
            ExtractStrategy = "news-updates"
        },
        @{
            Name = "Skills SA - News"
            Url = "https://www.skills.sa.gov.au/news"
            Category = "news"
            Sector = "government"
            Priority = "medium"
            Type = "news"
            ExtractStrategy = "news-updates"
        },
        @{
            Name = "SA Health - News"
            Url = "https://www.sahealth.sa.gov.au/wps/wcm/connect/public+content/sa+health+internet/news"
            Category = "news"
            Sector = "health"
            Priority = "medium"
            Type = "news"
            ExtractStrategy = "news-updates"
        }
    )
}

# 4. BACKGROUND INFORMATION
if (-not $JobsOnly -and -not $SkillsOnly -and -not $NewsOnly) {
    $scrapingTargets += @(
        @{
            Name = "Public Sector SA - About"
            Url = "https://www.publicsector.sa.gov.au/about"
            Category = "background"
            Sector = "government"
            Priority = "medium"
            Type = "background"
            ExtractStrategy = "general-info"
        },
        @{
            Name = "Public Sector SA - Selection Criteria"
            Url = "https://www.publicsector.sa.gov.au/working-in-the-public-sector/applying-for-jobs/selection-criteria"
            Category = "career-guidance"
            Sector = "government"
            Priority = "high"
            Type = "background"
            ExtractStrategy = "general-info"
        },
        @{
            Name = "SA Health - Careers Info"
            Url = "https://www.sahealth.sa.gov.au/wps/wcm/connect/public+content/sa+health+internet/careers"
            Category = "background"
            Sector = "health"
            Priority = "medium"
            Type = "background"
            ExtractStrategy = "general-info"
        },
        @{
            Name = "TAFE SA - Career Services"
            Url = "https://www.tafesa.edu.au/services/career-services"
            Category = "career-guidance"
            Sector = "education"
            Priority = "medium"
            Type = "background"
            ExtractStrategy = "general-info"
        }
    )
}

Write-Host ""
Write-Host "[2/6] Scraping targets: $($scrapingTargets.Count)" -ForegroundColor Yellow
Write-Host "  Jobs: $(($scrapingTargets | Where-Object { $_.Type -eq 'jobs' }).Count)" -ForegroundColor Gray
Write-Host "  Skills: $(($scrapingTargets | Where-Object { $_.Type -eq 'skills' }).Count)" -ForegroundColor Gray
Write-Host "  News: $(($scrapingTargets | Where-Object { $_.Type -eq 'news' }).Count)" -ForegroundColor Gray
Write-Host "  Background: $(($scrapingTargets | Where-Object { $_.Type -eq 'background' }).Count)" -ForegroundColor Gray

# Scraping function with intelligent extraction
function Extract-Content {
    param(
        [string]$Html,
        [string]$Url,
        [string]$ExtractStrategy
    )
    
    # Remove unwanted elements
    $html = $html -replace '<script[^>]*>[\s\S]*?</script>', ''
    $html = $html -replace '<style[^>]*>[\s\S]*?</style>', ''
    $html = $html -replace '<nav[^>]*>[\s\S]*?</nav>', ''
    $html = $html -replace '<footer[^>]*>[\s\S]*?</footer>', ''
    $html = $html -replace '<header[^>]*>[\s\S]*?</header>', ''
    
    # Extract title
    $titleMatch = [regex]::Match($html, '<title[^>]*>([^<]+)</title>')
    $title = if ($titleMatch.Success) { $titleMatch.Groups[1].Value.Trim() } else { "Untitled" }
    
    # Strategy-specific extraction
    switch ($ExtractStrategy) {
        "job-listings" {
            # Extract job listings - look for common job posting patterns
            $jobPatterns = @(
                '<article[^>]*>[\s\S]*?</article>',
                '<div[^>]*class="[^"]*job[^"]*"[^>]*>[\s\S]*?</div>',
                '<div[^>]*class="[^"]*vacancy[^"]*"[^>]*>[\s\S]*?</div>',
                '<div[^>]*class="[^"]*position[^"]*"[^>]*>[\s\S]*?</div>'
            )
            
            $jobs = @()
            foreach ($pattern in $jobPatterns) {
                $matches = [regex]::Matches($html, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $jobHtml = $match.Value
                    $jobText = $jobHtml -replace '<[^>]+>', ' '
                    $jobText = $jobText -replace '\s+', ' ' -replace '^\s+|\s+$', ''
                    
                    if ($jobText.Length -gt 50) {
                        $jobs += $jobText
                    }
                }
            }
            
            if ($jobs.Count -gt 0) {
                return @{
                    Title = $title
                    Content = ($jobs -join "`n`n")
                    Metadata = @{
                        JobCount = $jobs.Count
                        ExtractionMethod = "job-listings"
                    }
                }
            }
        }
        "detailed-info" {
            # Extract detailed information sections
            $infoPatterns = @(
                '<main[^>]*>[\s\S]*?</main>',
                '<article[^>]*>[\s\S]*?</article>',
                '<section[^>]*>[\s\S]*?</section>',
                '<div[^>]*class="[^"]*content[^"]*"[^>]*>[\s\S]*?</div>'
            )
            
            $content = ""
            foreach ($pattern in $infoPatterns) {
                $matches = [regex]::Matches($html, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $sectionHtml = $match.Value
                    $sectionText = $sectionHtml -replace '<[^>]+>', ' '
                    $sectionText = $sectionText -replace '\s+', ' ' -replace '^\s+|\s+$', ''
                    $content += $sectionText + "`n`n"
                }
            }
            
            if ($content.Length -lt 200) {
                # Fallback to body
                $content = $html -replace '<[^>]+>', ' '
                $content = $content -replace '\s+', ' ' -replace '^\s+|\s+$', ''
            }
            
            return @{
                Title = $title
                Content = $content.Trim()
                Metadata = @{
                    ExtractionMethod = "detailed-info"
                }
            }
        }
        "news-updates" {
            # Extract news articles and updates
            $newsPatterns = @(
                '<article[^>]*>[\s\S]*?</article>',
                '<div[^>]*class="[^"]*news[^"]*"[^>]*>[\s\S]*?</div>',
                '<div[^>]*class="[^"]*media-release[^"]*"[^>]*>[\s\S]*?</div>',
                '<div[^>]*class="[^"]*update[^"]*"[^>]*>[\s\S]*?</div>'
            )
            
            $newsItems = @()
            foreach ($pattern in $newsPatterns) {
                $matches = [regex]::Matches($html, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    $newsHtml = $match.Value
                    $newsText = $newsHtml -replace '<[^>]+>', ' '
                    $newsText = $newsText -replace '\s+', ' ' -replace '^\s+|\s+$', ''
                    
                    if ($newsText.Length -gt 50) {
                        $newsItems += $newsText
                    }
                }
            }
            
            if ($newsItems.Count -gt 0) {
                return @{
                    Title = $title
                    Content = ($newsItems -join "`n`n")
                    Metadata = @{
                        NewsCount = $newsItems.Count
                        ExtractionMethod = "news-updates"
                    }
                }
            }
        }
        default {
            # General info extraction
            $content = $html -replace '<[^>]+>', ' '
            $content = $content -replace '\s+', ' ' -replace '^\s+|\s+$', ''
            
            return @{
                Title = $title
                Content = $content.Trim()
                Metadata = @{
                    ExtractionMethod = "general-info"
                }
            }
        }
    }
    
    # Fallback
    $content = $html -replace '<[^>]+>', ' '
    $content = $content -replace '\s+', ' ' -replace '^\s+|\s+$', ''
    
    return @{
        Title = $title
        Content = $content.Trim()
        Metadata = @{}
    }
}

# Retry function with exponential backoff and anti-bot evasion
function Invoke-WebRequestWithRetry {
    param(
        [string]$Uri,
        [int]$MaxRetries = 3,
        [int]$InitialTimeout = 60,
        [int]$MaxTimeout = 120
    )
    
    $retryCount = 0
    $timeout = $InitialTimeout
    
    # Rotate User-Agents to avoid detection
    $userAgents = @(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    )
    
    while ($retryCount -lt $MaxRetries) {
        try {
            # Use different User-Agent on each retry
            $userAgent = $userAgents[$retryCount % $userAgents.Count]
            
            $headers = @{
                'User-Agent' = $userAgent
                'Accept' = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                'Accept-Language' = 'en-US,en;q=0.9,en-AU;q=0.8'
                'Referer' = 'https://www.google.com/'
                'Cache-Control' = 'no-cache'
            }
            
            # Add delay between requests to avoid rate limiting (especially on first attempt)
            if ($retryCount -eq 0) {
                Start-Sleep -Seconds 2  # 2 second delay before first request
            }
            
            # Use WebRequest for better control (handles connection issues better)
            $request = [System.Net.HttpWebRequest]::Create($Uri)
            $request.UserAgent = $userAgent
            $request.Accept = $headers['Accept']
            $request.Headers.Add('Accept-Language', $headers['Accept-Language'])
            $request.Headers.Add('Cache-Control', $headers['Cache-Control'])
            $request.Timeout = $timeout * 1000  # Convert to milliseconds
            $request.AllowAutoRedirect = $true
            $request.MaximumAutomaticRedirections = 5
            $request.Method = 'GET'
            
            try {
                $response = $request.GetResponse()
                $stream = $response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $content = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
                $response.Close()
                
                # Return a response-like object for compatibility
                return @{
                    StatusCode = [int]$response.StatusCode
                    Content = $content
                }
            }
            catch {
                $response?.Close()
                throw
            }
        }
        catch {
            $retryCount++
            $errorMsg = $_.Exception.Message
            
            # Check if exception has a Response property before accessing it
            $statusCode = $null
            if ($_.Exception.Response) {
                try {
                    $statusCode = $_.Exception.Response.StatusCode
                }
                catch {
                    # Response exists but StatusCode access might fail
                }
            }
            
            # Check if it's a blocking/forbidden error
            if ($errorMsg -match "403|Forbidden|blocked|denied" -or $statusCode -eq 403) {
                Write-Host "    [BLOCKED] Site may be blocking automated requests - this is common for government sites" -ForegroundColor Yellow
            }
            elseif ($errorMsg -match "429|Too Many Requests|rate limit" -or $statusCode -eq 429) {
                Write-Host "    [RATE LIMITED] Too many requests - waiting longer..." -ForegroundColor Yellow
            }
            
            if ($retryCount -lt $MaxRetries) {
                $waitTime = [Math]::Min([Math]::Pow(2, $retryCount) * 2, 30)  # Longer waits: 4s, 8s, up to 30s
                $timeout = [Math]::Min($timeout + 15, $MaxTimeout)
                Write-Host "    [RETRY $retryCount/$MaxRetries] Waiting ${waitTime}s... ($errorMsg)" -ForegroundColor Yellow
                Start-Sleep -Seconds $waitTime
            } else {
                throw "Failed after $MaxRetries attempts: $errorMsg"
            }
        }
    }
    
    throw "Failed to fetch after $MaxRetries retries"
}

# Scrape websites
Write-Host ""
Write-Host "[3/6] Scraping websites..." -ForegroundColor Yellow

$allDocuments = @()
$successCount = 0
$failCount = 0

foreach ($target in $scrapingTargets) {
    Write-Host ""
    Write-Host "  Scraping: $($target.Name)" -ForegroundColor Cyan
    Write-Host "    URL: $($target.Url)" -ForegroundColor Gray
    Write-Host "    Type: $($target.Type) | Strategy: $($target.ExtractStrategy)" -ForegroundColor Gray
    
    try {
        # Use retry logic with longer timeout for large pages like migration site
        $timeout = if ($target.Url -like "*migration.sa.gov.au*") { 90 } else { 60 }
        
        # Add delay between different websites to avoid rate limiting
        if ($successCount -gt 0) {
            Start-Sleep -Seconds 3  # 3 second delay between websites
        }
        
        $response = Invoke-WebRequestWithRetry -Uri $target.Url -InitialTimeout $timeout -MaxTimeout 120
        
        if ($response.StatusCode -eq 200) {
            $extracted = Extract-Content -Html $response.Content -Url $target.Url -ExtractStrategy $target.ExtractStrategy
            
            if ($extracted.Content.Length -gt 200) {
                # Generate document ID
                $docId = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($target.Url)) -replace '[^a-zA-Z0-9]', ''
                $docId = $docId.Substring(0, [Math]::Min(50, $docId.Length))
                
                # Chunk the content
                $chunkSize = 1500
                $chunks = @()
                $position = 0
                $chunkIndex = 0
                
                while ($position -lt $extracted.Content.Length) {
                    $length = [Math]::Min($chunkSize, $extracted.Content.Length - $position)
                    $chunk = $extracted.Content.Substring($position, $length).Trim()
                    
                    if ($chunk.Length -gt 100) {
                        # Sanitize
                        $sanitizedChunk = $chunk -replace '[\x00-\x1F]', ' '
                        $sanitizedChunk = $sanitizedChunk -replace '\\', '\\\\'
                        $sanitizedTitle = $extracted.Title -replace '[\x00-\x1F]', ' '
                        
                        $chunks += @{
                            Id = "$docId-$chunkIndex"
                            Content = $sanitizedChunk
                            Title = $sanitizedTitle
                            DocumentId = $docId
                            ChunkIndex = $chunkIndex
                            Url = $target.Url
                            Category = $target.Category
                            Sector = $target.Sector
                            Type = $target.Type
                            Metadata = $extracted.Metadata
                        }
                        $chunkIndex++
                    }
                    
                    $position += $chunkSize - 200  # Overlap
                }
                
                $allDocuments += $chunks
                $successCount++
                Write-Host "    [OK] Extracted $($chunks.Count) chunks ($($extracted.Content.Length) chars)" -ForegroundColor Green
            } else {
                Write-Host "    [SKIP] Content too short" -ForegroundColor Yellow
            }
        }
    }
    catch {
        $failCount++
        Write-Host "    [FAIL] $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[4/6] Processing $($allDocuments.Count) chunks..." -ForegroundColor Yellow

# Generate embeddings (always enabled for enterprise scraper)
if ($openAIEndpoint) {
    Write-Host "  Generating embeddings..." -ForegroundColor Gray
    
    $embeddingHeaders = @{
        "Content-Type" = "application/json"
        "api-key" = $openAIKey
    }
    
    $processed = 0
    foreach ($doc in $allDocuments) {
        try {
            $embeddingBody = @{
                input = $doc.Content.Substring(0, [Math]::Min(8000, $doc.Content.Length))
                model = $embeddingDeployment
            } | ConvertTo-Json
            
            $embeddingUrl = "$openAIEndpoint/openai/deployments/$embeddingDeployment/embeddings?api-version=2024-02-15-preview"
            $embeddingResponse = Invoke-RestMethod -Uri $embeddingUrl -Method Post -Headers $embeddingHeaders -Body $embeddingBody
            
            $doc["ContentVector"] = $embeddingResponse.data[0].embedding
            $processed++
            
            if ($processed % 10 -eq 0) {
                Write-Host "    Embedded $processed/$($allDocuments.Count) chunks" -ForegroundColor Gray
            }
            
            Start-Sleep -Milliseconds 200  # Rate limiting
        }
        catch {
            Write-Host "    [WARN] Embedding failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "  [OK] Generated $processed embeddings" -ForegroundColor Green
}

# Push to Azure AI Search
Write-Host ""
Write-Host "[5/6] Pushing to Azure AI Search..." -ForegroundColor Yellow

$searchHeaders = @{
    "Content-Type" = "application/json"
    "api-key" = $searchKey
}

$batchSize = 100
$totalPushed = 0

for ($i = 0; $i -lt $allDocuments.Count; $i += $batchSize) {
    $batch = $allDocuments[$i..([Math]::Min($i + $batchSize - 1, $allDocuments.Count - 1))]
    
    $documents = @()
    foreach ($doc in $batch) {
        $searchDoc = @{
            "@search.action" = "mergeOrUpload"
            "id" = $doc.Id
            "content" = $doc.Content
            "title" = $doc.Title
            "documentId" = $doc.DocumentId
            "documentType" = "web"
            "source" = $doc.Url
            "url" = $doc.Url
            "pageNumber" = 1
            "chunkIndex" = $doc.ChunkIndex
            "indexedAt" = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            "category" = $doc.Category
            "sector" = $doc.Sector
            "tags" = @($doc.Category, $doc.Sector, "web-scraped", $doc.Type)
            "topics" = @()
        }
        
        if ($doc.ContainsKey("ContentVector")) {
            $searchDoc["contentVector"] = $doc.ContentVector
        }
        
        $documents += $searchDoc
    }
    
    $body = @{
        value = $documents
    } | ConvertTo-Json -Depth 10 -Compress
    
    try {
        $indexUrl = "$searchEndpoint/indexes/$SearchIndexName/docs/index?api-version=2023-11-01"
        $response = Invoke-RestMethod -Uri $indexUrl -Method Post -Headers $searchHeaders -Body $body
        $totalPushed += $batch.Count
        Write-Host "  Pushed batch: $totalPushed/$($allDocuments.Count)" -ForegroundColor Gray
    }
    catch {
        Write-Host "  [FAIL] Batch push failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host ""
Write-Host "[6/6] Complete!" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Smart Scraping Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Pages scraped: $successCount / $($scrapingTargets.Count)" -ForegroundColor White
Write-Host "  Chunks created: $($allDocuments.Count)" -ForegroundColor White
Write-Host "  Documents pushed: $totalPushed" -ForegroundColor White
Write-Host "  Index: $SearchIndexName" -ForegroundColor White
Write-Host "  Embeddings: Enabled (enterprise mode)" -ForegroundColor White
Write-Host ""
Write-Host "  Jobs are now in Azure AI Search - notification processor will query them directly" -ForegroundColor Cyan
Write-Host ""

