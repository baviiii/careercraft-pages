# 🚀 Vercel Deployment Checklist

Quick checklist to deploy CareerCraft to Vercel.

## ✅ Pre-Deployment

- [ ] Fill in your `.env` file with all credentials
  - [ ] `AZURE_OPENAI_ENDPOINT` and `AZURE_OPENAI_KEY` (REQUIRED)
  - [ ] `AZURE_SEARCH_ENDPOINT` and `AZURE_SEARCH_KEY` (for Intelligence)
  - [ ] `AZURE_DOCUMENT_INTELLIGENCE_*` (for Advanced parsing - optional)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Dashboard → Settings → API)
  - [ ] Optional: Job API keys (Adzuna, JSearch, Currents, Lovable)

## ✅ Set Supabase Secrets

Choose one method:

### Method A: Use PowerShell Script (Easiest)
```powershell
# Make sure you're in the project directory
cd "C:\Users\asees\Downloads\free-lance work\careercraft-pages"

# Run the script
.\set-supabase-secrets.ps1
```

### Method B: Manual Setup
Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Project Settings → Edge Functions → Add secrets manually

See `DEPLOYMENT.md` for the complete list of secrets to add.

## ✅ Deploy Edge Functions

```bash
# Deploy the updated parse-resume function
supabase functions deploy parse-resume

# Or deploy all functions
supabase functions deploy
```

## ✅ Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

### Option 2: Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your Git repo
3. Click Deploy

**Note**: You DON'T need to add env vars to Vercel (they're all in Supabase Edge Functions)

## ✅ Post-Deployment Testing

Test these features after deployment:

- [ ] **Quick Parse**: Upload a standard PDF resume
  - Expected: Parses in 3-5 seconds
  - Badge shows "⚡ Quick Mode"

- [ ] **Advanced Parse**: Upload a scanned document or complex PDF
  - Expected: Takes 10-30 seconds with Azure DI
  - Badge shows "🧠 Advanced Mode"

- [ ] **Intelligence Dashboard**: Navigate to Intelligence → Overview
  - Expected: Career insights, growth data, sector analysis

- [ ] **Resume Builder**: Create/edit a resume
  - Expected: Template preview, AI suggestions

## 🎯 Quick Deploy Commands

```bash
# 1. Set Supabase secrets (Windows PowerShell)
.\set-supabase-secrets.ps1

# 2. Deploy Edge Functions
supabase functions deploy parse-resume

# 3. Build and test locally
npm run build
npm run preview

# 4. Deploy to Vercel
vercel --prod
```

## 📧 Ready to Email Users?

Once all tests pass:
- ✅ Both parsing modes work
- ✅ Intelligence dashboard loads
- ✅ Resume builder functions
- ✅ No console errors

You're ready to announce the update!

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "AI parsing not available" | Set `AZURE_OPENAI_*` in Supabase secrets |
| Advanced mode fails | Expected if `AZURE_DOCUMENT_INTELLIGENCE_*` not set |
| Intelligence shows no data | Check `AZURE_SEARCH_*` secrets and verify index has data |
| WORKER_LIMIT timeout | Use Quick mode instead of Advanced |

## 📊 Cost Summary

- **Quick Mode**: ~$0.0015 per resume
- **Advanced Mode**: ~$0.0030 per resume
- **Intelligence**: $75-250/month (Azure AI Search)

Encourage Quick mode for cost savings!

## 🎉 After Deployment

Your Vercel URL will be: `https://your-project.vercel.app`

Share it with your users and start collecting feedback!
