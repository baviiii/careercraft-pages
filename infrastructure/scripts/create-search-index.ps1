# Create Azure AI Search Index with Vector Fields
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$SearchServiceName = "",
    
    [Parameter(Mandatory=$false)]
    [string]$IndexName = "sa-gov-documents",
    
    [Parameter(Mandatory=$false)]
    [int]$VectorDimensions = 3072
)

Write-Host "Creating Azure AI Search Index with Vector Fields..." -ForegroundColor Cyan
Write-Host ""

# Get search service name if not provided
if ([string]::IsNullOrEmpty($SearchServiceName)) {
    $SearchServiceName = "careercraft-search-dev"
    $searchEndpoint = "https://$SearchServiceName.search.windows.net"
} else {
    $searchEndpoint = "https://$SearchServiceName.search.windows.net"
}

# Get admin key
$adminKey = (az search admin-key show --resource-group $ResourceGroupName --service-name $SearchServiceName --query "primaryKey" --output tsv)

Write-Host "Search Service: $SearchServiceName" -ForegroundColor Green
Write-Host "Index Name: $IndexName" -ForegroundColor Green
Write-Host "Vector Dimensions: $VectorDimensions" -ForegroundColor Green
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "api-key" = $adminKey
}

# Define index schema with vector fields for RAG
$indexDefinition = @{
    name = $IndexName
    fields = @(
        @{
            name = "id"
            type = "Edm.String"
            key = $true
            searchable = $false
            filterable = $true
            retrievable = $true
        },
        @{
            name = "content"
            type = "Edm.String"
            searchable = $true
            filterable = $false
            retrievable = $true
            analyzer = "en.microsoft"
        },
        @{
            name = "contentVector"
            type = "Collection(Edm.Single)"
            searchable = $true
            retrievable = $true
            dimensions = $VectorDimensions
            vectorSearchProfile = "vector-profile"
        },
        @{
            name = "documentId"
            type = "Edm.String"
            searchable = $false
            filterable = $true
            retrievable = $true
        },
        @{
            name = "documentType"
            type = "Edm.String"
            searchable = $false
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "source"
            type = "Edm.String"
            searchable = $false
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "url"
            type = "Edm.String"
            searchable = $false
            filterable = $false
            retrievable = $true
        },
        @{
            name = "title"
            type = "Edm.String"
            searchable = $true
            filterable = $false
            retrievable = $true
            analyzer = "en.microsoft"
        },
        @{
            name = "pageNumber"
            type = "Edm.Int32"
            searchable = $false
            filterable = $true
            retrievable = $true
        },
        @{
            name = "chunkIndex"
            type = "Edm.Int32"
            searchable = $false
            filterable = $true
            retrievable = $true
        },
        @{
            name = "chunkType"
            type = "Edm.String"
            searchable = $false
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "confidence"
            type = "Edm.Double"
            searchable = $false
            filterable = $true
            retrievable = $true
            sortable = $true
        },
        @{
            name = "retrievalWeight"
            type = "Edm.Double"
            searchable = $false
            filterable = $true
            retrievable = $true
            sortable = $true
        },
        @{
            name = "embeddingModel"
            type = "Edm.String"
            searchable = $false
            filterable = $true
            retrievable = $true
        },
        @{
            name = "embeddingGeneratedAt"
            type = "Edm.DateTimeOffset"
            searchable = $false
            filterable = $true
            retrievable = $true
            sortable = $true
        },
        @{
            name = "indexedAt"
            type = "Edm.DateTimeOffset"
            searchable = $false
            filterable = $true
            retrievable = $true
            sortable = $true
        },
        @{
            name = "category"
            type = "Edm.String"
            searchable = $true
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "tags"
            type = "Collection(Edm.String)"
            searchable = $true
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "topics"
            type = "Collection(Edm.String)"
            searchable = $true
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "occupation"
            type = "Edm.String"
            searchable = $true
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "sector"
            type = "Edm.String"
            searchable = $false
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "sectors"
            type = "Collection(Edm.String)"
            searchable = $false
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "tagConfidence"
            type = "Edm.Double"
            searchable = $false
            filterable = $true
            retrievable = $true
            sortable = $true
        },
        @{
            name = "sectionHeading"
            type = "Edm.String"
            searchable = $true
            filterable = $false
            retrievable = $true
        },
        @{
            name = "programType"
            type = "Edm.String"
            searchable = $false
            filterable = $true
            retrievable = $true
            facetable = $true
        },
        @{
            name = "extractedData"
            type = "Edm.String"
            searchable = $false
            filterable = $false
            retrievable = $true
        },
        @{
            name = "metadata"
            type = "Edm.String"
            searchable = $false
            filterable = $false
            retrievable = $true
        }
    )
    vectorSearch = @{
        algorithms = @(
            @{
                name = "hnsw-config"
                kind = "hnsw"
                hnswParameters = @{
                    m = 4
                    efConstruction = 400
                    efSearch = 500
                    metric = "cosine"
                }
            }
        )
        profiles = @(
            @{
                name = "vector-profile"
                algorithm = "hnsw-config"
            }
        )
    }
    semantic = @{
        configurations = @(
            @{
                name = "default"
                prioritizedFields = @{
                    titleField = @{ fieldName = "title" }
                    prioritizedContentFields = @(@{ fieldName = "content" })
                }
            }
        )
    }
} | ConvertTo-Json -Depth 10

$indexUrl = "$searchEndpoint/indexes/${IndexName}?api-version=2023-11-01"

Write-Host "Creating search index..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $indexUrl -Method Put -Headers $headers -Body $indexDefinition
    
    Write-Host ""
    Write-Host "Search index created successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Verify by fetching the index details
    try {
        $getIndexUrl = "$searchEndpoint/indexes/${IndexName}?api-version=2023-11-01"
        $indexDetails = Invoke-RestMethod -Uri $getIndexUrl -Method Get -Headers $headers
        
        Write-Host "Index Details:" -ForegroundColor Cyan
        Write-Host "  Name: $($indexDetails.name)" -ForegroundColor White
        Write-Host "  Fields: $($indexDetails.fields.Count)" -ForegroundColor White
        Write-Host "  Vector Search: Enabled" -ForegroundColor White
        Write-Host "  Semantic Search: Enabled" -ForegroundColor White
    }
    catch {
        Write-Host "Index created but could not verify details" -ForegroundColor Yellow
    }
}
catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($errorDetails.error.code -eq "IndexAlreadyExists") {
        Write-Host "Index already exists!" -ForegroundColor Yellow
    }
    else {
        Write-Host "Failed to create index" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
}

Write-Host ""
