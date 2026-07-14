import type { NxtConfig } from './schema.js';

let currentConfig: NxtConfig | undefined;

/**
 * Stores the active configuration. Used internally by {@link loadConfig} after validation, and
 * directly by tests as the `setConfig(testConfig)` override pattern (ADR-007 decision 3).
 */
export function setConfig(config: NxtConfig): void {
  currentConfig = config;
}

/**
 * Returns the active configuration. Throws if called before {@link loadConfig} (or
 * `setConfig()` in tests) has run — there is no implicit default (ADR-007 decision 3).
 */
export function getConfig(): NxtConfig {
  if (currentConfig === undefined) {
    throw new Error(
      'getConfig() was called before configuration was loaded. Call loadConfig() in main.ts (or setConfig() in tests) first.',
    );
  }
  return currentConfig;
}

export { loadConfig } from './loader.js';
export type { LoadConfigOptions } from './loader.js';
export type { NxtConfig } from './schema.js';
