import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests resolve workspace packages from source so no build step is required.
export const workspaceSourceAliases = {
  '@prodshape/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
  '@prodshape/cli': fileURLToPath(new URL('./packages/cli/src/index.ts', import.meta.url)),
  '@prodshape/distribution': fileURLToPath(
    new URL('./packages/distribution/src/index.ts', import.meta.url),
  ),
  '@prodshape/integration-openspec': fileURLToPath(
    new URL('./packages/integration-openspec/src/index.ts', import.meta.url),
  ),
  '@prodshape/integration-speckit': fileURLToPath(
    new URL('./packages/integration-speckit/src/index.ts', import.meta.url),
  ),
  '@prodshape/integration-claude': fileURLToPath(
    new URL('./packages/integration-claude/src/index.ts', import.meta.url),
  ),
  '@prodshape/integration-codex': fileURLToPath(
    new URL('./packages/integration-codex/src/index.ts', import.meta.url),
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
          // These are end-to-end filesystem tests, not unit tests: a single case can run `init`
          // for two providers (writing ~58 files and hashing every one of them) and then
          // regenerate the lot through `integration update`. On a slow Windows runner that
          // exceeds vitest's 5s default, which showed up as intermittent timeouts on
          // windows-latest while every other matrix combination passed. The work is real, so the
          // budget is raised rather than the tests trimmed; the unit projects keep the default.
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      'packages/*/vitest.config.ts',
    ],
  },
});
