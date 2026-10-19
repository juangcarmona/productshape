import { resolve } from 'node:path';
import {
  blockingDiagnostics,
  gitHead,
  loadEvidence,
  sortDiagnostics,
  stableJson,
  validateBaseline,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export async function runEvidenceVerify(
  io: CliIo,
  paths: string[],
  options: { format?: 'text' | 'json' },
): Promise<number> {
  const repo = await resolveRepository(io, undefined, options.format);
  if (repo.config.version !== 'v1alpha2') {
    io.err(
      'Evidence integration requires v1alpha2. Select it in configuration or with --serialization-version v1alpha2.',
    );
    return exitCodes.invalidInvocation;
  }
  const baseline = await validateBaseline(repo);
  const modelRevision = await gitHead(repo.root);
  const documents = [];
  for (const path of [...new Set(paths)]) {
    const file = path.replaceAll('\\', '/');
    documents.push({
      file,
      ...(await loadEvidence(resolve(repo.root, path), file, baseline.artifacts, modelRevision)),
    });
  }
  const diagnostics = sortDiagnostics(documents.flatMap((d) => d.diagnostics));
  if (options.format === 'json') io.out(stableJson({ documents, diagnostics }).trimEnd());
  else {
    for (const diagnostic of diagnostics) io.out(formatDiagnosticLine(diagnostic));
    for (const document of documents) {
      io.out(
        `${document.file}: run revision ${document.runRevision ?? '(invalid)'}, model revision ${modelRevision ?? '(uncommitted)'}`,
      );
      for (const claim of document.evidenceResults)
        io.out(
          `  ${claim.testId}\t${claim.level}\t${claim.outcome}\tcitations: ${claim.citationStatuses.join(', ')}`,
        );
    }
  }
  return blockingDiagnostics(diagnostics, repo.config.validation['warnings-as-errors']).length
    ? exitCodes.validationErrors
    : exitCodes.success;
}
