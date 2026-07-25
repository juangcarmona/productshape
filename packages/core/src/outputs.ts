import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Diagnostic } from './diagnostics.js';
import type { ProductGraph } from './graph.js';
import { ownedTerms } from './graph.js';

export const graphSchemaId = 'product-definition-as-code/graph/v1alpha1';

/** Stable JSON serialization: 2-space indent, trailing newline. */
export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function buildGraphJson(graph: ProductGraph): Record<string, unknown> {
  return {
    schema: graphSchemaId,
    nodes: graph.nodes,
    edges: graph.edges,
    derived: {
      'owns-terms': Object.fromEntries(
        graph.nodes
          .filter((n) => n.type === 'bounded-context')
          .map((n) => [n.id, ownedTerms(graph, n.id)]),
      ),
    },
  };
}

export function buildIndexJson(graph: ProductGraph): Record<string, unknown> {
  const byType: Record<string, { id: string; title: string; status: string; path: string }[]> = {};
  for (const node of graph.nodes) {
    byType[node.type] = [
      ...(byType[node.type] ?? []),
      { id: node.id, title: node.title, status: node.status, path: node.path },
    ];
  }
  return { schema: 'product-definition-as-code/index/v1alpha1', artifacts: byType };
}

/** Requirement-centred traceability: sources and the actors each requirement serves. */
export function buildTraceabilityJson(graph: ProductGraph): Record<string, unknown> {
  const requirements: Record<string, unknown> = {};
  const requirementTypes = new Set(['functional-requirement', 'quality-requirement', 'constraint']);
  for (const node of graph.nodes) {
    if (!requirementTypes.has(node.type)) continue;
    const sources = (graph.outgoing.get(node.id) ?? []).map((e) => e.to);
    const actors = new Set<string>();
    // Walk outward through sources to find the actors behind them (bounded scan).
    const queue = [...sources];
    const seen = new Set(queue);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      const currentNode = graph.nodeById.get(current);
      if (!currentNode) continue;
      if (currentNode.type === 'actor') {
        actors.add(current);
        continue;
      }
      for (const edge of graph.outgoing.get(current) ?? []) {
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    requirements[node.id] = {
      type: node.type,
      sources,
      actors: [...actors].sort(),
    };
  }
  return { schema: 'product-definition-as-code/traceability/v1alpha1', requirements };
}

export function buildMermaid(graph: ProductGraph): string {
  const lines = ['flowchart LR'];
  for (const node of graph.nodes) {
    lines.push(`  ${node.id.replaceAll('-', '_')}["${node.id}"]`);
  }
  for (const edge of graph.edges) {
    lines.push(
      `  ${edge.from.replaceAll('-', '_')} -- ${edge.kind} --> ${edge.to.replaceAll('-', '_')}`,
    );
  }
  return `${lines.join('\n')}\n`;
}

export interface GeneratedOutputs {
  'product-graph.json': string;
  'product-index.json': string;
  'traceability.json': string;
  'product-graph.mmd': string;
  'diagnostics.json': string;
}

export function buildGeneratedOutputs(
  graph: ProductGraph,
  diagnostics: Diagnostic[],
): GeneratedOutputs {
  return {
    'product-graph.json': stableJson(buildGraphJson(graph)),
    'product-index.json': stableJson(buildIndexJson(graph)),
    'traceability.json': stableJson(buildTraceabilityJson(graph)),
    'product-graph.mmd': buildMermaid(graph),
    'diagnostics.json': stableJson({
      schema: 'product-definition-as-code/diagnostics/v1alpha1',
      diagnostics,
    }),
  };
}

export async function writeGeneratedOutputs(
  generatedDir: string,
  outputs: GeneratedOutputs,
): Promise<void> {
  await mkdir(generatedDir, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    await writeFile(join(generatedDir, name), content, 'utf8');
  }
}
