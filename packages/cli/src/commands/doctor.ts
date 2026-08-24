import { blockingDiagnostics, validateBaseline } from '@prodshape/core';
import { runDoctor } from '@prodshape/distribution';
import {
  checkOpenSpecIntegration,
  isOpenSpecIntegrationInstalled,
  isOpenSpecWorkspace,
} from '@prodshape/integration-openspec';
import {
  checkSpecKitIntegration,
  isSpecKitIntegrationInstalled,
  isSpecKitWorkspace,
} from '@prodshape/integration-speckit';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export async function runDoctorCommand(io: CliIo): Promise<number> {
  const repo = await resolveRepository(io);

  // validateBaseline, not runValidate: `doctor` diagnoses and must not write. runValidate would
  // regenerate .product/generated as a side effect.
  const baseline = await validateBaseline(repo);
  const diagnostics = baseline.diagnostics;
  const blocking = blockingDiagnostics(diagnostics, repo.config.validation['warnings-as-errors']);

  const configErrors = repo.configDiagnostics.filter((d) => d.severity === 'error');

  // Check OpenSpec integration health when it is installed; when an OpenSpec workspace exists
  // without the integration, report that informationally so the adopter learns the command.
  let openspecHealth:
    { installed: boolean; checks: { name: string; ok: boolean; detail: string }[] } | undefined;
  if (await isOpenSpecIntegrationInstalled(repo.root)) {
    const result = await checkOpenSpecIntegration(repo.root);
    openspecHealth = { installed: true, checks: result.checks };
  } else if (await isOpenSpecWorkspace(repo.root)) {
    openspecHealth = { installed: false, checks: [] };
  }

  // Same terms for Spec Kit: health when installed, informational when only the workspace exists.
  let speckitHealth:
    { installed: boolean; checks: { name: string; ok: boolean; detail: string }[] } | undefined;
  if (await isSpecKitIntegrationInstalled(repo.root)) {
    const result = await checkSpecKitIntegration(repo.root);
    speckitHealth = { installed: true, checks: result.checks };
  } else if (await isSpecKitWorkspace(repo.root)) {
    speckitHealth = { installed: false, checks: [] };
  }

  const report = await runDoctor({
    root: repo.root,
    configValid: configErrors.length === 0,
    configDetail:
      configErrors.length === 0
        ? '.product/config.yaml valid (or defaults in effect)'
        : `${configErrors.length} configuration error(s)`,
    modelPath: repo.config.product.model,
    // The health verdict gates on the blocking set, so warnings-as-errors fails the check while
    // the emitted diagnostics keep their severity.
    validation: {
      errors: blocking.length,
      warnings: diagnostics.length - blocking.length,
      artifacts: baseline.graph.nodes.length,
    },
    ...(openspecHealth ? { openspec: openspecHealth } : {}),
    ...(speckitHealth ? { speckit: speckitHealth } : {}),
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
