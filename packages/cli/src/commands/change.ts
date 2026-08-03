import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArtifactDocument, stableJson, validateBaseline } from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface ChangeValidateOptions {
  format?: 'text' | 'json';
}

export async function runChangeValidate(
  io: CliIo,
  options: ChangeValidateOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const { graph, diagnostics: reported } = await validateBaseline(repo);
  const diagnostics = reported;

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/diagnostics/v1alpha1',
        diagnostics,
        summary: { errors: errors.length, warnings: warnings.length },
      }).trimEnd(),
    );
  } else {
    for (const diagnostic of diagnostics) io.out(formatDiagnosticLine(diagnostic));
    io.out(
      `${errors.length} error(s), ${warnings.length} warning(s) across ${graph.nodes.length} artifact(s)`,
    );
    if (errors.length === 0) {
      io.out('Proposed change validates: the working tree is structurally sound.');
    }
  }

  return errors.length > 0 ? exitCodes.validationErrors : exitCodes.success;
}

export interface ChangeListOptions {
  format?: 'text' | 'json';
}

interface ChangeDraft {
  id: string;
  title: string;
  status: string;
  path: string;
}

export async function runChangeList(
  io: CliIo,
  options: ChangeListOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const changesDir = join(repo.root, 'docs', 'product', 'changes');

  let entries: string[] = [];
  try {
    entries = (await readdir(changesDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    // No changes directory — no drafts.
  }

  const drafts: ChangeDraft[] = [];
  for (const entry of entries) {
    const changeFile = join(changesDir, entry, 'change.md');
    try {
      await stat(changeFile);
    } catch {
      continue;
    }
    const content = await readFile(changeFile, 'utf8');
    const parsed = parseArtifactDocument(content, `docs/product/changes/${entry}/change.md`);
    if (!parsed.artifact) continue;
    const fm = parsed.artifact.frontmatter;
    drafts.push({
      id: typeof fm.id === 'string' ? fm.id : entry,
      title: typeof fm.title === 'string' ? fm.title : '(untitled)',
      status: typeof fm.status === 'string' ? fm.status : 'unknown',
      path: `docs/product/changes/${entry}/change.md`,
    });
  }

  if (options.format === 'json') {
    io.out(stableJson({ changes: drafts }).trimEnd());
  } else {
    if (drafts.length === 0) {
      io.out('No change drafts found.');
    } else {
      for (const draft of drafts) {
        io.out(`${draft.status}\t${draft.id}\t${draft.title}\t${draft.path}`);
      }
    }
  }

  return exitCodes.success;
}
