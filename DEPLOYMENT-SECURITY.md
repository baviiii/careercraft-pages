# Deployment & Security Guide

## 🚀 Quick Deploy Checklist

### Before First Deployment

1. **Set Vercel Environment Variables**
   ```bash
   # Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   # Add these:
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Set GitHub Secrets** (for CI/CD)
   ```bash
   # Go to GitHub → Your Repo → Settings → Secrets and variables → Actions
   # Add these (optional, for automated Supabase deployments):
   SUPABASE_ACCESS_TOKEN=your-access-token
   SUPABASE_PROJECT_ID=your-project-id
   ```

3. **Set Supabase Edge Function Secrets**
   ```bash
   # Via CLI
   supabase secrets set AZURE_OPENAI_ENDPOINT=https://...
   supabase secrets set AZURE_OPENAI_KEY=...
   # ... (see supabase/RAG-ENV-SETUP.md for full list)
   
   # Or via Dashboard: Settings → Edge Functions → Secrets
   ```

4. **Connect Vercel to GitHub**
   - Go to Vercel Dashboard → New Project
   - Import your GitHub repository
   - Vercel will auto-detect Vite configuration
   - It will use `vercel.json` automatically

5. **Verify Security Headers**
   After deployment, test with:
   - https://securityheaders.com
   - https://csp-evaluator.withgoogle.com

## 🔄 Automated Deployment Flow

### Main Branch Push → Auto Deploy

1. **Push to main/master branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions runs automatically:**
   - ✅ Security checks (HTTP URL detection)
   - ✅ Build verification
   - ✅ Configuration validation
   - ✅ Deployment ready check

3. **Vercel auto-deploys:**
   - Builds from `main` branch
   - Uses `vercel.json` for configuration
   - Sets security headers automatically
   - Deploys to production URL

4. **Supabase Edge Functions** (if configured):
   - Automatically deploys on function changes
   - Or manually: `supabase functions deploy`

## 📝 Manual Deployment

### Deploy to Vercel Manually

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Deploy Supabase Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy function-name
```

## 🛡️ Security Verification

### Post-Deployment Checks

1. **Verify HTTPS**
   ```bash
   curl -I https://your-domain.vercel.app
   # Should show Strict-Transport-Security header
   ```

2. **Check Security Headers**
   ```bash
   curl -I https://your-domain.vercel.app | grep -i "x-"
   # Should show all security headers
   ```

3. **Test CSP**
   - Open browser console
   - Should NOT see CSP violations
   - Check Network tab for blocked requests

4. **Verify Environment Variables**
   - Check Vercel Dashboard → Settings → Environment Variables
   - Ensure all required vars are set
   - Different values for Production/Preview/Development

## 🔧 Troubleshooting

### Build Fails with HTTP URL Error

```bash
# Check for HTTP URLs
npm run security:http-check

# Fix any found URLs to HTTPS
# Exception: localhost/127.0.0.1 is OK
```

### Security Headers Not Working

1. Check `vercel.json` is in root directory
2. Verify JSON syntax: `cat vercel.json | python -m json.tool`
3. Check Vercel deployment logs
4. Ensure you're not overriding headers elsewhere

### CSP Violations

1. Check browser console for violations
2. Update CSP in `vercel.json` and `index.html`
3. Add needed domains to `connect-src` or `script-src`
4. Test with CSP evaluator tool

### Environment Variables Not Loading

1. Vercel: Check Settings → Environment Variables
2. Ensure variable names start with `VITE_` for client-side
3. Rebuild after adding variables: `vercel --prod`
4. Check build logs for missing variables

## 📊 Monitoring

### GitHub Actions

- View runs: GitHub → Actions tab
- Check logs for failures
- Review security scan results

### Vercel Analytics

- View deployments: Vercel Dashboard → Deployments
- Check build logs
- Monitor errors in Logs tab

### Security Monitoring

- Review audit logs in Supabase
- Check Vercel security logs
- Monitor API rate limits

## ✅ Production Checklist

Before going live:

- [ ] All environment variables set
- [ ] Security headers configured
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] CSP policy tested
- [ ] Build passes CI/CD
- [ ] No console errors
- [ ] No CSP violations
- [ ] Supabase Edge Functions deployed
- [ ] Rate limiting enabled
- [ ] Audit logging active

## 🆘 Support

If you encounter issues:

1. Check deployment logs in Vercel
2. Review GitHub Actions logs
3. Check Supabase function logs
4. Review SECURITY.md for configuration
5. Test with security header checker tools

---

**Last Updated:** 2024-01-XX
