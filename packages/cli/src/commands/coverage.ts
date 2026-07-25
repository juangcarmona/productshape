import { isAbsolute, join, relative, sep } from 'node:path';
import { checkCoverage, locateOpenSpecChange } from '@prodshape/adapter-openspec';
import {
  CliError,
  exitCodes,
  formatDiagnosticLine,
  resolveRepository,
  type CliIo,
} from '../context.js';

export async function runCoverageCheck(io: CliIo, target: string): Promise<number> {
  const repo = await resolveRepository(io);

  // Accept an OpenSpec change name or a directory path containing the sidecars.
  let sddChangeDir: string;
  const located = await locateOpenSpecChange(repo.root, target);
  if ('dir' in located) {
    sddChangeDir = located.dir;
  } else if (target.includes('/') || target.includes('\\')) {
    sddChangeDir = isAbsolute(target) ? target : join(io.cwd, target);
  } else {
    throw new CliError(located.error, exitCodes.invalidInvocation);
  }

  const label = (name: string) =>
    relative(repo.root, join(sddChangeDir, name)).split(sep).join('/');
  const result = await checkCoverage(repo.root, sddChangeDir, repo.registry, {
    handoff: label('product-handoff.yaml'),
    coverage: label('product-coverage.yaml'),
  });

  for (const diagnostic of result.diagnostics) io.out(formatDiagnosticLine(diagnostic));
  io.out(
    `covered: ${result.covered.join(', ') || '(none)'}${
      result.uncovered.length > 0 ? `; uncovered: ${result.uncovered.join(', ')}` : ''
    }`,
  );

  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  return errors.length === 0 ? exitCodes.success : exitCodes.validationErrors;
}
