import { rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '@prodshape/cli';
import {
  changeDoc,
  createLifecycleRepo,
  functionalRequirementDoc,
  git,
  sliceDoc,
  useCaseDoc,
  write,
} from './lifecycle-fixture.js';

/**
 * validation.warnings-as-errors must apply uniformly: a repository that opts in
 * cannot validate strictly at the baseline while a warning-carrying change
 * still validates, hands off or promotes (structural-validation spec).
 */

let root: string;

const CHG = 'CHG-STRICT-001';
const changeDir = 'docs/product/changes/active/chg-strict-001';

async function run(argv: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, {
    cwd: root,
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

beforeAll(async () => {
  root = await createLifecycleRepo();
  const baseRevision = await git(root, 'rev-parse', 'HEAD');
  await write(
    root,
    '.product/config.yaml',
    ['validation:', '  warnings-as-errors: true', ''].join('\n'),
  );
  // An implemented change still carrying an open question: PRODUCT108 warning.
  await write(
    root,
    `${changeDir}/change.md`,
    changeDoc({
      id: CHG,
      status: 'implemented',
      baseRevision,
      add: ['UC-STRICT-001', 'FR-STRICT-001'],
      openQuestions: '- Is strictness enough?',
    }),
  );
  await write(
    root,
    `${changeDir}/proposed/use-cases/uc-strict-001.md`,
    useCaseDoc('UC-STRICT-001'),
  );
  await write(
    root,
    `${changeDir}/proposed/requirements/functional/fr-strict-001.md`,
    functionalRequirementDoc('FR-STRICT-001', ['UC-STRICT-001']),
  );
  await write(
    root,
    `${changeDir}/slices/sli-strict-001.yaml`,
    sliceDoc({
      id: 'SLI-STRICT-001',
      change: CHG,
      status: 'completed',
      requirement: 'FR-STRICT-001',
      affects: ['UC-STRICT-001'],
    }),
  );
}, 30_000);

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('warnings-as-errors is enforced uniformly', () => {
  it('change validate fails on a warning-carrying overlay', async () => {
    const result = await run(['change', 'validate', CHG]);
    expect(result.code).toBe(1);
    expect(result.out).toContain('PRODUCT108');
  });

  it('promotion refuses the warning-carrying change', async () => {
    const result = await run(['change', 'promote', CHG, '--dry-run']);
    expect(result.code).toBe(1);
    expect(result.out).toContain('PRODUCT108');
  });

  it('handoff generation refuses the warning-carrying overlay', async () => {
    await write(
      root,
      `${changeDir}/slices/sli-strict-001.yaml`,
      sliceDoc({
        id: 'SLI-STRICT-001',
        change: CHG,
        status: 'approved',
        requirement: 'FR-STRICT-001',
        affects: ['UC-STRICT-001'],
      }),
    );
    const result = await run([
      'handoff',
      'create',
      '--change',
      CHG,
      '--slice',
      'SLI-STRICT-001',
      '--work-item',
      'github:owner/repo#99',
      '--out',
      'work/handoff-strict',
    ]);
    expect(result.code).toBe(1);
    expect(result.err).toContain('PRODUCT108');
  });
});
