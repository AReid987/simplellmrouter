# SimpleLLMRouter

**Intelligent LLM routing for OpenClaw** - Free tier quota-optimized routing that automatically selects the best model while preserving your limited quotas.

## Features

- 🎯 **Smart Routing** - 14-dimension scoring classifies requests into tiers (SIMPLE/MEDIUM/COMPLEX/REASONING) in <1ms
- 📊 **Quota Preservation** - Prioritizes models with larger quotas to maximize your free tier usage
- 🔄 **Auto Fallback** - Retries failed requests with next best model
- ⚡ **Rate Limit Aware** - Tracks and avoids rate-limited providers with 60s cooldown
- 📈 **Usage Monitoring** - Real-time quota tracking with warnings at 80% and 95% usage
- 🔌 **OpenAI Compatible** - Drop-in replacement for OpenClaw's model config
- 🆓 **100% Free Tier** - Optimized for free models with no API costs

## Your Free Tier Providers

You have 9 providers configured with varying quota sizes:

| Provider | Quota Size | Daily/Monthly Limit | Best Models |
|----------|------------|---------------------|-------------|
| **Mistral** | 🟦 HUGE | 1B requests/month | mistral-large-latest (complex), mistral-small-latest (simple) |
| **Groq** | 🟩 LARGE | 14.4K requests/day | llama-3.3-70b-versatile (medium), llama-3.1-8b-instant (simple) |
| **Google Gemini** | 🟩 LARGE | 1.5K requests/day | gemini-2.0-flash-exp (medium), gemini-1.5-pro (reasoning) |
| **Cerebras** | 🟨 MEDIUM | ~2K requests/day | llama-3.3-70b (medium), llama-3.1-8b (simple) |
| **OpenRouter** | 🟨 MEDIUM | ~1K requests/day | Free tier routing (medium/simple) |
| **VoidAI** | 🟧 SMALL | ~500 requests/day | void-1 (simple) |
| **z.ai** | 🟥 TINY | ~100 requests/day | z-coder (coding tasks) |
| **Kimi** | 🟥 TINY | ~100 requests/day | moonshot-v1-128k (coding/reasoning) |

**Routing Strategy**: The router will use Mistral and Groq first (huge/large quotas), saving Kimi and z.ai for last.

## Quick Start

### 1. Install

```bash
cd code/simplellmrouter
npm install
npm run build
```

### 2. Configure API Keys

Create `.env` file with ONLY the providers you have:

```bash
# HUGE quota providers (use these first!)
MISTRAL_API_KEY=your-mistral-key

# LARGE quota providers
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=your-google-key

# MEDIUM quota providers
CEREBRAS_API_KEY=your-cerebras-key
OPENROUTER_API_KEY=your-openrouter-key

# SMALL quota providers
VOIDAI_API_KEY=your-voidai-key

# TINY quota providers (coding plans)
ZAI_API_KEY=your-zai-key
KIMI_API_KEY=your-kimi-key
```

### 3. Start Router

```bash
npm start
# or
npm start -- --port=8402
```

Router runs on `http://localhost:8402`

### 4. Configure OpenClaw

Point OpenClaw to use the router:

```bash
# Set router as primary model
openclaw config set agents.defaults.model.primary "http://localhost:8402/v1"

# Or edit ~/.openclaw/openclaw.json directly:
```

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "http://localhost:8402/v1",
        "apiKey": "dummy-key-not-used"
      }
    }
  }
}
```

### 5. Test It

```bash
# OpenClaw will now route through SimpleLLMRouter
openclaw chat "What's 2+2?"
```

## How It Works

### Quota Preservation Strategy

**Priority Order** (uses models in this order):
1. **HUGE quota** (Mistral - 1B req/month) - Use first for all tasks
2. **LARGE quota** (Groq, Gemini - 10K+ req/day) - Primary workhorses
3. **MEDIUM quota** (Cerebras, OpenRouter - 1K+ req/day) - Good fallbacks
4. **SMALL quota** (VoidAI - 500 req/day) - Emergency fallback
5. **TINY quota** (z.ai, Kimi - 100 req/day) - Last resort only

**Smart Fallback**: If rate-limited, automatically skips to next available model in the chain.

### Request Classification

Every request is scored across 14 dimensions:

1. **Prompt length** - Token count
2. **Code presence** - Programming content
3. **Reasoning keywords** - Logic, analysis, planning  
4. **Math presence** - Mathematical operations
5. **Multi-turn conversation** - Context depth
6. **Question complexity** - How vs why questions
7. **Technical domains** - Specialized knowledge
8. **Creative markers** - Open-ended generation

**Tier Assignment:**
- **SIMPLE** (0-2 points): Facts, definitions → Use smallest models
- **MEDIUM** (3-5 points): Analysis, code → Mid-tier models
- **COMPLEX** (6-9 points): Multi-step reasoning → Powerful models
- **REASONING** (10+ points): Deep analysis → Most capable models

### Model Selection Example

**User asks**: "What's the capital of France?"
```
1. Classification: SIMPLE (score: 1)
2. Filter models: tier=simple or higher
3. Sort by quota: Mistral (huge) > Groq (large) > Cerebras (medium)
4. Select: mistral/mistral-small-latest (best for simple + huge quota)
5. Fallback chain: groq/llama-3.1-8b-instant → cerebras/llama-3.1-8b
```

**User asks**: "Analyze this complex algorithm and optimize it"
```
1. Classification: COMPLEX (score: 8)
2. Filter models: tier=complex or reasoning
3. Sort by quota: Mistral (huge) > Gemini Pro (large)
4. Select: mistral/mistral-large-latest (best for complex + huge quota)
5. Fallback chain: gemini/gemini-1.5-pro → groq/llama-3.3-70b
```

## Quota Monitoring

### Real-Time Tracking

The router automatically tracks your quota usage:

```bash
# View quota status
curl http://localhost:8402/quota
```

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
  Requests: 890
  Daily:    🟡 [████████████████░░░░] 59.3% (890/1,500)
  Tokens:   34,567
```

### Quota Alerts

Automatic warnings when approaching limits:

```
⚠️  WARNING: gemini/gemini-2.0-flash-exp at 80% of daily quota (1,200/1,500 requests)
🚨 CRITICAL: groq/llama-3.3-70b-versatile at 95% of daily quota (13,680/14,400 requests)
```

### Quota Resets

- **Daily quotas**: Auto-reset after 24 hours
- **Monthly quotas**: Auto-reset after 30 days
- Persistent tracking across restarts (saved to `.simplellmrouter/quota-usage.json`)

## Configuration

### Environment Variables

Set your API keys using the `PROVIDER_{PROVIDER_ID}_API_KEY` format:

```bash
# HUGE quota providers (use these first!)
export PROVIDER_MISTRAL_API_KEY=your-mistral-key

# LARGE quota providers
export PROVIDER_GROQ_API_KEY=gsk_...
export PROVIDER_GEMINI_API_KEY=your-google-key

# MEDIUM quota providers
export PROVIDER_CEREBRAS_API_KEY=your-cerebras-key
export PROVIDER_OPENROUTER_API_KEY=your-openrouter-key

# SMALL quota providers
export PROVIDER_VOIDAI_API_KEY=your-voidai-key

# TINY quota providers (coding plans)
export PROVIDER_ZAI_API_KEY=your-zai-key
export PROVIDER_KIMI_API_KEY=your-kimi-key
```

### Provider Configuration Files

Edit provider configuration in the `config/` directory:

- **`config/providers.yaml`** - Default provider definitions with all 9 providers
- **`config/providers.development.yaml`** - Development overrides (fewer providers enabled)
- **`config/providers.production.yaml`** - Production configuration (copy from `config/production.example.yaml`)

#### Configuration Structure

```yaml
server:
  port: 8402
  host: localhost

logging:
  level: info          # debug, info, warn, error
  format: pretty       # pretty, json
  # file: logs/router.log  # Optional file logging

providers:
  mistral:
    id: mistral
    name: Mistral
    baseUrl: https://api.mistral.ai/v1
    enabled: true
    models:
      - id: mistral-large-latest
        name: Mistral Large Latest
        contextWindow: 128000
        maxOutput: 8192
        capabilities: [function-calling, reasoning, code]
        quota:
          monthlyRequests: 1000000000
          rpm: 500000
          quotaSize: huge
        tier: complex
```

#### Configuration Schema

The configuration system uses Zod for validation with the following schema:

- **`server`** - Server configuration (port, host)
- **`providers`** - Provider definitions with models, capabilities, and quotas
- **`providerConfig`** - Environment-specific provider overrides (API keys, enabled models)
- **`logging`** - Logging configuration (level, format, file, error reporting)

All configuration is validated at startup. Invalid configuration will prevent the application from starting with detailed error messages.

#### Environment-Specific Configuration

The router automatically loads environment-specific configuration based on `NODE_ENV`:

```bash
# Development
NODE_ENV=development npm start
# Loads: config/providers.development.yaml → config/providers.yaml

# Production
NODE_ENV=production npm start
# Loads: config/providers.production.yaml → config/providers.yaml
```

#### Environment Variable Overrides

You can override configuration values using environment variables:

```bash
# Override API keys
export PROVIDER_MISTRAL_API_KEY=your-key
export PROVIDER_GROQ_API_KEY=your-key

# Override enabled status
export PROVIDER_MISTRAL_ENABLED=true
export PROVIDER_GROQ_ENABLED=false
```

### Router Behavior Configuration

```bash
# Router Behavior (these can be set in config or environment)
PREFER_LARGE_QUOTA=true     # Prefer models with larger quotas (default: true)
RATE_LIMIT_COOLDOWN=60      # Seconds to deprioritize rate-limited models
MIN_CONFIDENCE=0.3          # Minimum confidence threshold (0-1)
```

### Quota Alert Thresholds

Edit `src/quota-tracker.ts`:

```typescript
private alertThresholds = {
  warning: 0.80,   // 80% usage
  critical: 0.95   // 95% usage
};
```

### Adding New Free Tier Providers

Edit `src/providers.ts`:

```typescript
newprovider: {
  id: 'newprovider',
  name: 'New Provider',
  baseUrl: 'https://api.newprovider.com/v1',
  models: [{
    id: 'model-name',
    name: 'Model Name',
    contextWindow: 128000,
    maxOutput: 8192,
    capabilities: ['fast'],
    quota: {
      dailyRequests: 5000,
      quotaSize: 'medium'  // tiny/small/medium/large/huge
    },
    tier: 'simple'  // simple/medium/complex/reasoning
  }]
}
```

## API Endpoints

### POST /v1/chat/completions

Standard OpenAI chat completions format:

```bash
curl -X POST http://localhost:8402/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explain quantum computing"}
    ],
    "temperature": 0.7
  }'
```

Response includes routing metadata:

```json
{
  "id": "chatcmpl-...",
  "model": "mistral/mistral-large-latest",
  "choices": [...],
  "usage": {...},
  "x-router": {
    "tier": "MEDIUM",
    "confidence": 0.85,
    "quotaSize": "huge",
    "reasoning": "Selected Mistral Large (quota: huge) for MEDIUM tier task"
  }
}
```

### GET /quota

Get current quota usage:

```bash
curl http://localhost:8402/quota
```

### GET /health

Health check endpoint:

```bash
curl http://localhost:8402/health
```

```json
{
  "status": "healthy",
  "providers": 9,
  "models": 15,
  "uptime": 3600
}
```

## Monitoring

### Request Logs

```
[2026-02-15 12:30:45] INFO: Request classified
  Tier: SIMPLE (score: 2, reasoning: Simple query)
  Selected: mistral/mistral-small-latest (quota: huge)
  Fallbacks: groq/llama-3.1-8b-instant → cerebras/llama-3.1-8b

[2026-02-15 12:30:46] INFO: Request completed
  Model: mistral/mistral-small-latest
  Tokens: 150 in, 350 out
  Latency: 0.8s
  Quota: 1,235/1,000,000,000 (0.0%)
```

### Rate Limit Handling

```
[2026-02-15 12:31:00] WARN: Rate limit detected
  Model: groq/llama-3.3-70b-versatile
  Cooldown: 60s
  Falling back to: mistral/mistral-large-latest

⚠️  Rate limited: groq/llama-3.3-70b-versatile (cooldown: 60s)
```

## Best Practices

### Maximizing Free Tier Usage

1. **Let Mistral handle most traffic** - 1B requests/month is essentially unlimited
2. **Use Groq for speed-critical tasks** - Ultra-fast inference
3. **Save Gemini for vision/multimodal** - Unique capabilities
4. **Keep tiny quotas for specialized tasks** - z.ai for coding, Kimi for reasoning
5. **Monitor daily at 6pm** - Check quota status before overnight runs

### Quota Management Tips

```bash
# Check quota before heavy usage
curl http://localhost:8402/quota

# Reset quota counters (testing only)
curl -X POST http://localhost:8402/quota/reset

# View rate-limited models
curl http://localhost:8402/rate-limits
```

### Avoiding Rate Limits

- **Respect RPM limits** - Router tracks per-minute rates
- **Implement backoff** - 60s cooldown on rate limit hits
- **Distribute load** - Router automatically spreads across providers
- **Monitor alerts** - Watch for 80% and 95% warnings

## Development

### Project Structure

```
simplellmrouter/
├── src/
│   ├── providers.ts      # Provider registry with quota configs
│   ├── router.ts         # Classification and quota-aware routing
│   ├── quota-tracker.ts  # Usage monitoring and alerts
│   ├── server.ts         # HTTP proxy server
│   └── cli.ts            # Command-line interface
├── .simplellmrouter/
│   └── quota-usage.json  # Persistent quota tracking
├── package.json
├── tsconfig.json
└── README.md
```

### Build & Run

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start

# Custom port
npm start -- --port=9000
```

### Debug Logging

```bash
LOG_LEVEL=debug npm start
```

Shows detailed scoring and quota decisions:

```
[DEBUG] Request scoring:
  tokenEstimate: 50 (0 points)
  codePres: 2 (code blocks detected)
  reasoning: 1 (reasoning keywords)
  TOTAL: 3/100 → MEDIUM tier

[DEBUG] Quota-aware selection:
  Candidates: 8 models
  After tier filter: 6 models
  After rate limit filter: 6 models
  Sorted by quota: mistral (huge) > groq (large) > cerebras (medium)
  Selected: mistral/mistral-large-latest
```

## Troubleshooting

### Router not starting

```bash
# Check port availability
lsof -i :8402

# Try different port
npm start -- --port=9000
```

### OpenClaw not connecting

```bash
# Verify router is running
curl http://localhost:8402/health

# Check OpenClaw config
openclaw config get agents.defaults.model.primary

# Should output: http://localhost:8402/v1
```

### No providers available

```bash
# Check .env file exists
ls -la .env

# Verify API keys are set
cat .env | grep API_KEY

# Test provider directly
curl -X POST http://localhost:8402/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "test"}]}'
```

### Quota tracking not working

```bash
# Check data directory
ls -la .simplellmrouter/

# View raw quota data
cat .simplellmrouter/quota-usage.json

# Reset if corrupted
rm .simplellmrouter/quota-usage.json
npm start
```

### All models rate-limited

```bash
# Check cooldown status
curl http://localhost:8402/rate-limits

# Wait 60s and retry, or manually clear cooldowns
curl -X POST http://localhost:8402/rate-limits/reset
```

## Comparison to ClawRouter

| Feature | ClawRouter | SimpleLLMRouter |
|---------|------------|-----------------|
| Routing Logic | 14-dimension scoring | ✅ Same |
| Fallback Chain | Yes | ✅ Yes |
| Rate Limit Tracking | Yes | ✅ Yes |
| Cost Optimization | Yes | ❌ N/A (all free) |
| Quota Tracking | No | ✅ Added |
| Usage Monitoring | No | ✅ Added |
| Alert System | No | ✅ Added |
| Payment Layer | USDC micropayments | ❌ Removed |
| Wallet Required | Yes | ❌ No |
| Setup Complexity | High | ✅ Low |

## License

MIT

## Credits

Based on [ClawRouter](https://github.com/BlockRunAI/ClawRouter) by BlockRunAI. Refactored for free tier quota management with payment infrastructure removed.
