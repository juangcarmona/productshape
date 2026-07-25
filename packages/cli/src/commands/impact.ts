import {
  analyzeImpact,
  stableJson,
  validateBaseline,
  type ImpactDirection,
} from '@product-definition-as-code/core';
import { CliError, exitCodes, resolveRepository, type CliIo } from '../context.js';

export interface ImpactCliOptions {
  depth?: string;
  direction?: string;
  format?: 'text' | 'json';
}

export async function runImpact(io: CliIo, id: string, options: ImpactCliOptions): Promise<number> {
  const direction = (options.direction ?? 'both') as ImpactDirection;
  if (!['incoming', 'outgoing', 'both'].includes(direction)) {
    throw new CliError(
      `Invalid --direction '${options.direction}': expected incoming, outgoing or both`,
      exitCodes.invalidInvocation,
    );
  }
  let depth: number | undefined;
  if (options.depth !== undefined) {
    depth = Number(options.depth);
    if (!Number.isInteger(depth) || depth < 1) {
      throw new CliError(
        `Invalid --depth '${options.depth}': expected a positive integer`,
        exitCodes.invalidInvocation,
      );
    }
  }

  const repo = await resolveRepository(io);
  const { graph } = await validateBaseline(repo);
  if (!graph.nodeById.has(id)) {
    throw new CliError(`Unknown artifact ID '${id}'`, exitCodes.validationErrors);
  }

  const report = analyzeImpact(graph, id, { direction, ...(depth !== undefined ? { depth } : {}) });

  if (options.format === 'json') {
    io.out(stableJson(report).trimEnd());
    return exitCodes.success;
  }

  io.out(`Structural impact of ${id} (direction: ${direction}${depth ? `, depth: ${depth}` : ''})`);
  io.out('Structural reachability only - no semantic claim.');
  io.out(`  direct (${report.direct.length}):`);
  for (const entry of report.direct) {
    io.out(`    [${entry.direction}] ${entry.id} (${entry.type}) via ${entry.via.kind}`);
  }
  io.out(`  transitive (${report.transitive.length}):`);
  for (const entry of report.transitive) {
    io.out(`    [${entry.direction}] ${entry.id} (${entry.type}) at distance ${entry.distance}`);
  }
  return exitCodes.success;
}
