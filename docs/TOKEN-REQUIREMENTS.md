# Token Requirements for Full-Powered RAG Chat

## Current Configuration

### Model Being Used
- **Model**: `gpt-4o-mini` (NOT full GPT-4)
- **Current Tier**: S0 (Basic tier)
- **Max Tokens Per Response**: 1,500 tokens
- **Location**: Australia East

### Current Token Usage Per Request

**Input Tokens (Approximate):**
- System prompt: ~200 tokens
- Conversation history (last 6 messages): ~300-500 tokens
- Context from search results (top 10 chunks): ~2,000-4,000 tokens
- User query: ~50-100 tokens
- **Total Input**: ~2,550-4,800 tokens per request

**Output Tokens:**
- Max response: 1,500 tokens
- Average response: ~800-1,200 tokens

**Total Per Request**: ~3,350-6,300 tokens

## Azure OpenAI S0 Tier Limits

### Current S0 Tier (Basic)
- **Requests Per Minute (RPM)**: ~60 requests/min
- **Tokens Per Minute (TPM)**: ~60,000-90,000 TPM (estimated for S0)
- **Issue**: You're hitting rate limits because S0 tier is too low

### Recommended Tiers for Production

#### Option 1: S1 Tier (Standard)
- **RPM**: ~300-500 requests/min
- **TPM**: ~300,000-500,000 TPM
- **Cost**: ~$0.10-0.20 per 1K tokens
- **Best for**: Small to medium traffic

#### Option 2: S2 Tier (Premium)
- **RPM**: ~1,000-2,000 requests/min
- **TPM**: ~1,000,000-2,000,000 TPM
- **Cost**: ~$0.15-0.30 per 1K tokens
- **Best for**: High traffic, production systems

#### Option 3: Request Quota Increase (Keep S0)
- Request higher limits on S0 tier
- Visit: https://aka.ms/oai/quotaincrease
- Can get up to ~200,000 TPM on S0 with quota increase
- **Free option** - just need approval

## Token Calculation for Your System

### Per Chat Message:
```
Input:  ~3,000 tokens (average)
Output: ~1,000 tokens (average)
Total:  ~4,000 tokens per message
```

### For 10 Concurrent Users:
- 10 messages/min × 4,000 tokens = **40,000 TPM**
- **S0 tier is insufficient** - need at least S1

### For 50 Concurrent Users:
- 50 messages/min × 4,000 tokens = **200,000 TPM**
- **Need S1 tier minimum**, S2 recommended

### For 100+ Concurrent Users:
- 100+ messages/min × 4,000 tokens = **400,000+ TPM**
- **Need S2 tier**

## Recommendations

### Immediate Fix (Free):
1. **Request Quota Increase** on S0 tier
   - Go to: https://aka.ms/oai/quotaincrease
   - Request: 200,000 TPM for gpt-4o-mini
   - Usually approved within 24-48 hours
   - **This is FREE** - no cost increase

### Short-Term (Low Cost):
2. **Upgrade to S1 Tier**
   - Better rate limits
   - More reliable for production
   - Cost: ~$0.10-0.20 per 1K tokens
   - For 10K messages/month: ~$40-80/month

### Long-Term (Production):
3. **Upgrade to S2 Tier**
   - Handles high traffic
   - Better performance
   - Cost: ~$0.15-0.30 per 1K tokens
   - For 50K messages/month: ~$300-600/month

## Cost Estimation

### Current Usage (S0 Tier):
- **Cost**: ~$0.10 per 1K tokens
- **10K messages/month**: ~$40/month
- **50K messages/month**: ~$200/month

### With S1 Tier:
- **Cost**: ~$0.10-0.20 per 1K tokens
- **10K messages/month**: ~$40-80/month
- **50K messages/month**: ~$200-400/month

### With S2 Tier:
- **Cost**: ~$0.15-0.30 per 1K tokens
- **10K messages/month**: ~$60-120/month
- **50K messages/month**: ~$300-600/month

## Optimization Tips

### Reduce Token Usage:
1. **Reduce `max_tokens`** from 1500 to 1000 (saves ~500 tokens/request)
2. **Reduce `topK`** from 10 to 8 (saves ~400-800 tokens/request)
3. **Limit conversation history** to last 3 messages (saves ~200 tokens/request)
4. **Truncate context chunks** to 500 chars max (saves ~1,000 tokens/request)

### Current Settings in `rag-query/index.ts`:
```typescript
max_tokens: 1500,  // Can reduce to 1000
topK: 10,          // Can reduce to 8
conversationHistory.slice(-6)  // Can reduce to -3
```

## Action Items

1. ✅ **Immediate**: Request quota increase (FREE)
   - Visit: https://aka.ms/oai/quotaincrease
   - Request: 200,000 TPM for gpt-4o-mini deployment

2. ⚠️ **Short-term**: Monitor usage and upgrade to S1 if needed

3. 🎯 **Long-term**: Optimize token usage and scale to S2 for production

## Notes

- **gpt-4o-mini** is much cheaper than full GPT-4 (~10x cheaper)
- **gpt-4o-mini** is perfect for RAG - you don't need full GPT-4
- Current rate limiting is due to **S0 tier limits**, not model choice
- **Quota increase is FREE** - try this first before upgrading tier

