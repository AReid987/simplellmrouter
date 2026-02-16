---
phase: 02-application-integration
plan: 02
type: execute
wave: 1
depends_on: []
files_modified: [src/server.ts]
autonomous: true

must_haves:
  truths:
    - "server.ts uses getConfig() for model lookup instead of getModel()"
    - "server.ts has no import from providers.ts"
    - "Model lookup logic is inline in handleChatCompletion()"
    - "Server successfully starts and serves requests"
  artifacts:
    - path: "src/server.ts"
      provides: "HTTP server with config-driven provider access"
      imports: ["getConfig from './config/index.js'"]
      exports: ["startServer"]
  key_links:
    - from: "src/server.ts"
      to: "src/config/index.ts"
      via: "getConfig() call"
      pattern: "getConfig\\(\\)"
    - from: "src/server.ts handleChatCompletion"
      to: "config.providers"
      via: "Direct config access"
      pattern: "config\\.providers\\["
---

<objective>
Eliminate server.ts dependency on providers.ts by replacing getModel() utility with direct config access.

**Purpose:** Remove the last import from providers.ts in server.ts, completing the migration to config-driven provider access.

**Output:** server.ts with no imports from providers.ts, using getConfig() for all provider and model information.
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

# Research context
@.planning/phases/02-application-integration/02-application-integration-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Add config access to server.ts startup</name>
  <files>src/server.ts</files>
  <action>
    Ensure getConfig() is called in startServer() and config is available throughout:

    1. Line 266 already has `const config = getConfig();` - keep this
    2. Pass config as parameter to handleChatCompletion() function

    Update handleChatCompletion signature (line 97):
    ```typescript
    // From:
    async function handleChatCompletion(
      req: IncomingMessage,
      res: ServerResponse,
      providers: Provider[],
      rateLimitTracker: RateLimitTracker,
      routerConfig: RouterConfig
    ): Promise<void>

    // To:
    async function handleChatCompletion(
      req: IncomingMessage,
      res: ServerResponse,
      providers: Provider[],
      rateLimitTracker: RateLimitTracker,
      routerConfig: RouterConfig,
      config: AppConfig  // Add config parameter
    ): Promise<void>
    ```

    Why: Config needs to be available inside handleChatCompletion for model lookup. AppConfig type should be imported from './config/schema.js'.
  </action>
  <verify>grep -q "config: AppConfig" src/server.ts</verify>
  <done>handleChatCompletion() accepts config parameter of type AppConfig</done>
</task>

<task type="auto">
  <name>Replace getModel() with inline config lookup</name>
  <files>src/server.ts</files>
  <action>
    Replace the getModel() utility call (lines 161-167) with inline config-based lookup:

    ```typescript
    // Current code (replace lines 161-167):
    const modelInfo = getModel(providers, modelId);
    if (!modelInfo) {
      logger.warn({ correlationId, modelId }, `Model ${modelId} not found, skipping`);
      continue;
    }
    const { provider, model } = modelInfo;

    // New implementation:
    // Parse modelId: "provider/model" or just "model"
    const [providerId, ...modelParts] = modelId.split('/');
    const modelName = modelParts.join('/');

    // Find provider in config
    const providerObj = providers.find(p => p.id === providerId);
    if (!providerObj) {
      logger.warn({ correlationId, modelId }, `Provider ${providerId} not found, skipping`);
      continue;
    }

    // Find model in provider
    const model = providerObj.models.find(m => m.id === modelName || m.id === modelId);
    if (!model) {
      logger.warn({ correlationId, modelId }, `Model ${modelId} not found in provider ${providerId}, skipping`);
      continue;
    }

    // Use providerObj directly (no destructuring needed)
    ```

    Then update the makeProviderRequest call (line 170-175):
    ```typescript
    // Change: provider -> providerObj
    const response = await makeProviderRequest(
      providerObj,  // Was: provider
      model.id,
      requestData,
      controller.signal
    );
    ```

    Why: getModel() is a deprecated utility from providers.ts. Inline lookup using the providers array (which comes from getEnabledProviders()) is cleaner and eliminates the dependency.
  </action>
  <verify>! grep -q "getModel(" src/server.ts</verify>
  <done>server.ts has no calls to getModel() utility</done>
</task>

<task type="auto">
  <name>Remove providers.ts import from server.ts</name>
  <files>src/server.ts</files>
  <action>
    Remove the import from providers.ts and add missing type imports:

    1. Remove line 11: `import { getModel, type Provider } from './providers.js';`
    2. Add type imports from config:
       ```typescript
       import type { Provider, ModelConfig, AppConfig } from './config/schema.js';
       ```
    3. Keep existing imports: getConfig, getEnabledProviders from './config/index.js'
    4. Keep existing imports: routeRequest, RateLimitTracker, DEFAULT_ROUTER_CONFIG, RouterConfig, classifyRequest from './router.js'

    Why: All types and utilities are now available from the config module. The Provider type from config/schema.js is identical to the one from providers.ts.
  </action>
  <verify>! grep -q "from './providers.js'" src/server.ts && grep -q "from './config/schema.js'" src/server.ts</verify>
  <done>server.ts imports types from config/schema.js, not from providers.ts</done>
</task>

<task type="auto">
  <name>Update handleChatCompletion caller to pass config</name>
  <files>src/server.ts</files>
  <action>
    Update the call to handleChatCompletion (line 321) to pass the config parameter:

    ```typescript
    // From:
    await handleChatCompletion(req, res, providers, rateLimitTracker, routerConfig);

    // To:
    await handleChatCompletion(req, res, providers, rateLimitTracker, routerConfig, config);
    ```

    The config variable is already available at line 266 in startServer().

    Why: Now that handleChatCompletion requires config parameter, the call site must pass it.
  </action>
  <verify>grep "handleChatCompletion(req, res, providers, rateLimitTracker, routerConfig, config)" src/server.ts</verify>
  <done>handleChatCompletion called with all 6 parameters including config</done>
</task>

</tasks>

<verification>
After completing all tasks, verify:

1. **No providers.ts imports:** `grep -r "from.*providers" src/server.ts` returns nothing
2. **Model lookup works:** Inline lookup logic handles both "provider/model" and "model" formats
3. **Type safety:** TypeScript compilation succeeds with AppConfig type
4. **Config parameter:** handleChatCompletion signature includes config parameter

Run: `npm run build` and `npm test` to verify compilation and tests pass.
</verification>

<success_criteria>
- server.ts has zero imports from providers.ts
- getModel() utility completely removed from server.ts
- Inline model lookup using providers array from getEnabledProviders()
- TypeScript compilation succeeds
- All tests pass
</success_criteria>

<output>
After completion, create `.planning/phases/02-application-integration/02-application-integration-02-SUMMARY.md` with:

1. Changes made to server.ts (imports, function signatures, model lookup)
2. Before/after comparison of model lookup logic
3. Test results (npm run build, npm test)
4. Any issues with model ID parsing and how they were resolved
</output>
