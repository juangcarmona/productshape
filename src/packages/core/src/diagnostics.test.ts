import { describe, expect, it, vi } from 'vitest';
import { sortDiagnostics, type Diagnostic } from './diagnostics.js';

function diagnostic(label: string, file: string, code = 'PRODUCT001', target?: string): Diagnostic {
  return {
    severity: 'error',
    code,
    message: label,
    file,
    target,
  };
}

const labels = (diagnostics: Diagnostic[]): string[] => diagnostics.map((entry) => entry.message);

describe('sortDiagnostics', () => {
  it('orders by file before code or target', () => {
    const result = sortDiagnostics([
      diagnostic('later file, earlier code', 'z.md', 'PRODUCT001', 'A'),
      diagnostic('earlier file, later code', 'a.md', 'PRODUCT999', 'Z'),
    ]);

    expect(labels(result)).toEqual(['earlier file, later code', 'later file, earlier code']);
  });

  it('orders by code within the same file before considering target', () => {
    const result = sortDiagnostics([
      diagnostic('later code, earlier target', 'same.md', 'PRODUCT200', 'A'),
      diagnostic('earlier code, later target', 'same.md', 'PRODUCT100', 'Z'),
    ]);

    expect(labels(result)).toEqual(['earlier code, later target', 'later code, earlier target']);
  });

  it('orders by target only when file and code are equal', () => {
    const result = sortDiagnostics([
      diagnostic('target Z', 'same.md', 'PRODUCT100', 'Z'),
      diagnostic('target A', 'same.md', 'PRODUCT100', 'A'),
    ]);

    expect(labels(result)).toEqual(['target A', 'target Z']);
  });

  it('normalizes absent file and target values to empty strings deterministically', () => {
    const absentFile = {
      ...diagnostic('absent file and target', '', 'PRODUCT100'),
      file: undefined,
    } as unknown as Diagnostic;
    const emptyFileAndTarget = diagnostic('empty file and target', '', 'PRODUCT100', '');
    const namedFile = diagnostic('named file', 'a.md', 'PRODUCT100');

    expect(labels(sortDiagnostics([namedFile, absentFile, emptyFileAndTarget]))).toEqual([
      'absent file and target',
      'empty file and target',
      'named file',
    ]);
  });

  it('uses explicit UTF-16 code-unit order for non-ASCII, case, punctuation and numbers', () => {
    const files = ['ä', 'Z', 'a', 'A', '10', '2', '_', '-'];

    expect(sortDiagnostics(files.map((file) => diagnostic(file, file))).map((d) => d.file)).toEqual(
      ['-', '10', '2', 'A', 'Z', '_', 'a', 'ä'],
    );
  });

  it('does not consult localeCompare', () => {
    const localeCompare = vi.spyOn(String.prototype, 'localeCompare').mockImplementation(() => {
      throw new Error('localeCompare must not participate in diagnostic ordering');
    });
    let result: Diagnostic[];
    try {
      result = sortDiagnostics([diagnostic('lowercase', 'a.md'), diagnostic('uppercase', 'Z.md')]);
    } finally {
      localeCompare.mockRestore();
    }

    expect(labels(result)).toEqual(['uppercase', 'lowercase']);
  });

  it('produces exactly the same sequence on repeated runs', () => {
    const input = [
      diagnostic('non-ASCII', 'ä.md', 'PRODUCT010', '10'),
      diagnostic('uppercase', 'Z.md', 'PRODUCT002', 'A'),
      diagnostic('punctuation', '-.md', 'PRODUCT100', '_'),
      diagnostic('lowercase', 'a.md', 'PRODUCT001', '2'),
    ];
    const expected = labels(sortDiagnostics(input));

    for (let run = 0; run < 50; run += 1) {
      expect(labels(sortDiagnostics(input))).toEqual(expected);
    }
  });

  it('orders line before code, numerically, with absent before present', () => {
    const result = sortDiagnostics([
      { ...diagnostic('line 10, earlier code', 'same.md', 'PRODUCT042'), line: 10 },
      { ...diagnostic('line 2, later code', 'same.md', 'PRODUCT063'), line: 2 },
      diagnostic('no line, latest code', 'same.md', 'PRODUCT108'),
    ]);

    expect(labels(result)).toEqual([
      'no line, latest code',
      'line 2, later code',
      'line 10, earlier code',
    ]);
  });

  it('orders entry after line and before code, numerically, absent before present', () => {
    const result = sortDiagnostics([
      { ...diagnostic('entry 10', 'ledger.citations.yml', 'PRODUCT060'), entry: 10 },
      { ...diagnostic('entry 2', 'ledger.citations.yml', 'PRODUCT061'), entry: 2 },
      diagnostic('no entry', 'ledger.citations.yml', 'PRODUCT067'),
    ]);

    expect(labels(result)).toEqual(['no entry', 'entry 2', 'entry 10']);
  });

  it('breaks full ties by field, target, artifact and then change', () => {
    const base = diagnostic('base', 'same.md', 'PRODUCT100');
    const result = sortDiagnostics([
      { ...base, message: 'change B', field: 'f', target: 't', artifact: 'a', change: 'CHG-B' },
      { ...base, message: 'change A', field: 'f', target: 't', artifact: 'a', change: 'CHG-A' },
      { ...base, message: 'artifact earlier', field: 'f', target: 't', artifact: 'A' },
      { ...base, message: 'target earlier', field: 'f', target: 'T' },
      { ...base, message: 'field earlier', field: 'F' },
    ]);

    expect(labels(result)).toEqual([
      'field earlier',
      'target earlier',
      'artifact earlier',
      'change A',
      'change B',
    ]);
  });

  it('preserves relative order for equal normative keys and does not mutate its input', () => {
    const input = [
      diagnostic('first', 'same.md', 'PRODUCT100', 'TARGET'),
      { ...diagnostic('second', 'same.md', 'PRODUCT100', 'TARGET'), severity: 'warning' as const },
      diagnostic('third', 'same.md', 'PRODUCT100', 'TARGET'),
    ];
    const original = [...input];
    const result = sortDiagnostics(input);

    expect(labels(result)).toEqual(['first', 'second', 'third']);
    expect(input).toEqual(original);
    expect(result).not.toBe(input);
  });
});
