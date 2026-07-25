import {
  buildGeneratedOutputs,
  escalateWarnings,
  stableJson,
  validateBaseline,
  writeGeneratedOutputs,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface ValidateOptions {
  format?: 'text' | 'json';
}

export async function runValidate(io: CliIo, options: ValidateOptions): Promise<number> {
  const repo = await resolveRepository(io);
  const { graph, diagnostics: reported } = await validateBaseline(repo);
  const diagnostics = escalateWarnings(reported, repo.config.validation['warnings-as-errors']);

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/diagnostics/v1alpha1',
        diagnostics,
        summary: { errors: errors.length, warnings: warnings.length },
      }).trimEnd(),
    );
  } else {
    for (const diagnostic of diagnostics) io.out(formatDiagnosticLine(diagnostic));
    io.out(
      `${errors.length} error(s), ${warnings.length} warning(s) across ${graph.nodes.length} artifact(s)`,
    );
  }

  // Keep .product/generated/diagnostics.json in sync with the latest run.
  await writeGeneratedOutputs(repo.generatedDir, buildGeneratedOutputs(graph, diagnostics));

  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}
