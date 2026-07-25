import {
  buildGeneratedOutputs,
  buildGraphJson,
  buildMermaid,
  stableJson,
  validateBaseline,
  writeGeneratedOutputs,
} from '@product-definition-as-code/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface GraphOptions {
  format?: 'summary' | 'json' | 'mermaid';
}

export async function runGraph(io: CliIo, options: GraphOptions): Promise<number> {
  const repo = await resolveRepository(io);
  const { graph, diagnostics } = await validateBaseline(repo);

  const errors = diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    for (const diagnostic of errors) io.err(formatDiagnosticLine(diagnostic));
    io.err(`Graph not generated: ${errors.length} validation error(s)`);
    return exitCodes.validationErrors;
  }

  await writeGeneratedOutputs(repo.generatedDir, buildGeneratedOutputs(graph, diagnostics));

  switch (options.format ?? 'summary') {
    case 'json':
      io.out(stableJson(buildGraphJson(graph)).trimEnd());
      break;
    case 'mermaid':
      io.out(buildMermaid(graph).trimEnd());
      break;
    default: {
      const byType = new Map<string, number>();
      for (const node of graph.nodes) byType.set(node.type, (byType.get(node.type) ?? 0) + 1);
      io.out(`${graph.nodes.length} node(s), ${graph.edges.length} edge(s)`);
      for (const [type, count] of [...byType.entries()].sort()) io.out(`  ${type}: ${count}`);
      io.out(`Generated outputs written to ${repo.config.generated.root}`);
    }
  }
  return exitCodes.success;
}
