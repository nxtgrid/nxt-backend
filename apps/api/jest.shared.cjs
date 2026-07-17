/* eslint-disable */
const { readFileSync } = require('fs')

const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);
swcJestConfig.swcrc = false;

/** Shared Jest options for api unit / integration / e2e configs. */
const shared = {
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // Source uses explicit `.js` extensions on relative imports (NodeNext); strip for Jest.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coverageDirectory: 'test-output/jest/coverage'
};

module.exports = { shared };
