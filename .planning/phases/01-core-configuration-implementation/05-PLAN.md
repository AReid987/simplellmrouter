---
wave: 5
autonomous: true
gap_closure: false
---

# Plan 01-5: Configuration Files

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-5
**Wave:** 5
**Estimated:** 25 minutes

## Objective

Create YAML configuration files for default provider definitions, development environment overrides, and production template. All files follow the Zod schema defined in Wave 2.

## Must Haves

- ✅ config/providers.yaml with all 9 providers from src/providers.ts
- ✅ config/providers.development.yaml with development overrides
- ✅ config/production.example.yaml with production template
- ✅ All files valid YAML and pass AppConfigSchema validation
- ✅ Logging config section for Conductor team integration

## Context

### Parallel Work Awareness

Creates NEW files in config/ directory - no conflicts with Conductor team.

### Locked Implementation Decisions

From CONTEXT.md:
- File Location: config/ directory in project root
- Environment Files: NODE_ENV based (providers.development.yaml, providers.production.yaml)

## Tasks

### Task 1: Create Default Provider Config

**Priority:** P0 (Blocking)
**Estimated:** 15 minutes
**Dependencies:** Wave 2 (schema defined)

**File:** `config/providers.yaml`

**Content Structure:**
```yaml
server:
  port: 8402
  host: localhost

# Logging configuration (supports Conductor team's logging system)
logging:
  level: info
  format: pretty
  # file: logs/router.log  # Optional file logging
  # errorReporting:        # Optional external error reporting (e.g., Sentry)
  #   enabled: false
  #   dsn: ""
  #   environment: development

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

  groq:
    id: groq
    name: Groq
    baseUrl: https://api.groq.com/openai/v1
    enabled: true
    models:
      - id: llama-3.3-70b-versatile
        name: Llama 3.3 70B Versatile
        contextWindow: 131072
        maxOutput: 8192
        capabilities: [function-calling, reasoning, code]
        quota:
          dailyRequests: 14400
          rpm: 30
          quotaSize: small
        tier: medium

  gemini:
    id: gemini
    name: Gemini
    baseUrl: https://generativelanguage.googleapis.com/v1beta
    enabled: true
    models:
      - id: gemini-2.5-flash
        name: Gemini 2.5 Flash
        contextWindow: 1000000
        maxOutput: 8192
        capabilities: [function-calling, reasoning, code]
        quota:
          dailyRequests: 1500
          rpm: 15
          quotaSize: small
        tier: simple

  # Continue for cerebras, openrouter, voidai, zai, kimi...
```

**Note:** Mirror structure from src/providers.ts PROVIDER_DEFINITIONS

**Commit:** `docs(01-5): create default provider config`

**Verification:**
- [ ] All 9 providers from src/providers.ts included
- [ ] YAML is valid (yaml.parse() succeeds)
- [ ] Passes AppConfigSchema validation
- [ ] Logging config section included

---

### Task 2: Create Development Config

**Priority:** P1 (High)
**Estimated:** 5 minutes
**Dependencies:** Task 1

**File:** `config/providers.development.yaml`

**Content:**
```yaml
# Development overrides
server:
  port: 8402

providers:
  mistral:
    enabled: true
  groq:
    enabled: true
  gemini:
    enabled: true
  # Others disabled for faster startup
```

**Commit:** `docs(01-5): create development config overrides`

**Verification:**
- [ ] Overrides port for development
- [ ] Enables subset of providers
- [ ] Merges with default config

---

### Task 3: Create Production Config Template

**Priority:** P2 (Medium)
**Estimated:** 5 minutes
**Dependencies:** Task 1

**File:** `config/production.example.yaml`

**Content:**
```yaml
# Production configuration
# Copy to config/providers.production.yaml and customize

server:
  port: 80
  host: 0.0.0.0

providers:
  mistral:
    enabled: true
  groq:
    enabled: true
  gemini:
    enabled: true
  # Enable all production providers
```

**Note:** This file is tracked by git as a template

**Commit:** `docs(01-5): create production config template`

**Verification:**
- [ ] File exists in git
- [ ] Contains production-ready defaults
- [ ] Commented instructions present

## Success Criteria

- [ ] config/providers.yaml created with all 9 providers
- [ ] config/providers.development.yaml with dev overrides
- [ ] config/production.example.yaml template
- [ ] All files valid YAML
- [ ] All files pass schema validation
- [ ] Logging config section included
- [ ] Each file committed individually
