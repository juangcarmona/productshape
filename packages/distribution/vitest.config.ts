import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'distribution',
    include: ['src/**/*.test.ts'],
  },
});
