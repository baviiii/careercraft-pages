# deploy.ps1 - Visual Diff (Before/After)

## 🔴 REMOVED (Lines 44-69)

```powershell
# Build parameters
$paramFile = "parameters/$Environment.bicepparam"
$params = @(
    "--parameters", $paramFile
)

if ($EnableOpenAI) {
    $params += "--parameters", "enableOpenAI=true"
    Write-Host "Azure OpenAI will be enabled (adds ~`$20-50/month)" -ForegroundColor Green
}

# Deploy Bicep template
Write-Host ""
Write-Host "Deploying infrastructure..." -ForegroundColor Cyan
Write-Host "(This may take 5-10 minutes...)" -ForegroundColor Gray

$ErrorActionPreference = "SilentlyContinue"

# Run deployment and capture only JSON output (suppress warnings)
$deploymentJson = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file main.bicep `
    --parameters $paramFile `
    --query "properties.outputs" `
    --output json `
    --only-show-errors
```

---

## 🟢 ADDED (Lines 44-95)

```powershell
# Change to infrastructure/bicep directory for Bicep files
$scriptDir = Split-Path -Parent $PSScriptRoot
$bicepDir = Join-Path $scriptDir "bicep"
Push-Location $bicepDir

try {
    # Build parameters - paths are relative to bicep directory
    $paramFile = "parameters/$Environment.bicepparam"
    $templateFile = "main.bicep"
    
    # Verify files exist
    if (-not (Test-Path $paramFile)) {
        Write-Host "ERROR: Parameter file not found: $paramFile" -ForegroundColor Red
        Write-Host "Expected location: $bicepDir\$paramFile" -ForegroundColor Yellow
        Pop-Location
        exit 1
    }
    
    if (-not (Test-Path $templateFile)) {
        Write-Host "ERROR: Bicep template not found: $templateFile" -ForegroundColor Red
        Write-Host "Expected location: $bicepDir\$templateFile" -ForegroundColor Yellow
        Pop-Location
        exit 1
    }
    
    $params = @(
        "--parameters", $paramFile
    )

    if ($EnableOpenAI) {
        $params += "--parameters", "enableOpenAI=true"
        Write-Host "Azure OpenAI will be enabled (adds ~`$20-50/month)" -ForegroundColor Green
    }

    # Deploy Bicep template
    Write-Host ""
    Write-Host "Deploying infrastructure..." -ForegroundColor Cyan
    Write-Host "(This may take 5-10 minutes...)" -ForegroundColor Gray

    $ErrorActionPreference = "SilentlyContinue"

    # Run deployment and capture only JSON output (suppress warnings)
    $deploymentJson = az deployment group create `
        --resource-group $ResourceGroupName `
        --template-file $templateFile `
        --parameters $paramFile `
        --query "properties.outputs" `
        --output json `
        --only-show-errors
} finally {
    Pop-Location
}
```

---

## 📊 Side-by-Side Comparison

| What Changed | Before ❌ | After ✅ |
|-------------|-----------|----------|
| **Directory** | Runs from `scripts/`<br>Looks for files in `scripts/parameters/` | Changes to `bicep/`<br>Looks for files in `bicep/parameters/` |
| **File Validation** | None - fails at Azure CLI | Checks files exist before deploying |
| **Error Messages** | Generic Azure CLI error | Clear error showing expected file location |
| **Template File** | Hardcoded: `main.bicep` | Variable: `$templateFile` |
| **Error Handling** | No cleanup on error | Try/finally ensures directory restored |
| **Line 44** | `# Build parameters` | `# Change to infrastructure/bicep directory...`<br>+ 3 lines of navigation code |
| **Line 51-67** | *(nothing)* | **NEW:** File validation (14 lines) |
| **Line 88** | `--template-file main.bicep` | `--template-file $templateFile` |
| **Line 93-95** | *(nothing)* | **NEW:** `} finally { Pop-Location }` |

---

## 🔍 Specific Additions

### 1. Directory Navigation (NEW - Lines 44-47)
```powershell
# ADDED:
$scriptDir = Split-Path -Parent $PSScriptRoot
$bicepDir = Join-Path $scriptDir "bicep"
Push-Location $bicepDir
```

### 2. Try Block (NEW - Line 49)
```powershell
# ADDED:
try {
```

### 3. File Validation (NEW - Lines 54-67)
```powershell
# ADDED:
# Verify files exist
if (-not (Test-Path $paramFile)) {
    Write-Host "ERROR: Parameter file not found: $paramFile" -ForegroundColor Red
    Write-Host "Expected location: $bicepDir\$paramFile" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

if (-not (Test-Path $templateFile)) {
    Write-Host "ERROR: Bicep template not found: $templateFile" -ForegroundColor Red
    Write-Host "Expected location: $bicepDir\$templateFile" -ForegroundColor Yellow
    Pop-Location
    exit 1
}
```

### 4. Template Variable (NEW - Line 52)
```powershell
# ADDED:
$templateFile = "main.bicep"
```

### 5. Finally Block (NEW - Lines 93-95)
```powershell
# ADDED:
} finally {
    Pop-Location
}
```

---

## 🔄 What Stayed the Same

These parts were **NOT changed**, just moved inside the try block:
- Parameter building logic
- OpenAI flag handling
- Deployment command structure
- Output parsing
- Success messages

---

## 📈 Statistics

- **Lines Added:** ~28 lines
- **Lines Removed:** ~26 lines
- **Net Change:** +2 lines (mostly comments and validation)
- **New Features:** 3 (directory navigation, file validation, error cleanup)

---

## ✅ Why Each Change Was Made

| Change | Reason |
|--------|--------|
| Directory navigation | Files are in `bicep/` but script runs from `scripts/` |
| File validation | Fail fast with clear errors instead of cryptic Azure CLI errors |
| Template variable | More maintainable, can validate it exists |
| Try/finally | Ensure directory is always restored, even on error |
| Better error messages | Help users understand what went wrong and where files should be |

---

**Total Impact:** Script now correctly finds Bicep files and provides better error handling! ✅
