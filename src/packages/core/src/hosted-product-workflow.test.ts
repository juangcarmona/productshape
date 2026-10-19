import { describe, expect, it } from 'vitest';
import { TERMINAL_CHANGE_STATUSES, isTerminalChange } from './hosted-product-workflow.js';
import type { LoadedChange } from './changes.js';

function changeWithStatus(status: string | undefined): LoadedChange {
  return {
    dir: 'changes/x',
    file: 'changes/x/change.md',
    frontmatter: {},
    body: '',
    digest: 'sha256:0',
    operations: { add: [], modify: [], remove: [] },
    proposed: [],
    diagnostics: [],
    ...(status === undefined ? {} : { status }),
  } as LoadedChange;
}

describe('hosted product change rail', () => {
  it('treats applied, rejected and superseded changes as terminal, everything else as live', () => {
    expect([...TERMINAL_CHANGE_STATUSES].sort()).toEqual(['applied', 'rejected', 'superseded']);
    for (const status of TERMINAL_CHANGE_STATUSES) {
      expect(isTerminalChange(changeWithStatus(status))).toBe(true);
    }
    for (const status of ['draft', 'approved', 'anything', undefined]) {
      expect(isTerminalChange(changeWithStatus(status))).toBe(false);
    }
  });
});
