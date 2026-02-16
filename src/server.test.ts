// src/server.test.ts
import type { Server } from 'node:http';
import request from 'supertest';
import { startServer } from './server';
import { logger } from './lib/logging/logger';
import { loadAllProviders, getModel } from './providers'; // Import the actual functions to mock them properly

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

    serverInstance = await startServer({ port: 0 }); // Start server on a random port
  });

  afterAll((done) => {
    serverInstance.close(done);
    mockExit.mockRestore(); // Restore original process.exit
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before each test
  });

  it('should log request with correlation ID', async () => {
    // Given
    const requestBody = {
      model: 'test-provider/test-model', // Use full model ID as expected by routeRequest
      messages: [{ role: 'user', content: 'test prompt' }],
    };

    // When
    await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody);

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
    await request(serverInstance)
      .post('/v1/chat/completions')
      .send(requestBody);

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
});
