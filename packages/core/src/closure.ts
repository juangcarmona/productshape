import type { ProductGraph } from './graph.js';

/**
 * The deterministic closure rule (docs/specification/handoff-contract.md):
 * from a set of seed artifacts, expand requirements via their outgoing edges,
 * use cases via their canonical relationships, terms via defined-in, add
 * containing journeys (one incoming hop) with their primary actors, and add
 * constraints applying to included artifacts plus product-wide constraints.
 */
export function computeClosureFromSeeds(graph: ProductGraph, seeds: string[]): string[] {
  const included = new Set<string>();
  const add = (id: string) => {
    if (graph.nodeById.has(id)) included.add(id);
  };
  for (const seed of seeds) add(seed);

  // Expand requirements via derived-from / applies-to.
  for (const id of [...included]) {
    const node = graph.nodeById.get(id);
    if (!node) continue;
    if (
      node.type === 'functional-requirement' ||
      node.type === 'quality-requirement' ||
      node.type === 'constraint'
    ) {
      for (const edge of graph.outgoing.get(id) ?? []) add(edge.to);
    }
  }

  // Expand use cases via their canonical outgoing relationships.
  for (const id of [...included]) {
    if (graph.nodeById.get(id)?.type !== 'use-case') continue;
    for (const edge of graph.outgoing.get(id) ?? []) add(edge.to);
  }

  // Expand domain terms via defined-in.
  for (const id of [...included]) {
    if (graph.nodeById.get(id)?.type !== 'domain-term') continue;
    for (const edge of graph.outgoing.get(id) ?? []) add(edge.to);
  }

  // One incoming hop: journeys containing an included use case, plus their actors.
  for (const id of [...included]) {
    if (graph.nodeById.get(id)?.type !== 'use-case') continue;
    for (const edge of graph.incoming.get(id) ?? []) {
      if (edge.kind !== 'steps') continue;
      add(edge.from);
      for (const journeyEdge of graph.outgoing.get(edge.from) ?? []) {
        if (journeyEdge.kind === 'primary-actor') add(journeyEdge.to);
      }
    }
  }

  // Constraints applying to included artifacts, and product-wide constraints.
  for (const node of graph.nodes) {
    if (node.type !== 'constraint') continue;
    const targets = graph.outgoing.get(node.id) ?? [];
    if (targets.length === 0 || targets.some((edge) => included.has(edge.to))) add(node.id);
  }

  return [...included].sort();
}
