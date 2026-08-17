/**
 * docs/specification/frontmatter-reference.md is generated from the canonical JSON Schemas.
 * These checks fail the build when the two disagree, so the reference can never document a field
 * validation does not enforce (or omit one it does).
 *
 * Cells are compared after normalization rather than as raw text: prettier reformats Markdown
 * table padding and docs/ is not prettier-ignored, so a byte comparison would fail on formatting
 * alone. Exempting a specification file from the repository's formatting rules to satisfy a test
 * would be the worse trade.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  SchemaRegistry,
  describeKind,
  frontmatterTableHeader,
  parseArtifactDocument,
  renderKindMarkdownTable,
} from '@prodshape/core';
import { listFilesRecursive, repoRoot, schemasDir } from '../helpers.js';

const docPath = join(repoRoot, 'docs', 'specification', 'frontmatter-reference.md');
const templatesDir = join(repoRoot, 'templates');

const BEGIN = /^<!-- BEGIN GENERATED: (.+?) -->$/gm;

async function loadDoc(): Promise<string> {
  return readFile(docPath, 'utf8');
}

function regionBody(doc: string, kind: string): string {
  const begin = doc.indexOf(`<!-- BEGIN GENERATED: ${kind} -->`);
  const end = doc.indexOf(`<!-- END GENERATED: ${kind} -->`);
  if (begin === -1 || end === -1 || end < begin) {
    throw new Error(`frontmatter-reference.md has no generated region for '${kind}'`);
  }
  return doc.slice(begin, end).split('\n').slice(1).join('\n');
}

/** A table as a matrix of trimmed cells, ignoring padding, blank lines and the divider row. */
function cellMatrix(table: string): string[][] {
  return table
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
    .map((line) =>
      line
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        // Split on unescaped pipes only: `\|` inside a cell is literal content.
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => !cells.every((cell) => /^-*$/.test(cell)));
}

describe('frontmatter reference', () => {
  it('documents exactly the kinds that have a schema', async () => {
    const registry = await SchemaRegistry.load(schemasDir);
    const documented = [...(await loadDoc()).matchAll(BEGIN)].map((m) => m[1] as string);
    // Bidirectional: a new schema with no section fails here, as does a section for no schema.
    expect(documented.sort()).toEqual(registry.kinds().sort());
  });

  it('renders every field table exactly as the schemas describe it', async () => {
    const registry = await SchemaRegistry.load(schemasDir);
    const schemas = registry.rawSchemas();
    const doc = await loadDoc();

    for (const kind of registry.kinds()) {
      const expected = cellMatrix(renderKindMarkdownTable(describeKind(kind, schemas)));
      const actual = cellMatrix(regionBody(doc, kind));
      expect
        .soft(actual, `'${kind}' is out of date — run: pnpm docs:frontmatter`)
        .toEqual(expected);
    }
  });

  it('uses the fixed column header in every table', async () => {
    const registry = await SchemaRegistry.load(schemasDir);
    const doc = await loadDoc();
    for (const kind of registry.kinds()) {
      expect.soft(cellMatrix(regionBody(doc, kind))[0], kind).toEqual(frontmatterTableHeader);
    }
  });

  it('points every template at a reference section that exists', async () => {
    const doc = await loadDoc();
    const files = await listFilesRecursive(templatesDir, '.md');
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const parsed = parseArtifactDocument(await readFile(file, 'utf8'), file);
      const kind = parsed.artifact?.frontmatter.type;
      // A template without a schema kind has no generated reference section to link to.
      if (typeof kind !== 'string' || !doc.includes(`<!-- BEGIN GENERATED: ${kind} -->`)) continue;
      const pointer = `Schema reference: docs/specification/frontmatter-reference.md#${kind}`;
      expect.soft(parsed.artifact?.body ?? '', file).toContain(pointer);
    }
  });
});
