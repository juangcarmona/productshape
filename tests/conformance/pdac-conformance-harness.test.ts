import { describe, expect, it } from 'vitest';
import { sameDiagnosticMultiset } from '../../scripts/pdac-conformance-diagnostics.mjs';

describe('the pinned conformance harness diagnostic matcher', () => {
  it('ignores optional fields omitted by the expected diagnostic', () => {
    const expected = [
      {
        severity: 'error',
        code: 'PRODUCT063',
        file: 'specs/feature-x.md',
        artifact: 'FR-VALIDATE-001',
      },
    ];
    const emitted = [{ ...expected[0], field: 'anchor' }];

    expect(sameDiagnosticMultiset(expected, emitted)).toBe(true);
  });

  it('finds a complete pairing when a greedy match would fail', () => {
    const expected = [
      { file: 'specs/feature-x.md', code: 'PRODUCT063' },
      { file: 'specs/feature-x.md', code: 'PRODUCT063', target: 'FR-A-001' },
    ];
    const emitted = [
      { file: 'specs/feature-x.md', code: 'PRODUCT063', target: 'FR-A-001' },
      { file: 'specs/feature-x.md', code: 'PRODUCT063', target: 'FR-B-001' },
    ];

    expect(sameDiagnosticMultiset(expected, emitted)).toBe(true);
  });
});
