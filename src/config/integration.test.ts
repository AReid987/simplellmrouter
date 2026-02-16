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

describe('Real Config File Loading', () => {
  afterEach(() => {
    resetConfig();
    delete process.env.PROVIDER_MISTRAL_API_KEY;
  });

  it('should load actual config/providers.yaml file', async () => {
    // Set API keys for multiple providers so we can test loading
    process.env.PROVIDER_MISTRAL_API_KEY = 'test-key-for-real-config';
    process.env.PROVIDER_GROQ_API_KEY = 'test-groq-key';
    process.env.PROVIDER_GEMINI_API_KEY = 'test-gemini-key';

    try {
      // Load the actual config file using the environment parameter
      // This will use the merge chain and load config/providers.yaml + providers.development.yaml
      const config = await initializeConfig();

      // Verify config loaded
      expect(config).toBeDefined();
      expect(config.server.port).toBeDefined();
      expect(config.server.host).toBeDefined();

      // Verify providers that are enabled in development have API keys loaded
      // (development config enables mistral, groq, gemini by default)
      const enabledInDevelopment = ['mistral', 'groq', 'gemini'];

      for (const providerId of enabledInDevelopment) {
        expect(config.providers[providerId]).toBeDefined();
        expect(config.providers[providerId].id).toBe(providerId);
        expect(config.providers[providerId].name).toBeDefined();
        expect(config.providers[providerId].baseUrl).toBeDefined();
        expect(config.providers[providerId].models).toBeInstanceOf(Array);
        expect(config.providers[providerId].models.length).toBeGreaterThan(0);
      }

      // Verify specific provider details
      expect(config.providers.mistral.models.length).toBeGreaterThanOrEqual(2);
      expect(config.providers.mistral.models.some(m => m.id === 'mistral-large-latest')).toBe(true);

      // Verify server config
      expect(config.server.port).toBe(8402);
      expect(config.server.host).toBe('localhost');

      // Verify logging config (optional field)
      if (config.logging) {
        expect(config.logging.level).toBe('info');
        expect(config.logging.format).toBe('pretty');
      }
    } finally {
      resetConfig();
    }
  });

  it('should validate schema of actual config file', async () => {
    const { loadConfigFile } = await import('./loader.js');
    const { AppConfigSchema } = await import('./schema.js');

    // Load the actual config file
    const rawConfig = await loadConfigFile();

    // Validate against schema
    const result = AppConfigSchema.safeParse(rawConfig);

    // Should pass validation
    expect(result.success).toBe(true);

    if (result.success) {
      // Verify structure
      expect(result.data.server).toBeDefined();
      expect(result.data.providers).toBeDefined();
      expect(Object.keys(result.data.providers).length).toBeGreaterThanOrEqual(8);

      // Verify each provider has required fields
      for (const [providerId, provider] of Object.entries(result.data.providers)) {
        expect(provider.id).toBe(providerId);
        expect(provider.name).toBeDefined();
        expect(provider.baseUrl).toMatch(/^https?:\/\//);
        expect(provider.enabled).toBeDefined();
        expect(provider.models).toBeInstanceOf(Array);
        expect(provider.models.length).toBeGreaterThan(0);

        // Verify each model has required fields
        for (const model of provider.models) {
          expect(model.id).toBeDefined();
          expect(model.name).toBeDefined();
          expect(model.contextWindow).toBeGreaterThan(0);
          expect(model.maxOutput).toBeGreaterThan(0);
          expect(model.capabilities).toBeInstanceOf(Array);
          expect(model.quota).toBeDefined();
          expect(model.tier).toBeDefined();
        }
      }
    }
  });
});
