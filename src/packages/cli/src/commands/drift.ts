import { stat } from 'node:fs/promises';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import {
  buildArtifactIndex,
  parseDriftFile,
  scanDriftMarkers,
  stableJson,
  validateBaseline,
  type DriftRecord,
} from '@prodshape/core';
import { CliError, exitCodes, resolveRepository, type CliIo } from '../context.js';
import { SDD_PROVIDERS } from './citations.js';

export interface DriftOptions {
  format?: 'text' | 'json';
  /** Explicit repository root; replaces upward discovery from the working directory. */
  root?: string;
  provider?: string;
}

/** One drift warning as reported, with provider context and per-ID resolution. */
interface DriftReport {
  source: string;
  line: number;
  change?: string;
  archived: boolean;
  ids: Array<{ id: string; resolves: boolean }>;
  summary?: string;
  malformed: boolean;
}

/**
 * `prodshape drift` — enumerate the product-definition drift warnings recorded in consumer
 * documents (FR-OPENSPEC-001). A drift warning is a `<!-- pdac-drift ids="..." summary="..." -->`
 * marker a consumer wrote inside its proposal's drift note when a change's goals contradicted or
 * exceeded the accepted definition; this command lists them so a product owner reviews open
 * drift from one listing instead of reading every proposal.
 *
 * This is a report, never a gate: recorded drift exits 0, no diagnostic is emitted, and the
 * command judges nothing about the drift itself — detection was the consumer's semantic work and
 * resolution is a human agreement. A malformed marker (no `ids`) and an ID that does not resolve
 * in the current model are called out in the listing so typos surface, still without failing.
 *
 * Without `--provider`: recursively scans the target directory, or the repository's configured
 * `citations.consumer-roots` when no target is given. With `--provider <name>`: enumerates that
 * SDD provider's consumer-document population, current and archived material both, tagging
 * archived documents.
 */
export async function runDrift(
  io: CliIo,
  target: string | undefined,
  options: DriftOptions,
): Promise<number> {
  const repo = await resolveRepository(io, options.root);
  const { artifacts } = await validateBaseline(repo);
  const index = buildArtifactIndex(artifacts);

  let reports: DriftReport[];
  if (options.provider !== undefined) {
    const provider = SDD_PROVIDERS[options.provider];
    if (!provider) {
      throw new CliError(
        `Unknown provider '${options.provider}' (supported: ${Object.keys(SDD_PROVIDERS).sort().join(', ')})`,
        exitCodes.invalidInvocation,
      );
    }
    if (!(await provider.detectWorkspace(repo.root))) {
      throw new CliError(
        `No ${provider.name} workspace found at the repository root; there is no consumer-document population to enumerate`,
        exitCodes.invalidInvocation,
      );
    }
    const enumeration = await provider.enumerateDocuments(repo.root, { includeArchived: true });
    reports = [];
    for (const document of enumeration.documents) {
      for (const record of await parseDriftFile(document.absolutePath, repo.root)) {
        reports.push(toReport(record, index, document.change, document.archived));
      }
    }
  } else {
    const targets =
      target !== undefined ? [target] : repo.config.prodshape.citations['consumer-roots'];
    const records: DriftRecord[] = [];
    for (const targetDir of targets) {
      const rootDir = isAbsolute(targetDir) ? targetDir : resolvePath(repo.root, targetDir);
      try {
        if (!(await stat(rootDir)).isDirectory()) {
          throw new CliError(
            `Drift target must be a directory: '${targetDir}'`,
            exitCodes.invalidInvocation,
          );
        }
      } catch (error) {
        if (error instanceof CliError) throw error;
        throw new CliError(
          target === undefined
            ? `Configured citation consumer root not found: '${targetDir}'; set 'citations.consumer-roots' in .product/config.yaml to the directories that hold your consumer documents, or pass a target explicitly`
            : `Drift target not found: '${targetDir}'`,
          exitCodes.invalidInvocation,
        );
      }
      records.push(...(await scanDriftMarkers(rootDir, repo.root)));
    }
    reports = records.map((record) => toReport(record, index, undefined, false));
  }

  const documents = new Set(reports.map((r) => r.source)).size;
  const unknownIds = reports.flatMap((r) => r.ids.filter((i) => !i.resolves)).length;
  const malformed = reports.filter((r) => r.malformed).length;

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/drift/v1alpha1',
        provider: options.provider,
        drift: reports,
        summary: { total: reports.length, documents, unknownIds, malformed },
      }).trimEnd(),
    );
    return exitCodes.success;
  }

  for (const report of reports) {
    const archiveTag = report.archived ? ' (archived)' : '';
    const changeTag = report.change ? ` [${report.change}]` : '';
    const ids =
      report.ids.map((i) => (i.resolves ? i.id : `${i.id} (unknown id)`)).join(', ') ||
      '(malformed marker: no ids)';
    const summary = report.summary ? `\t${report.summary}` : '';
    io.out(`${report.source}:${report.line}${archiveTag}${changeTag}\t${ids}${summary}`);
  }
  io.out(
    `${reports.length} drift warning(s) across ${documents} document(s)` +
      (unknownIds > 0 ? `, ${unknownIds} unknown id(s)` : '') +
      (malformed > 0 ? `, ${malformed} malformed marker(s)` : ''),
  );
  return exitCodes.success;
}

function toReport(
  record: DriftRecord,
  index: Map<string, unknown>,
  change: string | undefined,
  archived: boolean,
): DriftReport {
  return {
    source: record.source,
    line: record.line,
    change,
    archived,
    ids: record.ids.map((id) => ({ id, resolves: index.has(id) })),
    summary: record.summary,
    malformed: record.malformed,
  };
}
