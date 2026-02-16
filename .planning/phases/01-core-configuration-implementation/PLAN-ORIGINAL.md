# Phase 1: Core Configuration Implementation - Execution Plan

**Phase:** 1 - Core Configuration Implementation
**Status:** Ready to Execute
**Estimated Duration:** 3-4 hours
**Complexity:** Medium

## Parallel Work Context

**Important:** The Conductor team (Gemini CLI) is simultaneously implementing a logging and error reporting system. See `.planning/TEAMS.md` for coordination details.

**Impact on Phase 1:**
- ✅ **No conflicts:** Phase 1 creates only NEW files (src/config/, config/)
- ✅ **No dependencies:** Can proceed without waiting for Conductor team
- 📝 **Future consideration:** Config schema should be extensible for logging configuration in Phase 2

**Integration note:** When Phase 2 begins, coordinate with Conductor team to ensure logging system can be configured via the new config system.

---

## Executive Summary

Build a type-safe, external configuration system that loads provider settings from YAML files, validates them with Zod, and provides runtime access via a centralized `getConfig()` API. This phase establishes the foundational architecture for dynamic configuration management.

---

## Requirements to Fulfill

From REQUIREMENTS.md, Phase 1 must deliver:

| REQ | Description | Priority |
|-----|-------------|----------|
| REQ-CFG-01 | Load configuration from external file (YAML/JSON) | Critical |
| REQ-CFG-02 | Allow environment variables to override file values | Critical |
| REQ-CFG-03 | Support environment-specific configurations (development/production) | High |
| REQ-CFG-04 | Provide centralized, type-safe getConfig() access point | Critical |
| REQ-CFG-05 | Validate configuration against Zod schema at startup | Critical |
| REQ-CFG-06 | Ensure runtime configuration object is immutable | High |

---

## Locked Implementation Decisions

From CONTEXT.md, these decisions are **FINAL** and **MUST NOT** be revisited:

1. **Schema Structure:** Nested schemas (Provider, Model, Quota)
2. **Config Format:** YAML + JSON both supported
3. **ENV Override:** Exact key match (e.g., `PROVIDER_MISTRAL_API_KEY` → `providers.mistral.apiKey`)
4. **Validation:** Interactive fix - prompt user on validation errors
5. **File Location:** `config/` directory in project root
6. **Immutability:** Type-level readonly (`as const`), no runtime enforcement
7. **API Key Behavior:** Providers without keys are automatically excluded
8. **Hot Reload:** No - restart required for config changes
9. **Environment Files:** NODE_ENV based (`providers.development.yaml`, `providers.production.yaml`)
10. **Schema Extensibility:** Strict provider list only
11. **Secrets:** Env vars only, never in config files

---

## Success Criteria

1. [ ] `config/providers.yaml` exists with provider definitions
2. [ ] Application reads and logs config on startup
3. [ ] Application exits with descriptive error on invalid config
4. [ ] Environment variables correctly override file values
5. [ ] `src/config.ts` exposes `getConfig()` returning `Readonly<AppConfig>`

---

## Task Breakdown

### Wave 1: Foundation (Dependencies & Security)

#### Task 1.1: Install Dependencies
**Priority:** P0 (Blocking)
**Estimated:** 5 minutes
**Dependencies:** None

**Actions:**
```bash
pnpm add zod yaml dotenv
pnpm add -D @types/yaml
```

**Verification:**
- [ ] `package.json` contains `zod`, `yaml`, `dotenv`
- [ ] `pnpm list zod yaml dotenv` succeeds

---

#### Task 1.2: Security Setup (.gitignore)
**Priority:** P0 (Blocking)
**Estimated:** 2 minutes
**Dependencies:** None

**Actions:**
1. Create `.gitignore` if it doesn't exist
2. Add these patterns (in order of specificity):
   ```
   # Environment variables with secrets
   .env
   .env.local
   .env.*.local

   # Config files with sensitive data
   config/production.yaml
   config/*.production.yaml

   # But keep example files
   !.env.example
   !config/*.example.yaml
   ```

**Verification:**
- [ ] `.gitignore` exists with above patterns
- [ ] `git check-ignore .env` returns `.env`

---

#### Task 1.3: Create Example Files
**Priority:** P0 (Blocking)
**Estimated:** 5 minutes
**Dependencies:** Task 1.2

**Files to Create:**

**`.env.example`:**
```bash
# Provider API Keys
# Get keys from: https://docs.example.com/keys
MISTRAL_API_KEY=your_mistral_key_here
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
CEREBRAS_API_KEY=your_cerebras_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
VOIDAI_API_KEY=your_voidai_key_here
ZAI_API_KEY=your_zai_key_here
KIMI_API_KEY=your_kimi_key_here

# Server Configuration
PORT=8402
NODE_ENV=development
```

**Verification:**
- [ ] `.env.example` exists with all providers listed
- [ ] File is tracked by git (`git ls-files` shows it)

---

### Wave 2: Schema & Type System

#### Task 2.1: Define Zod Schemas
**Priority:** P0 (Blocking)
**Estimated:** 20 minutes
**Dependencies:** Task 1.1

**File:** `src/config/schema.ts`

**Schema Structure:**
```typescript
import { z } from 'zod';

// 1. Quota Schema
export const QuotaSchema = z.object({
  dailyRequests: z.number().optional(),
  monthlyRequests: z.number().optional(),
  rpm: z.number().optional(),
  tpm: z.number().optional(),
  quotaSize: z.enum(['tiny', 'small', 'medium', 'large', 'huge']),
});

// 2. Model Schema
export const ModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contextWindow: z.number().positive(),
  maxOutput: z.number().positive(),
  capabilities: z.array(z.string()),
  quota: QuotaSchema,
  tier: z.enum(['simple', 'medium', 'complex', 'reasoning']),
});

// 3. Provider Schema (without secrets)
export const ProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  enabled: z.boolean().default(true),
  models: z.array(ModelSchema).min(1, "Provider must have at least one model"),
});

// 4. Environment-specific Provider Config Schema
export const ProviderConfigSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  models: z.array(z.string()).optional(), // Restrict to specific models
});

// 5. Logging Config Schema (extensible for Conductor team integration)
export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'pretty']).default('pretty'),
  file: z.string().optional(),
  errorReporting: z.object({
    enabled: z.boolean().default(false),
    dsn: z.string().optional(),
    environment: z.string().default('development'),
  }).optional(),
}).optional();

// 6. Full App Config Schema
export const AppConfigSchema = z.object({
  server: z.object({
    port: z.number().positive().default(8402),
    host: z.string().default('localhost'),
  }),
  providers: z.record(z.string(), ProviderSchema),
  providerConfig: z.record(z.string(), ProviderConfigSchema).optional(),
  logging: LoggingConfigSchema, // Support for Conductor team's logging system
});

// 6. Type Inference
export type QuotaConfig = z.infer<typeof QuotaSchema>;
export type ModelConfig = z.infer<typeof ModelSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
```

**Verification:**
- [ ] `src/config/schema.ts` compiles without errors
- [ ] All types exported match their Zod schemas
- [ ] TypeScript intellisense shows correct types

---

### Wave 3: Configuration Loading

#### Task 3.1: Implement Environment Variable Override
**Priority:** P0 (Blocking)
**Estimated:** 15 minutes
**Dependencies:** Task 2.1

**File:** `src/config/env-override.ts`

**Function Signature:**
```typescript
export function applyEnvOverrides(
  config: z.infer<typeof AppConfigSchema>,
  prefix: string = 'PROVIDER'
): z.infer<typeof AppConfigSchema>
```

**Implementation Logic:**
1. Iterate through `config.providers`
2. For each provider, check for env vars:
   - `PROVIDER_{PROVIDER_ID}_API_KEY` → `providerConfig[providerId].apiKey`
   - `PROVIDER_{PROVIDER_ID}_ENABLED` → `providerConfig[providerId].enabled`
3. Convert string "true"/"false" to boolean for enabled flag
4. Return merged config

**Verification:**
- [ ] Unit test passes: `PROVIDER_MISTRAL_API_KEY=test` overrides config
- [ ] Unit test passes: `PROVIDER_MISTRAL_ENABLED=false` disables provider
- [ ] Non-existent providers are ignored

---

#### Task 3.2: Implement File Loader
**Priority:** P0 (Blocking)
**Estimated:** 20 minutes
**Dependencies:** Task 2.1

**File:** `src/config/loader.ts`

**Function Signature:**
```typescript
export async function loadConfigFile(
  environment?: 'development' | 'production'
): Promise<z.infer<typeof AppConfigSchema>>
```

**Implementation Logic:**
1. Determine environment (default: `process.env.NODE_ENV || 'development'`)
2. Build file path: `config/providers.{environment}.yaml`
3. Fallback chain:
   - `config/providers.{environment}.yaml`
   - `config/providers.yaml`
   - `config/providers.default.yaml`
4. Parse YAML with `yaml.parse()`
5. Return parsed object (validation happens later)

**Error Handling:**
- File not found: Throw with helpful message
- Invalid YAML: Throw with line number
- Empty file: Throw with file path

**Verification:**
- [ ] Loads `config/providers.development.yaml` when NODE_ENV=development
- [ ] Falls back to `config/providers.yaml` if env-specific missing
- [ ] Throws descriptive error for missing file
- [ ] Throws descriptive error for invalid YAML

---

#### Task 3.3: Implement Config Validator
**Priority:** P0 (Blocking)
**Estimated:** 15 minutes
**Dependencies:** Task 2.1, Task 3.2

**File:** `src/config/validator.ts`

**Function Signature:**
```typescript
export function validateConfig(
  rawConfig: unknown
): { success: true; data: AppConfig } | { success: false; errors: z.ZodError }
```

**Implementation Logic:**
1. Run `AppConfigSchema.safeParse(rawConfig)`
2. On success: Return `{ success: true, data: parsedConfig }`
3. On failure: Return `{ success: false, errors: zodError }`
4. Format errors for display (see Task 3.4)

**Error Formatting:**
- Group errors by path
- Show expected vs received
- Highlight line numbers if available

**Verification:**
- [ ] Valid config passes validation
- [ ] Invalid provider ID returns descriptive error
- [ ] Missing required field returns field name and expected type
- [ ] Invalid quota size returns enum values

---

#### Task 3.4: Implement Interactive Error Display
**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** Task 3.3

**File:** `src/config/validator.ts` (export function)

**Function Signature:**
```typescript
export function formatValidationErrors(
  errors: z.ZodError
): string
```

**Output Format:**
```
Configuration validation failed:

Provider 'mistral':
  ✗ models[0].quota.quotaSize: Invalid enum value. Expected 'tiny' | 'small' | 'medium' | 'large' | 'huge', received 'invalid'

Server configuration:
  ✗ server.port: Expected number, received string

Fix these issues and restart the server.
```

**Verification:**
- [ ] Error output is human-readable
- [ ] Each error shows path, expected, received
- [ ] Suggestion message included at end

---

### Wave 4: Main Config Module

#### Task 4.1: Implement Config Initialization
**Priority:** P0 (Blocking)
**Estimated:** 20 minutes
**Dependencies:** Task 3.1, Task 3.2, Task 3.3

**File:** `src/config/index.ts`

**Function Signature:**
```typescript
let internalConfig: AppConfig | null = null;

export async function initializeConfig(
  options?: { environment?: 'development' | 'production' }
): Promise<AppConfig>
```

**Implementation Logic:**
1. Check if already initialized (throw if so)
2. Load config file (Task 3.2)
3. Apply env overrides (Task 3.1)
4. Validate result (Task 3.3)
5. On validation failure:
   - Display formatted errors (Task 3.4)
   - Throw error to stop application
6. On success: Store in `internalConfig`, log summary, return config
7. Remove providers without API keys from `internalConfig.providers`

**Logging:**
```
Configuration loaded:
  Environment: development
  Providers: 3 (mistral, groq, gemini)
  Server: localhost:8402
```

**Verification:**
- [ ] Initializes on first call
- [ ] Throws on second call (already initialized)
- [ ] Logs configuration summary
- [ ] Exits on validation failure
- [ ] Filters out providers without API keys

---

#### Task 4.2: Implement getConfig() Accessor
**Priority:** P0 (Blocking)
**Estimated:** 5 minutes
**Dependencies:** Task 4.1

**File:** `src/config/index.ts`

**Function Signature:**
```typescript
export function getConfig(): Readonly<AppConfig>
```

**Implementation Logic:**
1. Check if initialized
2. If not: throw `ConfigNotInitializedError`
3. Return `internalConfig` with `Readonly` wrapper

**Error Type:**
```typescript
export class ConfigNotInitializedError extends Error {
  constructor() {
    super('getConfig() called before initializeConfig(). Call initializeConfig() at application entry point.');
    this.name = 'ConfigNotInitializedError';
  }
}
```

**Verification:**
- [ ] Returns config after initialization
- [ ] Throws before initialization
- [ ] Returned object has `Readonly` type
- [ ] TypeScript prevents mutation (compile-time)

---

#### Task 4.3: Implement Provider Filtering
**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** Task 4.1

**File:** `src/config/index.ts`

**Function Signature:**
```typescript
export function getEnabledProviders(): Readonly<Provider[]>
```

**Implementation Logic:**
1. Get config via `getConfig()`
2. Filter providers where `enabled === true`
3. Return as readonly array

**Verification:**
- [ ] Only returns enabled providers
- [ ] Returns empty array if none enabled
- [ ] Array is readonly at type level

---

### Wave 5: Configuration Files

#### Task 5.1: Create Default Provider Config
**Priority:** P0 (Blocking)
**Estimated:** 15 minutes
**Dependencies:** Task 2.1

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
      # ... (mirror src/providers.ts structure)

  groq:
    # ... (same structure)

  gemini:
    # ... (same structure)

  cerebras:
    # ... (same structure)

  openrouter:
    # ... (same structure)

  voidai:
    # ... (same structure)

  zai:
    # ... (same structure)

  kimi:
    # ... (same structure)
```

**Verification:**
- [ ] All 9 providers from `src/providers.ts` included
- [ ] YAML is valid (`yaml.parse()` succeeds)
- [ ] Passes `AppConfigSchema` validation

---

#### Task 5.2: Create Development Config
**Priority:** P1 (High)
**Estimated:** 5 minutes
**Dependencies:** Task 5.1

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
  # Others can be disabled for faster startup
```

**Verification:**
- [ ] Overrides port for development
- [ ] Enables subset of providers
- [ ] Merges with default config

---

#### Task 5.3: Create Production Config Template
**Priority:** P2 (Medium)
**Estimated:** 5 minutes
**Dependencies:** Task 5.1

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
  # Enable all production providers
```

**Note:** This file is tracked by git as a template

**Verification:**
- [ ] File exists in git
- [ ] Contains production-ready defaults
- [ ] Commented instructions present

---

### Wave 6: Integration

#### Task 6.1: Update CLI Entry Point
**Priority:** P0 (Blocking)
**Estimated:** 10 minutes
**Dependencies:** Task 4.1, Task 4.2

**File:** `src/cli.ts`

**Changes:**
```typescript
import { initializeConfig } from './config/index.js';

// In start command handler:
if (command === 'start' || !command) {
  const portArg = args.find(arg => arg.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]) : undefined;

  console.log('SimpleLLMRouter v1.0.0');
  console.log('Intelligent LLM routing for OpenClaw\n');

  // NEW: Initialize config first
  const config = await initializeConfig();

  startServer({ config }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
```

**Verification:**
- [ ] CLI calls `initializeConfig()` before `startServer()`
- [ ] Config is logged on startup
- [ ] Server receives config object
- [ ] Exits on config validation failure

---

#### Task 6.2: Update Server Module
**Priority:** P0 (Blocking)
**Estimated:** 10 minutes
**Dependencies:** Task 6.1

**File:** `src/server.ts`

**Changes:**
1. Import `getConfig()` from config
2. Remove hardcoded provider loading
3. Use `getEnabledProviders()` from config

**Before:**
```typescript
import { loadAllProviders } from './providers.js';

const providers = loadAllProviders();
```

**After:**
```typescript
import { getConfig, getEnabledProviders } from './config/index.js';

const config = getConfig();
const providers = getEnabledProviders();
```

**Verification:**
- [ ] Server imports from `./config/index.js`
- [ ] No direct env access in server.ts
- [ ] Providers come from config module

---

### Wave 7: Testing & Documentation

#### Task 7.1: Write Unit Tests
**Priority:** P1 (High)
**Estimated:** 30 minutes
**Dependencies:** Task 4.2

**File:** `src/config/index.test.ts`

**Test Cases:**
1. **Schema Validation:**
   - Valid config passes
   - Invalid provider ID fails
   - Missing required field fails
   - Invalid quota size fails

2. **Env Override:**
   - API key override works
   - Enabled flag override works
   - Non-existent provider ignored

3. **File Loading:**
   - Loads environment-specific config
   - Falls back to default config
   - Throws on missing file

4. **Initialization:**
   - First call succeeds
   - Second call throws
   - getConfig() throws before init
   - getConfig() returns after init

5. **Provider Filtering:**
   - Returns only enabled providers
   - Returns empty array if none

**Verification:**
- [ ] All tests pass (`pnpm test`)
- [ ] Coverage > 80% for config module

---

#### Task 7.2: Write Integration Test
**Priority:** P2 (Medium)
**Estimated:** 20 minutes
**Dependencies:** Task 6.1

**File:** `src/config/integration.test.ts`

**Test Scenario:**
1. Create temporary config file
2. Set env vars
3. Initialize config
4. Verify providers loaded
5. Verify env overrides applied
6. Cleanup

**Verification:**
- [ ] Test passes end-to-end
- [ ] Config file loaded successfully
- [ ] Env vars override file values

---

#### Task 7.3: Update README Documentation
**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** Task 5.1

**File:** `README.md` (create if needed)

**Section to Add:**
```markdown
## Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

\`\`\`bash
cp .env.example .env
\`\`\`

Set your API keys:

\`\`\`bash
MISTRAL_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
\`\`\`

### Provider Configuration

Edit \`config/providers.yaml\` to customize:

- Enable/disable providers
- Adjust quota limits
- Configure models

### Environment-Specific Configs

- Development: \`config/providers.development.yaml\`
- Production: \`config/providers.production.yaml\`

The appropriate file is loaded based on \`NODE_ENV\`.
\`\`\`

**Verification:**
- [ ] README includes configuration section
- [ ] All env vars documented
- [ ] File locations documented

---

## Dependency Graph

```
Wave 1 (Foundation)
├─ Task 1.1 (Install Dependencies) ──────────────┐
├─ Task 1.2 (.gitignore) ────────────────────────┤
└─ Task 1.3 (.env.example) ──────────────────────┤
                                                   │
Wave 2 (Schema)                                    │
└─ Task 2.1 (Zod Schemas) ◄───────────────────────┘
                                                   │
Wave 3 (Loading)                                   │
├─ Task 3.1 (Env Override) ◄──────────────────────┤
├─ Task 3.2 (File Loader) ◄───────────────────────┤
├─ Task 3.3 (Validator) ◄─────────────────────────┤
└─ Task 3.4 (Error Display) ◄─────────────────────┤
                                                   │
Wave 4 (Main Module)                               │
├─ Task 4.1 (Initialization) ◄─────────────────────┤
├─ Task 4.2 (getConfig) ◄──────────────────────────┤
└─ Task 4.3 (Provider Filter) ◄────────────────────┤
                                                   │
Wave 5 (Config Files)                              │
├─ Task 5.1 (Default Config) ◄─────────────────────┤
├─ Task 5.2 (Dev Config) ◄─────────────────────────┤
└─ Task 5.3 (Prod Template) ◄──────────────────────┤
                                                   │
Wave 6 (Integration)                               │
├─ Task 6.1 (Update CLI) ◄─────────────────────────┤
└─ Task 6.2 (Update Server) ◄──────────────────────┤
                                                   │
Wave 7 (Testing)                                   │
├─ Task 7.1 (Unit Tests) ◄─────────────────────────┤
├─ Task 7.2 (Integration Tests) ◄──────────────────┤
└─ Task 7.3 (Documentation) ◄──────────────────────┘
```

---

## Execution Order

**Sequential Execution (Must Complete in Order):**

1. **Setup Block** (30 min): Tasks 1.1 → 1.2 → 1.3
2. **Schema Block** (20 min): Task 2.1
3. **Loading Block** (50 min): Tasks 3.1 → 3.2 → 3.3 → 3.4
4. **Module Block** (35 min): Tasks 4.1 → 4.2 → 4.3
5. **Config Block** (25 min): Tasks 5.1 → 5.2 → 5.3
6. **Integration Block** (20 min): Tasks 6.1 → 6.2
7. **Testing Block** (60 min): Tasks 7.1 → 7.2 → 7.3

**Total Estimated Time:** ~4 hours

---

## Verification Checklist

Complete after all tasks:

**Functionality:**
- [ ] Application starts without errors
- [ ] Configuration is logged on startup
- [ ] Providers load from config file
- [ ] Environment variables override file values
- [ ] Invalid config causes graceful shutdown
- [ ] Providers without API keys are excluded

**Type Safety:**
- [ ] No `any` types in config module
- [ ] All types inferred from Zod schemas
- [ ] `getConfig()` returns `Readonly<AppConfig>`
- [ ] TypeScript compilation succeeds

**Security:**
- [ ] `.env` in `.gitignore`
- [ ] No API keys committed to git
- [ ] `.env.example` provides template

**Testing:**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Coverage > 80% for config module

**Documentation:**
- [ ] README updated with config instructions
- [ ] All env vars documented
- [ ] File structure documented

---

## Rollback Strategy

If Phase 1 fails:

1. **Revert Changes:**
   ```bash
   git checkout -- src/ config/
   git clean -fd config/
   ```

2. **Remove Dependencies:**
   ```bash
   pnpm remove zod yaml dotenv
   ```

3. **Restore Original:**
   - Application continues using `src/providers.ts`
   - No production impact

4. **Document Failure:**
   - Create issue describing failure point
   - Note which task failed
   - Attach error logs

---

## Known Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Zod schema mismatch with current interfaces | Medium | Medium | Use existing interfaces from `src/providers.ts` as reference |
| YAML file becomes invalid during merge | Low | High | Add pre-commit hook for YAML validation |
| Env var naming conflicts | Low | Medium | Use strict `PROVIDER_` prefix |
| Immutable type still allows runtime mutation | Low | Low | Document clearly in code comments |
| Config file location confusion | Medium | Low | Log exact file path on startup |

---

## Next Phase Preview

**Phase 2: Provider Migration**
- Refactor `src/providers.ts` to use config system
- Remove hardcoded `PROVIDER_DEFINITIONS`
- Update all consumers to use `getConfig()`
- Eliminate prop-drilling in server/router

---

**Plan Status:** Complete
**Ready for Execution:** Yes
**Last Updated:** 2026-02-16
