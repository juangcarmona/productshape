import type { ProductGraph } from './graph.js';
import type { Edge } from './relationships.js';

export type ImpactDirection = 'incoming' | 'outgoing' | 'both';

export interface ImpactEntry {
  id: string;
  type: string;
  title: string;
  /** 1 = direct neighbour, >1 = transitive. */
  distance: number;
  direction: 'incoming' | 'outgoing';
  /** The edge that first reached this artifact. */
  via: Edge;
}

export interface ImpactReport {
  root: string;
  direction: ImpactDirection;
  depth: number;
  direct: ImpactEntry[];
  transitive: ImpactEntry[];
}

export interface ImpactOptions {
  direction?: ImpactDirection;
  depth?: number;
}

/**
 * Deterministic structural impact: breadth-first traversal from one artifact.
 * Reachability makes no semantic claim (docs/specification/validation.md).
 */
export function analyzeImpact(
  graph: ProductGraph,
  rootId: string,
  options: ImpactOptions = {},
): ImpactReport {
  const direction = options.direction ?? 'both';
  const depth = options.depth ?? Number.POSITIVE_INFINITY;
  if (!graph.nodeById.has(rootId)) {
    throw new Error(`Unknown artifact ID '${rootId}'`);
  }

  const entries: ImpactEntry[] = [];
  const visited = new Set<string>([rootId]);
  let frontier: { id: string; direction: 'incoming' | 'outgoing' }[] =
    direction === 'both'
      ? [
          { id: rootId, direction: 'incoming' },
          { id: rootId, direction: 'outgoing' },
        ]
      : [{ id: rootId, direction }];
  // In 'both' mode the root seeds both directions but each artifact is visited once,
  // with incoming exploration winning ties for determinism (it is listed first).

  let distance = 0;
  while (frontier.length > 0 && distance < depth) {
    distance += 1;
    const next: typeof frontier = [];
    for (const { id, direction: dir } of frontier) {
      const edges =
        dir === 'incoming' ? (graph.incoming.get(id) ?? []) : (graph.outgoing.get(id) ?? []);
      for (const edge of edges) {
        const neighbourId = dir === 'incoming' ? edge.from : edge.to;
        if (visited.has(neighbourId)) continue;
        const node = graph.nodeById.get(neighbourId);
        if (!node) continue;
        visited.add(neighbourId);
        entries.push({
          id: neighbourId,
          type: node.type,
          title: node.title,
          distance,
          direction: dir,
          via: edge,
        });
        next.push({ id: neighbourId, direction: dir });
      }
    }
    frontier = next;
  }

  entries.sort(
    (a, b) =>
      a.distance - b.distance || a.direction.localeCompare(b.direction) || a.id.localeCompare(b.id),
  );

  return {
    root: rootId,
    direction,
    depth: Number.isFinite(depth) ? depth : 0,
    direct: entries.filter((e) => e.distance === 1),
    transitive: entries.filter((e) => e.distance > 1),
  };
}
