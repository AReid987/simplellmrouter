---
wave: 6
autonomous: true
gap_closure: false
---

# Plan 01-6: Integration

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-6
**Wave:** 6
**Estimated:** 20 minutes

## Objective

Integrate the configuration system into the application by updating the CLI entry point to initialize config and the server module to use getConfig() and getEnabledProviders().

## Must Haves

- ✅ src/cli.ts calls initializeConfig() before startServer()
- ✅ src/server.ts uses getConfig() and getEnabledProviders()
- ✅ Removed hardcoded provider loading from server.ts
- ✅ Config logged on application startup
- ✅ Application exits on config validation failure

## Context

### Parallel Work Awareness

⚠️ **MODIFIES EXISTING FILES**: src/cli.ts and src/server.ts

**Coordination Check:**
- Conductor team is modifying these same files for logging system
- Current status: Conductor Phase 3 in progress (Quota/Rate Limit Logging)
- **Action Required:** Check coordination state before modifying

### Integration Strategy

Since Conductor team is working on logging integration in these files:
1. Read their latest work from git
2. Merge config integration with logging changes
3. Ensure both systems coexist
4. No conflicts - config and logging are separate concerns

## Tasks

### Task 1: Update CLI Entry Point

**Priority:** P0 (Blocking)
**Estimated:** 10 minutes
**Dependencies:** Wave 4 (initializeConfig available)

**File:** `src/cli.ts`

**Changes:**
```typescript
import { initializeConfig } from './config/index.js';

// In start command handler:
if (command === 'start' || !command) {
  const portArg = args.find(arg => arg.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]) : undefined;

  console.log('SimpleLLMRouter v1.0.0');
  console.log('Intelligent LLM routing for OpenClaw\n');

  // NEW: Initialize config first
  const config = await initializeConfig();

  startServer({ config }).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
```

**Commit:** `feat(01-6): integrate initializeConfig in CLI`

**Verification:**
- [ ] CLI calls initializeConfig() before startServer()
- [ ] Config is logged on startup
- [ ] Server receives config object
- [ ] Exits on config validation failure

---

### Task 2: Update Server Module

**Priority:** P0 (Blocking)
**Estimated:** 10 minutes
**Dependencies:** Task 1

**File:** `src/server.ts`

**Changes:**
1. Import getConfig() from config
2. Remove hardcoded provider loading
3. Use getEnabledProviders() from config

**Before:**
```typescript
import { loadAllProviders } from './providers.js';

const providers = loadAllProviders();
```

**After:**
```typescript
import { getConfig, getEnabledProviders } from './config/index.js';

const config = getConfig();
const providers = getEnabledProviders();
```

**Commit:** `feat(01-6): integrate config in server module`

**Verification:**
- [ ] Server imports from ./config/index.js
- [ ] No direct env access in server.ts
- [ ] Providers come from config module
- [ ] Preserves Conductor team's logging changes

## Success Criteria

- [ ] CLI initializes config before starting server
- [ ] Server uses getConfig() for all config access
- [ ] Server uses getEnabledProviders() instead of loadAllProviders()
- [ ] Config logged on startup with provider count
- [ ] Validation failure exits application
- [ ] Conductor team's logging integration preserved
- [ ] Both config and logging systems work together
