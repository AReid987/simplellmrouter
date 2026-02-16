# Roadmap: SimpleLLMRouter Configuration Refactor

## Parallel Work Notice

**Two teams are working concurrently:**

1. **GSD Team (Hive Mind):** Configuration system refactor (this roadmap)
2. **Conductor Team:** Logging and error reporting system

See `.planning/TEAMS.md` for detailed coordination status and integration strategy.

---

## Overview
This roadmap outlines the project to refactor the SimpleLLMRouter's configuration system. The goal is to decouple provider and model definitions from the core application logic by moving them to an external, type-safe configuration file. The project is divided into two phases: first, building the new configuration system, and second, integrating it into the application.

## Phases

| Phase | Goal | Dependencies | Requirements |
|-------|------|--------------|--------------|
| **1** | Core Configuration Implementation | — | `REQ-CFG-01`, `REQ-CFG-02`, `REQ-CFG-03`, `REQ-CFG-04`, `REQ-CFG-05`, `REQ-CFG-06` |
| **2** | Application Integration | Phase 1 | (Implicit) `REQ-FEAT-01` |

---

### **Phase 1: Core Configuration Implementation**

**Goal:** Implement a type-safe, external configuration system that loads settings from a YAML file, validates them, and makes them available to the application.

**Requirements:**
- `REQ-CFG-01`: Load configuration from an external file.
- `REQ-CFG-02`: Allow environment variables to override file values.
- `REQ-CFG-03`: Support environment-specific configuration files.
- `REQ-CFG-04`: Provide a centralized, type-safe access point.
- `REQ-CFG-05`: Validate configuration against a schema at startup.
- `REQ-CFG-06`: Ensure the runtime configuration object is immutable.

**Success Criteria:**
1.  A `config.yaml` file exists and contains provider definitions previously found in `src/providers.ts`.
2.  The application, on startup, reads `config.yaml` and can log the loaded configuration.
3.  The application exits with a descriptive error message if `config.yaml` contains invalid or missing fields (e.g., a missing `modelName`).
4.  An environment variable (e.g., `PROVIDER_ANTHROPIC_API_KEY`) can be set and is correctly reflected in the configuration available to the application, overriding any file-based value.
5.  A `src/config.ts` module exposes a `getConfig()` function that returns an immutable, validated configuration object after an `initializeConfig()` call at startup.

---

### **Phase 2: Application Integration**

**Goal:** Refactor the application to use the new configuration system, completely removing the hardcoded provider definitions.

**Requirements:**
- This phase fulfills the original project goal (`REQ-FEAT-01` from `PROJECT.md`) by consuming the system built in Phase 1.

**Success Criteria:**
1.  The `src/router.ts` file imports `getConfig()` from the new configuration module and uses it to access all provider and model information.
2.  The hardcoded `PROVIDER_DEFINITIONS` array (or its equivalent) is completely removed from the `src/providers.ts` file.
3.  The application's existing routing behavior (tier selection, quota preservation, fallbacks) remains unchanged and is now driven by the external configuration file.
4.  All primary user flows, such as making a `/v1/chat/completions` request, work as before the refactor.

## Progress

| Phase | Status | Plans | Completed |
|-------|--------|-------|-----------|
| **1** | `Complete` | 10 plans (22 original + 3 gap closure) | 2026-02-16 |
| **2** | `Planned` | 4 plans (ready for execution) | — |

---

### Phase 2 Plans

**Wave 1 (Parallel):**
- [ ] 02-application-integration-01-PLAN.md — Refactor router.ts to use config system
- [ ] 02-application-integration-02-PLAN.md — Eliminate server.ts dependency on providers.ts

**Wave 2 (Sequential):**
- [ ] 02-application-integration-03-PLAN.md — Remove deprecated utilities from providers.ts
- [ ] 02-application-integration-04-PLAN.md — Update tests for config-driven architecture
