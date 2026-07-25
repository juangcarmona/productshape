import {
  checkIntegrations,
  InstallConflictError,
  installProvider,
  rendererFor,
  updateIntegrations,
} from '@prodshape/distribution';
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
  options?: { force?: boolean },
): Promise<number> {
  const repo = await resolveRepository(io);
  if (provider === 'openspec') {
    io.out(
      'OpenSpec integration is configured through .product/config.yaml (integrations.sdd.provider)',
    );
    io.out('and its own tooling (openspec init). Nothing to generate.');
    return exitCodes.success;
  }
  if (!rendererFor(provider)) {
    throw new CliError(
      `Unknown provider '${provider}' (supported: claude, copilot, openspec)`,
      exitCodes.invalidInvocation,
    );
  }
  let result;
  try {
    result = await installProvider(repo.root, provider, undefined, options?.force);
  } catch (error) {
    if (error instanceof InstallConflictError) {
      throw new CliError(error.message, exitCodes.validationErrors);
    }
    throw error;
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
    const diagnostics = await checkIntegrations(repo.root);
    for (const diagnostic of diagnostics) io.out(formatDiagnosticLine(diagnostic));
    io.out(
      diagnostics.length === 0
        ? 'All managed integration files match the installation lock.'
        : `${diagnostics.length} managed file problem(s).`,
    );
    return diagnostics.length === 0 ? exitCodes.success : exitCodes.validationErrors;
  }

  let results;
  try {
    results = await updateIntegrations(repo.root, options.force);
  } catch (error) {
    if (error instanceof InstallConflictError) {
      throw new CliError(error.message, exitCodes.validationErrors);
    }
    throw error;
  }
  if (results.length === 0) {
    io.out('No integrations installed; add one with: prodshape integration add <provider>');
    return exitCodes.success;
  }
  for (const result of results) {
    io.out(
      `Regenerated ${result.provider} integration (${result.written.length} managed file(s)).`,
    );
  }
  return exitCodes.success;
}
