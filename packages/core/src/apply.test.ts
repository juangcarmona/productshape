/**
 * preflightApply / executeApply preconditions (issue #61).
 *
 * These construct an ApplyPlan by hand rather than going through planApply, so each precondition
 * failure (unreadable write source, missing delete target, occupied archive destination) can be
 * reproduced deterministically without racing a change-validation pass that would otherwise catch
 * the same defect earlier (e.g. PRODUCT022 for a removal target that never existed).
 */
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appliedArtifacts, executeApply, preflightApply, type ApplyPlan } from './apply.js';
import type { LoadedChange } from './changes.js';
import type { LoadedArtifact } from './model.js';

let repoRoot: string;

function emptyPlan(actions: ApplyPlan['actions']): ApplyPlan {
  return {
    changeId: 'CHG-PROBE-001',
    actions,
    diff: { added: [], modified: [], removed: [] },
    diagnostics: [],
  };
}

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), 'prodshape-apply-preflight-'));
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

describe('preflightApply', () => {
  it('throws on an unreadable write source and touches nothing', async () => {
    const plan = emptyPlan([
      { kind: 'write', description: 'Add', from: 'missing-source.md', to: 'model/target.md' },
    ]);
    await expect(preflightApply(repoRoot, plan)).rejects.toThrow();
    await expect(stat(join(repoRoot, 'model', 'target.md'))).rejects.toThrow();
  });

  it('throws on a missing delete target', async () => {
    const plan = emptyPlan([{ kind: 'delete', description: 'Remove', from: 'model/ghost.md' }]);
    await expect(preflightApply(repoRoot, plan)).rejects.toThrow();
  });

  it('throws when the archive destination already exists', async () => {
    await mkdir(join(repoRoot, 'changes', 'active', 'chg-probe-001'), { recursive: true });
    await writeFile(
      join(repoRoot, 'changes', 'active', 'chg-probe-001', 'change.md'),
      'status: applied\n',
      'utf8',
    );
    await mkdir(join(repoRoot, 'changes', 'completed', 'chg-probe-001'), { recursive: true });
    const plan = emptyPlan([
      {
        kind: 'move-change',
        description: 'Move',
        from: 'changes/active/chg-probe-001',
        to: 'changes/completed/chg-probe-001',
      },
    ]);
    await expect(preflightApply(repoRoot, plan)).rejects.toThrow(/archive destination/);
  });

  it('succeeds and stages content without writing anything when everything is in order', async () => {
    await mkdir(join(repoRoot, 'proposed'), { recursive: true });
    await writeFile(join(repoRoot, 'proposed', 'source.md'), 'proposed content\n', 'utf8');
    await mkdir(join(repoRoot, 'model'), { recursive: true });
    await writeFile(join(repoRoot, 'model', 'to-remove.md'), 'gone soon\n', 'utf8');

    const plan = emptyPlan([
      { kind: 'write', description: 'Add', from: 'proposed/source.md', to: 'model/target.md' },
      { kind: 'delete', description: 'Remove', from: 'model/to-remove.md' },
    ]);
    const staged = await preflightApply(repoRoot, plan);
    expect(staged.get('model/target.md')).toBe('proposed content\n');

    // Nothing was written or removed: preflight only reads and stats.
    await expect(stat(join(repoRoot, 'model', 'target.md'))).rejects.toThrow();
    expect(await readFile(join(repoRoot, 'model', 'to-remove.md'), 'utf8')).toBe('gone soon\n');
  });
});

describe('executeApply', () => {
  it('runs the same preflight before writing anything, and refuses identically', async () => {
    const plan = emptyPlan([
      { kind: 'write', description: 'Add', from: 'missing-source.md', to: 'model/target.md' },
    ]);
    await expect(executeApply(repoRoot, plan)).rejects.toThrow();
    await expect(stat(join(repoRoot, 'model', 'target.md'))).rejects.toThrow();
  });

  it('writes staged content after a clean preflight', async () => {
    await mkdir(join(repoRoot, 'proposed'), { recursive: true });
    await writeFile(join(repoRoot, 'proposed', 'source.md'), 'proposed content\n', 'utf8');

    const plan = emptyPlan([
      { kind: 'write', description: 'Add', from: 'proposed/source.md', to: 'model/target.md' },
    ]);
    await executeApply(repoRoot, plan);
    expect(await readFile(join(repoRoot, 'model', 'target.md'), 'utf8')).toBe('proposed content\n');
  });
});

describe('appliedArtifacts', () => {
  function artifact(id: string, body: string): LoadedArtifact {
    return {
      file: `model/${id.toLowerCase()}.md`,
      absolutePath: `/model/${id.toLowerCase()}.md`,
      frontmatter: {},
      body,
      digest: `sha256:${id.toLowerCase().padEnd(64, '0').slice(0, 64)}`,
      id,
    };
  }

  function change(overrides: Partial<LoadedChange>): LoadedChange {
    return {
      dir: 'changes/active/chg-probe-001',
      file: 'changes/active/chg-probe-001/change.md',
      frontmatter: {},
      body: '',
      digest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      id: 'CHG-PROBE-001',
      operations: { add: [], modify: [], remove: [] },
      proposed: [],
      diagnostics: [],
      ...overrides,
    };
  }

  it('drops removals and puts proposed artifacts in place of their baseline counterparts', () => {
    const baseline = [
      artifact('FR-KEPT', 'kept'),
      artifact('FR-GONE', 'gone'),
      artifact('FR-MOVED', 'old'),
    ];
    const proposed = [artifact('FR-MOVED', 'new'), artifact('FR-NEW', 'added')];
    const result = appliedArtifacts(
      baseline,
      change({
        operations: { add: ['FR-NEW'], modify: ['FR-MOVED'], remove: ['FR-GONE'] },
        proposed,
      }),
    );

    expect(result.map((a) => [a.id, a.body]).sort()).toEqual([
      ['FR-KEPT', 'kept'],
      ['FR-MOVED', 'new'],
      ['FR-NEW', 'added'],
    ]);
  });

  it('keeps baseline artifacts without an ID: they resolve no citation either way', () => {
    const anonymous: LoadedArtifact = {
      file: 'model/broken.md',
      absolutePath: '/model/broken.md',
      frontmatter: {},
      body: '',
      digest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    };
    expect(appliedArtifacts([anonymous], change({}))).toEqual([anonymous]);
  });
});
