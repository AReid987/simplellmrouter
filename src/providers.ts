/**
 * Provider Utilities
 *
 * @deprecated Most functionality has moved to src/config/index.ts
 * Use getConfig() and getEnabledProviders() for provider access.
 * These utilities are kept for backward compatibility.
 */

export interface QuotaConfig {
  dailyRequests?: number;    // Requests per day
  monthlyRequests?: number;  // Requests per month
  rpm?: number;              // Requests per minute
  tpm?: number;              // Tokens per minute
  quotaSize: 'tiny' | 'small' | 'medium' | 'large' | 'huge'; // Relative quota size
}

export interface ModelConfig {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
  capabilities: string[];
  quota: QuotaConfig;
  tier: 'simple' | 'medium' | 'complex' | 'reasoning'; // Best suited tier
}

export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: ModelConfig[];
}

export interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  models?: string[];  // Optional: restrict to specific models
}

/**
 * Load provider configuration from environment variables
 *
 * @deprecated Use PROVIDER_{ID}_API_KEY environment variables instead.
 * The config system (src/config/index.ts) handles environment variables automatically.
 */
export function loadProviderConfig(providerId: string): ProviderConfig | null {
  const envKey = `${providerId.toUpperCase()}_API_KEY`;
  const apiKey = process.env[envKey];

  if (!apiKey) {
    return null;
  }

  return {
    enabled: true,
    apiKey,
  };
}

/**
 * Get a model by full ID (provider/model)
 *
 * @deprecated Use config.getModel() or iterate through getEnabledProviders()
 * This utility is kept for backward compatibility.
 */
export function getModel(providers: Provider[], modelId: string): { provider: Provider; model: ModelConfig } | null {
  // Parse modelId: "groq/llama-3.3-70b-versatile"
  const [providerId, ...modelParts] = modelId.split('/');
  const modelName = modelParts.join('/');

  const provider = providers.find(p => p.id === providerId);
  if (!provider) return null;

  const model = provider.models.find(m => m.id === modelName || m.id === modelId);
  if (!model) return null;

  return { provider, model };
}

/**
 * Get all available models across all providers
 *
 * @deprecated Use getEnabledProviders() and map models instead.
 * This utility is kept for backward compatibility.
 */
export function getAllModels(providers: Provider[]): Array<{ provider: Provider; model: ModelConfig; fullId: string }> {
  const allModels: Array<{ provider: Provider; model: ModelConfig; fullId: string }> = [];

  for (const provider of providers) {
    if (!provider.enabled) continue;

    for (const model of provider.models) {
      allModels.push({
        provider,
        model,
        fullId: `${provider.id}/${model.id}`
      });
    }
  }

  return allModels;
}

/**
 * Validate that minimum required providers are available
 *
 * @deprecated Config validation happens automatically in initializeConfig().
 * This utility is kept for backward compatibility.
 */
export function validateProviders(providers: Provider[]): { valid: boolean; message: string } {
  if (providers.length === 0) {
    return {
      valid: false,
      message: 'No providers configured. Add API keys via environment variables (MISTRAL_API_KEY, GROQ_API_KEY, etc.)'
    };
  }

  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0);
  if (totalModels === 0) {
    return {
      valid: false,
      message: 'No models available. Check provider configurations.'
    };
  }

  return {
    valid: true,
    message: `Loaded ${providers.length} providers with ${totalModels} models`
  };
}
