import { runDoctor } from '@product-definition-as-code/distribution';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export async function runDoctorCommand(io: CliIo): Promise<number> {
  const repo = await resolveRepository(io);

  const configErrors = repo.configDiagnostics.filter((d) => d.severity === 'error');
  const report = await runDoctor({
    root: repo.root,
    configValid: configErrors.length === 0,
    configDetail:
      configErrors.length === 0
        ? '.product/config.yaml valid (or defaults in effect)'
        : `${configErrors.length} configuration error(s)`,
    modelPath: repo.config.product.model,
    changesPath: repo.config.product.changes,
    ...(repo.config.integrations.sdd.provider
      ? { sddProvider: repo.config.integrations.sdd.provider }
      : {}),
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
