import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildGeneratedOutputs,
  buildGraphJson,
  buildMermaid,
  buildSnapshotHtml,
  blockingDiagnostics,
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
  const { artifacts, graph, diagnostics } = await validateBaseline(repo);
  const blocking = blockingDiagnostics(diagnostics, repo.config.validation['warnings-as-errors']);
  if (blocking.length > 0) {
    for (const diagnostic of blocking) io.err(formatDiagnosticLine(diagnostic));
    io.err(`Graph not generated: ${blocking.length} blocking diagnostic(s)`);
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
      io.out(`Snapshot written to ${repo.config.prodshape.generated.root}/snapshot.html`);
      break;
    }
    default: {
      const byType = new Map<string, number>();
      for (const node of graph.nodes) byType.set(node.type, (byType.get(node.type) ?? 0) + 1);
      io.out(`${graph.nodes.length} node(s), ${graph.edges.length} edge(s)`);
      for (const [type, count] of [...byType.entries()].sort()) io.out(`  ${type}: ${count}`);
      io.out(`Generated outputs written to ${repo.config.prodshape.generated.root}`);
    }
  }
  return exitCodes.success;
}
