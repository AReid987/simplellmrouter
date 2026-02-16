# Free Tier Quota Management Guide

Complete guide to maximizing your free tier LLM usage with SimpleLLMRouter.

## Understanding Your Quotas

### Provider Overview

| Provider | Tier | Monthly Limit | Daily Limit | RPM | Reset Period |
|----------|------|---------------|-------------|-----|--------------|
| **Mistral** | 🟦 HUGE | 1,000,000,000 | N/A | 500,000 | Monthly |
| **Groq** | 🟩 LARGE | N/A | 14,400 | 30 | Daily |
| **Gemini** | 🟩 LARGE | N/A | 1,500 | 15 | Daily |
| **Cerebras** | 🟨 MEDIUM | N/A | ~2,000 | 30 | Daily |
| **OpenRouter** | 🟨 MEDIUM | N/A | ~1,000 | Variable | Daily |
| **VoidAI** | 🟧 SMALL | N/A | ~500 | 10 | Daily |
| **z.ai** | 🟥 TINY | N/A | ~100 | Variable | Daily |
| **Kimi** | 🟥 TINY | N/A | ~100 | Variable | Daily |

### Quota Size Definitions

- **HUGE** (1B+ req/month): Essentially unlimited for personal use
- **LARGE** (10K+ req/day): Can handle most workloads
- **MEDIUM** (1K+ req/day): Good for moderate usage
- **SMALL** (100-1K req/day): Limited, use sparingly
- **TINY** (<100 req/day): Emergency backup only

## Router Strategy

### Default Behavior

SimpleLLMRouter automatically:

1. **Prioritizes huge quotas first** - Uses Mistral for most requests
2. **Preserves small quotas** - Saves z.ai and Kimi for last
3. **Respects tier requirements** - Uses powerful models only when needed
4. **Tracks usage in real-time** - Warns at 80% and 95% capacity
5. **Handles rate limits** - 60s cooldown, automatic fallback

### Selection Algorithm

For each request:

```
1. Classify request tier (SIMPLE/MEDIUM/COMPLEX/REASONING)
2. Filter models that can handle the tier
3. Remove rate-limited models
4. Sort by quota size (huge → large → medium → small → tiny)
5. Within same quota size, prefer exact tier match
6. Select top model
7. Build fallback chain with next 3 models
```

### Example Routing Decisions

**Simple question: "What's 2+2?"**
```
Tier: SIMPLE
Selected: mistral/mistral-small-latest (quota: huge, tier: simple)
Fallback: groq/llama-3.1-8b-instant → cerebras/llama-3.1-8b → voidai/void-1
```

**Medium task: "Write a Python function to sort a list"**
```
Tier: MEDIUM
Selected: mistral/mistral-large-latest (quota: huge, tier: complex - can handle medium)
Fallback: groq/llama-3.3-70b-versatile → gemini/gemini-2.0-flash-exp
```

**Complex analysis: "Analyze this algorithm's time complexity and optimize it"**
```
Tier: COMPLEX
Selected: mistral/mistral-large-latest (quota: huge, tier: complex)
Fallback: gemini/gemini-1.5-pro → groq/llama-3.3-70b-versatile
```

**Deep reasoning: "Prove this mathematical theorem step by step"**
```
Tier: REASONING
Selected: gemini/gemini-1.5-pro (quota: large, tier: reasoning)
Fallback: mistral/mistral-large-latest → kimi/moonshot-v1-128k
```

## Configuration

### Basic Setup

**1. Create `.env` with your API keys:**

```bash
# Start with providers you have keys for

# HUGE quota - Use this first!
MISTRAL_API_KEY=your-mistral-key

# LARGE quota - Main workhorses
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=your-google-key

# MEDIUM quota - Good fallbacks
CEREBRAS_API_KEY=your-cerebras-key
OPENROUTER_API_KEY=your-openrouter-key

# Add these only if you have them
VOIDAI_API_KEY=your-voidai-key
ZAI_API_KEY=your-zai-key
KIMI_API_KEY=your-kimi-key
```

**2. Start the router:**

```bash
npm start
```

**3. The router automatically loads all available providers and configures routing.**

### Advanced Configuration

**Adjust alert thresholds** - Edit `src/quota-tracker.ts`:

```typescript
private alertThresholds = {
  warning: 0.70,   // Alert at 70% instead of 80%
  critical: 0.90   // Alert at 90% instead of 95%
};
```

**Change rate limit cooldown** - Set environment variable:

```bash
RATE_LIMIT_COOLDOWN=120  # 2 minutes instead of 60s
npm start
```

**Disable quota preference** - Force tier-based routing only:

```bash
PREFER_LARGE_QUOTA=false
npm start
```

### Provider-Specific Tuning

**Add custom quota limits** - Edit `src/providers.ts`:

```typescript
// Example: You know Groq gives you more than 14.4K/day
{
  id: 'llama-3.3-70b-versatile',
  // ...
  quota: {
    dailyRequests: 20000,  // Increased from 14400
    rpm: 30,
    quotaSize: 'large'
  }
}
```

**Add new model to existing provider:**

```typescript
cerebras: {
  // ... existing config
  models: [
    // ... existing models
    {
      id: 'llama-3.2-1b',
      name: 'Llama 3.2 1B',
      contextWindow: 128000,
      maxOutput: 8192,
      capabilities: ['fast'],
      quota: {
        dailyRequests: 5000,
        rpm: 60,
        quotaSize: 'medium'
      },
      tier: 'simple'
    }
  ]
}
```

## Monitoring Usage

### Real-Time Quota Status

**Check current usage:**

```bash
curl http://localhost:8402/quota
```

Output:
```
📊 Quota Usage Summary
════════════════════════════════════════════════════════════

mistral/mistral-large-latest
  Requests: 1,234
  Monthly:  🟢 [█░░░░░░░░░░░░░░░░░░░] 0.0% (1,234/1,000,000,000)
  Tokens:   45,678

groq/llama-3.3-70b-versatile
  Requests: 567
  Daily:    🟢 [███░░░░░░░░░░░░░░░░░] 3.9% (567/14,400)
  Tokens:   23,456

gemini/gemini-2.0-flash-exp
  Requests: 1,140
  Daily:    🟡 [███████████████░░░░░] 76.0% (1,140/1,500)
  Tokens:   34,567
```

### Understanding the Display

- **🟢 Green** (0-79%): Healthy, plenty of quota remaining
- **🟡 Yellow** (80-94%): Warning, approaching limit
- **🔴 Red** (95-100%): Critical, quota nearly exhausted

### Alert Notifications

The router logs alerts automatically:

```
[2026-02-15 18:30:00] ⚠️  WARNING: gemini/gemini-2.0-flash-exp at 82% of daily quota (1,230/1,500 requests)

[2026-02-15 22:45:00] 🚨 CRITICAL: groq/llama-3.3-70b-versatile at 96% of daily quota (13,824/14,400 requests)
```

### Manual Quota Inspection

**View specific model:**

```bash
# Check usage data file directly
cat .simplellmrouter/quota-usage.json | jq '.[] | select(.[0] | contains("groq"))'
```

**Watch live updates:**

```bash
# Monitor quota in real-time (refresh every 5 seconds)
watch -n 5 'curl -s http://localhost:8402/quota'
```

## Usage Patterns

### Daily Workflow

**Morning (8am):**
- Fresh quotas, all providers available
- Heavy workloads can use any provider
- Ideal for batch processing

**Afternoon (2pm):**
- Some quotas may be at 50-70%
- Router automatically balances load
- Continue normal usage

**Evening (6pm):**
- Check quota status: `curl http://localhost:8402/quota`
- If any provider >80%, avoid heavy usage on that provider
- Router will automatically route around high-usage providers

**Night (11pm):**
- Daily quotas reset at midnight (your timezone)
- Save complex tasks for after midnight if quotas are depleted

### Monthly Planning

**Week 1 (Days 1-7):**
- Fresh monthly quota (Mistral: 1B requests)
- Use freely for all tasks
- Monitor daily averages

**Week 2-3 (Days 8-21):**
- Check monthly burn rate
- If >30% used, consider reducing Mistral usage
- Distribute load across Groq/Gemini

**Week 4 (Days 22-30):**
- If >70% of monthly quota used, conserve Mistral
- Rely more on daily quota providers (Groq/Gemini)
- Monthly reset occurs on day 30

### Rate Limit Handling

**When rate-limited:**

1. **Router logs the event:**
   ```
   ⚠️  Rate limited: groq/llama-3.3-70b-versatile (cooldown: 60s)
   ```

2. **Automatic fallback:**
   ```
   Falling back to: mistral/mistral-large-latest
   ```

3. **60-second cooldown:**
   - Model is excluded from routing
   - After 60s, automatically re-enabled
   - No manual intervention needed

4. **Check rate limit status:**
   ```bash
   curl http://localhost:8402/rate-limits
   ```

## Optimization Strategies

### Maximize Free Tier Usage

**1. Let Mistral Handle Bulk Traffic**

Mistral's 1B monthly quota is essentially unlimited:
- Use for simple tasks, batch processing, high-volume requests
- Average personal usage: 1K-10K requests/month (0.001%-0.01% of quota)
- Don't worry about running out

**2. Preserve Daily Quotas Strategically**

Groq (14.4K/day) and Gemini (1.5K/day) reset daily:
- Use for specialized tasks (Groq: speed, Gemini: vision)
- Avoid using all Gemini quota in morning hours
- Spread usage throughout the day

**3. Save Tiny Quotas for Emergencies**

z.ai and Kimi have ~100 requests/day:
- Only use when all other providers exhausted
- Ideal for very specific coding tasks
- Router uses these automatically as last resort

**4. Monitor Usage Patterns**

Track which providers you actually use:
```bash
# View usage summary daily
curl http://localhost:8402/quota | grep "Requests:"

# Identify which tiers trigger most requests
grep "Tier:" logs/*.log | sort | uniq -c
```

### Reduce Quota Consumption

**Batch similar requests:**

Instead of:
```
Request 1: "What's 2+2?" → mistral/mistral-small-latest
Request 2: "What's 3+3?" → mistral/mistral-small-latest
Request 3: "What's 4+4?" → mistral/mistral-small-latest
Total: 3 requests
```

Do:
```
Request 1: "Calculate: 2+2, 3+3, 4+4" → mistral/mistral-small-latest
Total: 1 request (66% savings)
```

**Cache common queries:**

If using programmatically, cache responses for frequent questions.

**Use appropriate tiers:**

Don't trigger COMPLEX/REASONING tiers unnecessarily:
- Avoid: "Analyze and deeply reason about what 2+2 equals"
- Better: "What's 2+2?"

## Troubleshooting

### Quota Exhaustion

**Symptom:** Error: "No models available (all rate-limited)"

**Solution:**
1. Check quota status: `curl http://localhost:8402/quota`
2. Identify exhausted providers (🔴 100%)
3. Wait for reset (check "Daily" or "Monthly" in status)
4. Or add new provider with available quota

**Temporary fix:**
```bash
# Manually clear rate limits (use cautiously!)
curl -X POST http://localhost:8402/rate-limits/reset
```

### Inaccurate Quota Tracking

**Symptom:** Router shows different quota than provider dashboard

**Causes:**
- Router tracks local requests only (doesn't see requests made directly to provider)
- Quota resets at different times (router uses 24h/30d from first request)
- Provider may have different quota than configured

**Solution:**
```bash
# Reset quota counters to resync
curl -X POST http://localhost:8402/quota/reset

# Or manually edit quota file
nano .simplellmrouter/quota-usage.json
```

### Unexpected Model Selection

**Symptom:** Router uses tiny quota provider instead of huge quota

**Debug:**
1. Check tier classification:
   ```bash
   LOG_LEVEL=debug npm start
   ```

2. Look for tier mismatch:
   ```
   [DEBUG] Tier: REASONING (score: 12)
   [DEBUG] Tier compatible models: gemini-1.5-pro, kimi/moonshot-v1-128k
   [DEBUG] Selected: kimi/moonshot-v1-128k (reasoning tier)
   ```

3. Solution: Add reasoning-capable model to huge quota provider:
   ```typescript
   // In src/providers.ts
   mistral: {
     models: [
       // ... existing
       {
         id: 'mistral-large-latest',
         tier: 'reasoning'  // Changed from 'complex'
       }
     ]
   }
   ```

### Rate Limit Loops

**Symptom:** Constant rate limit errors, no requests succeeding

**Causes:**
- All providers rate-limited simultaneously
- RPM limits too aggressive
- Burst traffic exceeding limits

**Solutions:**

1. **Reduce request rate:**
   ```bash
   # Add delay between requests in your application
   sleep 1  # Wait 1 second between requests
   ```

2. **Increase cooldown:**
   ```bash
   RATE_LIMIT_COOLDOWN=300  # 5 minutes
   npm start
   ```

3. **Add more providers:**
   - Sign up for additional free tier accounts
   - Add API keys to `.env`

## Best Practices Summary

### DO ✅

- **Monitor quota daily** - Quick check at 6pm
- **Use Mistral liberally** - 1B monthly quota is huge
- **Let router handle fallbacks** - Trust the automatic routing
- **Track usage patterns** - Understand your workload
- **Spread requests throughout day** - Avoid burst usage

### DON'T ❌

- **Don't manually override router** - It knows quota status
- **Don't ignore 80% warnings** - Plan for quota exhaustion
- **Don't make requests directly to providers** - Bypasses quota tracking
- **Don't reset quota tracking frequently** - Loses valuable usage data
- **Don't use tiny quotas for bulk tasks** - Exhausts them quickly

## Quick Reference

### Common Commands

```bash
# Check quota status
curl http://localhost:8402/quota

# Check health and active providers
curl http://localhost:8402/health

# View rate-limited models
curl http://localhost:8402/rate-limits

# Test routing decision
curl -X POST http://localhost:8402/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'

# Enable debug logging
LOG_LEVEL=debug npm start

# Reset quota counters (testing only)
curl -X POST http://localhost:8402/quota/reset
```

### Environment Variables

```bash
PORT=8402                      # Server port
LOG_LEVEL=info                # debug|info|warn|error
PREFER_LARGE_QUOTA=true       # Quota-aware routing
RATE_LIMIT_COOLDOWN=60        # Rate limit cooldown (seconds)
MIN_CONFIDENCE=0.3            # Min tier confidence threshold
```

### File Locations

```
~/.simplellmrouter/           # Data directory
└── quota-usage.json          # Persistent quota tracking

code/simplellmrouter/
├── .env                      # API keys (git-ignored)
├── src/providers.ts          # Provider configurations
├── src/router.ts             # Routing logic
└── src/quota-tracker.ts      # Quota monitoring
```

## Support

For issues or questions:
- Check debug logs: `LOG_LEVEL=debug npm start`
- Review quota status: `curl http://localhost:8402/quota`
- Examine usage data: `cat .simplellmrouter/quota-usage.json`

---

**Remember:** The router's goal is to maximize your free tier usage by intelligently distributing requests across providers based on quota availability. Trust the automatic routing and only intervene if you see unexpected behavior.
