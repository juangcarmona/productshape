import {
  checkIntegrations,
  emptyLock,
  InstallConflictError,
  installProvider,
  readLock,
  rendererFor,
  updateIntegrations,
  writeLock,
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
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CliError,
  exitCodes,
  formatDiagnosticLine,
  resolveRepository,
  type CliIo,
} from '../context.js';

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

  if (!rendererFor(provider)) {
    throw new CliError(
      `Unknown provider '${provider}' (supported: claude, copilot, codex, openspec)`,
      exitCodes.invalidInvocation,
    );
  }
  let result;
  try {
    result = await installProvider(repo.root, provider, {
      force: options?.force,
      render: { shorthandCommands: repo.config.integrations['shorthand-commands'] },
    });
  } catch (error) {
    if (error instanceof InstallConflictError) {
      throw new CliError(error.message, exitCodes.validationErrors);
    }
    throw error;
  }
  if (options?.dryRun) {
    io.out('Dry run — no files written.');
  }
  io.out(`Installed ${result.provider} integration (${result.written.length} managed file(s)).`);
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
      render: { shorthandCommands: repo.config.integrations['shorthand-commands'] },
    });
  } catch (error) {
    if (error instanceof InstallConflictError) {
      throw new CliError(error.message, exitCodes.validationErrors);
    }
    throw error;
  }
  for (const result of results) {
    io.out(
      `Regenerated ${result.provider} integration (${result.written.length} managed file(s)).`,
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

  if (results.length === 0 && !openspecInstalled) {
    io.out('No integrations installed; add one with: prodshape integration add <provider>');
    return exitCodes.success;
  }
  return exitCodes.success;
}

export async function runIntegrationCheck(io: CliIo): Promise<number> {
  const repo = await resolveRepository(io);

  // Check AI provider integrations (managed-file drift).
  const diagnostics = await checkIntegrations(repo.root);
  for (const diagnostic of diagnostics) io.out(formatDiagnosticLine(diagnostic));

  const aiOk = diagnostics.length === 0;
  io.out(
    aiOk
      ? 'All managed integration files match the installation lock.'
      : `${diagnostics.length} managed file problem(s).`,
  );

  // Check OpenSpec integration if installed.
  if (await isOpenSpecIntegrationInstalled(repo.root)) {
    const osResult = await checkOpenSpecIntegration(repo.root);
    for (const check of osResult.checks) {
      io.out(`${check.ok ? 'ok  ' : 'FAIL'} ${check.name}: ${check.detail}`);
    }
    if (!osResult.ok) {
      io.out('OpenSpec integration has problem(s).');
    }
    return aiOk && osResult.ok ? exitCodes.success : exitCodes.validationErrors;
  }

  return aiOk ? exitCodes.success : exitCodes.validationErrors;
}

export async function runIntegrationRemove(
  io: CliIo,
  provider: string,
  options?: { dryRun?: boolean },
): Promise<number> {
  const repo = await resolveRepository(io);

  if (provider === 'openspec') {
    try {
      const result = await removeOpenSpecIntegration(repo.root, { dryRun: options?.dryRun });
      if (options?.dryRun) {
        io.out('Dry run — no files removed.');
        if (result.removed.length === 0) {
          io.out('  OpenSpec integration is not installed.');
        } else {
          for (const path of result.removed) io.out(`  would remove: ${path}`);
        }
        return exitCodes.success;
      }
      if (result.removed.length === 0) {
        io.out('OpenSpec integration is not installed.');
        return exitCodes.success;
      }
      io.out(`Removed OpenSpec integration (${result.removed.length} file(s)):`);
      for (const path of result.removed) io.out(`  ${path}`);
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
      `Unknown provider '${provider}' (supported: claude, copilot, codex, openspec)`,
      exitCodes.invalidInvocation,
    );
  }

  // Remove AI provider managed files and lock entry.
  const lock = (await readLock(repo.root)) ?? emptyLock('0.0.0');
  if (!lock.providers[provider]) {
    io.out(`${provider} integration is not installed.`);
    return exitCodes.success;
  }
  const entry = lock.providers[provider]!;
  const removed: string[] = [];
  for (const path of Object.keys(entry.files).sort()) {
    const target = join(repo.root, ...path.split('/'));
    if (!options?.dryRun) {
      await rm(target, { force: true });
    }
    removed.push(path);
  }

  if (!options?.dryRun) {
    delete lock.providers[provider];
    await writeLock(repo.root, lock);
  }

  if (removed.length === 0) {
    io.out(`${provider} integration is not installed.`);
    return exitCodes.success;
  }

  if (options?.dryRun) {
    io.out('Dry run — no files removed.');
  }
  io.out(`Removed ${provider} integration (${removed.length} file(s)):`);
  for (const path of removed) io.out(`  ${path}`);
  return exitCodes.success;
}
