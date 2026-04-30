import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // ✅ Base JS + TypeScript recommendations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ✅ TypeScript project config
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.base.json'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Custom rules from your original config
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
      'no-trailing-spaces': ['warn'],
      'eol-last': ['warn'],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
      'no-warning-comments': 'off', // optional
      'eslint-comments/no-unused-disable': 'off', // ✅ turn this off to skip these warnings
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  // ✅ Jest test files
  {
    files: ['*.spec.ts'],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
  },

  // ✅ Global ignores (replaces .eslintignore)
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'generated/**',
      'supabase/**/*',
      '.nx/cache/**',
      '**/main.js',
      '**/*.js.map',
      '**/*.d.ts',
      '**/*.d.ts.map',
      '**/*.spec.js',
      'eslint.config.ts',
      '.scripts/**/*'
    ],
  },

  // ✅ Node.js globals (safe across .ts/.js)
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      globals: {
        console: true,
        process: true,
        setInterval: true,
        clearInterval: true,
      },
    },
  },

  // ✅ CommonJS config files (webpack, jest.preset, etc.)
  {
    files: ['*.config.js', 'jest.preset.js', '**/webpack.config.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        require: true,
        module: true,
        exports: true,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ✅ Nx plugin and rules
  {
    plugins: {
      '@nx': (await import('@nx/eslint-plugin')).default,
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        { allowCircularSelfDependency: true },
      ],
    },
  },
];
