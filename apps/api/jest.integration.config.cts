const { shared } = require('./jest.shared.cjs');

/** `nx run api:test-integration` — needs local Supabase + seed. */
module.exports = {
  ...shared,
  displayName: 'api-integration',
  testMatch: [ '<rootDir>/test/integration/**/*.(spec|test).ts' ],
  passWithNoTests: true,
};
