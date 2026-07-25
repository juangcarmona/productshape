import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { checkRequiredBodySections } from './body-sections.js';
import { contentDigest } from './digest.js';
import type { Diagnostic } from './diagnostics.js';
import type { LoadedArtifact } from './model.js';
import { loadArtifactFile, toPosixRelative } from './model.js';
import { parseArtifactDocument } from './parse.js';
import type { SchemaRegistry } from './schema-registry.js';

export interface ChangeOperations {
  add: string[];
  modify: string[];
  remove: string[];
}

export interface LoadedSlice {
  file: string;
  absolutePath: string;
  digest: string;
  data: Record<string, unknown>;
  id?: string;
  status?: string;
}

export interface LoadedChange {
  dir: string;
  file: string;
  frontmatter: Record<string, unknown>;
  body: string;
  digest: string;
  id?: string;
  title?: string;
  status?: string;
  baseRevision?: string;
  operations: ChangeOperations;
  proposed: LoadedArtifact[];
  slices: LoadedSlice[];
  /** Per-document diagnostics for change.md, proposed artifacts and slices. */
  diagnostics: Diagnostic[];
}

function emptyOperations(): ChangeOperations {
  return { add: [], modify: [], remove: [] };
}

function readOperations(frontmatter: Record<string, unknown>): ChangeOperations {
  const operations = frontmatter.operations as Record<string, unknown> | undefined;
  const list = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  return {
    add: list(operations?.add),
    modify: list(operations?.modify),
    remove: list(operations?.remove),
  };
}

async function listFiles(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(suffix))
      .map((e) => join(e.parentPath, e.name))
      .sort();
  } catch {
    return [];
  }
}

/** Discover active change directories: subdirectories of changes/active containing change.md. */
export async function discoverChanges(activeDir: string): Promise<string[]> {
  try {
    const entries = await readdir(activeDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => join(activeDir, e.name));
    const withChange: string[] = [];
    for (const dir of dirs) {
      try {
        await readFile(join(dir, 'change.md'), 'utf8');
        withChange.push(dir);
      } catch {
        // Not a change directory.
      }
    }
    return withChange.sort();
  } catch {
    return [];
  }
}

/** Load one Product Change: change.md, proposed future-state artifacts and slices. */
export async function loadChange(
  changeDir: string,
  repoRoot: string,
  registry: SchemaRegistry,
): Promise<LoadedChange> {
  const diagnostics: Diagnostic[] = [];
  const changePath = join(changeDir, 'change.md');
  const file = toPosixRelative(repoRoot, changePath);
  const content = await readFile(changePath, 'utf8');

  const parsed = parseArtifactDocument(content, file);
  const frontmatter = parsed.artifact?.frontmatter ?? {};
  const body = parsed.artifact?.body ?? '';
  diagnostics.push(...parsed.diagnostics);
  if (parsed.artifact) {
    const id = typeof frontmatter.id === 'string' ? frontmatter.id : undefined;
    diagnostics.push(
      ...registry.validate('product-change', frontmatter, file),
      ...checkRequiredBodySections('product-change', body, file, id),
    );
  }

  const proposed: LoadedArtifact[] = [];
  for (const artifactFile of await listFiles(join(changeDir, 'proposed'), '.md')) {
    const result = await loadArtifactFile(artifactFile, repoRoot, registry);
    diagnostics.push(...result.diagnostics);
    if (result.artifact) proposed.push(result.artifact);
  }

  const slices: LoadedSlice[] = [];
  for (const sliceFile of await listFiles(join(changeDir, 'slices'), '.yaml')) {
    const sliceRel = toPosixRelative(repoRoot, sliceFile);
    const sliceContent = await readFile(sliceFile, 'utf8');
    let data: Record<string, unknown> = {};
    try {
      data = (parse(sliceContent) ?? {}) as Record<string, unknown>;
    } catch (error) {
      diagnostics.push({
        severity: 'error',
        code: 'PRODUCT001',
        message: `Invalid YAML: ${error instanceof Error ? error.message : String(error)}`,
        file: sliceRel,
      });
      continue;
    }
    diagnostics.push(...registry.validate('delivery-slice', data, sliceRel));
    slices.push({
      file: sliceRel,
      absolutePath: sliceFile,
      digest: contentDigest(sliceContent),
      data,
      id: typeof data.id === 'string' ? data.id : undefined,
      status: typeof data.status === 'string' ? data.status : undefined,
    });
  }

  return {
    dir: changeDir,
    file,
    frontmatter,
    body,
    digest: contentDigest(content),
    id: typeof frontmatter.id === 'string' ? frontmatter.id : undefined,
    title: typeof frontmatter.title === 'string' ? frontmatter.title : undefined,
    status: typeof frontmatter.status === 'string' ? frontmatter.status : undefined,
    baseRevision:
      typeof frontmatter['base-revision'] === 'string' ? frontmatter['base-revision'] : undefined,
    operations: parsed.artifact ? readOperations(frontmatter) : emptyOperations(),
    proposed,
    slices,
    diagnostics,
  };
}
