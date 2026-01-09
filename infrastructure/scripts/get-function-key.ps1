# Get Azure Function App Master Key
# This script retrieves the master key for the Function App

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "rg-careercraft-dev",
    
    [Parameter(Mandatory=$false)]
    [string]$FunctionAppName = "careercraft-functions-dev"
)

Write-Host "Retrieving Function App master key..." -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroupName" -ForegroundColor Yellow
Write-Host "Function App: $FunctionAppName" -ForegroundColor Yellow
Write-Host ""

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "Azure CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Check if logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in to Azure. Logging in..." -ForegroundColor Yellow
    az login
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-Host "Failed to login to Azure" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host ""

# Get master key using same pattern as get-azure-secrets.ps1
Write-Host "Fetching Function App master key..." -ForegroundColor Cyan
try {
    $key = az functionapp keys list `
        --resource-group $ResourceGroupName `
        --name $FunctionAppName `
        --query "masterKey" -o tsv 2>$null
    
    if ($key -and $key -ne "" -and $key -notmatch "ERROR") {
        Write-Host "Master Key retrieved successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host ("=" * 80) -ForegroundColor Cyan
        Write-Host "FUNCTION KEY" -ForegroundColor Yellow
        Write-Host ("=" * 80) -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Add this to your .env file:" -ForegroundColor Cyan
        Write-Host "VITE_AZURE_FUNCTIONS_KEY=$key" -ForegroundColor White
        Write-Host ""
        
        # Try to update .env file automatically
        $envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
        if (Test-Path $envPath) {
            $envContent = Get-Content $envPath -Raw
            if ($envContent -match "VITE_AZURE_FUNCTIONS_KEY=") {
                $envContent = $envContent -replace "VITE_AZURE_FUNCTIONS_KEY=.*", "VITE_AZURE_FUNCTIONS_KEY=$key"
                Set-Content -Path $envPath -Value $envContent -NoNewline
                Write-Host ".env file updated automatically!" -ForegroundColor Green
            } else {
                Add-Content -Path $envPath -Value "`nVITE_AZURE_FUNCTIONS_KEY=$key"
                Write-Host ".env file updated automatically!" -ForegroundColor Green
            }
        } else {
            Write-Host "Creating .env file..." -ForegroundColor Cyan
            $envContent = @"
# Azure Functions Configuration
VITE_AZURE_FUNCTIONS_URL=https://$FunctionAppName.azurewebsites.net
VITE_AZURE_FUNCTIONS_KEY=$key
"@
            Set-Content -Path $envPath -Value $envContent
            Write-Host ".env file created!" -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "SECURITY REMINDER:" -ForegroundColor Red
        Write-Host "  - Never commit .env file to Git!" -ForegroundColor Yellow
        Write-Host "  - Keep the function key secure" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "Could not retrieve key. The Function App may still be initializing." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Try:" -ForegroundColor Cyan
        Write-Host "  1. Wait 2-3 minutes and run this script again" -ForegroundColor Gray
        Write-Host "  2. Get it from Azure Portal:" -ForegroundColor Gray
        Write-Host "     Portal > Function App > $FunctionAppName > Functions > App keys > master" -ForegroundColor Gray
        Write-Host ""
    }
} catch {
    Write-Host "Error retrieving key: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Get it manually from Azure Portal:" -ForegroundColor Cyan
    Write-Host "  Portal > Function App > $FunctionAppName > Functions > App keys" -ForegroundColor Gray
    Write-Host ""
}

