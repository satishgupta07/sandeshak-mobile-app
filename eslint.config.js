const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const reactHooks = require('eslint-plugin-react-hooks')
const prettier = require('eslint-config-prettier')

module.exports = [
  { ignores: ['node_modules', '.expo', 'dist'] },

  // Base recommended for everything
  js.configs.recommended,

  // TypeScript / React rules — only for app source
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['**/*.{ts,tsx}'] })),
  { ...reactHooks.configs.flat.recommended, files: ['**/*.{ts,tsx}'] },

  // Node CJS context for the build/tooling config files at the repo root
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        exports: 'writable',
      },
    },
  },

  // Project-specific rules
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Allow unused params prefixed with _ (e.g. _props)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  prettier, // must be last — disables rules that conflict with Prettier
]
