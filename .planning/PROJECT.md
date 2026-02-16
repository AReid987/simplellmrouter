# SimpleLLMRouter: Configuration Refactor

## What This Is
A project to refactor the SimpleLLMRouter to improve maintainability and flexibility by externalizing the provider configuration.

## Core Value
Decouple provider and model definitions from the core application logic. This will allow for easier updates to keep up with the rapidly changing LLM landscape without requiring code changes and full redeployments.

## Target State
The static provider and model definitions currently hardcoded in `src/providers.ts` will be moved to an external, human-readable configuration file (e.g., `providers.yaml`). The application will load this configuration at startup to build its list of available providers.

## Business Justification
- **Reduces Maintenance Overhead:** Modifying provider details will no longer require a developer to change the source code.
- **Increases Flexibility:** The application can be adapted to new models or changes in existing provider APIs much more quickly.
- **Lowers Risk:** Isolates configuration from application logic, reducing the risk of introducing bugs during routine updates.
- **Addresses Tech Debt:** Resolves a key issue identified in the initial codebase analysis (`.planning/codebase/CONCERNS.md`).

## Constraints & Assumptions
- **Constraint:** The refactoring must not introduce any breaking changes to the existing API endpoints (`/v1/chat/completions`, `/quota`, etc.).
- **Constraint:** The application's performance (routing speed, request latency) should not be negatively impacted.
- **Assumption:** A YAML or JSON file is an acceptable format for the external configuration.

## Stakeholders
- **Owner:** The primary developer/maintainer of the SimpleLLMRouter project.

## Requirements

### Validated
These are existing capabilities of the system confirmed by the codebase analysis.
- ✓ **REQ-ARCH-01:** Provides an OpenAI-compatible endpoint for chat completions.
- ✓ **REQ-ARCH-02:** Classifies incoming requests into tiers (SIMPLE, MEDIUM, COMPLEX, REASONING) to select appropriate models.
- ✓ **REQ-ARCH-03:** Selects the best model using a "Quota Preservation Strategy" that prioritizes providers with larger available quotas.
- ✓ **REQ-ARCH-04:** Generates and executes a fallback chain of models if the primary choice fails.
- ✓ **REQ-ARCH-05:** Tracks rate-limited providers and temporarily excludes them from routing decisions.
- ✓ **REQ-ARCH-06:** Dynamically enables providers at runtime based on the presence of API keys in environment variables.

### Active
- [ ] **REQ-FEAT-01:** Externalize all static provider and model definitions from `src/providers.ts` into a runtime-loadable configuration file.

### Out of Scope
- **Integration of `QuotaTracker`:** The `QuotaTracker` will not be integrated into the core routing logic in this phase. Routing will continue to use the static `quotaSize` property.
- **Adding Test Coverage:** While important, creating a test suite is out of scope for this specific refactoring task.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus on refactoring provider configuration | Addresses a significant piece of identified tech debt and improves long-term maintainability. | — Pending |

---
*Last updated: 2026-02-15 after initialization*
