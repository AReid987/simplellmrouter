/**
 * Configuration Validator Tests
 */

import { z } from 'zod';
import {
  validateConfig,
  isValidConfig,
  formatValidationErrors,
  validateConfigOrThrow,
} from '../../src/config/validator.js';

describe('Configuration Validator', () => {
  const validConfig = {
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
              quotaSize: 'tiny',
              rpm: 60,
            },
            tier: 'simple',
          },
        ],
      },
    },
    logging: {
      level: 'info',
      format: 'pretty',
    },
  };

  describe('validateConfig', () => {
    it('should pass validation for valid config', () => {
      const result = validateConfig(validConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.providers.mistral.id).toBe('mistral');
      }
    });

    it('should fail for invalid provider ID', () => {
      const invalidConfig = {
        ...validConfig,
        providers: {
          // Missing required 'id' field and models array
          invalid: {
            name: 'Invalid Provider',
            baseUrl: 'https://api.invalid.com/v1',
            enabled: true,
            models: [],
          },
        },
      };

      const result = validateConfig(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues.length).toBeGreaterThan(0);
      }
    });

    it('should fail for missing required field', () => {
      const invalidConfig = {
        server: {
          port: 8402,
          host: 'localhost',
        },
        providers: {
          mistral: {
            // Missing required 'id' field
            name: 'Mistral AI',
            baseUrl: 'https://api.mistral.ai/v1',
            enabled: true,
            models: [],
          },
        },
        logging: {},
      };

      const result = validateConfig(invalidConfig);

      expect(result.success).toBe(false);
    });

    it('should fail for invalid quota size', () => {
      const invalidConfig = {
        ...validConfig,
        providers: {
          ...validConfig.providers,
          mistral: {
            ...validConfig.providers.mistral,
            models: [
              {
                ...validConfig.providers.mistral.models[0],
                quota: {
                  quotaSize: 'invalid' as any,
                },
              },
            ],
          },
        },
      };

      const result = validateConfig(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        const quotaError = result.errors.issues.find(
          (e) => e.path.join('.').includes('quotaSize')
        );
        expect(quotaError).toBeDefined();
      }
    });

    it('should fail for invalid URL', () => {
      const invalidConfig = {
        ...validConfig,
        providers: {
          ...validConfig.providers,
          mistral: {
            ...validConfig.providers.mistral,
            baseUrl: 'not-a-url',
          },
        },
      };

      const result = validateConfig(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        const urlError = result.errors.issues.find(
          (e) => e.path.join('.').includes('baseUrl')
        );
        expect(urlError).toBeDefined();
      }
    });
  });

  describe('isValidConfig', () => {
    it('should return true for valid config', () => {
      expect(isValidConfig(validConfig)).toBe(true);
    });

    it('should return false for invalid config', () => {
      const invalidConfig = {
        server: {
          port: 'not-a-number' as any,
          host: 'localhost',
        },
        providers: {},
        logging: {},
      };

      expect(isValidConfig(invalidConfig)).toBe(false);
    });

    it('should narrow type correctly when true', () => {
      if (isValidConfig(validConfig)) {
        // TypeScript should know this is AppConfig
        expect(validConfig.providers.mistral.models[0].tier).toBe('simple');
      }
    });
  });

  describe('validateConfigOrThrow', () => {
    it('should return config when valid', () => {
      const result = validateConfigOrThrow(validConfig);

      expect(result).toBeDefined();
      expect(result.providers.mistral.id).toBe('mistral');
    });

    it('should throw formatted error when invalid', () => {
      const invalidConfig = {
        ...validConfig,
        providers: {
          mistral: {
            ...validConfig.providers.mistral,
            baseUrl: 'invalid-url',
          },
        },
      };

      expect(() => validateConfigOrThrow(invalidConfig)).toThrow('Configuration validation failed');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format provider-specific errors', () => {
      // Create a real Zod error from validation
      const invalidConfig = {
        ...validConfig,
        providers: {
          ...validConfig.providers,
          mistral: {
            ...validConfig.providers.mistral,
            models: [
              {
                ...validConfig.providers.mistral.models[0],
                quota: {
                  quotaSize: 'invalid' as any,
                },
              },
            ],
          },
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);

        expect(formatted).toContain('Configuration validation failed');
        expect(formatted).toContain("Provider 'mistral'");
        expect(formatted).toContain('quotaSize');
        expect(formatted).toContain('tiny');
        expect(formatted).toContain('small');
        expect(formatted).toContain('medium');
      }
    });

    it('should format server configuration errors', () => {
      const invalidConfig = {
        ...validConfig,
        server: {
          port: 'not-a-number' as any,
          host: 'localhost',
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);

        expect(formatted).toContain('Configuration validation failed');
        expect(formatted).toContain('server.port');
        expect(formatted).toContain('number');
      }
    });

    it('should format multiple errors for same provider', () => {
      const invalidConfig = {
        ...validConfig,
        providers: {
          mistral: {
            ...validConfig.providers.mistral,
            baseUrl: 'invalid-url',
            models: [
              {
                ...validConfig.providers.mistral.models[0],
                quota: {
                  quotaSize: 'invalid' as any,
                },
              },
            ],
          },
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);

        expect(formatted).toContain("Provider 'mistral'");
        expect(formatted).toContain('providers.mistral.baseUrl');
        expect(formatted).toContain('providers.mistral.models');
      }
    });

    it('should include suggestion message at end', () => {
      const invalidConfig = {
        ...validConfig,
        server: {
          port: 'not-a-number' as any,
          host: 'localhost',
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);

        expect(formatted).toContain('Fix these issues and restart the server');
      }
    });

    it('should format missing required field errors', () => {
      const invalidConfig = {
        ...validConfig,
        providers: {
          mistral: {
            ...validConfig.providers.mistral,
            id: undefined as any,
          },
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);

        // Zod v4 reports "expected string, received undefined" for missing fields
        expect(formatted).toMatch(/expected.*string.*received.*undefined/i);
      }
    });

    it('should format tier enum value errors with expected values', () => {
      const invalidConfig = {
        ...validConfig,
        providers: {
          mistral: {
            ...validConfig.providers.mistral,
            models: [
              {
                ...validConfig.providers.mistral.models[0],
                tier: 'invalid' as any,
              },
            ],
          },
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);

        expect(formatted).toContain('simple');
        expect(formatted).toContain('medium');
        expect(formatted).toContain('complex');
        expect(formatted).toContain('reasoning');
      }
    });

    it('should format too_small errors', () => {
      const invalidConfig = {
        ...validConfig,
        providers: {
          mistral: {
            ...validConfig.providers.mistral,
            models: [],
          },
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);

        expect(formatted).toContain('at least 1');
      }
    });

    it('should handle providerConfig errors', () => {
      const invalidConfig = {
        ...validConfig,
        providerConfig: {
          mistral: {
            enabled: 'not-a-boolean' as any,
          },
        },
      };

      const result = validateConfig(invalidConfig);
      expect(result.success).toBe(false);

      if (!result.success) {
        const formatted = formatValidationErrors(result.errors);

        expect(formatted).toContain("Provider config 'mistral'");
      }
    });

    it('should format empty array of errors gracefully', () => {
      const emptyError = new z.ZodError([]);

      const formatted = formatValidationErrors(emptyError);

      expect(formatted).toContain('Configuration validation failed');
      expect(formatted).toContain('Fix these issues');
    });
  });
});
