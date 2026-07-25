import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import {
  SchemaRegistry,
  checkRequiredBodySections,
  parseArtifactDocument,
  type Diagnostic,
} from '@prodshape/core';

export const repoRoot = join(import.meta.dirname, '..');
export const schemasDir = join(repoRoot, 'schemas');

let registryPromise: Promise<SchemaRegistry> | undefined;

export function loadRegistry(): Promise<SchemaRegistry> {
  registryPromise ??= SchemaRegistry.load(schemasDir);
  return registryPromise;
}

export function toPosix(path: string): string {
  return path.split(sep).join('/');
}

export async function listFilesRecursive(dir: string, suffix: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(suffix))
    .map((e) => join(e.parentPath, e.name))
    .sort();
}

export interface ValidatedDocument {
  file: string;
  frontmatter: Record<string, unknown>;
  body: string;
  diagnostics: Diagnostic[];
}

/** Parse + schema-validate + body-section-check one Markdown artifact document. */
export async function validateMarkdownDocument(absolutePath: string): Promise<ValidatedDocument> {
  const registry = await loadRegistry();
  const file = toPosix(relative(repoRoot, absolutePath));
  const content = await readFile(absolutePath, 'utf8');

  const parsed = parseArtifactDocument(content, file);
  if (!parsed.artifact) {
    return { file, frontmatter: {}, body: '', diagnostics: parsed.diagnostics };
  }

  const { frontmatter, body } = parsed.artifact;
  const kind = typeof frontmatter.type === 'string' ? frontmatter.type : '';
  const artifactId = typeof frontmatter.id === 'string' ? frontmatter.id : undefined;
  const diagnostics = [
    ...registry.validate(kind, frontmatter, file),
    ...checkRequiredBodySections(kind, body, file, artifactId),
  ];
  return { file, frontmatter, body, diagnostics };
}
