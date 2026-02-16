// src/server.test.ts
import type { Server } from 'node:http';
import request from 'supertest';
import { startServer } from './server';
import { logger } from './lib/logging/logger';
import { loadAllProviders, getModel } from './providers'; // Import the actual functions to mock them properly
import fetchMock from 'jest-fetch-mock';

require('jest-fetch-mock').enableMocks();

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

// Mock providers.js
jest.mock('./providers', () => ({
  loadAllProviders: jest.fn(),
  getModel: jest.fn(),
}));

describe('Server', () => {
  jest.setTimeout(30000); // 30 seconds timeout for all tests in this suite
  let serverInstance: Server;

  beforeAll(async () => {
    // Set up mock return values for providers
    (loadAllProviders as jest.Mock).mockReturnValue([
      {
        id: 'test-provider',
        name: 'Test Provider',
        baseUrl: 'http://localhost:1234',
        apiKey: 'test-key',
        enabled: true,
        models: [{
          id: 'test-model',
          name: 'Test Model',
          contextWindow: 4096,
          maxOutput: 1024,
          capabilities: [],
          quota: { quotaSize: 'tiny' },
          tier: 'simple'
        }]
      }
    ]);

    (getModel as jest.Mock).mockImplementation((providers: any, modelId: string) => ({
      provider: providers[0],
      model: providers[0].models.find((m: any) => m.id === modelId || `${providers[0].id}/${m.id}` === modelId)
    }));

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
      // Use a Promise to handle server close, and race it against a timeout
      await Promise.race([
        new Promise<void>((resolve) => serverInstance.close(() => resolve())),
        new Promise<void>((resolve) => setTimeout(() => {
          console.warn('Server close timed out, forcing resolve.');
          resolve();
        }, 60000)) // 60 seconds timeout for server close
      ]);
    }
    mockExit.mockRestore(); // Restore original process.exit
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before each test
    fetchMock.resetMocks();
  });

  it('should log request with correlation ID', async () => {
    // Given
    const requestBody = {
      model: 'test-provider/test-model', // Use full model ID as expected by routeRequest
      messages: [{ role: 'user', content: 'test prompt' }],
    };

    // When
    fetchMock.mockResponseOnce(JSON.stringify({ id: 'chatcmpl-123', object: 'chat.completion', created: 1678888888, model: 'test-model', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }), { status: 200 });
    await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody)
      .expect(200)
      .then((res) => res.body);

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
    fetchMock.mockResponseOnce(JSON.stringify({ id: 'chatcmpl-123', object: 'chat.completion', created: 1678888888, model: 'test-model', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }), { status: 200 });
    await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody)
      .expect(200)
      .then((res) => res.body);

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
    fetchMock.mockResponseOnce(JSON.stringify({ id: 'chatcmpl-123', object: 'chat.completion', created: 1678888888, model: 'test-model', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }), { status: 200 });
    await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody)
      .expect(200)
      .then((res) => res.body);

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
    (loadAllProviders as jest.Mock).mockReturnValueOnce([]); // Mock no providers

    // When & Then
    await expect(startServer({ port: 0 })).rejects.toThrow('No providers configured. Server cannot start.');
    expect(logger.error).toHaveBeenCalledWith('[Server] ERROR: No providers configured!');
  });
});
