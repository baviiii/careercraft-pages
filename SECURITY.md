# Security Configuration

This document outlines the security measures implemented in this application.

## 🔒 Security Features

### 1. HTTPS Enforcement
- All external API calls use HTTPS
- HTTP to HTTPS upgrade via Content Security Policy
- HSTS (HTTP Strict Transport Security) enabled with preload support

### 2. Security Headers

#### Strict-Transport-Security (HSTS)
```
max-age=31536000; includeSubDomains; preload
```
Forces browsers to only use HTTPS for 1 year, including subdomains.

#### Content-Security-Policy (CSP)
Comprehensive CSP that:
- Only allows scripts/styles from trusted sources
- Prevents XSS attacks
- Restricts external connections to whitelisted domains
- Blocks inline scripts (with exceptions for Vite)

**Allowed External Domains:**
- `*.supabase.co` - Supabase backend
- `ip-api.com` - Geolocation service
- `*.openai.azure.com` - Azure OpenAI
- `*.cognitiveservices.azure.com` - Azure services
- `*.search.windows.net` - Azure AI Search
- `ai.gateway.lovable.dev` - AI gateway
- Various job/news APIs (remotive.com, arbeitnow.com, etc.)

#### X-Frame-Options
```
DENY
```
Prevents clickjacking attacks by blocking iframe embedding.

#### X-Content-Type-Options
```
nosniff
```
Prevents MIME-type sniffing attacks.

#### Referrer-Policy
```
strict-origin-when-cross-origin
```
Controls referrer information sent with requests.

### 3. Content Security Policy (CSP) Details

The CSP is configured to allow:
- **Scripts**: Self, inline (Vite requires this), and jsdelivr CDN
- **Styles**: Self, inline, and Google Fonts
- **Fonts**: Self, Google Fonts, and data URIs
- **Images**: Self, data URIs, HTTPS URLs, and blob URLs (for file uploads)
- **Connections**: Whitelisted API domains only
- **Frames**: None (blocks iframe embedding)
- **Objects**: None (blocks plugin embedding)

### 4. API Security

#### Input Validation
- All user inputs are validated using Zod schemas
- XSS protection via input sanitization
- SQL injection prevention in database queries
- Rate limiting on API endpoints

#### Authentication
- Supabase Auth with JWT tokens
- Secure token storage in localStorage
- Automatic token refresh
- Session management

#### CORS Configuration
- Properly configured CORS headers in Supabase Edge Functions
- Origin validation for sensitive endpoints

### 5. Environment Variables

**Never commit secrets to git!**

All sensitive data is stored as environment variables:
- Supabase keys in Vercel environment variables
- Azure keys in Supabase Edge Function secrets
- API keys in secure vaults

### 6. Automated Security Checks

#### GitHub Actions
- HTTP URL detection in CI pipeline
- Secret scanning (warnings only)
- Build verification
- Security header validation

#### Pre-build Checks
```bash
npm run security:http-check  # Check for HTTP URLs
```

## 🛡️ Security Best Practices

### For Developers

1. **Always use HTTPS**
   ```typescript
   // ✅ Good
   fetch('https://api.example.com')
   
   // ❌ Bad
   fetch('http://api.example.com')
   ```

2. **Sanitize user input**
   ```typescript
   import { sanitize } from '@/lib/security/sanitizers'
   const clean = sanitize(userInput)
   ```

3. **Validate with Zod**
   ```typescript
   import { z } from 'zod'
   const schema = z.string().min(1).max(100)
   const valid = schema.parse(input)
   ```

4. **Use secure API wrapper**
   ```typescript
   import { secureFetch } from '@/lib/security/secureApi'
   const result = await secureFetch(url, { rateLimit: true })
   ```

5. **Never hardcode secrets**
   ```typescript
   // ✅ Good
   const apiKey = import.meta.env.VITE_API_KEY
   
   // ❌ Bad
   const apiKey = 'sk-1234567890abcdef'
   ```

### For Deployment

1. **Vercel Environment Variables**
   - Set in Vercel Dashboard → Settings → Environment Variables
   - Use different values for Preview, Development, and Production

2. **Supabase Secrets**
   - Set via Supabase CLI: `supabase secrets set KEY=value`
   - Or via Dashboard: Settings → Edge Functions → Secrets

3. **Verify Security Headers**
   - Test with: https://securityheaders.com
   - Check CSP with: https://csp-evaluator.withgoogle.com

## 🔍 Security Monitoring

### Audit Logging
- All security events are logged
- Failed authentication attempts tracked
- API rate limit violations recorded
- Suspicious activity flagged

### Regular Checks
- [ ] Review security headers quarterly
- [ ] Update dependencies for security patches
- [ ] Audit external API endpoints
- [ ] Review access logs for anomalies
- [ ] Test CSP policy changes in staging

## 🚨 Incident Response

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to: [your-security-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Supabase Security Guide](https://supabase.com/docs/guides/platform/security)

## ✅ Security Checklist

Before deploying to production:

- [x] All HTTP URLs changed to HTTPS
- [x] Security headers configured in vercel.json
- [x] CSP policy implemented
- [x] Environment variables set (not hardcoded)
- [x] Input validation in place
- [x] Rate limiting enabled
- [x] CORS properly configured
- [x] Security checks in CI/CD pipeline
- [x] Dependencies up to date
- [x] Audit logging enabled

---

**Last Updated:** 2024-01-XX  
**Maintained by:** Development Team
