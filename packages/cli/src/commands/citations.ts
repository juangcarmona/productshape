import {
  discoverOpenSpecPopulation,
  escalateWarnings,
  isOpenSpecCliAvailable,
  parseCitations,
  scanCitations,
  stableJson,
  verifyCitations,
  validateBaseline,
  type LoadedArtifact,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface CitationsVerifyOptions {
  format?: 'text' | 'json';
  provider?: string;
  change?: string;
  includeArchived?: boolean;
}

/** Per-document scope status for OpenSpec-aware verification. */
type ScopeStatus = 'cited' | 'excluded' | 'undocumented';

/** A document's scope classification with its citation count. */
interface DocumentReport {
  path: string;
  change?: string;
  archived: boolean;
  artifactKind?: string;
  scope: ScopeStatus;
  citations: number;
}

/**
 * `prodshape citations verify` — scan consumer documents for citation records, resolve each
 * against the loaded product model, and report one status per citation.
 *
 * Without `--provider`: recursively scans the target directory (default `openspec/`) for
 * citations. This is the backward-compatible mode.
 *
 * With `--provider openspec`: uses `discoverOpenSpecPopulation` to find the actual current
 * consumer documents via the OpenSpec CLI, distinguishes current from archived material, and
 * enforces scope declarations. Every expected current document MUST declare `pdac-scope: none`
 * OR carry at least one citation; an undocumented document is a FAILURE.
 *
 * Diagnostics: PRODUCT042 (invalid digest), PRODUCT060 (unresolved), PRODUCT061 (stale),
 * PRODUCT062 (tampered), PRODUCT063 (anchor not found), PRODUCT070 (missing scope declaration),
 * PRODUCT073 (OpenSpec CLI missing). PRODUCT061 is a warning; the repository's
 * `warnings-as-errors` configuration escalates it.
 */
export async function runCitationsVerify(
  io: CliIo,
  target: string | undefined,
  options: CitationsVerifyOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const { artifacts } = await validateBaseline(repo);

  if (options.provider === 'openspec') {
    return runOpenSpecProviderVerify(
      io,
      repo.root,
      artifacts,
      repo.config.validation['warnings-as-errors'],
      options,
    );
  }

  return runRecursiveVerify(
    io,
    target,
    repo.root,
    artifacts,
    repo.config.validation['warnings-as-errors'],
    options,
  );
}

/**
 * Backward-compatible recursive scan. Scans the target directory (default `openspec/`) for
 * citations and verifies them. Does not enforce scope declarations.
 */
async function runRecursiveVerify(
  io: CliIo,
  target: string | undefined,
  repoRoot: string,
  artifacts: LoadedArtifact[],
  warningsAsErrors: boolean,
  options: CitationsVerifyOptions,
): Promise<number> {
  // The target is the consumer-documents root (default: openspec/).
  const targetDir = target ?? 'openspec';
  const rootDir =
    targetDir.startsWith('/') || /^[A-Za-z]:/.test(targetDir)
      ? targetDir
      : `${repoRoot}/${targetDir}`;

  const citations = await scanCitations(rootDir, repoRoot);
  const verifications = verifyCitations(citations, artifacts);

  const allDiagnostics = verifications.flatMap((v) => v.diagnostics);
  const diagnostics = escalateWarnings(allDiagnostics, warningsAsErrors);

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
        diagnostics,
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
    io.out(
      'Tip: use --provider openspec for OpenSpec-aware verification that distinguishes current from archived material and enforces scope declarations.',
    );
  }

  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}

/**
 * OpenSpec-aware verification. Discovers the actual consumer population via the OpenSpec CLI,
 * verifies citations, and enforces scope declarations.
 */
async function runOpenSpecProviderVerify(
  io: CliIo,
  repoRoot: string,
  artifacts: LoadedArtifact[],
  warningsAsErrors: boolean,
  options: CitationsVerifyOptions,
): Promise<number> {
  const cliAvailable = await isOpenSpecCliAvailable();

  const population = await discoverOpenSpecPopulation(repoRoot, {
    includeArchived: options.includeArchived ?? false,
    change: options.change,
  });

  // Collect all citations across the population.
  const allCitations = [];
  for (const doc of population.documents) {
    const citations = await parseCitations(doc.absolutePath, repoRoot);
    allCitations.push(...citations);
  }

  const verifications = verifyCitations(allCitations, artifacts);

  // Build per-document reports.
  const citationCountByPath = new Map<string, number>();
  for (const v of verifications) {
    citationCountByPath.set(
      v.citation.source,
      (citationCountByPath.get(v.citation.source) ?? 0) + 1,
    );
  }

  const documentReports: DocumentReport[] = [];
  for (const doc of population.documents) {
    const citations = citationCountByPath.get(doc.path) ?? 0;
    let scope: ScopeStatus;
    if (population.excluded.includes(doc)) {
      scope = 'excluded';
    } else if (population.cited.includes(doc)) {
      scope = 'cited';
    } else {
      scope = 'undocumented';
    }
    documentReports.push({
      path: doc.path,
      change: doc.change,
      archived: doc.archived,
      artifactKind: doc.artifactKind,
      scope,
      citations,
    });
  }

  // Citation diagnostics.
  const allDiagnostics = verifications.flatMap((v) => v.diagnostics);
  const escalated = escalateWarnings(allDiagnostics, warningsAsErrors);

  // PRODUCT070: missing scope declaration for each undocumented document.
  for (const doc of population.undocumented) {
    escalated.push({
      severity: 'error',
      code: 'PRODUCT070',
      message: `Consumer document has no pdac-scope declaration and no citations; expected either 'pdac-scope: none' or at least one PDaC citation`,
      file: doc.path,
    });
  }

  // PRODUCT073: report when OpenSpec CLI is missing (we fell back to filesystem scanning).
  if (!cliAvailable) {
    escalated.push({
      severity: 'error',
      code: 'PRODUCT073',
      message: `OpenSpec CLI not found on PATH; fell back to filesystem scanning. Install with 'npm install -g openspec' for accurate population discovery.`,
      file: 'openspec/',
    });
  }

  const errors = escalated.filter((d) => d.severity === 'error');
  const warnings = escalated.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/citations-openspec/v1alpha1',
        provider: 'openspec',
        root: population.root,
        includeArchived: population.includeArchived,
        documents: documentReports,
        citations: verifications.map((v) => ({
          id: v.citation.id,
          digest: v.citation.digest,
          anchor: v.citation.anchor,
          source: v.citation.source,
          line: v.citation.line,
          form: v.citation.form,
          status: v.status,
        })),
        diagnostics: escalated,
        summary: {
          totalDocuments: population.documents.length,
          cited: population.cited.length,
          excluded: population.excluded.length,
          undocumented: population.undocumented.length,
          totalCitations: verifications.length,
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
    // Per-document scope status.
    for (const doc of documentReports) {
      const archiveTag = doc.archived ? ' (archived)' : '';
      const changeTag = doc.change ? ` [${doc.change}]` : '';
      io.out(`${doc.scope}\t${doc.path}${archiveTag}${changeTag}\t${doc.citations} citation(s)`);
    }
    // Per-citation statuses.
    for (const v of verifications) {
      const anchor = v.citation.anchor ? `#${v.citation.anchor}` : '';
      io.out(`${v.status}\t${v.citation.id}${anchor}\t${v.citation.source}:${v.citation.line}`);
    }
    for (const diagnostic of escalated) {
      io.out(formatDiagnosticLine(diagnostic));
    }
    io.out(
      `${population.documents.length} document(s): ${population.cited.length} cited, ${population.excluded.length} excluded, ${population.undocumented.length} undocumented`,
    );
    io.out(
      `${verifications.length} citation(s): ${verifications.filter((v) => v.status === 'current').length} current, ${verifications.filter((v) => v.status === 'stale').length} stale, ${verifications.filter((v) => v.status === 'tampered').length} tampered, ${verifications.filter((v) => v.status === 'unresolved').length} unresolved`,
    );
  }

  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}
