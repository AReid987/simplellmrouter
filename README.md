# SimpleLLMRouter

Intelligent LLM request router with quota-aware load balancing across multiple free-tier providers.

[![Tests](https://img.shields.io/badge/tests-87%2F87%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![GitHub](https://img.shields.io/badge/github-AReid987%2Fsimplellmrouter-blue)](https://github.com/AReid987/simplellmrouter)

## Quick Links

- **GitHub Repository:** https://github.com/AReid987/simplellmrouter
- **OpenClaw Integration Guide:** [OPENCLAW-INTEGRATION.md](./OPENCLAW-INTEGRATION.md)
- **Issue Tracker:** https://github.com/AReid987/simplellmrouter/issues

## Overview

SimpleLLMRouter provides intelligent routing of LLM requests across multiple free-tier providers, maximizing quota utilization through a tier-based classification system and automatic fallback chains.

### Key Features

- **Request Classification**: 14-dimension scoring assigns requests to tiers (SIMPLE/MEDIUM/COMPLEX/REASONING)
- **Quota Preservation**: Prioritizes providers with larger remaining quotas
- **Auto Fallback**: Automatic retry with next-best model on failure
- **Rate Limit Awareness**: 60s cooldown for rate-limited providers
- **Configuration Driven**: External YAML configuration for providers and models
- **OpenAI Compatible**: Drop-in API replacement for existing integrations

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌───────────────────┐
│   Request   │────▶│  Router     │────▶│  Provider (LLM)   │
│   (OpenAI   │     │  - Classify │     │                   │
│   format)   │     │  - Select   │     │  - Mistral        │
└─────────────┘     │  - Fallback │     │  - Groq           │
                    └─────────────┘     │  - Gemini         │
                          │              │  - etc.           │
                          ▼              └───────────────────┘
                    ┌─────────────┐
                    │ Config      │
                    │ (YAML)      │
                    └─────────────┘
```

### Configuration System

The router uses a hierarchical configuration system:

```
config/
├── providers.yaml              # Base configuration
├── providers.development.yaml  # Development overrides
└── providers.production.yaml   # Production overrides
```

Configuration is validated at startup using Zod schemas. Invalid configuration prevents application startup with descriptive error messages.

## Quick Start

### Installation

```bash
git clone <repository>
cd simplellmrouter
npm install
npm run build
```

### Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Add API keys for desired providers:
```bash
# config/.env
PROVIDER_MISTRAL_API_KEY=your-key
PROVIDER_GROQ_API_KEY=your-key
```

3. (Optional) Customize provider configuration:
```bash
# Edit config/providers.yaml
# Or create environment-specific overrides
```

### Running

```bash
# Development
npm run dev

# Production
npm start

# Custom port
npm start -- --port=9000
```

The router exposes an OpenAI-compatible API at `http://localhost:8402/v1`.

## Configuration Reference

### Environment Variables

Provider API keys use the format: `PROVIDER_{PROVIDER_ID}_API_KEY`

```bash
PROVIDER_MISTRAL_API_KEY=...
PROVIDER_GROQ_API_KEY=...
PROVIDER_GEMINI_API_KEY=...
```

Enable/disable providers:
```bash
PROVIDER_MISTRAL_ENABLED=true
PROVIDER_GROQ_ENABLED=false
```

### YAML Configuration

```yaml
server:
  port: 8402
  host: localhost

logging:
  level: info          # debug | info | warn | error
  format: pretty       # pretty | json

providers:
  mistral:
    id: mistral
    name: Mistral AI
    baseUrl: https://api.mistral.ai/v1
    enabled: true
    models:
      - id: mistral-large-latest
        name: Mistral Large
        contextWindow: 128000
        maxOutput: 8192
        capabilities: [function-calling, reasoning, code]
        quota:
          monthlyRequests: 1000000000
          quotaSize: huge
        tier: complex
```

### Configuration Loading Order

1. `config/providers.yaml` (base)
2. `config/providers.{NODE_ENV}.yaml` (environment overrides)
3. Environment variables (highest priority)

## API

### POST /v1/chat/completions

Standard OpenAI-compatible endpoint.

**Request:**
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

**Response:**
```json
{
  "id": "chatcmpl-...",
  "model": "mistral/mistral-large-latest",
  "choices": [...],
  "usage": {...},
  "x-router": {
    "tier": "MEDIUM",
    "confidence": 0.85,
    "quotaSize": "huge"
  }
}
```

### GET /health

Health check endpoint.

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

### GET /quota

Quota usage status.

```bash
curl http://localhost:8402/quota
```

## Routing Algorithm

### 1. Request Classification

Requests are scored across multiple dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Token count | Variable | Estimated prompt size |
| Code presence | +2 | Programming content detected |
| Reasoning keywords | +1 | Logic/analysis terms |
| Math content | +1 | Mathematical operations |
| Conversation depth | +1 | Multi-turn context |

**Tier Assignment:**
- **SIMPLE** (0-2): Facts, definitions
- **MEDIUM** (3-5): Analysis, code generation
- **COMPLEX** (6-9): Multi-step reasoning
- **REASONING** (10+): Deep analysis, planning

### 2. Model Selection

```
1. Filter: tier compatibility
2. Exclude: rate-limited providers
3. Sort: by quota size (huge > large > medium > small > tiny)
4. Select: best match
5. Generate: fallback chain (next 3 models)
```

### 3. Fallback Execution

If the primary model fails:
1. Mark provider as rate-limited (60s cooldown)
2. Retry with next model in fallback chain
3. Continue until success or chain exhausted

## Provider Quotas

| Provider | Quota Size | Daily Limit | Best For |
|----------|------------|-------------|----------|
| Mistral | huge | 1B/month | General purpose |
| Groq | large | 14.4K/day | Speed-critical |
| Gemini | large | 1.5K/day | Vision/multimodal |
| Cerebras | medium | ~2K/day | Balanced |
| OpenRouter | medium | ~1K/day | Fallback |
| VoidAI | small | ~500/day | Simple tasks |
| z.ai | tiny | ~100/day | Coding |
| Kimi | tiny | ~100/day | Reasoning |

## Development

### Project Structure

```
src/
├── config/           # Configuration system
│   ├── schema.ts     # Zod schemas
│   ├── loader.ts     # YAML loading
│   ├── validator.ts  # Validation
│   └── index.ts      # getConfig(), getEnabledProviders()
├── router.ts         # Request classification & routing
├── server.ts         # HTTP server
├── quota-tracker.ts  # Usage monitoring
└── cli.ts            # CLI interface

config/
├── providers.yaml              # Base config
├── providers.development.yaml  # Dev overrides
└── production.example.yaml     # Production template
```

### Building

```bash
npm run build        # TypeScript compilation
npm run build:watch  # Watch mode
```

### Testing

```bash
npm test             # Run all tests
npm test -- --coverage    # With coverage
npm test -- src/config    # Specific suite
```

### Debug Logging

```bash
LOG_LEVEL=debug npm start
```

## Troubleshooting

### Server won't start

Check for:
- Port conflicts: `lsof -i :8402`
- Invalid configuration: Review startup error messages
- Missing API keys: At least one provider key required

### No providers available

```bash
# Verify configuration
curl http://localhost:8402/health

# Check environment variables
grep PROVIDER_ .env
```

### Rate limiting issues

```bash
# Check rate limit status
curl http://localhost:8402/rate-limits

# View cooldown status in logs
LOG_LEVEL=debug npm start
```

## Configuration Migration

### From Hardcoded (v0.x)

The configuration refactor (v1.0) moved provider definitions from `src/providers.ts` to external YAML files.

**Migration steps:**
1. Copy `config/providers.yaml` as starting point
2. Add API keys to `.env` file
3. Customize provider settings in YAML
4. Remove old hardcoded definitions

No API changes - existing integrations continue to work.

## Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Classification latency | <1ms | ~0.5ms |
| Routing latency | <1ms | ~0.3ms |
| Startup time | <1s | ~550ms |
| Memory overhead | <5MB | ~2MB |

## Contributing

### Development Workflow

1. Create feature branch
2. Make changes with tests
3. Ensure all tests pass: `npm test`
4. Build: `npm run build`
5. Submit pull request

### Code Style

- TypeScript strict mode
- ESM modules with `.js` extensions
- Zod for runtime validation
- Jest for testing

## License

MIT

## Acknowledgments

Based on [ClawRouter](https://github.com/BlockRunAI/ClawRouter) by BlockRunAI. Refactored for configuration-driven architecture with external YAML support.
