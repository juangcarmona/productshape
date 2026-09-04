import { describe, expect, it } from 'vitest';
import {
  classifyPackages,
  formatPlan,
  validatePlan,
  validatePrereleaseState,
} from '../../scripts/check-prerelease-publication.mjs';

const packages = [
  { name: '@prodshape/cli', version: '0.19.0-alpha.3' },
  { name: '@prodshape/core', version: '0.6.0-alpha.3' },
];

function published(entries: [string, string[]][]) {
  return new Map(entries);
}

describe('prerelease publication recovery contract', () => {
  it('classifies versioned-in-main but unpublished packages as pending', () => {
    const plan = classifyPackages(packages, published([]));
    expect(plan.every((item) => item.status === 'pending publication')).toBe(true);
    expect(formatPlan(plan)).toContain('@prodshape/cli | 0.19.0-alpha.3 | pending publication');
  });

  it('classifies a partially published package set', () => {
    const plan = classifyPackages(packages, published([['@prodshape/cli', ['0.19.0-alpha.3']]]));
    expect(plan).toEqual([
      { ...packages[0], status: 'already published' },
      { ...packages[1], status: 'pending publication' },
    ]);
    expect(() => validatePlan(plan)).not.toThrow();
  });

  it('rejects no pending packages', () => {
    const plan = classifyPackages(
      packages,
      published([
        ['@prodshape/cli', ['0.19.0-alpha.3']],
        ['@prodshape/core', ['0.6.0-alpha.3']],
      ]),
    );
    expect(() => validatePlan(plan)).toThrow(/No prerelease packages are pending/);
  });

  it('rejects npm ahead of the repository', () => {
    const plan = classifyPackages(packages, published([['@prodshape/cli', ['0.19.0-alpha.4']]]));
    expect(plan[0].status).toBe('invalid');
    expect(() => validatePlan(plan)).toThrow(/inconsistent/);
  });

  it('rejects stable local versions', () => {
    const plan = classifyPackages([{ name: '@prodshape/cli', version: '0.19.0' }], published([]));
    expect(() => validatePlan(plan)).toThrow(/stable/);
  });

  it('accepts stable packages that are already published', () => {
    const plan = classifyPackages(
      [{ name: '@prodshape/core', version: '0.20.0' }],
      published([['@prodshape/core', ['0.20.0']]]),
    );
    expect(plan[0].status).toBe('already published');
    expect(() => validatePlan(plan)).toThrow(/No prerelease packages are pending/);
  });

  it('requires Changesets prerelease mode', () => {
    expect(() => validatePrereleaseState(undefined)).toThrow(/not in Changesets prerelease mode/);
    expect(() => validatePrereleaseState({ mode: 'pre', tag: 'alpha' })).not.toThrow();
    expect(() => validatePrereleaseState({ mode: 'exit', tag: 'alpha' })).toThrow();
  });
});
