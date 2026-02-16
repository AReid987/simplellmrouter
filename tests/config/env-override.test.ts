/**
 * Environment Variable Override Tests
 */

import { applyEnvOverrides } from '../../src/config/env-override.js';

describe('Environment Variable Override', () => {
  const mockConfig = {
    server: {
      port: 8402,
      host: 'localhost',
    },
    providers: {
      mistral: {
        id: 'mistral',
        name: 'Mistral AI',
        baseUrl: 'https://api.mistral.ai/v1',
        enabled: true,
        models: [
          {
            id: 'mistral-tiny',
            name: 'Mistral Tiny',
            contextWindow: 32000,
            maxOutput: 2000,
            capabilities: ['chat', 'completion'],
            quota: {
              quotaSize: 'tiny' as const,
              rpm: 60,
            },
            tier: 'simple' as const,
          },
        ],
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        enabled: true,
        models: [
          {
            id: 'gpt-4',
            name: 'GPT-4',
            contextWindow: 8192,
            maxOutput: 4000,
            capabilities: ['chat', 'completion'],
            quota: {
              quotaSize: 'huge' as const,
              rpm: 100,
            },
            tier: 'reasoning' as const,
          },
        ],
      },
    },
    providerConfig: {},
    logging: {
      level: 'info' as const,
      format: 'pretty' as const,
    },
  };

  beforeEach(() => {
    // Clear all environment variables before each test
    delete process.env.PROVIDER_MISTRAL_API_KEY;
    delete process.env.PROVIDER_MISTRAL_ENABLED;
    delete process.env.PROVIDER_OPENAI_API_KEY;
    delete process.env.PROVIDER_OPENAI_ENABLED;
  });

  describe('API Key Override', () => {
    it('should override API key from environment variable', () => {
      process.env.PROVIDER_MISTRAL_API_KEY = 'test-api-key-123';

      const result = applyEnvOverrides(mockConfig);

      expect(result.providerConfig?.mistral?.apiKey).toBe('test-api-key-123');
    });

    it('should override multiple API keys', () => {
      process.env.PROVIDER_MISTRAL_API_KEY = 'mistral-key';
      process.env.PROVIDER_OPENAI_API_KEY = 'openai-key';

      const result = applyEnvOverrides(mockConfig);

      expect(result.providerConfig?.mistral?.apiKey).toBe('mistral-key');
      expect(result.providerConfig?.openai?.apiKey).toBe('openai-key');
    });

    it('should ignore non-existent providers', () => {
      process.env.PROVIDER_NONEXISTENT_API_KEY = 'some-key';

      const result = applyEnvOverrides(mockConfig);

      expect(result.providerConfig?.nonexistent).toBeUndefined();
    });
  });

  describe('Enabled Flag Override', () => {
    it('should disable provider with PROVIDER_{ID}_ENABLED=false', () => {
      process.env.PROVIDER_MISTRAL_ENABLED = 'false';

      const result = applyEnvOverrides(mockConfig);

      expect(result.providerConfig?.mistral?.enabled).toBe(false);
    });

    it('should enable provider with PROVIDER_{ID}_ENABLED=true', () => {
      const disabledConfig = {
        ...mockConfig,
        providers: {
          ...mockConfig.providers,
          mistral: {
            ...mockConfig.providers.mistral,
            enabled: false,
          },
        },
      };

      process.env.PROVIDER_MISTRAL_ENABLED = 'true';

      const result = applyEnvOverrides(disabledConfig);

      expect(result.providerConfig?.mistral?.enabled).toBe(true);
    });

    it('should handle case-insensitive boolean strings', () => {
      process.env.PROVIDER_MISTRAL_ENABLED = 'FALSE';

      const result = applyEnvOverrides(mockConfig);

      expect(result.providerConfig?.mistral?.enabled).toBe(false);
    });

    it('should handle invalid boolean values as false', () => {
      process.env.PROVIDER_MISTRAL_ENABLED = 'invalid';

      const result = applyEnvOverrides(mockConfig);

      expect(result.providerConfig?.mistral?.enabled).toBe(false);
    });
  });

  describe('Combined Overrides', () => {
    it('should apply both API key and enabled overrides', () => {
      process.env.PROVIDER_MISTRAL_API_KEY = 'test-key';
      process.env.PROVIDER_MISTRAL_ENABLED = 'false';

      const result = applyEnvOverrides(mockConfig);

      expect(result.providerConfig?.mistral?.apiKey).toBe('test-key');
      expect(result.providerConfig?.mistral?.enabled).toBe(false);
    });
  });

  describe('Custom Prefix', () => {
    it('should use custom prefix for environment variables', () => {
      process.env.CUSTOM_MISTRAL_API_KEY = 'custom-key';

      const result = applyEnvOverrides(mockConfig, 'CUSTOM');

      expect(result.providerConfig?.mistral?.apiKey).toBe('custom-key');
    });

    it('should not apply variables with default prefix when custom prefix is used', () => {
      process.env.PROVIDER_MISTRAL_API_KEY = 'default-key';
      process.env.CUSTOM_MISTRAL_API_KEY = 'custom-key';

      const result = applyEnvOverrides(mockConfig, 'CUSTOM');

      expect(result.providerConfig?.mistral?.apiKey).toBe('custom-key');
    });
  });

  describe('Provider ID Case Handling', () => {
    it('should convert provider ID to lowercase for matching', () => {
      process.env.PROVIDER_MISTRAL_API_KEY = 'test-key';

      const result = applyEnvOverrides(mockConfig);

      expect(result.providerConfig?.mistral?.apiKey).toBe('test-key');
    });
  });
});
