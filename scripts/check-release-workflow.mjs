import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
const packageJson = readFileSync(new URL('../package.json', import.meta.url), 'utf8');

const checks = [
  ['never pushes directly to protected main', !/git push[^\n]*HEAD:main/.test(workflow)],
  [
    'version PR uses Changesets Action v1 for Changesets CLI v2',
    /changesets\/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d\s+# v1/.test(workflow) &&
      !/changesets\/action@8488615a623b1b9c987934bb89eae8af6a946ac1/.test(workflow),
  ],
  [
    'version PR uses the v1 input names',
    /changesets\/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d[\s\S]*?\n\s+with:\n\s+version:\s+pnpm run version\n\s+commit:\s+'chore: Version Packages'\n\s+title:\s+'Version Packages'/.test(
      workflow,
    ) &&
      !/changesets\/action@a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d[\s\S]*?commit-message:/.test(
        workflow,
      ),
  ],
  ['dispatch can open release PRs', /pull-requests: write/.test(workflow)],
  ['pre-enter creates a PR', /name: enter alpha[\s\S]*?gh pr create/.test(workflow)],
  [
    'alpha entry formats prerelease state',
    /name: enter alpha[\s\S]*?prettier --write \.changeset\/pre\.json/.test(workflow),
  ],
  [
    'beta entry formats prerelease state',
    /name: enter beta[\s\S]*?prettier --write \.changeset\/pre\.json/.test(workflow),
  ],
  ['pre-exit creates a PR', /name: exit pre mode[\s\S]*?gh pr create/.test(workflow)],
  [
    'pre-exit formats prerelease state',
    /name: exit pre mode[\s\S]*?prettier --write \.changeset\/pre\.json/.test(workflow),
  ],
  [
    'manual publish prepares a version PR',
    /name: prepare prerelease version PR[\s\S]*?gh pr create/.test(workflow),
  ],
  [
    'release mode is resolved before publish jobs',
    /release-mode:[\s\S]*?outputs:\s*\n\s*mode:/.test(workflow),
  ],
  [
    'stable publishing excludes pre mode',
    /publish-stable:[\s\S]*?needs\.release-mode\.outputs\.mode == 'stable'/.test(workflow),
  ],
  [
    'prerelease publishing requires a merged version commit',
    /publish-prerelease:[\s\S]*?needs\.release-mode\.outputs\.mode == 'prerelease'/.test(workflow),
  ],
  [
    'prerelease publishing has a separate tag synchronization step',
    /name: synchronize and verify prerelease tags/.test(workflow),
  ],
  [
    'version command formats prerelease state',
    /"version": "changeset version && pnpm exec prettier --write \.changeset\/pre\.json/.test(
      packageJson,
    ),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length > 0) {
  throw new Error(`Release workflow check failed: ${failures.join('; ')}`);
}

console.log(`Release workflow check passed (${checks.length} assertions).`);
