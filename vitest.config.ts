import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'repo',
          include: ['tests/**/*.test.ts'],
        },
      },
      'packages/*/vitest.config.ts',
    ],
  },
});
