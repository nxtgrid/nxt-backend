import nx from '@nx/eslint-plugin';

/** Team style + pragmas ported from legacy/eslint.config.ts (rules block only). */
const teamRules = {
  'no-debugger': 'off',
  'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
  'one-var': ['warn', 'never'],
  eqeqeq: ['warn', 'smart'],
  'id-length': ['warn', { min: 2, properties: 'never', exceptions: ['i'] }],
  'dot-notation': 'warn',
  semi: ['warn', 'always'],
  indent: ['warn', 2, { SwitchCase: 1 }],
  'no-multiple-empty-lines': 'warn',
  quotes: ['warn', 'single'],
  'comma-dangle': [
    'warn',
    {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'always-multiline',
    },
  ],
  'array-bracket-spacing': ['warn', 'always'],
  'object-curly-spacing': ['warn', 'always'],
  'template-curly-spacing': ['warn', 'always'],
  'arrow-parens': ['warn', 'as-needed'],
  'brace-style': ['warn', 'stroustrup', { allowSingleLine: true }],
  'no-trailing-spaces': 'warn',
  'eol-last': 'warn',
  '@typescript-eslint/no-var-requires': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-require-imports': 'off',
  'no-undef': 'off',
  'no-warning-comments': 'off',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
};

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/coverage',
      '**/node_modules',
      '**/.nx/**',
      '**/generated/**',
      'legacy/**',
      'supabase/**',
      '**/main.js',
      '**/*.js.map',
      '**/*.d.ts',
      '**/*.d.ts.map',
      '**/*.spec.js',
      'test-output/**',
      '**/eslint.config.mjs',
      'eslint.config.mjs',
      'jest.config.ts',
      'jest.preset.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: teamRules,
  },
  {
    files: ['**/*.config.js', 'jest.preset.js', '**/webpack.config.js'],
    languageOptions: {
      sourceType: 'script',
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
