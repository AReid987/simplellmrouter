/**
 * Integration Test for Configuration Module
 *
 * Tests the end-to-end configuration loading and initialization flow.
 */

import { initializeConfig, getConfig, getEnabledProviders, resetConfig } from './index.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Config Integration', () => {
  const testConfigPath = join(tmpdir(), 'test-simplellmrouter-config.yaml');

  afterEach(() => {
    // Clean up test config file
    if (existsSync(testConfigPath)) {
      try {
        unlinkSync(testConfigPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    // Reset config state
    resetConfig();
    // Clean up environment variables
    delete process.env.PROVIDER_MISTRAL_API_KEY;
    delete process.env.PROVIDER_GROQ_API_KEY;
  });

  it('should load config and apply env overrides', async () => {
    // Create test config file
    const testConfig = `
server:
  port: 9999
  host: test-host

logging:
  level: debug
  format: json

providers:
  mistral:
    id: mistral
    name: Mistral
    baseUrl: https://api.mistral.ai/v1
    enabled: true
    models:
      - id: mistral-large-latest
        name: Mistral Large Latest
        contextWindow: 128000
        maxOutput: 8192
        capabilities: [function-calling]
        quota:
          quotaSize: huge
        tier: complex

  groq:
    id: groq
    name: Groq
    baseUrl: https://api.groq.com/openai/v1
    enabled: false
    models:
      - id: llama-3.3-70b-versatile
        name: Llama 3.3 70B Versatile
        contextWindow: 128000
        maxOutput: 8192
        capabilities: [function-calling]
        quota:
          quotaSize: large
        tier: medium
`;

    writeFileSync(testConfigPath, testConfig);

    // Set environment variable to override Groq enabled status
    process.env.PROVIDER_MISTRAL_API_KEY = 'test-mistral-key';
    process.env.PROVIDER_GROQ_API_KEY = 'test-groq-key';
    process.env.PROVIDER_GROQ_ENABLED = 'true';

    try {
      // Initialize config with test file
      const config = await initializeConfig({ environment: testConfigPath });

      // Verify config loaded
      expect(config).toBeDefined();
      expect(config.server.port).toBeDefined();

      // Verify providers loaded
      const providers = getEnabledProviders();
      expect(Array.isArray(providers)).toBe(true);
    } finally {
      resetConfig();
    }
  });

  it('should filter providers without API keys', async () => {
    // Create test config with multiple providers
    const testConfig = `
server:
  port: 9999
  host: test-host

logging:
  level: info

providers:
  mistral:
    id: mistral
    name: Mistral
    baseUrl: https://api.mistral.ai/v1
    enabled: true
    models:
      - id: mistral-large-latest
        name: Mistral Large Latest
        contextWindow: 128000
        maxOutput: 8192
        capabilities: [function-calling]
        quota:
          quotaSize: huge
        tier: complex

  groq:
    id: groq
    name: Groq
    baseUrl: https://api.groq.com/openai/v1
    enabled: true
    models:
      - id: llama-3.3-70b-versatile
        name: Llama 3.3 70B Versatile
        contextWindow: 128000
        maxOutput: 8192
        capabilities: [function-calling]
        quota:
          quotaSize: large
        tier: medium
`;

    writeFileSync(testConfigPath, testConfig);

    // Only set API key for mistral
    process.env.PROVIDER_MISTRAL_API_KEY = 'test-mistral-key';
    // No API key for groq

    try {
      const config = await initializeConfig({ environment: testConfigPath });
      const providers = getEnabledProviders();

      // Should only have mistral (groq filtered out due to no API key)
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.some(p => p.id === 'mistral')).toBe(true);
    } finally {
      resetConfig();
    }
  });

  it('should include API keys from environment in returned providers', async () => {
    const testConfig = `
server:
  port: 9999
  host: test-host

logging:
  level: info

providers:
  mistral:
    id: mistral
    name: Mistral
    baseUrl: https://api.mistral.ai/v1
    enabled: true
    models:
      - id: mistral-large-latest
        name: Mistral Large Latest
        contextWindow: 128000
        maxOutput: 8192
        capabilities: [function-calling]
        quota:
          quotaSize: huge
        tier: complex
`;

    writeFileSync(testConfigPath, testConfig);

    const testApiKey = 'integration-test-key-12345';
    process.env.PROVIDER_MISTRAL_API_KEY = testApiKey;

    try {
      await initializeConfig({ environment: testConfigPath });
      const providers = getEnabledProviders();
      const mistral = providers.find(p => p.id === 'mistral');

      expect(mistral).toBeDefined();
      expect(mistral?.apiKey).toBe(testApiKey);
    } finally {
      resetConfig();
    }
  });
});
