import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const REPOSITORY_ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(\w):/, '$1:');
const PACKAGE_ROOT = join(REPOSITORY_ROOT, 'packages');
const PRERELEASE = /-(alpha|beta)\.\d+$/;

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.(\d+))?$/.exec(version);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    tag: match[4] ?? '',
    sequence: Number(match[5] ?? 0),
  };
}

export function compareVersions(left, right) {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  if (!leftVersion || !rightVersion)
    throw new Error(`Invalid semver: ${leftVersion ? right : left}`);
  for (const key of ['major', 'minor', 'patch']) {
    if (leftVersion[key] !== rightVersion[key]) return leftVersion[key] - rightVersion[key];
  }
  if (!leftVersion.tag && rightVersion.tag) return 1;
  if (leftVersion.tag && !rightVersion.tag) return -1;
  if (leftVersion.tag !== rightVersion.tag) return leftVersion.tag.localeCompare(rightVersion.tag);
  return leftVersion.sequence - rightVersion.sequence;
}

export async function readWorkspacePackages(packageRoot = PACKAGE_ROOT) {
  const entries = await readdir(packageRoot, { withFileTypes: true });
  const packages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifest = JSON.parse(
      await readFile(join(packageRoot, entry.name, 'package.json'), 'utf8'),
    );
    if (manifest.name?.startsWith('@prodshape/') && !manifest.private) {
      packages.push({ name: manifest.name, version: manifest.version });
    }
  }
  return packages.sort((left, right) => left.name.localeCompare(right.name));
}

export function validatePrereleaseState(state) {
  if (!state || state.mode !== 'pre' || !['alpha', 'beta'].includes(state.tag)) {
    throw new Error(
      'Repository is not in Changesets prerelease mode (expected mode "pre" with alpha or beta tag).',
    );
  }
}

export function classifyPackages(packages, publishedVersionsByName) {
  const plan = [];
  for (const packageInfo of packages) {
    const publishedVersions = publishedVersionsByName.get(packageInfo.name) ?? [];
    const higherVersion = publishedVersions
      .filter(
        (version) => parseVersion(version) && compareVersions(version, packageInfo.version) > 0,
      )
      .sort(compareVersions)
      .at(-1);
    if (higherVersion) {
      plan.push({
        ...packageInfo,
        status: 'invalid',
        reason: `npm contains newer version ${higherVersion}`,
      });
    } else if (publishedVersions.includes(packageInfo.version)) {
      plan.push({ ...packageInfo, status: 'already published' });
    } else if (!PRERELEASE.test(packageInfo.version)) {
      plan.push({ ...packageInfo, status: 'invalid', reason: 'stable version is absent from npm' });
    } else {
      plan.push({ ...packageInfo, status: 'pending publication' });
    }
  }
  return plan;
}

export function validatePlan(plan) {
  const invalid = plan.filter((item) => item.status === 'invalid');
  const pending = plan.filter((item) => item.status === 'pending publication');
  if (invalid.length) {
    throw new Error(
      `Repository/npm state is inconsistent:\n${invalid.map((item) => `${item.name}@${item.version}: ${item.reason}`).join('\n')}`,
    );
  }
  if (!pending.length)
    throw new Error('No prerelease packages are pending publication. Nothing to publish.');
}

export function formatPlan(plan) {
  return [
    '## Prerelease publication recovery plan',
    '',
    '| Package | Repository version | Classification |',
    '| --- | --- | --- |',
    ...plan.map(
      (item) =>
        `| ${item.name} | ${item.version} | ${item.status}${item.reason ? ` (${item.reason})` : ''} |`,
    ),
  ].join('\n');
}

async function npmPublishedVersions(name) {
  try {
    const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const { stdout } = await execFileAsync(npmExecutable, ['view', name, 'versions', '--json'], {
      cwd: REPOSITORY_ROOT,
      shell: process.platform === 'win32',
    });
    const value = JSON.parse(stdout);
    return Array.isArray(value) ? value : value ? [value] : [];
  } catch (error) {
    const stderr = error.stderr ?? '';
    if (stderr.includes('E404') || stderr.includes('404 Not Found')) return [];
    throw new Error(`Could not read npm versions for ${name}: ${stderr.trim() || error.message}`);
  }
}

async function main() {
  const state = JSON.parse(await readFile(join(REPOSITORY_ROOT, '.changeset', 'pre.json'), 'utf8'));
  validatePrereleaseState(state);
  const packages = await readWorkspacePackages();
  const publishedVersionsByName = new Map();
  for (const packageInfo of packages) {
    publishedVersionsByName.set(packageInfo.name, await npmPublishedVersions(packageInfo.name));
  }
  const plan = classifyPackages(packages, publishedVersionsByName);
  console.log(formatPlan(plan));
  validatePlan(plan);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
