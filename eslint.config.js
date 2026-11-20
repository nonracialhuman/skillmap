import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', '.impeccable'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      // Plain-JS project without PropTypes; props are validated at the API boundary (server/schema.js).
      'react/prop-types': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  {
    // Server, serverless functions, config and tests run in Node.
    files: ['api/**/*.js', 'server/**/*.js', 'scripts/**/*.js', 'shared/**/*.js', 'tests/**/*.js', 'e2e/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  // Layer boundaries: the browser bundle must never pull in server code (it holds
  // secrets handling and Node APIs), and server/shared code must not depend on React.
  {
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/server/**', '**/api/**'], message: 'Browser code must not import server code. Put shared logic in shared/.' }] }],
    },
  },
  {
    files: ['server/**/*.js', 'api/**/*.js', 'shared/**/*.js'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/src/**', 'react', 'react-dom', 'lucide-react'], message: 'Server and shared code must not depend on the React client.' }] }],
    },
  },
]
