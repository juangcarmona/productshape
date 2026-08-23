import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@prodshape/core': fileURLToPath(new URL('../core/src/index.ts', import.meta.url)),
      '@prodshape/distribution': fileURLToPath(
        new URL('../distribution/src/index.ts', import.meta.url),
      ),
      '@prodshape/integration-openspec': fileURLToPath(
        new URL('../integration-openspec/src/index.ts', import.meta.url),
      ),
      '@prodshape/integration-speckit': fileURLToPath(
        new URL('../integration-speckit/src/index.ts', import.meta.url),
      ),
      '@prodshape/integration-claude': fileURLToPath(
        new URL('../integration-claude/src/index.ts', import.meta.url),
      ),
      '@prodshape/integration-codex': fileURLToPath(
        new URL('../integration-codex/src/index.ts', import.meta.url),
      ),
      '@prodshape/integration-copilot': fileURLToPath(
        new URL('../integration-copilot/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    name: 'cli',
    include: ['src/**/*.test.ts'],
  },
});
