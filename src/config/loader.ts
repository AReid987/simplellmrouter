/**
 * Configuration File Loader
 *
 * Loads YAML configuration files with environment-specific fallback chain.
 * Supports both YAML and JSON formats for configuration files.
 */

import { promises as fs } from 'fs';
import { parse } from 'yaml';
import type { AppConfig } from './schema.js';

/**
 * Determines the current environment from NODE_ENV or defaults to development.
 *
 * @returns The current environment ('development' or 'production')
 */
export function getEnvironment(): 'development' | 'production' {
  const env = process.env.NODE_ENV?.toLowerCase();
  return env === 'production' ? 'production' : 'development';
}

/**
 * Builds the file path for a configuration file.
 *
 * @param filename - The base filename (without extension)
 * @returns The absolute path to the configuration file
 */
export function getConfigPath(filename: string): string {
  return `${process.cwd()}/config/${filename}`;
}

/**
 * Loads and parses a YAML or JSON configuration file.
 *
 * @param filePath - The absolute path to the configuration file
 * @returns The parsed configuration object
 * @throws Error if file doesn't exist, is empty, or contains invalid YAML/JSON
 */
async function loadAndParseConfigFile(filePath: string): Promise<unknown> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for empty file
    if (!content.trim()) {
      throw new Error(`Configuration file is empty: ${filePath}`);
    }

    // Try YAML first, then JSON
    try {
      return parse(content);
    } catch (yamlError) {
      // If YAML parsing fails, try JSON
      try {
        return JSON.parse(content);
      } catch (jsonError) {
        throw new Error(
          `Invalid configuration file format: ${filePath}\n` +
          `YAML Error: ${(yamlError as Error).message}\n` +
          `JSON Error: ${(jsonError as Error).message}`
        );
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Configuration file not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Loads the application configuration file with environment-specific fallback chain.
 *
 * Fallback chain (in order):
 * 1. config/providers.{environment}.yaml
 * 2. config/providers.yaml
 * 3. config/providers.default.yaml
 *
 * @param environmentOrFilename - The environment to load config for (default: from NODE_ENV),
 *                                or a specific filename for testing purposes
 * @returns The loaded configuration object (validation happens separately)
 * @throws Error if no configuration file can be loaded
 */
export async function loadConfigFile(
  environmentOrFilename?: 'development' | 'production' | string
): Promise<unknown> {
  // If it looks like a filename (contains a dot), use it directly
  // Check if it's an absolute path or contains a dot (but not just 'development' or 'production')
  if (environmentOrFilename && environmentOrFilename.includes('.')) {
    // If it's an absolute path, use it directly
    if (environmentOrFilename.startsWith('/')) {
      return loadAndParseConfigFile(environmentOrFilename);
    }
    // Otherwise, treat it as a filename in the config directory
    const filePath = getConfigPath(environmentOrFilename);
    return loadAndParseConfigFile(filePath);
  }

  const env = (environmentOrFilename as 'development' | 'production' | undefined) || getEnvironment();

  // Build fallback chain
  const fallbackChain = [
    `providers.${env}.yaml`,
    `providers.${env}.yml`,
    `providers.yaml`,
    `providers.yml`,
    `providers.default.yaml`,
    `providers.default.yml`,
  ];

  const errors: string[] = [];

  // Try each file in the fallback chain
  for (const filename of fallbackChain) {
    const filePath = getConfigPath(filename);

    try {
      const config = await loadAndParseConfigFile(filePath);
      return config;
    } catch (error) {
      errors.push(`- ${filename}: ${(error as Error).message}`);
      // Continue to next file in chain
    }
  }

  // If we get here, no file could be loaded
  throw new Error(
    `Failed to load configuration file.\n` +
    `Attempted files (in order):\n${errors.join('\n')}\n\n` +
    `Please create one of these files with your provider configuration.`
  );
}

/**
 * Loads the application configuration from a specific file.
 *
 * @param filename - The configuration filename (e.g., 'providers.development.yaml')
 * @returns The loaded configuration object
 * @throws Error if the file cannot be loaded
 */
export async function loadConfigFromFile(filename: string): Promise<unknown> {
  const filePath = getConfigPath(filename);
  return loadAndParseConfigFile(filePath);
}

/**
 * Checks if a configuration file exists at the given path.
 *
 * @param filename - The configuration filename to check
 * @returns True if the file exists, false otherwise
 */
export async function configExists(filename: string): Promise<boolean> {
  const filePath = getConfigPath(filename);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
