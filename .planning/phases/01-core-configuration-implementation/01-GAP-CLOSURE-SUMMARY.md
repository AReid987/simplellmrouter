---
phase: 01-core-configuration-implementation
created: 2026-02-16
status: planned
---

# Phase 1 Gap Closure Plans

**Created:** 2026-02-16
**Status:** Ready for execution
**Plans:** 3 gap closure plans (08, 09, 10)

## Gap Analysis Summary

Based on verification report (01-core-configuration-implementation-VERIFICATION.md), Phase 1 achieved a partial goal with 3/5 must-haves verified. The following critical gaps were identified:

### Critical Gap 1: Dual Provider Systems
**Problem:** Old hardcoded `PROVIDER_DEFINITIONS` in `src/providers.ts` (lines 51-298) still exists alongside new config system.

**Impact:**
- Application is NOT truly driven by external configuration
- Changes to config files may not affect runtime behavior
- Goal of "external configuration system" not achieved

**Solution:** Plan 09 removes hardcoded definitions and completes migration.

### Critical Gap 2: Test Failures
**Problem:** 12 tests failing because config files cannot be loaded in test environment.

**Details:**
- `src/config/index.test.ts` tests fail with "providers undefined" errors
- Config loader's fallback chain doesn't work in test context
- No integration test validates actual config file loading

**Solution:** Plan 08 fixes test mocks and adds real config file loading test.

### Critical Gap 3: Incomplete Integration
**Problem:** While `server.ts` uses `getEnabledProviders()`, old provider system still exists.

**Details:**
- `src/providers.ts` exports `loadAllProviders()` which is still tested
- Server tests mock old system, not new config system
- No migration path or deprecation plan for old system

**Solution:** Plan 09 removes old system, Plan 10 adds integration validation.

## Gap Closure Plans

### Plan 08: Fix Test Failures
**Wave:** 1
**Autonomous:** Yes
**Files Modified:**
- src/config/index.test.ts
- src/config/loader.ts
- src/config/index.ts

**Tasks:**
1. Fix test mock implementations for config loading (30m)
2. Add config loading test for actual config file (20m)
3. Improve test error messages and debugging (15m)

**Outcome:** All 12 failing tests now pass, config loading works in test environment.

### Plan 09: Remove Hardcoded Provider Definitions
**Wave:** 2 (depends on Plan 08)
**Autonomous:** Yes
**Files Modified:**
- src/providers.ts (reduce from 428 to ~150 lines)
- src/server.ts
- src/server.test.ts

**Tasks:**
1. Remove hardcoded PROVIDER_DEFINITIONS from providers.ts (30m)
2. Update server imports to use config module exclusively (20m)
3. Update server tests to use config system (30m)
4. Add deprecation notice to providers.ts utilities (15m)

**Outcome:** Application is 100% config-driven, no hardcoded provider data exists.

### Plan 10: Add End-to-End Integration Test
**Wave:** 3 (depends on Plan 08, 09)
**Autonomous:** No (includes human verification checkpoint)
**Files Modified:**
- src/config/integration.test.ts
- config/providers.yaml

**Tasks:**
1. Add end-to-end config loading test (30m)
2. Add environment override validation test (20m)
3. Add config validation error test (15m)
4. Manual verification of config system (checkpoint)

**Outcome:** Complete validation that config/providers.yaml drives application behavior.

## Execution Strategy

### Wave Structure
```
Wave 1: Plan 08 (fix tests) - can run in parallel with Conductor work
Wave 2: Plan 09 (remove old system) - depends on tests passing
Wave 3: Plan 10 (integration validation) - depends on config system being complete
```

### Coordination Requirements
**With Conductor Team:** None - these changes are isolated to the config and provider systems.

**Dependencies:**
- Plan 08 must complete before Plan 09 (tests must pass before removing old system)
- Plan 09 must complete before Plan 10 (integration test needs complete config system)

### Risk Mitigation
**Rollback Plan:** If Plan 09 breaks functionality, the git commits are atomic and can be reverted individually.

**Testing Strategy:**
- Each plan includes its own verification steps
- Plan 08 ensures tests pass before proceeding
- Plan 10 includes manual verification checkpoint
- Full test suite runs after each plan

## Expected Outcomes

### After Plan 08
- All 12 failing tests now pass
- Test mocks properly simulate config loading
- Real config file can be loaded in tests
- Better error messages for debugging

### After Plan 09
- No hardcoded provider definitions in codebase
- Application fully driven by config/providers.yaml
- Server uses getConfig() and getEnabledProviders()
- Deprecation notices guide future developers

### After Plan 10
- End-to-end integration test validates complete flow
- All 9 providers loadable from config
- Environment overrides validated
- Clear error messages for invalid config
- Manual verification confirms production readiness

## Success Criteria

**Verification Score Target:** 5/5 must-haves verified (up from 3/5)

**Specific Goals:**
1. ✓ config/providers.yaml exists (already verified)
2. ✓ Application reads and logs config on startup (already verified)
3. ✓ Application exits with descriptive error on invalid config (already verified)
4. ✓ Environment variables correctly override file values (already verified)
5. ✓ getConfig() returns Readonly<AppConfig> (already verified)
6. **NEW:** Tests pass validating the configuration system
7. **NEW:** Configuration system fully integrated with application

**Anti-Patterns Eliminated:**
- ✗ Hardcoded PROVIDER_DEFINITIONS (BLOCKER) → Removed
- ✗ Tests fail to load real config (BLOCKER) → Fixed
- ✗ Dual systems present (BLOCKER) → Single config system

## Next Steps

1. **Execute Plan 08:** `/gsd:execute-phase 01-core-configuration-implementation --plan=08`
2. **Execute Plan 09:** `/gsd:execute-phase 01-core-configuration-implementation --plan=09`
3. **Execute Plan 10:** `/gsd:execute-phase 01-core-configuration-implementation --plan=10`

After all plans complete, re-run verification:
```bash
/gsd:verify-phase 01-core-configuration-implementation
```

Expected result: 5/5 must-haves verified, Phase 1 complete.

---

_This gap closure plan addresses all critical gaps identified in verification report. All plans are ready for autonomous execution by gsd-executor._
