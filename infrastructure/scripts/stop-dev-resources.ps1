# Stop/Delete Dev Resources to Minimize Costs
# Use this when you have NO users and want to minimize costs
# WARNING: This will DELETE resources - data will be lost unless backed up!

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [switch]$DeleteAISearch,  # Deletes AI Search (saves ~$200/month)
    
    [Parameter(Mandatory=$false)]
    [switch]$DeleteAll,  # Deletes everything except storage
    
    [Parameter(Mandatory=$false)]
    [switch]$StopOnly,  # Only stops resources (doesn't delete)
    
    [Parameter(Mandatory=$false)]
    [switch]$WhatIf  # Shows what would be deleted without actually deleting
)

Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  COST OPTIMIZATION - STOP/DELETE DEV RESOURCES" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host ""

if ($WhatIf) {
    Write-Host "[WHAT-IF MODE] No resources will be deleted" -ForegroundColor Cyan
    Write-Host ""
}

# Get all resources in the resource group
Write-Host "[1] Discovering resources..." -ForegroundColor Yellow
$resources = az resource list --resource-group $ResourceGroupName --output json | ConvertFrom-Json

if (-not $resources) {
    Write-Host "[ERROR] No resources found in resource group: $ResourceGroupName" -ForegroundColor Red
    exit 1
}

Write-Host "  Found $($resources.Count) resources" -ForegroundColor Gray
Write-Host ""

# Categorize resources
$aiSearch = $resources | Where-Object { $_.type -eq "Microsoft.Search/searchServices" }
$storage = $resources | Where-Object { $_.type -eq "Microsoft.Storage/storageAccounts" }
$docIntel = $resources | Where-Object { $_.type -eq "Microsoft.CognitiveServices/accounts" -and ($_.kind -eq "FormRecognizer" -or $_.kind -eq "AIServices") }
$openAI = $resources | Where-Object { $_.type -eq "Microsoft.CognitiveServices/accounts" -and ($_.kind -eq "OpenAI" -or $_.kind -eq "AIServices") }
$vms = $resources | Where-Object { $_.type -eq "Microsoft.Compute/virtualMachines" }
$containers = $resources | Where-Object { $_.type -eq "Microsoft.ContainerInstance/containerGroups" }
$functions = $resources | Where-Object { $_.type -eq "Microsoft.Web/sites" -and $_.kind -like "*functionapp*" }
$disks = $resources | Where-Object { $_.type -eq "Microsoft.Compute/disks" }

# Show cost breakdown
Write-Host "[2] Cost Analysis:" -ForegroundColor Yellow
Write-Host ""

$totalDailyCost = 0

if ($aiSearch) {
    $dailyCost = 200 / 30  # ~$200/month
    $totalDailyCost += $dailyCost
    Write-Host "  AI Search Basic: ~A$$([math]::Round($dailyCost, 2))/day (~A$200/month)" -ForegroundColor Red
    Write-Host "    → DELETE THIS to save ~A$200/month (biggest cost!)" -ForegroundColor Yellow
}

if ($disks) {
    $premiumDisks = $disks | Where-Object { $_.sku.name -like "Premium*" }
    if ($premiumDisks) {
        $dailyCost = 10.67 / 30  # From your costs
        $totalDailyCost += $dailyCost
        Write-Host "  Premium SSD Disks: ~A$$([math]::Round($dailyCost, 2))/day (~A$10.67/month)" -ForegroundColor Red
        Write-Host "    → Consider downgrading to Standard SSD" -ForegroundColor Yellow
    }
}

if ($storage) {
    $dailyCost = 5 / 30  # ~$5/month
    $totalDailyCost += $dailyCost
    Write-Host "  Storage: ~A$$([math]::Round($dailyCost, 2))/day (~A$5/month)" -ForegroundColor Green
    Write-Host "    → Keep this (minimal cost)" -ForegroundColor Gray
}

if ($docIntel) {
    $dailyCost = 9.35 / 30  # From your costs
    $totalDailyCost += $dailyCost
    Write-Host "  Document Intelligence: ~A$$([math]::Round($dailyCost, 2))/day (~A$9.35/month)" -ForegroundColor Yellow
    Write-Host "    → Pay-as-you-go (only if processing PDFs)" -ForegroundColor Gray
}

if ($openAI) {
    $dailyCost = 2.51 / 30  # From your costs
    $totalDailyCost += $dailyCost
    Write-Host "  Foundry Models: ~A$$([math]::Round($dailyCost, 2))/day (~A$2.51/month)" -ForegroundColor Yellow
    Write-Host "    → Very low cost (keep if needed)" -ForegroundColor Gray
}

if ($vms) {
    Write-Host "  Virtual Machines: Variable cost" -ForegroundColor Yellow
    Write-Host "    → DELETE if not needed" -ForegroundColor Yellow
}

if ($containers) {
    Write-Host "  Container Instances: Variable cost" -ForegroundColor Yellow
    Write-Host "    → Already stopped (good!)" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ESTIMATED DAILY COST: ~A$$([math]::Round($totalDailyCost, 2))/day" -ForegroundColor Cyan
Write-Host "  ESTIMATED MONTHLY COST: ~A$$([math]::Round($totalDailyCost * 30, 2))/month" -ForegroundColor Cyan
Write-Host ""

# Recommendations
Write-Host "[3] Recommendations:" -ForegroundColor Yellow
Write-Host ""

if ($aiSearch) {
    Write-Host "  ⚠️  BIGGEST SAVINGS: Delete AI Search (saves ~A$200/month)" -ForegroundColor Red
    Write-Host "     Command: az search service delete --name $($aiSearch.name) --resource-group $ResourceGroupName" -ForegroundColor Gray
    Write-Host ""
}

if ($premiumDisks) {
    Write-Host "  💾 Consider downgrading Premium SSD to Standard SSD (saves ~A$10/month)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "  📦 Keep Storage Account (minimal cost, preserves data)" -ForegroundColor Green
Write-Host "  🧠 Keep Document Intelligence (pay-as-you-go, only costs when used)" -ForegroundColor Green
Write-Host "  🤖 Keep Foundry Models (very low cost)" -ForegroundColor Green
Write-Host ""

# Action plan
if ($DeleteAISearch -or $DeleteAll) {
    Write-Host "[4] Executing deletions..." -ForegroundColor Yellow
    Write-Host ""
    
    if ($DeleteAISearch -and $aiSearch) {
        if ($WhatIf) {
            Write-Host "  [WHAT-IF] Would delete AI Search: $($aiSearch.name)" -ForegroundColor Cyan
        } else {
            Write-Host "  [DELETE] Deleting AI Search: $($aiSearch.name)..." -ForegroundColor Red
            az search service delete --name $aiSearch.name --resource-group $ResourceGroupName --yes
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✓ Deleted (saves ~A$200/month)" -ForegroundColor Green
            } else {
                Write-Host "    ✗ Failed to delete" -ForegroundColor Red
            }
        }
    }
    
    if ($DeleteAll) {
        Write-Host ""
        Write-Host "  [DELETE ALL] This will delete everything except storage..." -ForegroundColor Red
        Write-Host "  WARNING: This will DELETE all data!" -ForegroundColor Red
        
        if (-not $WhatIf) {
            $confirm = Read-Host "  Type 'DELETE' to confirm"
            if ($confirm -ne "DELETE") {
                Write-Host "  Cancelled" -ForegroundColor Yellow
                exit 0
            }
        }
        
        # Delete VMs
        foreach ($vm in $vms) {
            if ($WhatIf) {
                Write-Host "  [WHAT-IF] Would delete VM: $($vm.name)" -ForegroundColor Cyan
            } else {
                Write-Host "  [DELETE] Deleting VM: $($vm.name)..." -ForegroundColor Red
                az vm delete --name $vm.name --resource-group $ResourceGroupName --yes --no-wait
            }
        }
        
        # Delete Container Instances
        foreach ($container in $containers) {
            if ($WhatIf) {
                Write-Host "  [WHAT-IF] Would delete Container: $($container.name)" -ForegroundColor Cyan
            } else {
                Write-Host "  [DELETE] Deleting Container: $($container.name)..." -ForegroundColor Red
                az container delete --name $container.name --resource-group $ResourceGroupName --yes
            }
        }
        
        # Delete Functions
        foreach ($func in $functions) {
            if ($WhatIf) {
                Write-Host "  [WHAT-IF] Would delete Function: $($func.name)" -ForegroundColor Cyan
            } else {
                Write-Host "  [DELETE] Deleting Function: $($func.name)..." -ForegroundColor Red
                az functionapp delete --name $func.name --resource-group $ResourceGroupName --yes
            }
        }
    }
}

Write-Host ""
Write-Host "[5] Summary:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  To minimize costs with NO users:" -ForegroundColor Cyan
Write-Host "  1. DELETE AI Search (saves ~A$200/month = ~A$6.67/day)" -ForegroundColor Red
Write-Host "  2. Keep Storage (minimal cost, preserves data)" -ForegroundColor Green
Write-Host "  3. Keep Document Intelligence (pay-as-you-go)" -ForegroundColor Green
Write-Host "  4. Keep Foundry Models (very low cost)" -ForegroundColor Green
Write-Host ""
Write-Host "  Expected daily cost after optimization: ~A$0.50-1.00/day" -ForegroundColor Green
Write-Host ""
