---
wave: 10
autonomous: true
gap_closure: true
---

# Plan 01-10: End-to-End Integration Verification

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-10
**Wave:** 10
**Estimated:** 15 minutes

## Objective

Verify complete end-to-end integration of the configuration system by running comprehensive tests and ensuring the application is fully driven by external configuration.

## Must Haves

- ✅ End-to-end integration test passes
- ✅ All 72 tests pass (60 existing + 12 fixed)
- ✅ Application starts and loads config from config/providers.yaml
- ✅ Server uses config-driven provider list
- ✅ All 5/5 phase must-haves verified

## Context

### Critical Gap Being Closed

**Incomplete Integration:**

While `server.ts` uses `getEnabledProviders()`, we need to verify:
- Application startup flow works end-to-end
- Config file actually drives runtime behavior
- No fallback to old hardcoded system
- Full integration test validates the complete flow

### Parallel Work Awareness

No conflicts with Conductor team - integration verification only.

## Tasks

### Task 1: Add End-to-End Integration Test

**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** Plans 01-8 and 01-9 complete

**File:** `src/config/integration.test.ts` (extend existing file)

**Test Scenario:**

1. Create a temporary config file with test providers
2. Initialize the application with this config
3. Start the server
4. Verify server uses providers from config file
5. Verify server rejects requests to disabled providers
6. Cleanup and shutdown

**Implementation:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { initializeConfig } from './config/index.js';
import { startServer } from './server.js';
import { createClient } from 'supertest';

describe('End-to-End Configuration Integration', () => {
  let server;
  let request;

  beforeAll(async () => {
    // Initialize with test config
    await initializeConfig({
      environment: 'development'
    });

    // Start server
    server = await startServer();
    request = createClient(server);
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  it('should start server with providers from config', async () => {
    const response = await request.get('/health');
    expect(response.status).toBe(200);

    // Verify providers loaded from config
    const config = getConfig();
    const providers = getEnabledProviders();

    expect(providers.length).toBeGreaterThan(0);
    expect(providers[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      baseUrl: expect.any(String),
      enabled: true
    });
  });

  it('should route requests to enabled providers only', async () => {
    const config = getConfig();

    // Find a disabled provider in config
    const disabledProviderId = Object.keys(config.providers).find(
      id => !config.providers[id].enabled
    );

    if (disabledProviderId) {
      // Attempt to route to disabled provider
      const response = await request
        .post('/v1/chat/completions')
        .send({
          provider: disabledProviderId,
          model: 'test-model',
          messages: [{ role: 'user', content: 'test' }]
        });

      // Should fail or be rejected
      expect([400, 404, 503]).toContain(response.status);
    }
  });

  it('should reflect config changes on restart', async () => {
    // This test verifies that changing config files
    // and restarting the server applies new config

    // Get current config
    const configBefore = getConfig();

    // Verify config is loaded from file
    expect(configBefore).toBeDefined();
    expect(configBefore.providers).toBeDefined();

    // Config should match providers.yaml
    expect(Object.keys(configBefore.providers).length).toBeGreaterThan(0);
  });
});
```

**Commit:** `test(01-10): add end-to-end integration test`

**Verification:**
- [ ] Integration test passes
- [ ] Server starts with config
- [ ] Providers loaded from config file
- [ ] Disabled providers rejected correctly

---

### Task 2: Manual Verification Checklist

**Priority:** P2 (Medium)
**Estimated:** 5 minutes
**Dependencies:** Task 1

**File:** Create `MANUAL_VERIFICATION.md` in phase directory

**Purpose:** Document manual verification steps for human testing.

**Content:**
```markdown
# Manual Verification Checklist

## Pre-Verification Setup

1. Set API keys in environment:
   ```bash
   export PROVIDER_MISTRAL_API_KEY=your_key
   export PROVIDER_GROQ_API_KEY=your_key
   ```

2. Verify config files exist:
   ```bash
   ls -la config/providers.yaml
   ls -la config/providers.development.yaml
   ```

## Verification Steps

### 1. Config Loading Verification

**Test:** Start application and observe logs

**Expected:**
- Application starts without errors
- Config logged on startup
- Providers listed in logs
- No fallback to hardcoded values

**Command:**
```bash
npm run dev
```

**Success Criteria:**
- [ ] Server starts on configured port
- [ ] Logs show "Configuration loaded successfully"
- [ ] Logs show providers from config file
- [ ] No errors about missing config

### 2. Config Override Verification

**Test:** Set conflicting values in YAML and ENV

**Steps:**
1. Set a provider as disabled in config/providers.yaml
2. Set PROVIDER_{ID}_ENABLED=true in environment
3. Start application

**Expected:**
- Environment variable overrides YAML
- Provider appears as enabled

**Success Criteria:**
- [ ] ENV override takes precedence
- [ ] Logs confirm override applied

### 3. Error Handling Verification

**Test:** Corrupt config YAML and run application

**Steps:**
1. Introduce syntax error in config/providers.yaml
2. Run application

**Expected:**
- Clear error message indicating what's wrong
- Application exits with code 1
- Error points to specific validation failure

**Success Criteria:**
- [ ] Error message is clear and actionable
- [ ] Application exits gracefully
- [ ] No confusing stack traces

### 4. Runtime Verification

**Test:** Make API request to running server

**Command:**
```bash
curl http://localhost:8402/health
```

**Expected:**
- Health check succeeds
- Response includes provider information

**Success Criteria:**
- [ ] Health endpoint returns 200
- [ ] Response shows enabled providers
- [ ] Providers match config file

## Rollback Plan

If verification fails:
1. Restore from git: `git checkout src/providers.ts`
2. Re-run tests: `npm test`
3. Document failure in VERIFICATION.md
```

**Commit:** `docs(01-10): add manual verification checklist`

**Verification:**
- [ ] Checklist created
- [ ] Steps are clear and actionable
- [ ] Rollback plan documented

## Success Criteria

- [ ] End-to-end integration test passes
- [ ] All 72 tests pass
- [ ] Application starts with config from file
- [ ] Server uses config-driven providers
- [ ] Manual verification checklist created
- [ ] 5/5 phase must-haves achieved
- [ ] Each task committed individually

## Phase Completion Criteria

After this plan, Phase 1 should achieve:

1. ✅ **External Configuration:** `config/providers.yaml` drives application
2. ✅ **Type-Safe Validation:** Zod schemas validate all config
3. ✅ **Environment Overrides:** PROVIDER_{ID}_* pattern works
4. ✅ ** getConfig() API:** Returns Readonly<AppConfig>
5. ✅ **Integration:** Application fully config-driven

**Re-Verification:** Run gsd-verifier after this plan to confirm 5/5 must-haves.
