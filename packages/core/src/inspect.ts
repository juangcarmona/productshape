import type { ProductGraph } from './graph.js';
import type { Edge } from './relationships.js';

export interface InspectReport {
  id: string;
  type: string;
  title: string;
  status: string;
  path: string;
  digest: string;
  outgoing: Edge[];
  incoming: Edge[];
}

export function inspectArtifact(graph: ProductGraph, id: string): InspectReport {
  const node = graph.nodeById.get(id);
  if (!node) throw new Error(`Unknown artifact ID '${id}'`);
  return {
    id: node.id,
    type: node.type,
    title: node.title,
    status: node.status,
    path: node.path,
    digest: node.digest,
    outgoing: graph.outgoing.get(id) ?? [],
    incoming: graph.incoming.get(id) ?? [],
  };
}
