import { stat } from 'node:fs/promises';
import { extname, isAbsolute, resolve as resolvePath } from 'node:path';
import {
  classifyConsumerDocuments,
  codes,
  escalateWarnings,
  parseCitations,
  scanCitations,
  sortDiagnostics,
  stableJson,
  verifyCitations,
  validateBaseline,
  type ConsumerScopeState,
  type Diagnostic,
  type LoadedArtifact,
  type SddIntegrationProvider,
} from '@prodshape/core';
import {
  isOpenSpecIntegrationInstalled,
  isOpenSpecWorkspace,
  openSpecProvider,
} from '@prodshape/integration-openspec';
import {
  CliError,
  exitCodes,
  formatDiagnosticLine,
  resolveRepository,
  type CliIo,
} from '../context.js';

export interface CitationsVerifyOptions {
  format?: 'text' | 'json';
  /** Explicit repository root; replaces upward discovery from the working directory. */
  root?: string;
  provider?: string;
  change?: string;
  includeArchived?: boolean;
}

/**
 * The SDD integration providers this CLI ships. The provider contract is framework-neutral
 * (@prodshape/core); each entry supplies one framework's population enumeration.
 */
const SDD_PROVIDERS: Record<string, SddIntegrationProvider> = {
  [openSpecProvider.name]: openSpecProvider,
};

/** A document's effective scope state with its citation count, for reporting. */
interface DocumentReport {
  path: string;
  change?: string;
  archived: boolean;
  artifactKind?: string;
  state: ConsumerScopeState;
  declaration: string | null;
  citations: number;
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
async function scanCitationTarget(
  target: string,
  absolutePath: string,
  repoRoot: string,
  fromConfiguredRoots = false,
) {
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
      return await parseCitations(absolutePath, repoRoot);
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
          ? `Configured citation consumer root not found: '${target}'; set 'citations.consumer-roots' in .product/config.yaml to the directories that hold your consumer documents, or pass a target explicitly`
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
 * `prodshape citations verify` — scan consumer documents for citation records, resolve each
 * against the loaded product model, and report one status per citation.
 *
 * Without `--provider`: recursively scans the target directory (default `openspec/`) for
 * citations. This is the backward-compatible mode.
 *
 * With `--provider <name>`: uses that SDD integration provider to enumerate the expected
 * current native consumer documents, distinguishes current from archived material, and enforces
 * the bound/exempt/unclassified scope model. Every enumerated current document has exactly one
 * effective state: `bound` (declares Product Definition dependency and carries citations),
 * `exempt` (a human declared `pdac-scope: none`), or `unclassified` (neither — a FAILURE). A
 * bound document with zero citations also fails, so a workspace can never pass vacuously
 * because no citations were discovered.
 *
 * Diagnostics: PRODUCT042 (invalid digest), PRODUCT060 (unresolved), PRODUCT061 (stale),
 * PRODUCT062 (tampered), PRODUCT063 (anchor not found), PRODUCT070 (unclassified document),
 * PRODUCT072 (provider workspace missing), PRODUCT073 (OpenSpec CLI missing), PRODUCT074
 * (bound document with zero citations), PRODUCT075 (invalid scope declaration). PRODUCT061 is a
 * warning; the repository's `warnings-as-errors` configuration escalates it.
 */
export async function runCitationsVerify(
  io: CliIo,
  target: string | undefined,
  options: CitationsVerifyOptions,
): Promise<number> {
  const repo = await resolveRepository(io, options.root);
  const { artifacts } = await validateBaseline(repo);

  if (options.provider !== undefined) {
    const provider = SDD_PROVIDERS[options.provider];
    if (!provider) {
      throw new CliError(
        `Unknown provider '${options.provider}' (supported: ${Object.keys(SDD_PROVIDERS).sort().join(', ')})`,
        exitCodes.invalidInvocation,
      );
    }
    return runProviderVerify(
      io,
      provider,
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
    repo.config.citations['consumer-roots'],
  );
}

/**
 * Backward-compatible recursive scan: parse the citations the targets happen to contain and
 * verify them. Does not enforce scope declarations — that is what `--provider` is for.
 *
 * With an explicit target, exactly that directory or file is scanned. Without one, the
 * repository's configured `citations.consumer-roots` are scanned (default `openspec`), because
 * where consumer documents live is the repository's decision: a hardcoded root verifies nothing in
 * a repository that keeps its consumers elsewhere, and reports success for having done so.
 */
async function runRecursiveVerify(
  io: CliIo,
  target: string | undefined,
  repoRoot: string,
  artifacts: LoadedArtifact[],
  warningsAsErrors: boolean,
  options: CitationsVerifyOptions,
  consumerRoots: string[],
): Promise<number> {
  const targets = target !== undefined ? [target] : consumerRoots;

  const citations = [];
  for (const targetDir of targets) {
    const rootDir = isAbsolute(targetDir) ? targetDir : resolvePath(repoRoot, targetDir);
    citations.push(
      ...(await scanCitationTarget(targetDir, rootDir, repoRoot, target === undefined)),
    );
  }
  const verifications = verifyCitations(citations, artifacts);

  const allDiagnostics = verifications.flatMap((v) => v.diagnostics);
  const diagnostics = sortDiagnostics(escalateWarnings(allDiagnostics, warningsAsErrors));

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/citations/v1alpha1',
        targets,
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
    // The provider upsell only helps where it applies: an OpenSpec workspace exists and the
    // ProductShape integration has not been wired yet. Anywhere else — an unrelated repository,
    // or one that already runs provider-aware verification — it is noise (issue #106).
    if (
      (await isOpenSpecWorkspace(repoRoot)) &&
      !(await isOpenSpecIntegrationInstalled(repoRoot))
    ) {
      io.out(
        'Tip: use --provider openspec for OpenSpec-aware verification that distinguishes current from archived material and enforces scope declarations.',
      );
    }
  }

  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}

/**
 * Provider-aware verification. The SDD integration provider enumerates the expected current
 * native consumer-document population; framework-neutral core classification assigns each
 * document exactly one effective scope state (bound, exempt or unclassified); every discovered
 * citation is verified against the loaded product model.
 *
 * The gate is ProductShape citation and scope verification only; a provider's native validation
 * (e.g. `openspec validate`) is never invoked, so its verdict stays separate.
 */
async function runProviderVerify(
  io: CliIo,
  provider: SddIntegrationProvider,
  repoRoot: string,
  artifacts: LoadedArtifact[],
  warningsAsErrors: boolean,
  options: CitationsVerifyOptions,
): Promise<number> {
  const allDiagnostics: Diagnostic[] = [];
  let root = provider.name;
  let includeArchived = options.includeArchived ?? false;
  let classified: Awaited<ReturnType<typeof classifyConsumerDocuments>> = [];

  if (await provider.detectWorkspace(repoRoot)) {
    const enumeration = await provider.enumerateDocuments(repoRoot, {
      includeArchived: options.includeArchived ?? false,
      change: options.change,
    });
    root = enumeration.root;
    includeArchived = enumeration.includeArchived;
    allDiagnostics.push(...enumeration.diagnostics);
    classified = await classifyConsumerDocuments(enumeration.documents, repoRoot);
  } else {
    allDiagnostics.push({
      severity: 'error',
      code: codes.openSpecRootUnresolved,
      message: `No ${provider.name} workspace found at the repository root; the expected consumer-document population cannot be enumerated`,
      file: `${provider.name}/`,
    });
  }

  const verifications = verifyCitations(
    classified.flatMap((c) => c.citations),
    artifacts,
  );

  const documentReports: DocumentReport[] = classified.map((c) => ({
    path: c.document.path,
    change: c.document.change,
    archived: c.document.archived,
    artifactKind: c.document.artifactKind,
    state: c.state,
    declaration: c.declaration?.raw ?? null,
    citations: c.citations.length,
  }));

  // Collect every diagnostic before finalizing the public result. Citation status order remains
  // untouched; only the complete diagnostic set is ordered at this boundary.
  allDiagnostics.push(...classified.flatMap((c) => c.diagnostics));
  allDiagnostics.push(...verifications.flatMap((v) => v.diagnostics));

  const diagnostics = sortDiagnostics(escalateWarnings(allDiagnostics, warningsAsErrors));
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  const countState = (state: ConsumerScopeState) =>
    documentReports.filter((d) => d.state === state).length;

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/citations-provider/v1alpha1',
        provider: provider.name,
        root,
        includeArchived,
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
        diagnostics,
        summary: {
          totalDocuments: documentReports.length,
          bound: countState('bound'),
          exempt: countState('exempt'),
          unclassified: countState('unclassified'),
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
    // Per-document effective scope state.
    for (const doc of documentReports) {
      const archiveTag = doc.archived ? ' (archived)' : '';
      const changeTag = doc.change ? ` [${doc.change}]` : '';
      io.out(`${doc.state}\t${doc.path}${archiveTag}${changeTag}\t${doc.citations} citation(s)`);
    }
    // Per-citation statuses.
    for (const v of verifications) {
      const anchor = v.citation.anchor ? `#${v.citation.anchor}` : '';
      io.out(`${v.status}\t${v.citation.id}${anchor}\t${v.citation.source}:${v.citation.line}`);
    }
    for (const diagnostic of diagnostics) {
      io.out(formatDiagnosticLine(diagnostic));
    }
    io.out(
      `${documentReports.length} document(s): ${countState('bound')} bound, ${countState('exempt')} exempt, ${countState('unclassified')} unclassified`,
    );
    io.out(
      `${verifications.length} citation(s): ${verifications.filter((v) => v.status === 'current').length} current, ${verifications.filter((v) => v.status === 'stale').length} stale, ${verifications.filter((v) => v.status === 'tampered').length} tampered, ${verifications.filter((v) => v.status === 'unresolved').length} unresolved`,
    );
  }

  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}
