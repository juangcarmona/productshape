import {
  changesAffecting,
  handoffsReferencing,
  inspectArtifact,
  ownedTerms,
  slicesReferencing,
  stableJson,
  validateBaseline,
} from '@prodshape/core';
import { CliError, exitCodes, resolveRepository, type CliIo } from '../context.js';
import { loadActiveChanges } from './change.js';

export interface InspectOptions {
  format?: 'text' | 'json';
}

export async function runInspect(io: CliIo, id: string, options: InspectOptions): Promise<number> {
  const repo = await resolveRepository(io);
  const { graph } = await validateBaseline(repo);

  if (!graph.nodeById.has(id)) {
    throw new CliError(`Unknown artifact ID '${id}'`, exitCodes.validationErrors);
  }
  const report = inspectArtifact(graph, id);
  const activeChanges = await loadActiveChanges(repo);
  report.changes = changesAffecting(activeChanges, id);
  report.slices = slicesReferencing(activeChanges, id);
  report.handoffs = (await handoffsReferencing(repo.root, id)).map((h) => h.handoffId);

  if (options.format === 'json') {
    io.out(stableJson(report).trimEnd());
    return exitCodes.success;
  }

  io.out(`${report.id} (${report.type}, ${report.status})`);
  io.out(`  title:  ${report.title}`);
  io.out(`  path:   ${report.path}`);
  io.out(`  digest: ${report.digest}`);
  io.out('  outgoing:');
  if (report.outgoing.length === 0) io.out('    (none)');
  for (const edge of report.outgoing) io.out(`    ${edge.kind} -> ${edge.to}`);
  io.out('  incoming (derived):');
  if (report.incoming.length === 0) io.out('    (none)');
  for (const edge of report.incoming) io.out(`    ${edge.from} ${edge.kind} -> this`);
  if (report.type === 'bounded-context') {
    io.out(`  owns-terms (derived): ${ownedTerms(graph, id).join(', ') || '(none)'}`);
  }
  io.out(`  affecting changes: ${report.changes.join(', ') || '(none)'}`);
  io.out(`  slices: ${report.slices.join(', ') || '(none)'}`);
  io.out(`  handoffs: ${report.handoffs.join(', ') || '(none)'}`);
  return exitCodes.success;
}
