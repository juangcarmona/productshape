/**
 * Fill the generated field tables in docs/specification/frontmatter-reference.md from the
 * canonical JSON Schemas.
 *
 * The prose around each table is hand-written and preserved; only the content between
 * `<!-- BEGIN GENERATED: <kind> -->` and `<!-- END GENERATED: <kind> -->` is replaced.
 *
 * Run with: pnpm docs:frontmatter
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SchemaRegistry,
  describeKind,
  renderKindMarkdownTable,
} from '../packages/core/src/index.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const docPath = join(repoRoot, 'docs', 'specification', 'frontmatter-reference.md');

const registry = await SchemaRegistry.load(join(repoRoot, 'schemas'));
const schemas = registry.rawSchemas();

let doc = await readFile(docPath, 'utf8');
const regions = [...doc.matchAll(/<!-- BEGIN GENERATED: (.+?) -->/g)].map((m) => m[1] as string);

const documented = new Set(regions);
const missing = registry.kinds().filter((kind) => !documented.has(kind));
if (missing.length > 0) {
  throw new Error(
    `frontmatter-reference.md has no generated region for: ${missing.join(', ')}.\n` +
      `Add a '### <Name>' section with BEGIN/END GENERATED markers, then re-run.`,
  );
}

for (const kind of regions) {
  const table = renderKindMarkdownTable(describeKind(kind, schemas));
  // Matches an empty region too, so the document can be written with bare markers.
  const pattern = new RegExp(
    `(<!-- BEGIN GENERATED: ${kind} -->)[\\s\\S]*?(<!-- END GENERATED: ${kind} -->)`,
  );
  if (!pattern.test(doc)) throw new Error(`Unterminated generated region for '${kind}'`);
  // A replacer function, not a replacement string: the tables contain ID patterns ending in `$`,
  // which String.replace would otherwise interpret as $` / $' substitutions.
  doc = doc.replace(pattern, (_match, begin: string, end: string) => `${begin}\n${table}\n${end}`);
}

await writeFile(docPath, doc, 'utf8');
console.log(
  `Regenerated ${regions.length} field table(s) in docs/specification/frontmatter-reference.md`,
);
