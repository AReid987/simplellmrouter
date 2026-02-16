# Requirements: SimpleLLMRouter Configuration Refactor

## Introduction
This document outlines the functional and non-functional requirements for the refactoring of the SimpleLLMRouter's configuration system, building upon the existing codebase and guided by the research findings.

## Core Value
Decouple provider and model definitions from the core application logic, allowing for easier updates without requiring code changes and full redeployments.

## Requirements

### Validated (Existing Capabilities)
These requirements represent the existing, confirmed capabilities of the SimpleLLMRouter as determined by the codebase analysis. They will be preserved and integrated with the new configuration system.

- ✓ **REQ-ARCH-01:** The router SHALL provide an OpenAI-compatible endpoint for chat completions (`/v1/chat/completions`).
- ✓ **REQ-ARCH-02:** The router SHALL classify incoming requests into tiers (SIMPLE, MEDIUM, COMPLEX, REASONING) to intelligently select appropriate models.
- ✓ **REQ-ARCH-03:** The router SHALL select the best LLM model using a "Quota Preservation Strategy" that prioritizes providers with larger available quotas.
- ✓ **REQ-ARCH-04:** The router SHALL generate and execute a fallback chain of models if the primary selected model fails or is rate-limited.
- ✓ **REQ-ARCH-05:** The router SHALL track rate-limited providers and temporarily exclude them from routing decisions for a defined cooldown period.
- ✓ **REQ-ARCH-06:** The router SHALL dynamically enable LLM providers at runtime based on the presence of their respective API keys in environment variables.

### Active (Version 1 Scope)
These are the new requirements for the initial refactoring phase, focusing on externalizing and validating the configuration.

- [ ] **REQ-CFG-01:** The application SHALL load provider and model configurations from an external configuration file (e.g., `config.yaml` or `config.json`).
- [ ] **REQ-CFG-02:** The configuration system SHALL allow environment variables to override specific values defined in the external configuration file.
- [ ] **REQ-CFG-03:** The configuration system SHALL support loading different environment-specific configurations (e.g., `development`, `production`) if corresponding files are present.
- [ ] **REQ-CFG-04:** The application SHALL provide a single, centralized, and type-safe access point (`getConfig()`) to the loaded and validated configuration throughout the codebase.
- [ ] **REQ-CFG-05:** The loaded configuration SHALL be validated against a defined schema (using Zod) at application startup, and the application SHALL exit if the configuration is invalid.
- [ ] **REQ-CFG-06:** The configuration object provided via the centralized access point SHALL be immutable to prevent accidental modification during runtime.

### Out of Scope (Deferred to Future Versions)
These features are explicitly excluded from Version 1 due to complexity, time constraints, or lower priority for the current refactoring goal.

- **OS-01: In-Memory Hot Reloading:** The configuration will not be dynamically reloaded without an application restart. Changes will require a full application restart to take effect.
- **OS-02: Advanced Secret Management Integration:** Direct integration with dedicated cloud secret management services (e.g., AWS Secrets Manager, HashiCorp Vault) is not included. API keys will continue to be sourced primarily from environment variables.

---
*Last updated: 2026-02-15 after requirements definition*
