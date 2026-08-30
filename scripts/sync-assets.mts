/**
 * Mirror the canonical AI assets into the distribution package.
 *
 * The repository-root `skills/`, `commands/` and `templates/` directories are the canonical
 * assets (ADR 0008); `packages/distribution/assets/` is the copy bundled into the published
 * package. The two must stay byte-identical, and `tests/distribution/ai-assets.test.ts` fails
 * CI when they drift. This script replaces the manual mirror step: it copies every canonical
 * file over and removes bundled files whose canonical counterpart is gone.
 *
 * Deliberately NOT part of the build: a build that silently syncs would let CI heal a commit
 * whose author forgot to mirror, and the committed tree would stay wrong while the tests pass.
 * The byte-identity test stays the gate; this script is the one-command way to satisfy it.
 *
 * Run with: pnpm sync:assets
 */
import { copyFile, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const assetsRoot = join(repoRoot, 'packages', 'distribution', 'assets');
const kinds = ['skills', 'commands', 'templates'];

async function listFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch {
    return results; // A kind directory that does not exist contributes nothing.
  }
  for (const entry of entries) {
    if (entry.isFile()) {
      results.push(relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));
    }
  }
  return results.sort();
}

async function sameBytes(a: string, b: string): Promise<boolean> {
  try {
    const [left, right] = await Promise.all([readFile(a), readFile(b)]);
    return left.equals(right);
  } catch {
    return false; // Missing on either side: not identical.
  }
}

let copied = 0;
let removed = 0;

for (const kind of kinds) {
  const canonicalDir = join(repoRoot, kind);
  const bundledDir = join(assetsRoot, kind);
  const canonical = await listFiles(canonicalDir);
  const bundled = await listFiles(bundledDir);
  const canonicalSet = new Set(canonical);

  for (const file of canonical) {
    const from = join(canonicalDir, ...file.split('/'));
    const to = join(bundledDir, ...file.split('/'));
    if (await sameBytes(from, to)) continue;
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    console.log(`copied  ${kind}/${file}`);
    copied += 1;
  }

  for (const file of bundled) {
    if (canonicalSet.has(file)) continue;
    await rm(join(bundledDir, ...file.split('/')), { force: true });
    console.log(`removed ${kind}/${file} (no canonical counterpart)`);
    removed += 1;
  }
}

if (copied === 0 && removed === 0) {
  console.log('Assets already in sync.');
} else {
  console.log(`Synced: ${copied} copied, ${removed} removed.`);
  console.log('Now regenerate the managed provider files: prodshape integration update');
}
