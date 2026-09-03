// Stage the data files the CLI needs at runtime into the package, so the published, self-contained
// bundle can resolve them relative to dist/ (../schemas, ../assets) exactly as it does in the
// monorepo. Run as part of `build`, after tsup. Sources are the canonical schemas and the
// distribution package's bundled assets; both have their own conformance tests upstream.
import { cp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const repoRoot = join(pkg, '..', '..');

const targets = [
  { from: join(repoRoot, 'schemas'), to: join(pkg, 'schemas') },
  { from: join(repoRoot, 'packages', 'distribution', 'assets'), to: join(pkg, 'assets') },
  // The OpenSpec product schema ships with integration-openspec, which the CLI bundles; its
  // assets must ride inside the CLI package the same way the distribution assets do. Staged
  // after the distribution assets because that target replaces the whole assets directory.
  {
    from: join(
      repoRoot,
      'packages',
      'integration-openspec',
      'assets',
      'openspec-product-change-schema',
    ),
    to: join(pkg, 'assets', 'openspec-product-change-schema'),
  },
];

for (const { from, to } of targets) {
  await rm(to, { recursive: true, force: true });
  await cp(from, to, { recursive: true });
  console.log(`staged ${from} -> ${to}`);
}
