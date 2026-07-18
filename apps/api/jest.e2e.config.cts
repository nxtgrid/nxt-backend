const { shared } = require('./jest.shared.cjs');

/** `nx run api:test-e2e` — needs local Supabase + seed. */
module.exports = {
  ...shared,
  displayName: 'api-e2e',
  testMatch: [ '<rootDir>/test/e2e/**/*.(spec|test).ts' ],
  passWithNoTests: true,
};
