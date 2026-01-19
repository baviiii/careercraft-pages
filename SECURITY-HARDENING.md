# Security Hardening Guide

**Comprehensive security hardening documentation for HORUS Intelligence platform**

**Status:** ⚠️ **CRITICAL SECURITY ISSUES IDENTIFIED**  
**Priority:** **HIGH** - Immediate action required

---

## Table of Contents

1. [Critical Security Issues](#critical-security-issues)
2. [Azure Functions Authentication](#azure-functions-authentication)
3. [Azure Key Vault Migration](#azure-key-vault-migration)
4. [Supabase CORS Configuration](#supabase-cors-configuration)
5. [Supabase Edge Functions JWT Verification](#supabase-edge-functions-jwt-verification)
6. [Additional Security Hardening](#additional-security-hardening)
7. [Implementation Priority](#implementation-priority)

---

## Critical Security Issues

### 🔴 **CRITICAL - Immediate Action Required**

1. **Azure Functions are Anonymous**
   - All Azure Functions currently have `authLevel: "anonymous"`
   - **Risk:** Anyone can call your functions without authentication
   - **Impact:** Unauthorized access, potential DDoS, cost abuse

2. **Azure Keys Stored in Plain Text**
   - Keys stored in Azure resources directly (Storage, Search, OpenAI, etc.)
   - **Risk:** Keys visible in Azure Portal, no rotation, no audit trail
   - **Impact:** Key exposure, compliance violations

3. **Supabase CORS Allows All Origins**
   - All Edge Functions use `'Access-Control-Allow-Origin': '*'`
   - **Risk:** Any website can call your API
   - **Impact:** CSRF attacks, data theft

4. **Supabase Edge Functions JWT Verification Disabled**
   - Multiple functions have `verify_jwt = false`
   - **Risk:** Unauthenticated API access
   - **Impact:** Unauthorized data access

---

## Azure Functions Authentication

### Current Status

**All Azure Functions are anonymous:**
- `pdf-upload/function.json` - `authLevel: "anonymous"`
- `rag-metadata/function.json` - `authLevel: "anonymous"`
- `entity-extraction/function.json` - `authLevel: "anonymous"`
- `graph-query/function.json` - `authLevel: "anonymous"`
- `agentic-planner/function.json` - `authLevel: "anonymous"`
- `intersection-reasoning/function.json` - `authLevel: "anonymous"`

### Solution: Enable Function-Level Authentication

**Option 1: Function-Level Keys (Recommended for APIs)**

Change `authLevel` from `"anonymous"` to `"function"`:

```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post", "options"]
    }
  ]
}
```

**How it works:**
- Functions require a function key or host key in the URL
- Format: `https://<function-app>.azurewebsites.net/api/<function-name>?code=<function-key>`
- Keys are managed in Azure Portal: Function App → Functions → <function-name> → Function Keys

**Implementation Steps:**

1. **Update function.json files:**

```powershell
# For each function, change authLevel to "function"
cd azure-functions
# Edit each function.json file:
# - pdf-upload/function.json
# - rag-metadata/function.json
# - entity-extraction/function.json
# - graph-query/function.json
# - agentic-planner/function.json
# - intersection-reasoning/function.json
```

2. **Update frontend to include function key:**

```typescript
// src/lib/azureFunctions.ts
const FUNCTION_KEY = import.meta.env.VITE_AZURE_FUNCTIONS_KEY;

export async function callAzureFunction(functionName: string, body: any) {
  const url = `${AZURE_FUNCTIONS_URL}/api/${functionName}?code=${FUNCTION_KEY}`;
  // ... rest of code
}
```

3. **Add function key to environment variables:**

```env
# .env
VITE_AZURE_FUNCTIONS_KEY=<your-function-key>
```

4. **Get function keys (after deployment):**

```powershell
# Get default host key (works for all functions)
az functionapp keys list --name <function-app-name> --resource-group <resource-group> --query "functionKeys.default" -o tsv

# Or get function-specific key
az functionapp function keys list --name <function-app-name> --resource-group <resource-group> --function-name <function-name>
```

**Option 2: Azure AD Authentication (Best for Production)**

For production, use Azure AD authentication:

1. Enable Authentication in Function App:
   - Azure Portal → Function App → Authentication
   - Enable Authentication
   - Choose Azure AD provider
   - Configure app registration

2. Change authLevel to `"anonymous"` (Azure handles auth at app level)

3. Update code to validate JWT tokens from Azure AD

**Recommendation:** Start with Function-Level Keys, migrate to Azure AD for production.

---

## Azure Key Vault Migration

### Current Status

**Keys are stored directly in Azure resources:**
- Storage Account Keys (visible in Portal → Keys)
- Cognitive Services Keys (Azure OpenAI, Document Intelligence)
- Search Service Admin Keys
- Connection Strings in Automation Account Variables

**Problems:**
- Keys visible in Azure Portal
- No automatic rotation
- No audit logging
- Hard to manage multiple environments
- Keys stored in environment variables (Supabase)

### Solution: Azure Key Vault

**Step 1: Create Key Vault**

```powershell
# Create Key Vault
az keyvault create \
  --name <keyvault-name> \
  --resource-group <resource-group> \
  --location australiaeast \
  --sku standard \
  --enable-rbac-authorization true

# Example:
az keyvault create \
  --name horus-kv-dev \
  --resource-group rg-careercraft-dev \
  --location australiaeast \
  --sku standard \
  --enable-rbac-authorization true
```

**Step 2: Add Secrets to Key Vault**

```powershell
# Get current keys
$searchKey = az search admin-key show --resource-group rg-careercraft-dev --service-name careercraft-search-dev --query primaryKey -o tsv
$openAIKey = az cognitiveservices account keys list --name careercraft-openai-dev --resource-group rg-careercraft-dev --query key1 -o tsv
$docIntelKey = az cognitiveservices account keys list --name careercraft-docintel-dev --resource-group rg-careercraft-dev --query key1 -o tsv
$storageKey = (az storage account keys list --account-name <storage-name> --resource-group rg-careercraft-dev)[0].value

# Add to Key Vault (requires Key Vault Secrets Officer role)
az keyvault secret set --vault-name horus-kv-dev --name "AzureSearch-Key" --value $searchKey
az keyvault secret set --vault-name horus-kv-dev --name "AzureOpenAI-Key" --value $openAIKey
az keyvault secret set --vault-name horus-kv-dev --name "AzureDocIntel-Key" --value $docIntelKey
az keyvault secret set --vault-name horus-kv-dev --name "AzureStorage-Key" --value $storageKey
```

**Step 3: Configure Managed Identity**

```powershell
# Enable system-assigned managed identity for Function App
az functionapp identity assign \
  --name <function-app-name> \
  --resource-group <resource-group>

# Enable system-assigned managed identity for Automation Account
az automation account identity assign \
  --name <automation-account-name> \
  --resource-group <resource-group>

# Grant Key Vault access (Key Vault Secrets User role)
$functionAppId = az functionapp identity show --name <function-app-name> --resource-group <resource-group> --query principalId -o tsv
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $functionAppId \
  --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.KeyVault/vaults/<keyvault-name>

$automationId = az automation account identity show --name <automation-account-name> --resource-group <resource-group> --query principalId -o tsv
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $automationId \
  --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.KeyVault/vaults/<keyvault-name>
```

**Step 4: Update Function Code to Use Key Vault**

```javascript
// azure-functions/rag-metadata/index.js
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const credential = new DefaultAzureCredential();
const keyVaultUrl = process.env.KEY_VAULT_URL; // https://horus-kv-dev.vault.azure.net/
const client = new SecretClient(keyVaultUrl, credential);

async function getSecret(secretName) {
  const secret = await client.getSecret(secretName);
  return secret.value;
}

module.exports = async function (context, req) {
  // Get secrets from Key Vault
  const searchKey = await getSecret("AzureSearch-Key");
  const openAIKey = await getSecret("AzureOpenAI-Key");
  // ... use keys
};
```

**Step 5: Update Automation Account to Use Key Vault**

For Automation Account, you need to:
1. Store Key Vault URL in Automation Variables
2. Use PowerShell cmdlets to retrieve secrets:

```powershell
# In runbook, use Managed Identity
$vaultName = "horus-kv-dev"
$secretName = "AzureSearch-Key"

# Use Managed Identity to get secret
$secret = Get-AzKeyVaultSecret -VaultName $vaultName -Name $secretName
$key = (Get-AzKeyVaultSecret -VaultName $vaultName -Name $secretName -AsPlainText).SecretValueText
```

**Step 6: Update Supabase Edge Functions**

Supabase Edge Functions cannot use Azure Key Vault directly. Options:

**Option A: Use Supabase Vault (Recommended)**
- Supabase has built-in secrets management
- Secrets are encrypted at rest
- Better than environment variables
- Still need to manually rotate keys

**Option B: Proxy Through Azure Function**
- Create an Azure Function that retrieves secrets from Key Vault
- Supabase Edge Function calls Azure Function (authenticated)
- Azure Function returns secrets
- More complex but centralized

**Recommended:** Use Supabase Vault for Edge Functions, Key Vault for Azure Functions.

---

## Supabase CORS Configuration

### Current Status

**All Edge Functions use wildcard CORS:**

```typescript
// supabase/functions/*/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Problems:**
- Any website can call your API
- CSRF attacks possible
- No origin validation

### Solution: Restrict CORS to Specific Origins

**Step 1: Create Environment Variable for Allowed Origins**

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Step 2: Update CORS Headers in Functions**

```typescript
// supabase/functions/rag-query/index.ts
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [];
const origin = req.headers.get('origin') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate origin
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response(
      JSON.stringify({ error: 'Origin not allowed' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ... rest of code
});
```

**Step 3: Update All Edge Functions**

Update CORS in these functions:
- `rag-query/index.ts`
- `rag-chat/index.ts`
- `rag-tag-documents/index.ts`
- `parse-resume/index.ts`
- `ats-analyze/index.ts`
- `interview-ai/index.ts`
- `job-news/index.ts`
- `rewrite-resume/index.ts`
- `track-session/index.ts`
- `generate-prompt/index.ts`
- `rag-extract-insights/index.ts`

**For Local Development:**

```typescript
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
```

---

## Supabase Edge Functions JWT Verification

### Current Status

**Multiple functions have JWT verification disabled:**

```toml
# supabase/config.toml
[functions.rewrite-resume]
verify_jwt = false

[functions.ats-analyze]
verify_jwt = false

[functions.interview-ai]
verify_jwt = false

[functions.job-news]
verify_jwt = false

[functions.track-session]
verify_jwt = false

[functions.generate-prompt]
verify_jwt = false
```

**Problems:**
- Functions can be called without authentication
- No user context
- No rate limiting per user
- Security risk

### Solution: Enable JWT Verification

**Step 1: Enable JWT Verification in config.toml**

```toml
# supabase/config.toml
[functions.rewrite-resume]
verify_jwt = true

[functions.ats-analyze]
verify_jwt = true

[functions.interview-ai]
verify_jwt = true

[functions.job-news]
verify_jwt = true

[functions.track-session]
verify_jwt = true

[functions.generate-prompt]
verify_jwt = true
```

**Step 2: Update Function Code to Handle JWT**

```typescript
// supabase/functions/rag-query/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Get JWT from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Create Supabase client with user's JWT
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } }
    }
  );

  // Verify user is authenticated
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Use user.id for user-specific operations
  // ... rest of code
});
```

**Note:** With `verify_jwt = true`, Supabase automatically validates JWT, but you still need to create the client with the Authorization header to access user context.

**For Public Functions (if needed):**

If a function truly needs to be public (e.g., public job listings), keep `verify_jwt = false` but add rate limiting and IP restrictions.

---

## Additional Security Hardening

### 1. Enable Azure Function App Authentication

**Add Azure AD Authentication at Function App Level:**

```powershell
# Enable Authentication for Function App
az functionapp auth update \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --enabled true \
  --action LoginWithAzureActiveDirectory \
  --aad-allowed-token-audiences https://<function-app-name>.azurewebsites.net/.default
```

### 2. Enable HTTPS Only

**Function App:**
```powershell
az functionapp update \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --https-only true
```

**Storage Account:**
```powershell
az storage account update \
  --name <storage-account-name> \
  --resource-group <resource-group> \
  --https-only true
```

### 3. Enable Azure Security Center Recommendations

```powershell
# Enable Defender for Cloud
az security pricing create \
  --name "VirtualMachines" \
  --tier "Standard" \
  --subscription <subscription-id>
```

### 4. Implement Rate Limiting

**Already implemented in frontend** (`src/lib/security/rateLimiter.ts`), but should also be implemented:
- At Azure Functions level (Azure API Management)
- At Supabase Edge Functions level (Supabase has built-in rate limiting)

### 5. Enable Audit Logging

**Azure Key Vault:**
- Audit logging is enabled by default
- View logs: Azure Portal → Key Vault → Monitoring → Logs

**Azure Functions:**
- Enable Application Insights
- Enable Diagnostic Settings

**Supabase:**
- Enable Audit Logs (PostgreSQL audit extension)
- Enable Database Logging

### 6. Implement Secret Rotation

**Azure Key Vault:**
- Set expiration dates on secrets
- Use Azure Key Vault rotation policies
- Rotate keys every 90 days

**Manual Rotation Process:**
1. Generate new key in Azure
2. Add new key to Key Vault with new version
3. Update applications to use new key
4. Verify functionality
5. Disable old key version

### 7. Network Security

**Azure Functions:**
- Use Private Endpoints (premium plan)
- Use VNet Integration
- Restrict inbound IP addresses

**Storage Account:**
- Enable Private Endpoints
- Restrict access to specific VNets
- Disable public access

### 8. Enable Multi-Factor Authentication

**Azure AD:**
- Require MFA for all admin accounts
- Enable Conditional Access policies

### 9. Database Security (Supabase)**

**Row Level Security (RLS):**
- Ensure RLS policies are enabled on sensitive tables
- Review and test RLS policies

**Connection Pooling:**
- Use Supabase connection pooler
- Configure connection limits

### 10. Environment Variable Security

**Never commit secrets:**
- ✅ `.env` is in `.gitignore`
- Add `.env.local`, `.env.*.local` to `.gitignore` (already done)

**Use different keys for different environments:**
- Dev keys: `rg-careercraft-dev`
- Prod keys: `rg-careercraft-prod` (separate Key Vault)

---

## Implementation Priority

### 🔴 **PRIORITY 1 - Critical (Do First)**

1. **Azure Functions Authentication** ⏱️ 2-3 hours
   - Change `authLevel` to `"function"`
   - Add function keys to environment variables
   - Update frontend code
   - Test thoroughly

2. **Supabase CORS Restriction** ⏱️ 1-2 hours
   - Add `ALLOWED_ORIGINS` environment variable
   - Update all Edge Functions
   - Test CORS behavior

### 🟡 **PRIORITY 2 - High (Do Next)**

3. **Supabase JWT Verification** ⏱️ 2-3 hours
   - Enable `verify_jwt = true` in config.toml
   - Update function code to handle JWT
   - Test authentication flows

4. **Azure Key Vault Setup** ⏱️ 4-6 hours
   - Create Key Vault
   - Migrate secrets
   - Configure Managed Identity
   - Update Function code
   - Update Automation Account

### 🟡 **PRIORITY 2 - High (Do Next)** (continued)

5. **Input Validation in Backend Functions** ⏱️ 1-2 days
   - Add input validation to all Azure Functions
   - Add input validation to all Supabase Edge Functions
   - Validate query length, sanitize special characters
   - Block malicious patterns

6. **SQL/Gremlin Injection Protection** ⏱️ 1 day
   - Use parameterized queries for graph databases
   - Escape user input in Azure Search queries
   - Test for injection vulnerabilities

7. **Rate Limiting in Backend** ⏱️ 2-3 days
   - Implement rate limiting in Azure Functions
   - Implement rate limiting in Supabase Edge Functions
   - Use Redis or database for rate limit storage
   - Set appropriate limits (e.g., 100 requests/hour)

8. **File Upload Security Enhancements** ⏱️ 2-3 days
   - Add virus scanning (Azure Defender or third-party)
   - Enhanced PDF header validation
   - Content-based file type verification
   - Size limits enforcement

9. **Comprehensive Audit Logging** ⏱️ 2-3 days
   - Add audit logging to all backend functions
   - Centralized log aggregation (Application Insights/Log Analytics)
   - Suspicious activity detection
   - Database schema for audit logs

### 🟢 **PRIORITY 3 - Medium (Do Later)**

10. **Error Handling** ⏱️ 1 day
    - Secure error handling (no stack traces to clients)
    - Generic error messages for users
    - Detailed error logs server-side

11. **Additional Hardening** ⏱️ Ongoing
    - Enable HTTPS only
    - Implement secret rotation
    - Network security improvements
    - Role-based access control (RBAC)

---

## Testing Checklist

After implementing each change:

### Authentication & Authorization
- [ ] Azure Functions require authentication
- [ ] Supabase CORS only allows approved origins
- [ ] Supabase Edge Functions require JWT
- [ ] Keys are stored in Key Vault (not in Portal)
- [ ] Managed Identity works for Key Vault access
- [ ] All functions work with new authentication
- [ ] Frontend can still call APIs

### Input Validation & Injection Protection
- [ ] Input validation rejects invalid queries
- [ ] Query length limits enforced
- [ ] Malicious patterns blocked
- [ ] Parameterized queries used (no string concatenation)
- [ ] Graph database queries are safe from injection
- [ ] Azure Search queries are escaped properly

### Rate Limiting
- [ ] Rate limiting enforced in backend functions
- [ ] Rate limits appropriate (e.g., 100 requests/hour)
- [ ] Rate limit headers returned correctly
- [ ] Rate limit bypass attempts blocked
- [ ] Rate limits reset correctly

### File Upload Security
- [ ] File type validation works
- [ ] Size limits enforced
- [ ] PDF headers validated
- [ ] Virus scanning implemented (if applicable)
- [ ] Invalid files rejected appropriately

### Audit Logging
- [ ] All function calls logged
- [ ] User ID tracked in logs
- [ ] IP address and user agent logged
- [ ] Errors logged with details
- [ ] Suspicious activity detected
- [ ] Logs queryable and searchable

### Error Handling
- [ ] Generic error messages to users
- [ ] No stack traces exposed to clients
- [ ] Detailed errors logged server-side
- [ ] Error responses are consistent

### General
- [ ] No errors in logs
- [ ] Performance is acceptable
- [ ] All functionality works as expected
- [ ] Security measures don't break existing features

---

## Enterprise-Grade Security Polish

### Overview

While the frontend has good security measures, **backend functions (Azure Functions and Supabase Edge Functions) need additional hardening** to meet enterprise-grade security standards.

### 🔴 **Critical Missing Security Measures**

#### 1. Input Validation in Backend Functions

**Current Status:**
- ✅ Frontend has validation (`src/lib/security/schemas.ts`, `sanitizers.ts`)
- ❌ Backend functions have minimal/no input validation
- ❌ No query length limits
- ❌ No special character sanitization
- ❌ No malicious pattern detection

**Risks:**
- Long queries can cause DoS attacks
- Special characters can break queries
- Malicious patterns can exploit vulnerabilities

**Solution: Add Input Validation to Backend Functions**

**For Azure Functions:**
```javascript
// azure-functions/rag-metadata/index.js
function validateInput(query, options = {}) {
  const errors = [];
  
  // 1. Query length validation
  if (!query || typeof query !== 'string') {
    errors.push('Query is required and must be a string');
  } else if (query.length < 1) {
    errors.push('Query cannot be empty');
  } else if (query.length > 1000) { // Max 1000 characters
    errors.push('Query exceeds maximum length of 1000 characters');
  }
  
  // 2. Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,           // XSS
    /javascript:/i,       // XSS
    /on\w+\s*=/i,        // Event handlers
    /--/,                // SQL comment
    /\/\*.*\*\//,        // SQL comment
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i, // SQL injection
    /union\s+select/i,   // SQL injection
    /0x[0-9a-f]+/i,      // Hex encoded
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      errors.push('Query contains potentially dangerous content');
      break;
    }
  }
  
  // 3. Sanitize special characters (if needed)
  // Note: For queries, sanitization might break legitimate searches
  // Better to validate and reject rather than sanitize
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized: query.trim().slice(0, 1000) // Truncate if needed
  };
}

module.exports = async function (context, req) {
  // Validate input
  const validation = validateInput(req.body?.query);
  if (!validation.isValid) {
    context.res = {
      status: 400,
      body: { error: 'Invalid input', details: validation.errors }
    };
    return;
  }
  
  // Use validated input
  const query = validation.sanitized;
  // ... rest of code
};
```

**For Supabase Edge Functions:**
```typescript
// supabase/functions/rag-query/index.ts
function validateQuery(query: string): { valid: boolean; error?: string } {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query is required' };
  }
  
  if (query.length < 1 || query.length > 1000) {
    return { valid: false, error: 'Query must be between 1 and 1000 characters' };
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /--/,
    /\/\*.*\*\//,
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP)/i,
    /union\s+select/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      return { valid: false, error: 'Query contains potentially dangerous content' };
    }
  }
  
  return { valid: true };
}

serve(async (req) => {
  const request: RAGRequest = await req.json();
  const { query } = request;
  
  // Validate query
  const validation = validateQuery(query);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
  
  // ... rest of code
});
```

**Implementation Priority:** High - Should be added to all functions that accept user input

---

#### 2. SQL/Gremlin Injection Protection

**Current Status:**
- ✅ Frontend has SQL injection prevention (`src/lib/security/sanitizers.ts`)
- ❌ Graph database queries may be vulnerable
- ❌ No parameterized queries for Gremlin/Cypher

**Risks:**
- Code injection in graph database queries
- Unauthorized data access
- Database manipulation

**Solution: Use Parameterized Queries**

**For Gremlin Queries (Azure Cosmos DB):**
```javascript
// ❌ BAD (Vulnerable to injection)
const query = `g.V().has('name', '${userInput}')`;

// ✅ GOOD (Use parameterized queries)
const { GremlinClient } = require('gremlin');
const client = new GremlinClient(endpoint, {
  username: '/dbs/database/colls/collection',
  password: key
});

// Parameterized query
const result = await client.submit('g.V().has("name", p)', { p: userInput });
```

**For Cypher Queries (Neo4j):**
```javascript
// ❌ BAD
const query = `MATCH (n) WHERE n.name = '${userInput}' RETURN n`;

// ✅ GOOD (Parameterized)
const session = driver.session();
const result = await session.run(
  'MATCH (n) WHERE n.name = $name RETURN n',
  { name: userInput }
);
```

**For Azure AI Search:**
```javascript
// ❌ BAD (String concatenation)
const filter = `category eq '${userInput}'`;

// ✅ GOOD (Parameterized/escaped)
function escapeSearchFilter(value) {
  // Escape single quotes
  return value.replace(/'/g, "''");
}
const escaped = escapeSearchFilter(userInput);
const filter = `category eq '${escaped}'`;

// ✅ BETTER (Use OData filter library)
const { odata } = require('@azure/data-tables');
const filter = odata`category eq ${userInput}`;
```

**Implementation Priority:** Critical - Must fix immediately if graph queries exist

---

#### 3. Authentication & Authorization

**Current Status:**
- ✅ Covered in [Azure Functions Authentication](#azure-functions-authentication) section
- ✅ Covered in [Supabase JWT Verification](#supabase-edge-functions-jwt-verification) section
- ❌ Role-based access control not implemented
- ❌ API key validation needs improvement

**Additional Recommendations:**

**Implement Role-Based Access Control (RBAC):**
```javascript
// azure-functions/rag-metadata/index.js
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer'
};

function checkPermission(userRole, requiredRole) {
  const roleHierarchy = {
    [ROLES.ADMIN]: [ROLES.ADMIN, ROLES.USER, ROLES.VIEWER],
    [ROLES.USER]: [ROLES.USER, ROLES.VIEWER],
    [ROLES.VIEWER]: [ROLES.VIEWER]
  };
  
  return roleHierarchy[userRole]?.includes(requiredRole) || false;
}

module.exports = async function (context, req) {
  // Get user role from JWT token or database
  const userRole = req.user?.role || ROLES.VIEWER;
  
  // Check permission
  if (!checkPermission(userRole, ROLES.USER)) {
    context.res = {
      status: 403,
      body: { error: 'Insufficient permissions' }
    };
    return;
  }
  
  // ... rest of code
};
```

**Implementation Priority:** Medium - Enhance existing authentication

---

#### 4. Rate Limiting in Backend

**Current Status:**
- ✅ Frontend has rate limiting (`src/lib/security/rateLimiter.ts`)
- ❌ Backend functions have no rate limiting
- ❌ Expensive GPT-4 calls can be spammed

**Risks:**
- DoS attacks
- Cost abuse (expensive AI calls)
- Resource exhaustion

**Solution: Implement Backend Rate Limiting**

**For Azure Functions (using Azure Redis Cache or Application Insights):**
```javascript
// azure-functions/rag-metadata/index.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_CONNECTION_STRING);

async function checkRateLimit(userId, limit = 100, windowMinutes = 60) {
  const key = `ratelimit:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowMinutes * 60);
  }
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    reset: await redis.ttl(key)
  };
}

module.exports = async function (context, req) {
  const userId = req.headers['x-user-id'] || 'anonymous';
  
  // Check rate limit
  const rateLimit = await checkRateLimit(userId, 100, 60); // 100 requests per hour
  if (!rateLimit.allowed) {
    context.res = {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimit.reset.toString(),
        'Retry-After': rateLimit.reset.toString()
      },
      body: { error: 'Rate limit exceeded', retryAfter: rateLimit.reset }
    };
    return;
  }
  
  // ... rest of code
};
```

**For Supabase Edge Functions (using Supabase Postgres):**
```typescript
// supabase/functions/rag-query/index.ts
async function checkRateLimit(userId: string, limit = 100, windowMinutes = 60): Promise<{
  allowed: boolean;
  remaining: number;
  reset: number;
}> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_limit: limit,
    p_window_minutes: windowMinutes
  });
  
  if (error) {
    // If rate limit check fails, allow request (fail open)
    return { allowed: true, remaining: limit, reset: windowMinutes * 60 };
  }
  
  return data;
}

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  const userId = authHeader ? await getUserIdFromToken(authHeader) : 'anonymous';
  
  // Check rate limit
  const rateLimit = await checkRateLimit(userId, 100, 60);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rateLimit.reset }),
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.reset.toString(),
          'Retry-After': rateLimit.reset.toString(),
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
  
  // ... rest of code
});
```

**Database Function (Supabase):**
```sql
-- supabase/migrations/xxxxx_rate_limiting.sql
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_ttl INTEGER;
BEGIN
  -- Get count from last window
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_logs
  WHERE user_id = p_user_id
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Insert log entry
  INSERT INTO rate_limit_logs (user_id, created_at)
  VALUES (p_user_id, NOW())
  ON CONFLICT DO NOTHING;
  
  -- Clean up old entries
  DELETE FROM rate_limit_logs
  WHERE created_at < NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Calculate TTL
  SELECT EXTRACT(EPOCH FROM (NOW() - (SELECT MIN(created_at) FROM rate_limit_logs WHERE user_id = p_user_id)))::INTEGER
  INTO v_ttl;
  
  RETURN json_build_object(
    'allowed', v_count < p_limit,
    'remaining', GREATEST(0, p_limit - v_count),
    'reset', COALESCE(v_ttl, p_window_minutes * 60)
  );
END;
$$;
```

**Implementation Priority:** High - Prevents cost abuse and DoS attacks

---

#### 5. File Upload Security

**Current Status:**
- ✅ Frontend has file validation (`src/lib/security/fileUpload.ts`)
- ✅ File type validation exists
- ✅ Size limits exist (10-20MB)
- ❌ No virus scanning
- ❌ PDF header validation could be improved
- ❌ No content-based file type verification

**Risks:**
- Malware uploads
- Malicious PDFs (PDF-based exploits)
- File type spoofing

**Solution: Enhanced File Upload Security**

**Add Virus Scanning (Azure Functions):**
```javascript
// azure-functions/pdf-upload/index.js
const { VirusScanClient } = require('@azure/storage-blob');

async function scanFile(fileBuffer) {
  // Option 1: Use Azure Defender for Storage (built-in)
  // Enable in Storage Account → Security → Advanced Threat Protection
  
  // Option 2: Use third-party virus scanning service
  const scanService = process.env.VIRUS_SCAN_ENDPOINT;
  if (scanService) {
    const response = await fetch(scanService, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: fileBuffer
    });
    
    const result = await response.json();
    return result.isClean;
  }
  
  // Option 3: Basic validation (check file signatures)
  return validateFileSignature(fileBuffer);
}

function validateFileSignature(fileBuffer) {
  // Check PDF magic bytes
  if (fileBuffer[0] === 0x25 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x44 && fileBuffer[3] === 0x46) {
    return true; // PDF signature
  }
  
  // Add more file type signatures as needed
  return false;
}

module.exports = async function (context, req) {
  const fileBuffer = req.body;
  
  // 1. Check file size
  if (fileBuffer.length > 10 * 1024 * 1024) { // 10MB max
    context.res = { status: 400, body: { error: 'File too large' } };
    return;
  }
  
  // 2. Validate file signature
  if (!validateFileSignature(fileBuffer)) {
    context.res = { status: 400, body: { error: 'Invalid file type' } };
    return;
  }
  
  // 3. Scan for viruses
  const isClean = await scanFile(fileBuffer);
  if (!isClean) {
    context.res = { status: 400, body: { error: 'File failed security scan' } };
    return;
  }
  
  // ... rest of code
};
```

**Enhanced PDF Validation:**
```javascript
function validatePDFHeaders(fileBuffer) {
  // Check PDF header
  const header = fileBuffer.slice(0, 4).toString('ascii');
  if (header !== '%PDF') {
    return { valid: false, error: 'Invalid PDF header' };
  }
  
  // Check PDF version (should be 1.4 or higher)
  const versionMatch = fileBuffer.toString('ascii', 0, 1024).match(/%PDF-(\d)\.(\d)/);
  if (versionMatch) {
    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);
    if (major < 1 || (major === 1 && minor < 4)) {
      return { valid: false, error: 'PDF version too old' };
    }
  }
  
  // Check for PDF footer
  const footer = fileBuffer.slice(-1024).toString('ascii');
  if (!footer.includes('%%EOF')) {
    return { valid: false, error: 'Invalid PDF structure' };
  }
  
  return { valid: true };
}
```

**Implementation Priority:** High - Prevents malware uploads

---

#### 6. Secrets Management

**Current Status:**
- ✅ Covered in [Azure Key Vault Migration](#azure-key-vault-migration) section
- ⚠️ Currently using environment variables (acceptable but not ideal)

**Status:** See [Azure Key Vault Migration](#azure-key-vault-migration) section for details.

**Implementation Priority:** High - Migrate to Key Vault

---

#### 7. Audit Logging

**Current Status:**
- ✅ Frontend has audit logging (`src/lib/security/audit.ts`)
- ❌ Backend functions have minimal logging
- ❌ No centralized log aggregation
- ❌ No suspicious activity tracking

**Risks:**
- Cannot track security incidents
- No forensic data for investigations
- Compliance violations

**Solution: Comprehensive Audit Logging**

**For Azure Functions:**
```javascript
// azure-functions/rag-metadata/index.js
const { LogAnalyticsClient } = require('@azure/monitor-opentelemetry-exporter');

async function auditLog(event) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: event.userId || 'anonymous',
    action: event.action,
    resource: event.resource,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    success: event.success,
    error: event.error,
    metadata: event.metadata || {}
  };
  
  // Send to Application Insights or Log Analytics
  context.log(JSON.stringify(logEntry), 'audit');
  
  // Also send to Azure Log Analytics for centralized logging
  if (process.env.LOG_ANALYTICS_WORKSPACE_ID) {
    // Use Azure Log Analytics REST API or SDK
    await sendToLogAnalytics(logEntry);
  }
}

module.exports = async function (context, req) {
  const startTime = Date.now();
  
  try {
    // ... function logic
    
    // Log success
    await auditLog({
      userId: req.user?.id,
      action: 'rag_query',
      resource: 'rag-metadata',
      ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: {
        queryLength: req.body?.query?.length,
        responseTime: Date.now() - startTime
      }
    });
    
  } catch (error) {
    // Log failure
    await auditLog({
      userId: req.user?.id,
      action: 'rag_query',
      resource: 'rag-metadata',
      ipAddress: req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      success: false,
      error: error.message
    });
    
    throw error;
  }
};
```

**For Supabase Edge Functions:**
```typescript
// supabase/functions/rag-query/index.ts
interface AuditLog {
  userId: string;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

async function auditLog(log: AuditLog) {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: log.userId,
    action: log.action,
    resource: log.resource,
    ip_address: log.ipAddress,
    user_agent: log.userAgent,
    success: log.success,
    error: log.error,
    metadata: log.metadata,
    created_at: new Date().toISOString()
  });
  
  if (error) {
    console.error('Audit log error:', error);
  }
}

serve(async (req) => {
  const startTime = Date.now();
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  const userAgent = req.headers.get('user-agent');
  
  try {
    // ... function logic
    
    await auditLog({
      userId: user?.id || 'anonymous',
      action: 'rag_query',
      resource: 'rag-query',
      ipAddress,
      userAgent,
      success: true,
      metadata: {
        queryLength: query.length,
        responseTime: Date.now() - startTime
      }
    });
    
  } catch (error) {
    await auditLog({
      userId: user?.id || 'anonymous',
      action: 'rag_query',
      resource: 'rag-query',
      ipAddress,
      userAgent,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    throw error;
  }
});
```

**Database Table (Supabase):**
```sql
-- supabase/migrations/xxxxx_audit_logs.sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);
```

**Suspicious Activity Detection:**
```javascript
async function detectSuspiciousActivity(userId, action) {
  // Check for rapid requests
  const recentCount = await getAuditLogCount(userId, action, '5 minutes');
  if (recentCount > 100) {
    await alertSecurity({ type: 'RAPID_REQUESTS', userId, action, count: recentCount });
  }
  
  // Check for failed authentication attempts
  const failedAuth = await getAuditLogCount(userId, 'auth_failed', '15 minutes');
  if (failedAuth > 5) {
    await alertSecurity({ type: 'BRUTE_FORCE', userId, attempts: failedAuth });
  }
  
  // Check for unusual query patterns
  const unusualQueries = await detectUnusualPatterns(userId);
  if (unusualQueries.length > 0) {
    await alertSecurity({ type: 'UNUSUAL_ACTIVITY', userId, patterns: unusualQueries });
  }
}
```

**Implementation Priority:** High - Required for compliance and security monitoring

---

#### 8. Error Handling

**Current Status:**
- ❌ Some functions expose internal errors
- ❌ Stack traces may leak sensitive information
- ❌ No generic error messages for users

**Risks:**
- Information disclosure
- Stack traces reveal system architecture
- Error messages may reveal sensitive data

**Solution: Secure Error Handling**

```javascript
// azure-functions/rag-metadata/index.js
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

function handleError(error, context) {
  // Log detailed error server-side
  context.log.error('Error:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code
  });
  
  // Return generic error to client
  if (error instanceof AppError && error.isOperational) {
    return {
      status: error.statusCode,
      body: { error: error.message }
    };
  }
  
  // For unknown errors, return generic message
  return {
    status: 500,
    body: { error: 'An internal server error occurred. Please try again later.' }
  };
}

module.exports = async function (context, req) {
  try {
    // ... function logic
    
  } catch (error) {
    const errorResponse = handleError(error, context);
    context.res = errorResponse;
  }
};
```

**For Supabase Edge Functions:**
```typescript
// supabase/functions/rag-query/index.ts
class AppError extends Error {
  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}

function handleError(error: unknown): Response {
  // Log detailed error server-side
  console.error('Error:', error);
  
  if (error instanceof AppError && error.isOperational) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
  
  // For unknown errors, return generic message
  return new Response(
    JSON.stringify({ error: 'An internal server error occurred. Please try again later.' }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    }
  );
}

serve(async (req) => {
  try {
    // ... function logic
    
  } catch (error) {
    return handleError(error);
  }
});
```

**Implementation Priority:** Medium - Prevents information disclosure

---

### Implementation Summary

| Security Measure | Priority | Status | Time Estimate |
|-----------------|----------|--------|---------------|
| Input Validation | High | ❌ Missing | 1-2 days |
| SQL/Gremlin Injection | Critical | ❌ Missing | 1 day |
| Rate Limiting (Backend) | High | ❌ Missing | 2-3 days |
| File Upload Security | High | ⚠️ Partial | 2-3 days |
| Audit Logging | High | ⚠️ Partial | 2-3 days |
| Error Handling | Medium | ❌ Missing | 1 day |
| Authentication & Authorization | Medium | ✅ Covered | - |
| Secrets Management | High | ⚠️ Partial | See Key Vault section |

**Total Estimated Time:** ~10-14 days of focused work

---

## Resources

- [Azure Functions Authentication](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger?tabs=in-process%2Cfunctionsv2&pivots=programming-language-javascript#authorization-keys)
- [Azure Key Vault Documentation](https://learn.microsoft.com/en-us/azure/key-vault/)
- [Supabase CORS Configuration](https://supabase.com/docs/guides/functions/cors)
- [Supabase JWT Verification](https://supabase.com/docs/guides/functions/auth)
- [Azure Managed Identity](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/)

---

**Last Updated:** 2026-01-11  
**Next Review:** After Priority 1 & 2 implementation
