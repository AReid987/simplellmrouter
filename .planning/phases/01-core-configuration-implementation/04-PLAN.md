---
wave: 4
autonomous: true
gap_closure: false
---

# Plan 01-4: Main Config Module

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-4
**Wave:** 4
**Estimated:** 35 minutes

## Objective

Implement the central configuration module with singleton pattern, initializeConfig() async initializer, getConfig() type-safe accessor, and getEnabledProviders() filtered provider list.

## Must Haves

- ✅ src/config/index.ts with initializeConfig(), getConfig(), getEnabledProviders()
- ✅ Singleton pattern: initialize once, throw on re-initialization
- ✅ getConfig() returns Readonly<AppConfig>
- ✅ getEnabledProviders() filters by enabled flag and API key presence
- ✅ Config summary logged on initialization

## Context

### Parallel Work Awareness

Creates NEW file (src/config/index.ts) - no conflicts with Conductor team.

### Locked Implementation Decisions

From CONTEXT.md:
- Immutable Implementation: Type-level readonly (as const), no runtime enforcement
- API Key Behavior: Providers without keys are automatically excluded

## Tasks

### Task 1: Implement Config Initialization

**Priority:** P0 (Blocking)
**Estimated:** 20 minutes
**Dependencies:** Wave 3 (loader, validator, env-override)

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
2. Load config file (Wave 3, Task 2)
3. Apply env overrides (Wave 3, Task 1)
4. Validate result (Wave 3, Task 3)
5. On validation failure:
   - Display formatted errors (Wave 3, Task 4)
   - Throw error to stop application
6. On success: Store in internalConfig, log summary, return config
7. Remove providers without API keys from internalConfig.providers

**Logging:**
```
Configuration loaded:
  Environment: development
  Providers: 3 (mistral, groq, gemini)
  Server: localhost:8402
```

**Commit:** `feat(01-4): implement initializeConfig with validation`

**Verification:**
- [ ] Initializes on first call
- [ ] Throws on second call (already initialized)
- [ ] Logs configuration summary
- [ ] Exits on validation failure
- [ ] Filters out providers without API keys

---

### Task 2: Implement getConfig() Accessor

**Priority:** P0 (Blocking)
**Estimated:** 5 minutes
**Dependencies:** Task 1

**File:** `src/config/index.ts`

**Function Signature:**
```typescript
export function getConfig(): Readonly<AppConfig>
```

**Implementation Logic:**
1. Check if initialized
2. If not: throw ConfigNotInitializedError
3. Return internalConfig with Readonly wrapper

**Error Type:**
```typescript
export class ConfigNotInitializedError extends Error {
  constructor() {
    super('getConfig() called before initializeConfig(). Call initializeConfig() at application entry point.');
    this.name = 'ConfigNotInitializedError';
  }
}
```

**Commit:** `feat(01-4): implement getConfig type-safe accessor`

**Verification:**
- [ ] Returns config after initialization
- [ ] Throws before initialization
- [ ] Returned object has Readonly type
- [ ] TypeScript prevents mutation (compile-time)

---

### Task 3: Implement Provider Filtering

**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** Task 1

**File:** `src/config/index.ts`

**Function Signature:**
```typescript
export function getEnabledProviders(): Readonly<Provider[]>
```

**Implementation Logic:**
1. Get config via getConfig()
2. Filter providers where enabled === true
3. Return as readonly array

**Commit:** `feat(01-4): implement getEnabledProviders filter`

**Verification:**
- [ ] Only returns enabled providers
- [ ] Returns empty array if none enabled
- [ ] Array is readonly at type level

## Success Criteria

- [ ] initializeConfig() loads, validates, and stores config
- [ ] getConfig() provides type-safe readonly access
- [ ] getEnabledProviders() filters by enabled flag
- [ ] Config summary logged on initialization
- [ ] Re-initialization throws error
- [ ] Providers without API keys excluded
- [ ] All 3 functions exported from index.ts
