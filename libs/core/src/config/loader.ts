import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { deepFreeze } from './deep-freeze.js';
import { setConfig } from './index.js';
import { nxtConfigSchema, type NxtConfig } from './schema.js';

const DEFAULT_CONFIG_FILENAME = 'config.default.json';

export interface LoadConfigOptions {
  /**
   * Overrides the resolved path to the bundled default config. Intended for tests exercising
   * precedence order without depending on the real repo-root artifact.
   */
  defaultConfigPath?: string;
}

/**
 * Resolves, parses, validates, freezes, and stores the host configuration. Must run
 * before `NestFactory.create` (ADR-007 decision 3) — nothing may read `getConfig()` earlier.
 *
 * Precedence: `NXT_CONFIG_JSON` (inline) → `NXT_CONFIG_URL` (fetch — reserved slot, not
 * implemented, see ADR-007 decision 4) → `NXT_CONFIG_PATH` (file) → bundled
 * `config.default.json`.
 */
export function loadConfig(options: LoadConfigOptions = {}): NxtConfig {
  const rawJson = resolveRawConfig(options);
  const config = parseConfig(rawJson);
  const frozenConfig = deepFreeze(config);
  setConfig(frozenConfig);
  return frozenConfig;
}

function resolveRawConfig(options: LoadConfigOptions): string {
  const inlineJson = process.env.NXT_CONFIG_JSON;
  if (inlineJson) {
    return inlineJson;
  }

  // NXT_CONFIG_URL (fetch) — reserved precedence slot for a future async config source
  // (ADR-007 decision 4: CMS dump / object-store URL). Not implemented: no runtime check here
  // by design — see the 002c decisions log (2026-07-14, Task 3).

  const configPath = process.env.NXT_CONFIG_PATH;
  if (configPath) {
    return readConfigFile(configPath);
  }

  return readConfigFile(options.defaultConfigPath ?? resolveDefaultConfigPath());
}

function readConfigFile(path: string): string {
  try {
    return readFileSync(path, 'utf-8');
  }
  catch (cause) {
    throw new Error(`Failed to read config file at "${ path }": ${ (cause as Error).message }`, { cause });
  }
}

function resolveDefaultConfigPath(): string {
  const bundleDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(bundleDir, DEFAULT_CONFIG_FILENAME), // copied alongside the built app (webpack asset)
    join(process.cwd(), DEFAULT_CONFIG_FILENAME), // repo root — dev/test runs
  ];

  const found = candidates.find(candidate => existsSync(candidate));
  if (!found) {
    throw new Error(
      `Could not locate the bundled default config ("${ DEFAULT_CONFIG_FILENAME }"). Looked in: ${ candidates.join(', ') }`,
    );
  }
  return found;
}

function parseConfig(rawJson: string): NxtConfig {
  let candidate: unknown;
  try {
    candidate = JSON.parse(rawJson);
  }
  catch (cause) {
    throw new Error(`Failed to parse config JSON: ${ (cause as Error).message }`, { cause });
  }

  const result = nxtConfigSchema.safeParse(candidate);
  if (!result.success) {
    const issues = result.error.issues
      .map(issue => `  - ${ issue.path.join('.') || '(root)' }: ${ issue.message }`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${ issues }`);
  }

  return result.data;
}
