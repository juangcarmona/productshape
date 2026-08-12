import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

// Resolve each internal @prodshape/* package to its TypeScript source so the CLI bundles them
// directly. This keeps the published package.json free of any workspace dependency (plain
// `npm publish` then produces valid metadata) and makes the CLI a self-contained executable.
// The bundled code loads schemas and assets relative to dist/ (../schemas, ../assets); those are
// staged into this package by scripts/stage.mjs and ship in the published tarball.
const internal = (pkg: string) => fileURLToPath(new URL(`../${pkg}/src/index.ts`, import.meta.url));

export default defineConfig({
  entry: ['src/bin.ts'],
  format: ['esm'],
  // No sourcemap in the published bundle: it would reference source files the package does not
  // ship. Debug against the monorepo instead.
  sourcemap: false,
  clean: true,
  esbuildOptions(options) {
    options.alias = {
      '@prodshape/core': internal('core'),
      '@prodshape/distribution': internal('distribution'),
      '@prodshape/integration-openspec': internal('integration-openspec'),
      '@prodshape/integration-claude': internal('integration-claude'),
      '@prodshape/integration-codex': internal('integration-codex'),
      '@prodshape/integration-copilot': internal('integration-copilot'),
    };
  },
});
