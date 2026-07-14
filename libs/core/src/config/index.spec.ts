import { getConfig, setConfig } from './index.js';
import type { NxtConfig } from './schema.js';

const testConfig: NxtConfig = Object.freeze({
  $schemaVersion: '1',
  deployment: {},
  public: { platformName: 'Test' },
  capabilities: {},
  integrations: {},
});

describe('getConfig / setConfig', () => {
  it('throws a clear error when called before configuration is loaded', () => {
    expect(() => getConfig()).toThrow(/before configuration was loaded/);
  });

  it('returns the value set via setConfig (the test override pattern)', () => {
    setConfig(testConfig);

    expect(getConfig()).toBe(testConfig);
  });
});
