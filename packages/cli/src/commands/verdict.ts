import { stat } from 'node:fs/promises';
import { extname, isAbsolute, join, resolve as resolvePath } from 'node:path';
import {
  discoverChanges,
  loadChange,
  parseCitations,
  scanCitations,
  validateChange,
  verifyCitations,
  type BaselineValidation,
  type Diagnostic,
  type LoadedArtifact,
  type LoadedChange,
  type ProductRepository,
} from '@prodshape/core';
import { CliError, exitCodes } from '../context.js';

/**
 * The pieces every validation command shares so each one can report the whole repository's
 * verdict. The conformance contract asserts the expected exit code independently for every
 * configured command, so `validate`, `change validate` and `citations verify` must each fail on
 * a defect anywhere in scope: the baseline, the live changes, and (where a consumer scope is
 * given) the citations.
 */

/** Load every live change under changes/active. Archived changes are inert and never loaded. */
export async function loadActiveChanges(repo: ProductRepository): Promise<LoadedChange[]> {
  const dirs = await discoverChanges(join(repo.changesDir, 'active'));
  const changes: LoadedChange[] = [];
  for (const dir of dirs) changes.push(await loadChange(dir, repo.root, repo.registry));
  return changes;
}

/** Every live change's overlay diagnostics against the given baseline. */
export async function liveChangeDiagnostics(
  repo: ProductRepository,
  baseline: BaselineValidation,
): Promise<Diagnostic[]> {
  const changes = await loadActiveChanges(repo);
  return changes.flatMap(
    (change) => validateChange(change, baseline.artifacts, changes).diagnostics,
  );
}

const SUPPORTED_CONSUMER_EXTENSIONS = new Set(['.md', '.yaml', '.yml']);

function filesystemErrorCode(error: unknown): string | undefined {
  if (
    error instanceof Error &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code;
  }
  return undefined;
}

/**
 * Classify the command target before invoking core discovery. Path validity belongs at the CLI
 * boundary because it determines the documented invalid-invocation exit code; parsing and
 * recursive discovery remain core responsibilities.
 */
export async function scanCitationTarget(
  target: string,
  absolutePath: string,
  repoRoot: string,
  fromConfiguredRoots = false,
): Promise<{
  records: Awaited<ReturnType<typeof scanCitations>>['records'];
  diagnostics: Diagnostic[];
}> {
  try {
    const targetStat = await stat(absolutePath);
    if (targetStat.isDirectory()) {
      return await scanCitations(absolutePath, repoRoot);
    }
    if (targetStat.isFile()) {
      const extension = extname(absolutePath);
      if (!SUPPORTED_CONSUMER_EXTENSIONS.has(extension)) {
        throw new CliError(
          `Unsupported citation target file type '${extension || '(none)'}': '${target}'; expected .md, .yaml, or .yml`,
          exitCodes.invalidInvocation,
        );
      }
      const parsed = await parseCitations(absolutePath, repoRoot);
      // A carrier conflict suppresses citation statuses; the diagnostic explains why.
      return { records: parsed.suppressed ? [] : parsed.records, diagnostics: parsed.diagnostics };
    }
    throw new CliError(
      `Citation target must be a directory or supported consumer file: '${target}'`,
      exitCodes.invalidInvocation,
    );
  } catch (error) {
    if (error instanceof CliError) throw error;

    const code = filesystemErrorCode(error);
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      // A configured root that does not exist is a setup defect, not an empty result: reporting
      // "0 citations" for it would be the false green the configuration exists to prevent. Name
      // the key so the fix is obvious in a repository whose consumers live somewhere else.
      throw new CliError(
        fromConfiguredRoots
          ? `Configured citation consumer root not found: '${target}'; set 'extensions.prodshape.citations.consumer-roots' in .product/config.yaml to the directories that hold your consumer documents, or pass a target explicitly`
          : `Citation target not found: '${target}'`,
        exitCodes.invalidInvocation,
      );
    }
    if (code) {
      throw new CliError(
        `Cannot access citation target '${target}' (${code})`,
        exitCodes.invalidInvocation,
      );
    }
    throw error;
  }
}

/**
 * The citation diagnostics of one consumer scope, for a command whose primary job is not
 * citation reporting: scan the target, verify every record against the artifacts, and return
 * the diagnostics alone.
 */
export async function consumerCitationDiagnostics(
  repo: ProductRepository,
  artifacts: LoadedArtifact[],
  target: string,
): Promise<Diagnostic[]> {
  const rootDir = isAbsolute(target) ? target : resolvePath(repo.root, target);
  const scan = await scanCitationTarget(target, rootDir, repo.root);
  const verifications = verifyCitations(scan.records, artifacts);
  return [...scan.diagnostics, ...verifications.flatMap((v) => v.diagnostics)];
}
