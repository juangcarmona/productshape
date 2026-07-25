import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests resolve workspace packages from source so no build step is required.
export const workspaceSourceAliases = {
  '@prodshape/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
  '@prodshape/cli': fileURLToPath(new URL('./packages/cli/src/index.ts', import.meta.url)),
  '@prodshape/distribution': fileURLToPath(
    new URL('./packages/distribution/src/index.ts', import.meta.url),
  ),
  '@prodshape/adapter-openspec': fileURLToPath(
    new URL('./packages/adapter-openspec/src/index.ts', import.meta.url),
  ),
  '@prodshape/integration-claude': fileURLToPath(
    new URL('./packages/integration-claude/src/index.ts', import.meta.url),
  ),
  '@prodshape/integration-copilot': fileURLToPath(
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
