import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@product-definition-as-code/core': fileURLToPath(
        new URL('../core/src/index.ts', import.meta.url),
      ),
      '@product-definition-as-code/distribution': fileURLToPath(
        new URL('../distribution/src/index.ts', import.meta.url),
      ),
      '@product-definition-as-code/adapter-openspec': fileURLToPath(
        new URL('../adapter-openspec/src/index.ts', import.meta.url),
      ),
      '@product-definition-as-code/integration-claude': fileURLToPath(
        new URL('../integration-claude/src/index.ts', import.meta.url),
      ),
      '@product-definition-as-code/integration-copilot': fileURLToPath(
        new URL('../integration-copilot/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    name: 'cli',
    include: ['src/**/*.test.ts'],
  },
});
