import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests resolve workspace packages from source so no build step is required.
export const workspaceSourceAliases = {
  '@product-definition-as-code/core': fileURLToPath(
    new URL('./packages/core/src/index.ts', import.meta.url),
  ),
  '@product-definition-as-code/cli': fileURLToPath(
    new URL('./packages/cli/src/index.ts', import.meta.url),
  ),
  '@product-definition-as-code/distribution': fileURLToPath(
    new URL('./packages/distribution/src/index.ts', import.meta.url),
  ),
  '@product-definition-as-code/adapter-openspec': fileURLToPath(
    new URL('./packages/adapter-openspec/src/index.ts', import.meta.url),
  ),
  '@product-definition-as-code/integration-claude': fileURLToPath(
    new URL('./packages/integration-claude/src/index.ts', import.meta.url),
  ),
  '@product-definition-as-code/integration-copilot': fileURLToPath(
    new URL('./packages/integration-copilot/src/index.ts', import.meta.url),
  ),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: workspaceSourceAliases },
        test: {
          name: 'repo',
          include: ['tests/**/*.test.ts'],
        },
      },
      'packages/*/vitest.config.ts',
    ],
  },
});
