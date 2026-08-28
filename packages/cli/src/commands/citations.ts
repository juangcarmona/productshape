import { stat } from 'node:fs/promises';
import { extname, isAbsolute, resolve as resolvePath } from 'node:path';
import {
  classifyConsumerDocuments,
  codes,
  blockingDiagnostics,
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
  isSpecKitIntegrationInstalled,
  isSpecKitWorkspace,
  specKitProvider,
} from '@prodshape/integration-speckit';
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
export const SDD_PROVIDERS: Record<string, SddIntegrationProvider> = {
  [openSpecProvider.name]: openSpecProvider,
  [specKitProvider.name]: specKitProvider,
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
 * `prodshape citations verify` — scan consumer documents for citation records, resolve each
 * against the loaded product model, and report one status per citation.
 *
 * Without `--provider`: recursively scans the target directory (default `openspec/`) for
 * citations. This is the backward-compatible mode.
 *
 * With `--provider <name>`: uses that SDD integration provider to enumerate the expected
 * native consumer documents and enforces the bound/exempt/unclassified scope model. Every
 * enumerated current document carries exactly one explicit declaration: `bound`
 * (`pdac-scope: cited` with at least one citation), or `exempt` (`pdac-scope: none` with a
 * non-empty human-authored reason and no citations). Citations alone never bind; a document
 * without a declaration is unclassified — a FAILURE — so a workspace can never pass vacuously
 * because no citations were discovered.
 *
 * Archived material is excluded by default per the citation contract. `--include-archived`
 * enumerates it and verifies the citations it carries, with every defect reported as a warning
 * and the scope gate still current-only: history is immutable, so its drift is information
 * rather than a defect anyone can repair in place
 * (FR-OPENSPEC-001). `--include-archived` holds archived documents to the full gate instead.
 *
 * Diagnostics: PRODUCT042 (invalid digest), PRODUCT060 (unresolved), PRODUCT061 (stale),
 * PRODUCT062 (tampered), PRODUCT063 (anchor not found), PRODUCT064 (unclassified document),
 * PRODUCT068 (provider workspace missing), PRODUCT069 (OpenSpec CLI missing), PRODUCT065
 * (bound document with zero citations), PRODUCT066 (invalid scope declaration). PRODUCT061 is a
 * warning; the repository's `warnings-as-errors` configuration escalates it.
 */
export async function runCitationsVerify(
  io: CliIo,
  target: string | undefined,
  options: CitationsVerifyOptions,
): Promise<number> {
  const repo = await resolveRepository(io, options.root, options.format);
  const baseline = await validateBaseline(repo);

  // Citation statuses are computed against artifact ids and content digests; an invalid Product
  // Definition offers neither reliably, so verification refuses before scanning a single consumer
  // document, the way invalid configuration stops every command. Warnings alone never trigger the
  // refusal, but once it fires the whole baseline report is emitted. Same surface as the
  // invalid-configuration refusal: envelope on stdout for a JSON invocation, diagnostic lines on
  // stderr, and the error trailer through CliError.
  const modelErrors = baseline.diagnostics.filter((d) => d.severity === 'error');
  if (modelErrors.length > 0) {
    if (options.format === 'json') {
      io.out(
        stableJson({
          schema: 'product-definition-as-code/diagnostics/v1alpha1',
          diagnostics: baseline.diagnostics,
          summary: {
            errors: modelErrors.length,
            warnings: baseline.diagnostics.length - modelErrors.length,
          },
        }).trimEnd(),
      );
    }
    for (const diagnostic of baseline.diagnostics) io.err(formatDiagnosticLine(diagnostic));
    throw new CliError(
      'Invalid product model; citations were not verified',
      exitCodes.validationErrors,
    );
  }
  const { artifacts } = baseline;

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
    repo.config.prodshape.citations['consumer-roots'],
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
  const carrierDiagnostics: Diagnostic[] = [];
  for (const targetDir of targets) {
    const rootDir = isAbsolute(targetDir) ? targetDir : resolvePath(repoRoot, targetDir);
    const scan = await scanCitationTarget(targetDir, rootDir, repoRoot, target === undefined);
    citations.push(...scan.records);
    carrierDiagnostics.push(...scan.diagnostics);
  }
  const verifications = verifyCitations(citations, artifacts);

  const allDiagnostics = [...carrierDiagnostics, ...verifications.flatMap((v) => v.diagnostics)];
  const diagnostics = sortDiagnostics(allDiagnostics);
  const blocking = blockingDiagnostics(diagnostics, warningsAsErrors);
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
    if ((await isSpecKitWorkspace(repoRoot)) && !(await isSpecKitIntegrationInstalled(repoRoot))) {
      io.out(
        'Tip: use --provider speckit for Spec Kit-aware verification that enumerates every feature directory and enforces scope declarations.',
      );
    }
  }

  return blocking.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}

/**
 * Report an archived document's citation defect as a warning, keeping its diagnostic code. An
 * archived change is immutable history: its drift tells the reader the canonical model moved
 * since the change shipped, and no severity can make anyone fix a document the workflow forbids
 * rewriting. Runs before warning escalation, so `warnings-as-errors` still lets a repository
 * choose to block on history drift.
 */
function softenArchivedDiagnostic(diagnostic: Diagnostic): Diagnostic {
  return {
    ...diagnostic,
    // severity-mutation: archived history reports at warning severity (FR-OPENSPEC-001).
    severity: 'warning',
    message: `${diagnostic.message} (archived consumer document)`,
  };
}

/**
 * Provider-aware verification. The SDD integration provider enumerates the expected
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
  // The contract excludes archived or historical documents by default; --include-archived adds
  // them to the verified population, with their citation defects reported as warnings.
  const includeArchived = options.includeArchived ?? false;
  let classified: Awaited<ReturnType<typeof classifyConsumerDocuments>> = [];

  if (await provider.detectWorkspace(repoRoot)) {
    const enumeration = await provider.enumerateDocuments(repoRoot, {
      includeArchived,
      change: options.change,
    });
    root = enumeration.root;
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

  // Verify per document so an archived document's diagnostics can be softened: history is
  // immutable, so a defect found there is information for the reader, not a failure anyone can
  // fix in place (FR-OPENSPEC-001). Softening happens before warning escalation, so a repository
  // that opts into warnings-as-errors deliberately makes history drift block.
  const verifications: ReturnType<typeof verifyCitations> = [];
  const citationDiagnostics: Diagnostic[] = [];
  for (const c of classified) {
    // A carrier conflict suppresses this document's citation statuses; the records still bind it.
    const documentVerifications = c.suppressed ? [] : verifyCitations(c.citations, artifacts);
    verifications.push(...documentVerifications);
    const diagnostics = [
      ...c.carrierDiagnostics,
      ...documentVerifications.flatMap((v) => v.diagnostics),
    ];
    citationDiagnostics.push(
      ...(c.document.archived ? diagnostics.map(softenArchivedDiagnostic) : diagnostics),
    );
  }

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
  // untouched; only the complete diagnostic set is ordered at this boundary. The scope gate
  // (bound/exempt/unclassified) applies to current documents only, even when archived material
  // is included: binding and exemption are declarations made while a document is authored, and
  // history cannot honestly make them retroactively.
  allDiagnostics.push(
    ...classified.filter((c) => !c.document.archived).flatMap((c) => c.diagnostics),
  );
  allDiagnostics.push(...citationDiagnostics);

  const diagnostics = sortDiagnostics(allDiagnostics);
  const blocking = blockingDiagnostics(diagnostics, warningsAsErrors);
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  const countState = (state: ConsumerScopeState) =>
    documentReports.filter((d) => d.state === state).length;

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/citations-provider/v1alpha1',
        provider: provider.name,
        integrationVersion: provider.version,
        root,
        // Mirrors the --include-archived flag: archived material joins the verified population
        // only on request, with its citation defects reported as warnings.
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
          currentDocuments: documentReports.filter((d) => !d.archived).length,
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
    io.out(`provider ${provider.name} ${provider.version}, root ${root}`);
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
      `${documentReports.length} document(s), ${documentReports.filter((d) => !d.archived).length} current: ${countState('bound')} bound, ${countState('exempt')} exempt, ${countState('unclassified')} unclassified`,
    );
    io.out(
      `${verifications.length} citation(s): ${verifications.filter((v) => v.status === 'current').length} current, ${verifications.filter((v) => v.status === 'stale').length} stale, ${verifications.filter((v) => v.status === 'tampered').length} tampered, ${verifications.filter((v) => v.status === 'unresolved').length} unresolved`,
    );
  }

  return blocking.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}
