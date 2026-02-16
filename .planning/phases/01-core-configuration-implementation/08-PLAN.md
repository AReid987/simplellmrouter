---
wave: 8
autonomous: true
gap_closure: true
---

# Plan 01-8: Remove Hardcoded Provider Definitions

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-8
**Wave:** 8
**Estimated:** 20 minutes

## Objective

Remove the old hardcoded `PROVIDER_DEFINITIONS` from `src/providers.ts` (lines 51-298) and migrate to the new configuration-driven provider loading system.

## Must Haves

- ✅ Old `PROVIDER_DEFINITIONS` constant removed from src/providers.ts
- ✅ All provider data loaded from config system via getConfig()
- ✅ Tests updated to use config system instead of mocking old system
- ✅ All imports of `loadAllProviders()` updated to use `getEnabledProviders()`
- ✅ Build succeeds with no references to old provider system

## Context

### Critical Gap Being Closed

**Dual Provider Systems Problem:**

The old hardcoded `PROVIDER_DEFINITIONS` in `src/providers.ts` (lines 51-298) still exists alongside the new config system. This means:
- The application is NOT truly driven by external configuration
- Changes to config files may not affect runtime behavior
- The goal of "external configuration system" is not achieved

### Parallel Work Awareness

No conflicts expected with Conductor team - this only modifies `src/providers.ts` which is not in their scope.

### Migration Strategy

1. Export `getEnabledProviders()` from `src/providers.ts` as the primary API
2. Remove `loadAllProviders()` export after verifying no external usage
3. Keep `Provider` type definition (needed by config system)
4. Update all tests to use config system

## Tasks

### Task 1: Remove Hardcoded Provider Definitions

**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** None

**File:** `src/providers.ts`

**Action:** Remove lines 51-298 (the `PROVIDER_DEFINITIONS` constant)

**Before:**
```typescript
export const PROVIDER_DEFINITIONS: Record<string, Provider> = {
  mistral: { /* ... */ },
  groq: { /* ... */ },
  // ... 9 providers total
};
```

**After:**
```typescript
// Provider type definition remains
export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: Model[];
  enabled: boolean;
  quota: QuotaConfig;
}

// Export config-driven provider accessor
export { getEnabledProviders } from './config/index.js';
```

**Commit:** `refactor(01-8): remove hardcoded PROVIDER_DEFINITIONS`

**Verification:**
- [ ] PROVIDER_DEFINITIONS constant removed
- [ ] Provider type definition still exists
- [ ] getEnabledProviders() re-exported from config
- [ ] TypeScript compilation succeeds

---

### Task 2: Update Imports from loadAllProviders to getEnabledProviders

**Priority:** P1 (High)
**Estimated:** 5 minutes
**Dependencies:** Task 1

**Files to Update:**
- `src/server.ts` (line 12)
- `src/server.test.ts` (mock references)
- Any other files importing `loadAllProviders`

**Changes:**
```typescript
// Old
import { loadAllProviders } from './providers.js';

// New
import { getEnabledProviders } from './providers.js';

// Usage (no change needed - API is compatible)
const providers = getEnabledProviders();
```

**Commit:** `refactor(01-8): migrate imports to getEnabledProviders`

**Verification:**
- [ ] No imports of `loadAllProviders` remain
- [ ] All imports use `getEnabledProviders`
- [ ] TypeScript compilation succeeds

---

### Task 3: Update Tests to Use Config System

**Priority:** P2 (Medium)
**Estimated:** 5 minutes
**Dependencies:** Task 2

**File:** `src/server.test.ts`

**Action:** Update mocks to use config system instead of mocking old `loadAllProviders`

**Before:**
```typescript
jest.mock('./providers', () => ({
  loadAllProviders: jest.fn().mockReturnValue([
    // mock providers
  ]),
}));
```

**After:**
```typescript
jest.mock('./config', () => ({
  getEnabledProviders: jest.fn().mockReturnValue([
    // mock providers
  ]),
}));
```

**Commit:** `test(01-8): update mocks to use config system`

**Verification:**
- [ ] Tests mock getEnabledProviders instead of loadAllProviders
- [ ] Mock providers match config schema
- [ ] TypeScript compilation succeeds

## Success Criteria

- [ ] PROVIDER_DEFINITIONS constant removed from src/providers.ts
- [ ] No references to loadAllProviders() remain
- [ ] All code uses getEnabledProviders() from config system
- [ ] Tests updated and passing
- [ ] Build succeeds with no errors
- [ ] Application fully driven by external configuration
- [ ] Each task committed individually

## Integration Notes

**Next Step:** After this plan, execute Plan 01-9 to fix test failures by ensuring config loading works in test environment.
