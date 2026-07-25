import {
  findRepositoryRoot,
  openRepository,
  type ProductRepository,
} from '@product-definition-as-code/core';

/** Documented exit codes (docs/specification/validation.md). */
export const exitCodes = {
  success: 0,
  validationErrors: 1,
  invalidInvocation: 2,
  internalFailure: 3,
} as const;

/** An error whose exit code is part of the CLI contract. */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
  ) {
    super(message);
  }
}

export interface CliIo {
  cwd: string;
  out: (line: string) => void;
  err: (line: string) => void;
}

/** Resolve the repository from the working directory or fail with exit code 2. */
export async function resolveRepository(io: CliIo): Promise<ProductRepository> {
  const root = await findRepositoryRoot(io.cwd);
  if (!root) {
    throw new CliError(
      'No product repository found: expected .product/config.yaml or docs/product upward from the working directory',
      exitCodes.invalidInvocation,
    );
  }
  const repo = await openRepository(root);
  if (repo.configDiagnostics.some((d) => d.severity === 'error')) {
    for (const diagnostic of repo.configDiagnostics) {
      io.err(formatDiagnosticLine(diagnostic));
    }
    throw new CliError('Invalid configuration', exitCodes.invalidInvocation);
  }
  return repo;
}

export function formatDiagnosticLine(diagnostic: {
  severity: string;
  code: string;
  message: string;
  file: string;
  artifact?: string;
  field?: string;
  target?: string;
}): string {
  const location = diagnostic.artifact
    ? `${diagnostic.file} [${diagnostic.artifact}]`
    : diagnostic.file;
  const relation =
    diagnostic.field || diagnostic.target
      ? ` (${[diagnostic.field, diagnostic.target].filter(Boolean).join(' -> ')})`
      : '';
  return `${diagnostic.severity} ${diagnostic.code} ${location}: ${diagnostic.message}${relation}`;
}
