---
phase: 02-application-integration
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/router.ts]
autonomous: true

must_haves:
  truths:
    - "router.ts imports getConfig() from config module"
    - "routeRequest() calls getEnabledProviders() internally"
    - "router.ts type imports use config.Provider instead of providers.Provider"
    - "Router functions work without Provider[] parameter"
  artifacts:
    - path: "src/router.ts"
      provides: "Config-driven routing logic"
      imports: ["getConfig", "getEnabledProviders from './config/index.js'"]
      exports: ["routeRequest", "classifyRequest", "RateLimitTracker"]
  key_links:
    - from: "src/router.ts"
      to: "src/config/index.ts"
      via: "import { getConfig, getEnabledProviders }"
      pattern: "getEnabledProviders\\(\\)"
---

<objective>
Refactor router.ts to use the config system for accessing provider and model information.

**Purpose:** Complete the migration from hardcoded provider definitions to configuration-driven routing by updating the router module to access providers via the config system.

**Output:** router.ts refactored to use getConfig() and getEnabledProviders(), removing dependency on Provider[] parameter.
</objective>

<execution_context>
@/Users/antonioreid/.claude/get-shit-done/workflows/execute-plan.md
@/Users/antonioreid/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-core-configuration-implementation/01-10-SUMMARY.md

# Type imports from Phase 1
@src/config/schema.ts
@src/config/index.ts
</context>

<tasks>

<task type="auto">
  <name>Update router.ts type imports</name>
  <files>src/router.ts</files>
  <action>
    Update type imports in router.ts to use config types instead of providers.ts types:

    1. Replace: `import type { Provider, ModelConfig } from './providers.js';`
    2. With: `import type { Provider, ModelConfig } from './config/schema.js';`
    3. Add: `import { getConfig, getEnabledProviders } from './config/index.js';`

    Keep all other imports unchanged (logger remains from './lib/logging/logger.js').

    Why: The config schema exports the same types with identical structure. Using config types eliminates type duplication and creates a single source of truth.
  </action>
  <verify>grep -q "from './config/schema.js'" src/router.ts && grep -q "from './config/index.js'" src/router.ts</verify>
  <done>router.ts imports types from config/schema.js and functions from config/index.js</done>
</task>

<task type="auto">
  <name>Refactor routeRequest() to use config system</name>
  <files>src/router.ts</files>
  <action>
    Update the routeRequest() function signature and implementation:

    1. Remove `providers: Provider[]` parameter (line 220)
    2. Add internal call to `getEnabledProviders()` at start of function (line 226, before "Get all available models" comment)
    3. Replace all references to the `providers` parameter with local `providers` variable from getEnabledProviders()

    Implementation:
    ```typescript
    export function routeRequest(
      classification: RequestClassification,
      // Remove: providers: Provider[],
      rateLimitTracker: RateLimitTracker,
      config: RouterConfig = DEFAULT_ROUTER_CONFIG
    ): RoutingDecision {
      const { tier } = classification;

      // Add: Get providers from config system
      const providers = getEnabledProviders();

      // Rest of function unchanged...
      const allModels = providers.flatMap(/* ... */);
    }
    ```

    Why: This eliminates the need for callers to pass Provider[] and makes routing truly configuration-driven.
  </action>
  <verify>grep -A 5 "export function routeRequest" src/router.ts | grep -q "getEnabledProviders()"</verify>
  <done>routeRequest() calls getEnabledProviders() internally and has no Provider[] parameter</done>
</task>

<task type="auto">
  <name>Update server.ts to match new routeRequest() signature</name>
  <files>src/server.ts</files>
  <action>
    Update server.ts to call routeRequest() without providers parameter:

    1. Line 138: Change `routeRequest(classification, providers, rateLimitTracker, routerConfig)`
    2. To: `routeRequest(classification, rateLimitTracker, routerConfig)`

    Keep the providers variable in server.ts (line 267) for now - it's still needed for other operations like getModel() and /v1/models endpoint.

    Why: This aligns server.ts with the new routeRequest() signature. Providers array will be fully removed in later plans.
  </action>
  <verify>grep "routeRequest(classification, rateLimitTracker, routerConfig)" src/server.ts</verify>
  <done>server.ts calls routeRequest() without providers parameter</done>
</task>

</tasks>

<verification>
After completing all tasks, verify:

1. **Type consistency:** No type errors between config.Provider and providers.Provider
2. **Function signature:** routeRequest() has 3 parameters (not 4)
3. **Config access:** getEnabledProviders() called inside routeRequest()
4. **Import correctness:** All imports reference config module, not providers module

Run: `npm run build` to verify TypeScript compilation succeeds.
</verification>

<success_criteria>
- router.ts imports types from config/schema.js
- routeRequest() signature has no Provider[] parameter
- routeRequest() calls getEnabledProviders() internally
- server.ts updated to call routeRequest() without providers
- TypeScript compilation succeeds with no errors
- All existing tests still pass
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-integration/02-application-integration-01-SUMMARY.md` with:

1. Changes made to router.ts (import updates, function signature change, internal config access)
2. Changes made to server.ts (routeRequest() call update)
3. Test results (npm run build, npm test)
4. Any issues encountered and how they were resolved
</output>
