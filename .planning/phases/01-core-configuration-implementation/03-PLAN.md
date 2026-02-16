---
wave: 3
autonomous: true
gap_closure: false
---

# Plan 01-3: Configuration Loading

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-3
**Wave:** 3
**Estimated:** 50 minutes

## Objective

Implement configuration loading system with environment variable overrides, YAML file loading with fallback chain, and Zod validation with formatted error messages.

## Must Haves

- ✅ src/config/env-override.ts for env variable processing
- ✅ src/config/loader.ts for YAML file loading
- ✅ src/config/validator.ts for Zod validation and error formatting
- ✅ Fallback chain: env-specific → default → base config
- ✅ Formatted validation errors for user feedback

## Context

### Parallel Work Awareness

Creates NEW files in src/config/ - no conflicts with Conductor team.

### Locked Implementation Decisions

From CONTEXT.md:
- ENV Override: Exact key match (PROVIDER_MISTRAL_API_KEY)
- Config Format: YAML + JSON both supported
- Validation: Interactive fix - prompt user on validation errors
- Environment Files: NODE_ENV based (providers.development.yaml)

## Tasks

### Task 1: Implement Environment Variable Override

**Priority:** P0 (Blocking)
**Estimated:** 15 minutes
**Dependencies:** Wave 2 (schema defined)

**File:** `src/config/env-override.ts`

**Function Signature:**
```typescript
export function applyEnvOverrides(
  config: z.infer<typeof AppConfigSchema>,
  prefix: string = 'PROVIDER'
): z.infer<typeof AppConfigSchema>
```

**Implementation Logic:**
1. Iterate through config.providers
2. For each provider, check for env vars:
   - PROVIDER_{PROVIDER_ID}_API_KEY → providerConfig[providerId].apiKey
   - PROVIDER_{PROVIDER_ID}_ENABLED → providerConfig[providerId].enabled
3. Convert string "true"/"false" to boolean for enabled flag
4. Return merged config

**Commit:** `feat(01-3): implement env variable override`

**Verification:**
- [ ] Unit test: PROVIDER_MISTRAL_API_KEY=test overrides config
- [ ] Unit test: PROVIDER_MISTRAL_ENABLED=false disables provider
- [ ] Non-existent providers ignored

---

### Task 2: Implement File Loader

**Priority:** P0 (Blocking)
**Estimated:** 20 minutes
**Dependencies:** Wave 2 (schema defined)

**File:** `src/config/loader.ts`

**Function Signature:**
```typescript
export async function loadConfigFile(
  environment?: 'development' | 'production'
): Promise<z.infer<typeof AppConfigSchema>>
```

**Implementation Logic:**
1. Determine environment (default: process.env.NODE_ENV || 'development')
2. Build file path: config/providers.{environment}.yaml
3. Fallback chain:
   - config/providers.{environment}.yaml
   - config/providers.yaml
   - config/providers.default.yaml
4. Parse YAML with yaml.parse()
5. Return parsed object (validation happens later)

**Error Handling:**
- File not found: Throw with helpful message
- Invalid YAML: Throw with line number
- Empty file: Throw with file path

**Commit:** `feat(01-3): implement yaml file loader with fallback`

**Verification:**
- [ ] Loads config/providers.development.yaml when NODE_ENV=development
- [ ] Falls back to config/providers.yaml if env-specific missing
- [ ] Throws descriptive error for missing file
- [ ] Throws descriptive error for invalid YAML

---

### Task 3: Implement Config Validator

**Priority:** P0 (Blocking)
**Estimated:** 15 minutes
**Dependencies:** Wave 2 (schema), Task 2 (loader)

**File:** `src/config/validator.ts`

**Function Signature:**
```typescript
export function validateConfig(
  rawConfig: unknown
): { success: true; data: AppConfig } | { success: false; errors: z.ZodError }
```

**Implementation Logic:**
1. Run AppConfigSchema.safeParse(rawConfig)
2. On success: Return { success: true, data: parsedConfig }
3. On failure: Return { success: false, errors: zodError }
4. Format errors for display (see Task 4)

**Commit:** `feat(01-3): implement zod config validator`

**Verification:**
- [ ] Valid config passes validation
- [ ] Invalid provider ID returns descriptive error
- [ ] Missing required field returns field name and expected type
- [ ] Invalid quota size returns enum values

---

### Task 4: Implement Interactive Error Display

**Priority:** P1 (High)
**Estimated:** 10 minutes
**Dependencies:** Task 3 (validator)

**File:** `src/config/validator.ts` (export function)

**Function Signature:**
```typescript
export function formatValidationErrors(
  errors: z.ZodError
): string
```

**Output Format:**
```
Configuration validation failed:

Provider 'mistral':
  ✗ models[0].quota.quotaSize: Invalid enum value. Expected 'tiny' | 'small' | 'medium' | 'large' | 'huge', received 'invalid'

Server configuration:
  ✗ server.port: Expected number, received string

Fix these issues and restart the server.
```

**Commit:** `feat(01-3): implement formatted validation errors`

**Verification:**
- [ ] Error output is human-readable
- [ ] Each error shows path, expected, received
- [ ] Suggestion message included at end

## Success Criteria

- [ ] All 4 source files created in src/config/
- [ ] Env override applies PROVIDER_* env vars correctly
- [ ] File loader implements 3-tier fallback chain
- [ ] Validator catches all schema violations
- [ ] Error formatter produces clear, actionable messages
- [ ] Each task committed individually
