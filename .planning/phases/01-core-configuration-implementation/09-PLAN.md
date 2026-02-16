---
wave: 9
autonomous: true
gap_closure: true
---

# Plan 01-9: Fix Test Environment Config Loading

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-9
**Wave:** 9
**Estimated:** 30 minutes

## Objective

Fix the 12 failing tests by ensuring configuration files can be loaded in the test environment and config properly initializes before tests run.

## Must Haves

- ✅ All 12 failing tests now pass
- ✅ Config loading works in test environment
- ✅ Test setup properly initializes config before each test
- ✅ Tests can load actual config/providers.yaml
- ✅ Overall test coverage remains >80%

## Context

### Critical Gap Being Closed

**Test Failures:**

12 tests are failing because config files cannot be loaded in test environment:
- `src/config/index.test.ts` tests fail with "providers undefined" errors
- Config loader's fallback chain doesn't work in test context
- No integration test validates `config/providers.yaml` actually loads

### Root Cause Analysis

The config loader tries to load files from `config/` directory, but:
1. Jest runs from a different working directory
2. Test environment doesn't have NODE_ENV set properly
3. Config initialization happens in tests but file resolution fails

### Parallel Work Awareness

No conflicts with Conductor team - test-only changes.

## Tasks

### Task 1: Fix Config File Resolution in Tests

**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** None

**File:** `src/config/loader.ts`

**Problem:** The loader uses relative paths that don't resolve correctly when running from Jest's working directory.

**Solution:** Add a `configDir` parameter to override the default config directory path.

**Changes:**
```typescript
// Add parameter to loadConfigFile
export async function loadConfigFile(
  environment: string,
  configDir?: string
): Promise<Partial<AppConfig>> {
  // Use provided configDir or default
  const baseDir = configDir || path.join(process.cwd(), 'config');
  // ... rest of implementation
}
```

**Commit:** `fix(01-9): add configDir parameter to loader`

**Verification:**
- [ ] loader.ts accepts configDir parameter
- [ ] Default behavior unchanged (backward compatible)
- [ ] TypeScript compilation succeeds

---

### Task 2: Update Test Setup for Config Initialization

**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** Task 1

**File:** `src/config/index.test.ts`

**Action:** Update test setup to initialize config with proper paths before each test suite.

**Implementation:**
```typescript
import { initializeConfig } from './index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Config Module', () => {
  beforeAll(async () => {
    // Initialize config with test config directory
    await initializeConfig({
      environment: 'development',
      configDir: join(__dirname, '../../config')
    });
  });

  // ... tests
});
```

**Commit:** `test(01-9): fix config initialization in tests`

**Verification:**
- [ ] Config initializes before tests run
- [ ] Config directory path resolves correctly
- [ ] Tests can access config via getConfig()

---

### Task 3: Fix Failing Unit Tests

**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** Task 2

**Files:**
- `src/config/index.test.ts`
- `src/config/integration.test.ts`

**Actions:**

1. **Fix schema validation tests** - Ensure they use initialized config
2. **Fix env override tests** - Mock process.env properly
3. **Fix file loading tests** - Use test config directory
4. **Fix initialization tests** - Handle singleton pattern correctly

**Example Fix:**
```typescript
it('should return enabled providers', () => {
  const config = getConfig();
  const providers = getEnabledProviders();

  expect(providers).toBeDefined();
  expect(Array.isArray(providers)).toBe(true);
  // Verify at least one provider is enabled
  expect(providers.length).toBeGreaterThan(0);
});
```

**Commit:** `test(01-9): fix failing config tests`

**Verification:**
- [ ] All 12 previously failing tests now pass
- [ ] New tests don't break existing passing tests
- [ ] Test coverage remains >80%

---

### Task 4: Add Integration Test for Config File Loading

**Priority:** P2 (Medium)
**Estimated:** 5 minutes
**Dependencies:** Task 3

**File:** `src/config/integration.test.ts`

**Action:** Add test that validates actual `config/providers.yaml` can be loaded.

**Implementation:**
```typescript
it('should load actual config providers.yaml file', async () => {
  const config = await initializeConfig({
    environment: 'development'
  });

  expect(config).toBeDefined();
  expect(config.providers).toBeDefined();

  // Verify expected providers exist
  const providerIds = Object.keys(config.providers);
  expect(providerIds).toContain('mistral');
  expect(providerIds).toContain('groq');
  expect(providerIds).toContain('gemini');

  // Verify provider structure
  const mistral = config.providers.mistral;
  expect(mistral.id).toBe('mistral');
  expect(mistral.baseUrl).toBeDefined();
  expect(mistral.models).toBeInstanceOf(Array);
});
```

**Commit:** `test(01-9): add integration test for config file loading`

**Verification:**
- [ ] Test passes with actual config file
- [ ] All expected providers loaded
- [ ] Provider structure validates correctly
- [ ] Test is idempotent (can run multiple times)

## Success Criteria

- [ ] All 12 previously failing tests now pass
- [ ] Config loading works in test environment
- [ ] Test coverage remains >80%
- [ ] Integration test validates actual config file loading
- [ ] No new test failures introduced
- [ ] Each task committed individually

## Integration Notes

**Dependencies:**
- Must execute after Plan 01-8 (remove old provider system)
- Enables Plan 01-10 (integration verification)

**Expected Test Results After This Plan:**
- 72 passing tests (60 existing + 12 fixed)
- 0 failing tests
- Coverage >80% for config module
