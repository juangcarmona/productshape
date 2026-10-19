import { describe, expect, it } from 'vitest';
import { compileGraph, ownedTerms } from './graph.js';
import { artifact } from './test-support.js';

const model = [
  artifact('BC-X', 'bounded-context'),
  artifact('TERM-A', 'domain-term', { 'defined-in': 'BC-X' }),
  artifact('TERM-B', 'domain-term', { 'defined-in': 'BC-X' }),
  artifact('ACT-A', 'actor', { 'actor-kind': 'human' }),
  artifact('UC-A', 'use-case', { 'primary-actor': 'ACT-A', 'uses-terms': ['TERM-A'] }),
  artifact('JRN-A', 'journey', {
    'primary-actor': 'ACT-A',
    steps: [{ 'use-case': 'UC-A' }],
  }),
];

describe('compileGraph', () => {
  it('compiles typed edges in canonical direction with reverse indexes', () => {
    const graph = compileGraph(model);
    expect(graph.edges).toContainEqual({ from: 'JRN-A', kind: 'steps[].use-case', to: 'UC-A' });
    expect(
      graph.incoming
        .get('ACT-A')
        ?.map((e) => e.from)
        .sort(),
    ).toEqual(['JRN-A', 'UC-A']);
  });

  it('sorts nodes and edges deterministically', () => {
    const graph = compileGraph(model);
    const reversedInput = compileGraph([...model].reverse());
    expect(reversedInput.nodes).toEqual(graph.nodes);
    expect(reversedInput.edges).toEqual(graph.edges);
  });

  it('derives owns-terms from defined-in', () => {
    const graph = compileGraph(model);
    expect(ownedTerms(graph, 'BC-X')).toEqual(['TERM-A', 'TERM-B']);
  });
});
