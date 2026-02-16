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
