import { describe, expect, it } from 'vitest';
import {
  assessRepository,
  classifyPackage,
  formatReport,
  isShippedSourcePath,
  parseChangesetPackages,
  shippedSourceDirs,
} from '../../scripts/check-release-drift.mjs';
import { repoRoot } from '../helpers.js';

describe('release drift check', () => {
  it('ships source and data directories, never dist or files', () => {
    expect(shippedSourceDirs({ files: ['dist', 'src', 'schemas'] })).toEqual(['schemas', 'src']);
    expect(
      shippedSourceDirs({ files: ['dist', 'schemas', 'assets', 'README.md', 'LICENSE'] }),
    ).toEqual(['assets', 'schemas', 'src']);
    expect(shippedSourceDirs({})).toEqual(['src']);
  });

  it('ignores tests and snapshots inside shipped directories', () => {
    expect(isShippedSourcePath('packages/core/src/validate.ts')).toBe(true);
    expect(isShippedSourcePath('packages/core/src/validate.test.ts')).toBe(false);
    expect(isShippedSourcePath('packages/core/src/__snapshots__/graph.test.ts.snap')).toBe(false);
    expect(isShippedSourcePath('packages/distribution/assets/skills/define-product/SKILL.md')).toBe(
      true,
    );
    expect(isShippedSourcePath('packages\\core\\src\\apply.test.ts')).toBe(false);
  });

  it('reads the packages a changeset bumps', () => {
    const changeset = `---\n'@prodshape/core': minor\n"@prodshape/cli": patch\n---\n\nSummary.\n`;
    expect(parseChangesetPackages(changeset)).toEqual(['@prodshape/core', '@prodshape/cli']);
    expect(parseChangesetPackages('# Changesets\n')).toEqual([]);
  });

  it('classifies the four states', () => {
    expect(classifyPackage({ tagPresent: false, changedFiles: [], hasChangeset: false })).toBe(
      'unpublished',
    );
    expect(classifyPackage({ tagPresent: true, changedFiles: [], hasChangeset: false })).toBe(
      'clean',
    );
    expect(
      classifyPackage({ tagPresent: true, changedFiles: ['src/a.ts'], hasChangeset: true }),
    ).toBe('changeset pending');
    expect(
      classifyPackage({ tagPresent: true, changedFiles: ['src/a.ts'], hasChangeset: false }),
    ).toBe('drift');
  });

  it('names the drifted files in the report', () => {
    const report = formatReport([
      {
        name: '@prodshape/core',
        version: '0.20.0',
        tag: '@prodshape/core@0.20.0',
        status: 'drift',
        changedFiles: ['packages/core/src/index.ts'],
      },
    ]);
    expect(report).toContain('| @prodshape/core | 0.20.0 | drift |');
    expect(report).toContain('packages/core/src/index.ts');
  });

  /**
   * The real check over this repository. With the version tags fetched it is the same verdict the
   * release drift CI job gives; in a shallow clone every package reads as unpublished and the CI
   * job, which fetches the full history, is the one that decides.
   */
  it('finds no package whose shipped source drifted from its published version', async () => {
    const results = await assessRepository(repoRoot);
    const drift = results.filter((result) => result.status === 'drift');
    expect(
      drift,
      `add a changeset for: ${drift.map((result) => `${result.name} (${result.changedFiles.join(', ')})`).join('; ')}`,
    ).toEqual([]);
  }, 60_000);
});
