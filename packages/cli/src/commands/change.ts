import { mkdir, readdir, readFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import {
  codes,
  parseArtifactDocument,
  stableJson,
  validateBaseline,
  type Diagnostic,
} from '@prodshape/core';
import { exitCodes, formatDiagnosticLine, resolveRepository, type CliIo } from '../context.js';

export interface ChangeValidateOptions {
  format?: 'text' | 'json';
}

export async function runChangeValidate(
  io: CliIo,
  options: ChangeValidateOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const { graph, diagnostics: modelDiagnostics } = await validateBaseline(repo);
  const diagnostics: Diagnostic[] = [...modelDiagnostics];

  // Also validate any change drafts found under docs/product/changes/.
  const changesDir = join(repo.root, 'docs', 'product', 'changes');
  let draftCount = 0;
  try {
    const entries = (await readdir(changesDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && e.name !== 'archive')
      .map((e) => e.name)
      .sort();
    for (const entry of entries) {
      const changeFile = join(changesDir, entry, 'change.md');
      try {
        await stat(changeFile);
      } catch {
        continue;
      }
      draftCount += 1;
      const content = await readFile(changeFile, 'utf8');
      const relativePath = `docs/product/changes/${entry}/change.md`;
      const parsed = parseArtifactDocument(content, relativePath);
      diagnostics.push(...parsed.diagnostics);
      if (parsed.artifact) {
        const fm = parsed.artifact.frontmatter;

        // Apply the change-draft schema. Without this, `additionalProperties: false` in
        // product-change.schema.json would never execute and the closed frontmatter contract
        // documented in the reference would be a claim no command checks. The kind is fixed
        // rather than read from `type`, so a draft declaring the wrong type is reported as the
        // schema violation it is.
        diagnostics.push(...repo.registry.validate('product-change', fm, relativePath));

        // Check affected-artifacts references resolve in the model.
        //
        // PRODUCT112, not PRODUCT006: `affected-artifacts` is an intent list, so an ID the model
        // does not contain yet is the expected state of a draft that proposes adding it, not a
        // defect. PRODUCT006 is an error about a broken relationship inside the model, and every
        // PRODUCT0xx code is an error (PRODUCT061 excepted), so emitting one as a warning
        // contradicted the severity contract in docs/specification/validation.md.
        const affected = fm['affected-artifacts'];
        if (Array.isArray(affected)) {
          for (const id of affected) {
            if (typeof id === 'string' && !graph.nodeById.has(id)) {
              diagnostics.push({
                severity: 'warning',
                code: codes.unknownAffectedArtifact,
                message: `Change draft '${entry}' lists affected artifact '${id}' which does not exist in the model`,
                file: relativePath,
                artifact: id,
                field: 'affected-artifacts',
              });
            }
          }
        }
      }
    }
  } catch {
    // No changes directory — no drafts to validate.
  }

  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  if (options.format === 'json') {
    io.out(
      stableJson({
        schema: 'product-definition-as-code/diagnostics/v1alpha1',
        diagnostics,
        summary: { errors: errors.length, warnings: warnings.length, drafts: draftCount },
      }).trimEnd(),
    );
  } else {
    for (const diagnostic of diagnostics) io.out(formatDiagnosticLine(diagnostic));
    io.out(
      `${errors.length} error(s), ${warnings.length} warning(s) across ${graph.nodes.length} artifact(s)${draftCount > 0 ? ` and ${draftCount} change draft(s)` : ''}`,
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

export async function runChangeList(io: CliIo, options: ChangeListOptions): Promise<number> {
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
      id: entry,
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

export interface ChangeArchiveOptions {
  format?: 'text' | 'json';
}

/**
 * `prodshape change archive <id>` — move a change draft to `docs/product/changes/archive/`.
 *
 * This is a file move, not a Git operation. It is typically run after the PR that delivered the
 * change has been merged. The archived draft remains in Git history for traceability but leaves
 * the active changes directory clean.
 *
 * The command refuses to archive a draft whose status is not `done` (the engineer must mark it
 * done first, confirming the PR was merged).
 */
export async function runChangeArchive(
  io: CliIo,
  slug: string,
  options: ChangeArchiveOptions,
): Promise<number> {
  const repo = await resolveRepository(io);
  const changesDir = join(repo.root, 'docs', 'product', 'changes');

  // Find the change draft directory by slug.
  let entries: string[] = [];
  try {
    entries = (await readdir(changesDir, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && e.name !== 'archive')
      .map((e) => e.name)
      .sort();
  } catch {
    // No changes directory.
  }

  let foundDir: string | undefined;
  let foundStatus: string | undefined;
  for (const entry of entries) {
    if (entry !== slug) continue;
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
    foundDir = entry;
    foundStatus = typeof fm.status === 'string' ? fm.status : 'unknown';
    break;
  }

  if (!foundDir) {
    io.err(`error: change draft '${slug}' not found under docs/product/changes/`);
    return exitCodes.invalidInvocation;
  }

  if (foundStatus !== 'done') {
    io.err(
      `error: change draft '${slug}' has status '${foundStatus}', not 'done'. Mark it done (set status: done in the change.md) after the PR is merged, then archive.`,
    );
    return exitCodes.invalidInvocation;
  }

  // Move the directory to archive/.
  const archiveDir = join(changesDir, 'archive');
  await mkdir(archiveDir, { recursive: true });
  const sourceDir = join(changesDir, foundDir);
  const destDir = join(archiveDir, foundDir);

  // Refuse to overwrite an existing archived change.
  try {
    await stat(destDir);
    io.err(`error: an archived change already exists at docs/product/changes/archive/${foundDir}/`);
    return exitCodes.invalidInvocation;
  } catch {
    // Good — destination doesn't exist.
  }

  await rename(sourceDir, destDir);

  if (options.format === 'json') {
    io.out(
      stableJson({
        archived: { slug: foundDir, path: `docs/product/changes/archive/${foundDir}/change.md` },
      }).trimEnd(),
    );
  } else {
    io.out(`Archived ${foundDir} → docs/product/changes/archive/${foundDir}/`);
  }

  return exitCodes.success;
}
