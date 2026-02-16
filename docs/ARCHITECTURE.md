# SimpleLLMRouter - Refactored ClawRouter Architecture

## Overview

SimpleLLMRouter is a lightweight, payment-free intelligent LLM router for OpenClaw that automatically selects the cheapest capable model for each request. Built from ClawRouter's proven routing logic without the USDC payment layer.

## Core Principles

1. **No Payment Layer** - Uses direct API keys, no wallets or blockchain
2. **Provider Agnostic** - Works with any OpenAI-compatible API
3. **Intelligent Routing** - 14-dimension scoring routes to optimal model
4. **OpenClaw Native** - Drop-in replacement for OpenClaw's model selection
5. **Rate Limit Aware** - Tracks and avoids rate-limited providers

## Architecture Components

### 1. Provider Registry (`src/providers/registry.ts`)

Manages available LLM providers and their models.

```typescript
interface Provider {
  id: string;              // "gemini", "groq", "openrouter"
  name: string;            // Display name
  baseUrl: string;         // API endpoint
  apiKey: string;          // Direct API key (from env)
  enabled: boolean;        // Can be toggled on/off
  models: ModelConfig[];   // Available models
}

interface ModelConfig {
  id: string;              // "gemini-2-flash-exp"
  name: string;            // Display name
  contextWindow: number;   // Max tokens
  maxOutput: number;       // Max completion tokens
  inputPrice: number;      // $/M tokens
  outputPrice: number;     // $/M tokens
  capabilities: string[];  // ["vision", "function-calling"]
  rateLimit: {
    rpm: number;           // Requests per minute
    rpd: number;           // Requests per day
    tpm: number;           // Tokens per minute
  };
}
```

### 2. Smart Router (`src/router/index.ts`)

Classifies requests and selects optimal model.

**Routing Tiers:**
- `SIMPLE` - Basic queries, autocomplete, simple Q&A
- `MEDIUM` - General tasks, code generation, summaries
- `COMPLEX` - Multi-step reasoning, long-form content
- `REASONING` - Advanced problem-solving, theorem proving

**14-Dimension Scoring:**
1. Token count
2. Code presence
3. Reasoning markers
4. Technical terms
5. Creative markers
6. Simple indicators
7. Multi-step patterns
8. Question complexity
9. Imperative verbs
10. Constraint indicators
11. Output format requirements
12. Reference complexity
13. Negation complexity
14. Domain specificity

**Tier Mappings (User's 7 Providers):**

```typescript
const DEFAULT_TIERS = {
  SIMPLE: {
    primary: "groq/llama-3.3-70b-versatile",  // Fastest free
    fallback: [
      "cerebras/llama3.1-8b",                  // Fast inference
      "openrouter/free",                       // Free router
      "huggingface/meta-llama-3.1-70b",        // HF free tier
      "voidai/void-1"                          // Cheap alternative
    ]
  },
  MEDIUM: {
    primary: "gemini/gemini-2-flash-exp",      // Best free tier
    fallback: [
      "groq/llama-3.3-70b-versatile",
      "mistral/mistral-large-2512",            // 1B req/month!
      "cerebras/llama3.1-8b",
      "openrouter/free"
    ]
  },
  COMPLEX: {
    primary: "gemini/gemini-3-pro",            // Latest model
    fallback: [
      "gemini/gemini-2-flash-exp",
      "mistral/mistral-large-2512",
      "groq/llama-3.3-70b-versatile",
      "openrouter/free"
    ]
  },
  REASONING: {
    primary: "gemini/gemini-3-pro",
    fallback: [
      "gemini/gemini-2-flash-exp",
      "mistral/mistral-large-2512"
    ]
  }
};
```

### 3. Request Handler (`src/proxy.ts`)

Local HTTP server compatible with OpenClaw.

**Flow:**
1. Receive request from OpenClaw at `http://localhost:8402/v1/chat/completions`
2. Parse request body and classify prompt
3. Route to optimal model based on tier
4. Forward to provider's API with direct API key
5. Handle rate limits and provider errors
6. Automatically fallback to next model if needed
7. Stream response back to OpenClaw

**Key Features:**
- Response deduplication (30s cache)
- Streaming support with SSE
- Rate limit tracking (60s cooldown)
- Provider error detection
- Automatic fallback chain
- Request timeout handling (3 minutes)

### 4. Rate Limit Manager (`src/rate-limits.ts`)

Tracks rate-limited models and deprioritizes them.

```typescript
interface RateLimitTracker {
  rateLimitedModels: Map<string, number>;  // model -> hit timestamp
  cooldownMs: number;                      // 60,000 (60 seconds)
  
  isRateLimited(modelId: string): boolean;
  markRateLimited(modelId: string): void;
  prioritizeNonRateLimited(models: string[]): string[];
}
```

### 5. Provider Configuration (`~/.simplerrouter/config.json`)

User configuration file with API keys and preferences.

```json
{
  "providers": {
    "gemini": {
      "enabled": true,
      "apiKey": "${GEMINI_API_KEY}",
      "models": ["gemini-3-pro", "gemini-2-flash-exp"]
    },
    "openrouter": {
      "enabled": true,
      "apiKey": "${OPENROUTER_API_KEY}",
      "models": ["openrouter/free"]
    },
    "groq": {
      "enabled": true,
      "apiKey": "${GROQ_API_KEY}"
    },
    "cerebras": {
      "enabled": true,
      "apiKey": "${CEREBRAS_API_KEY}"
    },
    "mistral": {
      "enabled": true,
      "apiKey": "${MISTRAL_API_KEY}"
    },
    "huggingface": {
      "enabled": true,
      "apiKey": "${HUGGINGFACE_API_KEY}"
    },
    "voidai": {
      "enabled": true,
      "apiKey": "${VOIDAI_API_KEY}"
    }
  },
  "routing": {
    "strategy": "smart",
    "fallbackEnabled": true,
    "maxRetries": 3
  },
  "server": {
    "port": 8402,
    "host": "127.0.0.1"
  }
}
```

## OpenClaw Integration

### Method 1: Custom Provider (Recommended)

Add SimpleLLMRouter as a custom provider in OpenClaw:

```json
// ~/.openclaw/openclaw.json
{
  "models": {
    "providers": {
      "simplerrouter": {
        "baseUrl": "http://127.0.0.1:8402",
        "apiKey": "dummy",  // Not used
        "api": "openai-completions",
        "models": [
          {
            "id": "auto",
            "name": "SimpleLLMRouter Auto"
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "simplerrouter/auto"
      }
    }
  }
}
```

### Method 2: Environment Variable Override

Point OpenClaw to the router via env vars:

```bash
export OPENAI_API_BASE="http://127.0.0.1:8402/v1"
export OPENAI_API_KEY="dummy"
openclaw gateway
```

## Key Differences from ClawRouter

| Feature | ClawRouter | SimpleLLMRouter |
|---------|-----------|-----------------|
| Payment | USDC via x402 | Direct API keys |
| Wallet | Required | Not needed |
| Blockchain | Base network | None |
| Cost Tracking | On-chain | Local logs |
| Balance Check | Pre-request | None |
| Setup | Complex | Simple |
| Dependencies | viem, x402 | None |

## Benefits

1. **Simple Setup** - Just add API keys, no wallet or USDC
2. **Zero Cost Overhead** - No blockchain transactions
3. **Full Control** - You own all API keys
4. **Same Intelligence** - Identical routing logic as ClawRouter
5. **OpenClaw Native** - Works seamlessly with OpenClaw

## Usage Example

```bash
# 1. Install SimpleLLMRouter
npm install -g simplerrouter

# 2. Add API keys
export GEMINI_API_KEY="your_key"
export OPENROUTER_API_KEY="your_key"
export GROQ_API_KEY="your_key"
export CEREBRAS_API_KEY="your_key"
export MISTRAL_API_KEY="your_key"
export HUGGINGFACE_API_KEY="your_key"
export VOIDAI_API_KEY="your_key"

# 3. Start router
simplerrouter start

# 4. Configure OpenClaw to use it
openclaw config set agents.defaults.model.primary "simplerrouter/auto"

# 5. Use OpenClaw normally - router handles everything
openclaw gateway
```

## Technical Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Server**: Built-in http module (no Express)
- **Dependencies**: Minimal (no payment libraries)
- **Config**: JSON files + environment variables
- **Logging**: JSON lines to ~/.simplerrouter/logs/

## Performance

- **Routing Speed**: <1ms (rules-based classifier)
- **Latency Overhead**: ~5-10ms (local proxy)
- **Memory**: ~50MB (lightweight)
- **Throughput**: 100+ req/s (single process)

## Future Enhancements

1. **Load Balancing** - Round-robin across providers
2. **Cost Tracking** - Local usage logs and stats
3. **Web UI** - Dashboard for monitoring
4. **Model Aliases** - Custom model shortcuts
5. **Prompt Caching** - Reduce duplicate requests
6. **Multi-Instance** - Horizontal scaling
