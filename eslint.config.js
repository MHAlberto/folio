import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '.astro/**',
      '.wrangler/**',
      'worker-configuration.d.ts',
      'output/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        crypto: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        document: 'readonly',
        window: 'readonly',
        history: 'readonly',
        location: 'readonly',
        CSS: 'readonly',
        IntersectionObserver: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.astro'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
