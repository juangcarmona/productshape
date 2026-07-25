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
