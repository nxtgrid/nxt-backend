import type { NxtConfig } from '#config/schema.js';
import { DemoModule } from './demo.module.js';
import { demoModules } from './demo-modules.js';

function configWithDemo(demo?: { enabled: boolean }): NxtConfig {
  return {
    $schemaVersion: '1',
    deployment: {},
    public: { platformName: 'Test' },
    capabilities: demo ? { demo } : {},
    integrations: {},
  };
}

describe('demoModules', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('is not instantiated when the flag is off (default)', () => {
    expect(demoModules(configWithDemo())).toEqual([]);
  });

  it('blocks boot with a clear MISSING error when enabled but its env var is absent', () => {
    delete process.env.DEMO_REQUIRED_TOKEN;

    expect(() => demoModules(configWithDemo({ enabled: true }))).toThrow('MISSING DEMO_REQUIRED_TOKEN');
  });

  it('loads the module when enabled and its env var is present', () => {
    process.env.DEMO_REQUIRED_TOKEN = 'secret';

    expect(demoModules(configWithDemo({ enabled: true }))).toEqual([ DemoModule ]);
  });
});
