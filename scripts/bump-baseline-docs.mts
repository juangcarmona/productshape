/**
 * Move the baseline documentation to the version `changeset version` just produced (issue #115).
 *
 * Runs as the last step of the root `version` script, so the docs bump lands in the same commit
 * the changesets action makes and a Version Packages merge can never turn `main` red against the
 * release contract again. The mechanical parts only: `@prodshape/cli@<version>` pins across the
 * README and the baseline docs, and the root changelog's `## [<version>]` heading and compare
 * links. The prose around them — what the next release candidate adds — stays a human judgment,
 * and `release-contract-smoke.mts` remains the verifier of the result.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineDocs } from './baseline-docs.mts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const cliPackage = JSON.parse(
  await readFile(join(repoRoot, 'packages', 'cli', 'package.json'), 'utf8'),
) as { version: string };
const version = cliPackage.version;

const SEMVER = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?`;
const PIN = new RegExp(String.raw`@prodshape/cli@${SEMVER}`, 'g');
const NPM_URL = new RegExp(String.raw`@prodshape/cli/v/${SEMVER}`, 'g');

let pinned = 0;
for (const path of ['README.md', ...baselineDocs]) {
  const absolute = join(repoRoot, path);
  const before = await readFile(absolute, 'utf8');
  const after = before
    .replace(PIN, `@prodshape/cli@${version}`)
    .replace(NPM_URL, `@prodshape/cli/v/${version}`);
  if (after !== before) {
    await writeFile(absolute, after);
    pinned += 1;
  }
}

// The root changelog promotion applies to stable versions only: the smoke gate requires a
// `## [x.y.z]` heading per stable CLI release, and pre-release trains never appear there.
let promoted = false;
if (!version.includes('-')) {
  const changelogPath = join(repoRoot, 'CHANGELOG.md');
  const before = await readFile(changelogPath, 'utf8');
  // Repin prose only. Link-definition lines (`[x.y.z]: ...`) encode the release history -
  // rewriting the versions inside them would corrupt every past compare and tag link.
  let changelog = before
    .split('\n')
    .map((line) => (line.startsWith('[') ? line : line.replace(PIN, `@prodshape/cli@${version}`)))
    .join('\n');

  if (!changelog.includes(`## [${version}]`)) {
    const unreleasedHeading = '## [Unreleased]';
    if (!changelog.includes(unreleasedHeading)) {
      throw new Error('CHANGELOG.md has no ## [Unreleased] heading to promote from');
    }
    // The unreleased section's content becomes this release's content; a fresh empty
    // Unreleased section stays above it for the next cycle.
    changelog = changelog.replace(unreleasedHeading, `${unreleasedHeading}\n\n## [${version}]`);

    const linkPattern = new RegExp(
      String.raw`^\[unreleased\]: (https://github\.com/\S+/compare)/@prodshape/cli@(${SEMVER})\.\.\.HEAD$`,
      'm',
    );
    const link = changelog.match(linkPattern);
    if (!link) throw new Error('CHANGELOG.md has no [unreleased] compare link to advance');
    const [line, compareBase, previous] = link;
    changelog = changelog.replace(
      line,
      `[unreleased]: ${compareBase}/@prodshape/cli@${version}...HEAD\n` +
        `[${version}]: ${compareBase}/@prodshape/cli@${previous}...@prodshape/cli@${version}`,
    );
    promoted = true;
  }

  if (changelog !== before) await writeFile(changelogPath, changelog);
}

console.log(
  `Baseline docs at @prodshape/cli@${version}: ${pinned} file(s) repinned${
    promoted ? `, changelog promoted to [${version}]` : ''
  }.`,
);
