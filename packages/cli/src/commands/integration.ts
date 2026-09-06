import {
  applyProviderPlan,
  applyProviderRemoval,
  checkIntegrations,
  InstallationLockError,
  InstallConflictError,
  planProvider,
  planProviderRemoval,
  rendererFor,
  updateIntegrations,
} from '@prodshape/distribution';
import {
  addOpenSpecIntegration,
  checkOpenSpecIntegration,
  isOpenSpecIntegrationInstalled,
  OPENSPEC_CI_EXAMPLE_RELATIVE,
  OPENSPEC_VERIFY_COMMAND,
  removeOpenSpecIntegration,
  updateOpenSpecIntegration,
} from '@prodshape/integration-openspec';
import {
  addSpecKitIntegration,
  checkSpecKitIntegration,
  isSpecKitIntegrationInstalled,
  removeSpecKitIntegration,
  SPECKIT_CI_EXAMPLE_RELATIVE,
  SPECKIT_VERIFY_COMMAND,
  updateSpecKitIntegration,
} from '@prodshape/integration-speckit';
import {
  CliError,
  exitCodes,
  formatDiagnosticLine,
  resolveRepository,
  type CliIo,
} from '../context.js';

/**
 * An installation lock that exists but cannot be trusted is a refusal, not a crash: every
 * integration command stops with the validation exit code rather than proceeding as though
 * nothing were installed.
 */
function asCliError(error: unknown): CliError {
  if (error instanceof InstallationLockError) {
    return new CliError(error.message, exitCodes.validationErrors);
  }
  if (error instanceof InstallConflictError) {
    return new CliError(error.message, exitCodes.validationErrors);
  }
  return new CliError(
    error instanceof Error ? error.message : String(error),
    exitCodes.validationErrors,
  );
}

export async function runIntegrationAdd(
  io: CliIo,
  provider: string,
  options?: { force?: boolean; dryRun?: boolean },
): Promise<number> {
  const repo = await resolveRepository(io);

  if (provider === 'openspec') {
    try {
      const result = await addOpenSpecIntegration(repo.root, {
        force: options?.force,
        dryRun: options?.dryRun,
        warningsAsErrors: repo.config.validation['warnings-as-errors'],
      });
      if (options?.dryRun) {
        io.out('Dry run — no files written.');
        for (const change of result.changes) io.out(`  would change: ${change}`);
        if (result.changes.length === 0) io.out('  OpenSpec integration is already up to date.');
        return exitCodes.success;
      }
      if (result.written.length === 0) {
        io.out('OpenSpec integration is already up to date.');
        io.out(`Verify: ${OPENSPEC_VERIFY_COMMAND}`);
        return exitCodes.success;
      }
      io.out(`Installed OpenSpec integration (${result.written.length} file(s) written):`);
      for (const path of result.written) io.out(`  ${path}`);
      io.out(`  OpenSpec CLI: ${result.meta.openspecVersion}`);
      io.out(`Verify: ${OPENSPEC_VERIFY_COMMAND}`);
      io.out(
        `CI: copy ${OPENSPEC_CI_EXAMPLE_RELATIVE} into your pipeline; it states how the repository's stale-citation policy applies.`,
      );
    } catch (error) {
      throw new CliError(
        error instanceof Error ? error.message : String(error),
        exitCodes.validationErrors,
      );
    }
    return exitCodes.success;
  }

  if (provider === 'speckit') {
    try {
      const result = await addSpecKitIntegration(repo.root, {
        force: options?.force,
        dryRun: options?.dryRun,
        warningsAsErrors: repo.config.validation['warnings-as-errors'],
      });
      if (options?.dryRun) {
        io.out('Dry run — no files written.');
        for (const change of result.changes) io.out(`  would change: ${change}`);
        if (result.changes.length === 0) io.out('  Spec Kit integration is already up to date.');
        return exitCodes.success;
      }
      if (result.written.length === 0) {
        io.out('Spec Kit integration is already up to date.');
        io.out(`Verify: ${SPECKIT_VERIFY_COMMAND}`);
        return exitCodes.success;
      }
      io.out(`Installed Spec Kit integration (${result.written.length} file(s) written):`);
      for (const path of result.written) io.out(`  ${path}`);
      io.out(`Verify: ${SPECKIT_VERIFY_COMMAND}`);
      io.out(
        `CI: copy ${SPECKIT_CI_EXAMPLE_RELATIVE} into your pipeline; it states how the repository's stale-citation policy applies.`,
      );
    } catch (error) {
      throw new CliError(
        error instanceof Error ? error.message : String(error),
        exitCodes.validationErrors,
      );
    }
    return exitCodes.success;
  }

  if (!rendererFor(provider)) {
    throw new CliError(
      `Unknown provider '${provider}' (supported: claude, copilot, codex, openspec, speckit)`,
      exitCodes.invalidInvocation,
    );
  }
  // Plan first, always. A dry run is the plan without the apply, so what the report says is what
  // the real run does; the previous order — install, then check the flag — wrote every managed
  // file and then announced that nothing had been written.
  let plan;
  try {
    plan = await planProvider(repo.root, provider, {
      force: options?.force,
      render: { shorthandCommands: repo.config.prodshape.integrations['shorthand-commands'] },
    });
  } catch (error) {
    throw asCliError(error);
  }

  if (options?.dryRun) {
    io.out('Dry run — no files written.');
    for (const path of plan.created) io.out(`  would create: ${path}`);
    for (const path of plan.regenerated) io.out(`  would regenerate: ${path}`);
    for (const path of plan.overwritten) io.out(`  would overwrite: ${path}`);
    for (const path of plan.orphans) io.out(`  would remove if unmodified: ${path}`);
    // A dry run predicts the outcome, including a refusal: reporting success here and failing on
    // the real run would make the report the one thing a maintainer cannot rely on.
    if (plan.conflicts.length > 0) {
      throw new CliError(
        new InstallConflictError(provider, plan.conflicts).message,
        exitCodes.validationErrors,
      );
    }
    if (plan.created.length === 0 && plan.overwritten.length === 0 && plan.orphans.length === 0) {
      io.out(`  ${provider} integration is already up to date.`);
    }
    return exitCodes.success;
  }

  if (plan.conflicts.length > 0) {
    throw new CliError(
      new InstallConflictError(provider, plan.conflicts).message,
      exitCodes.validationErrors,
    );
  }
  let result;
  try {
    result = await applyProviderPlan(repo.root, plan);
  } catch (error) {
    throw asCliError(error);
  }
  io.out(
    `Installed ${result.provider} integration (${result.written.length + result.unchanged.length} managed file(s)).`,
  );
  return exitCodes.success;
}

export async function runIntegrationUpdate(
  io: CliIo,
  options: { check?: boolean; force?: boolean },
): Promise<number> {
  const repo = await resolveRepository(io);

  if (options.check) {
    return runIntegrationCheck(io);
  }

  // Update AI provider integrations.
  let results;
  try {
    results = await updateIntegrations(repo.root, {
      force: options.force,
      render: { shorthandCommands: repo.config.prodshape.integrations['shorthand-commands'] },
    });
  } catch (error) {
    throw asCliError(error);
  }
  for (const result of results) {
    io.out(
      `Regenerated ${result.provider} integration (${result.written.length + result.unchanged.length} managed file(s)).`,
    );
    if (result.removed.length > 0) {
      io.out(
        `Removed ${result.removed.length} managed file(s) the ${result.provider} integration no longer generates:`,
      );
      for (const path of result.removed) io.out(`  ${path}`);
    }
  }

  // Update OpenSpec integration if installed.
  const openspecInstalled = await isOpenSpecIntegrationInstalled(repo.root);
  if (openspecInstalled) {
    try {
      const osResult = await updateOpenSpecIntegration(repo.root, {
        force: options.force,
        warningsAsErrors: repo.config.validation['warnings-as-errors'],
      });
      if (osResult.written.length > 0) {
        io.out(`Updated OpenSpec integration (${osResult.written.length} file(s) written):`);
        for (const path of osResult.written) io.out(`  ${path}`);
      } else {
        io.out('OpenSpec integration is already up to date.');
      }
    } catch (error) {
      throw new CliError(
        error instanceof Error ? error.message : String(error),
        exitCodes.validationErrors,
      );
    }
  }

  // Update Spec Kit integration if installed.
  const speckitInstalled = await isSpecKitIntegrationInstalled(repo.root);
  if (speckitInstalled) {
    try {
      const skResult = await updateSpecKitIntegration(repo.root, {
        force: options.force,
        warningsAsErrors: repo.config.validation['warnings-as-errors'],
      });
      if (skResult.written.length > 0) {
        io.out(`Updated Spec Kit integration (${skResult.written.length} file(s) written):`);
        for (const path of skResult.written) io.out(`  ${path}`);
      } else {
        io.out('Spec Kit integration is already up to date.');
      }
    } catch (error) {
      throw new CliError(
        error instanceof Error ? error.message : String(error),
        exitCodes.validationErrors,
      );
    }
  }

  if (results.length === 0 && !openspecInstalled && !speckitInstalled) {
    io.out('No integrations installed; add one with: prodshape integration add <provider>');
    return exitCodes.success;
  }
  return exitCodes.success;
}

export async function runIntegrationCheck(io: CliIo): Promise<number> {
  const repo = await resolveRepository(io);

  // Check AI provider integrations (managed-file drift). A lock that exists but cannot be trusted
  // fails the check: there is no record of what is managed, so reporting a clean result would be
  // reporting that an unverifiable installation is verified.
  let diagnostics;
  try {
    diagnostics = await checkIntegrations(repo.root);
  } catch (error) {
    if (error instanceof InstallationLockError) {
      io.err(error.message);
      return exitCodes.validationErrors;
    }
    throw error;
  }
  for (const diagnostic of diagnostics) io.out(formatDiagnosticLine(diagnostic));

  const aiOk = diagnostics.length === 0;
  io.out(
    aiOk
      ? 'All managed integration files match the installation lock.'
      : `${diagnostics.length} managed file problem(s).`,
  );

  let sddOk = true;

  // Check OpenSpec integration if installed.
  if (await isOpenSpecIntegrationInstalled(repo.root)) {
    const osResult = await checkOpenSpecIntegration(repo.root);
    for (const check of osResult.checks) {
      io.out(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}: ${check.detail}`);
    }
    if (!osResult.ok) {
      io.out('OpenSpec integration has problem(s).');
      sddOk = false;
    }
  }

  // Check Spec Kit integration if installed.
  if (await isSpecKitIntegrationInstalled(repo.root)) {
    const skResult = await checkSpecKitIntegration(repo.root);
    for (const check of skResult.checks) {
      io.out(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}: ${check.detail}`);
    }
    if (!skResult.ok) {
      io.out('Spec Kit integration has problem(s).');
      sddOk = false;
    }
  }

  return aiOk && sddOk ? exitCodes.success : exitCodes.validationErrors;
}

interface SddRemoval {
  removed: string[];
  /** Files kept on disk with the PDaC content stripped. */
  restored: string[];
  preserved?: string[];
}

const SDD_REMOVALS = new Map<
  string,
  { label: string; remove: (root: string, options: { dryRun?: boolean }) => Promise<SddRemoval> }
>([
  ['openspec', { label: 'OpenSpec', remove: removeOpenSpecIntegration }],
  ['speckit', { label: 'Spec Kit', remove: removeSpecKitIntegration }],
]);

function reportSddRemoval(io: CliIo, label: string, result: SddRemoval, dryRun: boolean): void {
  if (result.removed.length + result.restored.length === 0) {
    io.out(`${label} integration is not installed.`);
    return;
  }
  io.out(
    dryRun
      ? 'Dry run: nothing was changed.'
      : `Removed ${label} integration (${result.removed.length} file(s) deleted, ${result.restored.length} restored):`,
  );
  const deleted = dryRun ? 'would delete' : 'deleted';
  const restored = dryRun ? 'would restore' : 'restored';
  for (const path of result.removed) io.out(`  ${deleted}: ${path}`);
  for (const path of result.restored) io.out(`  ${restored}: ${path}`);
  for (const path of result.preserved ?? []) io.out(`  kept, edited by hand: ${path}`);
}

export async function runIntegrationRemove(
  io: CliIo,
  provider: string,
  options?: { dryRun?: boolean; force?: boolean },
): Promise<number> {
  const repo = await resolveRepository(io);

  const sdd = SDD_REMOVALS.get(provider);
  if (sdd) {
    try {
      const result = await sdd.remove(repo.root, { dryRun: options?.dryRun });
      reportSddRemoval(io, sdd.label, result, options?.dryRun ?? false);
    } catch (error) {
      throw new CliError(
        error instanceof Error ? error.message : String(error),
        exitCodes.validationErrors,
      );
    }
    return exitCodes.success;
  }

  if (!rendererFor(provider)) {
    throw new CliError(
      `Unknown provider '${provider}' (supported: claude, copilot, codex, openspec, speckit)`,
      exitCodes.invalidInvocation,
    );
  }

  // Remove AI provider managed files and lock entry. Planned first, and drift-safe by default:
  // a managed file a human edited is the human's work, and deleting it because the lock happens
  // to name it destroys content the product never wrote.
  let plan;
  try {
    plan = await planProviderRemoval(repo.root, provider, { force: options?.force });
  } catch (error) {
    throw asCliError(error);
  }

  const touched =
    plan.removed.length + plan.preserved.length + plan.missing.length + plan.rejected.length;
  if (touched === 0) {
    io.out(`${provider} integration is not installed.`);
    return exitCodes.success;
  }

  const report = (): void => {
    for (const path of plan.preserved) {
      io.out(`  preserved (modified by hand): ${path}`);
    }
    for (const path of plan.missing) {
      io.out(`  already absent: ${path}`);
    }
    for (const rejection of plan.rejected) {
      io.out(`  refused (not a repository-relative path): ${rejection.path}`);
    }
    if (plan.preserved.length > 0) {
      io.out(
        `${plan.preserved.length} modified file(s) were kept, and stay recorded in the installation lock. Re-run with --force to remove them.`,
      );
    }
  };

  if (options?.dryRun) {
    io.out('Dry run — no files removed.');
    for (const path of plan.removed) io.out(`  would remove: ${path}`);
    report();
    if (plan.removed.length === 0 && plan.preserved.length === 0) {
      io.out(`  nothing to remove for the ${provider} integration.`);
    }
    return plan.rejected.length > 0 ? exitCodes.validationErrors : exitCodes.success;
  }

  let result;
  try {
    result = await applyProviderRemoval(repo.root, plan);
  } catch (error) {
    throw asCliError(error);
  }

  if (result.removed.length > 0) {
    io.out(`Removed ${provider} integration (${result.removed.length} file(s)):`);
    for (const path of result.removed) io.out(`  ${path}`);
  } else {
    io.out(`Removed no ${provider} files.`);
  }
  report();
  return plan.rejected.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}
