import { describe, expect, it } from 'vitest';
import { compileGraph } from './graph.js';
import { analyzeImpact } from './impact.js';
import { artifact } from './test-support.js';

// ACT-A <- UC-A (primary-actor); UC-A -> BR-A (governed-by); JRN-A -> UC-A (steps)
const graph = compileGraph([
  artifact('ACT-A', 'actor', { 'actor-kind': 'human' }),
  artifact('BR-A', 'business-rule'),
  artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A', 'governed-by': ['BR-A'] }),
  artifact('JRN-A', 'journey', { 'primary-actor': 'ACT-A', steps: [{ 'use-case': 'UC-A' }] }),
]);

describe('analyzeImpact', () => {
  it('distinguishes direct from transitive incoming impact', () => {
    const report = analyzeImpact(graph, 'BR-A', { direction: 'incoming' });
    expect(report.direct.map((e) => e.id)).toEqual(['UC-A']);
    expect(report.transitive.map((e) => e.id)).toEqual(['JRN-A']);
    expect(report.transitive[0]?.distance).toBe(2);
  });

  it('honours the depth limit', () => {
    const report = analyzeImpact(graph, 'BR-A', { direction: 'incoming', depth: 1 });
    expect(report.direct.map((e) => e.id)).toEqual(['UC-A']);
    expect(report.transitive).toEqual([]);
  });

  it('separates directions in both mode', () => {
    const report = analyzeImpact(graph, 'UC-A', { direction: 'both', depth: 1 });
    const incoming = report.direct.filter((e) => e.direction === 'incoming').map((e) => e.id);
    const outgoing = report.direct.filter((e) => e.direction === 'outgoing').map((e) => e.id);
    expect(incoming).toEqual(['JRN-A']);
    expect(outgoing.sort()).toEqual(['ACT-A', 'BR-A']);
  });

  it('throws on an unknown root', () => {
    expect(() => analyzeImpact(graph, 'UC-GHOST')).toThrow(/Unknown artifact ID/);
  });
});

describe('putInQuestionBy (impact polarity, RFC 0093)', () => {
  // QR-A applies-to UC-A (governance); FR-A derived-from UC-A and scenario-refs SB-A
  // (dependency); SB-A illustrates UC-A and uses TERM-A (dependency).
  const polarityGraph = compileGraph([
    artifact('ACT-A', 'actor', { 'actor-kind': 'human' }),
    artifact('BC-A', 'bounded-context'),
    artifact('TERM-A', 'domain-term', { 'defined-in': 'BC-A' }),
    artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A' }),
    artifact('QR-A-001', 'quality-requirement', {
      'applies-to': ['UC-A'],
      verification: [{ scenario: 'measured' }],
    }),
    artifact('SB-A', 'structured-behaviour', {
      illustrates: ['UC-A'],
      when: 'A stimulus occurs',
      then: ['An outcome follows'],
      'uses-terms': ['TERM-A'],
    }),
    artifact('FR-A-001', 'functional-requirement', {
      'derived-from': ['UC-A'],
      verification: [{ 'scenario-ref': 'SB-A' }],
    }),
  ]);
  const questioned = (id: string) =>
    analyzeImpact(polarityGraph, id).questioned.map((e) => `${e.id}:${e.polarity}`);

  it('a changed governing artifact questions its outbound applies-to targets', () => {
    // The reverse walk alone never reaches UC-A from QR-A-001; polarity does.
    expect(questioned('QR-A-001')).toContain('UC-A:governance');
  });

  it('a changed governed artifact questions the artifact governing it', () => {
    expect(questioned('UC-A')).toContain('QR-A-001:governance');
  });

  it('a changed dependency target questions every source that builds on it', () => {
    expect(questioned('UC-A')).toEqual(
      expect.arrayContaining(['FR-A-001:dependency', 'SB-A:dependency']),
    );
    expect(questioned('SB-A')).toContain('FR-A-001:dependency');
    expect(questioned('TERM-A')).toEqual(['SB-A:dependency']);
  });

  it('a changed dependency source never questions what it cited', () => {
    expect(questioned('FR-A-001')).toEqual([]);
    expect(questioned('SB-A')).not.toContain('UC-A:dependency');
    expect(questioned('SB-A')).not.toContain('TERM-A:dependency');
  });

  it('is deterministic and one authored hop', () => {
    const first = analyzeImpact(polarityGraph, 'UC-A').questioned;
    const second = analyzeImpact(polarityGraph, 'UC-A').questioned;
    expect(second).toEqual(first);
    // ACT-A is two hops from QR-A-001; the questioned set never walks past the coupling edge.
    expect(questioned('QR-A-001')).not.toContain('ACT-A:governance');
  });
});
