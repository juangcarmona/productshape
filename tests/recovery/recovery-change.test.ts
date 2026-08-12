/**
 * The Product Change proposing the recovery capability must itself be a valid overlay on the
 * current baseline: the change document parses and satisfies its schema, every proposed artifact
 * validates, operations and proposed/ agree, and the overlaid model revalidates end to end.
 * Concurrency with other live changes is not asserted here; additions cannot collide and each
 * change validates its own overlap when it runs.
 */
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadChange, openRepository, validateBaseline, validateChange } from '@prodshape/core';
import { repoRoot } from '../helpers.js';

describe('CHG-RECOVERY-SESSIONS', () => {
  it('is a valid overlay on the current baseline', async () => {
    const repo = await openRepository(repoRoot);
    const change = await loadChange(
      join(repoRoot, 'docs', 'product', 'changes', 'active', 'chg-recovery-sessions'),
      repo.root,
      repo.registry,
    );
    expect(change.id).toBe('CHG-RECOVERY-SESSIONS');
    expect(change.status).toBe('draft');
    expect(change.operations.add.sort()).toEqual(['FR-RECOVER-001', 'UC-RECOVER-001']);
    expect(change.proposed.map((a) => a.id).sort()).toEqual(['FR-RECOVER-001', 'UC-RECOVER-001']);

    const { artifacts: baseline } = await validateBaseline(repo);
    const validation = validateChange(change, baseline, [], repo.config);
    const errors = validation.diagnostics.filter((d) => d.severity === 'error');
    expect(errors, errors.map((e) => `${e.code} ${e.file}: ${e.message}`).join('\n')).toEqual([]);
  });
});
