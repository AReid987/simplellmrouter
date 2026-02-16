---
wave: 2
autonomous: true
gap_closure: false
---

# Plan 01-2: Schema & Type System

**Phase:** 1 - Core Configuration Implementation
**Plan:** 01-2
**Wave:** 2
**Estimated:** 20 minutes

## Objective

Define comprehensive Zod schemas for configuration validation. Creates nested schemas for Quota, Model, Provider, Logging, and AppConfig with full TypeScript type inference.

## Must Haves

- ✅ src/config/schema.ts with all Zod schemas
- ✅ Nested schemas: Quota, Model, Provider, Logging, AppConfig
- ✅ Type inference for all schemas (z.infer)
- ✅ Logging schema extensible for Conductor team integration
- ✅ Compiles without errors

## Context

### Parallel Work Awareness

Creates NEW file (src/config/schema.ts) - no conflicts with Conductor team.

### Locked Implementation Decisions

From CONTEXT.md:
- Schema Structure: Nested schemas (Provider, Model, Quota)
- Schema Extensibility: Strict provider list only
- Hot Reload: No - restart required

### Integration Consideration

Added LoggingConfigSchema to support Conductor team's logging system in Phase 2.

## Tasks

### Task 1: Define Zod Schemas

**Priority:** P0 (Blocking)
**Estimated:** 20 minutes
**Dependencies:** Wave 1 (zod package installed)

**File:** `src/config/schema.ts`

**Schema Structure:**
```typescript
import { z } from 'zod';

// 1. Quota Schema
export const QuotaSchema = z.object({
  dailyRequests: z.number().optional(),
  monthlyRequests: z.number().optional(),
  rpm: z.number().optional(),
  tpm: z.number().optional(),
  quotaSize: z.enum(['tiny', 'small', 'medium', 'large', 'huge']),
});

// 2. Model Schema
export const ModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contextWindow: z.number().positive(),
  maxOutput: z.number().positive(),
  capabilities: z.array(z.string()),
  quota: QuotaSchema,
  tier: z.enum(['simple', 'medium', 'complex', 'reasoning']),
});

// 3. Provider Schema (without secrets)
export const ProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  enabled: z.boolean().default(true),
  models: z.array(ModelSchema).min(1, "Provider must have at least one model"),
});

// 4. Environment-specific Provider Config Schema
export const ProviderConfigSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: z.string().optional(),
  models: z.array(z.string()).optional(),
});

// 5. Logging Config Schema (extensible for Conductor team)
export const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'pretty']).default('pretty'),
  file: z.string().optional(),
  errorReporting: z.object({
    enabled: z.boolean().default(false),
    dsn: z.string().optional(),
    environment: z.string().default('development'),
  }).optional(),
}).optional();

// 6. Full App Config Schema
export const AppConfigSchema = z.object({
  server: z.object({
    port: z.number().positive().default(8402),
    host: z.string().default('localhost'),
  }),
  providers: z.record(z.string(), ProviderSchema),
  providerConfig: z.record(z.string(), ProviderConfigSchema).optional(),
  logging: LoggingConfigSchema,
});

// 7. Type Inference
export type QuotaConfig = z.infer<typeof QuotaSchema>;
export type ModelConfig = z.infer<typeof ModelSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
```

**Commit:** `feat(01-2): define zod schemas with type inference`

**Verification:**
- [ ] src/config/schema.ts compiles without errors
- [ ] All types exported match their Zod schemas
- [ ] TypeScript intellisense shows correct types
- [ ] LoggingConfigSchema includes level, format, file, errorReporting

## Success Criteria

- [ ] Schema file created with all 6 Zod schemas
- [ ] All 6 TypeScript types exported via z.infer
- [ ] Compilation succeeds with no errors
- [ ] Logging schema extensible for future integration
- [ ] Schema matches existing provider structure from src/providers.ts
