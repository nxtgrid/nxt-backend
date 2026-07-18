const { shared } = require('./jest.shared.cjs');

/** Default `nx test api` — unit only (no local Supabase / stack). */
module.exports = {
  ...shared,
  displayName: 'api',
  testMatch: [ '<rootDir>/test/unit/**/*.(spec|test).ts' ],
  passWithNoTests: true,
};
