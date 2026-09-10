import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { nxtConfigSchema } from '../../../src/config/schema.js';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../');
const DEFAULT_ARTIFACT = join(REPO_ROOT, 'config.default.json');
const EXAMPLE_ARTIFACT = join(REPO_ROOT, 'config.example.json');

const BASE = {
  $schemaVersion: '1' as const,
  public: { platformName: 'Test' },
  capabilities: {},
  integrations: {},
};

function readArtifact(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('nxtConfigSchema', () => {
  it('parses config.default.json with Metering off (missing key)', () => {
    const config = nxtConfigSchema.parse(readArtifact(DEFAULT_ARTIFACT));

    expect(config.capabilities.metering).toBeUndefined();
  });

  it('parses config.example.json with Metering on', () => {
    const config = nxtConfigSchema.parse(readArtifact(EXAMPLE_ARTIFACT));

    expect(config.capabilities.metering).toEqual({ enabled: true });
  });

  it('accepts capabilities.metering.enabled true', () => {
    const config = nxtConfigSchema.parse({
      ...BASE,
      capabilities: { metering: { enabled: true } },
    });

    expect(config.capabilities.metering).toEqual({ enabled: true });
  });

  it('rejects leftover deviceAdapters under metering', () => {
    const result = nxtConfigSchema.safeParse({
      ...BASE,
      capabilities: {
        metering: { enabled: true, deviceAdapters: [] },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain('deviceAdapters');
    }
  });
});
