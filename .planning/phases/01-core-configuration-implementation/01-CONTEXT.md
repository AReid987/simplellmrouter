# Phase 1: Core Configuration Implementation - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

## Phase Boundary

Build a type-safe, external configuration system that loads provider settings from a YAML file, validates them with Zod, and makes them available to the application via `getConfig()`. This phase creates the infrastructure but does not integrate it into the application (that's Phase 2).

## Implementation Decisions

### Schema Structure
- **Nested schemas** - Separate schemas for Provider, Model, Quota that compose together
- More maintainable for complex nested config (9 providers, 15 models, quota configurations)
- Zod infers exact TypeScript types from the composition
- Schema structure mirrors the data structure from the codebase

### Config File Format
- **YAML + JSON** - Support both formats
- YAML for human editing (config/providers.yaml)
- JSON for machine/CI usage (config/providers.json)
- Both validate to the same Zod schema
- Enables CI pipelines to generate config programmatically

### Environment Variable Override
- **Exact key match** - ENV_VAR_NAME must match config path
- Example: `PROVIDER_MISTRAL_API_KEY` maps to `providers.mistral.apiKey`
- Example: `SERVER_PORT` maps to `server.port`
- Strict but clear mapping between environment and config structure

### Validation Error Handling
- **Interactive fix** - Prompt user to fix validation issues before continuing
- Application doesn't start with invalid configuration
- Clear error messages indicate exactly what's wrong
- User can fix and retry without manual restart

### Config File Location
- **Project root: config/** - Configuration files in dedicated directory
- `config/providers.yaml` - Main provider configuration
- `config/.env.example` - Template for environment variables
- Separate from source code, easy to find

### Immutable Implementation
- **Readonly types only** - Type-level `readonly` (as const), no runtime enforcement
- Relies on developer discipline rather than runtime overhead
- Config object returned as `Readonly<AppConfig>` from `getConfig()`
- Balances type safety with performance

### API Key Behavior
- **Provider disabled** - Providers without API keys are automatically excluded
- Missing `PROVIDER_X_API_KEY` means provider not in available providers list
- Application starts successfully even if some providers are disabled
- No need to comment out providers in config when keys unavailable

### Hot Reload
- **No, restart only** - Config loads once at startup
- Changes to configuration require server restart
- Simpler implementation, more predictable behavior
- Future enhancement for Phase 2 or later

### Environment-Specific Configuration
- **NODE_ENV based files** - Separate config files per environment
- `config/providers.yaml` - Base configuration
- `config/providers.development.yaml` - Development overrides
- `config/providers.production.yaml` - Production overrides
- Environment selects which files to load (merges base + environment)

### Schema Extensibility
- **Strict provider list** - Only providers defined in schema are allowed
- Type-safe: adding new provider requires schema update
- Prevents typos in provider names at validation time
- Trade-off: less flexible but more type-safe

### Secrets Handling
- **Env vars only** - API keys never stored in config files
- Config files contain structure, not secrets
- Environment variables provide all sensitive values
- Config can reference env variable names for documentation (e.g., `${MISTRAL_API_KEY}`)

## Specific Ideas

No specific requirements — open to standard approaches.

## Deferred Ideas

- Hot-reloading configuration without server restart — future phase
- Cloud secret manager integration (AWS Secrets Manager, HashiCorp Vault) — future phase
- Config validation CLI tool — nice-to-have, not essential
- Web UI for config management — out of scope for now

---

*Phase: 01-core-configuration-implementation*
*Context gathered: 2026-02-16*
