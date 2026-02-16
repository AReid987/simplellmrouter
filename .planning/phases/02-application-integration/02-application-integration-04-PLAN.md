---
phase: 02-application-integration
plan: 04
type: execute
wave: 2
depends_on: ["02-application-integration-01", "02-application-integration-02", "02-application-integration-03"]
files_modified: [src/server.test.ts, src/config/index.test.ts]
autonomous: true

must_haves:
  truths:
    - "All tests pass (npm test)"
    - "Test mocks use config module, not providers.ts"
    - "Integration tests load real config files"
    - "Server test uses getConfig() and getEnabledProviders()"
  artifacts:
    - path: "src/server.test.ts"
      provides: "Server integration tests with config-driven setup"
      contains: "jest.mock('./config')"
    - path: "src/config/index.test.ts"
      provides: "Config module tests (already passing from Phase 1)"
      contains: "describe('Config Module')"
  key_links:
    - from: "src/server.test.ts"
      to: "src/config/index.ts"
      via: "Mocked config module"
      pattern: "jest\\.mock\\('./config"
    - from: "src/server.test.ts"
      to: "src/server.ts"
      via: "Integration test coverage"
      pattern: "describe.*Server"
---

<objective>
Update all tests to use config module mocks and verify end-to-end integration works correctly.

**Purpose:** Ensure test suite reflects the new config-driven architecture, with proper mocking of the config module and integration tests validating the complete flow.

**Output:** Updated test suite with all tests passing, using config module mocks and real config files for integration tests.
</objective>

<execution_context>
@/Users/antonioreid/.claude/get-shit-done/workflows/execute-plan.md
@/Users/antonioreid/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-core-configuration-implementation/01-10-SUMMARY.md
@.planning/phases/02-application-integration/02-application-integration-01-SUMMARY.md
@.planning/phases/02-application-integration/02-application-integration-02-SUMMARY.md
@.planning/phases/02-application-integration/02-application-integration-03-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Run tests and identify failures</name>
  <files>src/**/*.test.ts</files>
  <action>
    Run the test suite to identify any failures from the refactoring:

    1. Run: `npm test`
    2. Note which test suites fail
    3. Note specific test failures and their error messages
    4. Categorize failures:
       - Type errors (need type updates)
       - Mock mismatches (test mocks expect old structure)
       - Import errors (need import updates)

    Expected: Some tests may fail due to the refactoring in plans 01-03. This is normal and will be fixed in this plan.

    Why: Need to understand what's broken before fixing it.
  </action>
  <verify>npm test 2>&1 | tee /tmp/test-output.txt; grep -E "(FAIL|PASS|Tests:)" /tmp/test-output.txt</verify>
  <done>Test failures identified and categorized</done>
</task>

<task type="auto">
  <name>Update server.test.ts to use config module mocks</name>
  <files>src/server.test.ts</files>
  <action>
    Update server test mocks to reflect the config-driven architecture:

    1. Check current mock structure (lines 1-100 for setup)
    2. If tests mock providers.ts, update to mock config module instead:
       ```typescript
       // Replace providers.ts mocks with config mocks:
       jest.mock('./config/index.js', () => ({
         initializeConfig: jest.fn(),
         getConfig: jest.fn(),
         getEnabledProviders: jest.fn(),
         resetConfig: jest.fn(),
       }));

       // Import mocked functions
       import { initializeConfig, getConfig, getEnabledProviders, resetConfig } from './config/index.js';

       // In beforeEach, setup mock returns:
       const mockProviders = [
         {
           id: 'test-provider',
           name: 'Test Provider',
           baseUrl: 'https://api.test.com',
           apiKey: 'test-key',
           enabled: true,
           models: [
             {
               id: 'test-model',
               name: 'Test Model',
               contextWindow: 8000,
               maxOutput: 4000,
               capabilities: ['chat'],
               quota: { quotaSize: 'medium' },
               tier: 'medium',
             }
           ]
         }
       ];

       (getConfig as jest.Mock).mockReturnValue({
         server: { port: 0, host: '127.0.0.1' },
         providers: { 'test-provider': mockProviders[0] },
         providerConfig: { 'test-provider': { apiKey: 'test-key', enabled: true } },
         logging: undefined,
       });

       (getEnabledProviders as jest.Mock).mockReturnValue(mockProviders);
       ```

    3. Remove any references to importing from providers.ts in tests

    Why: Tests should mock the config module, not providers.ts utilities.
  </action>
  <verify>grep -q "jest.mock('./config" src/server.test.ts</verify>
  <done>server.test.ts mocks config module instead of providers.ts</done>
</task>

<task type="auto">
  <name>Fix test assertions to match new behavior</name>
  <files>src/server.test.ts</files>
  <action>
    Update test assertions to reflect the config-driven behavior:

    For each failing test:
    1. Check what it's asserting
    2. Update assertion to match new structure
    3. Common changes:
       - Provider access via getConfig() instead of direct parameter
       - Model ID format: "provider/model" (may need updates)
       - Config structure matches AppConfig type

    Example fix for model lookup test:
    ```typescript
    // Old: Expected model lookup via getModel()
    // New: Expect inline lookup from providers array

    test('routes request to correct provider', async () => {
       // ... test setup
       // getConfig and getEnabledProviders mocked above

       const response = await fetch('/v1/chat/completions', {/* ... */});

       // Assertions now verify config was accessed:
       expect(getEnabledProviders).toHaveBeenCalled();
       expect(getConfig).toHaveBeenCalled();
    });
    ```

    Why: Test assertions must match the new implementation behavior.
  </action>
  <verify>npm test -- src/server.test.ts 2>&1 | grep -q "PASS"</verify>
  <done>All server.test.ts tests pass</done>
</task>

<task type="auto">
  <name>Verify integration tests use real config files</name>
  <files>src/**/*.integration.test.ts</files>
  <action>
    If integration tests exist, verify they load real config files:

    1. Find integration test files:
       ```bash
       find src -name "*.integration.test.ts" -o -name "*.e2e.test.ts"
       ```

    2. For each integration test:
       - Verify it calls `initializeConfig()` with test config path
       - Verify it doesn't mock the config module (real config loading)
       - Verify test fixtures exist in tests/fixtures/ or similar

    Example integration test setup:
    ```typescript
    import { initializeConfig, resetConfig } from './config/index.js';
    import path from 'node:path';

    describe('Server Integration', () => {
       beforeEach(async () => {
          resetConfig();
          await initializeConfig({
             environment: path.join(__dirname, 'fixtures', 'test-config.yaml')
          });
       });
    });
    ```

    3. If no integration tests exist, create one for end-to-end validation:
       - Test file: src/server.integration.test.ts
       - Test: Start server, make real request, verify response
       - Use test config file from tests/fixtures/

    Why: Integration tests validate the complete config loading and routing flow.
  </action>
  <verify>find src -name "*.integration.test.ts" -exec grep -l "initializeConfig" {} \;</verify>
  <done>Integration tests load real config files and validate end-to-end flow</done>
</task>

<task type="auto">
  <name>Run full test suite and verify all pass</name>
  <files>src/**/*.test.ts</files>
  <action>
    Run complete test suite and verify all tests pass:

    1. Run: `npm test`
    2. Verify output shows:
       - All test suites pass
       - No TypeScript errors
       - Test coverage acceptable (check if coverage command exists)

    3. If any tests still fail:
       - Check error messages carefully
       - Fix mocks or assertions
       - Re-run until all pass

    4. Run: `npm run build` to verify TypeScript compilation succeeds

    Expected result: All tests pass, no compilation errors.

    Why: Complete validation that the refactoring didn't break functionality.
  </action>
  <verify>npm test 2>&1 | tail -20; npm run build 2>&1 | tail -10</verify>
  <done>All tests pass, TypeScript compilation succeeds</done>
</task>

</tasks>

<verification>
After completing all tasks, verify:

1. **Test suite:** All tests pass (npm test shows green)
2. **Config mocks:** Tests mock config module, not providers.ts
3. **Integration coverage:** At least one integration test loads real config
4. **Type safety:** TypeScript compilation succeeds
5. **No warnings:** No deprecation warnings in test output

Run: `npm test` and review full output for any issues.
</verification>

<success_criteria>
- All tests pass (100% pass rate)
- No TypeScript compilation errors
- Tests use config module mocks appropriately
- Integration tests validate end-to-end config loading
- Test coverage maintained or improved
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-integration/02-application-integration-04-SUMMARY.md` with:

1. Test failures identified and how they were fixed
2. Changes made to test mocks and assertions
3. Integration test coverage (which tests validate what)
4. Final test results (number of tests, pass rate)
5. Any remaining test debt or improvements needed
</output>
