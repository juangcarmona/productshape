import {
  escalateWarnings,
  scanCitations,
  stableJson,
  verifyCitations,
  validateBaseline,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface CitationsVerifyOptions {
  format?: 'text' | 'json';
}

/**
 * `prodshape citations verify` — scan consumer documents for citation records, resolve each
 * against the loaded product model, and report one status per citation.
 *
 * Diagnostics: PRODUCT042 (invalid digest), PRODUCT060 (unresolved), PRODUCT061 (stale),
 * PRODUCT062 (tampered), PRODUCT063 (anchor not found). PRODUCT061 is a warning; the
 * repository's `warnings-as-errors` configuration escalates it.
 */
export async function runCitationsVerify(
  io: CliIo,
  target: string | undefined,
  options: CitationsVerifyOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const { artifacts } = await validateBaseline(repo);

  // The target is the consumer-documents root (default: openspec/).
  const targetDir = target ?? 'openspec';
  const rootDir =
    targetDir.startsWith('/') || /^[A-Za-z]:/.test(targetDir)
      ? targetDir
      : `${repo.root}/${targetDir}`;

  const citations = await scanCitations(rootDir, repo.root);
  const verifications = verifyCitations(citations, artifacts);

  const allDiagnostics = verifications.flatMap((v) => v.diagnostics);
  const diagnostics = escalateWarnings(
    allDiagnostics,
    repo.config.validation['warnings-as-errors'],
  );

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/citations/v1alpha1',
        target: targetDir,
        citations: verifications.map((v) => ({
          id: v.citation.id,
          digest: v.citation.digest,
          anchor: v.citation.anchor,
          source: v.citation.source,
          line: v.citation.line,
          form: v.citation.form,
          status: v.status,
        })),
        summary: {
          total: verifications.length,
          current: verifications.filter((v) => v.status === 'current').length,
          stale: verifications.filter((v) => v.status === 'stale').length,
          tampered: verifications.filter((v) => v.status === 'tampered').length,
          unresolved: verifications.filter((v) => v.status === 'unresolved').length,
          errors: errors.length,
          warnings: warnings.length,
        },
      }).trimEnd(),
    );
  } else {
    for (const v of verifications) {
      const anchor = v.citation.anchor ? `#${v.citation.anchor}` : '';
      io.out(`${v.status}\t${v.citation.id}${anchor}\t${v.citation.source}:${v.citation.line}`);
    }
    for (const diagnostic of diagnostics) {
      io.out(formatDiagnosticLine(diagnostic));
    }
    io.out(
      `${verifications.length} citation(s): ${verifications.filter((v) => v.status === 'current').length} current, ${verifications.filter((v) => v.status === 'stale').length} stale, ${verifications.filter((v) => v.status === 'tampered').length} tampered, ${verifications.filter((v) => v.status === 'unresolved').length} unresolved`,
    );
  }

  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}
