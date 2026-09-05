#!/usr/bin/env node
/**
 * Release drift check.
 *
 * A published `@prodshape/*` library resolves its `@prodshape` dependencies from npm, not from
 * this workspace. When a package's shipped source changes without a changeset, npm keeps serving
 * the old version while dependents built against the new source break at import time. That is
 * what happened to `@prodshape/integration-speckit@0.4.0-alpha.0`: it imports
 * `validateHostedProductChange` from a `@prodshape/core@0.20.0` that never exported it.
 *
 * For every publishable workspace package this compares the shipped source directories at HEAD
 * with the git tag of the package's current version (the commit npm was published from) and
 * fails when they differ and no pending changeset names the package. A missing tag means the
 * version is not published yet, which is not drift.
 */
import { execFile } from 'node:child_process';
import { statSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export const REPOSITORY_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Test files and snapshots ship in `src` but change no published behaviour. */
const NOT_SHIPPED = /(^|\/)(__snapshots__\/|[^/]+\.(test|spec)\.[cm]?[jt]sx?$)/;

export function isShippedSourcePath(path) {
  return !NOT_SHIPPED.test(path.split('\\').join('/'));
}

/**
 * The directories whose content reaches npm as source or data: `src` (dist is built from it)
 * plus every directory entry of the manifest's `files` other than `dist`.
 */
export function shippedSourceDirs(manifest, isDirectory = () => true) {
  const dirs = new Set(['src']);
  for (const entry of manifest.files ?? []) {
    const name = entry.replace(/\/+$/, '');
    // Files in the list (README.md, LICENSE, CHANGELOG) are not source or data; only directories are.
    if (name === 'dist' || name.includes('.') || name.includes('*') || /^[A-Z]+$/.test(name)) {
      continue;
    }
    if (!isDirectory(name)) continue;
    dirs.add(name);
  }
  return [...dirs].sort();
}

/** The package names a changeset's frontmatter bumps. */
export function parseChangesetPackages(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/)
    .map((line) => /^\s*['"]?(@?[\w./-]+)['"]?\s*:/.exec(line)?.[1])
    .filter((name) => name !== undefined);
}

/**
 * One package's verdict. `unpublished`: the current version has no tag, so nothing on npm can
 * lag it. `clean`: shipped source equals the tag. `changeset pending`: it differs and a changeset
 * names the package, so the next release ships it. `drift`: it differs and nothing will publish it.
 */
export function classifyPackage({ tagPresent, changedFiles, hasChangeset }) {
  if (!tagPresent) return 'unpublished';
  if (changedFiles.length === 0) return 'clean';
  return hasChangeset ? 'changeset pending' : 'drift';
}

export async function readWorkspacePackages(root = REPOSITORY_ROOT) {
  const packagesDir = join(root, 'packages');
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const packages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    let manifest;
    try {
      manifest = JSON.parse(await readFile(join(packagesDir, entry.name, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    if (manifest.private || typeof manifest.name !== 'string') continue;
    packages.push({ name: manifest.name, version: manifest.version, dir: entry.name, manifest });
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readPendingChangesets(root = REPOSITORY_ROOT) {
  const dir = join(root, '.changeset');
  const names = new Set();
  for (const entry of await readdir(dir)) {
    if (!entry.endsWith('.md') || entry === 'README.md') continue;
    for (const name of parseChangesetPackages(await readFile(join(dir, entry), 'utf8'))) {
      names.add(name);
    }
  }
  return names;
}

function isDirectorySync(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

async function git(root, args) {
  const { stdout } = await execFileAsync('git', args, { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

async function tagExists(root, tag) {
  try {
    await git(root, ['rev-parse', '-q', '--verify', `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

async function changedPaths(root, tag, dirs) {
  const stdout = await git(root, ['diff', '--name-only', tag, 'HEAD', '--', ...dirs]);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function assessRepository(root = REPOSITORY_ROOT) {
  const packages = await readWorkspacePackages(root);
  const pending = await readPendingChangesets(root);
  const results = [];
  for (const pkg of packages) {
    const tag = `${pkg.name}@${pkg.version}`;
    const tagPresent = await tagExists(root, tag);
    const packageDir = join(root, 'packages', pkg.dir);
    const dirs = shippedSourceDirs(pkg.manifest, (dir) =>
      isDirectorySync(join(packageDir, dir)),
    ).map((dir) => `packages/${pkg.dir}/${dir}`);
    const changedFiles = tagPresent
      ? (await changedPaths(root, tag, dirs)).filter(isShippedSourcePath)
      : [];
    results.push({
      name: pkg.name,
      version: pkg.version,
      tag,
      status: classifyPackage({ tagPresent, changedFiles, hasChangeset: pending.has(pkg.name) }),
      changedFiles,
    });
  }
  return results;
}

export function formatReport(results) {
  const lines = ['| package | version | status |', '| --- | --- | --- |'];
  for (const result of results) {
    lines.push(`| ${result.name} | ${result.version} | ${result.status} |`);
  }
  for (const result of results.filter((item) => item.changedFiles.length > 0)) {
    lines.push('', `${result.name}: shipped source differs from ${result.tag}`);
    for (const file of result.changedFiles) lines.push(`  ${file}`);
  }
  return lines.join('\n');
}

async function main() {
  const results = await assessRepository();
  console.log(formatReport(results));
  const drift = results.filter((result) => result.status === 'drift');
  if (drift.length > 0) {
    console.error(
      `\nRelease drift: ${drift.map((result) => result.name).join(', ')} changed since the published version and no changeset names the package. Run 'pnpm changeset' and include it.`,
    );
    process.exit(1);
  }
  if (results.every((result) => result.status === 'unpublished')) {
    console.log('\nNo version tags found; nothing to compare against (fetch the tags to check).');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  });
}
