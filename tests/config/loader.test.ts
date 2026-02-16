/**
 * Configuration File Loader Tests
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import {
  getEnvironment,
  getConfigPath,
  loadConfigFile,
  loadConfigFromFile,
  configExists,
} from '../../src/config/loader.js';

// Mock the file system
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    access: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Configuration File Loader', () => {
  const mockValidConfig = {
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

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV
    process.env.NODE_ENV = undefined;
  });

  describe('getEnvironment', () => {
    it('should return development by default', () => {
      expect(getEnvironment()).toBe('development');
    });

    it('should return production when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      expect(getEnvironment()).toBe('production');
    });

    it('should return production when NODE_ENV=PRODUCTION', () => {
      process.env.NODE_ENV = 'PRODUCTION';
      expect(getEnvironment()).toBe('production');
    });

    it('should return development for any other value', () => {
      process.env.NODE_ENV = 'staging';
      expect(getEnvironment()).toBe('development');
    });
  });

  describe('getConfigPath', () => {
    it('should build absolute path to config file', () => {
      const path = getConfigPath('test.yaml');
      expect(path).toContain('config/test.yaml');
      expect(path.startsWith('/')).toBe(true);
    });
  });

  describe('loadConfigFile', () => {
    it('should load environment-specific YAML file when NODE_ENV=development', async () => {
      process.env.NODE_ENV = 'development';
      const mockBaseConfig = { ...mockValidConfig, server: { port: 8080, host: 'base-host' } };
      const mockEnvConfig = { server: { port: 8402, host: 'env-host' } };
      const mergedConfig = { ...mockBaseConfig, server: { ...mockBaseConfig.server, ...mockEnvConfig.server } };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockBaseConfig)) // providers.yaml
        .mockResolvedValueOnce(JSON.stringify(mockEnvConfig)); // providers.development.yaml

      const result = await loadConfigFile();

      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('config/providers.yaml'),
        'utf-8'
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('config/providers.development.yaml'),
        'utf-8'
      );
      expect(result).toEqual(mergedConfig);
    });

    it('should load base config when environment-specific override files are missing', async () => {
      process.env.NODE_ENV = 'development';
      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(mockValidConfig)) // providers.yaml (base config)
        .mockRejectedValueOnce({ code: 'ENOENT' } as NodeJS.ErrnoException) // providers.development.yaml
        .mockRejectedValueOnce({ code: 'ENOENT' } as NodeJS.ErrnoException); // providers.development.yml

      const result = await loadConfigFile();

      expect(mockFs.readFile).toHaveBeenCalledTimes(3);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('config/providers.yaml'),
        'utf-8'
      );
      // No specific expectation for .development.yaml or .development.yml as they are rejected
      expect(result).toEqual(mockValidConfig);
    });

    it('should throw descriptive error when providers.yaml is not found', async () => {
      process.env.NODE_ENV = 'development';
      mockFs.readFile
        .mockRejectedValueOnce({ code: 'ENOENT', message: 'File not found' } as NodeJS.ErrnoException); // providers.yaml

      await expect(loadConfigFile()).rejects.toThrow('Failed to load base configuration file: providers.yaml');
    });

    it('should throw descriptive error when no config files exist', async () => {
      process.env.NODE_ENV = 'development';
      mockFs.readFile.mockRejectedValue({
        code: 'ENOENT',
        message: 'File not found',
      } as NodeJS.ErrnoException);

      await expect(loadConfigFile()).rejects.toThrow('Failed to load base configuration file');
    });

    it('should throw descriptive error for empty config file', async () => {
      mockFs.readFile.mockResolvedValueOnce('   \n  \n  ');

      await expect(loadConfigFile('test.yaml' as string)).rejects.toThrow('Configuration file is empty');
    });

    it('should parse YAML configuration', async () => {
      const yamlContent = `
server:
  port: 8402
  host: localhost

providers:
  mistral:
    id: mistral
    name: Mistral AI
    baseUrl: https://api.mistral.ai/v1
    enabled: true
    models:
      - id: mistral-tiny
        name: Mistral Tiny
        contextWindow: 32000
        maxOutput: 2000
        capabilities:
          - chat
          - completion
        quota:
          quotaSize: tiny
          rpm: 60
        tier: simple

logging:
  level: info
  format: pretty
`;

      mockFs.readFile.mockResolvedValueOnce(yamlContent);

      const result = await loadConfigFile('test.yaml' as string);

      expect(result).toBeDefined();
      expect((result as any).server.port).toBe(8402);
    });

    it('should parse JSON configuration', async () => {
      const jsonContent = JSON.stringify(mockValidConfig, null, 2);
      mockFs.readFile.mockResolvedValueOnce(jsonContent);

      const result = await loadConfigFile('test.json' as string);

      expect(result).toEqual(mockValidConfig);
    });

    it('should throw descriptive error for invalid YAML', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid:\n  - broken\nyaml content');

      await expect(loadConfigFile('test.yaml' as string)).rejects.toThrow('Invalid configuration file format');
    });

    it('should throw descriptive error for invalid JSON', async () => {
      // This is neither valid YAML nor valid JSON
      mockFs.readFile.mockResolvedValueOnce('{{ invalid: {{ }');

      await expect(loadConfigFile('test.json' as string)).rejects.toThrow('Invalid configuration file format');
    });
  });

  describe('loadConfigFromFile', () => {
    it('should load configuration from specific filename', async () => {
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockValidConfig));

      const result = await loadConfigFromFile('custom-config.yaml');

      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('config/custom-config.yaml'),
        'utf-8'
      );
      expect(result).toEqual(mockValidConfig);
    });

    it('should throw error when specified file does not exist', async () => {
      mockFs.readFile.mockRejectedValue({
        code: 'ENOENT',
        message: 'File not found',
      } as NodeJS.ErrnoException);

      await expect(loadConfigFromFile('nonexistent.yaml')).rejects.toThrow('Configuration file not found');
    });
  });

  describe('configExists', () => {
    it('should return true when config file exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const exists = await configExists('test.yaml');

      expect(exists).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith(
        expect.stringContaining('config/test.yaml')
      );
    });

    it('should return false when config file does not exist', async () => {
      mockFs.access.mockRejectedValue({ code: 'ENOENT' } as NodeJS.ErrnoException);

      const exists = await configExists('test.yaml');

      expect(exists).toBe(false);
    });
  });
});
