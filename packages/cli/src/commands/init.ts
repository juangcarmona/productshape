import { initRepository, rendererFor } from '@prodshape/distribution';
import { CliError, exitCodes, type CliIo } from '../context.js';

export interface InitCliOptions {
  ai?: string;
  sdd?: string;
  force?: boolean;
}

export async function runInit(io: CliIo, options: InitCliOptions): Promise<number> {
  const ai = (options.ai ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  for (const provider of ai) {
    if (!rendererFor(provider)) {
      throw new CliError(
        `Unknown AI provider '${provider}' (supported: claude, copilot)`,
        exitCodes.invalidInvocation,
      );
    }
  }
  if (options.sdd && options.sdd !== 'openspec') {
    throw new CliError(
      `Unknown SDD provider '${options.sdd}' (v0.1 supports: openspec)`,
      exitCodes.invalidInvocation,
    );
  }

  const result = await initRepository({
    root: io.cwd,
    ai,
    ...(options.sdd ? { sdd: options.sdd } : {}),
    ...(options.force !== undefined ? { force: options.force } : {}),
  });

  io.out(`Initialized Product Definition as Code (${result.created.length} file(s) created).`);
  if (result.skipped.length > 0) {
    io.out('Preserved existing files (use --force to overwrite):');
    for (const path of result.skipped) io.out(`  ${path}`);
  }
  io.out('Next steps:');
  for (const step of result.nextSteps) io.out(`  - ${step}`);
  return exitCodes.success;
}
