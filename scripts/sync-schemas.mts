/**
 * Sync the normative JSON Schemas from the spec repository into this repo's `schemas/`
 * directory, pinned to the commit SHA recorded in `schemas/.source.json`.
 *
 * The spec repository (product-definition-as-code/spec) owns the normative schemas at
 * `schemas/v1alpha1`. This script copies the 10 files (9 artifact kinds + common) into both
 * the repository-root `schemas/` directory (consumed by `generate-frontmatter-reference.mts`
 * and the conformance tests) and the `packages/core/schemas/` directory (consumed at runtime
 * by `SchemaRegistry.loadBundled()` and shipped with the published package).
 *
 * The 4 retired schemas (product-change, delivery-slice, product-handoff, product-coverage)
 * are absent from the spec repo and are never written by this script. They remain in the
 * local directories until the push-pipeline retirement removes them.
 *
 * Run with: pnpm schemas:sync
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const sourcePath = join(repoRoot, 'schemas', '.source.json');

interface SchemaSource {
  repo: string;
  path: string;
  ref: string;
}

const source = JSON.parse(await readFile(sourcePath, 'utf8')) as SchemaSource;

const schemaFiles = [
  'actor.schema.json',
  'bounded-context.schema.json',
  'business-rule.schema.json',
  'constraint.schema.json',
  'domain-term.schema.json',
  'functional-requirement.schema.json',
  'journey.schema.json',
  'quality-requirement.schema.json',
  'use-case.schema.json',
  // NOTE: `common.schema.json` is intentionally NOT synced here while the push-pipeline
  // retirement (issue #52) is in progress. The spec repo's `common.schema.json` removed
  // the retired $defs (productChangeId, deliverySliceId, productHandoffId,
  // productChangeStatus, deliverySliceStatus), but the 4 retired schemas still present in
  // this repo reference them and cannot compile without them. The local `common.schema.json`
  // is therefore maintained by hand (it adds `verification[].id` from the spec repo plus
  // retains the retired $defs) until Phase 3 deletes the retired schemas, at which point
  // `common.schema.json` is added back to this list and fully vendored.
];

const base = `https://raw.githubusercontent.com/${source.repo}/${source.ref}/${source.path}`;

// Both load paths: repo-root (for the frontmatter script + conformance tests) and the
// published package copy (for SchemaRegistry.loadBundled() at runtime).
const targets = [join(repoRoot, 'schemas'), join(repoRoot, 'packages', 'core', 'schemas')];

let copied = 0;
for (const file of schemaFiles) {
  const url = `${base}/${file}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${file} from ${source.repo}@${source.ref.slice(0, 8)}: ${res.status} ${res.statusText}`,
    );
  }
  const text = await res.text();
  // Validate it parses as JSON before writing.
  JSON.parse(text);
  for (const target of targets) {
    await writeFile(join(target, file), text, 'utf8');
  }
  copied += 1;
}

console.log(
  `Synced ${copied} schema(s) from ${source.repo}@${source.ref.slice(0, 8)} into schemas/ and packages/core/schemas/`,
);
