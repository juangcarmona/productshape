import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/.astro/**', '**/dist/**', '**/node_modules/**', '.product/**', 'coverage/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
