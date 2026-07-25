import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { parse } from 'yaml';
import {
  checkHandoffClosure,
  generateHandoff,
  handoffStatus,
  loadModel,
  parseWorkItemRef,
  stableJson,
  validateChange,
  type Diagnostic,
  type HandoffDocument,
} from '@prodshape/core';
import {
  CliError,
  exitCodes,
  formatDiagnosticLine,
  resolveRepository,
  type CliIo,
} from '../context.js';
import { findChange, loadActiveChanges } from './change.js';

export interface HandoffCreateOptions {
  change: string;
  slice: string;
  workItem: string;
  title?: string;
  out?: string;
  adapter?: string;
  sddChange?: string;
}

export async function runHandoffCreate(io: CliIo, options: HandoffCreateOptions): Promise<number> {
  const repo = await resolveRepository(io);

  let workItem;
  try {
    workItem = parseWorkItemRef(options.workItem, options.title ?? options.workItem);
  } catch (error) {
    throw new CliError(
      error instanceof Error ? error.message : String(error),
      exitCodes.invalidInvocation,
    );
  }

  let outDir: string;
  if (options.adapter === 'openspec') {
    if (!options.sddChange) {
      throw new CliError(
        '--adapter openspec requires --sdd-change <openspec-change-name>',
        exitCodes.invalidInvocation,
      );
    }
    outDir = join(repo.root, 'openspec', 'changes', options.sddChange);
  } else if (options.adapter) {
    throw new CliError(
      `Unknown adapter '${options.adapter}' (v0.1 supports: openspec)`,
      exitCodes.invalidInvocation,
    );
  } else if (options.out) {
    outDir = isAbsolute(options.out) ? options.out : join(io.cwd, options.out);
  } else {
    throw new CliError('Provide --out <dir> or --adapter openspec', exitCodes.invalidInvocation);
  }

  const changes = await loadActiveChanges(repo);
  const change = findChange(changes, options.change);
  const model = await loadModel(repo.modelDir, repo.root, repo.registry);

  const validation = validateChange(change, model.artifacts, changes, repo.config);
  const errors = [...model.diagnostics, ...validation.diagnostics].filter(
    (d) => d.severity === 'error',
  );
  if (errors.length > 0) {
    for (const diagnostic of errors) io.err(formatDiagnosticLine(diagnostic));
    io.err('Handoff not generated: the change overlay has validation errors.');
    return exitCodes.validationErrors;
  }

  const slice = change.slices.find((s) => s.id === options.slice);
  if (!slice) {
    throw new CliError(
      `Unknown slice '${options.slice}' in change '${options.change}'`,
      exitCodes.validationErrors,
    );
  }

  const result = await generateHandoff({
    repoRoot: repo.root,
    graph: validation.overlayGraph,
    overlayArtifacts: validation.overlayArtifacts,
    change,
    slice,
    workItem,
    outDir,
  });

  if (!('handoff' in result)) {
    for (const diagnostic of result.diagnostics) io.err(formatDiagnosticLine(diagnostic));
    return exitCodes.validationErrors;
  }

  const shownPath = relative(io.cwd, result.handoffPath).split(sep).join('/');
  io.out(`Generated ${result.handoff.id}`);
  io.out(`  handoff: ${shownPath}`);
  io.out(`  context: ${relative(io.cwd, result.contextPath).split(sep).join('/')}`);
  io.out(
    `  artifacts: ${result.handoff.artifacts.length}, revision ${result.handoff.source.revision.slice(0, 12)}`,
  );
  return exitCodes.success;
}

export interface HandoffStatusOptions {
  format?: 'text' | 'json';
}

export async function runHandoffStatus(
  io: CliIo,
  path: string,
  options: HandoffStatusOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const absolute = isAbsolute(path) ? path : join(io.cwd, path);
  const label = relative(repo.root, absolute).split(sep).join('/');

  const report = await handoffStatus(repo.root, absolute, repo.registry, label);

  // PRODUCT110: while the handoff's change and slice are still active, warn about
  // listed artifacts outside the recomputed closure.
  const closureWarnings: Diagnostic[] = [];
  if (report.status !== 'invalid') {
    try {
      const handoff = parse(await readFile(absolute, 'utf8')) as HandoffDocument;
      const changes = await loadActiveChanges(repo);
      const change = changes.find((c) => c.id === handoff.source['product-change']);
      const slice = change?.slices.find((s) => s.id === handoff.source['delivery-slice']);
      if (change && slice) {
        const model = await loadModel(repo.modelDir, repo.root, repo.registry);
        const validation = validateChange(change, model.artifacts, changes, repo.config);
        closureWarnings.push(
          ...checkHandoffClosure(handoff, slice, validation.overlayGraph, label),
        );
      }
    } catch {
      // Closure checking is advisory; status already reported the handoff's state.
    }
  }

  if (options.format === 'json') {
    io.out(stableJson({ ...report, closureWarnings }).trimEnd());
  } else {
    io.out(`${report.handoffId ?? path}: ${report.status}`);
    for (const id of report.staleArtifacts) io.out(`  stale: ${id}`);
    for (const id of report.unresolvedArtifacts) io.out(`  unresolved: ${id}`);
    for (const diagnostic of report.diagnostics) io.out(`  ${formatDiagnosticLine(diagnostic)}`);
    for (const warning of closureWarnings) io.out(`  ${formatDiagnosticLine(warning)}`);
  }
  return report.status === 'current' ? exitCodes.success : exitCodes.validationErrors;
}
