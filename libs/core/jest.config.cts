/* eslint-disable */
const { readFileSync } = require('fs')

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'core',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig]
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // Source uses explicit `.js` extensions on relative imports (required by the NodeNext
  // module resolution used for the real build); strip them so Jest's resolver finds the
  // sibling `.ts` file instead.
  moduleNameMapper: {
    // In-package subpath imports (package.json "imports"); strip `.js` for TS sources.
    '^#config/(.*)\\.js$': '<rootDir>/src/config/$1',
    '^#modules/(.*)\\.js$': '<rootDir>/src/modules/$1',
    '^#types/(.*)\\.js$': '<rootDir>/src/types/$1',
    // Source uses explicit `.js` extensions on relative imports (NodeNext); strip for Jest.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  coverageDirectory: 'test-output/jest/coverage'
};
