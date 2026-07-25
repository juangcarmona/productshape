import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import fg from 'fast-glob';
import { isMarkdownDocumentType } from './artifact.js';
import { checkRequiredBodySections } from './body-sections.js';
import { contentDigest } from './digest.js';
import type { Diagnostic } from './diagnostics.js';
import { parseArtifactDocument } from './parse.js';
import type { SchemaRegistry } from './schema-registry.js';

export interface LoadedArtifact {
  /** Repository-relative path, POSIX separators. */
  file: string;
  absolutePath: string;
  frontmatter: Record<string, unknown>;
  body: string;
  digest: string;
  id?: string;
  type?: string;
  title?: string;
  status?: string;
}

export interface LoadedModel {
  artifacts: LoadedArtifact[];
  /** Per-document diagnostics (parsing, schema, body sections). */
  diagnostics: Diagnostic[];
}

export function toPosixRelative(repoRoot: string, absolutePath: string): string {
  return relative(repoRoot, absolutePath).split(sep).join('/');
}

/** Discover artifact files under a model directory: every .md except index.md at the root. */
export async function discoverModelFiles(modelDir: string): Promise<string[]> {
  const entries = await fg('**/*.md', {
    cwd: modelDir,
    ignore: ['index.md'],
    absolute: true,
    dot: false,
  });
  return entries.map((e) => e.split('/').join(sep)).sort();
}

/** Load one artifact document from disk: parse, schema-validate, check body sections. */
export async function loadArtifactFile(
  absolutePath: string,
  repoRoot: string,
  registry: SchemaRegistry,
): Promise<{ artifact?: LoadedArtifact; diagnostics: Diagnostic[] }> {
  const file = toPosixRelative(repoRoot, absolutePath);
  const content = await readFile(absolutePath, 'utf8');
  const parsed = parseArtifactDocument(content, file);
  if (!parsed.artifact) return { diagnostics: parsed.diagnostics };

  const { frontmatter, body } = parsed.artifact;
  const type = typeof frontmatter.type === 'string' ? frontmatter.type : '';
  const id = typeof frontmatter.id === 'string' ? frontmatter.id : undefined;

  const diagnostics = [
    ...registry.validate(type, frontmatter, file),
    ...(isMarkdownDocumentType(type) ? checkRequiredBodySections(type, body, file, id) : []),
  ];

  const artifact: LoadedArtifact = {
    file,
    absolutePath,
    frontmatter,
    body,
    digest: contentDigest(content),
    id,
    type: type || undefined,
    title: typeof frontmatter.title === 'string' ? frontmatter.title : undefined,
    status: typeof frontmatter.status === 'string' ? frontmatter.status : undefined,
  };
  return { artifact, diagnostics };
}

/** Load the baseline model from a model directory. */
export async function loadModel(
  modelDir: string,
  repoRoot: string,
  registry: SchemaRegistry,
): Promise<LoadedModel> {
  const files = await discoverModelFiles(modelDir);
  const artifacts: LoadedArtifact[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const file of files) {
    const result = await loadArtifactFile(file, repoRoot, registry);
    diagnostics.push(...result.diagnostics);
    if (result.artifact) artifacts.push(result.artifact);
  }
  return { artifacts, diagnostics };
}
