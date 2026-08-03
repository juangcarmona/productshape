import { escalateWarnings, validateBaseline } from '@prodshape/core';
import { runDoctor } from '@prodshape/distribution';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export async function runDoctorCommand(io: CliIo): Promise<number> {
  const repo = await resolveRepository(io);

  // validateBaseline, not runValidate: `doctor` diagnoses and must not write. runValidate would
  // regenerate .product/generated as a side effect.
  const baseline = await validateBaseline(repo);
  const diagnostics = escalateWarnings(
    baseline.diagnostics,
    repo.config.validation['warnings-as-errors'],
  );

  const configErrors = repo.configDiagnostics.filter((d) => d.severity === 'error');
  const report = await runDoctor({
    root: repo.root,
    configValid: configErrors.length === 0,
    configDetail:
      configErrors.length === 0
        ? '.product/config.yaml valid (or defaults in effect)'
        : `${configErrors.length} configuration error(s)`,
    modelPath: repo.config.product.model,
    validation: {
      errors: diagnostics.filter((d) => d.severity === 'error').length,
      warnings: diagnostics.filter((d) => d.severity === 'warning').length,
      artifacts: baseline.graph.nodes.length,
    },
  });

  let failed = 0;
  for (const check of report.checks) {
    if (!check.ok) failed += 1;
    io.out(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}: ${check.detail}`);
  }
  for (const diagnostic of report.diagnostics) io.out(`     ${formatDiagnosticLine(diagnostic)}`);

  io.out(failed === 0 ? 'All checks passed.' : `${failed} check(s) failed.`);
  return failed === 0 ? exitCodes.success : exitCodes.validationErrors;
}
