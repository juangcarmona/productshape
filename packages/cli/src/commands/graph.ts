import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildGeneratedOutputs,
  buildGraphJson,
  buildMermaid,
  buildSnapshotHtml,
  escalateWarnings,
  gitHead,
  stableJson,
  validateBaseline,
  writeGeneratedOutputs,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface GraphOptions {
  format?: 'summary' | 'json' | 'mermaid' | 'html';
}

export async function runGraph(io: CliIo, options: GraphOptions): Promise<number> {
  const repo = await resolveRepository(io);
  const { artifacts, graph, diagnostics: reported } = await validateBaseline(repo);
  const diagnostics = escalateWarnings(reported, repo.config.validation['warnings-as-errors']);

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
    case 'html': {
      const revision = await gitHead(repo.root);
      const html = buildSnapshotHtml(graph, artifacts, revision);
      await writeFile(join(repo.generatedDir, 'snapshot.html'), html, 'utf8');
      io.out(`Snapshot written to ${repo.config.generated.root}/snapshot.html`);
      break;
    }
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
