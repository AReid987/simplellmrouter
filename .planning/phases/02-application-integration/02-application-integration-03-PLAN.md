---
phase: 02-application-integration
plan: 03
type: execute
wave: 2
depends_on: ["02-application-integration-01", "02-application-integration-02"]
files_modified: [src/providers.ts]
autonomous: true

must_haves:
  truths:
    - "providers.ts exports only types (QuotaConfig, ModelConfig, Provider, ProviderConfig)"
    - "All utility functions (getModel, getAllModels, validateProviders) are removed"
    - "File has @deprecated notice at top indicating migration to config system"
    - "No other files import from providers.ts (except for types)"
  artifacts:
    - path: "src/providers.ts"
      provides: "Type definitions only (deprecated, use config types instead)"
      exports: ["QuotaConfig", "ModelConfig", "Provider", "ProviderConfig"]
      contains: "@deprecated comment"
  key_links:
    - from: "src/providers.ts"
      to: "src/config/schema.ts"
      via: "Type re-export for backward compatibility"
      pattern: "export type.*=.*import"
---

<objective>
Remove all deprecated utility functions from providers.ts and mark types as deprecated.

**Purpose:** Clean up providers.ts by removing functions that have been replaced by the config system, keeping only type exports for backward compatibility during transition.

**Output:** providers.ts reduced to type exports only, with @deprecated notices directing to config module.
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
</context>

<tasks>

<task type="auto">
  <name>Verify no files import utilities from providers.ts</name>
  <files>src/**/*.ts</files>
  <action>
    Before removing functions, verify they're not being used anywhere in the codebase:

    Run these checks:
    1. `grep -r "from.*providers" src/ --include="*.ts"` - Find all imports
    2. `grep -r "getModel(" src/ --include="*.ts"` - Verify no calls to getModel
    3. `grep -r "getAllModels(" src/ --include="*.ts"` - Verify no calls to getAllModels
    4. `grep -r "validateProviders(" src/ --include="*.ts"` - Verify no calls to validateProviders
    5. `grep -r "loadProviderConfig(" src/ --include="*.ts"` - Verify no calls to loadProviderConfig

    If any imports or calls are found (excluding src/providers.ts itself), update those files first before proceeding.

    Expected result: Only src/providers.ts should reference these functions, and no other files should import them.

    Why: Safety check to prevent breaking imports before removing the exports.
  </action>
  <verify>! grep -r "getModel(" src/ --include="*.ts" | grep -v "src/providers.ts"</verify>
  <done>No files outside providers.ts call the utility functions</done>
</task>

<task type="auto">
  <name>Remove utility functions from providers.ts</name>
  <files>src/providers.ts</files>
  <action>
    Remove all function implementations from providers.ts, keeping only type exports:

    1. Remove these functions completely (lines 42-132):
       - loadProviderConfig()
       - getModel()
       - getAllModels()
       - validateProviders()

    2. Replace file content with type re-exports from config module:
    ```typescript
    /**
     * Provider Type Definitions
     *
     * @deprecated These types are now exported from src/config/schema.ts.
     * Import types from './config/schema.js' instead.
     * This file is kept for backward compatibility during the migration period.
     */

    // Re-export types from config module for backward compatibility
    export type { QuotaConfig, ModelConfig, Provider, ProviderConfig } from './config/schema.js';
    ```

    3. Add typescript-eslint disable comment if needed:
    ```typescript
    /* eslint-disable @typescript-eslint/no-redeclare */
    ```

    Why: The config module exports identical types. Re-exporting from config module maintains backward compatibility while directing developers to the new location.
  </action>
  <verify>wc -l src/providers.ts | awk '{print $1}' | xargs -I {} sh -c '[ {} -lt 20 ]'</verify>
  <done>providers.ts is now less than 20 lines (only type re-exports)</done>
</task>

<task type="auto">
  <name>Update any remaining type imports to use config module</name>
  <files>src/**/*.ts</files>
  <action>
    Update any remaining imports from providers.ts to use config module:

    For each file that imports from providers.ts:
    1. Replace: `import type { ... } from './providers.js';`
    2. With: `import type { ... } from './config/schema.js';`

    Check all TypeScript files:
    ```bash
    grep -r "import.*from.*providers" src/ --include="*.ts" | grep -v "node_modules"
    ```

    If imports are found, update them systematically. Common files that might need updates:
    - src/router.ts (should already be done in plan 01)
    - src/server.ts (should already be done in plan 02)
    - src/cli.ts (might need updating)
    - src/**/*.test.ts files (might need updating)

    Why: Complete the migration to config types. The providers.ts file is now just a compatibility shim.
  </action>
  <verify>! grep -r "import.*from.*providers" src/ --include="*.ts" | grep -v "src/providers.ts"</verify>
  <done>No files (except providers.ts itself) import from providers.ts</done>
</task>

<task type="auto">
  <name>Add deprecation notice to providers.ts</name>
  <files>src/providers.ts</files>
  <action>
    Ensure the file has a clear deprecation notice at the top:

    ```typescript
    /**
     * Provider Type Definitions
     *
     * @deprecated This file is deprecated. Use src/config/schema.ts instead.
     *
     * Type definitions for providers and models.
     *
     * Migration guide:
     * - Replace: import type { Provider } from './providers.js';
     * - With: import type { Provider } from './config/schema.js';
     *
     * This file will be removed in a future version.
     */

    // Re-export types from config module for backward compatibility
    export type { QuotaConfig, ModelConfig, Provider, ProviderConfig } from './config/schema.js';
    ```

    Why: Clear documentation helps developers understand the migration path and why this file exists.
  </action>
  <verify>grep -q "@deprecated" src/providers.ts && grep -q "Migration guide" src/providers.ts</verify>
  <done>providers.ts has clear deprecation notice with migration guide</done>
</task>

</tasks>

<verification>
After completing all tasks, verify:

1. **File size:** providers.ts is very small (< 20 lines, just type re-exports)
2. **No utility functions:** grep shows no function definitions
3. **No imports:** No other files import from providers.ts (except possibly tests)
4. **Deprecation notice:** File clearly indicates it's deprecated
5. **Type compatibility:** All type imports work correctly

Run: `npm run build` and `npm test` to ensure nothing breaks.
</verification>

<success_criteria>
- providers.ts contains only type re-exports from config module
- All utility functions removed (getModel, getAllModels, validateProviders, loadProviderConfig)
- File has clear @deprecated notice with migration guide
- No runtime code depends on providers.ts utilities
- All tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-integration/02-application-integration-03-SUMMARY.md` with:

1. List of functions removed from providers.ts
2. Final content of providers.ts (should be ~15 lines)
3. Files that had imports updated (if any)
4. Test results confirming nothing broke
5. Recommendation for when to delete providers.ts entirely
</output>
