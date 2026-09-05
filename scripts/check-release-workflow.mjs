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
    'manual publish exits cleanly when there is no version diff',
    /name: prepare prerelease version PR[\s\S]*?No changesets were consumed[\s\S]*?exit 0/.test(
      workflow,
    ),
  ],
  [
    'publication recovery is a separate dispatch-only operation',
    /publish-current-prerelease:[\s\S]*?github\.event_name == 'workflow_dispatch'[\s\S]*?task == 'publish-current-prerelease'/.test(
      workflow,
    ) &&
      /publish-current-prerelease:[\s\S]*?pnpm changeset publish/.test(workflow) &&
      !/publish-current-prerelease:[\s\S]*?changeset version/.test(workflow),
  ],
  [
    'publication recovery has prerelease and npm-state gates',
    /publish-current-prerelease:[\s\S]*?check-prerelease-publication\.mjs[\s\S]*?GITHUB_STEP_SUMMARY/.test(
      workflow,
    ),
  ],
  [
    'publication recovery verifies npm versions and remote tags',
    /push and verify prerelease tags and npm versions[\s\S]*?git ls-remote[\s\S]*?npm view/.test(
      workflow,
    ),
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
    'version command formats prerelease state and tolerates its absence',
    /"version": "changeset version && pnpm exec prettier --write --no-error-on-unmatched-pattern \.changeset\/pre\.json/.test(
      packageJson,
    ),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length > 0) {
  throw new Error(`Release workflow check failed: ${failures.join('; ')}`);
}

console.log(`Release workflow check passed (${checks.length} assertions).`);
