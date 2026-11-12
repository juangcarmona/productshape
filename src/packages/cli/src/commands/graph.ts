import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  buildGeneratedOutputs,
  buildGraphJson,
  buildMermaid,
  buildExplorerHtml,
  blockingDiagnostics,
  gitHead,
  stableJson,
  validateBaseline,
  writeGeneratedOutputs,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

/** The Product Explorer page, written to the generated-output area by `graph --format html`. */
export const explorerFile = 'explorer.html';
/** The name the same page had before it was called the Product Explorer; removed on generation. */
export const legacyExplorerFile = 'snapshot.html';

export interface GraphOptions {
  format?: 'summary' | 'json' | 'mermaid' | 'html';
  productName?: string;
  productUrl?: string;
  productVersion?: string;
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
      const html = buildExplorerHtml(graph, artifacts, revision, {
        productName: options.productName,
        productUrl: options.productUrl,
        productVersion: options.productVersion,
      });
      await writeFile(join(repo.generatedDir, explorerFile), html, 'utf8');
      // Releases before the Product Explorer name wrote the same page as snapshot.html. The
      // generated-output area is the tool's own, so the stale copy is removed rather than left
      // beside the current one.
      await rm(join(repo.generatedDir, legacyExplorerFile), { force: true });
      io.out(`Product Explorer written to ${repo.config.prodshape.generated.root}/${explorerFile}`);
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
