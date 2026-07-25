import type { LoadedArtifact } from './model.js';
import type { Edge } from './relationships.js';
import { extractEdges } from './relationships.js';

export interface GraphNode {
  id: string;
  type: string;
  title: string;
  status: string;
  path: string;
  digest: string;
}

export interface ProductGraph {
  nodes: GraphNode[];
  edges: Edge[];
  nodeById: Map<string, GraphNode>;
  outgoing: Map<string, Edge[]>;
  incoming: Map<string, Edge[]>;
}

function compareEdges(a: Edge, b: Edge): number {
  return a.from.localeCompare(b.from) || a.kind.localeCompare(b.kind) || a.to.localeCompare(b.to);
}

/**
 * Compile the product graph from loaded artifacts. Purely derived, deterministic:
 * nodes sorted by ID, edges by from/kind/to, reverse indexes computed, never authored.
 */
export function compileGraph(artifacts: LoadedArtifact[]): ProductGraph {
  const nodes: GraphNode[] = [];
  const edges: Edge[] = [];

  for (const artifact of artifacts) {
    if (!artifact.id || !artifact.type) continue;
    nodes.push({
      id: artifact.id,
      type: artifact.type,
      title: artifact.title ?? '',
      status: artifact.status ?? '',
      path: artifact.file,
      digest: artifact.digest,
    });
    edges.push(...extractEdges(artifact.id, artifact.type, artifact.frontmatter));
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort(compareEdges);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, Edge[]>();
  const incoming = new Map<string, Edge[]>();
  for (const edge of edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge]);
  }

  return { nodes, edges, nodeById, outgoing, incoming };
}

/** Derived view: the domain terms defined in a bounded context (owns-terms is never authored). */
export function ownedTerms(graph: ProductGraph, boundedContextId: string): string[] {
  return (graph.incoming.get(boundedContextId) ?? [])
    .filter((e) => e.kind === 'defined-in')
    .map((e) => e.from);
}
