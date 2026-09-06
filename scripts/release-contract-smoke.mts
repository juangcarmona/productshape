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
    shell: process.platform === 'win32' && /\.(?:cmd|bat)$/iu.test(command),
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

function packageManagerExecutable(): string {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function npmExecutable(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
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

/** The file a README heredoc writes, so the walkthrough runs the documented artifact byte for byte. */
function documentedHeredoc(readme: string, path: string): string {
  const marker = `cat > ${path} <<'EOF'\n`;
  const start = readme.indexOf(marker);
  if (start === -1) throw new Error(`cli README has no heredoc writing ${path}`);
  const rest = readme.slice(start + marker.length);
  const end = rest.indexOf('\nEOF\n');
  if (end === -1) throw new Error(`cli README heredoc for ${path} has no EOF`);
  return rest.slice(0, end);
}

function replaceInFile(path: string, from: string, to: string): string {
  return `node --input-type=module -e "import { readFileSync, writeFileSync } from 'node:fs'; const s = readFileSync('${path}', 'utf8'); if (!s.includes('${from}')) throw new Error('${path} lacks ${from}'); writeFileSync('${path}', s.replace('${from}', '${to}'));"`;
}

const CHANGES = 'docs/product/changes/active';

/**
 * The governed citation-first walkthrough from packages/cli/README.md, as one script: CHG-INITIAL
 * adds ACT-USER, a consumer cites it, CHG-USER-SCOPE modifies it and apply names the citation that
 * goes stale. Every prodshape command line must appear in that README, so the two cannot drift.
 */
function governedWalkthrough(cliReadme: string): string {
  const actor = `${CHANGES}/chg-initial/proposed/act-user.md`;
  const initial = `${CHANGES}/chg-initial/change.md`;
  const scope = `${CHANGES}/chg-user-scope`;
  const commit = 'git -c user.name=smoke -c user.email=smoke@example.invalid commit -q -m';
  const script = [
    'set -eu',
    'mkdir productshape-governed && cd productshape-governed',
    'git init -q && printf "node_modules\\n" > .gitignore',
    'npm init -y >/dev/null',
    'npm install --save-dev --save-exact "$PRODSHAPE_PACKAGE"',
    `git add -A && ${commit} "scaffold"`,
    'npx --no-install prodshape init',
    'npx --no-install prodshape validate',
    'npx --no-install prodshape change create CHG-INITIAL',
    `cat > ${actor} <<'EOF'`,
    documentedHeredoc(cliReadme, actor),
    'EOF',
    replaceInFile(initial, 'add: []', 'add: [ACT-USER]'),
    'npx --no-install prodshape change validate CHG-INITIAL',
    replaceInFile(initial, 'status: draft', 'status: approved'),
    'npx --no-install prodshape change apply CHG-INITIAL --dry-run',
    'npx --no-install prodshape change apply CHG-INITIAL',
    `git add -A && ${commit} "accept CHG-INITIAL"`,
    'DIGEST=$(npx --no-install prodshape inspect ACT-USER --format json | node -p "JSON.parse(require(\'fs\').readFileSync(0)).digest")',
    'mkdir -p docs/decisions',
    `printf '# ADR 001: single-user focus\\n\\n<!-- %s -->\\n' "$(npx --no-install prodshape cite --id ACT-USER --digest "$DIGEST")" > docs/decisions/adr-001.md`,
    'npx --no-install prodshape citations verify docs/decisions',
    'npx --no-install prodshape change create CHG-USER-SCOPE',
    `cp docs/product/model/actors/act-user.md ${scope}/proposed/act-user.md`,
    replaceInFile(
      `${scope}/proposed/act-user.md`,
      'The person this product serves.',
      'The one person this product serves.',
    ),
    replaceInFile(`${scope}/change.md`, 'modify: []', 'modify: [ACT-USER]'),
    replaceInFile(`${scope}/change.md`, 'status: draft', 'status: approved'),
    'npx --no-install prodshape change apply CHG-USER-SCOPE',
    'npx --no-install prodshape citations verify docs/decisions',
  ];
  for (const line of script) {
    if (!line.includes('npx --no-install prodshape ')) continue;
    requireText(cliReadme, line.trim(), 'cli README governed walkthrough');
  }
  return script.join('\n');
}

const cliPackage = JSON.parse(await readFile(join(cliDir, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
};
const readme = await readFile(join(repoRoot, 'README.md'), 'utf8');
const cliReadme = await readFile(join(cliDir, 'README.md'), 'utf8');
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
// A guard against executable code blocks claiming `prodshape init --sdd` lived here while that
// flag was unreleased. It went stale the same way the phrases below did: 0.16.0 published the
// flag and the guard kept calling it unreleased. Guards on specific unreleased behaviour must be
// removed by the release that ships the behaviour, or they become the lie they check for.

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
  await run(packageManagerExecutable(), ['--filter', '@prodshape/cli', 'build'], repoRoot);
  await run(npmExecutable(), ['pack', '--pack-destination', scratch], cliDir);
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

  const governed = await run('bash', ['-c', governedWalkthrough(cliReadme)], scratch, {
    ...process.env,
    CI: '1',
    PRODSHAPE_PACKAGE: tarball,
  });
  process.stdout.write(governed.stdout);
  process.stderr.write(governed.stderr);
  requireText(governed.stdout, 'Affected citations: 0', 'CHG-INITIAL apply');
  requireText(governed.stdout, '1 current', 'ADR citation verification');
  requireText(governed.stdout, 'Affected citations: 1', 'CHG-USER-SCOPE apply');
  requireText(governed.stdout, 'ACT-USER\tstale', 'CHG-USER-SCOPE affected citation');
  requireText(governed.stdout, '1 stale', 'stale ADR citation');
  requireText(governed.stdout, 'PRODUCT061', 'stale ADR citation diagnostic');
  await readFile(
    join(scratch, 'productshape-governed', 'docs', 'product', 'model', 'actors', 'act-user.md'),
    'utf8',
  );

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
    `Release contract passed: packed ${documentedSpec}, sandbox quickstart (current -> stale PRODUCT061), governed walkthrough (CHG-INITIAL applied, CHG-USER-SCOPE named 1 affected citation, 1 stale PRODUCT061), --version ${cliPackage.version}\n`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
