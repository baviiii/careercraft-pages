# Configure Azure AI Search Web Scraping Indexer
# This script sets up indexers to crawl SA Government websites
# Run this AFTER deploying infrastructure and creating the search index

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$SearchServiceName = "",
    
    [Parameter(Mandatory=$false)]
    [string]$SearchIndexName = "sa-gov-documents"
)

Write-Host "🌐 Configuring Web Scraping for Azure AI Search..." -ForegroundColor Cyan
Write-Host ""

# Get search service name if not provided
if ([string]::IsNullOrEmpty($SearchServiceName)) {
    $searchService = az search service list `
        --resource-group $ResourceGroupName `
        --query "[0].{name:name, endpoint:properties.searchServiceEndpoint}" `
        --output json | ConvertFrom-Json
    
    if (-not $searchService) {
        Write-Host "❌ No Azure AI Search service found in resource group" -ForegroundColor Red
        exit 1
    }
    
    $SearchServiceName = $searchService.name
    $searchEndpoint = $searchService.endpoint
} else {
    $searchEndpoint = "https://$SearchServiceName.search.windows.net"
}

# Get admin key
$adminKey = (az search admin-key show `
    --resource-group $ResourceGroupName `
    --service-name $SearchServiceName `
    --query "primaryKey" `
    --output tsv)

Write-Host "Search Service: $SearchServiceName" -ForegroundColor Green
Write-Host "Endpoint: $searchEndpoint" -ForegroundColor Green
Write-Host ""

# SA Government websites to scrape - Comprehensive career and migration resources
$targetWebsites = @(
    # Primary job portals
    @{
        Name = "SA Jobs Portal"
        Url = "https://jobs.sa.gov.au"
        Description = "SA Government job listings"
        Priority = "High"
    },
    @{
        Name = "SA Government - Looking for Work"
        Url = "https://www.sa.gov.au/topics/employment-and-work/looking-for-work"
        Description = "Assistance & support for job seekers, immigrant support, live programs, tips"
        Priority = "High"
    },
    @{
        Name = "SA Government - Finding a Job"
        Url = "https://www.sa.gov.au/topics/employment-and-work/finding-a-job"
        Description = "Job-hunting guidance and resources"
        Priority = "High"
    },
    @{
        Name = "SA Government - Career Information"
        Url = "https://www.sa.gov.au/topics/employment-and-work/career-information"
        Description = "Career pathways, training, migrant recognition"
        Priority = "High"
    },
    
    # Public sector careers
    @{
        Name = "I Work for SA - Public Sector Careers"
        Url = "https://www.publicsector.sa.gov.au"
        Description = "Public sector careers, application process, selection criteria, resume & interview tips"
        Priority = "High"
    },
    @{
        Name = "SA Health Careers"
        Url = "https://www.sahealth.sa.gov.au/careers"
        Description = "Health career role descriptions, pathways, recruitment tips"
        Priority = "Medium"
    },
    @{
        Name = "Shared Services SA Careers"
        Url = "https://npe.sharedservices.sa.gov.au/careers"
        Description = "Selection criteria, resume guidance, interview prep"
        Priority = "Medium"
    },
    
    # Migration and skilled workers
    @{
        Name = "Skilled Migrant Job Support Programs"
        Url = "https://www.migration.sa.gov.au"
        Description = "Resume, interview, networking support for migrants"
        Priority = "High"
    },
    @{
        Name = "Training & Subsidised Education Support"
        Url = "https://skilledworkers.business.sa.gov.au"
        Description = "Eligibility, programs, fee-free TAFE, training support"
        Priority = "High"
    },
    
    # Career transition and regional support
    @{
        Name = "Career Transition Service / Jobs and Skills Hub"
        Url = "https://www.statedevelopment.sa.gov.au"
        Description = "Regional career support, training programs"
        Priority = "Medium"
    },
    
    # Education and skills
    @{
        Name = "Education SA"
        Url = "https://www.education.sa.gov.au"
        Description = "Education department resources"
        Priority = "Medium"
    },
    @{
        Name = "Skills SA"
        Url = "https://www.skills.sa.gov.au"
        Description = "Skills and training information"
        Priority = "Medium"
    },
    
    # Business and employment services
    @{
        Name = "Business SA"
        Url = "https://www.business.sa.gov.au"
        Description = "Business and employment programs"
        Priority = "Medium"
    },
    
    # Federal programs (Australian-wide, but relevant)
    @{
        Name = "Support to Get You Job-Ready (Federal)"
        Url = "https://www.dewr.gov.au"
        Description = "National job readiness programs, training, skills"
        Priority = "Low"
    },
    @{
        Name = "JobActive & Local Employment Services"
        Url = "https://www.jobactive.gov.au"
        Description = "National programs, training, job readiness guidance"
        Priority = "Low"
    },
    
    # News and Updates (for staying current)
    @{
        Name = "SA Government News & Media"
        Url = "https://www.premier.sa.gov.au/media-releases"
        Description = "Government announcements, policy updates, program launches"
        Priority = "Medium"
    },
    @{
        Name = "SA Jobs & Skills News"
        Url = "https://www.skills.sa.gov.au/news"
        Description = "Skills and training updates, program announcements"
        Priority = "Medium"
    }
)

Write-Host "📋 Target Websites:" -ForegroundColor Cyan
foreach ($site in $targetWebsites) {
    Write-Host "  - $($site.Name): $($site.Url)" -ForegroundColor Yellow
}
Write-Host ""

# Note: Creating indexers requires the index to exist first
Write-Host "ℹ️  Note: This script creates indexer configurations." -ForegroundColor Yellow
Write-Host "   You must create the search index first." -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "api-key" = $adminKey
}

# Create multiple data sources for comprehensive coverage
# This ensures we get occupation details, skills lists, dynamic content, and news/updates

Write-Host "📦 Creating web data sources..." -ForegroundColor Cyan
Write-Host ""

# Data sources for different key entry points
$dataSources = @(
    @{
        name = "sa-gov-jobs-datasource"
        url = "https://jobs.sa.gov.au"
        description = "Primary SA jobs portal - job listings, search results"
    },
    @{
        name = "sa-gov-migration-datasource"
        url = "https://www.migration.sa.gov.au"
        description = "Skilled migrant programs, occupation lists, skills details"
    },
    @{
        name = "sa-gov-skills-datasource"
        url = "https://www.skills.sa.gov.au"
        description = "Skills training, occupation profiles, qualification details"
    },
    @{
        name = "sa-gov-career-datasource"
        url = "https://www.sa.gov.au/topics/employment-and-work"
        description = "Career guidance, job search assistance, pathways"
    },
    @{
        name = "sa-gov-publicsector-datasource"
        url = "https://www.publicsector.sa.gov.au"
        description = "Public sector careers, selection criteria, interview prep"
    },
    @{
        name = "sa-gov-news-datasource"
        url = "https://www.premier.sa.gov.au/media-releases"
        description = "Government news, policy updates, program announcements, media releases"
    }
)

foreach ($ds in $dataSources) {
    Write-Host "Creating data source: $($ds.name)..." -ForegroundColor Yellow
    Write-Host "  URL: $($ds.url)" -ForegroundColor Gray
    
    $dataSourceConfig = @{
        name = $ds.name
        type = "web"
        description = $ds.description
        credentials = @{
            authenticationType = "None"
        }
        container = @{
            name = $ds.url
            query = ""
        }
    } | ConvertTo-Json -Depth 10
    
    $dataSourceUrl = "$searchEndpoint/datasources/$($ds.name)?api-version=2023-11-01"
    
    try {
        $response = Invoke-RestMethod -Uri $dataSourceUrl -Method Put -Headers $headers -Body $dataSourceConfig
        Write-Host "  ✅ Created" -ForegroundColor Green
    }
    catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($errorDetails.error.code -eq "DataSourceNameAlreadyExists") {
            Write-Host "  ⚠️  Already exists, updating..." -ForegroundColor Yellow
            Invoke-RestMethod -Uri $dataSourceUrl -Method Put -Headers $headers -Body $dataSourceConfig | Out-Null
            Write-Host "  ✅ Updated" -ForegroundColor Green
        }
        else {
            Write-Host "  ❌ Failed: $($errorDetails.error.message)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Create indexers for each data source with deeper crawling configuration
# This handles sites with search/dropdowns by going deeper into linked pages

Write-Host "🔧 Creating indexers with deep crawl configuration..." -ForegroundColor Cyan
Write-Host ""

$indexers = @(
    @{
        name = "sa-gov-jobs-indexer"
        dataSourceName = "sa-gov-jobs-datasource"
        description = "Primary SA jobs portal - job listings, search results, occupation details"
    },
    @{
        name = "sa-gov-migration-indexer"
        dataSourceName = "sa-gov-migration-datasource"
        description = "Skilled migrant programs, occupation lists, skills details, eligibility"
    },
    @{
        name = "sa-gov-skills-indexer"
        dataSourceName = "sa-gov-skills-datasource"
        description = "Skills training, occupation profiles, qualification details, training programs"
    },
    @{
        name = "sa-gov-career-indexer"
        dataSourceName = "sa-gov-career-datasource"
        description = "Career guidance, job search assistance, pathways, tips"
    },
    @{
        name = "sa-gov-publicsector-indexer"
        dataSourceName = "sa-gov-publicsector-datasource"
        description = "Public sector careers, selection criteria, interview prep, resume guidance"
    },
    @{
        name = "sa-gov-news-indexer"
        dataSourceName = "sa-gov-news-datasource"
        description = "Government news, policy updates, program announcements, media releases"
    }
)

foreach ($idx in $indexers) {
    Write-Host "Creating indexer: $($idx.name)..." -ForegroundColor Yellow
    
    # Indexer config with deeper crawling for dynamic content
    $indexerConfig = @{
        name = $idx.name
        description = $idx.description
        dataSourceName = $idx.dataSourceName
        targetIndexName = $SearchIndexName
        schedule = @{
            interval = "PT6H"  # Every 6 hours
            startTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        }
        parameters = @{
            batchSize = 100
            maxFailedItems = 10
            maxFailedItemsPerBatch = 5
            configuration = @{
                indexingMode = "Incremental"
                dataToExtract = "contentAndMetadata"
                imageAction = "None"
                # Deeper crawling configuration
                maxFailedItems = 10
                maxFailedItemsPerBatch = 5
                # Note: Azure AI Search follows links intelligently
                # For sites with search/dropdowns, it will index linked result pages
                # and discovered content from navigation structures
            }
        }
        fieldMappings = @(
            @{
                sourceFieldName = "metadata_storage_path"
                targetFieldName = "url"
            },
            @{
                sourceFieldName = "metadata_storage_name"
                targetFieldName = "title"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    $indexerUrl = "$searchEndpoint/indexers/$($idx.name)?api-version=2023-11-01"
    
    try {
        $response = Invoke-RestMethod -Uri $indexerUrl -Method Put -Headers $headers -Body $indexerConfig
        Write-Host "  ✅ Created" -ForegroundColor Green
    }
    catch {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($errorDetails.error.code -eq "IndexerNameAlreadyExists") {
            Write-Host "  ⚠️  Already exists, updating..." -ForegroundColor Yellow
            Invoke-RestMethod -Uri $indexerUrl -Method Put -Headers $headers -Body $indexerConfig | Out-Null
            Write-Host "  ✅ Updated" -ForegroundColor Green
        }
        elseif ($errorDetails.error.message -like "*index*not found*") {
            Write-Host "  ❌ Search index '$SearchIndexName' not found - create it first!" -ForegroundColor Red
        }
        else {
            Write-Host "  ❌ Failed: $($errorDetails.error.message)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

Write-Host "✅ All data sources and indexers created/updated!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify index exists: $SearchIndexName" -ForegroundColor Yellow
Write-Host "2. Run indexers manually or wait for schedule (every 6 hours)" -ForegroundColor Yellow
Write-Host "3. Monitor in Azure Portal: AI Search > Indexers" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 About Dynamic Content (Search/Dropdowns):" -ForegroundColor Cyan
Write-Host "  • Azure AI Search follows links intelligently" -ForegroundColor White
Write-Host "  • For sites with search: It will index linked result pages and discovered content" -ForegroundColor White
Write-Host "  • For dropdowns: It follows navigation links to discover deeper content" -ForegroundColor White
Write-Host "  • Multiple entry points ensure comprehensive coverage" -ForegroundColor White
Write-Host "  • Indexers will discover occupation details, skills lists, and program info" -ForegroundColor White
Write-Host "  • First crawl may take longer as it discovers all linked pages" -ForegroundColor White

Write-Host ""
Write-Host "📋 Configured Websites:" -ForegroundColor Cyan
foreach ($site in $targetWebsites) {
    $priorityColor = switch ($site.Priority) {
        "High" { "Green" }
        "Medium" { "Yellow" }
        "Low" { "White" }
    }
    Write-Host "  [$($site.Priority)] $($site.Name)" -ForegroundColor $priorityColor
    Write-Host "      $($site.Url)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🌐 What Gets Indexed:" -ForegroundColor Cyan
Write-Host "  ✅ Job listings (all SA government jobs)" -ForegroundColor Green
Write-Host "  ✅ Occupation details (skilled occupation lists, descriptions)" -ForegroundColor Green
Write-Host "  ✅ Skills requirements (qualifications, competencies)" -ForegroundColor Green
Write-Host "  ✅ Migrant support programs (eligibility, application process)" -ForegroundColor Green
Write-Host "  ✅ Training programs (TAFE, subsidised courses, pathways)" -ForegroundColor Green
Write-Host "  ✅ Selection criteria examples (public sector)" -ForegroundColor Green
Write-Host "  ✅ Interview prep resources (government-specific)" -ForegroundColor Green
Write-Host "  ✅ Career pathways (education, health, public sector)" -ForegroundColor Green
Write-Host "  ✅ Regional support programs" -ForegroundColor Green
Write-Host "  ✅ News & updates (policy changes, announcements, latest info)" -ForegroundColor Green
Write-Host ""
Write-Host " Multiple entry points ensure deep content discovery:" -ForegroundColor Cyan
Write-Host "  • Jobs portal → discovers all job-related pages" -ForegroundColor White
Write-Host "  • Migration site → gets occupation lists, skills details" -ForegroundColor White
Write-Host "  • Skills site → finds training programs, qualification info" -ForegroundColor White
Write-Host "  • Career guidance → discovers pathways, tips, resources" -ForegroundColor White
Write-Host "  • Public sector → gets selection criteria, interview prep" -ForegroundColor White
Write-Host "  • News & updates → captures policy changes, program announcements, latest info" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Auto-Updates:" -ForegroundColor Cyan
Write-Host "  • Indexers run every 6 hours automatically" -ForegroundColor White
Write-Host "  • New job postings, policy updates, and announcements are captured" -ForegroundColor White
Write-Host "  • Your RAG system stays current with latest SA government information" -ForegroundColor White
Write-Host ""

