import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runCli } from '@prodshape/cli';
import {
  changeDoc,
  createLifecycleRepo,
  functionalRequirementDoc,
  git,
  journeyDoc,
  read,
  sliceDoc,
  useCaseDoc,
  write,
} from './lifecycle-fixture.js';

let root: string;
let baseRevision: string;

const CHG = 'CHG-ANNOTATE-001';
const changeDir = 'docs/product/changes/active/chg-annotate-001';

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

async function writeAnnotateChange(options?: {
  status?: string;
  add?: string[];
  modify?: string[];
  remove?: string[];
  openQuestions?: string;
}) {
  await write(
    root,
    `${changeDir}/change.md`,
    changeDoc({
      id: CHG,
      status: options?.status ?? 'approved',
      baseRevision: baseRevision,
      add: options?.add ?? ['UC-ANNOTATE-001', 'FR-ANNOTATE-001'],
      modify: options?.modify ?? ['JRN-SHARE-001'],
      remove: options?.remove ?? [],
      openQuestions: options?.openQuestions,
    }),
  );
}

beforeAll(async () => {
  root = await createLifecycleRepo();
  baseRevision = await git(root, 'rev-parse', 'HEAD');

  await writeAnnotateChange();
  await write(
    root,
    `${changeDir}/proposed/use-cases/uc-annotate-001.md`,
    useCaseDoc('UC-ANNOTATE-001'),
  );
  await write(
    root,
    `${changeDir}/proposed/requirements/functional/fr-annotate-001.md`,
    functionalRequirementDoc('FR-ANNOTATE-001', ['UC-ANNOTATE-001']),
  );
  await write(
    root,
    `${changeDir}/proposed/journeys/jrn-share-001.md`,
    journeyDoc('JRN-SHARE-001', ['UC-SHORTEN-001', 'UC-ANNOTATE-001']),
  );
  await write(
    root,
    `${changeDir}/slices/sli-annotate-001.yaml`,
    sliceDoc({
      id: 'SLI-ANNOTATE-001',
      change: CHG,
      status: 'approved',
      requirement: 'FR-ANNOTATE-001',
      affects: ['UC-ANNOTATE-001', 'JRN-SHARE-001'],
    }),
  );
}, 30_000);

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('change overlay validation', () => {
  it('validates the annotate change with zero errors, baseline untouched', async () => {
    const before = await read(root, 'docs/product/model/journeys/jrn-share-001.md');
    const result = await run(['change', 'validate', CHG]);
    expect(result.out).toMatch(/0 error\(s\)/);
    expect(result.code).toBe(0);
    const after = await read(root, 'docs/product/model/journeys/jrn-share-001.md');
    expect(after).toBe(before);
  });

  it('validate --change routes to the overlay', async () => {
    const result = await run(['validate', '--change', CHG]);
    expect(result.code).toBe(0);
    expect(result.out).toContain('overlay has 11 artifact(s)');
  });

  it('detects an addition collision with the baseline (PRODUCT020)', async () => {
    await writeAnnotateChange({ add: ['UC-ANNOTATE-001', 'FR-ANNOTATE-001', 'UC-SHORTEN-001'] });
    const result = await run(['change', 'validate', CHG]);
    expect(result.code).toBe(1);
    // UC-SHORTEN-001 collides and lacks a proposed file: PRODUCT020 + PRODUCT026.
    expect(result.out).toContain('PRODUCT020');
    expect(result.out).toContain('PRODUCT026');
    await writeAnnotateChange();
  });

  it('detects modification and removal of unknown IDs (PRODUCT021/022)', async () => {
    await writeAnnotateChange({
      modify: ['JRN-SHARE-001', 'JRN-GHOST-001'],
      remove: ['BR-GHOST-001'],
    });
    const result = await run(['change', 'validate', CHG]);
    expect(result.code).toBe(1);
    expect(result.out).toContain('PRODUCT021');
    expect(result.out).toContain('PRODUCT022');
    await writeAnnotateChange();
  });

  it('detects a removal leaving dangling references (PRODUCT024)', async () => {
    await writeAnnotateChange({ remove: ['BR-VALID-URL-001'] });
    const result = await run(['change', 'validate', CHG]);
    expect(result.code).toBe(1);
    expect(result.out).toContain('PRODUCT024');
    await writeAnnotateChange();
  });

  it('warns on approved changes with open questions (PRODUCT108)', async () => {
    await writeAnnotateChange({ openQuestions: '- Should notes be public?' });
    const result = await run(['change', 'validate', CHG]);
    expect(result.code).toBe(0);
    expect(result.out).toContain('PRODUCT108');
    await writeAnnotateChange();
  });

  it('detects overlapping concurrent changes (PRODUCT025)', async () => {
    const otherDir = 'docs/product/changes/active/chg-clash-001';
    await write(
      root,
      `${otherDir}/change.md`,
      changeDoc({
        id: 'CHG-CLASH-001',
        status: 'draft',
        baseRevision: baseRevision,
        modify: ['JRN-SHARE-001'],
      }),
    );
    await write(
      root,
      `${otherDir}/proposed/journeys/jrn-share-001.md`,
      journeyDoc('JRN-SHARE-001', ['UC-SHORTEN-001']),
    );
    const result = await run(['change', 'validate', CHG]);
    await rm(join(root, ...otherDir.split('/')), { recursive: true });
    expect(result.code).toBe(1);
    expect(result.out).toContain('PRODUCT025');
    expect(result.out).toContain('CHG-CLASH-001');
  });

  it('detects slice problems: foreign change (PRODUCT030) and cycles (PRODUCT032)', async () => {
    await write(
      root,
      `${changeDir}/slices/sli-broken-001.yaml`,
      sliceDoc({
        id: 'SLI-BROKEN-001',
        change: 'CHG-SOMEWHERE-ELSE-001',
        status: 'draft',
        requirement: 'FR-ANNOTATE-001',
        dependsOn: ['SLI-BROKEN-001'],
      }),
    );
    const result = await run(['change', 'validate', CHG]);
    await rm(join(root, ...`${changeDir}/slices/sli-broken-001.yaml`.split('/')));
    expect(result.code).toBe(1);
    expect(result.out).toContain('PRODUCT030');
    expect(result.out).toContain('PRODUCT032');
  });
});

describe('handoff generation and staleness', () => {
  const outDir = 'work/handoff';

  it('refuses a non-approved slice (PRODUCT040)', async () => {
    await write(
      root,
      `${changeDir}/slices/sli-annotate-001.yaml`,
      sliceDoc({
        id: 'SLI-ANNOTATE-001',
        change: CHG,
        status: 'proposed',
        requirement: 'FR-ANNOTATE-001',
        affects: ['UC-ANNOTATE-001', 'JRN-SHARE-001'],
      }),
    );
    const result = await run([
      'handoff',
      'create',
      '--change',
      CHG,
      '--slice',
      'SLI-ANNOTATE-001',
      '--work-item',
      'github:owner/repo#77',
      '--out',
      outDir,
    ]);
    expect(result.code).toBe(1);
    expect(result.err).toContain('PRODUCT040');
  });

  it('generates handoff and context from an approved slice', async () => {
    await write(
      root,
      `${changeDir}/slices/sli-annotate-001.yaml`,
      sliceDoc({
        id: 'SLI-ANNOTATE-001',
        change: CHG,
        status: 'approved',
        requirement: 'FR-ANNOTATE-001',
        affects: ['UC-ANNOTATE-001', 'JRN-SHARE-001'],
      }),
    );
    const result = await run([
      'handoff',
      'create',
      '--change',
      CHG,
      '--slice',
      'SLI-ANNOTATE-001',
      '--work-item',
      'github:owner/repo#77',
      '--title',
      'Annotate short links',
      '--out',
      outDir,
    ]);
    expect(result.err).toBe('');
    expect(result.code).toBe(0);

    const handoff = await read(root, `${outDir}/product-handoff.yaml`);
    expect(handoff).toContain('id: HOF-GITHUB-77');
    expect(handoff).toContain('product-change: CHG-ANNOTATE-001');
    // Closure: requirement + use case + its context + journey + actor + product-wide constraint.
    for (const id of [
      'FR-ANNOTATE-001',
      'UC-ANNOTATE-001',
      'ACT-VISITOR',
      'BR-VALID-URL-001',
      'TERM-SHORT-LINK',
      'BC-SHORTENING',
      'JRN-SHARE-001',
      'CON-NO-TRACKING',
    ]) {
      expect(handoff).toContain(id);
    }
    // Unrelated regions stay out: QR-RESOLVE-001 is not connected to this slice.
    expect(handoff).not.toContain('QR-RESOLVE-001');

    const context = await read(root, `${outDir}/product-context.md`);
    expect(context).toMatch(/^<!-- GENERATED by prodshape handoff create/);
    expect(context).toContain('The product MUST attach notes to short links.');
  });

  it('reports current immediately after generation', async () => {
    const result = await run(['handoff', 'status', `${outDir}/product-handoff.yaml`]);
    expect(result.code).toBe(0);
    expect(result.out).toContain('current');
  });

  it('a relevant artifact edit makes the handoff stale, naming the artifact', async () => {
    const path = `${changeDir}/proposed/use-cases/uc-annotate-001.md`;
    const original = await read(root, path);
    await write(root, path, original.replace('Annotate a short link', 'Annotate any link'));
    const result = await run(['handoff', 'status', `${outDir}/product-handoff.yaml`]);
    await write(root, path, original);
    expect(result.code).toBe(1);
    expect(result.out).toContain('stale');
    expect(result.out).toContain('UC-ANNOTATE-001');
  });

  it('unrelated modifications never stale the handoff', async () => {
    const path = 'docs/product/model/requirements/quality/qr-resolve-001.md';
    const original = await read(root, path);
    await write(root, path, `${original}\n<!-- unrelated tweak -->\n`);
    await git(root, 'add', '-A');
    await git(root, 'commit', '-m', 'unrelated change and new commit');
    const result = await run(['handoff', 'status', `${outDir}/product-handoff.yaml`]);
    await write(root, path, original);
    expect(result.code).toBe(0);
    expect(result.out).toContain('current');
  });
});

describe('promotion', () => {
  it('refuses promotion before implemented status and resolved slices', async () => {
    const result = await run(['change', 'promote', CHG, '--dry-run']);
    expect(result.code).toBe(1);
    expect(result.out).toContain("requires status 'implemented'");
  });

  it('dry run reports the plan without changing anything', async () => {
    await writeAnnotateChange({ status: 'implemented' });
    await write(
      root,
      `${changeDir}/slices/sli-annotate-001.yaml`,
      sliceDoc({
        id: 'SLI-ANNOTATE-001',
        change: CHG,
        status: 'completed',
        requirement: 'FR-ANNOTATE-001',
        affects: ['UC-ANNOTATE-001', 'JRN-SHARE-001'],
      }),
    );
    const status = await git(root, 'status', '--porcelain');
    const result = await run(['change', 'promote', CHG, '--dry-run']);
    expect(result.code).toBe(0);
    expect(result.out).toContain('Dry run: nothing was changed.');
    expect(result.out).toContain('Add UC-ANNOTATE-001');
    expect(result.out).toContain('Replace JRN-SHARE-001');
    expect(await git(root, 'status', '--porcelain')).toBe(status);
  });

  it('detects baseline drift since base-revision (PRODUCT027)', async () => {
    const path = 'docs/product/model/journeys/jrn-share-001.md';
    const original = await read(root, path);
    await write(root, path, `${original}\n<!-- drifted -->\n`);
    const result = await run(['change', 'promote', CHG, '--dry-run']);
    await write(root, path, original);
    expect(result.code).toBe(1);
    expect(result.out).toContain('PRODUCT027');
    expect(result.out).toContain('JRN-SHARE-001');
  });

  it('promotes: applies operations, moves the change, keeps history, no commits', async () => {
    const headBefore = await git(root, 'rev-parse', 'HEAD');
    const result = await run(['change', 'promote', CHG]);
    expect(result.code).toBe(0);

    // Baseline updated.
    const journey = await read(root, 'docs/product/model/journeys/jrn-share-001.md');
    expect(journey).toContain('UC-ANNOTATE-001');
    const uc = await read(root, 'docs/product/model/use-cases/uc-annotate-001.md');
    expect(uc).toContain('id: UC-ANNOTATE-001');

    // Change archived with history preserved.
    const archived = await read(root, 'docs/product/changes/completed/chg-annotate-001/change.md');
    expect(archived).toContain(CHG);
    await expect(read(root, `${changeDir}/change.md`)).rejects.toThrow();

    // No Git commits were created.
    expect(await git(root, 'rev-parse', 'HEAD')).toBe(headBefore);

    // The promoted baseline validates cleanly.
    const validation = await run(['validate']);
    expect(validation.code).toBe(0);
    expect(validation.out).toMatch(/0 error\(s\), 0 warning\(s\) across 11 artifact\(s\)/);
  });
});
