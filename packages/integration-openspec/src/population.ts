/**
 * OpenSpec consumer-document enumeration: the OpenSpec implementation of the framework-neutral
 * SDD integration-provider contract defined in @prodshape/core.
 *
 * Everything OpenSpec-specific about verification lives here — the `openspec/` layout, the
 * changes/archive lifecycle split, the artifact-file conventions, and the `openspec` CLI — so
 * the core package stays SDD-framework blind. The provider only enumerates the expected current
 * consumer-document population; scope classification and citation verification are core
 * responsibilities that operate on the enumeration.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import fg from 'fast-glob';
import { codes } from '@prodshape/core';
import type {
  ConsumerDocument,
  ConsumerDocumentEnumeration,
  Diagnostic,
  EnumerateConsumerDocumentsOptions,
  SddIntegrationProvider,
} from '@prodshape/core';
import { runCommand } from './process.js';
import { envWithLocalBin, isOpenSpecWorkspace, pathExists } from './workspace.js';

/**
 * The artifact files that make up an OpenSpec change, relative to the change directory.
 * `specs/` is a directory containing one or more `<capability>/spec.md` files.
 */
const CHANGE_ARTIFACT_FILES: Array<{ file: string; kind: string }> = [
  { file: 'proposal.md', kind: 'proposal' },
  { file: 'design.md', kind: 'design' },
  { file: 'tasks.md', kind: 'tasks' },
];

/** Run `openspec` with the given args at the repository root, returning stdout. */
async function runOpenSpec(
  repoRoot: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return runCommand('openspec', args, {
    cwd: repoRoot,
    env: envWithLocalBin(repoRoot),
    maxBuffer: 10 * 1024 * 1024,
  });
}

/** Parsed entry from `openspec list --json`. */
interface OpenSpecListEntry {
  name: string;
}

/**
 * Call `openspec list --json` and return the change names. Returns `null` when the CLI is
 * unavailable or the output is unparseable, so the caller can fall back to filesystem scanning.
 */
async function openspecListChanges(repoRoot: string): Promise<string[] | null> {
  try {
    const { stdout } = await runOpenSpec(repoRoot, ['list', '--json']);
    const parsed = JSON.parse(stdout) as { changes?: OpenSpecListEntry[] };
    if (!Array.isArray(parsed.changes)) return null;
    return parsed.changes.map((c) => c.name).filter((n): n is string => typeof n === 'string');
  } catch {
    return null;
  }
}

/** Check whether `openspec` is runnable (PATH or node_modules/.bin) with a parseable version. */
export async function isOpenSpecCliAvailable(repoRoot?: string): Promise<boolean> {
  try {
    const { stdout } = await runCommand('openspec', ['--version'], {
      ...(repoRoot ? { cwd: repoRoot, env: envWithLocalBin(repoRoot) } : {}),
    });
    return /\d+\.\d+\.\d+/.test(stdout);
  } catch {
    return false;
  }
}

/** Discover all `.md` files under a directory, returning absolute paths sorted. */
async function discoverMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fg('**/*.md', {
    cwd: dir,
    absolute: true,
    dot: false,
    ignore: ['**/node_modules/**'],
  });
  return entries.map((e) => e.split('/').join(sep)).sort();
}

/** Build a {@link ConsumerDocument} from an absolute path. */
function buildConsumerDocument(
  absolutePath: string,
  repoRoot: string,
  opts: { change?: string; archived: boolean; artifactKind?: string },
): ConsumerDocument {
  return {
    path: relative(repoRoot, absolutePath).split(sep).join('/'),
    absolutePath,
    change: opts.change,
    archived: opts.archived,
    artifactKind: opts.artifactKind,
  };
}

/** Discover artifact files for a single change directory. */
async function discoverChangeDocuments(
  changeDir: string,
  repoRoot: string,
  change: string,
  archived: boolean,
): Promise<ConsumerDocument[]> {
  const docs: ConsumerDocument[] = [];

  for (const { file, kind } of CHANGE_ARTIFACT_FILES) {
    const absolutePath = join(changeDir, file);
    try {
      await readFile(absolutePath);
      docs.push(
        buildConsumerDocument(absolutePath, repoRoot, { change, archived, artifactKind: kind }),
      );
    } catch {
      // File doesn't exist; skip.
    }
  }

  const specsDir = join(changeDir, 'specs');
  try {
    const specFiles = await discoverMarkdownFiles(specsDir);
    for (const absolutePath of specFiles) {
      docs.push(
        buildConsumerDocument(absolutePath, repoRoot, { change, archived, artifactKind: 'specs' }),
      );
    }
  } catch {
    // No specs/ directory; skip.
  }

  return docs;
}

/** Discover all `.md` files under `openspec/specs/` (the current specs, not changes). */
async function discoverSpecDocuments(
  specsDir: string,
  repoRoot: string,
): Promise<ConsumerDocument[]> {
  const docs: ConsumerDocument[] = [];
  try {
    const specFiles = await discoverMarkdownFiles(specsDir);
    for (const absolutePath of specFiles) {
      docs.push(
        buildConsumerDocument(absolutePath, repoRoot, { archived: false, artifactKind: 'spec' }),
      );
    }
  } catch {
    // No specs/ directory; skip.
  }
  return docs;
}

/** Discover archived change directories under `openspec/changes/archive/`. */
async function discoverArchivedChanges(archiveDir: string): Promise<string[]> {
  try {
    const entries = await readdir(archiveDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

/**
 * Enumerate the consumer-document population of an OpenSpec workspace.
 *
 * Uses `openspec list --json` to determine the current (non-archived) changes. The OpenSpec CLI
 * excludes `openspec/changes/archive/` from `list`, so the default population is current-only.
 * When `includeArchived` is true, archived changes under `openspec/changes/archive/` are also
 * scanned via the filesystem (the CLI cannot address archived changes by name).
 *
 * For each change, the artifact files are resolved by filesystem convention: `proposal.md`,
 * `specs/` (one or more spec files), `design.md`, `tasks.md`. The `openspec show --json` output
 * does not include artifact paths, so convention-based resolution is the stable contract.
 *
 * For `openspec/specs/` (the current specs, not changes), all `.md` files are discovered.
 *
 * If the OpenSpec CLI is not runnable, enumeration falls back to filesystem scanning of
 * `openspec/changes/` (excluding `archive/` unless `includeArchived`) and reports PRODUCT069:
 * the population then rests on layout convention alone, which the gate must surface rather than
 * silently trust.
 */
export async function enumerateOpenSpecDocuments(
  repoRoot: string,
  options?: EnumerateConsumerDocumentsOptions,
): Promise<ConsumerDocumentEnumeration> {
  const includeArchived = options?.includeArchived ?? false;
  const root = join(repoRoot, 'openspec');
  const changesDir = join(root, 'changes');
  const archiveDir = join(changesDir, 'archive');
  const specsDir = join(root, 'specs');

  const documents: ConsumerDocument[] = [];
  const diagnostics: Diagnostic[] = [];

  // A workspace with no `openspec/changes/` directory at all (specs only) has zero changes by
  // construction: nothing to discover, no CLI needed, and no PRODUCT069 — older OpenSpec CLIs
  // (1.3.x) even reject `list` outright in such a workspace. Otherwise prefer
  // `openspec list --json` and fall back to filesystem scanning.
  let currentChangeNames: string[] | null = (await pathExists(changesDir))
    ? await openspecListChanges(repoRoot)
    : [];

  if (currentChangeNames === null) {
    diagnostics.push({
      severity: 'error',
      code: codes.openSpecCliMissing,
      message: `OpenSpec CLI not available; the document population was enumerated by filesystem convention instead of 'openspec list'. Install with 'npm install -g @fission-ai/openspec@1' for authoritative population discovery.`,
      file: 'openspec/',
    });
    // archive/ is excluded here: archived changes are enumerated separately below.
    try {
      const entries = await readdir(changesDir, { withFileTypes: true });
      currentChangeNames = entries
        .filter((e) => e.isDirectory() && e.name !== 'archive')
        .map((e) => e.name)
        .sort();
    } catch {
      currentChangeNames = [];
    }
  }

  if (options?.change) {
    const wanted = options.change;
    if (currentChangeNames.includes(wanted)) {
      currentChangeNames = [wanted];
    } else {
      // The requested change isn't in the current list. Check the archive below if asked.
      currentChangeNames = [];
    }
  }

  for (const name of currentChangeNames) {
    const changeDir = join(changesDir, name);
    documents.push(...(await discoverChangeDocuments(changeDir, repoRoot, name, false)));
  }

  if (includeArchived) {
    const archivedNames = await discoverArchivedChanges(archiveDir);
    for (const name of archivedNames) {
      // If a specific change was requested and it wasn't current, check the archive.
      if (options?.change && name !== options.change) continue;
      const changeDir = join(archiveDir, name);
      documents.push(...(await discoverChangeDocuments(changeDir, repoRoot, name, true)));
    }
  }

  documents.push(...(await discoverSpecDocuments(specsDir, repoRoot)));

  return {
    documents,
    root: 'openspec',
    includeArchived,
    diagnostics,
  };
}

/**
 * The OpenSpec implementation of the SDD integration-provider contract.
 * `prodshape citations verify --provider openspec` verifies the population this enumerates.
 */
export const openSpecProvider: SddIntegrationProvider = {
  name: 'openspec',
  detectWorkspace: isOpenSpecWorkspace,
  enumerateDocuments: enumerateOpenSpecDocuments,
};
