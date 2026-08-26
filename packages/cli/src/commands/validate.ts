import {
  buildGeneratedOutputs,
  blockingDiagnostics,
  stableJson,
  validateBaseline,
  writeGeneratedOutputs,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface ValidateOptions {
  format?: 'text' | 'json';
  /**
   * Refresh `.product/generated/*` from this run. Off by default: `validate` reports a verdict and
   * must not mutate the working tree to do it. `graph` is the command that generates outputs.
   */
  writeGenerated?: boolean;
  /** Explicit repository root; replaces upward discovery from the working directory. */
  root?: string;
}

export async function runValidate(io: CliIo, options: ValidateOptions): Promise<number> {
  const repo = await resolveRepository(io, options.root, options.format);
  const { graph, diagnostics } = await validateBaseline(repo);
  const blocking = blockingDiagnostics(diagnostics, repo.config.validation['warnings-as-errors']);

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/diagnostics/v1alpha1',
        diagnostics,
        summary: {
          errors: errors.length,
          warnings: warnings.length,
          artifacts: graph.nodes.length,
        },
      }).trimEnd(),
    );
  } else {
    for (const diagnostic of diagnostics) io.out(formatDiagnosticLine(diagnostic));
    io.out(
      `${errors.length} error(s), ${warnings.length} warning(s) across ${graph.nodes.length} artifact(s)`,
    );
    if (graph.nodes.length === 0) {
      // Valid and empty are different answers: an empty model must not read as completed
      // adoption, so the zero-artifact case names the route to the first accepted baseline.
      io.out(
        'No product definition exists yet: 0 artifacts were found under the model directory. Create the first baseline through CHG-INITIAL (prodshape change create CHG-INITIAL); the citation-first walkthrough in the @prodshape/cli README walks the whole loop.',
      );
    }
  }

  // Generation is opt-in: validate is a read-only verdict, and writing generated files as a side
  // effect left untracked `.product/` directories behind wherever it ran — including inside other
  // repositories' conformance fixtures. `--write-generated` refreshes them on request, and
  // `prodshape graph` remains the dedicated generator.
  if (options.writeGenerated) {
    await writeGeneratedOutputs(repo.generatedDir, buildGeneratedOutputs(graph, diagnostics));
  }

  return blocking.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}
