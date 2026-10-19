import { describe, expect, it } from 'vitest';
import { parseDriftMarkers } from './drift.js';

describe('parseDriftMarkers', () => {
  it('parses a well-formed marker with ids and summary', () => {
    const content = [
      '## Product definition drift',
      '',
      'The PBI wants a 14-day window; the accepted rule says 30.',
      '',
      '<!-- pdac-drift ids="BR-REFUND-001, FR-REFUND-002" summary="PBI wants 14 days; the rule says 30" -->',
      '',
    ].join('\n');

    expect(parseDriftMarkers(content, 'openspec/changes/x/proposal.md')).toEqual([
      {
        ids: ['BR-REFUND-001', 'FR-REFUND-002'],
        summary: 'PBI wants 14 days; the rule says 30',
        source: 'openspec/changes/x/proposal.md',
        line: 5,
        malformed: false,
      },
    ]);
  });

  it('accepts whitespace-separated ids and tolerates a missing summary', () => {
    const [record] = parseDriftMarkers('<!-- pdac-drift ids="BR-A-001 BR-B-001" -->\n', 'p.md');
    expect(record).toMatchObject({ ids: ['BR-A-001', 'BR-B-001'], malformed: false });
    expect(record?.summary).toBeUndefined();
  });

  it('flags a marker with no ids as malformed instead of dropping it', () => {
    const records = parseDriftMarkers(
      ['<!-- pdac-drift summary="lost the ids" -->', '<!-- pdac-drift ids="" -->'].join('\n'),
      'p.md',
    );
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.malformed)).toBe(true);
  });

  it('ignores a marker mentioned inside prose rather than on a line of its own', () => {
    const content = [
      'Record drift with `<!-- pdac-drift ids="<ID>" summary="<one line>" -->` on its own line.',
      '- rule text quoting <!-- pdac-drift ids="..." summary="..." --> inline',
    ].join('\n');
    expect(parseDriftMarkers(content, 'openspec/config.yaml')).toEqual([]);
  });

  it('parses multiple markers with correct line numbers', () => {
    const content = [
      '<!-- pdac-drift ids="BR-A-001" summary="first" -->',
      'text',
      '  <!-- pdac-drift ids="BR-B-001" summary="second" -->',
    ].join('\n');
    const records = parseDriftMarkers(content, 'p.md');
    expect(records.map((r) => [r.line, r.ids[0]])).toEqual([
      [1, 'BR-A-001'],
      [3, 'BR-B-001'],
    ]);
  });
});
