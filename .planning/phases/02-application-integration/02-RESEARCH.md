# Phase 02: Application Integration - Research

**Researched:** 2026-02-16
**Domain:** TypeScript Application Refactoring / Configuration-Driven Architecture
**Confidence:** HIGH

## Summary

Phase 02 focuses on completing the migration from hardcoded provider definitions to a fully configuration-driven routing system. The configuration system built in Phase 1 is production-ready with 87/87 tests passing. The remaining work involves refactoring the routing logic in `src/router.ts` and ensuring `src/server.ts` uses the config system exclusively.

**Current State Analysis:**
- **Config System:** Complete (src/config/index.ts provides getConfig() and getEnabledProviders())
- **Server Integration:** Partial (server.ts uses getEnabledProviders() but still imports getModel() from providers.ts)
- **Router Integration:** Not started (router.ts uses Provider type from providers.ts, not config)
- **Provider Utilities:** Deprecated with @deprecated notices (src/providers.ts reduced from 428 to 132 lines)

**Primary recommendation:** Replace all Provider type usage in router.ts with config system types, refactor routeRequest() to use getConfig() instead of Provider[] parameter, and update server.ts to eliminate dependencies on deprecated providers.ts utilities.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **TypeScript** | 5.3+ | Type system | Already in use, provides readonly types for immutability |
| **Zod** | 4.3.6 | Schema validation | Already in use from Phase 1, provides type inference |
| **YAML** | 2.8.2 | Config parsing | Already in use from Phase 1 for providers.yaml |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Jest** | 30.2.0 | Testing framework | Already in use, maintain existing test patterns |
| **supertest** | 7.2.2 | HTTP testing | Already in use for server.test.ts |
| **ts-jest** | 29.4.6 | TypeScript Jest | Already in use for test compilation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| N/A | N/A | Stack is already established from Phase 1 |

**Installation:** No new packages needed - all dependencies from Phase 1

## Architecture Patterns

### Recommended Project Structure (Current)
```
src/
├── config/              # Phase 1: Complete config system
│   ├── index.ts        # getConfig(), getEnabledProviders()
│   ├── schema.ts       # Zod schemas + TypeScript types
│   ├── loader.ts       # YAML loading
│   ├── env-override.ts # ENV variable overrides
│   └── validator.ts    # Schema validation
├── router.ts           # Phase 2: Refactor for config-driven routing
├── server.ts           # Phase 2: Complete config integration
├── cli.ts              # Already integrates config (initializeConfig())
├── providers.ts        # Phase 2: Deprecate/remove utilities
└── lib/
    └── logging/        # Conductor team's logging system
```

### Pattern 1: Configuration-Driven Routing
**What:** Router functions access configuration via getConfig() instead of receiving Provider[] as parameters.

**When to use:** When routing logic needs provider or model metadata.

**Example (Current vs. Target):**
```typescript
// CURRENT: router.ts receives Provider[] as parameter
export function routeRequest(
  classification: RequestClassification,
  providers: Provider[],  // ❌ From deprecated providers.ts
  rateLimitTracker: RateLimitTracker,
  config: RouterConfig = DEFAULT_ROUTER_CONFIG
): RoutingDecision {
  const allModels = providers.flatMap(/* ... */);
}

// TARGET: router.ts accesses config internally
export function routeRequest(
  classification: RequestClassification,
  rateLimitTracker: RateLimitTracker,
  config: RouterConfig = DEFAULT_ROUTER_CONFIG
): RoutingDecision {
  const providers = getEnabledProviders();  // ✅ From config system
  const allModels = providers.flatMap(/* ... */);
}
```

### Pattern 2: Type Unification
**What:** Use config system's Provider type (from src/config/schema.ts) instead of providers.ts Provider type.

**When to use:** All new code should use config types. Legacy code should migrate incrementally.

**Example:**
```typescript
// CURRENT: Mixed type imports
import type { Provider } from './providers.js';  // ❌ Deprecated
import { getConfig } from './config/index.js';

// TARGET: Unified type from config
import type { Provider } from './config/schema.js';  // ✅ Config types
import { getConfig, getEnabledProviders } from './config/index.js';
```

### Pattern 3: Server Integration
**What:** server.ts should use getEnabledProviders() directly and eliminate getModel() utility.

**When to use:** When server needs provider/model information.

**Example:**
```typescript
// CURRENT: server.ts uses getModel() utility
import { getModel } from './providers.js';  // ❌ Deprecated

const modelInfo = getModel(providers, modelId);
if (!modelInfo) { /* skip */ }
const { provider, model } = modelInfo;

// TARGET: server.ts uses config directly
import { getConfig } from './config/index.js';  // ✅ Config system

const config = getConfig();
const [providerId, modelName] = modelId.split('/');
const provider = config.providers[providerId];
if (!provider) { /* skip */ }
const model = provider.models.find(m => m.id === modelName);
```

### Anti-Patterns to Avoid
- **Type Duplication:** Don't maintain duplicate Provider types in both providers.ts and config/schema.ts - use one source of truth
- **Mixed Config Access:** Don't have some code use getConfig() and other code use Provider[] parameters - be consistent
- **Utility Hoarding:** Don't keep utilities in providers.ts "just in case" - if config system provides the capability, use it

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type compatibility between config.Provider and providers.Provider | Custom type conversion functions | Use config types everywhere | Duplicate types create maintenance burden and type errors |
| Model lookup by ID (provider/model) | Custom lookup logic in server.ts | Helper function in config module | Centralized lookup is easier to test and maintain |
| Provider filtering for API keys | Custom filtering logic | getEnabledProviders() from Phase 1 | Already tested and handles edge cases |

**Key insight:** The config system from Phase 1 already provides all necessary functionality. Don't rebuild it - use it.

## Common Pitfalls

### Pitfall 1: Breaking Type Safety During Migration
**What goes wrong:** Incremental migration creates type mismatches between old Provider type and new config.Provider type, causing TypeScript errors.

**Why it happens:** The two Provider types have similar shapes but aren't identical, causing implicit any conversions or type assertion usage.

**How to avoid:**
1. Use type from src/config/schema.ts everywhere
2. Run `tsc --noEmit` after each change to catch type errors
3. Update imports systematically (find/replace with validation)
4. Delete old type exports from providers.ts once migration complete

**Warning signs:** TypeScript `any` types, @ts-ignore comments, type assertions (as any)

### Pitfall 2: Test Mock Mismatches
**What goes wrong:** Tests mock old Provider[] structure but new code uses config shape, causing test failures.

**Why it happens:** Tests in src/server.test.ts mock providers with old structure but server.ts now expects config shape.

**How to avoid:**
1. Update test mocks to match new config.Provider structure
2. Use getEnabledProviders() in tests instead of hardcoded arrays
3. Keep test config files in tests/fixtures/ for consistency
4. Run tests after each integration step

**Warning signs:** Tests passing with mocks but failing in integration, test mocks not matching production data structures

### Pitfall 3: Breaking Hot Reload During Development
**What goes wrong:** Changes to config file don't reflect without server restart, confusing developers.

**Why it happens:** Phase 1 decision: Config loads once at startup (no hot reload). If this changes behavior unexpectedly, developers are confused.

**How to avoid:**
1. Document that config changes require restart (already in Phase 1)
2. Keep this behavior consistent - don't add hot reload in Phase 2
3. Add startup logging showing loaded config (already implemented)

**Warning signs:** Developers expecting config changes to take effect immediately, confusion about ENV overrides

### Pitfall 4: Circular Dependencies
**What goes wrong:** config/index.ts imports from providers.ts while providers.ts imports from config/index.ts.

**Why it happens:** Incremental migration creates temporary circular imports during transition.

**How to avoid:**
1. Never import from providers.ts in config module
2. Use type-only imports (import type) where possible
3. Move deprecated utilities to separate file if needed
4. Check for circular dependencies with `madge --circular src/`

**Warning signs:** Runtime errors about "before initialization", TypeScript errors about circular references

## Code Examples

Verified patterns from actual codebase:

### Accessing Config in Router Functions
```typescript
// Source: Current router.ts pattern (needs refactoring)
import { getEnabledProviders } from './config/index.js';

export function routeRequest(
  classification: RequestClassification,
  // Remove: providers: Provider[],
  rateLimitTracker: RateLimitTracker,
  config: RouterConfig = DEFAULT_ROUTER_CONFIG
): RoutingDecision {
  // Add: Get providers from config
  const providers = getEnabledProviders();

  const allModels = providers.flatMap(provider =>
    provider.models.map(model => ({
      provider,
      model,
      fullId: `${provider.id}/${model.id}`
    }))
  );
  // ... rest of routing logic unchanged
}
```

### Model Lookup in Server
```typescript
// Source: Current server.ts pattern (lines 160-167)
// Current: Uses getModel() from providers.ts
const modelInfo = getModel(providers, modelId);
if (!modelInfo) {
  logger.warn({ correlationId, modelId }, `Model ${modelId} not found, skipping`);
  continue;
}
const { provider, model } = modelInfo;

// Target: Direct lookup from config
const [providerId, modelName] = modelId.split('/');
const provider = config.providers[providerId];
if (!provider) {
  logger.warn({ correlationId, modelId }, `Provider ${providerId} not found, skipping`);
  continue;
}
const model = provider.models.find(m => m.id === modelName || m.id === modelId);
if (!model) {
  logger.warn({ correlationId, modelId }, `Model ${modelId} not found, skipping`);
  continue;
}
// Use provider and model directly
```

### Test Setup with Config
```typescript
// Source: src/server.test.ts (lines 76-136)
// Pattern: Mock config module, initialize before each test
jest.mock('./config/loader', () => ({
  loadConfigFile: jest.fn(),
}));
jest.mock('./config/env-override', () => ({
  applyEnvOverrides: jest.fn(),
}));
jest.mock('./config/validator', () => ({
  validateConfigOrThrow: jest.fn(),
}));

beforeEach(async () => {
  resetConfig();
  // Mock config to return test providers
  (validateConfigOrThrow as jest.Mock).mockImplementation(() => ({
    server: { port: 0, host: '127.0.0.1' },
    providers: {
      'test-provider': {
        id: 'test-provider',
        // ... full provider config
      }
    },
    providerConfig: {
      'test-provider': { apiKey: 'test-key', enabled: true }
    }
  }));
  await initializeConfig();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded PROVIDER_DEFINITIONS array | Config-driven providers.yaml | Phase 1 (2026-02-16) | Providers now external, no code changes needed to add providers |
| Provider type in providers.ts | Provider type in config/schema.ts | Phase 2 (in progress) | Single source of truth for types |
| Server receives Provider[] parameter | Server accesses getConfig() | Phase 2 (in progress) | Consistent config access pattern throughout codebase |
| getModel() utility in providers.ts | Direct config access or new helper | Phase 2 (in progress) | Eliminates deprecated utilities |

**Deprecated/outdated:**
- **src/providers.ts PROVIDER_DEFINITIONS:** Removed in Phase 1 gap closure (commit bd68cf1)
- **loadAllProviders() function:** Removed in Phase 1 gap closure (commit bd68cf1)
- **Provider type from providers.ts:** Should be removed after Phase 2 migration complete
- **getModel() utility:** Should be replaced with config-based lookup or removed

## Open Questions

1. **Should we create a helper function in config module for model lookup?**
   - What we know: server.ts uses getModel() from providers.ts, this needs to be replaced
   - What's unclear: Whether to add getModel() to config/index.ts or implement inline in server.ts
   - Recommendation: Add helper function `getModel(providerId: string, modelId: string)` to config module for reusability and testability

2. **Should we remove all deprecated utilities from providers.ts in Phase 2?**
   - What we know: providers.ts has @deprecated notices but functions are still used (e.g., getModel in server.ts)
   - What's unclear: Whether to remove in Phase 2 or deprecate gradually
   - Recommendation: Remove in Phase 2 once all consumers migrated - clean break is better than prolonged deprecation

3. **How to handle the type mismatch between config.Provider and providers.Provider?**
   - What we know: Both have similar shapes but aren't identical types
   - What's unclear: Whether to use type assertions or unify types first
   - Recommendation: Unify types by using config.Provider everywhere, delete old type export from providers.ts

## Sources

### Primary (HIGH confidence)
- **src/config/index.ts** - Config system implementation (getConfig, getEnabledProviders)
- **src/config/schema.ts** - Zod schemas and TypeScript types (Provider, ModelConfig, etc.)
- **src/router.ts** - Current routing implementation (needs refactoring)
- **src/server.ts** - Server integration (partial config usage, needs completion)
- **src/providers.ts** - Deprecated utilities with @deprecated notices
- **src/server.test.ts** - Test patterns using mocked config
- **.planning/phases/01-core-configuration-implementation/01-GAP-CLOSURE-SUMMARY.md** - Phase 1 completion status

### Secondary (MEDIUM confidence)
- **config/providers.yaml** - Example configuration with 8 providers
- **src/cli.ts** - Entry point showing initializeConfig() usage
- **package.json** - Dependencies and test scripts

### Tertiary (LOW confidence)
- None - all sources verified from actual codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies established in Phase 1, no new packages needed
- Architecture: HIGH - Patterns verified from actual codebase structure
- Pitfalls: HIGH - Identified from current code issues and Phase 1 lessons learned

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable architecture phase)

**Researcher notes:**
- Codebase is in excellent state for Phase 2: config system production-ready, all tests passing
- Key insight: This is a migration/refactoring phase, not new feature development
- Most work is in router.ts (algorithm refactoring) and server.ts (eliminate deprecated utilities)
- Test infrastructure is solid - just need to update mocks to match new patterns
- No coordination concerns with Conductor team (they work on logging, we work on config)
