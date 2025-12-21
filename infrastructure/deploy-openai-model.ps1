# Deploy Azure OpenAI Embedding Model
# This script must be run AFTER the main infrastructure deployment
# Azure OpenAI requires separate model deployment via API

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$ModelName = "text-embedding-3-large",
    
    [Parameter(Mandatory=$false)]
    [string]$ModelVersion = "1"
)

Write-Host "🚀 Deploying Azure OpenAI Embedding Model..." -ForegroundColor Cyan
Write-Host "Model: $ModelName" -ForegroundColor Yellow
Write-Host ""

# Get OpenAI account name from resource group
$openAIAccount = az cognitiveservices account list `
    --resource-group $ResourceGroupName `
    --query "[?kind=='OpenAI'].{name:name, location:location}" `
    --output json | ConvertFrom-Json

if (-not $openAIAccount -or $openAIAccount.Count -eq 0) {
    Write-Host "❌ No OpenAI account found in resource group $ResourceGroupName" -ForegroundColor Red
    Write-Host "Please deploy infrastructure first with OpenAI enabled." -ForegroundColor Yellow
    exit 1
}

$accountName = $openAIAccount[0].name
$location = $openAIAccount[0].location

Write-Host "Found OpenAI account: $accountName" -ForegroundColor Green
Write-Host "Location: $location" -ForegroundColor Green
Write-Host ""

# Get endpoint and key
$account = az cognitiveservices account show `
    --resource-group $ResourceGroupName `
    --name $accountName `
    --output json | ConvertFrom-Json

$endpoint = $account.properties.endpoint
$key = (az cognitiveservices account keys list `
    --resource-group $ResourceGroupName `
    --name $accountName `
    --query "key1" `
    --output tsv)

Write-Host "Deploying model: $ModelName..." -ForegroundColor Cyan

# Deploy model using Azure REST API
$headers = @{
    "Content-Type" = "application/json"
    "api-key" = $key
}

$body = @{
    model = $ModelName
    sku = @{
        name = "Standard"
        capacity = 1
    }
} | ConvertTo-Json

$deployUrl = "$endpoint/openai/deployments?api-version=2024-02-15-preview"

try {
    $response = Invoke-RestMethod -Uri $deployUrl -Method Put -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "✅ Model deployed successfully!" -ForegroundColor Green
    Write-Host "Model ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "Status: $($response.status)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Note: Model deployment may take a few minutes to complete." -ForegroundColor Yellow
    Write-Host "You can check status in Azure Portal: Azure OpenAI > Deployments" -ForegroundColor Yellow
}
catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    
    if ($errorDetails.error.code -eq "DeploymentNameTaken") {
        Write-Host "⚠️  Model already deployed or name in use." -ForegroundColor Yellow
        Write-Host "If you need to redeploy, delete the existing deployment first." -ForegroundColor Yellow
    }
    elseif ($errorDetails.error.code -eq "ModelNotFound") {
        Write-Host "❌ Model '$ModelName' not available in this region." -ForegroundColor Red
        Write-Host "Available models may vary by region." -ForegroundColor Yellow
        Write-Host "Try: text-embedding-ada-002 (if text-embedding-3-large not available)" -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ Deployment failed!" -ForegroundColor Red
        Write-Host "Error: $($errorDetails.error.message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Common issues:" -ForegroundColor Yellow
        Write-Host "1. Model may not be available in Australia East region" -ForegroundColor Yellow
        Write-Host "2. Azure OpenAI may require approval/access request" -ForegroundColor Yellow
        Write-Host "3. Check Azure Portal for model availability" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "💡 Tip: You can verify deployment in Azure Portal:" -ForegroundColor Cyan
Write-Host "   Azure OpenAI > $accountName > Deployments" -ForegroundColor White

