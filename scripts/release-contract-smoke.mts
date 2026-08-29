import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baselineDocs } from './baseline-docs.mts';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const cliDir = join(repoRoot, 'packages', 'cli');
const quickstartStart = '<!-- release-contract-quickstart:start -->';
const quickstartEnd = '<!-- release-contract-quickstart:end -->';

interface CommandResult {
  stdout: string;
  stderr: string;
}

async function run(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CommandResult> {
  const result = await execFileAsync(command, args, {
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

function primaryQuickstart(readme: string): string {
  const start = readme.indexOf(quickstartStart);
  const end = readme.indexOf(quickstartEnd);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('README release-contract quickstart markers are missing or out of order');
  }
  const marked = readme.slice(start + quickstartStart.length, end);
  const match = marked.match(/^\s*```bash\r?\n([\s\S]*?)\r?\n```\s*$/);
  if (!match?.[1]) throw new Error('README release-contract markers must contain one bash block');
  return match[1];
}

function requireText(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle))
    throw new Error(`${label} did not contain ${JSON.stringify(needle)}`);
}

const cliPackage = JSON.parse(await readFile(join(cliDir, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
};
const readme = await readFile(join(repoRoot, 'README.md'), 'utf8');
const quickstart = primaryQuickstart(readme);
const documentedSpec = `${cliPackage.name}@${cliPackage.version}`;

requireText(quickstart, documentedSpec, 'primary quickstart');
if (/(@prodshape\/cli@latest|workspace:|pnpm\s+link|npm\s+link)/.test(quickstart)) {
  throw new Error(
    'primary quickstart must use an exact package version and no workspace/link install',
  );
}

for (const path of baselineDocs) {
  requireText(await readFile(join(repoRoot, path), 'utf8'), documentedSpec, path);
}

const rootChangelog = await readFile(join(repoRoot, 'CHANGELOG.md'), 'utf8');
const cliChangelog = await readFile(join(cliDir, 'CHANGELOG.md'), 'utf8');

// Text of one root-changelog `## [x.y.z]` section, up to the next `## ` heading (or end of file).
// `bump-baseline-docs.mts` inserts the heading but leaves its content to a human, which is exactly
// how the `0.12.0` and `0.13.0` sections shipped empty (issue #120): the heading existed, so the
// membership check below passed, and nobody noticed the section under it said nothing.
function changelogSection(changelog: string, heading: string): string {
  const start = changelog.indexOf(heading);
  if (start === -1) return '';
  const rest = changelog.slice(start + heading.length);
  const end = rest.search(/\n## /);
  return (end === -1 ? rest : rest.slice(0, end)).trim();
}

// Version bumps `changeset version` produced that never reached npm (issue #120): the version PR
// merged and packages/cli/CHANGELOG.md keeps the section forever, but the publish step never
// completed for it, so no such package exists. Presenting the bump as a release is exactly the
// defect this gate exists to catch, so membership here is a deliberate, reviewed exception, not a
// default. `0.10.0`: prepared, never published; its changes shipped in `0.11.0` instead.
const neverPublished = new Set(['0.10.0', '0.15.0']);

for (const match of cliChangelog.matchAll(/^## (\d+\.\d+\.\d+)$/gm)) {
  const version = match[1];
  const heading = `## [${version}]`;
  if (neverPublished.has(version)) {
    if (rootChangelog.includes(heading)) {
      throw new Error(`${version} was never published; root changelog must not carry ${heading}`);
    }
    continue;
  }
  requireText(rootChangelog, heading, 'root changelog');
  if (changelogSection(rootChangelog, heading).length === 0) {
    throw new Error(`root changelog section ${heading} is empty; backfill it before release`);
  }
}

const packageSection = readme.slice(readme.indexOf('## Packages'), readme.indexOf('## Quickstart'));
const packageTableStart = packageSection.indexOf('| Package');
const packageTable = packageSection.slice(
  packageTableStart,
  packageSection.indexOf('\n\n', packageTableStart),
);
const releasing = await readFile(join(repoRoot, 'RELEASING.md'), 'utf8');
const packageDirs = await readdir(join(repoRoot, 'packages'), { withFileTypes: true });
for (const dir of packageDirs.filter((entry) => entry.isDirectory())) {
  const manifest = JSON.parse(
    await readFile(join(repoRoot, 'packages', dir.name, 'package.json'), 'utf8'),
  ) as { name?: string; private?: boolean };
  if (!manifest.name?.startsWith('@prodshape/') || manifest.private) continue;
  requireText(packageTable, `\`${manifest.name}\``, 'README current package table');
  requireText(releasing, `\`${manifest.name}\``, 'RELEASING current package table');
}
if (packageTable.includes('@prodshape/adapter-openspec')) {
  throw new Error(
    'legacy @prodshape/adapter-openspec must not appear in the current package table',
  );
}

const publicDocs = [
  readme,
  ...(await Promise.all(baselineDocs.map((path) => readFile(join(repoRoot, path), 'utf8')))),
].join('\n');
for (const block of publicDocs.matchAll(/```bash\r?\n([\s\S]*?)\r?\n```/g)) {
  if (block[1]?.includes('prodshape init --sdd')) {
    throw new Error(
      'an executable public code block claims unreleased prodshape init --sdd behaviour',
    );
  }
}

// Phrasing that describes shipped behaviour as pending. Each of these went stale in place once the
// behaviour it hedged actually published (issue #120): the pin above still named the current
// baseline correctly, but the surrounding sentence kept calling the same behaviour unreleased.
const stalePendingPhrases = [
  'the next release candidate adds',
  'not behaviour of the published',
  'remains explicitly unreleased until the next CLI package is published',
  'is claimed as published until the package version advances',
];
for (const phrase of stalePendingPhrases) {
  if (publicDocs.includes(phrase)) {
    throw new Error(`public docs contain the stale pending-release phrase "${phrase}"`);
  }
}

const countSources = [
  'docs/product/model/requirements/functional/fr-snapshot-004.md',
  'docs/product/model/requirements/quality/qr-scalability-001.md',
  'scripts/screenshot-snapshot.mts',
  'docs/assets/snapshot/manifest.json',
];
for (const path of countSources) {
  const content = await readFile(join(repoRoot, path), 'utf8');
  if (
    /\b\d[\d,]*\s+(?:authored\s+)?artifacts?\b|\b\d[\d,]*\s+matches\b|\b\d[\d,]*\s+relationships?\b/.test(
      content,
    )
  ) {
    throw new Error(`${path} contains a manually maintained model count`);
  }
}

const scratch = await mkdtemp(join(tmpdir(), 'prodshape-release-contract-'));
try {
  process.stdout.write(`Building ${documentedSpec}\n`);
  await run('pnpm', ['--filter', '@prodshape/cli', 'build'], repoRoot);
  await run('npm', ['pack', '--pack-destination', scratch], cliDir);
  const tarballs = (await readdir(scratch)).filter((name) => name.endsWith('.tgz'));
  if (tarballs.length !== 1) {
    throw new Error(`expected one packed CLI tarball, found ${tarballs.length}`);
  }
  const tarball = join(scratch, tarballs[0] as string);

  const workflow = await run('bash', ['-c', quickstart], scratch, {
    ...process.env,
    CI: '1',
    PRODSHAPE_PACKAGE: tarball,
  });
  process.stdout.write(workflow.stdout);
  process.stderr.write(workflow.stderr);

  requireText(workflow.stdout, 'prodshape change validate CHG-INITIAL', 'generated init guidance');
  requireText(
    workflow.stdout,
    'its merge accepts the initial baseline. Apply does not.',
    'generated init guidance',
  );
  requireText(workflow.stdout, 'current', 'current citation verification');
  requireText(workflow.stdout, 'stale', 'stale citation verification');
  requireText(workflow.stdout, 'PRODUCT061', 'stale citation diagnostic');

  const consumer = join(scratch, 'productshape-quickstart');
  const installedManifest = JSON.parse(
    await readFile(join(consumer, 'node_modules', '@prodshape', 'cli', 'package.json'), 'utf8'),
  ) as { version: string };
  if (installedManifest.version !== cliPackage.version) {
    throw new Error(
      `packed install version ${installedManifest.version} did not match ${cliPackage.version}`,
    );
  }
  const executable = join(
    consumer,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'prodshape.cmd' : 'prodshape',
  );
  const version = await run(executable, ['--version'], consumer);
  if (version.stdout.trim() !== cliPackage.version || version.stderr !== '') {
    throw new Error(
      `prodshape --version returned ${JSON.stringify(version.stdout.trim())}; expected ${cliPackage.version}`,
    );
  }

  process.stdout.write(
    `Release contract passed: packed ${documentedSpec}, init/validate, current -> stale PRODUCT061, --version ${cliPackage.version}\n`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
