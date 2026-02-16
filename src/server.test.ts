// src/server.test.ts
import type { Server } from 'node:http';
import request from 'supertest';
import { startServer } from './server';
import { logger } from './lib/logging/logger';
import { getModel } from './providers'; // Import getModel for utility function
import { initializeConfig, resetConfig, getConfig, getEnabledProviders } from './config';

// Mock fetch globally for Node.js 18+
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Helper function to create mock Response objects
function createMockResponse(data: any, status: number = 200): Response {
  const body = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map([['content-type', 'application/json']]) as any,
    json: async () => data,
    text: async () => body,
    body: {
      getReader: () => ({
        read: async () => ({ done: true, value: undefined }),
        releaseLock: () => {}
      })
    },
    url: 'http://localhost',
    type: 'basic',
    redirected: false,
    clone: () => ({} as Response),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => ({} as Blob),
    formData: async () => new FormData()
  } as unknown as Response;
}

// Mock the logger
jest.mock('./lib/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  initLogger: jest.fn(),
}));

// Mock process.exit to prevent it from terminating the test runner
const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

// Mock providers.js for getModel utility function
jest.mock('./providers', () => ({
  getModel: jest.fn(),
}));

// Mock config module dependencies
jest.mock('./config/loader', () => ({
  loadConfigFile: jest.fn(),
}));
jest.mock('./config/env-override', () => ({
  applyEnvOverrides: jest.fn(),
}));
jest.mock('./config/validator', () => ({
  validateConfigOrThrow: jest.fn(),
}));
jest.mock('./config/index', () => ({
  initializeConfig: jest.fn(),
  resetConfig: jest.fn(),
  getConfig: jest.fn(),
  getEnabledProviders: jest.fn(),
}));

import { loadConfigFile } from './config/loader';
import { applyEnvOverrides } from './config/env-override';
import { validateConfigOrThrow } from './config/validator';

describe('Server', () => {
  jest.setTimeout(10000); // 10 seconds timeout for all tests in this suite
  let serverInstance: Server;

  beforeAll(async () => {
    // Mock the config initialization process
    (loadConfigFile as jest.Mock).mockResolvedValue({}); // Return empty config
    (applyEnvOverrides as jest.Mock).mockImplementation((config) => config); // Passthrough
    (validateConfigOrThrow as jest.Mock).mockImplementation((config) => {
      // Simulate validation for default providers
      return {
        server: { port: 0, host: '127.0.0.1' },
        providers: {
          'test-provider': {
            id: 'test-provider',
            name: 'Test Provider',
            baseUrl: 'http://localhost:1234',
            enabled: true,
            models: [{
              id: 'test-model',
              name: 'Test Model',
              contextWindow: 4096,
              maxOutput: 1024,
              capabilities: [],
              quota: { quotaSize: 'tiny' },
              tier: 'simple'
            },
            {
              id: 'rate-limited-model',
              name: 'Rate Limited Model',
              contextWindow: 4096,
              maxOutput: 1024,
              capabilities: [],
              quota: { quotaSize: 'tiny' },
              tier: 'simple'
            }]
          }
        },
        providerConfig: {
          'test-provider': {
            apiKey: 'test-key',
            enabled: true,
          }
        },
        logging: { level: 'info' }
      };
    });

    // Mock getConfig and getEnabledProviders
    (getConfig as jest.Mock).mockReturnValue({
      server: { port: 0, host: '127.0.0.1' },
      providers: {
        'test-provider': {
          id: 'test-provider',
          name: 'Test Provider',
          baseUrl: 'http://localhost:1234',
          enabled: true,
          models: [{
            id: 'test-model',
            name: 'Test Model',
            contextWindow: 4096,
            maxOutput: 1024,
            capabilities: [],
            quota: { quotaSize: 'tiny' },
            tier: 'simple'
          },
          {
            id: 'rate-limited-model',
            name: 'Rate Limited Model',
            contextWindow: 4096,
            maxOutput: 1024,
            capabilities: [],
            quota: { quotaSize: 'tiny' },
            tier: 'simple'
          }]
        }
      },
      providerConfig: {
        'test-provider': {
          apiKey: 'test-key',
          enabled: true,
        }
      },
      logging: { level: 'info' }
    });

    // Set up mock return values for getEnabledProviders
    (getEnabledProviders as jest.Mock).mockReturnValue([
      {
        id: 'test-provider',
        name: 'Test Provider',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key', // Ensure apiKey is present
        enabled: true,
        models: [{
          id: 'test-model',
          name: 'Test Model',
          contextWindow: 4096,
          maxOutput: 1024,
          capabilities: [],
          quota: { quotaSize: 'tiny' },
          tier: 'simple'
        },
        {
          id: 'rate-limited-model',
          name: 'Rate Limited Model',
          contextWindow: 4096,
          maxOutput: 1024,
          capabilities: [],
          quota: { quotaSize: 'tiny' },
          tier: 'simple'
        }]
      }
    ]);

    (getModel as jest.Mock).mockImplementation((providers: any, modelId: string) => {
      const [providerId, modelName] = modelId.split('/');
      const provider = providers.find((p: any) => p.id === providerId);
      if (!provider) return null;
      const model = provider.models.find((m: any) => m.id === modelName);
      return { provider, model };
    });

    // Start server, but catch potential errors during startup in beforeAll
    try {
      serverInstance = await startServer({ port: 0 }); // Start server on a random port
    } catch (error) {
      console.error('Failed to start server in beforeAll:', error);
      // Ensure serverInstance is null if startup fails to prevent TypeError in afterAll
      serverInstance = null as any;
    }
  });

  afterAll(async () => {
    if (serverInstance) {
      // Remove SIGINT handler to prevent hanging
      const shutdownHandler = (serverInstance as any)._shutdownHandler;
      if (shutdownHandler) {
        process.off('SIGINT', shutdownHandler);
      }
      // Close all connections first to prevent hanging
      serverInstance.removeAllListeners('connection');
      serverInstance.close();
    }
    mockExit.mockRestore(); // Restore original process.exit
    resetConfig(); // Reset config state after tests
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before each test
    mockFetch.mockClear();
  });

  it('should log request with correlation ID', async () => {
    // Given
    const requestBody = {
      model: 'test-provider/test-model', // Use full model ID as expected by routeRequest
      messages: [{ role: 'user', content: 'test prompt' }],
    };

    // When - Mock fetch to return a proper Response object
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'chatcmpl-123', object: 'chat.completion', created: 1678888888, model: 'test-model', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }, 200));

    const response = await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody)
      .expect(200);

    // Then
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.any(String),
        prompt: 'test prompt',
      }),
      'Incoming chat completion request'
    );
  });

  it('should log routing decision with tier and confidence', async () => {
    // Given
    const requestBody = {
      model: 'test-provider/test-model',
      messages: [{ role: 'user', content: 'test prompt' }],
    };

    // When
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'chatcmpl-123', object: 'chat.completion', created: 1678888888, model: 'test-model', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }, 200));

    await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody)
      .expect(200);

    // Then
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.any(String),
        tier: 'SIMPLE',
        confidence: expect.any(Number),
        model: expect.any(String),
        reasoning: expect.any(String),
        fallbackChain: expect.any(Array),
        quotaSize: expect.any(String),
      }),
      expect.stringContaining('Routing Decision: SIMPLE')
    );
  });

  it('should log selected model and fallback details', async () => {
    // Given
    const requestBody = {
      model: 'test-provider/test-model',
      messages: [{ role: 'user', content: 'test prompt' }],
    };

    // When
    mockFetch.mockResolvedValueOnce(createMockResponse({ id: 'chatcmpl-123', object: 'chat.completion', created: 1678888888, model: 'test-model', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }, 200));

    await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody)
      .expect(200);

    // Then
    const allInfoCalls = (logger.info as jest.Mock).mock.calls;

    // Check the "Trying" log (e.g., the 3rd or 4th call depending on exact logging)
    // Find the call that matches "Trying 1/"
    const tryingCall = allInfoCalls.find((call: any[]) => typeof call[1] === 'string' && call[1].startsWith('Trying 1/'));
    expect(tryingCall).toBeDefined();
    expect(tryingCall[0]).toEqual(
      expect.objectContaining({
        correlationId: expect.any(String),
        attempt: 1,
        totalAttempts: expect.any(Number),
        modelId: 'test-provider/test-model',
      })
    );
    expect(tryingCall[1]).toEqual(expect.stringContaining('Trying 1/'));

    // Check the "Success" log (this should be the last call if successful)
    const successCall = allInfoCalls.find((call: any[]) => typeof call[1] === 'string' && call[1].startsWith('Success with'));
    expect(successCall).toBeDefined();
    expect(successCall[0]).toEqual(
      expect.objectContaining({
        correlationId: expect.any(String),
        modelId: 'test-provider/test-model',
        status: expect.any(Number),
      })
    );
    expect(successCall[1]).toEqual(expect.stringContaining('Success with test-provider/test-model'));
  });

      it('should throw an error if no providers are configured', async () => {
        // Given
        (getConfig as jest.Mock).mockReturnValueOnce({ server: { port: 0, host: '127.0.0.1' }, providers: {}, providerConfig: {}, logging: { level: 'info' } });
        (getEnabledProviders as jest.Mock).mockReturnValueOnce([]); // Mock no providers
    // When & Then
    await expect(startServer({ port: 0 })).rejects.toThrow('No providers configured. Server cannot start.');
    expect(logger.error).toHaveBeenCalledWith('[Server] ERROR: No providers configured!');
  });

  it('should log rate limit events', async () => {
    // Given
    const rateLimitedModelId = 'test-provider/rate-limited-model';
    (getEnabledProviders as jest.Mock).mockReturnValue([
      {
        id: 'test-provider',
        name: 'Test Provider',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
        enabled: true,
        models: [
          {
            id: 'test-model',
            name: 'Test Model',
            contextWindow: 4096,
            maxOutput: 1024,
            capabilities: [],
            quota: { quotaSize: 'tiny' },
            tier: 'simple'
          },
          {
            id: 'rate-limited-model',
            name: 'Rate Limited Model',
            contextWindow: 4096,
            maxOutput: 1024,
            capabilities: [],
            quota: { quotaSize: 'tiny' },
            tier: 'simple'
          }
        ]
      }
    ]);
    (getModel as jest.Mock).mockImplementation((providers: any, modelId: string) => {
        const provider = providers[0];
        const model = provider.models.find((m: any) => m.id === modelId.split('/')[1]);
        return { provider, model };
    });

    const requestBody = {
      model: rateLimitedModelId,
      messages: [{ role: 'user', content: 'test prompt' }],
    };

    // When - Mock rate limit response first, then successful fallback
    mockFetch
      .mockResolvedValueOnce(createMockResponse({ error: 'rate limited' }, 429))
      .mockResolvedValueOnce(createMockResponse({ id: 'chatcmpl-123', object: 'chat.completion', created: 1678888888, model: 'test-provider/test-model', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }, 200));

    await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody)
      .expect(200);

    // Then
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Rate limited:')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.any(String),
        modelId: 'test-provider/test-model', // The fallback model
        error: 'Provider error',
        status: 429,
        errorBody: '{"error":"rate limited"}',
      }),
      expect.stringContaining(`Provider error from test-provider/test-model, trying fallback`)
    );
  });
});
