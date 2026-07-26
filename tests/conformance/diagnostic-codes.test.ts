/**
 * The diagnostic codes emitted by the implementation and the tables in
 * docs/specification/validation.md are a single contract that must change together
 * (packages/core/src/diagnostics.ts says so; nothing enforced it until this test).
 *
 * Codes are emitted as string literals across many modules rather than from one registry, so
 * the check is a scan of the sources rather than an import.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listFilesRecursive, repoRoot } from '../helpers.js';

const CODE = /PRODUCT\d{3}/g;

/**
 * Codes specified but not yet emitted anywhere. Each entry needs a reason; an empty list means
 * the specification and the implementation are exactly in step. Do not add an entry to silence
 * a genuine omission — implement the check or remove the row from validation.md.
 */
const specifiedButNotEmitted: string[] = [];

async function emittedCodes(): Promise<Set<string>> {
  const files: string[] = [];
  for (const pkg of ['core', 'cli', 'distribution', 'adapter-openspec']) {
    files.push(...(await listFilesRecursive(join(repoRoot, 'packages', pkg, 'src'), '.ts')));
  }
  const codes = new Set<string>();
  for (const file of files) {
    if (file.endsWith('.test.ts') || file.endsWith('test-support.ts')) continue;
    for (const match of (await readFile(file, 'utf8')).matchAll(CODE)) codes.add(match[0]);
  }
  return codes;
}

/** Codes listed in one `## <heading>` section's table. */
function documentedCodes(doc: string, heading: string): Set<string> {
  const start = doc.indexOf(`## ${heading}`);
  if (start === -1) throw new Error(`validation.md has no '## ${heading}' section`);
  const rest = doc.slice(start + heading.length);
  const end = rest.indexOf('\n## ');
  const section = end === -1 ? rest : rest.slice(0, end);
  return new Set([...section.matchAll(CODE)].map((m) => m[0]));
}

describe('diagnostic codes', () => {
  it('every emitted code is documented in validation.md, in the right table', async () => {
    const doc = await readFile(join(repoRoot, 'docs', 'specification', 'validation.md'), 'utf8');
    const errors = documentedCodes(doc, 'Error codes');
    const warnings = documentedCodes(doc, 'Warning codes');

    for (const code of [...(await emittedCodes())].sort()) {
      // Errors occupy PRODUCT0xx and warnings PRODUCT1xx; a code in the wrong table means the
      // severity in the source and the severity in the specification disagree.
      const expected = code.startsWith('PRODUCT1') ? warnings : errors;
      const table = code.startsWith('PRODUCT1') ? 'Warning codes' : 'Error codes';
      expect.soft([...expected], `${code} should be under '## ${table}'`).toContain(code);
    }
  });

  it('every documented code is emitted, unless explicitly listed as not yet implemented', async () => {
    const doc = await readFile(join(repoRoot, 'docs', 'specification', 'validation.md'), 'utf8');
    const documented = [
      ...documentedCodes(doc, 'Error codes'),
      ...documentedCodes(doc, 'Warning codes'),
    ].sort();
    const emitted = await emittedCodes();
    const missing = documented.filter(
      (code) => !emitted.has(code) && !specifiedButNotEmitted.includes(code),
    );
    expect(missing).toEqual([]);
  });

  it('numbers codes consistently with their severity range', async () => {
    const doc = await readFile(join(repoRoot, 'docs', 'specification', 'validation.md'), 'utf8');
    expect([...documentedCodes(doc, 'Error codes')].filter((c) => !/^PRODUCT0/.test(c))).toEqual(
      [],
    );
    expect([...documentedCodes(doc, 'Warning codes')].filter((c) => !/^PRODUCT1/.test(c))).toEqual(
      [],
    );
  });
});
