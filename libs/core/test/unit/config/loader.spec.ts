import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../../../src/config/loader.js';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const FROM_PATH_FIXTURE = join(FIXTURES_DIR, 'from-path.config.json');
const FROM_DEFAULT_FIXTURE = join(FIXTURES_DIR, 'from-default.config.json');
const INVALID_SCHEMA_VERSION_FIXTURE = join(FIXTURES_DIR, 'invalid-schema-version.config.json');

const INLINE_JSON = JSON.stringify({
  $schemaVersion: '1',
  public: { platformName: 'From NXT_CONFIG_JSON' },
  capabilities: {},
  integrations: {},
});

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('resolves from the bundled default when no env var is set', () => {
    delete process.env.NXT_CONFIG_JSON;
    delete process.env.NXT_CONFIG_PATH;

    const config = loadConfig({ defaultConfigPath: FROM_DEFAULT_FIXTURE });

    expect(config.public.platformName).toBe('From bundled default');
  });

  it('prefers NXT_CONFIG_PATH over the bundled default', () => {
    delete process.env.NXT_CONFIG_JSON;
    process.env.NXT_CONFIG_PATH = FROM_PATH_FIXTURE;

    const config = loadConfig({ defaultConfigPath: FROM_DEFAULT_FIXTURE });

    expect(config.public.platformName).toBe('From NXT_CONFIG_PATH');
  });

  it('prefers NXT_CONFIG_JSON over NXT_CONFIG_PATH and the bundled default', () => {
    process.env.NXT_CONFIG_JSON = INLINE_JSON;
    process.env.NXT_CONFIG_PATH = FROM_PATH_FIXTURE;

    const config = loadConfig({ defaultConfigPath: FROM_DEFAULT_FIXTURE });

    expect(config.public.platformName).toBe('From NXT_CONFIG_JSON');
  });

  it('rejects a $schemaVersion mismatch with a clear, path-based error', () => {
    delete process.env.NXT_CONFIG_JSON;
    process.env.NXT_CONFIG_PATH = INVALID_SCHEMA_VERSION_FIXTURE;

    expect(() => loadConfig({ defaultConfigPath: FROM_DEFAULT_FIXTURE })).toThrow(/\$schemaVersion/);
  });

  it('freezes the resolved configuration', () => {
    delete process.env.NXT_CONFIG_JSON;
    delete process.env.NXT_CONFIG_PATH;

    const config = loadConfig({ defaultConfigPath: FROM_DEFAULT_FIXTURE });

    expect(Object.isFrozen(config)).toBe(true);
  });
});
