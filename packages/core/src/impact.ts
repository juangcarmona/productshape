import type { ProductGraph } from './graph.js';
import { polarityOf, type Edge, type RelationshipPolarity } from './relationships.js';

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

/** One artifact put in question by a change to the analyzed artifact, with the coupling edge. */
export interface QuestionedEntry {
  id: string;
  type: string;
  title: string;
  via: Edge;
  polarity: RelationshipPolarity;
}

export interface ImpactReport {
  root: string;
  direction: ImpactDirection;
  depth: number;
  direct: ImpactEntry[];
  transitive: ImpactEntry[];
  /**
   * The artifacts a change to `root` puts in question under the vocabulary's impact polarity
   * (spec/relationships.md): the source of every dependency edge targeting `root` (it builds on
   * what changed), and both ends of a governance (`applies-to`) coupling. One authored hop;
   * assistance for review, never authority.
   */
  questioned: QuestionedEntry[];
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
    questioned: putInQuestionBy(graph, rootId),
  };
}

/**
 * The artifacts a change to `changedId` puts in question, one authored hop under the impact
 * polarity: a dependency edge questions its source when its target changes (the source cites
 * what it builds on), and a governance (`applies-to`) edge couples both ends. A reverse walk
 * alone misses the governance targets: `applies-to` is authored on the governing artifact, so a
 * changed Quality Requirement's constrained use cases are its outbound targets (RFC 0093).
 */
export function putInQuestionBy(graph: ProductGraph, changedId: string): QuestionedEntry[] {
  const entries: QuestionedEntry[] = [];
  const seen = new Set<string>();
  const consider = (candidateId: string, via: Edge, polarity: RelationshipPolarity): void => {
    if (candidateId === changedId || seen.has(candidateId)) return;
    const node = graph.nodeById.get(candidateId);
    if (!node) return;
    seen.add(candidateId);
    entries.push({ id: candidateId, type: node.type, title: node.title, via, polarity });
  };

  for (const edge of graph.incoming.get(changedId) ?? []) {
    const source = graph.nodeById.get(edge.from);
    if (!source) continue;
    const polarity = polarityOf(source.type, edge.kind);
    // Both polarities question the author of an edge whose target changed: a dependency source
    // builds on the target, and a governance coupling works in either direction.
    if (polarity !== undefined) consider(edge.from, edge, polarity);
  }
  for (const edge of graph.outgoing.get(changedId) ?? []) {
    const source = graph.nodeById.get(changedId);
    if (!source) continue;
    const polarity = polarityOf(source.type, edge.kind);
    // Outbound, only a governance edge questions its target: a changed dependency source cites
    // differently, it does not change what it cited.
    if (polarity === 'governance') consider(edge.to, edge, polarity);
  }

  entries.sort((a, b) => a.id.localeCompare(b.id) || a.via.kind.localeCompare(b.via.kind));
  return entries;
}
